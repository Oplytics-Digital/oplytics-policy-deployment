/*
 * X-Matrix Component - Oplytics dark theme
 * Dark navy cells, purple header, teal/purple accents
 */
import { usePolicy } from '@/contexts/PolicyContext';
import { getCategoryColor } from '@/lib/store';
import { useCallback, useState } from 'react';
import { SQDCP_PILLARS, SQDCP_PILLAR_LABELS } from '@pablo2410/core-server';

const cellBorder = '1px solid #1e2738';
const cellBg = '#0e1624';
const headerBg = '#131b2e';

function CorrelationDot({ sourceId, targetId, quadrant, correlations, onToggle }: {
  sourceId: string;
  targetId: string;
  quadrant: 'bo-ao' | 'ao-proj' | 'proj-kpi' | 'kpi-bo';
  correlations: { sourceId: string; targetId: string; strength: string; quadrant: string }[];
  onToggle: (s: string, t: string, q: any) => void;
}) {
  const corr = correlations.find(c => c.sourceId === sourceId && c.targetId === targetId && c.quadrant === quadrant);
  return (
    <button
      onClick={() => onToggle(sourceId, targetId, quadrant)}
      className="w-full h-full flex items-center justify-center correlation-dot"
      title={corr ? `${corr.strength} correlation (click to cycle)` : 'No correlation (click to add)'}
    >
      {corr?.strength === 'strong' && (
        <div className="w-3.5 h-3.5 rounded-full" style={{ background: '#e2e8f0' }} />
      )}
      {corr?.strength === 'weak' && (
        <div className="w-3.5 h-3.5 rounded-full bg-transparent" style={{ border: '2px solid #8890a0' }} />
      )}
      {!corr && (
        <div className="w-3.5 h-3.5 rounded-full bg-transparent opacity-0 hover:opacity-30 transition-opacity" style={{ border: '1px solid #2e3a4e' }} />
      )}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    'on-track': { bg: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'rgba(16,185,129,0.3)' },
    'at-risk': { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
    'off-track': { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
    'not-started': { bg: 'rgba(100,116,139,0.12)', color: '#8890a0', border: 'rgba(100,116,139,0.3)' },
    'completed': { bg: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'rgba(16,185,129,0.3)' },
  };
  const s = styles[status] || styles['not-started'];
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {status.replace('-', ' ').toUpperCase()}
    </span>
  );
}

export default function XMatrix() {
  const { plan, toggleCorrelation, setHighlightedIds } = usePolicy();
  const { breakthroughObjectives: bos, annualObjectives: aos, projects, kpis, correlations } = plan;
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const getRelatedIds = useCallback((itemId: string) => {
    const related = new Set<string>([itemId]);
    correlations.forEach(c => {
      if (c.sourceId === itemId) related.add(c.targetId);
      if (c.targetId === itemId) related.add(c.sourceId);
    });
    return Array.from(related);
  }, [correlations]);

  const handleHover = useCallback((id: string | null) => {
    setHoveredItem(id);
    if (id) {
      setHighlightedIds(getRelatedIds(id));
    } else {
      setHighlightedIds([]);
    }
  }, [getRelatedIds, setHighlightedIds]);

  const isHighlighted = (id: string) => !hoveredItem || getRelatedIds(hoveredItem).includes(id);
  const isAnyHovered = hoveredItem !== null;

  const aoCount = aos.length;
  const kpiCount = kpis.length;

  return (
    <div className="w-full overflow-auto">
      {/* Title Bar — Oplytics purple gradient */}
      <div className="px-6 py-3 rounded-t-md" style={{ background: 'linear-gradient(135deg, #8C34E9 0%, #5B1FA6 100%)' }}>
        <h2 className="text-lg font-black text-white tracking-wide" style={{ fontFamily: 'Montserrat' }}>{plan.title}</h2>
        <p className="text-sm text-white/60">Owner: {plan.owner} | Last Updated: {plan.lastUpdated} | Year: {plan.year}</p>
      </div>

      <div className="rounded-b-md overflow-auto" style={{ background: cellBg, border: cellBorder, borderTop: 'none' }}>
        <table className="border-collapse w-full" style={{ minWidth: '1100px' }}>
          <tbody>
            {/* Column headers row */}
            <tr>
              <td colSpan={aoCount} style={{ background: headerBg, border: cellBorder }} className="p-1 text-center">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#596475' }}>Tactics</span>
              </td>
              <td style={{ background: headerBg, border: cellBorder }} className="p-1 text-center">
                <span className="text-[10px] font-semibold" style={{ color: '#596475' }}>Code</span>
              </td>
              <td style={{ background: headerBg, border: cellBorder }} className="p-1">
                <span className="text-[10px] font-semibold" style={{ color: '#596475' }}>Projects</span>
              </td>
              <td style={{ background: headerBg, border: cellBorder }} className="p-1 text-center">
                <span className="text-[10px] font-semibold" style={{ color: '#596475' }}>Status</span>
              </td>
              <td colSpan={kpiCount} style={{ background: headerBg, border: cellBorder }} className="p-1 text-center">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#596475' }}>KPIs</span>
              </td>
              <td style={{ background: headerBg, border: cellBorder }} className="p-1 text-center">
                <span className="text-[10px] font-semibold" style={{ color: '#596475' }}>Owner</span>
              </td>
            </tr>

            {/* Project rows */}
            {projects.map((proj) => (
              <tr
                key={proj.id}
                onMouseEnter={() => handleHover(proj.id)}
                onMouseLeave={() => handleHover(null)}
                className={`transition-opacity duration-150 ${isAnyHovered && !isHighlighted(proj.id) ? 'opacity-30' : 'opacity-100'}`}
              >
                {aos.map(ao => (
                  <td key={`${ao.id}-${proj.id}`} className="w-7 h-7 p-0 xmatrix-cell" style={{ border: cellBorder, background: cellBg }}>
                    <CorrelationDot sourceId={ao.id} targetId={proj.id} quadrant="ao-proj" correlations={correlations} onToggle={toggleCorrelation} />
                  </td>
                ))}
                <td className="px-2 py-1 text-center font-mono text-xs font-medium whitespace-nowrap" style={{ border: cellBorder, background: cellBg, color: '#8890a0' }}>
                  {proj.code}
                </td>
                <td className="px-0 py-0.5 min-w-[240px]" style={{ border: cellBorder, background: cellBg }}>
                  <div className="flex items-center gap-0">
                    <div
                      className="w-full px-2 py-1.5 rounded-sm text-xs font-medium text-white truncate"
                      style={{ backgroundColor: getCategoryColor(proj.category), maxWidth: '100%' }}
                      title={proj.name}
                    >
                      {proj.name}
                      <div className="text-[9px] opacity-80 font-normal">{proj.startDate} → {proj.endDate}</div>
                    </div>
                  </div>
                </td>
                <td className="px-1 py-1 text-center" style={{ border: cellBorder, background: cellBg }}>
                  <StatusBadge status={proj.status} />
                </td>
                {kpis.map(kpi => (
                  <td key={`${proj.id}-${kpi.id}`} className="w-7 h-7 p-0 xmatrix-cell" style={{ border: cellBorder, background: cellBg }}>
                    <CorrelationDot sourceId={proj.id} targetId={kpi.id} quadrant="proj-kpi" correlations={correlations} onToggle={toggleCorrelation} />
                  </td>
                ))}
                <td className="px-2 py-1 text-xs whitespace-nowrap" style={{ border: cellBorder, background: cellBg, color: '#8890a0' }}>
                  {proj.owner}
                </td>
              </tr>
            ))}

            {/* CENTER SECTION: X graphic */}
            <tr>
              <td colSpan={aoCount} className="p-0 h-0" style={{ border: cellBorder, background: cellBg }}>
                <div className="flex h-full">
                  {aos.map((ao) => (
                    <div
                      key={ao.id}
                      className={`flex-1 flex items-end justify-center pb-1 transition-opacity duration-150 ${isAnyHovered && !isHighlighted(ao.id) ? 'opacity-30' : 'opacity-100'}`}
                      onMouseEnter={() => handleHover(ao.id)}
                      onMouseLeave={() => handleHover(null)}
                    >
                      <div className="text-[10px] font-medium leading-tight text-center" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', maxHeight: '120px', overflow: 'hidden', color: '#8890a0' }}>
                        {ao.description}
                      </div>
                    </div>
                  ))}
                </div>
              </td>

              <td colSpan={3} className="relative" style={{ height: '200px', border: cellBorder, background: cellBg }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg viewBox="0 0 200 200" className="w-full h-full max-w-[200px] max-h-[200px] opacity-15">
                    <line x1="0" y1="0" x2="200" y2="200" stroke="#8C34E9" strokeWidth="2" />
                    <line x1="200" y1="0" x2="0" y2="200" stroke="#8C34E9" strokeWidth="2" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs font-bold uppercase tracking-widest mb-auto mt-3" style={{ color: '#8C34E9' }}>Projects</span>
                    <div className="flex items-center justify-between w-full px-3">
                      <span className="text-xs font-bold uppercase tracking-widest" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', color: '#1DB8CE' }}>Tactics</span>
                      <span className="text-4xl font-black select-none" style={{ color: 'rgba(140,52,233,0.2)' }}>X</span>
                      <span className="text-xs font-bold uppercase tracking-widest" style={{ writingMode: 'vertical-rl', color: '#1DB8CE' }}>KPIs</span>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest mt-auto mb-3" style={{ color: '#f97316' }}>Results</span>
                  </div>
                </div>
              </td>

              <td colSpan={kpiCount} className="p-0" style={{ border: cellBorder, background: cellBg }}>
                <div className="flex h-full">
                  {kpis.map((kpi) => (
                    <div
                      key={kpi.id}
                      className={`flex-1 flex items-start justify-center pt-1 transition-opacity duration-150 ${isAnyHovered && !isHighlighted(kpi.id) ? 'opacity-30' : 'opacity-100'}`}
                      onMouseEnter={() => handleHover(kpi.id)}
                      onMouseLeave={() => handleHover(null)}
                    >
                      <div className="text-[10px] font-medium leading-tight text-center" style={{ writingMode: 'vertical-rl', maxHeight: '120px', overflow: 'hidden', color: '#8890a0' }}>
                        {kpi.name}
                      </div>
                    </div>
                  ))}
                </div>
              </td>

              <td className="p-1 text-center" style={{ border: cellBorder, background: headerBg }}>
                <span className="text-[10px] font-semibold uppercase" style={{ color: '#596475' }}>Projects Leader</span>
              </td>
            </tr>

            {/* AO code row */}
            <tr>
              {aos.map(ao => (
                <td key={ao.id} className="p-0.5 text-center w-7" style={{ background: headerBg, border: cellBorder }}>
                  <span className="font-mono text-[10px] font-bold" style={{ color: '#596475' }}>{ao.code}</span>
                </td>
              ))}
              <td colSpan={3} style={{ background: headerBg, border: cellBorder }} />
              {kpis.map(kpi => (
                <td key={kpi.id} className="p-0.5 text-center w-7" style={{ background: headerBg, border: cellBorder }}>
                  <span className="font-mono text-[10px] font-bold" style={{ color: '#596475' }}>{kpi.code}</span>
                </td>
              ))}
              <td style={{ background: headerBg, border: cellBorder }} />
            </tr>

            {/* BOTTOM SECTION: Breakthrough Objectives */}
            {bos.map((bo) => (
              <tr
                key={bo.id}
                onMouseEnter={() => handleHover(bo.id)}
                onMouseLeave={() => handleHover(null)}
                className={`transition-opacity duration-150 ${isAnyHovered && !isHighlighted(bo.id) ? 'opacity-30' : 'opacity-100'}`}
              >
                {aos.map(ao => (
                  <td key={`${bo.id}-${ao.id}`} className="w-7 h-7 p-0 xmatrix-cell" style={{ border: cellBorder, background: cellBg }}>
                    <CorrelationDot sourceId={bo.id} targetId={ao.id} quadrant="bo-ao" correlations={correlations} onToggle={toggleCorrelation} />
                  </td>
                ))}
                <td className="px-2 py-1 text-center font-mono text-xs font-medium whitespace-nowrap" style={{ border: cellBorder, background: cellBg, color: '#8890a0' }}>
                  {bo.code}
                </td>
                <td className="px-2 py-1.5 text-xs min-w-[240px]" style={{ border: cellBorder, background: cellBg, color: '#c0c6d0' }}>
                  {bo.description}
                </td>
                <td className="px-1 py-1 text-center" style={{ border: cellBorder, background: cellBg }}>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase" style={{ background: 'rgba(140,52,233,0.12)', color: '#8C34E9' }}>
                    {bo.category}
                  </span>
                </td>
                {kpis.map(kpi => (
                  <td key={`${kpi.id}-${bo.id}`} className="w-7 h-7 p-0 xmatrix-cell" style={{ border: cellBorder, background: cellBg }}>
                    <CorrelationDot sourceId={kpi.id} targetId={bo.id} quadrant="kpi-bo" correlations={correlations} onToggle={toggleCorrelation} />
                  </td>
                ))}
                <td style={{ border: cellBorder, background: cellBg }} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-3 px-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: '#e2e8f0' }} />
          <span className="text-xs" style={{ color: '#596475' }}>Strong correlation</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-transparent" style={{ border: '2px solid #8890a0' }} />
          <span className="text-xs" style={{ color: '#596475' }}>Weak correlation</span>
        </div>
        <div className="flex items-center gap-4 ml-auto">
          {SQDCP_PILLARS.map(pillar => (
            <div key={pillar} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getCategoryColor(pillar) }} />
              <span className="text-xs" style={{ color: '#596475' }}>{SQDCP_PILLAR_LABELS[pillar]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
