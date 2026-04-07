import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { samplePlan, type PolicyPlan, type Correlation } from '@/lib/store';
import { useHierarchy } from './HierarchyContext';

interface PolicyContextType {
  /** The full (unfiltered) plan from the DB or sample data */
  fullPlan: PolicyPlan;
  /** The plan filtered by the current hierarchy selection (site/BU) */
  plan: PolicyPlan;
  planId: number | null;
  isLoading: boolean;
  isDbBacked: boolean;
  /** Whether the X-Matrix is currently filtered by a site/BU selection */
  isFiltered: boolean;
  /** The selected site IDs used for filtering (empty = no filter) */
  activeSiteIds: number[];
  setPlan: React.Dispatch<React.SetStateAction<PolicyPlan>>;
  toggleCorrelation: (sourceId: string, targetId: string, quadrant: Correlation['quadrant']) => void;
  highlightedIds: string[];
  setHighlightedIds: (ids: string[]) => void;
  selectedTab: string;
  setSelectedTab: (tab: string) => void;
  refetch: () => void;
}

const PolicyContext = createContext<PolicyContextType | null>(null);

/**
 * Convert DB rows into the PolicyPlan shape used by existing UI components.
 * DB IDs are integers; UI expects string IDs with prefixes.
 */
function dbToUiPlan(dbPlan: any): PolicyPlan {
  const bos = (dbPlan.breakthroughObjectives ?? []).map((bo: any) => ({
    id: `bo-${bo.id}`,
    code: bo.code,
    description: bo.description,
    category: bo.category,
    color: '#5B5EA6',
  }));

  const aos = (dbPlan.annualObjectives ?? []).map((ao: any) => ({
    id: `ao-${ao.id}`,
    code: ao.code,
    description: ao.description,
    owner: ao.ownerName ?? '',
    status: ao.status ?? 'not-started',
  }));

  const projects = (dbPlan.projects ?? []).map((p: any) => ({
    id: `p-${p.id}`,
    code: p.code,
    name: p.name,
    description: p.description ?? '',
    owner: p.ownerName ?? '',
    status: p.status ?? 'not-started',
    progress: p.progress ?? 0,
    startDate: p.startDate ?? '',
    endDate: p.endDate ?? '',
    category: p.category ?? 'improvement',
  }));

  const kpis = (dbPlan.kpis ?? []).map((k: any) => ({
    id: `kpi-${k.id}`,
    code: k.code,
    name: k.name,
    unit: k.unit ?? '',
    target: parseFloat(k.target ?? '0'),
    current: parseFloat(k.current ?? '0'),
    direction: (k.direction ?? 'up') as 'up' | 'down',
    owner: k.ownerName ?? '',
  }));

  const correlations = (dbPlan.correlations ?? []).map((c: any) => {
    const prefixMap: Record<string, string> = { bo: 'bo', ao: 'ao', project: 'p', kpi: 'kpi' };
    return {
      sourceId: `${prefixMap[c.sourceType] ?? c.sourceType}-${c.sourceId}`,
      targetId: `${prefixMap[c.targetType] ?? c.targetType}-${c.targetId}`,
      strength: (c.strength ?? 'strong') as 'strong' | 'weak',
      quadrant: c.quadrant as Correlation['quadrant'],
    };
  });

  const bowlingChart = (dbPlan.bowlingEntries ?? []).map((b: any) => ({
    kpiId: `kpi-${b.kpiId}`,
    month: b.month,
    plan: parseFloat(b.planValue ?? '0'),
    actual: b.actualValue != null ? parseFloat(b.actualValue) : null,
  }));

  return {
    id: `plan-${dbPlan.id}`,
    title: dbPlan.title ?? 'Untitled Plan',
    year: dbPlan.year ?? new Date().getFullYear(),
    level: dbPlan.level ?? 'enterprise',
    owner: dbPlan.ownerName ?? '',
    lastUpdated: dbPlan.updatedAt
      ? new Date(dbPlan.updatedAt).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    breakthroughObjectives: bos,
    annualObjectives: aos,
    projects,
    kpis,
    correlations,
    bowlingChart,
    teamMembers: [], // Populated by PolicyProvider via listTeamMembers query
  };
}

/**
 * Filter a PolicyPlan to only show items connected to the given site IDs
 * via deployment target → correlation tracing.
 *
 * Logic:
 * 1. Filter deployment targets to those matching the selected siteIds
 * 2. Extract the objectiveIds (BO IDs) from those targets
 * 3. Find BOs matching those IDs
 * 4. Trace correlations: BOs → AOs (via bo-ao), AOs → Projects (via ao-proj),
 *    Projects → KPIs (via proj-kpi)
 * 5. Also include KPI→BO correlations for the filtered BOs
 * 6. Filter bowling chart to only include filtered KPIs
 */
export function filterPlanBySiteIds(
  plan: PolicyPlan,
  siteIds: number[],
  deploymentTargets: Array<{ siteId: number; objectiveId: number; objectiveType: string }>,
): PolicyPlan {
  if (siteIds.length === 0) return plan;

  // Step 1: Filter deployment targets to selected sites
  const matchingTargets = deploymentTargets.filter(t => siteIds.includes(t.siteId));
  if (matchingTargets.length === 0) {
    // No deployments to these sites — return empty plan structure
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

  // Step 2: Extract BO IDs from deployment targets (objectiveType = 'bo')
  // Also handle AO-level targets (objectiveType = 'ao')
  const deployedBoDbIds = new Set<number>();
  const deployedAoDbIds = new Set<number>();
  for (const t of matchingTargets) {
    if (t.objectiveType === 'bo') {
      deployedBoDbIds.add(t.objectiveId);
    } else if (t.objectiveType === 'ao') {
      deployedAoDbIds.add(t.objectiveId);
    }
  }

  // Convert DB IDs to UI prefixed IDs
  const deployedBoIds = new Set<string>(Array.from(deployedBoDbIds).map(id => `bo-${id}`));
  const deployedAoIdsFromTargets = new Set<string>(Array.from(deployedAoDbIds).map(id => `ao-${id}`));

  // Step 3: Find BOs matching deployed IDs
  const filteredBos = plan.breakthroughObjectives.filter(bo => deployedBoIds.has(bo.id));
  const filteredBoIds = new Set(filteredBos.map(bo => bo.id));

  // Step 4: Trace correlations BO → AO (quadrant 'bo-ao')
  const connectedAoIds = new Set<string>(deployedAoIdsFromTargets);
  for (const c of plan.correlations) {
    if (c.quadrant === 'bo-ao' && filteredBoIds.has(c.sourceId)) {
      connectedAoIds.add(c.targetId);
    }
    // Also handle reverse direction (some correlations may be stored either way)
    if (c.quadrant === 'bo-ao' && filteredBoIds.has(c.targetId)) {
      connectedAoIds.add(c.sourceId);
    }
  }

  // If AO-level targets exist, also trace upward to find their connected BOs
  if (deployedAoIdsFromTargets.size > 0) {
    for (const c of plan.correlations) {
      if (c.quadrant === 'bo-ao') {
        if (deployedAoIdsFromTargets.has(c.targetId)) {
          filteredBoIds.add(c.sourceId);
        }
        if (deployedAoIdsFromTargets.has(c.sourceId)) {
          filteredBoIds.add(c.targetId);
        }
      }
    }
  }

  // Re-filter BOs after adding any traced from AO targets
  const finalBos = plan.breakthroughObjectives.filter(bo => filteredBoIds.has(bo.id));

  const filteredAos = plan.annualObjectives.filter(ao => connectedAoIds.has(ao.id));
  const filteredAoIds = new Set(filteredAos.map(ao => ao.id));

  // Step 5: Trace AO → Projects (quadrant 'ao-proj')
  const connectedProjectIds = new Set<string>();
  for (const c of plan.correlations) {
    if (c.quadrant === 'ao-proj' && filteredAoIds.has(c.sourceId)) {
      connectedProjectIds.add(c.targetId);
    }
    if (c.quadrant === 'ao-proj' && filteredAoIds.has(c.targetId)) {
      connectedProjectIds.add(c.sourceId);
    }
  }
  const filteredProjects = plan.projects.filter(p => connectedProjectIds.has(p.id));
  const filteredProjectIds = new Set(filteredProjects.map(p => p.id));

  // Step 6: Trace Projects → KPIs (quadrant 'proj-kpi')
  const connectedKpiIds = new Set<string>();
  for (const c of plan.correlations) {
    if (c.quadrant === 'proj-kpi' && filteredProjectIds.has(c.sourceId)) {
      connectedKpiIds.add(c.targetId);
    }
    if (c.quadrant === 'proj-kpi' && filteredProjectIds.has(c.targetId)) {
      connectedKpiIds.add(c.sourceId);
    }
  }
  const filteredKpis = plan.kpis.filter(k => connectedKpiIds.has(k.id));
  const filteredKpiIds = new Set(filteredKpis.map(k => k.id));

  // Step 7: Filter correlations to only those between filtered items
  const allFilteredIds = new Set([
    ...Array.from(filteredBoIds),
    ...Array.from(filteredAoIds),
    ...Array.from(filteredProjectIds),
    ...Array.from(filteredKpiIds),
  ]);
  const filteredCorrelations = plan.correlations.filter(
    c => allFilteredIds.has(c.sourceId) && allFilteredIds.has(c.targetId)
  );

  // Step 8: Filter bowling chart to filtered KPIs
  const filteredBowling = plan.bowlingChart.filter(b => filteredKpiIds.has(b.kpiId));

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

export function PolicyProvider({ children }: { children: React.ReactNode }) {
  const [plan, setPlan] = useState<PolicyPlan>(samplePlan);
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState('xmatrix');

  // Read the selected enterprise, BU, and site from the hierarchy breadcrumb
  const hierarchy = useHierarchy();

  const selectedEnterpriseId = useMemo(() => {
    try {
      const selection = hierarchy?.selection;
      const eid = selection?.enterprise?.id;
      return eid ? Number(eid) : undefined;
    } catch {
      return undefined;
    }
  }, [hierarchy?.selection?.enterprise?.id]);

  // Extract selected BU and site from hierarchy
  const selectedBusinessUnitId = useMemo(() => {
    try {
      const buId = hierarchy?.selection?.businessUnit?.id;
      return buId ? Number(buId) : null;
    } catch {
      return null;
    }
  }, [hierarchy?.selection?.businessUnit?.id]);

  const selectedSiteId = useMemo(() => {
    try {
      const sId = hierarchy?.selection?.site?.id;
      return sId ? Number(sId) : null;
    } catch {
      return null;
    }
  }, [hierarchy?.selection?.site?.id]);

  // Get the list of sites filtered by current BU selection from hierarchy context
  // This gives us all sites within the selected BU
  const hierarchySites = useMemo(() => {
    try {
      return hierarchy?.sites ?? [];
    } catch {
      return [];
    }
  }, [hierarchy?.sites]);

  // Determine the active site IDs for filtering
  // - If a specific site is selected → filter to that single site
  // - If a BU is selected (but no site) → filter to all sites within that BU
  // - If only enterprise is selected → no filtering (show full X-Matrix)
  const activeSiteIds = useMemo((): number[] => {
    if (selectedSiteId) {
      return [selectedSiteId];
    }
    if (selectedBusinessUnitId && hierarchySites.length > 0) {
      return hierarchySites.map(s => Number(s.id));
    }
    return [];
  }, [selectedSiteId, selectedBusinessUnitId, hierarchySites]);

  // Build the enterprise input for queries
  const enterpriseInput = useMemo(() => {
    return selectedEnterpriseId ? { enterpriseId: selectedEnterpriseId } : undefined;
  }, [selectedEnterpriseId]);

  // Fetch active plans from DB — scoped to selected enterprise
  const plansQuery = trpc.policy.listPlans.useQuery(enterpriseInput, {
    retry: 1,
    staleTime: 30_000,
  });

  // Fetch team members from portal — admin/enterprise_admin only; non-admins fall back to samplePlan.teamMembers
  // TODO(phase-3): remove any cast once tRPC versions are aligned (policy-dep@11.6, portal@11.13)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teamQuery = (trpc as any).userManagement.list.useQuery(undefined, {
    retry: 0,
    staleTime: 60_000,
  });

  const activePlanId = useMemo(() => {
    if (!plansQuery.data || plansQuery.data.length === 0) return null;
    // Pick the first active plan
    const active = plansQuery.data.find((p: any) => p.status === 'active');
    return active?.id ?? plansQuery.data[0]?.id ?? null;
  }, [plansQuery.data]);

  // Fetch full plan data — pass enterpriseId for server-side verification
  const fullPlanQuery = trpc.policy.getFullPlan.useQuery(
    { planId: activePlanId!, enterpriseId: selectedEnterpriseId },
    {
      enabled: activePlanId !== null,
      retry: 1,
      staleTime: 30_000,
    }
  );

  // Fetch bowling entries separately — pass enterpriseId for server-side verification
  const bowlingQuery = trpc.policy.listAllBowlingEntries.useQuery(
    { planId: activePlanId!, enterpriseId: selectedEnterpriseId },
    {
      enabled: activePlanId !== null,
      retry: 1,
      staleTime: 30_000,
    }
  );

  // Merge DB data into plan
  const dbPlan = useMemo(() => {
    if (!fullPlanQuery.data) return null;
    const merged = {
      ...fullPlanQuery.data,
      bowlingEntries: bowlingQuery.data ?? [],
    };
    return dbToUiPlan(merged);
  }, [fullPlanQuery.data, bowlingQuery.data]);

  // Merge DB team members into the plan (fallback to samplePlan.teamMembers)
  const dbTeamMembers = useMemo(() => {
    if (!teamQuery.data || teamQuery.data.length === 0) return samplePlan.teamMembers;
    return teamQuery.data.map((u: any) => ({
      id: `tm-${u.id}`,
      name: u.name ?? "Unknown",
      role: u.role,
      department: u.enterprise ?? "",
    }));
  }, [teamQuery.data]);

  // Full (unfiltered) plan with team members
  const fullPlan = useMemo(() => {
    const base = dbPlan ?? plan;
    return { ...base, teamMembers: dbTeamMembers };
  }, [dbPlan, plan, dbTeamMembers]);

  // Extract deployment targets from the DB response for correlation tracing
  const deploymentTargets = useMemo(() => {
    const raw = fullPlanQuery.data?.deploymentTargets ?? [];
    return raw.map((t: any) => ({
      siteId: t.siteId as number,
      objectiveId: t.objectiveId as number,
      objectiveType: (t.objectiveType ?? 'bo') as string,
    }));
  }, [fullPlanQuery.data?.deploymentTargets]);

  // Apply site/BU filtering via correlation tracing
  const filteredPlan = useMemo(() => {
    return filterPlanBySiteIds(fullPlan, activeSiteIds, deploymentTargets);
  }, [fullPlan, activeSiteIds, deploymentTargets]);

  const isFiltered = activeSiteIds.length > 0;
  const isDbBacked = dbPlan !== null;
  const isLoading = plansQuery.isLoading || fullPlanQuery.isLoading;

  // Toggle correlation via tRPC mutation
  const toggleMutation = trpc.policy.toggleCorrelation.useMutation({
    onSuccess: () => {
      fullPlanQuery.refetch();
    },
  });

  const toggleCorrelation = useCallback((sourceId: string, targetId: string, quadrant: Correlation['quadrant']) => {
    if (isDbBacked && activePlanId) {
      // Parse IDs back to DB format
      const parseId = (prefixedId: string) => {
        const parts = prefixedId.split('-');
        return parseInt(parts[parts.length - 1], 10);
      };
      const typeMap: Record<string, string> = { bo: 'bo', ao: 'ao', p: 'project', kpi: 'kpi' };
      const getType = (prefixedId: string) => {
        const prefix = prefixedId.split('-')[0];
        return typeMap[prefix] ?? prefix;
      };

      toggleMutation.mutate({
        planId: activePlanId,
        sourceId: parseId(sourceId),
        targetId: parseId(targetId),
        sourceType: getType(sourceId) as any,
        targetType: getType(targetId) as any,
        quadrant,
      });
    }

    // Also update local state for immediate feedback
    setPlan((prev: PolicyPlan) => {
      const existing = prev.correlations.find(
        (c: Correlation) => c.sourceId === sourceId && c.targetId === targetId && c.quadrant === quadrant
      );
      if (!existing) {
        return {
          ...prev,
          correlations: [...prev.correlations, { sourceId, targetId, strength: 'strong' as const, quadrant }]
        };
      }
      if (existing.strength === 'strong') {
        return {
          ...prev,
          correlations: prev.correlations.map((c: Correlation) =>
            c.sourceId === sourceId && c.targetId === targetId && c.quadrant === quadrant
              ? { ...c, strength: 'weak' as const }
              : c
          )
        };
      }
      return {
        ...prev,
        correlations: prev.correlations.filter(
          (c: Correlation) => !(c.sourceId === sourceId && c.targetId === targetId && c.quadrant === quadrant)
        )
      };
    });
  }, [isDbBacked, activePlanId, toggleMutation]);

  const refetch = useCallback(() => {
    plansQuery.refetch();
    fullPlanQuery.refetch();
    bowlingQuery.refetch();
  }, [plansQuery, fullPlanQuery, bowlingQuery]);

  return (
    <PolicyContext.Provider value={{
      fullPlan,
      plan: filteredPlan,
      planId: activePlanId,
      isLoading,
      isDbBacked,
      isFiltered,
      activeSiteIds,
      setPlan,
      toggleCorrelation,
      highlightedIds,
      setHighlightedIds,
      selectedTab,
      setSelectedTab,
      refetch,
    }}>
      {children}
    </PolicyContext.Provider>
  );
}

export function usePolicy() {
  const ctx = useContext(PolicyContext);
  if (!ctx) throw new Error('usePolicy must be used within PolicyProvider');
  return ctx;
}
