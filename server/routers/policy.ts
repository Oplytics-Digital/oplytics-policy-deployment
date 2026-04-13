/**
 * Policy Deployment tRPC Router
 * All policy plan data (plans, objectives, projects, KPIs, correlations,
 * bowling entries) is served via the Portal API.
 *
 * Local procedures:
 * - listPushLogs: integration health monitoring (metric_push_logs table)
 *
 * Portal procedures:
 * - listPlans, getPlan, getFullPlan, listAllBowlingEntries
 * - fullHierarchy, listSites, listTeamMembers
 */
import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { desc } from "drizzle-orm";
import { metricPushLogs } from "../../drizzle/schema";
import { getDb } from "../db";
import { getEnterpriseUsers, getEnterpriseSites, getFullHierarchy, getPlans, getPlanFull, getBowlingEntries } from "../portalClient";

// ─── Enterprise Scoping Helpers ───

/**
 * Resolve the effective enterprise scope for a query.
 *
 * All roles (including platform_admin) are scoped to their JWT enterpriseId.
 * Falls back to 1 (Vita Group) when the JWT has no enterpriseId (legacy
 * platform_admin tokens issued before portal adds enterpriseId).
 *
 * Future: portal will issue enterpriseId in the JWT for platform_admin at
 * login time via an environment selector.
 */
function getEnterpriseScope(
  user: { role: string; enterpriseId?: number | null },
  _selectedId?: number | null,
): number | null {
  return user.enterpriseId ?? 1;
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
  // ─── Plans (from Portal API) ───
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
      return verifyPlanEnterprise(input.planId, enterpriseId);
    }),

  // ─── Bowling Entries (from Portal API) ───
  listAllBowlingEntries: protectedProcedure
    .input(z.object({ planId: z.number(), enterpriseId: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const enterpriseId = getEnterpriseScope(ctx.user, input.enterpriseId);
      await verifyPlanEnterprise(input.planId, enterpriseId);
      return getBowlingEntries(input.planId);
    }),

  // ─── Push Logs (integration monitoring — local metric_push_logs table) ───
  listPushLogs: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(200).default(50),
      enterpriseId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const limit = input?.limit ?? 50;

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
