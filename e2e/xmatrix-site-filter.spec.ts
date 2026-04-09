import { test, expect, Page } from "@playwright/test";

/**
 * Test 2 — Select Vita Middleton in hierarchy breadcrumb,
 * verify X-Matrix filters to show only deployed objectives.
 *
 * Vita Middleton (siteId=1) has deployment targets for BOs: C1, S1, M1.
 * Correlation tracing chain:
 *   BOs: C1, S1, M1
 *   AOs: T1, T2, T5, T6
 *   Projects: FB-1.1, FB-1.2, FB-1.3, FB-1.4, ENT-1.1
 *   KPIs: IP1.1, IP1.4, IP1.5, IP1.7
 *
 * Items NOT deployed to Middleton:
 *   BOs: D1, Q1
 *   Projects: FM-1.1 (Poznan), ES-1.1 (OEE Almelo & Essen)
 *   KPIs: IP1.2 (OEE F&B), IP1.3 (Mattress OTD), IP1.6 (Poznan utilisation)
 */

/** Navigate breadcrumb to Vita Middleton (Furniture & Bedding → Vita Middleton) */
async function selectVitaMiddleton(page: Page) {
  // Scope to the HierarchyNavigator <nav aria-label="Hierarchy navigation">
  const nav = page.getByLabel("Hierarchy navigation");

  // Use keyboard to open the BU dropdown instead of .click() — same
  // DismissableLayer race condition as the site dropdown below.
  const buTrigger = nav.locator("button").filter({ hasText: /select business unit/i });
  await expect(buTrigger).toBeVisible();
  await buTrigger.focus();
  await page.keyboard.press("Enter");

  // Select "Furniture & Bedding" from the dropdown menu (renders in a portal,
  // so we use page-level menuitem role which uniquely targets the dropdown)
  const buOption = page.getByRole("menuitem", { name: /furniture/i }).first();
  await expect(buOption).toBeVisible();
  await buOption.click();

  // Wait for the BU dropdown to fully close before proceeding.
  // Radix DismissableLayer briefly suppresses pointer events after a menu closes
  // to prevent click-through. Without this wait the site dropdown trigger click
  // lands inside that suppression window and the menu never opens (~53 ms gap
  // observed in traces from run 23786548344).
  await expect(buOption).not.toBeVisible();

  // Wait for BU selection to take effect — "Select Site" appears in the nav
  const sitePrompt = nav.getByText(/select site/i);
  await expect(sitePrompt).toBeVisible({ timeout: 10_000 });

  // Use keyboard to open the site dropdown instead of .click().
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
  const siteTrigger = nav.locator("button").filter({ hasText: /select site/i });
  await siteTrigger.focus();
  await page.keyboard.press("Enter");

  // Select "Vita Middleton" from the site dropdown
  const siteOption = page
    .getByRole("menuitem", { name: /vita middleton/i })
    .first();
  await expect(siteOption).toBeVisible();
  await siteOption.click();

  // Wait for filtering to apply — verify a known Middleton BO appears
  await expect(
    page.getByText(/reduce.*manufacturing waste/i).first()
  ).toBeVisible({ timeout: 10_000 });
}

test.describe("X-Matrix Site Filtering — Vita Middleton", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/xmatrix");
    await page.waitForLoadState("domcontentloaded");

    // Wait for the X-Matrix to render with full enterprise data
    await expect(page.getByText(/vita group/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("should show all 5 BOs in full enterprise view before filtering", async ({
    page,
  }) => {
    const boCodes = ["C1", "S1", "D1", "Q1", "M1"];
    for (const code of boCodes) {
      await expect(page.getByText(code, { exact: true }).first()).toBeVisible();
    }
  });

  test("should filter X-Matrix when Vita Middleton site is selected", async ({
    page,
  }) => {
    await selectVitaMiddleton(page);

    // Verify BOs that SHOULD be visible (deployed to Middleton)
    await expect(
      page.getByText(/reduce.*manufacturing waste/i).first()
    ).toBeVisible();

    await expect(
      page.getByText(/zero lost-time incidents/i).first()
    ).toBeVisible();

    await expect(
      page.getByText(/continuous improvement culture/i).first()
    ).toBeVisible();

    // Verify BOs that should NOT be visible (not deployed to Middleton)
    await expect(page.getByText(/grow.*mattress revenue/i)).not.toBeVisible();
    await expect(page.getByText(/achieve oee/i)).not.toBeVisible();
  });

  test("should show correct projects for Vita Middleton", async ({ page }) => {
    await selectVitaMiddleton(page);

    // Projects visible at Middleton: FB-1.1, FB-1.2, FB-1.3, FB-1.4, ENT-1.1
    await expect(
      page.getByText(/middleton foam scrap reduction/i).first()
    ).toBeVisible();

    await expect(
      page.getByText(/dukinfield conversion line/i).first()
    ).toBeVisible();

    await expect(
      page.getByText(/safety audit programme/i).first()
    ).toBeVisible();

    await expect(page.getByText(/smed programme/i).first()).toBeVisible();

    await expect(page.getByText(/ci academy launch/i).first()).toBeVisible();

    // Projects NOT visible at Middleton: FM-1.1, ES-1.1
    await expect(page.getByText(/poznan mattress line/i)).not.toBeVisible();
    await expect(page.getByText(/oee digital rollout/i)).not.toBeVisible();
  });

  test("should show correct KPIs for Vita Middleton", async ({ page }) => {
    await selectVitaMiddleton(page);

    // KPIs visible at Middleton: IP1.1, IP1.4, IP1.5, IP1.7
    await expect(page.getByText(/foam scrap rate/i).first()).toBeVisible();

    await expect(
      page.getByText(/lost-time incidents/i).first()
    ).toBeVisible();

    await expect(page.getByText(/changeover time/i).first()).toBeVisible();

    await expect(
      page.getByText(/ci academy operators trained/i).first()
    ).toBeVisible();

    // KPIs NOT visible at Middleton: IP1.2, IP1.3, IP1.6
    await expect(page.getByText(/oee.*foam-making lines/i)).not.toBeVisible();
    await expect(page.getByText(/mattress otd/i)).not.toBeVisible();
    await expect(page.getByText(/poznan line utilisation/i)).not.toBeVisible();
  });
});
