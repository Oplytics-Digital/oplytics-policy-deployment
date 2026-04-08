/**
 * Policy Deployment Database Helpers
 * CRUD operations for policy plans, objectives, projects, KPIs, correlations,
 * bowling entries, deployment targets, deployment audits, and deployment metrics.
 */
import { eq, and, asc, desc } from "drizzle-orm";
import { getDb } from "./db";
import {
  policyPlans,
  breakthroughObjectives,
  annualObjectives,
  improvementProjects,
  policyKpis,
  policyCorrelations,
  bowlingEntries,
  deploymentTargets,
  deploymentAudits,
  deploymentMetrics,
  type InsertPolicyPlan,
  type InsertBreakthroughObjective,
  type InsertAnnualObjective,
  type InsertImprovementProject,
  type InsertPolicyKpi,
  type InsertPolicyCorrelation,
  type InsertBowlingEntry,
  type InsertDeploymentTarget,
  type InsertDeploymentAudit,
  type InsertDeploymentMetric,
} from "../drizzle/schema";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db;
}

// ─── Policy Plans ───

export async function createPolicyPlan(data: InsertPolicyPlan) {
  const db = await requireDb();
  const result = await db.insert(policyPlans).values(data);
  return { id: result[0].insertId };
}

export async function getPolicyPlan(id: number) {
  const db = await requireDb();
  const rows = await db.select().from(policyPlans).where(eq(policyPlans.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listPolicyPlans(enterpriseId?: number) {
  const db = await requireDb();
  if (enterpriseId) {
    return db.select().from(policyPlans).where(eq(policyPlans.enterpriseId, enterpriseId)).orderBy(desc(policyPlans.year));
  }
  return db.select().from(policyPlans).orderBy(desc(policyPlans.year));
}

export async function updatePolicyPlan(id: number, data: Partial<InsertPolicyPlan>) {
  const db = await requireDb();
  await db.update(policyPlans).set(data).where(eq(policyPlans.id, id));
}

export async function deletePolicyPlan(id: number) {
  const db = await requireDb();
  // Delete deployment audits + metrics for this plan's deployment targets
  const targets = await db.select({ id: deploymentTargets.id }).from(deploymentTargets).where(eq(deploymentTargets.planId, id));
  for (const t of targets) {
    await db.delete(deploymentMetrics).where(eq(deploymentMetrics.deploymentTargetId, t.id));
    await db.delete(deploymentAudits).where(eq(deploymentAudits.deploymentTargetId, t.id));
  }
  await db.delete(deploymentTargets).where(eq(deploymentTargets.planId, id));
  // Delete bowling entries for this plan's KPIs
  const kpis = await db.select({ id: policyKpis.id }).from(policyKpis).where(eq(policyKpis.planId, id));
  for (const k of kpis) {
    await db.delete(bowlingEntries).where(eq(bowlingEntries.kpiId, k.id));
  }
  await db.delete(policyCorrelations).where(eq(policyCorrelations.planId, id));
  await db.delete(policyKpis).where(eq(policyKpis.planId, id));
  await db.delete(improvementProjects).where(eq(improvementProjects.planId, id));
  await db.delete(annualObjectives).where(eq(annualObjectives.planId, id));
  await db.delete(breakthroughObjectives).where(eq(breakthroughObjectives.planId, id));
  await db.delete(policyPlans).where(eq(policyPlans.id, id));
}

// ─── Breakthrough Objectives ───

export async function createBreakthroughObjective(data: InsertBreakthroughObjective) {
  const db = await requireDb();
  const result = await db.insert(breakthroughObjectives).values(data);
  return { id: result[0].insertId };
}

export async function listBreakthroughObjectives(planId: number) {
  const db = await requireDb();
  return db.select().from(breakthroughObjectives).where(eq(breakthroughObjectives.planId, planId)).orderBy(asc(breakthroughObjectives.sortOrder));
}

export async function updateBreakthroughObjective(id: number, data: Partial<InsertBreakthroughObjective>) {
  const db = await requireDb();
  await db.update(breakthroughObjectives).set(data).where(eq(breakthroughObjectives.id, id));
}

export async function deleteBreakthroughObjective(id: number) {
  const db = await requireDb();
  await db.delete(breakthroughObjectives).where(eq(breakthroughObjectives.id, id));
}

// ─── Annual Objectives ───

export async function createAnnualObjective(data: InsertAnnualObjective) {
  const db = await requireDb();
  const result = await db.insert(annualObjectives).values(data);
  return { id: result[0].insertId };
}

export async function listAnnualObjectives(planId: number) {
  const db = await requireDb();
  return db.select().from(annualObjectives).where(eq(annualObjectives.planId, planId)).orderBy(asc(annualObjectives.sortOrder));
}

export async function updateAnnualObjective(id: number, data: Partial<InsertAnnualObjective>) {
  const db = await requireDb();
  await db.update(annualObjectives).set(data).where(eq(annualObjectives.id, id));
}

export async function deleteAnnualObjective(id: number) {
  const db = await requireDb();
  await db.delete(annualObjectives).where(eq(annualObjectives.id, id));
}

// ─── Improvement Projects ───

export async function createImprovementProject(data: InsertImprovementProject) {
  const db = await requireDb();
  const result = await db.insert(improvementProjects).values(data);
  return { id: result[0].insertId };
}

export async function listImprovementProjects(planId: number) {
  const db = await requireDb();
  return db.select().from(improvementProjects).where(eq(improvementProjects.planId, planId)).orderBy(asc(improvementProjects.sortOrder));
}

export async function updateImprovementProject(id: number, data: Partial<InsertImprovementProject>) {
  const db = await requireDb();
  await db.update(improvementProjects).set(data).where(eq(improvementProjects.id, id));
}

export async function deleteImprovementProject(id: number) {
  const db = await requireDb();
  await db.delete(improvementProjects).where(eq(improvementProjects.id, id));
}

// ─── Policy KPIs ───

export async function createPolicyKpi(data: InsertPolicyKpi) {
  const db = await requireDb();
  const result = await db.insert(policyKpis).values(data);
  return { id: result[0].insertId };
}

export async function listPolicyKpis(planId: number) {
  const db = await requireDb();
  return db.select().from(policyKpis).where(eq(policyKpis.planId, planId)).orderBy(asc(policyKpis.sortOrder));
}

export async function updatePolicyKpi(id: number, data: Partial<InsertPolicyKpi>) {
  const db = await requireDb();
  await db.update(policyKpis).set(data).where(eq(policyKpis.id, id));
}

export async function deletePolicyKpi(id: number) {
  const db = await requireDb();
  await db.delete(bowlingEntries).where(eq(bowlingEntries.kpiId, id));
  await db.delete(policyKpis).where(eq(policyKpis.id, id));
}

// ─── Policy Correlations ───

export async function upsertCorrelation(data: InsertPolicyCorrelation) {
  const db = await requireDb();
  const existing = await db.select().from(policyCorrelations).where(
    and(
      eq(policyCorrelations.planId, data.planId),
      eq(policyCorrelations.sourceId, data.sourceId),
      eq(policyCorrelations.targetId, data.targetId),
      eq(policyCorrelations.quadrant, data.quadrant),
    )
  ).limit(1);

  if (existing.length > 0) {
    if (existing[0].strength === "strong") {
      await db.update(policyCorrelations).set({ strength: "weak" }).where(eq(policyCorrelations.id, existing[0].id));
      return { action: "updated" as const, strength: "weak" as const };
    } else {
      await db.delete(policyCorrelations).where(eq(policyCorrelations.id, existing[0].id));
      return { action: "deleted" as const };
    }
  } else {
    const result = await db.insert(policyCorrelations).values({ ...data, strength: "strong" });
    return { action: "created" as const, id: result[0].insertId, strength: "strong" as const };
  }
}

export async function listCorrelations(planId: number) {
  const db = await requireDb();
  return db.select().from(policyCorrelations).where(eq(policyCorrelations.planId, planId));
}

// ─── Bowling Entries ───

export async function upsertBowlingEntry(data: InsertBowlingEntry) {
  const db = await requireDb();
  const existing = await db.select().from(bowlingEntries).where(
    and(
      eq(bowlingEntries.kpiId, data.kpiId),
      eq(bowlingEntries.month, data.month),
      eq(bowlingEntries.year, data.year),
    )
  ).limit(1);

  if (existing.length > 0) {
    await db.update(bowlingEntries).set({
      planValue: data.planValue,
      actualValue: data.actualValue,
    }).where(eq(bowlingEntries.id, existing[0].id));
    return { id: existing[0].id, action: "updated" as const };
  } else {
    const result = await db.insert(bowlingEntries).values(data);
    return { id: result[0].insertId, action: "created" as const };
  }
}

export async function listBowlingEntries(kpiId: number) {
  const db = await requireDb();
  return db.select().from(bowlingEntries).where(eq(bowlingEntries.kpiId, kpiId)).orderBy(asc(bowlingEntries.month));
}

export async function listAllBowlingEntries(planId: number) {
  const db = await requireDb();
  const kpis = await db.select({ id: policyKpis.id }).from(policyKpis).where(eq(policyKpis.planId, planId));
  if (kpis.length === 0) return [];
  const allEntries = [];
  for (const kpi of kpis) {
    const entries = await db.select().from(bowlingEntries).where(eq(bowlingEntries.kpiId, kpi.id)).orderBy(asc(bowlingEntries.month));
    allEntries.push(...entries);
  }
  return allEntries;
}

// ─── Deployment Targets ───

export async function createDeploymentTarget(data: InsertDeploymentTarget) {
  const db = await requireDb();
  const result = await db.insert(deploymentTargets).values(data);
  return { id: result[0].insertId };
}

export async function listDeploymentTargets(planId: number) {
  const db = await requireDb();
  return db.select().from(deploymentTargets).where(eq(deploymentTargets.planId, planId)).orderBy(asc(deploymentTargets.siteName));
}

export async function listDeploymentTargetsBySite(siteId: number) {
  const db = await requireDb();
  return db.select().from(deploymentTargets).where(eq(deploymentTargets.siteId, siteId)).orderBy(asc(deploymentTargets.sqdcpCategory));
}

export async function getDeploymentTarget(id: number) {
  const db = await requireDb();
  const rows = await db.select().from(deploymentTargets).where(eq(deploymentTargets.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function updateDeploymentTarget(id: number, data: Partial<InsertDeploymentTarget>) {
  const db = await requireDb();
  await db.update(deploymentTargets).set(data).where(eq(deploymentTargets.id, id));
}

export async function deleteDeploymentTarget(id: number) {
  const db = await requireDb();
  await db.delete(deploymentMetrics).where(eq(deploymentMetrics.deploymentTargetId, id));
  await db.delete(deploymentAudits).where(eq(deploymentAudits.deploymentTargetId, id));
  await db.delete(deploymentTargets).where(eq(deploymentTargets.id, id));
}

// ─── Deployment Audits ───

export async function createDeploymentAudit(data: InsertDeploymentAudit) {
  const db = await requireDb();
  const result = await db.insert(deploymentAudits).values(data);
  return { id: result[0].insertId };
}

export async function listDeploymentAudits(deploymentTargetId: number) {
  const db = await requireDb();
  return db.select().from(deploymentAudits).where(eq(deploymentAudits.deploymentTargetId, deploymentTargetId)).orderBy(desc(deploymentAudits.auditDate));
}

export async function getLatestAudit(deploymentTargetId: number) {
  const db = await requireDb();
  const rows = await db.select().from(deploymentAudits)
    .where(eq(deploymentAudits.deploymentTargetId, deploymentTargetId))
    .orderBy(desc(deploymentAudits.auditDate))
    .limit(1);
  return rows[0] ?? null;
}

// ─── Full Plan Fetch (for X-Matrix rendering) ───

export async function getFullPlan(planId: number) {
  const plan = await getPolicyPlan(planId);
  if (!plan) return null;

  const [bos, aos, projects, kpis, correlations, targets] = await Promise.all([
    listBreakthroughObjectives(planId),
    listAnnualObjectives(planId),
    listImprovementProjects(planId),
    listPolicyKpis(planId),
    listCorrelations(planId),
    listDeploymentTargets(planId),
  ]);

  const allBowling = await listAllBowlingEntries(planId);

  const targetsWithAudits = await Promise.all(
    targets.map(async (t) => {
      const latestAudit = await getLatestAudit(t.id);
      return { ...t, latestAudit };
    })
  );

  return {
    ...plan,
    breakthroughObjectives: bos,
    annualObjectives: aos,
    projects,
    kpis,
    correlations,
    bowlingEntries: allBowling,
    deploymentTargets: targetsWithAudits,
  };
}

// ─── Update Audit AI Suggestion ───

export async function updateAuditSuggestion(auditId: number, suggestion: string) {
  const db = await requireDb();
  await db.update(deploymentAudits).set({ aiSuggestion: suggestion }).where(eq(deploymentAudits.id, auditId));
}

// ─── Deployment Metrics ───

export async function createDeploymentMetric(data: InsertDeploymentMetric) {
  const db = await requireDb();
  const result = await db.insert(deploymentMetrics).values(data);
  return { id: result[0].insertId };
}

export async function listDeploymentMetrics(deploymentTargetId: number) {
  const db = await requireDb();
  return db.select().from(deploymentMetrics)
    .where(eq(deploymentMetrics.deploymentTargetId, deploymentTargetId))
    .orderBy(asc(deploymentMetrics.period));
}

export async function getLatestMetric(deploymentTargetId: number) {
  const db = await requireDb();
  const rows = await db.select().from(deploymentMetrics)
    .where(eq(deploymentMetrics.deploymentTargetId, deploymentTargetId))
    .orderBy(desc(deploymentMetrics.period))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateDeploymentMetric(id: number, data: Partial<InsertDeploymentMetric>) {
  const db = await requireDb();
  await db.update(deploymentMetrics).set(data).where(eq(deploymentMetrics.id, id));
}

export async function deleteDeploymentMetric(id: number) {
  const db = await requireDb();
  await db.delete(deploymentMetrics).where(eq(deploymentMetrics.id, id));
}

export async function auditMetric(id: number, auditedValue: string, auditedById: number, auditedByName: string) {
  const db = await requireDb();
  await db.update(deploymentMetrics).set({
    auditedValue,
    auditedById,
    auditedByName,
    auditedAt: new Date(),
  }).where(eq(deploymentMetrics.id, id));
}
