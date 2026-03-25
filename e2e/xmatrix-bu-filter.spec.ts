import { test, expect } from "@playwright/test";

/**
 * Test 3 — Select Furniture & Bedding BU in hierarchy breadcrumb,
 * verify X-Matrix shows the union of all objectives deployed to sites in that BU.
 *
 * Furniture & Bedding BU contains:
 *   - Vita Middleton (siteId=1): C1, S1, M1 deployed
 *   - Vita Dukinfield (siteId=2): C1, S1 deployed
 *
 * Union of BOs across both sites: C1, S1, M1
 * This is broader than a single site but narrower than the full enterprise
 * (which includes D1, Q1 deployed to other BUs).
 *
 * The BU filter should show:
 *   BOs: C1, S1, M1 (NOT D1, Q1)
 *   AOs: T1, T2, T5, T6 (NOT T3, T4)
 *   Projects: P1.1, P1.2, P1.3, P1.6, P1.7 (NOT P1.4, P1.5)
 *   KPIs: IP1.1, IP1.4, IP1.5, IP1.7 (NOT IP1.2, IP1.3, IP1.6)
 */

test.describe("X-Matrix BU Filtering — Furniture & Bedding", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the X-Matrix page
    await page.goto("/xmatrix");
    await page.waitForLoadState("networkidle");

    // Wait for the X-Matrix to render
    await expect(
      page.getByText(/vita group/i).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("should filter X-Matrix to BU scope when Furniture & Bedding is selected", async ({
    page,
  }) => {
    // Step 1: Click "Select Business Unit" in the hierarchy breadcrumb
    const buPrompt = page.getByText(/select business unit/i);
    await expect(buPrompt).toBeVisible({ timeout: 10_000 });
    await buPrompt.click();

    // Step 2: Select "Furniture & Bedding" BU
    const buOption = page.getByText(/furniture/i).first();
    await expect(buOption).toBeVisible({ timeout: 5_000 });
    await buOption.click();

    // Wait for BU filtering to apply (but do NOT select a site — stay at BU level)
    await page.waitForTimeout(2_000);

    // Step 3: Verify BOs that SHOULD be visible (deployed to F&B sites)
    // C1 — deployed to both Middleton and Dukinfield
    await expect(
      page.getByText(/reduce.*manufacturing waste/i).first()
    ).toBeVisible({ timeout: 10_000 });

    // S1 — deployed to both Middleton and Dukinfield
    await expect(
      page.getByText(/zero lost-time incidents/i).first()
    ).toBeVisible();

    // M1 — deployed to Middleton
    await expect(
      page.getByText(/continuous improvement culture/i).first()
    ).toBeVisible();

    // Step 4: Verify BOs that should NOT be visible (deployed to other BUs only)
    // D1 — deployed to Vita Mattress Poland (different BU)
    await expect(
      page.getByText(/grow.*mattress revenue/i)
    ).not.toBeVisible();

    // Q1 — deployed to Almelo and Essen (different BU)
    await expect(
      page.getByText(/achieve oee/i)
    ).not.toBeVisible();
  });

  test("should show broader results than single site when BU is selected", async ({
    page,
  }) => {
    // Select BU
    const buPrompt = page.getByText(/select business unit/i);
    await expect(buPrompt).toBeVisible({ timeout: 10_000 });
    await buPrompt.click();
    await page.getByText(/furniture/i).first().click();
    await page.waitForTimeout(2_000);

    // At BU level, the breadcrumb should show the BU name but no site selected
    // The "Select Site" prompt should be visible (indicating we're at BU level, not site)
    await expect(
      page.getByText(/select site/i)
    ).toBeVisible({ timeout: 10_000 });

    // The X-Matrix should show projects from BOTH Middleton and Dukinfield
    // P1.1 — Middleton foam scrap reduction
    await expect(
      page.getByText(/middleton foam scrap reduction/i).first()
    ).toBeVisible({ timeout: 10_000 });

    // P1.2 — Dukinfield conversion line waste mapping
    await expect(
      page.getByText(/dukinfield conversion line/i).first()
    ).toBeVisible();

    // But NOT projects from other BUs
    // P1.4 — Poznan mattress line ramp-up (Finished Mattress BU)
    await expect(
      page.getByText(/poznan mattress line/i)
    ).not.toBeVisible();

    // P1.5 — OEE digital rollout Almelo & Essen (Technical Foams BU)
    await expect(
      page.getByText(/oee digital rollout/i)
    ).not.toBeVisible();
  });

  test("should return to full enterprise view when BU is deselected", async ({
    page,
  }) => {
    // Select BU first
    const buPrompt = page.getByText(/select business unit/i);
    await expect(buPrompt).toBeVisible({ timeout: 10_000 });
    await buPrompt.click();
    await page.getByText(/furniture/i).first().click();
    await page.waitForTimeout(2_000);

    // Verify D1 is NOT visible at BU level
    await expect(
      page.getByText(/grow.*mattress revenue/i)
    ).not.toBeVisible();

    // Navigate back to full enterprise view by going to the dashboard and back
    // (or by clicking the enterprise level in the breadcrumb)
    await page.goto("/xmatrix");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2_000);

    // In full enterprise view, ALL 5 BOs should be visible again
    await expect(
      page.getByText(/reduce.*manufacturing waste/i).first()
    ).toBeVisible({ timeout: 15_000 });

    await expect(
      page.getByText(/grow.*mattress revenue/i).first()
    ).toBeVisible();

    await expect(
      page.getByText(/achieve oee/i).first()
    ).toBeVisible();
  });
});
