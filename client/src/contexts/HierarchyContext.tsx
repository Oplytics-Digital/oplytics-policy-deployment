/**
 * HierarchyContext — Org hierarchy for the standalone Policy Deployment app.
 *
 * Uses the shared createOrgHierarchyContext factory from @pablo2410/shared-ui/hierarchy.
 * Data source: Portal Service API via the policy.fullHierarchy tRPC endpoint.
 *
 * Auto-selection: On first load (no sessionStorage), seeds the selection with
 * Vita Group so the dashboard loads with data immediately.
 */
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  createOrgHierarchyContext,
  type OrgHierarchyData,
  type OrgHierarchyNode,
} from "@pablo2410/shared-ui/hierarchy";

const STORAGE_KEY = "oplytics-policy-deployment-org-hierarchy";

/**
 * Clear the enterprise selection from sessionStorage on every page load.
 *
 * The server scopes the fullHierarchy response to the user's enterprise
 * (via JWT or oplytics-active-enterprise cookie override). The shared-ui
 * auto-selection effect then picks enterprises[0] from the response.
 *
 * By clearing the stored enterprise, we ensure auto-selection always fires
 * and picks the server-authoritative enterprise — no stale sessionStorage.
 * BU/site selections within the enterprise are preserved.
 */
function clearStoredEnterprise() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const stored = JSON.parse(raw);
      if (stored?.enterprise) {
        stored.enterprise = null;
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      }
    }
  } catch {
    // sessionStorage unavailable — shared context will handle gracefully
  }
}

// Run immediately on module load (before React renders)
clearStoredEnterprise();

/* ── Instantiate the shared factory ── */

const { OrgHierarchyProvider, useOrgHierarchy } = createOrgHierarchyContext({
  storageKey: STORAGE_KEY,
  useHierarchyData: () => {
    const { data, isLoading } = trpc.policy.fullHierarchy.useQuery(undefined, {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    });
    return { data: (data as unknown as OrgHierarchyData) ?? null, isLoading };
  },
});

/* ── Wrapper provider ── */

function HierarchyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  // Enterprise switching disabled — all users (including platform_admin) are
  // scoped to a single enterprise. Future: portal login-time environment selector.
  const canSwitchEnterprise = false;

  return (
    <OrgHierarchyProvider canSwitchEnterprise={canSwitchEnterprise}>
      {children}
    </OrgHierarchyProvider>
  );
}

/* ── Re-exports ── */

export type HierarchyNode = OrgHierarchyNode;

export { HierarchyProvider, useOrgHierarchy as useHierarchy };
