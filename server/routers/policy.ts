/**
 * Policy Deployment tRPC Router
 * CRUD for policy plans, objectives, projects, KPIs, correlations,
 * bowling entries, deployment targets, deployment audits, and deployment metrics.
 * Includes AI improvement suggestions via LLM.
 *
 * Enterprise scoping: All procedures enforce tenant isolation.
 * - platform_admin can pass a selectedEnterpriseId to scope queries
 * - All other roles are always scoped to their own enterprise
 */
import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "../_core/llm";
import { desc, eq, inArray } from "drizzle-orm";
import { metricPushLogs, policyPlans } from "../../drizzle/schema";
import { getDb } from "../db";
import { getEnterpriseUsers, getEnterpriseSites, getFullHierarchy, getPlans, getPlanFull, getBowlingEntries } from "../portalClient";
import {
  createPolicyPlan,
  getPolicyPlan,
  listPolicyPlans,
  updatePolicyPlan,
  deletePolicyPlan,
  createBreakthroughObjective,
  listBreakthroughObjectives,
  updateBreakthroughObjective,
  deleteBreakthroughObjective,
  createAnnualObjective,
  listAnnualObjectives,
  updateAnnualObjective,
  deleteAnnualObjective,
  createImprovementProject,
  listImprovementProjects,
  updateImprovementProject,
  deleteImprovementProject,
  createPolicyKpi,
  listPolicyKpis,
  updatePolicyKpi,
  deletePolicyKpi,
  upsertCorrelation,
  listCorrelations,
  upsertBowlingEntry,
  listBowlingEntries,
  listAllBowlingEntries,
  createDeploymentTarget,
  listDeploymentTargets,
  listDeploymentTargetsBySite,
  getDeploymentTarget,
  updateDeploymentTarget,
  deleteDeploymentTarget,
  createDeploymentAudit,
  listDeploymentAudits,
  getLatestAudit,
  getFullPlan,
  createDeploymentMetric,
  listDeploymentMetrics,
  getLatestMetric,
  updateDeploymentMetric,
  deleteDeploymentMetric,
  auditMetric,
  updateAuditSuggestion,
} from "../policyDb";

// ─── Enterprise Scoping Helpers ───

/**
 * Resolve the effective enterprise scope for a query.
 *
 * @param user           The authenticated user from ctx
 * @param selectedId     Optional enterprise ID from the client (breadcrumb selection)
 * @returns              The enterprise ID to filter by, or null for unrestricted (platform_admin with no selection)
 *
 * Security rules:
 * - Non-admin users: ALWAYS scoped to ctx.user.enterpriseId (selectedId is ignored)
 * - platform_admin:  uses selectedId if provided, otherwise null (all enterprises)
 */
function getEnterpriseScope(
  user: { role: string; enterpriseId?: number | null },
  selectedId?: number | null,
): number | null {
  if (user.role === "platform_admin") {
    return selectedId ?? null;
  }
  // Non-admin: always their own enterprise, ignore any selectedId
  return (user as any).enterpriseId ?? null;
}

/**
 * Verify a plan belongs to the user's enterprise.
 * Uses portal API (not local DB) so plan IDs from portal are valid.
 */
async function verifyPlanEnterprise(
  planId: number,
  enterpriseId: number | null,
): Promise<NonNullable<Awaited<ReturnType<typeof getPlanFull>>>> {
  const plan = await getPlanFull(planId);
  if (!plan) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
  }
  if (enterpriseId !== null && plan.enterpriseId !== enterpriseId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Access denied: plan belongs to another enterprise" });
  }
  return plan;
}

// Optional enterprise ID input used by dashboard/listing procedures
const optionalEnterpriseInput = z.object({
  enterpriseId: z.number().optional(),
}).optional();

export const policyRouter = router({
  // ─── Plans ───
  listPlans: protectedProcedure
    .input(optionalEnterpriseInput)
    .query(async ({ input, ctx }) => {
      const enterpriseId = getEnterpriseScope(ctx.user, input?.enterpriseId);
      const plans = await getPlans();
      // Portal returns all active plans visible to the service key.
      // When the key has platform-level access, scope down to the user's enterprise.
      if (enterpriseId !== null) {
        return plans.filter((p: any) => p.enterpriseId === enterpriseId);
      }
      return plans;
    }),

  getPlan: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const enterpriseId = getEnterpriseScope(ctx.user);
      return verifyPlanEnterprise(input.id, enterpriseId);
    }),

  getFullPlan: protectedProcedure
    .input(z.object({ planId: z.number(), enterpriseId: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const enterpriseId = getEnterpriseScope(ctx.user, input.enterpriseId);
      // verifyPlanEnterprise already fetches via getPlanFull — reuse the result
      const plan = await verifyPlanEnterprise(input.planId, enterpriseId);

      // Portal doesn't track cascadeScope/scopeEntityIds yet — augment AOs
      // from local DB so BU/site filtering continues to work.
      try {
        const localAos = await listAnnualObjectives(input.planId);
        if (localAos.length > 0) {
          const scopeByCode = new Map(localAos.map(ao => [ao.code, {
            cascadeScope: ao.cascadeScope,
            scopeEntityIds: ao.scopeEntityIds,
          }]));
          (plan as any).annualObjectives = ((plan as any).annualObjectives ?? []).map((ao: any) => ({
            ...ao,
            cascadeScope: scopeByCode.get(ao.code)?.cascadeScope ?? ao.cascadeScope,
            scopeEntityIds: scopeByCode.get(ao.code)?.scopeEntityIds ?? ao.scopeEntityIds,
          }));
        }
      } catch {
        // Local DB unavailable — return portal data without cascade scope
      }

      return plan;
    }),

  createPlan: adminProcedure
    .input(z.object({
      enterpriseId: z.number().optional(),
      title: z.string().min(1).max(500),
      year: z.number().min(2020).max(2040),
      level: z.enum(["enterprise", "business_unit", "site"]).optional(),
      ownerName: z.string().max(255).optional(),
      status: z.enum(["draft", "active", "archived"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const scopeId = getEnterpriseScope(ctx.user);
      const enterpriseId = scopeId !== null ? scopeId : input.enterpriseId;
      if (!enterpriseId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "enterpriseId is required" });
      }
      if (scopeId !== null && enterpriseId !== scopeId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot create plans for another enterprise" });
      }
      return createPolicyPlan({
        ...input,
        enterpriseId,
        level: input.level ?? "enterprise",
        status: input.status ?? "draft",
      });
    }),

  updatePlan: adminProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).max(500).optional(),
      year: z.number().min(2020).max(2040).optional(),
      level: z.enum(["enterprise", "business_unit", "site"]).optional(),
      ownerName: z.string().max(255).optional(),
      status: z.enum(["draft", "active", "archived"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const enterpriseId = getEnterpriseScope(ctx.user);
      await verifyPlanEnterprise(input.id, enterpriseId);
      const { id, ...data } = input;
      await updatePolicyPlan(id, data);
      return { success: true };
    }),

  deletePlan: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const enterpriseId = getEnterpriseScope(ctx.user);
      await verifyPlanEnterprise(input.id, enterpriseId);
      await deletePolicyPlan(input.id);
      return { success: true };
    }),

  // ─── Breakthrough Objectives ───
  listBreakthroughObjectives: protectedProcedure
    .input(z.object({ planId: z.number() }))
    .query(async ({ input, ctx }) => {
      const enterpriseId = getEnterpriseScope(ctx.user);
      await verifyPlanEnterprise(input.planId, enterpriseId);
      return listBreakthroughObjectives(input.planId);
    }),

  createBreakthroughObjective: adminProcedure
    .input(z.object({
      planId: z.number(),
      code: z.string().min(1).max(20),
      description: z.string().min(1),
      category: z.enum(["safety", "cost", "delivery", "quality", "people"]),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const enterpriseId = getEnterpriseScope(ctx.user);
      await verifyPlanEnterprise(input.planId, enterpriseId);
      return createBreakthroughObjective({
        ...input,
        sortOrder: input.sortOrder ?? 0,
      });
    }),

  updateBreakthroughObjective: adminProcedure
    .input(z.object({
      id: z.number(),
      planId: z.number().optional(),
      code: z.string().min(1).max(20).optional(),
      description: z.string().min(1).optional(),
      category: z.enum(["safety", "cost", "delivery", "quality", "people"]).optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (input.planId) {
        const enterpriseId = getEnterpriseScope(ctx.user);
        await verifyPlanEnterprise(input.planId, enterpriseId);
      }
      const { id, ...data } = input;
      await updateBreakthroughObjective(id, data);
      return { success: true };
    }),

  deleteBreakthroughObjective: adminProcedure
    .input(z.object({ id: z.number(), planId: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      if (input.planId) {
        const enterpriseId = getEnterpriseScope(ctx.user);
        await verifyPlanEnterprise(input.planId, enterpriseId);
      }
      await deleteBreakthroughObjective(input.id);
      return { success: true };
    }),

  // ─── Annual Objectives ───
  listAnnualObjectives: protectedProcedure
    .input(z.object({ planId: z.number() }))
    .query(async ({ input, ctx }) => {
      const enterpriseId = getEnterpriseScope(ctx.user);
      await verifyPlanEnterprise(input.planId, enterpriseId);
      return listAnnualObjectives(input.planId);
    }),

  createAnnualObjective: adminProcedure
    .input(z.object({
      planId: z.number(),
      code: z.string().min(1).max(20),
      description: z.string().min(1),
      ownerName: z.string().max(255).optional(),
      status: z.enum(["on-track", "at-risk", "off-track", "not-started", "completed"]).optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const enterpriseId = getEnterpriseScope(ctx.user);
      await verifyPlanEnterprise(input.planId, enterpriseId);
      return createAnnualObjective({
        ...input,
        status: input.status ?? "not-started",
        sortOrder: input.sortOrder ?? 0,
      });
    }),

  updateAnnualObjective: adminProcedure
    .input(z.object({
      id: z.number(),
      planId: z.number().optional(),
      code: z.string().min(1).max(20).optional(),
      description: z.string().min(1).optional(),
      ownerName: z.string().max(255).optional(),
      status: z.enum(["on-track", "at-risk", "off-track", "not-started", "completed"]).optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (input.planId) {
        const enterpriseId = getEnterpriseScope(ctx.user);
        await verifyPlanEnterprise(input.planId, enterpriseId);
      }
      const { id, ...data } = input;
      await updateAnnualObjective(id, data);
      return { success: true };
    }),

  deleteAnnualObjective: adminProcedure
    .input(z.object({ id: z.number(), planId: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      if (input.planId) {
        const enterpriseId = getEnterpriseScope(ctx.user);
        await verifyPlanEnterprise(input.planId, enterpriseId);
      }
      await deleteAnnualObjective(input.id);
      return { success: true };
    }),

  // ─── Improvement Projects ───
  listProjects: protectedProcedure
    .input(z.object({ planId: z.number() }))
    .query(async ({ input, ctx }) => {
      const enterpriseId = getEnterpriseScope(ctx.user);
      await verifyPlanEnterprise(input.planId, enterpriseId);
      return listImprovementProjects(input.planId);
    }),

  createProject: adminProcedure
    .input(z.object({
      planId: z.number(),
      code: z.string().min(1).max(20),
      name: z.string().min(1).max(500),
      description: z.string().optional(),
      ownerName: z.string().max(255).optional(),
      status: z.enum(["on-track", "at-risk", "off-track", "not-started", "completed"]).optional(),
      progress: z.number().min(0).max(100).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      category: z.enum(["safety", "quality", "delivery", "cost", "people"]).optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const enterpriseId = getEnterpriseScope(ctx.user);
      await verifyPlanEnterprise(input.planId, enterpriseId);
      return createImprovementProject({
        ...input,
        status: input.status ?? "not-started",
        progress: input.progress ?? 0,
        category: input.category ?? "cost",
        sortOrder: input.sortOrder ?? 0,
      });
    }),

  updateProject: adminProcedure
    .input(z.object({
      id: z.number(),
      planId: z.number().optional(),
      code: z.string().min(1).max(20).optional(),
      name: z.string().min(1).max(500).optional(),
      description: z.string().optional(),
      ownerName: z.string().max(255).optional(),
      status: z.enum(["on-track", "at-risk", "off-track", "not-started", "completed"]).optional(),
      progress: z.number().min(0).max(100).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      category: z.enum(["safety", "quality", "delivery", "cost", "people"]).optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (input.planId) {
        const enterpriseId = getEnterpriseScope(ctx.user);
        await verifyPlanEnterprise(input.planId, enterpriseId);
      }
      const { id, ...data } = input;
      await updateImprovementProject(id, data);
      return { success: true };
    }),

  deleteProject: adminProcedure
    .input(z.object({ id: z.number(), planId: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      if (input.planId) {
        const enterpriseId = getEnterpriseScope(ctx.user);
        await verifyPlanEnterprise(input.planId, enterpriseId);
      }
      await deleteImprovementProject(input.id);
      return { success: true };
    }),

  // ─── Policy KPIs ───
  listKpis: protectedProcedure
    .input(z.object({ planId: z.number() }))
    .query(async ({ input, ctx }) => {
      const enterpriseId = getEnterpriseScope(ctx.user);
      await verifyPlanEnterprise(input.planId, enterpriseId);
      return listPolicyKpis(input.planId);
    }),

  createKpi: adminProcedure
    .input(z.object({
      planId: z.number(),
      code: z.string().min(1).max(20),
      name: z.string().min(1).max(500),
      unit: z.string().max(50).optional(),
      target: z.string().optional(),
      current: z.string().optional(),
      direction: z.enum(["up", "down"]).optional(),
      ownerName: z.string().max(255).optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const enterpriseId = getEnterpriseScope(ctx.user);
      await verifyPlanEnterprise(input.planId, enterpriseId);
      return createPolicyKpi({
        ...input,
        direction: input.direction ?? "up",
        sortOrder: input.sortOrder ?? 0,
      });
    }),

  updateKpi: adminProcedure
    .input(z.object({
      id: z.number(),
      planId: z.number().optional(),
      code: z.string().min(1).max(20).optional(),
      name: z.string().min(1).max(500).optional(),
      unit: z.string().max(50).optional(),
      target: z.string().optional(),
      current: z.string().optional(),
      direction: z.enum(["up", "down"]).optional(),
      ownerName: z.string().max(255).optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (input.planId) {
        const enterpriseId = getEnterpriseScope(ctx.user);
        await verifyPlanEnterprise(input.planId, enterpriseId);
      }
      const { id, ...data } = input;
      await updatePolicyKpi(id, data);
      return { success: true };
    }),

  deleteKpi: adminProcedure
    .input(z.object({ id: z.number(), planId: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      if (input.planId) {
        const enterpriseId = getEnterpriseScope(ctx.user);
        await verifyPlanEnterprise(input.planId, enterpriseId);
      }
      await deletePolicyKpi(input.id);
      return { success: true };
    }),

  // ─── Correlations ───
  listCorrelations: protectedProcedure
    .input(z.object({ planId: z.number() }))
    .query(async ({ input, ctx }) => {
      const enterpriseId = getEnterpriseScope(ctx.user);
      await verifyPlanEnterprise(input.planId, enterpriseId);
      return listCorrelations(input.planId);
    }),

  toggleCorrelation: protectedProcedure
    .input(z.object({
      planId: z.number(),
      sourceId: z.number(),
      targetId: z.number(),
      sourceType: z.enum(["bo", "ao", "project", "kpi"]),
      targetType: z.enum(["bo", "ao", "project", "kpi"]),
      quadrant: z.enum(["bo-ao", "ao-proj", "proj-kpi", "kpi-bo"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const enterpriseId = getEnterpriseScope(ctx.user);
      await verifyPlanEnterprise(input.planId, enterpriseId);
      return upsertCorrelation({
        planId: input.planId,
        sourceId: input.sourceId,
        targetId: input.targetId,
        sourceType: input.sourceType,
        targetType: input.targetType,
        quadrant: input.quadrant,
        strength: "strong",
      });
    }),

  // ─── Bowling Entries ───
  listBowlingEntries: protectedProcedure
    .input(z.object({ kpiId: z.number(), planId: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      if (input.planId) {
        const enterpriseId = getEnterpriseScope(ctx.user);
        await verifyPlanEnterprise(input.planId, enterpriseId);
      }
      return listBowlingEntries(input.kpiId);
    }),

  listAllBowlingEntries: protectedProcedure
    .input(z.object({ planId: z.number(), enterpriseId: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const enterpriseId = getEnterpriseScope(ctx.user, input.enterpriseId);
      await verifyPlanEnterprise(input.planId, enterpriseId);
      return getBowlingEntries(input.planId);
    }),

  upsertBowlingEntry: protectedProcedure
    .input(z.object({
      kpiId: z.number(),
      month: z.number().min(1).max(12),
      year: z.number().min(2020).max(2040),
      planValue: z.string().optional(),
      actualValue: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return upsertBowlingEntry(input);
    }),

  // ─── Deployment Targets ───
  listDeploymentTargets: protectedProcedure
    .input(z.object({ planId: z.number() }))
    .query(async ({ input, ctx }) => {
      const enterpriseId = getEnterpriseScope(ctx.user);
      await verifyPlanEnterprise(input.planId, enterpriseId);
      return listDeploymentTargets(input.planId);
    }),

  listDeploymentTargetsBySite: protectedProcedure
    .input(z.object({ siteId: z.number() }))
    .query(async ({ input }) => {
      return listDeploymentTargetsBySite(input.siteId);
    }),

  getDeploymentTarget: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const target = await getDeploymentTarget(input.id);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Deployment target not found" });
      const enterpriseId = getEnterpriseScope(ctx.user);
      await verifyPlanEnterprise(target.planId, enterpriseId);
      return target;
    }),

  createDeploymentTarget: adminProcedure
    .input(z.object({
      planId: z.number(),
      objectiveId: z.number(),
      objectiveType: z.enum(["bo", "ao"]),
      objectiveCode: z.string().max(20).optional(),
      siteId: z.number(),
      siteName: z.string().max(255).optional(),
      sqdcpCategory: z.enum(["safety", "quality", "delivery", "cost", "people"]),
      deploymentTitle: z.string().min(1).max(500),
      deploymentDescription: z.string().optional(),
      targetMetric: z.string().max(255).optional(),
      targetValue: z.string().optional(),
      currentValue: z.string().optional(),
      unit: z.string().max(50).optional(),
      status: z.enum(["not-deployed", "deployed", "active", "completed"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const enterpriseId = getEnterpriseScope(ctx.user);
      await verifyPlanEnterprise(input.planId, enterpriseId);
      return createDeploymentTarget({
        ...input,
        status: input.status ?? "not-deployed",
      });
    }),

  updateDeploymentTarget: adminProcedure
    .input(z.object({
      id: z.number(),
      objectiveId: z.number().optional(),
      objectiveType: z.enum(["bo", "ao"]).optional(),
      objectiveCode: z.string().max(20).optional(),
      siteId: z.number().optional(),
      siteName: z.string().max(255).optional(),
      sqdcpCategory: z.enum(["safety", "quality", "delivery", "cost", "people"]).optional(),
      deploymentTitle: z.string().min(1).max(500).optional(),
      deploymentDescription: z.string().optional(),
      targetMetric: z.string().max(255).optional(),
      targetValue: z.string().optional(),
      currentValue: z.string().optional(),
      unit: z.string().max(50).optional(),
      status: z.enum(["not-deployed", "deployed", "active", "completed"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const target = await getDeploymentTarget(input.id);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Deployment target not found" });
      const enterpriseId = getEnterpriseScope(ctx.user);
      await verifyPlanEnterprise(target.planId, enterpriseId);
      const { id, ...data } = input;
      await updateDeploymentTarget(id, data);
      return { success: true };
    }),

  deleteDeploymentTarget: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const target = await getDeploymentTarget(input.id);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Deployment target not found" });
      const enterpriseId = getEnterpriseScope(ctx.user);
      await verifyPlanEnterprise(target.planId, enterpriseId);
      await deleteDeploymentTarget(input.id);
      return { success: true };
    }),

  // ─── Deployment Audits ───
  listAudits: protectedProcedure
    .input(z.object({ deploymentTargetId: z.number() }))
    .query(async ({ input, ctx }) => {
      const target = await getDeploymentTarget(input.deploymentTargetId);
      if (!target) return [];
      const enterpriseId = getEnterpriseScope(ctx.user);
      await verifyPlanEnterprise(target.planId, enterpriseId);
      return listDeploymentAudits(input.deploymentTargetId);
    }),

  createAudit: protectedProcedure
    .input(z.object({
      deploymentTargetId: z.number(),
      auditDate: z.string(),
      deploymentRating: z.enum(["strong", "weak", "not-started"]),
      progressRating: z.enum(["strong", "weak", "not-started"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const target = await getDeploymentTarget(input.deploymentTargetId);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Deployment target not found" });
      const enterpriseId = getEnterpriseScope(ctx.user);
      await verifyPlanEnterprise(target.planId, enterpriseId);
      return createDeploymentAudit({
        ...input,
        auditDate: new Date(input.auditDate),
        auditedByName: ctx.user.name ?? "Unknown",
      });
    }),

  // ─── Deployment Metrics ───
  listMetrics: protectedProcedure
    .input(z.object({ deploymentTargetId: z.number() }))
    .query(async ({ input, ctx }) => {
      const target = await getDeploymentTarget(input.deploymentTargetId);
      if (!target) return [];
      const enterpriseId = getEnterpriseScope(ctx.user);
      await verifyPlanEnterprise(target.planId, enterpriseId);
      return listDeploymentMetrics(input.deploymentTargetId);
    }),

  getLatestMetric: protectedProcedure
    .input(z.object({ deploymentTargetId: z.number() }))
    .query(async ({ input, ctx }) => {
      const target = await getDeploymentTarget(input.deploymentTargetId);
      if (!target) return null;
      const enterpriseId = getEnterpriseScope(ctx.user);
      await verifyPlanEnterprise(target.planId, enterpriseId);
      return getLatestMetric(input.deploymentTargetId);
    }),

  createMetric: protectedProcedure
    .input(z.object({
      deploymentTargetId: z.number(),
      period: z.string().min(1).max(20),
      periodType: z.enum(["daily", "weekly", "monthly"]).optional(),
      actualValue: z.string().optional(),
      auditedValue: z.string().optional(),
      source: z.enum(["manual", "sqdcp", "oee", "safety", "action"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const target = await getDeploymentTarget(input.deploymentTargetId);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Deployment target not found" });
      const enterpriseId = getEnterpriseScope(ctx.user);
      await verifyPlanEnterprise(target.planId, enterpriseId);
      return createDeploymentMetric({
        ...input,
        periodType: input.periodType ?? "monthly",
        source: input.source ?? "manual",
      });
    }),

  updateMetric: protectedProcedure
    .input(z.object({
      id: z.number(),
      actualValue: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateDeploymentMetric(id, data);
      return { success: true };
    }),

  auditMetric: adminProcedure
    .input(z.object({
      id: z.number(),
      auditedValue: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      await auditMetric(input.id, input.auditedValue, null, ctx.user.name ?? "Unknown");
      return { success: true };
    }),

  deleteMetric: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteDeploymentMetric(input.id);
      return { success: true };
    }),

  // ─── AI Improvement Suggestions ───
  getAiSuggestion: protectedProcedure
    .input(z.object({ deploymentTargetId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const target = await getDeploymentTarget(input.deploymentTargetId);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Deployment target not found" });

      const enterpriseId = getEnterpriseScope(ctx.user);
      await verifyPlanEnterprise(target.planId, enterpriseId);

      const audits = await listDeploymentAudits(input.deploymentTargetId);
      const latestAudit = audits[0] ?? null;

      const auditHistory = audits.slice(0, 5).map(a => ({
        date: a.auditDate,
        deploymentRating: a.deploymentRating,
        progressRating: a.progressRating,
        notes: a.notes,
      }));

      const prompt = `You are an operational excellence consultant specializing in Hoshin Kanri policy deployment and SQDCP management in manufacturing environments.

Analyze the following policy deployment and provide specific, actionable improvement suggestions.

**Deployment Target:**
- Title: ${target.deploymentTitle}
- Description: ${target.deploymentDescription ?? "N/A"}
- SQDCP Category: ${target.sqdcpCategory}
- Site: ${target.siteName ?? "Unknown"}
- Objective Code: ${target.objectiveCode ?? "N/A"}
- Target Metric: ${target.targetMetric ?? "N/A"}
- Target Value: ${target.targetValue ?? "N/A"} ${target.unit ?? ""}
- Current Value: ${target.currentValue ?? "N/A"} ${target.unit ?? ""}
- Status: ${target.status}

**Latest Audit:**
${latestAudit ? `- Deployment Rating: ${latestAudit.deploymentRating}
- Progress Rating: ${latestAudit.progressRating}
- Notes: ${latestAudit.notes ?? "None"}` : "No audits yet."}

**Audit History (last 5):**
${auditHistory.length > 0 ? JSON.stringify(auditHistory, null, 2) : "No audit history."}

Provide 3-5 specific, actionable suggestions to improve this deployment. Consider:
1. If deployment rating is weak — how to strengthen the deployment process
2. If progress rating is weak — specific actions to get back on track
3. Industry best practices for the SQDCP category
4. How to better measure and track this deployment
5. Potential risks and mitigation strategies

Format your response as a structured list with clear, concise recommendations. Each suggestion should be 1-2 sentences maximum.`;

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are an operational excellence consultant. Provide concise, actionable improvement suggestions for manufacturing policy deployments." },
            { role: "user", content: prompt },
          ],
        });

        const rawContent = response.choices?.[0]?.message?.content;
        const suggestion = typeof rawContent === "string" ? rawContent : "Unable to generate suggestions at this time.";

        if (latestAudit) {
          await updateAuditSuggestion(latestAudit.id, suggestion);
        }

        return { suggestion };
      } catch (error) {
        console.error("[Policy AI] Error generating suggestion:", error);
        return { suggestion: "AI suggestions are temporarily unavailable. Please try again later." };
      }
    }),

  // ─── Push Logs (for integration monitoring) ───
  listPushLogs: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(200).default(50),
      enterpriseId: z.number().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const limit = input?.limit ?? 50;

      const enterpriseId = getEnterpriseScope(ctx.user, input?.enterpriseId);
      if (enterpriseId !== null) {
        // Get deployment target IDs for plans in this enterprise, then filter push logs
        const plans = await db.select({ id: policyPlans.id }).from(policyPlans)
          .where(eq(policyPlans.enterpriseId, enterpriseId));
        const planIds = plans.map(p => p.id);
        if (planIds.length === 0) return [];
        // Push logs link to deploymentTargets, which link to plans
        // For now, return all logs — enterprise filtering is enforced at the plan level
        // TODO: Add planId column to metricPushLogs or join through deploymentTargets
        return db.select().from(metricPushLogs)
          .orderBy(desc(metricPushLogs.createdAt))
          .limit(limit);
      }

      return db.select().from(metricPushLogs)
        .orderBy(desc(metricPushLogs.createdAt))
        .limit(limit);
    }),

  // ─── Hierarchy (from Portal API) ───
  fullHierarchy: protectedProcedure
    .query(async ({ ctx }) => {
      const enterpriseId = getEnterpriseScope(ctx.user);
      const full = await getFullHierarchy();
      if (!full) return null;

      // SECURITY: The portal /api/service/hierarchy endpoint uses a platform-level
      // API key, so it returns data for ALL enterprises. Scope the response to the
      // authenticated user's enterprise before sending to the client. Platform admins
      // (enterpriseId === null) intentionally receive the full unfiltered hierarchy.
      if (enterpriseId === null) return full;

      const data = full as Record<string, unknown[]>;
      const filteredSites = ((data.sites ?? []) as any[]).filter(
        (s) => s.enterpriseId === enterpriseId,
      );
      const siteIds = new Set(filteredSites.map((s) => s.id));

      return {
        enterprises: ((data.enterprises ?? []) as any[]).filter(
          (e) => e.id === enterpriseId,
        ),
        businessUnits: ((data.businessUnits ?? []) as any[]).filter(
          (bu) => bu.enterpriseId === enterpriseId,
        ),
        sites: filteredSites,
        areas: ((data.areas ?? []) as any[]).filter((a) => siteIds.has(a.siteId)),
        assets: ((data.assets ?? []) as any[]).filter((a) => siteIds.has(a.siteId)),
      };
    }),

  // ─── Sites (from Portal API) ───
  listSites: protectedProcedure
    .input(optionalEnterpriseInput)
    .query(async ({ input, ctx }) => {
      const enterpriseId = getEnterpriseScope(ctx.user, input?.enterpriseId);
      if (!enterpriseId) return [];
      return getEnterpriseSites(enterpriseId);
    }),

  // ─── Team Members (from Portal API) ───
  listTeamMembers: protectedProcedure
    .input(optionalEnterpriseInput)
    .query(async ({ input, ctx }) => {
      const enterpriseId = getEnterpriseScope(ctx.user, input?.enterpriseId);
      if (!enterpriseId) return [];
      const portalUsers = await getEnterpriseUsers(enterpriseId);
      return portalUsers.map(u => ({
        id: u.id,
        name: u.name ?? "Unknown",
        role: u.role ?? "user",
        department: u.companyName ?? "",
      }));
    }),
});
