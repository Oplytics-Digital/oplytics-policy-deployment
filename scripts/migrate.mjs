/**
 * db:migrate — Apply pending Drizzle SQL migration files to the database.
 *
 * Reads all drizzle/[0-9]*.sql files in lexicographic order, tracks which
 * have already been applied in a `__drizzle_migrations` table, and executes
 * only the pending ones. Splits each file on Drizzle's `--> statement-breakpoint`
 * marker so multi-statement migrations run correctly.
 *
 * Run from project root:
 *   node scripts/migrate.mjs
 *
 * Requires:
 *   - DATABASE_URL env var (mysql://user:pass@host:port/dbname)
 */
import "dotenv/config";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRIZZLE_DIR = resolve(__dirname, "../drizzle");
const MIGRATIONS_TABLE = "__drizzle_migrations";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Error: DATABASE_URL environment variable is not set.");
  process.exit(1);
}

const connection = await mysql.createConnection(databaseUrl);

// Ensure the migrations tracking table exists
await connection.execute(`
  CREATE TABLE IF NOT EXISTS \`${MIGRATIONS_TABLE}\` (
    \`id\`         INT AUTO_INCREMENT PRIMARY KEY,
    \`filename\`   VARCHAR(255) NOT NULL UNIQUE,
    \`applied_at\` TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

// Load already-applied migration filenames
const [appliedRows] = await connection.execute(
  `SELECT \`filename\` FROM \`${MIGRATIONS_TABLE}\` ORDER BY \`filename\``
);
const applied = new Set(appliedRows.map((r) => r.filename));

// Discover migration files: drizzle/[0-9]*.sql, sorted lexicographically
const files = readdirSync(DRIZZLE_DIR)
  .filter((f) => /^\d+.*\.sql$/.test(f))
  .sort();

const pending = files.filter((f) => !applied.has(f));

if (pending.length === 0) {
  console.log("No pending migrations — database is up to date.");
  await connection.end();
  process.exit(0);
}

console.log(`Found ${pending.length} pending migration(s):\n`);

for (const filename of pending) {
  const filepath = resolve(DRIZZLE_DIR, filename);
  const sql = readFileSync(filepath, "utf8");

  // Split on Drizzle's statement-breakpoint marker; filter empty segments
  const statements = sql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  process.stdout.write(`  ${filename} (${statements.length} statement(s)) ... `);

  for (const statement of statements) {
    await connection.execute(statement);
  }

  await connection.execute(
    `INSERT INTO \`${MIGRATIONS_TABLE}\` (\`filename\`) VALUES (?)`,
    [filename]
  );

  console.log("done");
}

console.log("\nAll migrations applied successfully.");
await connection.end();
