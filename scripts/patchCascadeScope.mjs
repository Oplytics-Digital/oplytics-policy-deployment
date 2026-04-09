/**
 * One-time patch: fix T5 cascade scope and remove erroneous Q1→T1 correlation.
 *
 * Problems fixed:
 *   1. T5 was seeded with cascadeScope='site', scopeEntityIds=[3,5] (Bedford & Corby).
 *      T5 ("Reduce changeover time across F&B cutting lines") is an F&B-wide tactic —
 *      it should be bu-scoped to BU 1 (Furniture & Bedding) so it appears when viewing
 *      any F&B site (Middleton, Dukinfield, Bedford, Corby) and the F&B BU level.
 *
 *   2. A weak bo-ao correlation Q1→T1 exists in the data. Q1 (Achieve OEE >85%) belongs
 *      to Engineered Solutions. T1 (Reduce foam scrap at Middleton & Dukinfield) belongs
 *      to F&B. When filtering to F&B, T1 is in scope, which traces up to Q1, incorrectly
 *      pulling Q1 into the F&B view. The Q1→T1 weak link is data noise and must be removed.
 *
 * Run from project root:
 *   node --import tsx scripts/patchCascadeScope.mjs
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { eq, and } from "drizzle-orm";

const schemaModule = await import("../drizzle/schema.ts");
const {
  policyPlans,
  annualObjectives,
  breakthroughObjectives,
  policyCorrelations,
} = schemaModule;

const db = drizzle(process.env.DATABASE_URL);

const ENTERPRISE_ID = 1;

async function patch() {
  console.log("🔧 Patching cascade scope data...");

  // Resolve planId
  const plans = await db
    .select()
    .from(policyPlans)
    .where(eq(policyPlans.enterpriseId, ENTERPRISE_ID));

  if (plans.length === 0) {
    throw new Error(`No plan found for enterpriseId=${ENTERPRISE_ID}`);
  }
  const planId = plans[0].id;
  console.log(`  Plan ID: ${planId}`);

  // ── Fix 1: T5 → bu-scoped to F&B BU (buId=1) ──
  const t5Rows = await db
    .select()
    .from(annualObjectives)
    .where(and(eq(annualObjectives.planId, planId), eq(annualObjectives.code, "T5")));

  if (t5Rows.length === 0) {
    console.log("  ⚠️  T5 not found — skipping scope fix");
  } else {
    await db
      .update(annualObjectives)
      .set({ cascadeScope: "bu", scopeEntityIds: [1] })
      .where(eq(annualObjectives.id, t5Rows[0].id));
    console.log(`  ✅ T5 (id=${t5Rows[0].id}): cascadeScope='bu', scopeEntityIds=[1]`);
  }

  // ── Fix 2: Remove Q1→T1 weak bo-ao correlation ──
  const q1Rows = await db
    .select()
    .from(breakthroughObjectives)
    .where(and(eq(breakthroughObjectives.planId, planId), eq(breakthroughObjectives.code, "Q1")));

  const t1Rows = await db
    .select()
    .from(annualObjectives)
    .where(and(eq(annualObjectives.planId, planId), eq(annualObjectives.code, "T1")));

  if (q1Rows.length === 0 || t1Rows.length === 0) {
    console.log("  ⚠️  Q1 or T1 not found — skipping correlation removal");
  } else {
    const q1Id = q1Rows[0].id;
    const t1Id = t1Rows[0].id;

    const deleted = await db
      .delete(policyCorrelations)
      .where(
        and(
          eq(policyCorrelations.planId, planId),
          eq(policyCorrelations.sourceId, q1Id),
          eq(policyCorrelations.targetId, t1Id),
          eq(policyCorrelations.sourceType, "bo"),
          eq(policyCorrelations.targetType, "ao"),
          eq(policyCorrelations.quadrant, "bo-ao"),
        ),
      );
    console.log(`  ✅ Deleted Q1(id=${q1Id})→T1(id=${t1Id}) weak bo-ao correlation`);
  }

  console.log("\n✅ Patch complete.");
  process.exit(0);
}

patch().catch((err) => {
  console.error("Patch failed:", err);
  process.exit(1);
});
