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
 * Default selection for first-time visitors.
 * Vita Group → ensures the dashboard loads with populated data immediately.
 */
const DEFAULT_SELECTION = {
  enterprise: { id: 1, name: "The Vita Group", code: "VITA" },
  businessUnit: null,
  site: null,
  area: null,
  asset: null,
};

// Seed sessionStorage on first load if no selection exists
function ensureDefaultSelection() {
  try {
    const existing = sessionStorage.getItem(STORAGE_KEY);
    if (!existing) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SELECTION));
    }
  } catch {
    // sessionStorage unavailable — shared context will handle gracefully
  }
}

// Run immediately on module load (before React renders)
ensureDefaultSelection();

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
  const canSwitchEnterprise = (user?.role as string) === "platform_admin";

  return (
    <OrgHierarchyProvider canSwitchEnterprise={canSwitchEnterprise}>
      {children}
    </OrgHierarchyProvider>
  );
}

/* ── Re-exports ── */

export type HierarchyNode = OrgHierarchyNode;

export { HierarchyProvider, useOrgHierarchy as useHierarchy };
