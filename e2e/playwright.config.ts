import { defineConfig, devices } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Playwright E2E config for Oplytics Policy Deployment.
 *
 * Runs against the live published site (policydeployment.oplytics.digital).
 * Auth is handled once in auth.setup.ts and reused via storageState.
 *
 * Required env vars (from GitHub Secrets or local .env):
 *   E2E_USER_EMAIL    — Portal login email
 *   E2E_USER_PASSWORD — Portal login password
 *   E2E_BASE_URL      — (optional) Override base URL for testing
 */

const BASE_URL =
  process.env.E2E_BASE_URL || "https://policydeployment.oplytics.digital";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authFile = path.join(__dirname, "../playwright/.auth/user.json");

export default defineConfig({
  testDir: ".",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "html",
  timeout: 60_000,

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },

  projects: [
    /* ── Auth setup (runs first) ── */
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },

    /* ── Chromium tests ── */
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: authFile,
      },
      dependencies: ["setup"],
    },
  ],
});
