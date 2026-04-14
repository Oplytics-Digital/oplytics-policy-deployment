// Policy Deployment data model — Oplytics.Digital platform
import { SQDCP_PILLAR_COLORS, type SqdcpPillar } from '@pablo2410/core-server';

export interface BreakthroughObjective {
  id: string;
  code: string;
  description: string;
  category: SqdcpPillar;
  color: string;
}

export interface AnnualObjective {
  id: string;
  code: string;
  description: string;
  owner: string;
  status: 'on-track' | 'at-risk' | 'off-track' | 'not-started';
  cascadeScope?: 'site' | 'bu' | 'enterprise';
  scopeEntityIds?: number[];
}

export interface Project {
  id: string;
  code: string;
  name: string;
  description: string;
  owner: string;
  status: 'on-track' | 'at-risk' | 'off-track' | 'not-started' | 'completed';
  progress: number; // 0-100
  startDate: string;
  endDate: string;
  category: SqdcpPillar;
  cascadeScope?: 'enterprise' | 'bu' | 'site' | 'area' | 'asset';
  scopeEntityIds?: number[];
}

export interface KPI {
  id: string;
  code: string;
  name: string;
  unit: string;
  target: number;
  current: number;
  direction: 'up' | 'down'; // up = higher is better, down = lower is better
  owner: string;
}

export interface Correlation {
  sourceId: string;
  targetId: string;
  strength: 'strong' | 'weak';
  quadrant: 'bo-ao' | 'ao-proj' | 'proj-kpi' | 'kpi-bo';
}

export interface BowlingChartEntry {
  kpiId: string;
  month: number; // 1-12
  plan: number;
  actual: number | null;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  department: string;
  avatar?: string;
}

export interface PolicyPlan {
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
  teamMembers: TeamMember[];
}

// Helper functions
export function getStatusColor(status: string): string {
  switch (status) {
    case 'on-track': case 'completed': return '#10b981';
    case 'at-risk': return '#f59e0b';
    case 'off-track': return '#ef4444';
    default: return '#596475';
  }
}

export function getStatusBg(status: string): string {
  switch (status) {
    case 'on-track': case 'completed': return 'rgba(16,185,129,0.1)';
    case 'at-risk': return 'rgba(245,158,11,0.1)';
    case 'off-track': return 'rgba(239,68,68,0.1)';
    default: return 'rgba(100,116,139,0.1)';
  }
}

export function getCategoryColor(category: string): string {
  return SQDCP_PILLAR_COLORS[category as SqdcpPillar] ?? '#64748b';
}

export function getCategoryBg(category: string): string {
  const color = SQDCP_PILLAR_COLORS[category as SqdcpPillar];
  return color ? `${color}1A` : 'rgba(100,116,139,0.1)';
}
