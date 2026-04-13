// Policy Deployment Data Store - Local state management with Vita Group data
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
  scopeEntityIds?: string; // JSON string from portal, e.g. "[1,2]" — parsed at filter time
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

// ─── Vita Group Policy Deployment Data ───
// Enterprise: Vita Group (polyurethane foam manufacturer)
// 4 Business Units: Furniture & Bedding, Finished Mattress, Engineered Solutions, Flooring
// 20 sites across UK and Europe
export const samplePlan: PolicyPlan = {
  id: 'plan-1',
  title: 'Vita Group — 3-Year Strategic Policy Deployment X-Matrix',
  year: 2026,
  level: 'Enterprise',
  owner: 'Alan Blythe',
  lastUpdated: '2026-02-28',

  // ─── Breakthrough Objectives (3–5 year horizon) ───
  breakthroughObjectives: [
    { id: 'bo-1', code: 'BO1', description: 'Reduce group-wide manufacturing waste by 40% across all 20 sites', category: 'cost', color: '#5B5EA6' },
    { id: 'bo-2', code: 'BO2', description: 'Achieve zero lost-time incidents across Furniture & Bedding division', category: 'safety', color: '#5B5EA6' },
    { id: 'bo-3', code: 'BO3', description: 'Grow Finished Mattress revenue 25% through new EU market penetration', category: 'delivery', color: '#5B5EA6' },
    { id: 'bo-4', code: 'BO4', description: 'Achieve OEE >85% on all foam-making and cutting lines', category: 'quality', color: '#5B5EA6' },
    { id: 'bo-5', code: 'BO5', description: 'Build a continuous improvement culture with 80%+ engagement across all BUs', category: 'people', color: '#5B5EA6' },
  ],

  // ─── Annual Objectives (2026 targets) ───
  annualObjectives: [
    { id: 'ao-1', code: 'T1', description: 'Reduce foam scrap rate from 8.2% to 5.5% at Middleton & Dukinfield sites', owner: 'Robin Parry', status: 'on-track' },
    { id: 'ao-2', code: 'T2', description: 'Implement standardised safety audits across all 9 F&B sites', owner: 'Rachel Attwood', status: 'on-track' },
    { id: 'ao-3', code: 'T3', description: 'Launch mattress production at Vita Mattress Poland (Poznan) to full capacity', owner: 'Omar Hoek', status: 'at-risk' },
    { id: 'ao-4', code: 'T4', description: 'Deploy OEE tracking on all foam-making machines across Almelo & Essen', owner: 'Markus Westerkamp', status: 'on-track' },
    { id: 'ao-5', code: 'T5', description: 'Reduce changeover time by 35% on cutting lines at Bedford & Corby', owner: 'Laura Whitfield', status: 'off-track' },
    { id: 'ao-6', code: 'T6', description: 'Roll out Vita CI Academy training programme to 200+ operators', owner: 'Cyril Wasem', status: 'on-track' },
  ],

  // ─── Improvement Projects ───
  projects: [
    {
      id: 'p-1', code: 'FB-1.1', name: 'Middleton foam scrap reduction',
      description: 'Root-cause analysis and process parameter optimisation on MID-FM1 and MID-FM2 foam-making machines to reduce off-spec blocks',
      owner: 'Robin Parry', status: 'on-track', progress: 62,
      startDate: '2026-01-15', endDate: '2026-06-30', category: 'cost',
    },
    {
      id: 'p-2', code: 'FB-1.2', name: 'Dukinfield conversion line waste mapping',
      description: 'Value-stream mapping of DUK-CV1 and DUK-CV2 conversion lines to identify and eliminate waste in the lamination and bonding process',
      owner: 'James Henderson', status: 'on-track', progress: 45,
      startDate: '2026-02-01', endDate: '2026-08-31', category: 'cost',
    },
    {
      id: 'p-3', code: 'FB-1.3', name: 'F&B division safety audit programme',
      description: 'Design and deploy standardised safety audit checklists, near-miss reporting, and monthly review cadence across all 9 Furniture & Bedding sites',
      owner: 'Rachel Attwood', status: 'at-risk', progress: 35,
      startDate: '2026-01-01', endDate: '2026-12-31', category: 'safety',
    },
    {
      id: 'p-4', code: 'FM-1.1', name: 'Poznan mattress line ramp-up',
      description: 'Commission MPL-ML1 mattress assembly line in Poznan, train local operators, and achieve 80% utilisation within 6 months',
      owner: 'Omar Hoek', status: 'at-risk', progress: 28,
      startDate: '2026-03-01', endDate: '2026-09-30', category: 'delivery',
    },
    {
      id: 'p-5', code: 'ES-1.1', name: 'OEE digital rollout — Almelo & Essen',
      description: 'Install OEE sensors and dashboards on ALM-FL1, ALM-CT1, and ESS-FL1 machines; integrate with Oplytics OEE Manager platform',
      owner: 'Markus Westerkamp', status: 'on-track', progress: 55,
      startDate: '2026-02-01', endDate: '2026-07-31', category: 'quality',
    },
    {
      id: 'p-6', code: 'FB-1.4', name: 'SMED programme — Bedford & Corby cutting lines',
      description: 'Apply Single-Minute Exchange of Dies methodology to BED-FM1 and COR cutting lines to reduce changeover from 42 min to target 27 min',
      owner: 'Laura Whitfield', status: 'off-track', progress: 18,
      startDate: '2026-01-15', endDate: '2026-07-31', category: 'delivery',
    },
    {
      id: 'p-7', code: 'ENT-1.1', name: 'Vita CI Academy launch',
      description: 'Develop and deliver continuous improvement training modules (5S, problem solving, standard work) to 200+ operators across all 4 business units',
      owner: 'Cyril Wasem', status: 'on-track', progress: 40,
      startDate: '2026-02-01', endDate: '2026-11-30', category: 'people',
    },
  ],

  // ─── Key Performance Indicators ───
  kpis: [
    { id: 'kpi-1', code: 'IP 1.1', name: 'Foam scrap rate (Middleton)', unit: '%', target: 5.5, current: 7.1, direction: 'down', owner: 'Robin Parry' },
    { id: 'kpi-2', code: 'IP 1.2', name: 'OEE — F&B foam-making lines', unit: '%', target: 85, current: 72.4, direction: 'up', owner: 'Markus Westerkamp' },
    { id: 'kpi-3', code: 'IP 1.3', name: 'Mattress OTD (Finished Mattress BU)', unit: '%', target: 97, current: 91.8, direction: 'up', owner: 'Omar Hoek' },
    { id: 'kpi-4', code: 'IP 1.4', name: 'Lost-time incidents (F&B division)', unit: 'incidents', target: 0, current: 3, direction: 'down', owner: 'Rachel Attwood' },
    { id: 'kpi-5', code: 'IP 1.5', name: 'Cutting line changeover time (Bedford)', unit: 'minutes', target: 27, current: 42, direction: 'down', owner: 'Laura Whitfield' },
    { id: 'kpi-6', code: 'IP 1.6', name: 'Poznan line utilisation', unit: '%', target: 80, current: 34, direction: 'up', owner: 'Omar Hoek' },
    { id: 'kpi-7', code: 'IP 1.7', name: 'CI Academy operators trained', unit: 'people', target: 200, current: 48, direction: 'up', owner: 'Cyril Wasem' },
  ],

  // ─── X-Matrix Correlations ───
  correlations: [
    // BO ↔ AO correlations (bottom-left)
    { sourceId: 'bo-1', targetId: 'ao-1', strength: 'strong', quadrant: 'bo-ao' },
    { sourceId: 'bo-1', targetId: 'ao-5', strength: 'weak', quadrant: 'bo-ao' },
    { sourceId: 'bo-2', targetId: 'ao-2', strength: 'strong', quadrant: 'bo-ao' },
    { sourceId: 'bo-3', targetId: 'ao-3', strength: 'strong', quadrant: 'bo-ao' },
    { sourceId: 'bo-4', targetId: 'ao-4', strength: 'strong', quadrant: 'bo-ao' },
    { sourceId: 'bo-4', targetId: 'ao-1', strength: 'weak', quadrant: 'bo-ao' },
    { sourceId: 'bo-5', targetId: 'ao-6', strength: 'strong', quadrant: 'bo-ao' },
    { sourceId: 'bo-5', targetId: 'ao-2', strength: 'weak', quadrant: 'bo-ao' },

    // AO ↔ Project correlations (top-left)
    { sourceId: 'ao-1', targetId: 'p-1', strength: 'strong', quadrant: 'ao-proj' },
    { sourceId: 'ao-1', targetId: 'p-2', strength: 'strong', quadrant: 'ao-proj' },
    { sourceId: 'ao-2', targetId: 'p-3', strength: 'strong', quadrant: 'ao-proj' },
    { sourceId: 'ao-3', targetId: 'p-4', strength: 'strong', quadrant: 'ao-proj' },
    { sourceId: 'ao-4', targetId: 'p-5', strength: 'strong', quadrant: 'ao-proj' },
    { sourceId: 'ao-4', targetId: 'p-1', strength: 'weak', quadrant: 'ao-proj' },
    { sourceId: 'ao-5', targetId: 'p-6', strength: 'strong', quadrant: 'ao-proj' },
    { sourceId: 'ao-6', targetId: 'p-7', strength: 'strong', quadrant: 'ao-proj' },

    // Project ↔ KPI correlations (top-right)
    { sourceId: 'p-1', targetId: 'kpi-1', strength: 'strong', quadrant: 'proj-kpi' },
    { sourceId: 'p-2', targetId: 'kpi-1', strength: 'weak', quadrant: 'proj-kpi' },
    { sourceId: 'p-3', targetId: 'kpi-4', strength: 'strong', quadrant: 'proj-kpi' },
    { sourceId: 'p-4', targetId: 'kpi-6', strength: 'strong', quadrant: 'proj-kpi' },
    { sourceId: 'p-4', targetId: 'kpi-3', strength: 'strong', quadrant: 'proj-kpi' },
    { sourceId: 'p-5', targetId: 'kpi-2', strength: 'strong', quadrant: 'proj-kpi' },
    { sourceId: 'p-6', targetId: 'kpi-5', strength: 'strong', quadrant: 'proj-kpi' },
    { sourceId: 'p-7', targetId: 'kpi-7', strength: 'strong', quadrant: 'proj-kpi' },

    // KPI ↔ BO correlations (bottom-right)
    { sourceId: 'kpi-1', targetId: 'bo-1', strength: 'strong', quadrant: 'kpi-bo' },
    { sourceId: 'kpi-2', targetId: 'bo-4', strength: 'strong', quadrant: 'kpi-bo' },
    { sourceId: 'kpi-3', targetId: 'bo-3', strength: 'strong', quadrant: 'kpi-bo' },
    { sourceId: 'kpi-4', targetId: 'bo-2', strength: 'strong', quadrant: 'kpi-bo' },
    { sourceId: 'kpi-5', targetId: 'bo-1', strength: 'weak', quadrant: 'kpi-bo' },
    { sourceId: 'kpi-6', targetId: 'bo-3', strength: 'strong', quadrant: 'kpi-bo' },
    { sourceId: 'kpi-7', targetId: 'bo-5', strength: 'strong', quadrant: 'kpi-bo' },
  ],

  // ─── Bowling Chart (monthly plan vs actual) ───
  bowlingChart: [
    // Foam scrap rate (KPI 1) — target 5.5%, starting from 8.2%
    ...[1,2,3,4,5,6,7,8,9,10,11,12].map(m => ({
      kpiId: 'kpi-1', month: m,
      plan: Math.round((8.2 - (2.7/12)*m)*10)/10,
      actual: m <= 2 ? Math.round((8.2 - (1.1/12)*m + (Math.random()-0.5)*0.4)*10)/10 : null,
    })),
    // OEE F&B foam lines (KPI 2) — target 85%, starting from 68%
    ...[1,2,3,4,5,6,7,8,9,10,11,12].map(m => ({
      kpiId: 'kpi-2', month: m,
      plan: Math.round((68 + (17/12)*m)*10)/10,
      actual: m <= 2 ? Math.round((68 + (4.4/12)*m + (Math.random()-0.5)*2)*10)/10 : null,
    })),
    // Mattress OTD (KPI 3) — target 97%, starting from 89%
    ...[1,2,3,4,5,6,7,8,9,10,11,12].map(m => ({
      kpiId: 'kpi-3', month: m,
      plan: Math.round((89 + (8/12)*m)*10)/10,
      actual: m <= 2 ? Math.round((89 + (2.8/12)*m + (Math.random()-0.5)*1.5)*10)/10 : null,
    })),
    // Lost-time incidents F&B (KPI 4) — target 0, starting from 5
    ...[1,2,3,4,5,6,7,8,9,10,11,12].map(m => ({
      kpiId: 'kpi-4', month: m,
      plan: Math.max(0, Math.round(5 - (5/12)*m)),
      actual: m <= 2 ? Math.round(Math.random()*2.5) : null,
    })),
    // Changeover time Bedford (KPI 5) — target 27 min, starting from 42 min
    ...[1,2,3,4,5,6,7,8,9,10,11,12].map(m => ({
      kpiId: 'kpi-5', month: m,
      plan: Math.round(42 - (15/12)*m),
      actual: m <= 2 ? Math.round(42 - (3/12)*m + (Math.random()-0.5)*4) : null,
    })),
    // Poznan line utilisation (KPI 6) — target 80%, starting from 0% (commissioning)
    ...[1,2,3,4,5,6,7,8,9,10,11,12].map(m => ({
      kpiId: 'kpi-6', month: m,
      plan: m <= 2 ? 0 : m <= 4 ? Math.round(20*(m-2)) : Math.round(40 + (40/8)*(m-4)),
      actual: m <= 2 ? (m === 1 ? 0 : 12) : null,
    })),
    // CI Academy operators trained (KPI 7) — target 200, starting from 0
    ...[1,2,3,4,5,6,7,8,9,10,11,12].map(m => ({
      kpiId: 'kpi-7', month: m,
      plan: Math.round((200/12)*m),
      actual: m <= 2 ? Math.round((200/12)*m * (0.8 + Math.random()*0.4)) : null,
    })),
  ],

  // ─── Vita Group Leadership Team ───
  teamMembers: [
    { id: 'tm-1', name: 'Alan Blythe', role: 'Group CEO', department: 'Executive' },
    { id: 'tm-2', name: 'Robin Parry', role: 'Group Operations Director', department: 'Operations' },
    { id: 'tm-3', name: 'Omar Hoek', role: 'MD — Finished Mattress', department: 'Finished Mattress BU' },
    { id: 'tm-4', name: 'Markus Westerkamp', role: 'MD — Furniture & Bedding (Continental)', department: 'Furniture & Bedding BU' },
    { id: 'tm-5', name: 'Cyril Wasem', role: 'Group CI Director', department: 'Continuous Improvement' },
    { id: 'tm-6', name: 'Rachel Attwood', role: 'Group HSE Director', department: 'Health, Safety & Environment' },
    { id: 'tm-7', name: 'Laura Whitfield', role: 'Site Manager — Bedford', department: 'Furniture & Bedding BU' },
    { id: 'tm-8', name: 'James Henderson', role: 'Site Manager — Dukinfield', department: 'Furniture & Bedding BU' },
    { id: 'tm-9', name: 'Lionel Bonte', role: 'MD — Engineered Solutions', department: 'Engineered Solutions BU' },
    { id: 'tm-10', name: 'Nicoleta Stoian', role: 'MD — Flooring', department: 'Flooring BU' },
  ],
};

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
