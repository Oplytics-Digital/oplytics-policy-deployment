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
const COOKIE_NAME = "oplytics-active-enterprise";

/**
 * Default selection for first-time visitors.
 * Vita Group → ensures the dashboard loads with data immediately.
 */
const DEFAULT_SELECTION = {
  enterprise: { id: 1, name: "The Vita Group", code: "VITA" },
  businessUnit: null,
  site: null,
  area: null,
  asset: null,
};

/**
 * Read the enterprise override cookie (httpOnly=false, set by portal settings).
 * Returns the enterprise ID or null if not set.
 */
function readCookieEnterpriseId(): number | null {
  try {
    const match = document.cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${COOKIE_NAME}=`));
    if (!match) return null;
    const val = parseInt(match.split("=")[1], 10);
    return Number.isFinite(val) && val > 0 ? val : null;
  } catch {
    return null;
  }
}

/**
 * Sync sessionStorage with the enterprise override cookie.
 *
 * If the cookie specifies a different enterprise than what's stored in
 * sessionStorage, clear the stored selection so the shared-ui auto-selection
 * effect picks the correct enterprise from the server response.
 */
function syncSelectionWithCookie() {
  try {
    const cookieEid = readCookieEnterpriseId();
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const stored = JSON.parse(raw);
      const storedEid = stored?.enterprise?.id;
      if (cookieEid && storedEid && cookieEid !== storedEid) {
        // Cookie enterprise differs from stored — clear so auto-select fires
        sessionStorage.removeItem(STORAGE_KEY);
        return;
      }
    }
    // No stored selection — seed with default
    if (!raw) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SELECTION));
    }
  } catch {
    // sessionStorage unavailable — shared context will handle gracefully
  }
}

// Run immediately on module load (before React renders)
syncSelectionWithCookie();

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
