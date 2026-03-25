import { test as setup, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authFile = path.join(__dirname, "../playwright/.auth/user.json");

/**
 * Authenticate via Oplytics Portal SSO (cross-subdomain cookie).
 *
 * The portal login at portal.oplytics.digital/login sets an `app_session_id`
 * cookie on the `.oplytics.digital` domain. The policy deployment server
 * verifies this cookie using PORTAL_JWT_SECRET (cross-subdomain SSO).
 *
 * Flow:
 *   1. Navigate to portal.oplytics.digital/login
 *   2. Fill email + password, click Sign In
 *   3. Portal sets session cookie on .oplytics.digital
 *   4. Navigate to policydeployment.oplytics.digital — authenticated via SSO
 *   5. Verify dashboard loads → save storageState
 *
 * Credentials come from env vars — never hardcoded.
 */
setup("authenticate via Portal SSO", async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "E2E_USER_EMAIL and E2E_USER_PASSWORD must be set as environment variables"
    );
  }

  // Step 1: Navigate to the portal login page
  await page.goto("https://portal.oplytics.digital/login");
  await page.waitForLoadState("networkidle");

  // Step 2: Fill in credentials on the portal login form
  // Portal login form has id="email" and id="password" inputs
  const emailInput = page.locator("#email");
  const passwordInput = page.locator("#password");

  await expect(emailInput).toBeVisible({ timeout: 10_000 });
  await emailInput.fill(email);
  await passwordInput.fill(password);

  // Step 3: Click Sign In
  const signInButton = page.getByRole("button", { name: /sign in/i });
  await signInButton.click();

  // Step 4: Wait for portal to complete login and redirect
  // After successful login, portal redirects to /app (the service hub)
  await page.waitForURL(/portal\.oplytics\.digital\/(app|dashboard|services)/, {
    timeout: 15_000,
  });

  // Verify we're logged into the portal
  await page.waitForLoadState("networkidle");
  console.log("Portal login successful — cookie set on .oplytics.digital");

  // Step 5: Navigate to the policy deployment subdomain
  // The app_session_id cookie on .oplytics.digital should authenticate us
  await page.goto("https://policydeployment.oplytics.digital/");
  await page.waitForLoadState("networkidle");

  // Step 6: Verify we landed on the authenticated dashboard
  // The dashboard should show policy deployment content (not the "Sign in" prompt)
  await expect(
    page.getByText(/vita group|policy deployment|x-matrix|dashboard/i).first()
  ).toBeVisible({ timeout: 20_000 });

  // Verify we do NOT see the unauthenticated "Sign in to continue" prompt
  const signInPrompt = page.getByText("Sign in to continue");
  await expect(signInPrompt).not.toBeVisible();

  console.log("Cross-subdomain SSO successful — saving auth state");

  // Save the authenticated state (cookies, localStorage) for reuse
  await page.context().storageState({ path: authFile });
});
