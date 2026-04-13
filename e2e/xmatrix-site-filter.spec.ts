import { test, expect, Page } from "@playwright/test";

/**
 * Test 2 — Select Vita Middleton in hierarchy breadcrumb,
 * verify X-Matrix filters to show only deployed objectives.
 *
 * Vita Middleton (siteId=1) has foam-making and cutting lines, so Q1 (Achieve OEE >85%)
 * is also in scope via its weak bo-ao link to T1.
 *
 * With project-level cascadeScope filtering:
 *   BOs: C1, S1, M1, Q1 (traced UP from AOs)
 *   AOs: T1, T2, T5, T6
 *   Projects: FB-1.1 (site=[1]), FB-1.3 (bu=[F&B]), ENT-1.1 (enterprise)
 *   KPIs: IP1.1, IP1.4, IP1.7 (traced DOWN from visible projects)
 *
 * Items NOT deployed to Middleton:
 *   BOs: D1
 *   Projects: FB-1.2 (site=[2] Dukinfield), FB-1.4 (site=[Bedford,Corby]),
 *             FM-1.1 (site=[Poznan]), ES-1.1 (site=[Almelo,Essen])
 *   KPIs: IP1.2 (OEE F&B), IP1.3 (Mattress OTD), IP1.5 (changeover time),
 *         IP1.6 (Poznan utilisation)
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

  // Select "Vita Middleton" from the site dropdown.
  // Use focus + Enter instead of .click() — the BU menu's DismissableLayer briefly
  // suppresses pointer events after closing, which can cause .click() on the site
  // menu item to time out even though the element is visible.
  const siteOption = page
    .getByRole("menuitem", { name: /vita middleton/i })
    .first();
  await expect(siteOption).toBeVisible();
  await siteOption.focus();
  await page.keyboard.press("Enter");

  // Wait for filtering to apply — verify a known Middleton BO appears
  await expect(
    page.getByText(/reduce.*manufacturing waste/i).first()
  ).toBeVisible({ timeout: 10_000 });
}

test.describe("X-Matrix Site Filtering — Vita Middleton", () => {
  test.beforeEach(async ({ page }) => {
    // Clear sessionStorage before each test so no persisted hierarchy selection
    // bleeds in from a previous test run.
    await page.goto("/xmatrix");
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
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

    // Q1 is also in scope — Middleton has foam-making and cutting lines
    await expect(page.getByText(/achieve oee/i).first()).toBeVisible();

    // D1 (Finished Mattress only) should NOT be visible
    await expect(page.getByText(/grow.*mattress revenue/i)).not.toBeVisible();
  });

  test("should show correct projects for Vita Middleton", async ({ page }) => {
    await selectVitaMiddleton(page);

    // Projects visible at Middleton: FB-1.1 (site=[1]), FB-1.3 (bu=[F&B]), ENT-1.1 (enterprise)
    await expect(
      page.getByText(/middleton foam scrap reduction/i).first()
    ).toBeVisible();

    await expect(
      page.getByText(/safety audit programme/i).first()
    ).toBeVisible();

    await expect(page.getByText(/ci academy launch/i).first()).toBeVisible();

    // Projects NOT visible at Middleton:
    // FB-1.2 (site=[2] Dukinfield only), FB-1.4 (site=[Bedford,Corby]),
    // FM-1.1 (site=[Poznan]), ES-1.1 (site=[Almelo,Essen])
    await expect(page.getByText(/dukinfield conversion line/i)).not.toBeVisible();
    await expect(page.getByText(/smed programme/i)).not.toBeVisible();
    await expect(page.getByText(/poznan mattress line/i)).not.toBeVisible();
    await expect(page.getByText(/oee digital rollout/i)).not.toBeVisible();
  });

  test("should show correct KPIs for Vita Middleton", async ({ page }) => {
    await selectVitaMiddleton(page);

    // KPIs visible at Middleton: IP1.1, IP1.4, IP1.7
    // (traced from visible projects: FB-1.1→IP1.1, FB-1.3→IP1.4, ENT-1.1→IP1.7)
    await expect(page.getByText(/foam scrap rate/i).first()).toBeVisible();

    await expect(
      page.getByText(/lost-time incidents/i).first()
    ).toBeVisible();

    await expect(
      page.getByText(/ci academy operators trained/i).first()
    ).toBeVisible();

    // KPIs NOT visible at Middleton: IP1.2, IP1.3, IP1.5, IP1.6
    // IP1.5 (changeover time) links to FB-1.4 which is at Bedford & Corby
    await expect(page.getByText(/oee.*foam-making lines/i)).not.toBeVisible();
    await expect(page.getByText(/mattress otd/i)).not.toBeVisible();
    await expect(page.getByText(/changeover time/i)).not.toBeVisible();
    await expect(page.getByText(/poznan line utilisation/i)).not.toBeVisible();
  });
});
