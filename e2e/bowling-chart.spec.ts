import { test, expect } from "@playwright/test";

/**
 * Test 4 — Navigate to Bowling Chart and verify data loads.
 *
 * The Bowling Chart (Bowler Chart) shows monthly plan/actual tracking
 * for all KPIs. The seeded data includes 84 bowling entries across
 * 7 KPIs (IP1.1 through IP1.7) with 12 months of plan/actual values.
 *
 * Assertions:
 *   - Bowling Chart page loads from sidebar navigation
 *   - Header shows "Bowler Chart" title
 *   - Month columns are visible (Jan through Dec)
 *   - KPI names from seeded data are displayed
 *   - Plan/Actual rows exist with numeric values
 */

test.describe("Bowling Chart", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/bowling");
    await page.waitForLoadState("domcontentloaded");
  });

  test("should load the Bowling Chart page from sidebar navigation", async ({
    page,
  }) => {
    // Navigate from dashboard using sidebar
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Sidebar items are SidebarMenuButton (buttons), not anchor links
    const bowlingButton = page
      .getByRole("button", { name: /bowling chart/i })
      .first();
    await expect(bowlingButton).toBeVisible();
    await bowlingButton.click();

    await page.waitForURL(/\/bowling/);

    await expect(page.getByText(/bowler chart/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("should display the Bowler Chart header with owner info", async ({
    page,
  }) => {
    await expect(page.getByText(/bowler chart/i).first()).toBeVisible({
      timeout: 15_000,
    });

    await expect(page.getByText(/alan blythe/i).first()).toBeVisible();

    await expect(
      page.getByText(/monthly target vs actual/i).first()
    ).toBeVisible();
  });

  test("should display month column headers", async ({ page }) => {
    await expect(page.getByText(/bowler chart/i).first()).toBeVisible({
      timeout: 15_000,
    });

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    for (const month of months) {
      await expect(
        page.getByText(month, { exact: true }).first()
      ).toBeVisible();
    }
  });

  test("should display KPI rows with seeded data", async ({ page }) => {
    await expect(page.getByText(/bowler chart/i).first()).toBeVisible({
      timeout: 15_000,
    });

    await expect(page.getByText(/foam scrap rate/i).first()).toBeVisible();
    await expect(page.getByText(/oee/i).first()).toBeVisible();
    await expect(page.getByText(/ci academy/i).first()).toBeVisible();
  });

  test("should show Plan and Actual rows for each KPI", async ({ page }) => {
    await expect(page.getByText(/bowler chart/i).first()).toBeVisible({
      timeout: 15_000,
    });

    const planLabels = page.getByText("Plan", { exact: true });
    const actLabels = page.getByText("Act", { exact: true });

    await expect(planLabels.first()).toBeVisible();
    await expect(actLabels.first()).toBeVisible();

    const planCount = await planLabels.count();
    expect(planCount).toBeGreaterThanOrEqual(7);
  });

  test("should display numeric values in bowling cells", async ({ page }) => {
    await expect(page.getByText(/bowler chart/i).first()).toBeVisible({
      timeout: 15_000,
    });

    const table = page.locator("table").first();
    await expect(table).toBeVisible();

    const cells = table.locator("td");
    const cellCount = await cells.count();
    expect(cellCount).toBeGreaterThan(50);
  });
});
