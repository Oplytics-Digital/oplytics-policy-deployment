import { test, expect } from "@playwright/test";

/**
 * Test 1 — Login via Portal SSO and land on dashboard.
 *
 * Auth is handled by auth.setup.ts (dependency).
 * This spec verifies the authenticated dashboard renders correctly.
 */

test.describe("Policy Dashboard", () => {
  test("should display the dashboard after SSO login", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Verify the page title or header contains Policy Deployment
    await expect(page).toHaveTitle(/policy deployment/i);
  });

  test("should show the sidebar navigation with key menu items", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Sidebar should contain the core navigation items
    const sidebar = page.locator("aside, nav, [data-slot='sidebar']").first();
    await expect(sidebar).toBeVisible({ timeout: 10_000 });

    // Verify key navigation items are present
    const expectedItems = [
      "Dashboard",
      "X-Matrix",
      "Bowling Chart",
      "Action Plans",
      "Deployments",
    ];

    for (const item of expectedItems) {
      await expect(
        page.getByRole("link", { name: item }).or(
          page.getByText(item, { exact: false })
        ).first()
      ).toBeVisible();
    }
  });

  test("should display the plan hero banner with Vita Group data", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // The dashboard hero should show the Vita Group plan name
    await expect(
      page.getByText(/vita group/i).first()
    ).toBeVisible({ timeout: 15_000 });

    // Should show "Strategic Policy Deployment" or "X-Matrix" in the plan title
    await expect(
      page.getByText(/strategic policy deployment|x-matrix/i).first()
    ).toBeVisible();
  });

  test("should show the hierarchy breadcrumb with enterprise name", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // The hierarchy breadcrumb should show "The Vita Group" or similar enterprise name
    await expect(
      page.getByText(/vita group/i).first()
    ).toBeVisible({ timeout: 15_000 });

    // Should show a BU selection prompt or BU name
    await expect(
      page.getByText(/select business unit|furniture|bedding/i).first()
    ).toBeVisible();
  });

  test("should display KPI summary or radial charts", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for data to load — the dashboard should show KPI-related content
    // This could be radial charts, progress indicators, or KPI cards
    await expect(
      page
        .getByText(/kpi|on track|behind|ahead|target|actual/i)
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
