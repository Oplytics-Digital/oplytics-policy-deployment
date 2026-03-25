import { test, expect } from "@playwright/test";

/**
 * Test 1 — Login via Portal SSO and land on dashboard.
 *
 * Auth is handled by auth.setup.ts (dependency).
 * This spec verifies the authenticated dashboard renders correctly.
 */

test.describe("Policy Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
  });

  test("should display the dashboard after SSO login", async ({ page }) => {
    await expect(page).toHaveTitle(/policy deployment/i);
  });

  test("should show the sidebar navigation with key menu items", async ({
    page,
  }) => {
    const sidebar = page.locator("aside, nav, [data-slot='sidebar']").first();
    await expect(sidebar).toBeVisible();

    const expectedItems = [
      "Dashboard",
      "X-Matrix",
      "Bowling Chart",
      "Action Plans",
      "Deployments",
    ];

    for (const item of expectedItems) {
      await expect(
        page
          .getByRole("link", { name: item })
          .or(page.getByText(item, { exact: false }))
          .first()
      ).toBeVisible();
    }
  });

  test("should display the plan hero banner with Vita Group data", async ({
    page,
  }) => {
    await expect(page.getByText(/vita group/i).first()).toBeVisible({
      timeout: 15_000,
    });

    await expect(
      page.getByText(/strategic policy deployment|x-matrix/i).first()
    ).toBeVisible();
  });

  test("should show the hierarchy breadcrumb with enterprise name", async ({
    page,
  }) => {
    await expect(page.getByText(/vita group/i).first()).toBeVisible({
      timeout: 15_000,
    });

    await expect(
      page.getByText(/select business unit|furniture|bedding/i).first()
    ).toBeVisible();
  });

  test("should display KPI summary or radial charts", async ({ page }) => {
    await expect(
      page.getByText(/kpi|on track|behind|ahead|target|actual/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
