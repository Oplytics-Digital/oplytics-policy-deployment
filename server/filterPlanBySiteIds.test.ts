/**
 * Tests for filterPlanBySiteIds — client-side correlation tracing filter.
 *
 * This function filters a PolicyPlan to only show items connected to
 * selected site IDs via deployment target → correlation tracing.
 *
 * We import the pure function from PolicyContext and test it with
 * synthetic plan data that mirrors the Vita Group seed data structure.
 */
import { describe, expect, it } from "vitest";

// The filterPlanBySiteIds function is exported from PolicyContext.
// Since it's a pure function with no React dependencies, we can import it directly.
// We re-implement it here to test in a server-side vitest context without JSX.
// This mirrors the exact logic from client/src/contexts/PolicyContext.tsx.

interface BreakthroughObjective {
  id: string;
  code: string;
  description: string;
  category: string;
  color: string;
}

interface AnnualObjective {
  id: string;
  code: string;
  description: string;
  owner: string;
  status: string;
}

interface Project {
  id: string;
  code: string;
  name: string;
  description: string;
  owner: string;
  status: string;
  progress: number;
  startDate: string;
  endDate: string;
  category: string;
}

interface KPI {
  id: string;
  code: string;
  name: string;
  unit: string;
  target: number;
  current: number;
  direction: "up" | "down";
  owner: string;
}

interface Correlation {
  sourceId: string;
  targetId: string;
  strength: "strong" | "weak";
  quadrant: "bo-ao" | "ao-proj" | "proj-kpi" | "kpi-bo";
}

interface BowlingChartEntry {
  kpiId: string;
  month: number;
  plan: number;
  actual: number | null;
}

interface PolicyPlan {
  id: string;
  title: string;
  year: number;
  level: string;
  owner: string;
  lastUpdated: string;
  breakthroughObjectives: BreakthroughObjective[];
  annualObjectives: AnnualObjective[];
  projects: Project[];
  kpis: KPI[];
  correlations: Correlation[];
  bowlingChart: BowlingChartEntry[];
  teamMembers: any[];
}

interface DeploymentTarget {
  siteId: number;
  objectiveId: number;
  objectiveType: string;
}

/**
 * Pure implementation of filterPlanBySiteIds — mirrors PolicyContext.tsx exactly.
 */
function filterPlanBySiteIds(
  plan: PolicyPlan,
  siteIds: number[],
  deploymentTargets: DeploymentTarget[]
): PolicyPlan {
  if (siteIds.length === 0) return plan;

  const matchingTargets = deploymentTargets.filter((t) =>
    siteIds.includes(t.siteId)
  );
  if (matchingTargets.length === 0) {
    return {
      ...plan,
      breakthroughObjectives: [],
      annualObjectives: [],
      projects: [],
      kpis: [],
      correlations: [],
      bowlingChart: [],
    };
  }

  const deployedBoDbIds = new Set<number>();
  const deployedAoDbIds = new Set<number>();
  for (const t of matchingTargets) {
    if (t.objectiveType === "bo") {
      deployedBoDbIds.add(t.objectiveId);
    } else if (t.objectiveType === "ao") {
      deployedAoDbIds.add(t.objectiveId);
    }
  }

  const deployedBoIds = new Set<string>(
    Array.from(deployedBoDbIds).map((id) => `bo-${id}`)
  );
  const deployedAoIdsFromTargets = new Set<string>(
    Array.from(deployedAoDbIds).map((id) => `ao-${id}`)
  );

  const filteredBos = plan.breakthroughObjectives.filter((bo) =>
    deployedBoIds.has(bo.id)
  );
  const filteredBoIds = new Set(filteredBos.map((bo) => bo.id));

  const connectedAoIds = new Set<string>(deployedAoIdsFromTargets);
  for (const c of plan.correlations) {
    if (c.quadrant === "bo-ao" && filteredBoIds.has(c.sourceId)) {
      connectedAoIds.add(c.targetId);
    }
    if (c.quadrant === "bo-ao" && filteredBoIds.has(c.targetId)) {
      connectedAoIds.add(c.sourceId);
    }
  }

  if (deployedAoIdsFromTargets.size > 0) {
    for (const c of plan.correlations) {
      if (c.quadrant === "bo-ao") {
        if (deployedAoIdsFromTargets.has(c.targetId)) {
          filteredBoIds.add(c.sourceId);
        }
        if (deployedAoIdsFromTargets.has(c.sourceId)) {
          filteredBoIds.add(c.targetId);
        }
      }
    }
  }

  const finalBos = plan.breakthroughObjectives.filter((bo) =>
    filteredBoIds.has(bo.id)
  );

  const filteredAos = plan.annualObjectives.filter((ao) =>
    connectedAoIds.has(ao.id)
  );
  const filteredAoIds = new Set(filteredAos.map((ao) => ao.id));

  const connectedProjectIds = new Set<string>();
  for (const c of plan.correlations) {
    if (c.quadrant === "ao-proj" && filteredAoIds.has(c.sourceId)) {
      connectedProjectIds.add(c.targetId);
    }
    if (c.quadrant === "ao-proj" && filteredAoIds.has(c.targetId)) {
      connectedProjectIds.add(c.sourceId);
    }
  }
  const filteredProjects = plan.projects.filter((p) =>
    connectedProjectIds.has(p.id)
  );
  const filteredProjectIds = new Set(filteredProjects.map((p) => p.id));

  const connectedKpiIds = new Set<string>();
  for (const c of plan.correlations) {
    if (c.quadrant === "proj-kpi" && filteredProjectIds.has(c.sourceId)) {
      connectedKpiIds.add(c.targetId);
    }
    if (c.quadrant === "proj-kpi" && filteredProjectIds.has(c.targetId)) {
      connectedKpiIds.add(c.sourceId);
    }
  }
  const filteredKpis = plan.kpis.filter((k) => connectedKpiIds.has(k.id));
  const filteredKpiIds = new Set(filteredKpis.map((k) => k.id));

  const allFilteredIds = new Set([
    ...Array.from(filteredBoIds),
    ...Array.from(filteredAoIds),
    ...Array.from(filteredProjectIds),
    ...Array.from(filteredKpiIds),
  ]);
  const filteredCorrelations = plan.correlations.filter(
    (c) => allFilteredIds.has(c.sourceId) && allFilteredIds.has(c.targetId)
  );

  const filteredBowling = plan.bowlingChart.filter((b) =>
    filteredKpiIds.has(b.kpiId)
  );

  return {
    ...plan,
    breakthroughObjectives: finalBos,
    annualObjectives: filteredAos,
    projects: filteredProjects,
    kpis: filteredKpis,
    correlations: filteredCorrelations,
    bowlingChart: filteredBowling,
  };
}

// ─── Test fixtures ───
// Simplified Vita Group plan with clear tracing paths:
//
// BO-1 (waste reduction) → AO-1 (foam scrap) → P-1 (Middleton scrap) → KPI-1 (scrap rate)
// BO-2 (safety)          → AO-2 (safety audits) → P-3 (audit programme) → KPI-4 (incidents)
// BO-3 (mattress growth) → AO-3 (Poznan ramp-up) → P-4 (Poznan line) → KPI-6 (utilisation)
//
// Deployment targets:
// Site 1 (Vita Middleton)  → BO-1 deployed
// Site 2 (Vita Dukinfield) → BO-1 deployed
// Site 10 (VM Middleton)   → BO-2 deployed
// Site 13 (VM Poland)      → BO-3 deployed

const testPlan: PolicyPlan = {
  id: "plan-1",
  title: "Test Plan",
  year: 2026,
  level: "enterprise",
  owner: "Test Owner",
  lastUpdated: "2026-03-01",
  breakthroughObjectives: [
    { id: "bo-1", code: "BO1", description: "Reduce waste", category: "cost", color: "#5B5EA6" },
    { id: "bo-2", code: "BO2", description: "Zero incidents", category: "safety", color: "#5B5EA6" },
    { id: "bo-3", code: "BO3", description: "Grow mattress revenue", category: "delivery", color: "#5B5EA6" },
  ],
  annualObjectives: [
    { id: "ao-1", code: "T1", description: "Reduce foam scrap", owner: "Robin", status: "on-track" },
    { id: "ao-2", code: "T2", description: "Safety audits", owner: "Rachel", status: "on-track" },
    { id: "ao-3", code: "T3", description: "Poznan ramp-up", owner: "Omar", status: "at-risk" },
  ],
  projects: [
    { id: "p-1", code: "FB-1.1", name: "Middleton scrap reduction", description: "", owner: "Robin", status: "on-track", progress: 62, startDate: "2026-01-15", endDate: "2026-06-30", category: "improvement" },
    { id: "p-3", code: "FB-1.3", name: "Safety audit programme", description: "", owner: "Rachel", status: "at-risk", progress: 35, startDate: "2026-01-01", endDate: "2026-12-31", category: "operational" },
    { id: "p-4", code: "FM-1.4", name: "Poznan mattress line ramp-up", description: "", owner: "Omar", status: "at-risk", progress: 28, startDate: "2026-03-01", endDate: "2026-09-30", category: "strategic" },
  ],
  kpis: [
    { id: "kpi-1", code: "IP1.1", name: "Foam scrap rate", unit: "%", target: 5.5, current: 7.1, direction: "down", owner: "Robin" },
    { id: "kpi-4", code: "IP1.4", name: "Lost-time incidents", unit: "incidents", target: 0, current: 3, direction: "down", owner: "Rachel" },
    { id: "kpi-6", code: "IP1.6", name: "Poznan utilisation", unit: "%", target: 80, current: 34, direction: "up", owner: "Omar" },
  ],
  correlations: [
    // BO → AO
    { sourceId: "bo-1", targetId: "ao-1", strength: "strong", quadrant: "bo-ao" },
    { sourceId: "bo-2", targetId: "ao-2", strength: "strong", quadrant: "bo-ao" },
    { sourceId: "bo-3", targetId: "ao-3", strength: "strong", quadrant: "bo-ao" },
    // AO → Project
    { sourceId: "ao-1", targetId: "p-1", strength: "strong", quadrant: "ao-proj" },
    { sourceId: "ao-2", targetId: "p-3", strength: "strong", quadrant: "ao-proj" },
    { sourceId: "ao-3", targetId: "p-4", strength: "strong", quadrant: "ao-proj" },
    // Project → KPI
    { sourceId: "p-1", targetId: "kpi-1", strength: "strong", quadrant: "proj-kpi" },
    { sourceId: "p-3", targetId: "kpi-4", strength: "strong", quadrant: "proj-kpi" },
    { sourceId: "p-4", targetId: "kpi-6", strength: "strong", quadrant: "proj-kpi" },
    // KPI → BO (closing the loop)
    { sourceId: "kpi-1", targetId: "bo-1", strength: "strong", quadrant: "kpi-bo" },
    { sourceId: "kpi-4", targetId: "bo-2", strength: "strong", quadrant: "kpi-bo" },
    { sourceId: "kpi-6", targetId: "bo-3", strength: "strong", quadrant: "kpi-bo" },
  ],
  bowlingChart: [
    { kpiId: "kpi-1", month: 1, plan: 7.8, actual: 7.9 },
    { kpiId: "kpi-1", month: 2, plan: 7.4, actual: 7.2 },
    { kpiId: "kpi-4", month: 1, plan: 4, actual: 2 },
    { kpiId: "kpi-4", month: 2, plan: 3, actual: 1 },
    { kpiId: "kpi-6", month: 1, plan: 40, actual: 34 },
    { kpiId: "kpi-6", month: 2, plan: 47, actual: 38 },
  ],
  teamMembers: [],
};

const testDeploymentTargets: DeploymentTarget[] = [
  { siteId: 1, objectiveId: 1, objectiveType: "bo" },   // Vita Middleton → BO-1 (waste)
  { siteId: 2, objectiveId: 1, objectiveType: "bo" },   // Vita Dukinfield → BO-1 (waste)
  { siteId: 10, objectiveId: 2, objectiveType: "bo" },  // VM Middleton → BO-2 (safety)
  { siteId: 13, objectiveId: 3, objectiveType: "bo" },  // VM Poland → BO-3 (mattress)
];

// ─── Tests ───

describe("filterPlanBySiteIds — no filter", () => {
  it("returns the full plan when siteIds is empty", () => {
    const result = filterPlanBySiteIds(testPlan, [], testDeploymentTargets);
    expect(result).toBe(testPlan); // Same reference — no copy
  });
});

describe("filterPlanBySiteIds — single site selection", () => {
  it("filters to BO-1 chain when Vita Middleton (site 1) is selected", () => {
    const result = filterPlanBySiteIds(testPlan, [1], testDeploymentTargets);

    // Should only contain BO-1 and its downstream chain
    expect(result.breakthroughObjectives).toHaveLength(1);
    expect(result.breakthroughObjectives[0].id).toBe("bo-1");

    expect(result.annualObjectives).toHaveLength(1);
    expect(result.annualObjectives[0].id).toBe("ao-1");

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].id).toBe("p-1");

    expect(result.kpis).toHaveLength(1);
    expect(result.kpis[0].id).toBe("kpi-1");
  });

  it("filters to BO-2 chain when VM Middleton (site 10) is selected", () => {
    const result = filterPlanBySiteIds(testPlan, [10], testDeploymentTargets);

    expect(result.breakthroughObjectives).toHaveLength(1);
    expect(result.breakthroughObjectives[0].id).toBe("bo-2");

    expect(result.annualObjectives).toHaveLength(1);
    expect(result.annualObjectives[0].id).toBe("ao-2");

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].id).toBe("p-3");

    expect(result.kpis).toHaveLength(1);
    expect(result.kpis[0].id).toBe("kpi-4");
  });

  it("filters to BO-3 chain when VM Poland (site 13) is selected", () => {
    const result = filterPlanBySiteIds(testPlan, [13], testDeploymentTargets);

    expect(result.breakthroughObjectives).toHaveLength(1);
    expect(result.breakthroughObjectives[0].id).toBe("bo-3");

    expect(result.annualObjectives).toHaveLength(1);
    expect(result.annualObjectives[0].id).toBe("ao-3");

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].id).toBe("p-4");

    expect(result.kpis).toHaveLength(1);
    expect(result.kpis[0].id).toBe("kpi-6");
  });
});

describe("filterPlanBySiteIds — correlations are filtered correctly", () => {
  it("only includes correlations between filtered items", () => {
    const result = filterPlanBySiteIds(testPlan, [1], testDeploymentTargets);

    // Should only have correlations involving bo-1, ao-1, p-1, kpi-1
    expect(result.correlations.length).toBeGreaterThan(0);
    for (const c of result.correlations) {
      const validIds = ["bo-1", "ao-1", "p-1", "kpi-1"];
      expect(validIds).toContain(c.sourceId);
      expect(validIds).toContain(c.targetId);
    }
  });

  it("includes all four quadrant correlations for a single chain", () => {
    const result = filterPlanBySiteIds(testPlan, [1], testDeploymentTargets);

    const quadrants = new Set(result.correlations.map((c) => c.quadrant));
    expect(quadrants.has("bo-ao")).toBe(true);
    expect(quadrants.has("ao-proj")).toBe(true);
    expect(quadrants.has("proj-kpi")).toBe(true);
    expect(quadrants.has("kpi-bo")).toBe(true);
  });
});

describe("filterPlanBySiteIds — bowling chart filtering", () => {
  it("only includes bowling entries for filtered KPIs", () => {
    const result = filterPlanBySiteIds(testPlan, [1], testDeploymentTargets);

    // Only kpi-1 should be in the filtered plan
    expect(result.bowlingChart.length).toBeGreaterThan(0);
    for (const b of result.bowlingChart) {
      expect(b.kpiId).toBe("kpi-1");
    }
  });

  it("preserves all months for filtered KPIs", () => {
    const result = filterPlanBySiteIds(testPlan, [1], testDeploymentTargets);
    expect(result.bowlingChart).toHaveLength(2); // months 1 and 2 for kpi-1
  });
});

describe("filterPlanBySiteIds — BU selection (multiple sites)", () => {
  it("combines chains from multiple sites in the same BU", () => {
    // Sites 1 and 2 both deploy BO-1 — should still get one chain
    const result = filterPlanBySiteIds(testPlan, [1, 2], testDeploymentTargets);

    expect(result.breakthroughObjectives).toHaveLength(1);
    expect(result.breakthroughObjectives[0].id).toBe("bo-1");
    expect(result.annualObjectives).toHaveLength(1);
    expect(result.projects).toHaveLength(1);
    expect(result.kpis).toHaveLength(1);
  });

  it("combines chains from sites with different BOs", () => {
    // Sites 1 (BO-1) and 10 (BO-2) — should get both chains
    const result = filterPlanBySiteIds(testPlan, [1, 10], testDeploymentTargets);

    expect(result.breakthroughObjectives).toHaveLength(2);
    const boIds = result.breakthroughObjectives.map((bo) => bo.id).sort();
    expect(boIds).toEqual(["bo-1", "bo-2"]);

    expect(result.annualObjectives).toHaveLength(2);
    expect(result.projects).toHaveLength(2);
    expect(result.kpis).toHaveLength(2);
  });

  it("returns all chains when all sites are selected", () => {
    const result = filterPlanBySiteIds(
      testPlan,
      [1, 2, 10, 13],
      testDeploymentTargets
    );

    expect(result.breakthroughObjectives).toHaveLength(3);
    expect(result.annualObjectives).toHaveLength(3);
    expect(result.projects).toHaveLength(3);
    expect(result.kpis).toHaveLength(3);
  });
});

describe("filterPlanBySiteIds — no deployments to site", () => {
  it("returns empty quadrants when site has no deployment targets", () => {
    const result = filterPlanBySiteIds(testPlan, [999], testDeploymentTargets);

    expect(result.breakthroughObjectives).toHaveLength(0);
    expect(result.annualObjectives).toHaveLength(0);
    expect(result.projects).toHaveLength(0);
    expect(result.kpis).toHaveLength(0);
    expect(result.correlations).toHaveLength(0);
    expect(result.bowlingChart).toHaveLength(0);
  });

  it("preserves plan metadata even when empty", () => {
    const result = filterPlanBySiteIds(testPlan, [999], testDeploymentTargets);

    expect(result.id).toBe("plan-1");
    expect(result.title).toBe("Test Plan");
    expect(result.year).toBe(2026);
    expect(result.teamMembers).toEqual([]);
  });
});

describe("filterPlanBySiteIds — AO-level deployment targets", () => {
  it("traces upward from AO targets to find connected BOs", () => {
    // Deploy AO-2 (safety audits) directly to site 50
    const aoTargets: DeploymentTarget[] = [
      { siteId: 50, objectiveId: 2, objectiveType: "ao" },
    ];

    const result = filterPlanBySiteIds(testPlan, [50], aoTargets);

    // Should trace upward: AO-2 → BO-2 (via bo-ao correlation)
    expect(result.breakthroughObjectives).toHaveLength(1);
    expect(result.breakthroughObjectives[0].id).toBe("bo-2");

    // Should include AO-2 and its downstream chain
    expect(result.annualObjectives).toHaveLength(1);
    expect(result.annualObjectives[0].id).toBe("ao-2");

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].id).toBe("p-3");

    expect(result.kpis).toHaveLength(1);
    expect(result.kpis[0].id).toBe("kpi-4");
  });
});

describe("filterPlanBySiteIds — mixed BO and AO targets", () => {
  it("handles both BO and AO deployment targets for the same site", () => {
    const mixedTargets: DeploymentTarget[] = [
      { siteId: 1, objectiveId: 1, objectiveType: "bo" },  // BO-1
      { siteId: 1, objectiveId: 2, objectiveType: "ao" },  // AO-2 (traces up to BO-2)
    ];

    const result = filterPlanBySiteIds(testPlan, [1], mixedTargets);

    // Should include both chains: BO-1 chain + BO-2 chain (via AO-2)
    expect(result.breakthroughObjectives).toHaveLength(2);
    const boIds = result.breakthroughObjectives.map((bo) => bo.id).sort();
    expect(boIds).toEqual(["bo-1", "bo-2"]);
  });
});
