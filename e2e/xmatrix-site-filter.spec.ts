import { test, expect } from "@playwright/test";

/**
 * Test 2 — Select Vita Middleton in hierarchy breadcrumb,
 * verify X-Matrix filters to show only deployed objectives.
 *
 * Vita Middleton (siteId=1) has deployment targets for BOs: C1, S1, M1.
 * Correlation tracing chain:
 *   BOs: C1, S1, M1
 *   AOs: T1, T2, T5, T6
 *   Projects: P1.1, P1.2, P1.3, P1.6, P1.7
 *   KPIs: IP1.1, IP1.4, IP1.5, IP1.7
 *
 * Items NOT deployed to Middleton:
 *   BOs: D1, Q1
 *   Projects: P1.4 (Poznan), P1.5 (OEE Almelo & Essen)
 *   KPIs: IP1.2 (OEE F&B), IP1.3 (Mattress OTD), IP1.6 (Poznan utilisation)
 */

test.describe("X-Matrix Site Filtering — Vita Middleton", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the X-Matrix page
    await page.goto("/xmatrix");
    await page.waitForLoadState("networkidle");

    // Wait for the X-Matrix to render with full enterprise data
    await expect(
      page.getByText(/vita group/i).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("should show all 5 BOs in full enterprise view before filtering", async ({
    page,
  }) => {
    // In the full enterprise view, all 5 BOs should be visible
    const boCodes = ["C1", "S1", "D1", "Q1", "M1"];
    for (const code of boCodes) {
      await expect(page.getByText(code, { exact: true }).first()).toBeVisible();
    }
  });

  test("should filter X-Matrix when Vita Middleton site is selected", async ({
    page,
  }) => {
    // Step 1: Click "Select Business Unit" in the hierarchy breadcrumb
    const buPrompt = page.getByText(/select business unit/i);
    await expect(buPrompt).toBeVisible({ timeout: 10_000 });
    await buPrompt.click();

    // Step 2: Select "Furniture & Bedding" BU from the dropdown
    // (Vita Middleton is in the Furniture & Bedding BU)
    const buOption = page.getByText(/furniture/i).first();
    await expect(buOption).toBeVisible({ timeout: 5_000 });
    await buOption.click();

    // Wait for BU selection to take effect
    await page.waitForTimeout(1_000);

    // Step 3: Click "Select Site" in the breadcrumb
    const sitePrompt = page.getByText(/select site/i);
    await expect(sitePrompt).toBeVisible({ timeout: 10_000 });
    await sitePrompt.click();

    // Step 4: Select "Vita Middleton" from the site dropdown
    const siteOption = page.getByText(/vita middleton/i).first();
    await expect(siteOption).toBeVisible({ timeout: 5_000 });
    await siteOption.click();

    // Wait for filtering to apply
    await page.waitForTimeout(2_000);

    // Step 5: Verify BOs that SHOULD be visible (deployed to Middleton)
    // C1 — Reduce group-wide manufacturing waste
    await expect(
      page.getByText(/reduce.*manufacturing waste/i).first()
    ).toBeVisible({ timeout: 10_000 });

    // S1 — Achieve zero lost-time incidents
    await expect(
      page.getByText(/zero lost-time incidents/i).first()
    ).toBeVisible();

    // M1 — Build a continuous improvement culture
    await expect(
      page.getByText(/continuous improvement culture/i).first()
    ).toBeVisible();

    // Step 6: Verify BOs that should NOT be visible (not deployed to Middleton)
    // D1 — Grow Finished Mattress revenue
    await expect(
      page.getByText(/grow.*mattress revenue/i)
    ).not.toBeVisible();

    // Q1 — Achieve OEE >85%
    await expect(
      page.getByText(/achieve oee/i)
    ).not.toBeVisible();
  });

  test("should show correct projects for Vita Middleton", async ({ page }) => {
    // Navigate to site selection
    const buPrompt = page.getByText(/select business unit/i);
    await expect(buPrompt).toBeVisible({ timeout: 10_000 });
    await buPrompt.click();
    await page.getByText(/furniture/i).first().click();
    await page.waitForTimeout(1_000);

    const sitePrompt = page.getByText(/select site/i);
    await expect(sitePrompt).toBeVisible({ timeout: 10_000 });
    await sitePrompt.click();
    await page.getByText(/vita middleton/i).first().click();
    await page.waitForTimeout(2_000);

    // Projects visible at Middleton: P1.1, P1.2, P1.3, P1.6, P1.7
    await expect(
      page.getByText(/middleton foam scrap reduction/i).first()
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByText(/dukinfield conversion line/i).first()
    ).toBeVisible();

    await expect(
      page.getByText(/safety audit programme/i).first()
    ).toBeVisible();

    await expect(
      page.getByText(/smed programme/i).first()
    ).toBeVisible();

    await expect(
      page.getByText(/ci academy launch/i).first()
    ).toBeVisible();

    // Projects NOT visible at Middleton: P1.4, P1.5
    await expect(
      page.getByText(/poznan mattress line/i)
    ).not.toBeVisible();

    await expect(
      page.getByText(/oee digital rollout/i)
    ).not.toBeVisible();
  });

  test("should show correct KPIs for Vita Middleton", async ({ page }) => {
    // Navigate to site selection
    const buPrompt = page.getByText(/select business unit/i);
    await expect(buPrompt).toBeVisible({ timeout: 10_000 });
    await buPrompt.click();
    await page.getByText(/furniture/i).first().click();
    await page.waitForTimeout(1_000);

    const sitePrompt = page.getByText(/select site/i);
    await expect(sitePrompt).toBeVisible({ timeout: 10_000 });
    await sitePrompt.click();
    await page.getByText(/vita middleton/i).first().click();
    await page.waitForTimeout(2_000);

    // KPIs visible at Middleton: IP1.1, IP1.4, IP1.5, IP1.7
    await expect(
      page.getByText(/foam scrap rate/i).first()
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByText(/lost-time incidents/i).first()
    ).toBeVisible();

    await expect(
      page.getByText(/changeover time/i).first()
    ).toBeVisible();

    await expect(
      page.getByText(/ci academy operators trained/i).first()
    ).toBeVisible();

    // KPIs NOT visible at Middleton: IP1.2, IP1.3, IP1.6
    await expect(
      page.getByText(/oee.*foam-making lines/i)
    ).not.toBeVisible();

    await expect(
      page.getByText(/mattress otd/i)
    ).not.toBeVisible();

    await expect(
      page.getByText(/poznan line utilisation/i)
    ).not.toBeVisible();
  });
});
