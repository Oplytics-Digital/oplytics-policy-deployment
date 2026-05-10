import { test, expect, Page } from "@playwright/test";

/**
 * Test 3 — Select Furniture & Bedding BU in hierarchy breadcrumb,
 * verify X-Matrix shows the union of all objectives deployed to sites in that BU.
 *
 * Furniture & Bedding BU contains:
 *   - Vita Middleton (siteId=1): C1, S1, M1 deployed
 *   - Vita Dukinfield (siteId=2): C1, S1 deployed
 *
 * F&B sites run foam-making and cutting lines, so Q1 (Achieve OEE >85%) is
 * also in scope via its weak bo-ao link to T1 (foam scrap at Middleton & Dukinfield).
 *
 * Union of BOs in scope at F&B: C1, S1, M1, Q1
 * D1 (Grow mattress revenue) is Finished Mattress only — not visible here.
 *
 * The BU filter should show:
 *   BOs: C1, S1, M1, Q1 (NOT D1)
 *   AOs: T1, T2, T5, T6 (NOT T3, T4)
 *   Projects: FB-1.1, FB-1.2, FB-1.3, FB-1.4, ENT-1.1 (NOT FM-1.1, ES-1.1)
 *   KPIs: IP1.1, IP1.4, IP1.5, IP1.7 (NOT IP1.2, IP1.3, IP1.6)
 */

/** Select Furniture & Bedding BU in the hierarchy breadcrumb (stay at BU level) */
async function selectFurnitureBU(page: Page) {
  // Scope to the HierarchyNavigator <nav aria-label="Hierarchy navigation">
  const nav = page.getByLabel("Hierarchy navigation");

  // Use keyboard to open the BU dropdown instead of .click().
  //
  // Playwright's full .click() sequence fires:
  //   pointerdown → React opens dropdown → DismissableLayer mounts
  //   → DismissableLayer's document pointerdown listener captures the trigger
  //     pointerdown as an "outside" event (React 18 flushes synchronously,
  //     so the layer is already mounted when the event finishes bubbling)
  //   → immediate onDismiss → dropdown closes before click even returns
  //
  // Keyboard activation (focus + Enter) dispatches only keydown/keypress/keyup
  // via CDP. No pointer events fire, so DismissableLayer never detects an
  // outside interaction and the menu stays open.
  const buTrigger = nav.locator("button").filter({ hasText: /select business unit/i });
  await expect(buTrigger).toBeVisible();
  await buTrigger.focus();
  await page.keyboard.press("Enter");

  // Select "Furniture & Bedding" from the dropdown menu (renders in a portal,
  // so we use page-level menuitem role which uniquely targets the dropdown)
  const buOption = page.getByRole("menuitem", { name: /furniture/i }).first();
  await expect(buOption).toBeVisible();
  await buOption.click();

  // Wait for BU filtering to apply — "Select Site" prompt confirms BU is selected
  await expect(nav.getByText(/select site/i)).toBeVisible({ timeout: 10_000 });
}

test.describe("X-Matrix BU Filtering — Furniture & Bedding", () => {
  test.beforeEach(async ({ page }) => {
    // Clear sessionStorage before each test so no persisted hierarchy selection
    // bleeds in from a previous test run.
    await page.goto("/xmatrix");
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    // Wait for the X-Matrix to render
    await expect(page.getByText(/vita group/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("should filter X-Matrix to BU scope when Furniture & Bedding is selected", async ({
    page,
  }) => {
    await selectFurnitureBU(page);

    // Verify BOs that SHOULD be visible (deployed to F&B sites)
    await expect(
      page.getByText(/reduce.*manufacturing waste/i).first()
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByText(/zero lost-time incidents/i).first()
    ).toBeVisible();

    await expect(
      page.getByText(/continuous improvement culture/i).first()
    ).toBeVisible();

    // Q1 is also in scope — F&B sites have foam-making and cutting lines
    await expect(page.getByText(/achieve oee/i).first()).toBeVisible();

    // D1 (Finished Mattress only) should NOT be visible
    await expect(page.getByText(/grow.*mattress revenue/i)).not.toBeVisible();
  });

  test("should show broader results than single site when BU is selected", async ({
    page,
  }) => {
    await selectFurnitureBU(page);

    // At BU level, the "Select Site" prompt should be visible
    const nav = page.getByLabel("Hierarchy navigation");
    await expect(nav.getByText(/select site/i)).toBeVisible();

    // X-Matrix should show projects from BOTH Middleton and Dukinfield
    await expect(
      page.getByText(/middleton foam scrap reduction/i).first()
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByText(/dukinfield conversion line/i).first()
    ).toBeVisible();

    // But NOT projects from other BUs
    await expect(page.getByText(/poznan mattress line/i)).not.toBeVisible();
    await expect(page.getByText(/oee digital rollout/i)).not.toBeVisible();
  });

  test("should return to full enterprise view when BU is deselected", async ({
    page,
  }) => {
    await selectFurnitureBU(page);

    // Verify D1 is NOT visible at BU level
    await expect(page.getByText(/grow.*mattress revenue/i)).not.toBeVisible();

    // Click enterprise name in breadcrumb to reset to enterprise-wide view
    const nav = page.getByLabel("Hierarchy navigation");
    const enterpriseBtn = nav.locator("button").filter({ hasText: /vita group/i });
    await expect(enterpriseBtn).toBeVisible();
    await enterpriseBtn.click();

    // In full enterprise view, ALL 5 BOs should be visible again
    await expect(
      page.getByText(/reduce.*manufacturing waste/i).first()
    ).toBeVisible({ timeout: 15_000 });

    await expect(
      page.getByText(/grow.*mattress revenue/i).first()
    ).toBeVisible();

    await expect(page.getByText(/achieve oee/i).first()).toBeVisible();
  });
});
