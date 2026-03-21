import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { samplePlan, type PolicyPlan, type Correlation } from '@/lib/store';

interface PolicyContextType {
  plan: PolicyPlan;
  planId: number | null;
  isLoading: boolean;
  isDbBacked: boolean;
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

export function PolicyProvider({ children }: { children: React.ReactNode }) {
  const [plan, setPlan] = useState<PolicyPlan>(samplePlan);
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState('xmatrix');

  // Fetch active plans from DB
  const plansQuery = trpc.policy.listPlans.useQuery(undefined, {
    retry: 1,
    staleTime: 30_000,
  });

  // Fetch team members from DB
  const teamQuery = trpc.policy.listTeamMembers.useQuery(undefined, {
    retry: 1,
    staleTime: 60_000,
  });

  const activePlanId = useMemo(() => {
    if (!plansQuery.data || plansQuery.data.length === 0) return null;
    // Pick the first active plan
    const active = plansQuery.data.find((p: any) => p.status === 'active');
    return active?.id ?? plansQuery.data[0]?.id ?? null;
  }, [plansQuery.data]);

  // Fetch full plan data
  const fullPlanQuery = trpc.policy.getFullPlan.useQuery(
    { planId: activePlanId! },
    {
      enabled: activePlanId !== null,
      retry: 1,
      staleTime: 30_000,
    }
  );

  // Fetch bowling entries separately
  const bowlingQuery = trpc.policy.listAllBowlingEntries.useQuery(
    { planId: activePlanId! },
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
      name: u.name,
      role: u.role,
      department: u.department,
    }));
  }, [teamQuery.data]);

  const effectivePlan = useMemo(() => {
    const base = dbPlan ?? plan;
    return { ...base, teamMembers: dbTeamMembers };
  }, [dbPlan, plan, dbTeamMembers]);
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
      plan: effectivePlan,
      planId: activePlanId,
      isLoading,
      isDbBacked,
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
