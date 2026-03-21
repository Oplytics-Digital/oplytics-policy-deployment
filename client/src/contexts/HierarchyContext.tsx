/**
 * HierarchyContext — Org hierarchy for the standalone Policy Deployment app.
 *
 * Uses the shared createOrgHierarchyContext factory from @pablo2410/shared-ui/hierarchy.
 * Data source: Portal Service API via a tRPC procedure (policy.listHierarchy).
 *
 * For now, this provides a minimal hierarchy context that the PolicyDeploymentLayout
 * and other components depend on. Hierarchy data is fetched from the Portal Service API
 * via a dedicated tRPC endpoint.
 */
import { useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  createOrgHierarchyContext,
  type OrgHierarchyData,
  type OrgHierarchyNode,
} from "@pablo2410/shared-ui/hierarchy";

/* ── Instantiate the shared factory ── */

const { OrgHierarchyProvider, useOrgHierarchy } = createOrgHierarchyContext({
  storageKey: "oplytics-policy-deployment-org-hierarchy",
  useHierarchyData: () => {
    // Hierarchy data will come from Portal Service API via tRPC
    // For now return empty data — the hierarchy endpoint will be wired later
    return { data: null, isLoading: false };
  },
});

/* ── Wrapper provider ── */

function HierarchyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const canSwitchEnterprise = user?.role === "platform_admin";

  return (
    <OrgHierarchyProvider
      canSwitchEnterprise={canSwitchEnterprise}
    >
      {children}
    </OrgHierarchyProvider>
  );
}

/* ── Re-exports ── */

export type HierarchyNode = OrgHierarchyNode;

export { HierarchyProvider, useOrgHierarchy as useHierarchy };
