/*
 * Action Plans Component - Oplytics dark theme
 * Dark navy cards, purple/teal accents, status indicators
 */
import { usePolicy } from '@/contexts/PolicyContext';
import { getCategoryColor, getStatusColor } from '@/lib/store';
import { CalendarDays, User, TrendingUp, AlertTriangle, CheckCircle2, Clock, XCircle, FileX2 } from 'lucide-react';

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'on-track': return <CheckCircle2 className="w-4 h-4" style={{ color: '#10b981' }} />;
    case 'at-risk': return <AlertTriangle className="w-4 h-4" style={{ color: '#f59e0b' }} />;
    case 'off-track': return <XCircle className="w-4 h-4" style={{ color: '#ef4444' }} />;
    case 'completed': return <CheckCircle2 className="w-4 h-4" style={{ color: '#10b981' }} />;
    default: return <Clock className="w-4 h-4" style={{ color: '#596475' }} />;
  }
}

function getStatusBgDark(status: string): string {
  switch (status) {
    case 'on-track': case 'completed': return 'rgba(16,185,129,0.1)';
    case 'at-risk': return 'rgba(245,158,11,0.1)';
    case 'off-track': return 'rgba(239,68,68,0.1)';
    default: return 'rgba(100,116,139,0.1)';
  }
}

export default function ActionPlans() {
  const { plan } = usePolicy();

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <FileX2 className="w-12 h-12 mb-4" style={{ color: '#596475' }} />
        <h2 className="text-lg font-semibold text-[#E2E8F0] mb-2" style={{ fontFamily: 'Montserrat' }}>No Policy Plan</h2>
        <p className="text-sm text-[#596475] max-w-md">No strategic policy plan exists for this enterprise yet. Create a plan in the portal to get started.</p>
      </div>
    );
  }

  const { projects, kpis, correlations, annualObjectives } = plan;

  const getLinkedKPIs = (projectId: string) => {
    const kpiIds = correlations
      .filter(c => c.sourceId === projectId && c.quadrant === 'proj-kpi')
      .map(c => c.targetId);
    return kpis.filter(k => kpiIds.includes(k.id));
  };

  const getLinkedAOs = (projectId: string) => {
    const aoIds = correlations
      .filter(c => c.targetId === projectId && c.quadrant === 'ao-proj')
      .map(c => c.sourceId);
    return annualObjectives.filter(ao => aoIds.includes(ao.id));
  };

  const statusCounts = {
    'on-track': projects.filter(p => p.status === 'on-track').length,
    'at-risk': projects.filter(p => p.status === 'at-risk').length,
    'off-track': projects.filter(p => p.status === 'off-track').length,
    'not-started': projects.filter(p => p.status === 'not-started').length,
    'completed': projects.filter(p => p.status === 'completed').length,
  };

  return (
    <div className="w-full">
      {/* Header — Oplytics purple gradient */}
      <div className="px-6 py-3 rounded-t-md" style={{ background: 'linear-gradient(135deg, #8C34E9 0%, #5B1FA6 100%)' }}>
        <h2 className="text-lg font-black text-white tracking-wide" style={{ fontFamily: 'Montserrat' }}>Action Plans</h2>
        <p className="text-sm text-white/60">Project tracking and improvement priorities</p>
      </div>

      {/* Status Summary */}
      <div className="px-4 py-3" style={{ background: '#0e1624', borderLeft: '1px solid #1e2738', borderRight: '1px solid #1e2738' }}>
        <div className="flex items-center gap-3 flex-wrap">
          {Object.entries(statusCounts).filter(([_, count]) => count > 0).map(([status, count]) => (
            <div key={status} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md" style={{ background: getStatusBgDark(status), border: `1px solid ${getStatusColor(status)}30` }}>
              <StatusIcon status={status} />
              <span className="text-xs font-semibold" style={{ color: getStatusColor(status) }}>
                {count} {status.replace('-', ' ')}
              </span>
            </div>
          ))}
          <div className="ml-auto text-xs" style={{ color: '#596475' }}>
            {projects.length} total projects
          </div>
        </div>
      </div>

      {/* Project Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {projects.map(proj => {
          const linkedKPIs = getLinkedKPIs(proj.id);
          const linkedAOs = getLinkedAOs(proj.id);

          return (
            <div key={proj.id} className="rounded-md overflow-hidden transition-all hover:translate-y-[-1px]" style={{ background: '#0e1624', border: '1px solid #1e2738' }}>
              {/* Category color bar */}
              <div className="h-1" style={{ backgroundColor: getCategoryColor(proj.category) }} />

              <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold" style={{ color: '#596475' }}>{proj.code}</span>
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase"
                        style={{ background: `${getCategoryColor(proj.category)}15`, color: getCategoryColor(proj.category) }}
                      >
                        {proj.category}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white">{proj.name}</h3>
                    <p className="text-xs mt-0.5" style={{ color: '#8890a0' }}>{proj.description}</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md ml-2" style={{ background: getStatusBgDark(proj.status) }}>
                    <StatusIcon status={proj.status} />
                    <span className="text-[10px] font-semibold uppercase" style={{ color: getStatusColor(proj.status) }}>
                      {proj.status.replace('-', ' ')}
                    </span>
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold uppercase" style={{ color: '#596475' }}>Progress</span>
                    <span className="text-xs font-bold text-white">{proj.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#1e2738' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${proj.progress}%`,
                        background: proj.progress >= 70 ? '#10b981' : proj.progress >= 40 ? '#f59e0b' : '#8C34E9'
                      }}
                    />
                  </div>
                </div>

                {/* Meta info */}
                <div className="flex items-center gap-4 text-xs mb-3" style={{ color: '#596475' }}>
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{proj.owner}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" />
                    <span>{proj.startDate} → {proj.endDate}</span>
                  </div>
                </div>

                {/* Linked items */}
                {(linkedAOs.length > 0 || linkedKPIs.length > 0) && (
                  <div className="pt-2 mt-2" style={{ borderTop: '1px solid #1e2738' }}>
                    {linkedAOs.length > 0 && (
                      <div className="mb-1.5">
                        <span className="text-[10px] font-semibold uppercase" style={{ color: '#596475' }}>Linked Tactics:</span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {linkedAOs.map(ao => (
                            <span key={ao.id} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(29,184,206,0.1)', color: '#1DB8CE', border: '1px solid rgba(29,184,206,0.2)' }}>
                              {ao.code}: {ao.description.substring(0, 30)}...
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {linkedKPIs.length > 0 && (
                      <div>
                        <span className="text-[10px] font-semibold uppercase" style={{ color: '#596475' }}>Linked KPIs:</span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {linkedKPIs.map(kpi => (
                            <span key={kpi.id} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(140,52,233,0.1)', color: '#a855f7', border: '1px solid rgba(140,52,233,0.2)' }}>
                              <TrendingUp className="w-2.5 h-2.5 inline mr-0.5" />
                              {kpi.name}: {kpi.current}/{kpi.target} {kpi.unit}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
