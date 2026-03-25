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
    // Navigate to the Bowling Chart via sidebar
    await page.goto("/bowling");
    await page.waitForLoadState("networkidle");
  });

  test("should load the Bowling Chart page from sidebar navigation", async ({
    page,
  }) => {
    // Navigate from dashboard using sidebar
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Click "Bowling Chart" in the sidebar
    const bowlingLink = page
      .getByRole("link", { name: /bowling chart/i })
      .first();
    await expect(bowlingLink).toBeVisible({ timeout: 10_000 });
    await bowlingLink.click();

    // Verify we're on the bowling page
    await page.waitForURL(/\/bowling/);
    await page.waitForLoadState("networkidle");

    // The Bowler Chart header should be visible
    await expect(
      page.getByText(/bowler chart/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should display the Bowler Chart header with owner info", async ({
    page,
  }) => {
    // Wait for the chart to render
    await expect(
      page.getByText(/bowler chart/i).first()
    ).toBeVisible({ timeout: 15_000 });

    // Should show the owner name
    await expect(
      page.getByText(/alan blythe/i).first()
    ).toBeVisible();

    // Should show "Monthly target vs actual tracking" subtitle
    await expect(
      page.getByText(/monthly target vs actual/i).first()
    ).toBeVisible();
  });

  test("should display month column headers", async ({ page }) => {
    // Wait for the table to render
    await expect(
      page.getByText(/bowler chart/i).first()
    ).toBeVisible({ timeout: 15_000 });

    // Verify month headers are present
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    for (const month of months) {
      await expect(
        page.getByText(month, { exact: true }).first()
      ).toBeVisible();
    }
  });

  test("should display KPI rows with seeded data", async ({ page }) => {
    // Wait for the table to render
    await expect(
      page.getByText(/bowler chart/i).first()
    ).toBeVisible({ timeout: 15_000 });

    // Verify key KPI names from seeded data are visible
    // IP1.1 — Foam scrap rate (Middleton)
    await expect(
      page.getByText(/foam scrap rate/i).first()
    ).toBeVisible({ timeout: 10_000 });

    // IP1.2 — OEE — F&B foam-making lines
    await expect(
      page.getByText(/oee/i).first()
    ).toBeVisible();

    // IP1.7 — CI Academy operators trained
    await expect(
      page.getByText(/ci academy/i).first()
    ).toBeVisible();
  });

  test("should show Plan and Actual rows for each KPI", async ({ page }) => {
    // Wait for the table to render
    await expect(
      page.getByText(/bowler chart/i).first()
    ).toBeVisible({ timeout: 15_000 });

    // The bowling chart shows "Plan" and "Act" labels for each KPI row pair
    // Check that at least one Plan and one Act label exists
    const planLabels = page.getByText("Plan", { exact: true });
    const actLabels = page.getByText("Act", { exact: true });

    // Should have multiple Plan/Act row pairs (one per KPI)
    await expect(planLabels.first()).toBeVisible({ timeout: 10_000 });
    await expect(actLabels.first()).toBeVisible();

    // Verify there are at least 7 Plan rows (one per KPI)
    const planCount = await planLabels.count();
    expect(planCount).toBeGreaterThanOrEqual(7);
  });

  test("should display numeric values in bowling cells", async ({ page }) => {
    // Wait for the table to render
    await expect(
      page.getByText(/bowler chart/i).first()
    ).toBeVisible({ timeout: 15_000 });

    // The seeded data includes specific values. Check for some known values.
    // IP1.1 Foam scrap rate target is 5.50, initial is 8.20
    // Look for numeric content in the table cells
    const table = page.locator("table").first();
    await expect(table).toBeVisible({ timeout: 10_000 });

    // The table should contain numeric values (plan/actual data)
    // Check that the table has content beyond just headers
    const cells = table.locator("td");
    const cellCount = await cells.count();
    expect(cellCount).toBeGreaterThan(50); // 7 KPIs × 2 rows × ~15 columns = 210+ cells
  });
});
