/**
 * Server build script — replaces the inline esbuild CLI call in package.json.
 *
 * Uses esbuild's JS API so we can inject build-time constants via `define`:
 *   __GIT_COMMIT__  — short SHA of HEAD at build time
 *   __BUILD_TIME__  — ISO timestamp of build invocation
 *
 * These are inlined as string literals in the bundle, so the server has no
 * dependency on git or the system clock at runtime.
 */

import { execSync } from "child_process";
import { build } from "esbuild";

let commit = "unknown";
try {
  commit = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
    .toString()
    .trim();
} catch {
  console.warn("build-server: git not available — __GIT_COMMIT__ will be 'unknown'");
}
const buildTime = new Date().toISOString();

console.log(`Building server  commit=${commit}  buildTime=${buildTime}`);

await build({
  entryPoints: ["server/_core/index.ts"],
  platform: "node",
  packages: "external",
  bundle: true,
  format: "esm",
  outdir: "dist",
  define: {
    __GIT_COMMIT__: JSON.stringify(commit),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
});
