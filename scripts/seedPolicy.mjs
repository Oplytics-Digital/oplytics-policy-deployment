/**
 * Seed script: Populate Vita Group policy deployment data into the database.
 *
 * Run from project root:
 *   node --import tsx scripts/seedPolicy.mjs
 *
 * Requires:
 *   - DATABASE_URL env var (set in .env or Manus secrets)
 *   - tsx installed (pnpm add -D tsx)
 *
 * This is the standalone version — no enterprises/sites tables.
 * enterpriseId and siteId are plain ints matching the Portal Service API.
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";

// Dynamic import for schema (TS compiled at runtime via tsx)
const schemaModule = await import("../drizzle/schema.ts");
const {
  policyPlans,
  breakthroughObjectives,
  annualObjectives,
  improvementProjects,
  policyKpis,
  policyCorrelations,
  bowlingEntries,
  deploymentTargets,
} = schemaModule;

const db = drizzle(process.env.DATABASE_URL);

// ─── Configuration ───
// Set this to the enterprise ID from the Portal Service API.
// Vita Group = 1 in the default seed. Update if your Portal assigns a different ID.
const ENTERPRISE_ID = 1;

// Site codes used by the policy seed (stable across re-seeds; IDs are auto-increment).
// Keyed by display name (used in deploymentTargets.siteName) → portal site code.
//
// Lincoln Electric Europe hierarchy (from portal seed-lincoln.mjs):
//   UK & Ireland (LEE-UKI): Sheffield (LEE-SHF), Wigan (LEE-WGN)
//   Continental Europe (LEE-CE): Bester Poland (LEE-BST), Kaynak Turkey (LEE-KYN)
const SITE_CODE_MAP = {
  "Sheffield":       "LEE-SHF",   // UK & Ireland — primary UK site
  "Wigan":           "LEE-WGN",   // UK & Ireland — secondary UK site
  "Bester Poland":   "LEE-BST",   // Continental Europe — Poland facility
  "Kaynak Turkey":   "LEE-KYN",   // Continental Europe — Turkey facility
};

/**
 * Fetch site IDs from the Portal hierarchy API so they always match the live DB.
 * Uses PORTAL_URL + PORTAL_API_KEY env vars (same as the runtime server).
 * Returns a map of display name → portal siteId.
 */
async function fetchSiteIds() {
  const portalUrl = process.env.PORTAL_URL;
  const apiKey = process.env.PORTAL_API_KEY;

  if (!portalUrl) {
    throw new Error("PORTAL_URL env var is not set. Cannot resolve site IDs from portal.");
  }

  const url = `${portalUrl}/api/service/hierarchy/enterprises/${ENTERPRISE_ID}/sites`;
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers["X-Service-Key"] = apiKey;

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Portal hierarchy API returned ${response.status}: ${await response.text()}`);
  }

  const allSites = await response.json();
  // Build a code → id index
  const codeToId = {};
  for (const site of allSites) {
    codeToId[site.code] = site.id;
  }

  // Resolve each named site via its stable code
  const siteIds = {};
  for (const [name, code] of Object.entries(SITE_CODE_MAP)) {
    const id = codeToId[code];
    if (!id) throw new Error(`Site with code "${code}" (${name}) not found in portal hierarchy. Has the portal been seeded?`);
    siteIds[name] = id;
    console.log(`  Site lookup: "${name}" (${code}) → id=${id}`);
  }

  return siteIds;
}

// Resolved at runtime — populated by fetchSiteIds() before seeding
let SITE_IDS = {};

// ---------------------------------------------------------------------------
// Cross-BU correlation validator
// Checks every AO→Project correlation to ensure source and target belong to
// the same business unit. "cross" entries are exempt (enterprise-wide scope).
// Throws if any violation is found so the seed never silently inserts bad data.
// ---------------------------------------------------------------------------
const BU_OF = {
  ao: {
    T1: "fb",     // F&B — foam scrap reduction at Middleton & Dukinfield
    T2: "fb",     // F&B — safety audits across F&B sites
    T3: "fm",     // Finished Mattress — Poznan line ramp-up
    T4: "es",     // Engineered Solutions — OEE at Almelo & Essen
    T5: "fb",     // F&B — changeover reduction at Bedford & Corby
    T6: "cross",  // Enterprise-wide — CI Academy (all BUs)
  },
  project: {
    "FB-1.1": "fb",     // F&B — Middleton foam scrap reduction
    "FB-1.2": "fb",     // F&B — Dukinfield conversion line waste mapping
    "FB-1.3": "fb",     // F&B — division safety audit programme
    "FM-1.1": "fm",     // Finished Mattress — Poznan mattress line ramp-up
    "ES-1.1": "es",     // ES — OEE digital rollout at Almelo & Essen
    "FB-1.4": "fb",     // F&B — SMED at Bedford & Corby cutting lines
    "ENT-1.1": "cross", // Enterprise-wide — Vita CI Academy launch
  },
};

function validateCrossBuCorrelations(correlations, aoIds, projIds) {
  const aoCodeById = Object.fromEntries(Object.entries(aoIds).map(([code, id]) => [id, code]));
  const projCodeById = Object.fromEntries(Object.entries(projIds).map(([code, id]) => [id, code]));

  const violations = [];
  for (const corr of correlations) {
    if (corr.sourceType !== "ao" || corr.targetType !== "project") continue;
    const aoCode = aoCodeById[corr.sourceId];
    const projCode = projCodeById[corr.targetId];
    if (!aoCode || !projCode) continue;
    const aoBu = BU_OF.ao[aoCode];
    const projBu = BU_OF.project[projCode];
    if (!aoBu || !projBu) continue;
    if (aoBu !== "cross" && projBu !== "cross" && aoBu !== projBu) {
      violations.push(`  AO ${aoCode} (${aoBu.toUpperCase()}) → Project ${projCode} (${projBu.toUpperCase()})`);
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `Cross-BU correlation violations detected — seed aborted:\n${violations.join("\n")}\n` +
      `Check that each AO only links to projects within the same business unit.`
    );
  }
}

async function seed() {
  console.log("🌱 Seeding Vita Group policy deployment data...");
  console.log(`  Enterprise ID: ${ENTERPRISE_ID}`);

  // Resolve site IDs from the live portal API
  console.log("\nResolving site IDs from portal hierarchy API...");
  SITE_IDS = await fetchSiteIds();
  console.log();

  // 1. Check if plan already exists
  const existingPlans = await db
    .select()
    .from(policyPlans)
    .where(eq(policyPlans.enterpriseId, ENTERPRISE_ID));

  let planId;
  let boIds = {};
  let aoIds = {};
  let projIds = {};
  let kpiIds = {};

  if (existingPlans.length > 0) {
    planId = existingPlans[0].id;
    console.log(`  Plan already exists: "${existingPlans[0].title}" (id=${planId})`);

    // Load existing IDs by code
    const bos = await db.select().from(breakthroughObjectives).where(eq(breakthroughObjectives.planId, planId));
    for (const bo of bos) boIds[bo.code] = bo.id;
    const aos = await db.select().from(annualObjectives).where(eq(annualObjectives.planId, planId));
    for (const ao of aos) aoIds[ao.code] = ao.id;
    const projs = await db.select().from(improvementProjects).where(eq(improvementProjects.planId, planId));
    for (const p of projs) projIds[p.code] = p.id;
    const kpis = await db.select().from(policyKpis).where(eq(policyKpis.planId, planId));
    for (const k of kpis) kpiIds[k.code] = k.id;

    console.log(`  Loaded existing BOs: ${Object.keys(boIds).join(", ")}`);
    console.log(`  Loaded existing AOs: ${Object.keys(aoIds).join(", ")}`);
    console.log(`  Loaded existing Projects: ${Object.keys(projIds).join(", ")}`);
    console.log(`  Loaded existing KPIs: ${Object.keys(kpiIds).join(", ")}`);
  } else {
    // 2. Create policy plan
    const planResult = await db.insert(policyPlans).values({
      enterpriseId: ENTERPRISE_ID,
      title: "Vita Group — 3-Year Strategic Policy Deployment X-Matrix",
      year: 2026,
      level: "enterprise",
      ownerName: "Alan Blythe",
      status: "active",
    });
    planId = planResult[0].insertId;
    console.log(`  Created plan: id=${planId}`);

    // 3. Breakthrough Objectives (category-based reference codes)
    const boData = [
      { code: "C1", description: "Reduce group-wide manufacturing waste by 40% across all 20 sites", category: "cost", sortOrder: 1 },
      { code: "S1", description: "Achieve zero lost-time incidents across Furniture & Bedding division", category: "safety", sortOrder: 2 },
      { code: "D1", description: "Grow Finished Mattress revenue 25% through new EU market penetration", category: "delivery", sortOrder: 3 },
      { code: "Q1", description: "Achieve OEE >85% on all foam-making and cutting lines", category: "quality", sortOrder: 4 },
      { code: "M1", description: "Build a continuous improvement culture with 80%+ engagement across all BUs", category: "people", sortOrder: 5 },
    ];

    for (const bo of boData) {
      const result = await db.insert(breakthroughObjectives).values({ planId, ...bo });
      boIds[bo.code] = result[0].insertId;
      console.log(`  BO: ${bo.code} → id=${boIds[bo.code]}`);
    }

    // 4. Annual Objectives
    const aoData = [
      { code: "T1", description: "Reduce foam scrap rate from 8.2% to 5.5% at Middleton & Dukinfield sites", ownerName: "Robin Parry", status: "on-track", sortOrder: 1 },
      { code: "T2", description: "Implement standardised safety audits across all 9 F&B sites", ownerName: "Rachel Attwood", status: "on-track", sortOrder: 2 },
      { code: "T3", description: "Launch mattress production at Vita Mattress Poland (Poznan) to full capacity", ownerName: "Omar Hoek", status: "at-risk", sortOrder: 3 },
      { code: "T4", description: "Deploy OEE tracking on all foam-making machines across Almelo & Essen", ownerName: "Markus Westerkamp", status: "on-track", sortOrder: 4 },
      { code: "T5", description: "Reduce changeover time by 35% on cutting lines at Bedford & Corby", ownerName: "Laura Whitfield", status: "off-track", sortOrder: 5 },
      { code: "T6", description: "Roll out Vita CI Academy training programme to 200+ operators", ownerName: "Cyril Wasem", status: "on-track", sortOrder: 6 },
    ];

    for (const ao of aoData) {
      const result = await db.insert(annualObjectives).values({ planId, ...ao });
      aoIds[ao.code] = result[0].insertId;
      console.log(`  AO: ${ao.code} → id=${aoIds[ao.code]}`);
    }

    // 5. Improvement Projects
    const projData = [
      { code: "FB-1.1", name: "Middleton foam scrap reduction", description: "Root-cause analysis and process parameter optimisation on MID-FM1 and MID-FM2 foam-making machines to reduce off-spec blocks", ownerName: "Robin Parry", status: "on-track", progress: 62, startDate: "2026-01-15", endDate: "2026-06-30", category: "cost", sortOrder: 1 },
      { code: "FB-1.2", name: "Dukinfield conversion line waste mapping", description: "Value-stream mapping of DUK-CV1 and DUK-CV2 conversion lines to identify and eliminate waste in the lamination and bonding process", ownerName: "James Henderson", status: "on-track", progress: 45, startDate: "2026-02-01", endDate: "2026-08-31", category: "cost", sortOrder: 2 },
      { code: "FB-1.3", name: "F&B division safety audit programme", description: "Design and deploy standardised safety audit checklists, near-miss reporting, and monthly review cadence across all 9 Furniture & Bedding sites", ownerName: "Rachel Attwood", status: "at-risk", progress: 35, startDate: "2026-01-01", endDate: "2026-12-31", category: "safety", sortOrder: 3 },
      { code: "FM-1.1", name: "Poznan mattress line ramp-up", description: "Commission MPL-ML1 mattress assembly line in Poznan, train local operators, and achieve 80% utilisation within 6 months", ownerName: "Omar Hoek", status: "at-risk", progress: 28, startDate: "2026-03-01", endDate: "2026-09-30", category: "delivery", sortOrder: 4 },
      { code: "ES-1.1", name: "OEE digital rollout — Almelo & Essen", description: "Install OEE sensors and dashboards on ALM-FL1, ALM-CT1, and ESS-FL1 machines; integrate with Oplytics OEE Manager platform", ownerName: "Markus Westerkamp", status: "on-track", progress: 55, startDate: "2026-02-01", endDate: "2026-07-31", category: "quality", sortOrder: 5 },
      { code: "FB-1.4", name: "SMED programme — Bedford & Corby cutting lines", description: "Apply Single-Minute Exchange of Dies methodology to BED-FM1 and COR cutting lines to reduce changeover from 42 min to target 27 min", ownerName: "Laura Whitfield", status: "off-track", progress: 18, startDate: "2026-01-15", endDate: "2026-07-31", category: "delivery", sortOrder: 6 },
      { code: "ENT-1.1", name: "Vita CI Academy launch", description: "Develop and deliver continuous improvement training modules (5S, problem solving, standard work) to 200+ operators across all 4 business units", ownerName: "Cyril Wasem", status: "on-track", progress: 40, startDate: "2026-02-01", endDate: "2026-11-30", category: "people", sortOrder: 7 },
    ];

    for (const proj of projData) {
      const result = await db.insert(improvementProjects).values({ planId, ...proj });
      projIds[proj.code] = result[0].insertId;
      console.log(`  Project: ${proj.code} → id=${projIds[proj.code]}`);
    }

    // 6. KPIs
    const kpiData = [
      { code: "IP1.1", name: "Foam scrap rate (Middleton)", unit: "%", target: "5.50", current: "7.10", direction: "down", ownerName: "Robin Parry", sortOrder: 1 },
      { code: "IP1.2", name: "OEE — F&B foam-making lines", unit: "%", target: "85.00", current: "72.40", direction: "up", ownerName: "Markus Westerkamp", sortOrder: 2 },
      { code: "IP1.3", name: "Mattress OTD (Finished Mattress BU)", unit: "%", target: "97.00", current: "91.80", direction: "up", ownerName: "Omar Hoek", sortOrder: 3 },
      { code: "IP1.4", name: "Lost-time incidents (F&B division)", unit: "incidents", target: "0.00", current: "3.00", direction: "down", ownerName: "Rachel Attwood", sortOrder: 4 },
      { code: "IP1.5", name: "Cutting line changeover time (Bedford)", unit: "minutes", target: "27.00", current: "42.00", direction: "down", ownerName: "Laura Whitfield", sortOrder: 5 },
      { code: "IP1.6", name: "Poznan line utilisation", unit: "%", target: "80.00", current: "34.00", direction: "up", ownerName: "Omar Hoek", sortOrder: 6 },
      { code: "IP1.7", name: "CI Academy operators trained", unit: "people", target: "200.00", current: "48.00", direction: "up", ownerName: "Cyril Wasem", sortOrder: 7 },
    ];

    for (const kpi of kpiData) {
      const result = await db.insert(policyKpis).values({ planId, ...kpi });
      kpiIds[kpi.code] = result[0].insertId;
      console.log(`  KPI: ${kpi.code} → id=${kpiIds[kpi.code]}`);
    }

    // 7. Correlations (X-Matrix links)
    const correlations = [
      // BO ↔ AO (bo-ao)
      { sourceId: boIds["C1"], targetId: aoIds["T1"], sourceType: "bo", targetType: "ao", strength: "strong", quadrant: "bo-ao" },
      { sourceId: boIds["C1"], targetId: aoIds["T5"], sourceType: "bo", targetType: "ao", strength: "weak", quadrant: "bo-ao" },
      { sourceId: boIds["S1"], targetId: aoIds["T2"], sourceType: "bo", targetType: "ao", strength: "strong", quadrant: "bo-ao" },
      { sourceId: boIds["D1"], targetId: aoIds["T3"], sourceType: "bo", targetType: "ao", strength: "strong", quadrant: "bo-ao" },
      { sourceId: boIds["Q1"], targetId: aoIds["T4"], sourceType: "bo", targetType: "ao", strength: "strong", quadrant: "bo-ao" },
      { sourceId: boIds["Q1"], targetId: aoIds["T1"], sourceType: "bo", targetType: "ao", strength: "weak", quadrant: "bo-ao" },
      { sourceId: boIds["M1"], targetId: aoIds["T6"], sourceType: "bo", targetType: "ao", strength: "strong", quadrant: "bo-ao" },
      { sourceId: boIds["M1"], targetId: aoIds["T2"], sourceType: "bo", targetType: "ao", strength: "weak", quadrant: "bo-ao" },
      // AO ↔ Project (ao-proj)
      { sourceId: aoIds["T1"], targetId: projIds["FB-1.1"], sourceType: "ao", targetType: "project", strength: "strong", quadrant: "ao-proj" },
      { sourceId: aoIds["T1"], targetId: projIds["FB-1.2"], sourceType: "ao", targetType: "project", strength: "strong", quadrant: "ao-proj" },
      { sourceId: aoIds["T2"], targetId: projIds["FB-1.3"], sourceType: "ao", targetType: "project", strength: "strong", quadrant: "ao-proj" },
      { sourceId: aoIds["T3"], targetId: projIds["FM-1.1"], sourceType: "ao", targetType: "project", strength: "strong", quadrant: "ao-proj" },
      { sourceId: aoIds["T4"], targetId: projIds["ES-1.1"], sourceType: "ao", targetType: "project", strength: "strong", quadrant: "ao-proj" },
      { sourceId: aoIds["T5"], targetId: projIds["FB-1.4"], sourceType: "ao", targetType: "project", strength: "strong", quadrant: "ao-proj" },
      { sourceId: aoIds["T6"], targetId: projIds["ENT-1.1"], sourceType: "ao", targetType: "project", strength: "strong", quadrant: "ao-proj" },
      // Project ↔ KPI (proj-kpi)
      { sourceId: projIds["FB-1.1"], targetId: kpiIds["IP1.1"], sourceType: "project", targetType: "kpi", strength: "strong", quadrant: "proj-kpi" },
      { sourceId: projIds["FB-1.2"], targetId: kpiIds["IP1.1"], sourceType: "project", targetType: "kpi", strength: "weak", quadrant: "proj-kpi" },
      { sourceId: projIds["FB-1.3"], targetId: kpiIds["IP1.4"], sourceType: "project", targetType: "kpi", strength: "strong", quadrant: "proj-kpi" },
      { sourceId: projIds["FM-1.1"], targetId: kpiIds["IP1.6"], sourceType: "project", targetType: "kpi", strength: "strong", quadrant: "proj-kpi" },
      { sourceId: projIds["FM-1.1"], targetId: kpiIds["IP1.3"], sourceType: "project", targetType: "kpi", strength: "strong", quadrant: "proj-kpi" },
      { sourceId: projIds["ES-1.1"], targetId: kpiIds["IP1.2"], sourceType: "project", targetType: "kpi", strength: "strong", quadrant: "proj-kpi" },
      { sourceId: projIds["FB-1.4"], targetId: kpiIds["IP1.5"], sourceType: "project", targetType: "kpi", strength: "strong", quadrant: "proj-kpi" },
      { sourceId: projIds["ENT-1.1"], targetId: kpiIds["IP1.7"], sourceType: "project", targetType: "kpi", strength: "strong", quadrant: "proj-kpi" },
      // KPI ↔ BO (kpi-bo)
      { sourceId: kpiIds["IP1.1"], targetId: boIds["C1"], sourceType: "kpi", targetType: "bo", strength: "strong", quadrant: "kpi-bo" },
      { sourceId: kpiIds["IP1.2"], targetId: boIds["Q1"], sourceType: "kpi", targetType: "bo", strength: "strong", quadrant: "kpi-bo" },
      { sourceId: kpiIds["IP1.3"], targetId: boIds["D1"], sourceType: "kpi", targetType: "bo", strength: "strong", quadrant: "kpi-bo" },
      { sourceId: kpiIds["IP1.4"], targetId: boIds["S1"], sourceType: "kpi", targetType: "bo", strength: "strong", quadrant: "kpi-bo" },
      { sourceId: kpiIds["IP1.5"], targetId: boIds["C1"], sourceType: "kpi", targetType: "bo", strength: "weak", quadrant: "kpi-bo" },
      { sourceId: kpiIds["IP1.6"], targetId: boIds["D1"], sourceType: "kpi", targetType: "bo", strength: "strong", quadrant: "kpi-bo" },
      { sourceId: kpiIds["IP1.7"], targetId: boIds["M1"], sourceType: "kpi", targetType: "bo", strength: "strong", quadrant: "kpi-bo" },
    ];

    validateCrossBuCorrelations(correlations, aoIds, projIds);

    for (const corr of correlations) {
      await db.insert(policyCorrelations).values({ planId, ...corr });
    }
    console.log(`  Created ${correlations.length} correlations`);
  } // end of else block (new plan creation)

  // 8. Bowling entries — always run (idempotent check below)
  const existingBowling = await db.select().from(bowlingEntries);
  if (existingBowling.length > 0) {
    console.log(`  Bowling entries already exist (${existingBowling.length}). Skipping.`);
  } else {
    const bowlingData = [];

    // Foam scrap rate (IP1.1) — target 5.5%, starting from 8.2%
    for (let m = 1; m <= 12; m++) {
      bowlingData.push({
        kpiId: kpiIds["IP1.1"], month: m, year: 2026,
        planValue: String(Math.round((8.2 - (2.7 / 12) * m) * 10) / 10),
        actualValue: m <= 2 ? String(Math.round((8.2 - (1.1 / 12) * m) * 10) / 10) : null,
      });
    }
    // OEE F&B (IP1.2) — target 85%, starting from 68%
    for (let m = 1; m <= 12; m++) {
      bowlingData.push({
        kpiId: kpiIds["IP1.2"], month: m, year: 2026,
        planValue: String(Math.round((68 + (17 / 12) * m) * 10) / 10),
        actualValue: m <= 2 ? String(Math.round((68 + (4.4 / 12) * m) * 10) / 10) : null,
      });
    }
    // Mattress OTD (IP1.3) — target 97%, starting from 89%
    for (let m = 1; m <= 12; m++) {
      bowlingData.push({
        kpiId: kpiIds["IP1.3"], month: m, year: 2026,
        planValue: String(Math.round((89 + (8 / 12) * m) * 10) / 10),
        actualValue: m <= 2 ? String(Math.round((89 + (2.8 / 12) * m) * 10) / 10) : null,
      });
    }
    // Lost-time incidents (IP1.4) — target 0, starting from 5
    for (let m = 1; m <= 12; m++) {
      bowlingData.push({
        kpiId: kpiIds["IP1.4"], month: m, year: 2026,
        planValue: String(Math.max(0, Math.round(5 - (5 / 12) * m))),
        actualValue: m <= 2 ? String(Math.round(Math.random() * 2.5)) : null,
      });
    }
    // Changeover time (IP1.5) — target 27 min, starting from 42 min
    for (let m = 1; m <= 12; m++) {
      bowlingData.push({
        kpiId: kpiIds["IP1.5"], month: m, year: 2026,
        planValue: String(Math.round(42 - (15 / 12) * m)),
        actualValue: m <= 2 ? String(Math.round(42 - (3 / 12) * m)) : null,
      });
    }
    // Poznan utilisation (IP1.6) — target 80%, starting from 0%
    for (let m = 1; m <= 12; m++) {
      bowlingData.push({
        kpiId: kpiIds["IP1.6"], month: m, year: 2026,
        planValue: String(m <= 2 ? 0 : m <= 4 ? Math.round(20 * (m - 2)) : Math.round(40 + (40 / 8) * (m - 4))),
        actualValue: m <= 2 ? (m === 1 ? "0" : "12") : null,
      });
    }
    // CI Academy (IP1.7) — target 200, starting from 0
    for (let m = 1; m <= 12; m++) {
      bowlingData.push({
        kpiId: kpiIds["IP1.7"], month: m, year: 2026,
        planValue: String(Math.round((200 / 12) * m)),
        actualValue: m <= 2 ? String(Math.round((200 / 12) * m * 0.9)) : null,
      });
    }

    for (const entry of bowlingData) {
      await db.insert(bowlingEntries).values(entry);
    }
    console.log(`  Created ${bowlingData.length} bowling entries`);
  }

  // 9. Deployment Targets — link objectives to sites with SQDCP categories
  const existingDeps = await db
    .select()
    .from(deploymentTargets)
    .where(eq(deploymentTargets.planId, planId));

  if (existingDeps.length > 0) {
    console.log(`  Deployment targets already exist (${existingDeps.length}). Skipping.`);
  } else {
    const deployments = [
      // C1 → Cost deployments (UK & Ireland sites)
      { objectiveId: boIds["C1"], objectiveType: "bo", objectiveCode: "C1", siteId: SITE_IDS["Sheffield"], siteName: "Sheffield", sqdcpCategory: "cost", deploymentTitle: "Reduce cost per Kg — foam scrap reduction", deploymentDescription: "Target 5.5% scrap rate through process parameter optimisation at Sheffield wire drawing lines", targetMetric: "Foam scrap rate", targetValue: "5.50", currentValue: "7.10", unit: "%", status: "active" },
      { objectiveId: boIds["C1"], objectiveType: "bo", objectiveCode: "C1", siteId: SITE_IDS["Wigan"], siteName: "Wigan", sqdcpCategory: "cost", deploymentTitle: "Reduce conversion waste — flux core production", deploymentDescription: "Value-stream mapping to eliminate waste in Wigan flux core production lines", targetMetric: "Conversion waste rate", targetValue: "3.00", currentValue: "5.20", unit: "%", status: "active" },
      // S1 → Safety deployments (UK & Ireland sites)
      { objectiveId: boIds["S1"], objectiveType: "bo", objectiveCode: "S1", siteId: SITE_IDS["Sheffield"], siteName: "Sheffield", sqdcpCategory: "safety", deploymentTitle: "Reduce incidents — standardised safety audits", deploymentDescription: "Deploy safety audit checklists and near-miss reporting at Sheffield site", targetMetric: "Lost-time incidents", targetValue: "0.00", currentValue: "1.00", unit: "incidents", status: "deployed" },
      { objectiveId: boIds["S1"], objectiveType: "bo", objectiveCode: "S1", siteId: SITE_IDS["Wigan"], siteName: "Wigan", sqdcpCategory: "safety", deploymentTitle: "Reduce incidents — safety audit programme", deploymentDescription: "Standardised safety audits and monthly review cadence at Wigan", targetMetric: "Lost-time incidents", targetValue: "0.00", currentValue: "1.00", unit: "incidents", status: "deployed" },
      // D1 → Delivery deployments (Continental Europe)
      { objectiveId: boIds["D1"], objectiveType: "bo", objectiveCode: "D1", siteId: SITE_IDS["Bester Poland"], siteName: "Bester Poland", sqdcpCategory: "delivery", deploymentTitle: "Ramp up mattress production to full capacity", deploymentDescription: "Commission MPL-ML1 assembly line at Bester Poland and achieve 80% utilisation", targetMetric: "Line utilisation", targetValue: "80.00", currentValue: "34.00", unit: "%", status: "active" },
      // Q1 → Quality deployments (Continental Europe)
      { objectiveId: boIds["Q1"], objectiveType: "bo", objectiveCode: "Q1", siteId: SITE_IDS["Bester Poland"], siteName: "Bester Poland", sqdcpCategory: "quality", deploymentTitle: "OEE digital rollout — foam-making lines", deploymentDescription: "Install OEE sensors and dashboards on production lines at Bester Poland", targetMetric: "OEE", targetValue: "85.00", currentValue: "72.40", unit: "%", status: "active" },
      { objectiveId: boIds["Q1"], objectiveType: "bo", objectiveCode: "Q1", siteId: SITE_IDS["Kaynak Turkey"], siteName: "Kaynak Turkey", sqdcpCategory: "quality", deploymentTitle: "OEE digital rollout — electrode lines", deploymentDescription: "Install OEE sensors and dashboards at Kaynak Turkey electrode production", targetMetric: "OEE", targetValue: "85.00", currentValue: "68.00", unit: "%", status: "deployed" },
      // M1 → People deployments (UK & Ireland — Sheffield only)
      { objectiveId: boIds["M1"], objectiveType: "bo", objectiveCode: "M1", siteId: SITE_IDS["Sheffield"], siteName: "Sheffield", sqdcpCategory: "people", deploymentTitle: "CI Academy — operator training programme", deploymentDescription: "Deliver 5S, problem solving, and standard work training modules at Sheffield", targetMetric: "Operators trained", targetValue: "30.00", currentValue: "12.00", unit: "people", status: "active" },
    ];

    for (const dep of deployments) {
      await db.insert(deploymentTargets).values({ planId, ...dep });
    }
    console.log(`  Created ${deployments.length} deployment targets`);
  }

  console.log("\n✅ Seed complete! Plan ID:", planId);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
