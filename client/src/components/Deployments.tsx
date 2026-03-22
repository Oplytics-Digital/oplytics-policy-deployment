/*
 * Deployments Component — Policy Deployment Cascade
 * Shows deployment targets linked to breakthrough objectives,
 * with audit ratings (strong/weak) and AI improvement suggestions.
 * Oplytics dark theme: dark navy bg, purple/teal accents
 */
import { useState, useMemo } from 'react';
import { usePolicy } from '@/contexts/PolicyContext';
import { useHierarchy } from '@/contexts/HierarchyContext';
import { trpc } from '@/lib/trpc';
import {
  Target,
  Factory,
  ShieldCheck,
  Gauge,
  Truck,
  DollarSign,
  Users,
  ChevronDown,
  ChevronRight,
  Sparkles,
  BarChart2,
  ClipboardCheck,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  MinusCircle,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { Streamdown } from 'streamdown';
import { useAuth } from '@/_core/hooks/useAuth';

// ─── MetricProgress sub-component ───

function MetricProgress({ deploymentTargetId, targetValue, unit }: { deploymentTargetId: number; targetValue: string | null; unit: string }) {
  const { user } = useAuth();
  const isSuperuser = user?.role === 'platform_admin' || user?.role === 'admin';
  const [showAddForm, setShowAddForm] = useState(false);
  const [auditingId, setAuditingId] = useState<number | null>(null);
  const [auditValue, setAuditValue] = useState('');
  const [form, setForm] = useState({ period: '', actualValue: '', notes: '' });

  const metricsQuery = trpc.policy.listMetrics.useQuery({ deploymentTargetId });
  const createMut = trpc.policy.createMetric.useMutation({
    onSuccess: () => { metricsQuery.refetch(); setShowAddForm(false); setForm({ period: '', actualValue: '', notes: '' }); toast.success('Metric recorded'); },
    onError: (e) => toast.error(e.message),
  });
  const auditMut = trpc.policy.auditMetric.useMutation({
    onSuccess: () => { metricsQuery.refetch(); setAuditingId(null); setAuditValue(''); toast.success('Metric audited'); },
    onError: (e) => toast.error(e.message),
  });

  const metrics = metricsQuery.data ?? [];
  const target = targetValue ? parseFloat(targetValue) : null;

  // Generate current month period default
  const now = new Date();
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <BarChart2 className="w-3.5 h-3.5" style={{ color: '#3b82f6' }} />
          <span className="text-xs font-semibold text-white">Metric Progress</span>
          {target && <span className="text-[10px] ml-1" style={{ color: '#596475' }}>Target: {target}{unit ? ` ${unit}` : ''}</span>}
        </div>
        <button
          onClick={() => { setShowAddForm(!showAddForm); if (!showAddForm) setForm(f => ({ ...f, period: defaultPeriod })); }}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold transition-colors hover:bg-white/5"
          style={{ color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)' }}
        >
          <Plus className="w-3 h-3" /> Record Metric
        </button>
      </div>

      {/* Add metric form */}
      {showAddForm && (
        <div className="rounded-md p-3 mb-3 space-y-2" style={{ background: '#131b2e', border: '1px solid #1e2738' }}>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: '#596475' }}>Period</label>
              <input
                type="text" value={form.period}
                onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
                placeholder="2026-03"
                className="w-full rounded px-2 py-1.5 text-xs text-white" style={{ background: '#0e1624', border: '1px solid #1e2738' }}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: '#596475' }}>Actual Value</label>
              <input
                type="text" value={form.actualValue}
                onChange={e => setForm(f => ({ ...f, actualValue: e.target.value }))}
                placeholder="0.00"
                className="w-full rounded px-2 py-1.5 text-xs text-white" style={{ background: '#0e1624', border: '1px solid #1e2738' }}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: '#596475' }}>Notes</label>
              <input
                type="text" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional"
                className="w-full rounded px-2 py-1.5 text-xs text-white" style={{ background: '#0e1624', border: '1px solid #1e2738' }}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddForm(false)} className="px-3 py-1 rounded text-xs" style={{ color: '#8890a0' }}>Cancel</button>
            <button
              onClick={() => createMut.mutate({ deploymentTargetId, period: form.period, actualValue: form.actualValue || undefined, notes: form.notes || undefined })}
              disabled={createMut.isPending || !form.period}
              className="px-3 py-1 rounded text-xs font-semibold text-white" style={{ background: '#3b82f6' }}
            >
              {createMut.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Metric chart — simple bar visualization */}
      {metricsQuery.isLoading ? (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="w-3 h-3 animate-spin" style={{ color: '#3b82f6' }} />
          <span className="text-xs" style={{ color: '#596475' }}>Loading metrics...</span>
        </div>
      ) : metrics.length > 0 ? (
        <div className="space-y-1">
          {/* Header */}
          <div className="grid grid-cols-12 gap-1 text-[10px] font-semibold uppercase px-2 py-1" style={{ color: '#596475' }}>
            <div className="col-span-2">Period</div>
            <div className="col-span-3">Actual</div>
            <div className="col-span-3">Audited</div>
            <div className="col-span-2">Source</div>
            <div className="col-span-2 text-right">Action</div>
          </div>
          {metrics.map((m: any) => {
            const actual = m.actualValue ? parseFloat(m.actualValue) : null;
            const audited = m.auditedValue ? parseFloat(m.auditedValue) : null;
            const maxVal = Math.max(actual ?? 0, audited ?? 0, target ?? 0);
            const actualPct = actual && maxVal ? (actual / maxVal) * 100 : 0;
            const auditedPct = audited && maxVal ? (audited / maxVal) * 100 : 0;
            const isAudited = m.auditedValue !== null;

            return (
              <div key={m.id} className="rounded px-2 py-2" style={{ background: '#131b2e' }}>
                <div className="grid grid-cols-12 gap-1 items-center text-xs">
                  <div className="col-span-2 font-mono" style={{ color: '#c0c6d0' }}>{m.period}</div>
                  <div className="col-span-3">
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(59,130,246,0.1)' }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.min(actualPct, 100)}%`, background: '#3b82f6' }} />
                      </div>
                      <span style={{ color: '#3b82f6' }}>{actual !== null ? `${actual}${unit ? ` ${unit}` : ''}` : '—'}</span>
                    </div>
                  </div>
                  <div className="col-span-3">
                    {isAudited ? (
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(16,185,129,0.1)' }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.min(auditedPct, 100)}%`, background: '#10b981' }} />
                        </div>
                        <span style={{ color: '#10b981' }}>{audited}{unit ? ` ${unit}` : ''}</span>
                        <CheckCircle2 className="w-3 h-3 flex-shrink-0" style={{ color: '#10b981' }} />
                      </div>
                    ) : (
                      <span className="text-[10px] italic" style={{ color: '#596475' }}>Not audited</span>
                    )}
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{
                      background: m.source === 'sqdcp' ? 'rgba(59,130,246,0.12)'
                        : m.source === 'oee' ? 'rgba(16,185,129,0.12)'
                        : m.source === 'safety' ? 'rgba(239,68,68,0.12)'
                        : m.source === 'action' ? 'rgba(245,158,11,0.12)'
                        : 'rgba(100,116,139,0.12)',
                      color: m.source === 'sqdcp' ? '#3b82f6'
                        : m.source === 'oee' ? '#10b981'
                        : m.source === 'safety' ? '#ef4444'
                        : m.source === 'action' ? '#f59e0b'
                        : '#8890a0',
                    }}>{m.source === 'manual' ? 'MANUAL' : m.source.toUpperCase()}</span>
                  </div>
                  <div className="col-span-2 text-right">
                    {!isAudited && isSuperuser && (
                      auditingId === m.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text" value={auditValue}
                            onChange={e => setAuditValue(e.target.value)}
                            className="w-16 rounded px-1 py-0.5 text-[10px] text-white" style={{ background: '#0e1624', border: '1px solid #1e2738' }}
                            placeholder="Value"
                          />
                          <button
                            onClick={() => auditMut.mutate({ id: m.id, auditedValue: auditValue })}
                            disabled={auditMut.isPending || !auditValue}
                            className="text-[10px] font-semibold" style={{ color: '#10b981' }}
                          >
                            {auditMut.isPending ? '...' : '\u2713'}
                          </button>
                          <button onClick={() => setAuditingId(null)} className="text-[10px]" style={{ color: '#8890a0' }}>\u2717</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAuditingId(m.id); setAuditValue(m.actualValue ?? ''); }}
                          className="text-[10px] font-semibold" style={{ color: '#10b981' }}
                        >
                          Audit
                        </button>
                      )
                    )}
                    {isAudited && (
                      <span className="text-[10px]" style={{ color: '#596475' }}>
                        {m.auditedByName ?? ''}
                      </span>
                    )}
                  </div>
                </div>
                {m.notes && <p className="text-[10px] mt-1 pl-2" style={{ color: '#596475' }}>{m.notes}</p>}
              </div>
            );
          })}
          {/* Legend */}
          <div className="flex items-center gap-4 pt-1 px-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: '#3b82f6' }} />
              <span className="text-[10px]" style={{ color: '#596475' }}>Actual (Real)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} />
              <span className="text-[10px]" style={{ color: '#596475' }}>Audited (Verified)</span>
            </div>
            {target && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: '#f59e0b' }} />
                <span className="text-[10px]" style={{ color: '#596475' }}>Target: {target}{unit ? ` ${unit}` : ''}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs py-2" style={{ color: '#596475' }}>No metric readings recorded yet. Click "Record Metric" to add the first reading.</p>
      )}
    </div>
  );
}

const cellBg = '#0e1624';
const cardBorder = '1px solid #1e2738';
const headerBg = '#131b2e';

const categoryIcons: Record<string, typeof ShieldCheck> = {
  safety: ShieldCheck,
  quality: Gauge,
  delivery: Truck,
  cost: DollarSign,
  people: Users,
};

const categoryColors: Record<string, string> = {
  safety: '#ef4444',
  quality: '#3b82f6',
  delivery: '#f59e0b',
  cost: '#10b981',
  people: '#a855f7',
};

const statusColors: Record<string, { bg: string; color: string; border: string }> = {
  'not-deployed': { bg: 'rgba(100,116,139,0.12)', color: '#8890a0', border: 'rgba(100,116,139,0.3)' },
  'deployed': { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', border: 'rgba(59,130,246,0.3)' },
  'active': { bg: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'rgba(16,185,129,0.3)' },
  'completed': { bg: 'rgba(140,52,233,0.12)', color: '#8C34E9', border: 'rgba(140,52,233,0.3)' },
};

function RatingBadge({ rating }: { rating: string }) {
  if (rating === 'strong') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold"
        style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
        <CheckCircle2 className="w-3 h-3" /> Strong
      </span>
    );
  }
  if (rating === 'weak') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold"
        style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
        <AlertTriangle className="w-3 h-3" /> Weak
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold"
      style={{ background: 'rgba(100,116,139,0.12)', color: '#8890a0', border: '1px solid rgba(100,116,139,0.3)' }}>
      <MinusCircle className="w-3 h-3" /> Not Started
    </span>
  );
}

function ProgressBar({ current, target, unit }: { current: string; target: string; unit: string }) {
  const c = parseFloat(current || '0');
  const t = parseFloat(target || '1');
  const pct = t > 0 ? Math.min(100, Math.max(0, (c / t) * 100)) : 0;
  const color = pct >= 90 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span style={{ color: '#8890a0' }}>Current: {c} {unit}</span>
        <span style={{ color: '#596475' }}>Target: {t} {unit}</span>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#1e2738' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

interface DeploymentCardProps {
  target: any;
}

function DeploymentCard({ target }: DeploymentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showAuditForm, setShowAuditForm] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(target.latestAudit?.aiSuggestion ?? null);

  const CatIcon = categoryIcons[target.sqdcpCategory] ?? Target;
  const catColor = categoryColors[target.sqdcpCategory] ?? '#8890a0';
  const statusStyle = statusColors[target.status] ?? statusColors['not-deployed'];

  const auditsQuery = trpc.policy.listAudits.useQuery(
    { deploymentTargetId: target.id },
    { enabled: expanded }
  );

  const createAuditMutation = trpc.policy.createAudit.useMutation({
    onSuccess: () => {
      auditsQuery.refetch();
      setShowAuditForm(false);
      toast.success('Audit recorded successfully');
    },
    onError: (err) => toast.error(`Failed to create audit: ${err.message}`),
  });

  const aiSuggestionMutation = trpc.policy.getAiSuggestion.useMutation({
    onSuccess: (data) => {
      setAiSuggestion(data.suggestion);
      setAiLoading(false);
    },
    onError: () => {
      setAiLoading(false);
      toast.error('Failed to generate AI suggestions');
    },
  });

  const handleGetAiSuggestion = () => {
    setAiLoading(true);
    aiSuggestionMutation.mutate({ deploymentTargetId: target.id });
  };

  const [auditForm, setAuditForm] = useState({
    deploymentRating: 'not-started' as 'strong' | 'weak' | 'not-started',
    progressRating: 'not-started' as 'strong' | 'weak' | 'not-started',
    notes: '',
  });

  const handleSubmitAudit = () => {
    createAuditMutation.mutate({
      deploymentTargetId: target.id,
      auditDate: new Date().toISOString(),
      ...auditForm,
    });
  };

  return (
    <div className="rounded-md overflow-hidden transition-all" style={{ background: cellBg, border: cardBorder }}>
      {/* Category color bar */}
      <div className="h-1" style={{ background: catColor }} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: `${catColor}15` }}>
            <CatIcon className="w-4 h-4" style={{ color: catColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono text-xs font-bold" style={{ color: catColor }}>{target.objectiveCode}</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase" style={{ ...statusStyle, border: `1px solid ${statusStyle.border}` }}>
                {target.status.replace('-', ' ')}
              </span>
              {target.latestAudit && (
                <>
                  <span className="text-[10px]" style={{ color: '#596475' }}>|</span>
                  <span className="text-[10px]" style={{ color: '#596475' }}>Deployment:</span>
                  <RatingBadge rating={target.latestAudit.deploymentRating} />
                  <span className="text-[10px]" style={{ color: '#596475' }}>Progress:</span>
                  <RatingBadge rating={target.latestAudit.progressRating} />
                </>
              )}
            </div>
            <h3 className="text-sm font-bold text-white leading-tight">{target.deploymentTitle}</h3>
            {target.deploymentDescription && (
              <p className="text-xs mt-0.5" style={{ color: '#8890a0' }}>{target.deploymentDescription}</p>
            )}
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded hover:bg-white/5 flex-shrink-0"
          >
            {expanded ? <ChevronDown className="w-4 h-4" style={{ color: '#596475' }} /> : <ChevronRight className="w-4 h-4" style={{ color: '#596475' }} />}
          </button>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-4 mt-3 text-xs flex-wrap" style={{ color: '#596475' }}>
          <div className="flex items-center gap-1">
            <Factory className="w-3 h-3" />
            <span>{target.siteName ?? 'Unknown site'}</span>
          </div>
          <div className="flex items-center gap-1">
            <CatIcon className="w-3 h-3" />
            <span className="capitalize">{target.sqdcpCategory}</span>
          </div>
          {target.targetMetric && (
            <div className="flex items-center gap-1">
              <Target className="w-3 h-3" />
              <span>{target.targetMetric}</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {target.targetValue && target.currentValue && (
          <div className="mt-3">
            <ProgressBar current={target.currentValue} target={target.targetValue} unit={target.unit ?? ''} />
          </div>
        )}

        {/* Expanded section */}
        {expanded && (
          <div className="mt-4 pt-4 space-y-4" style={{ borderTop: '1px solid #1e2738' }}>
            {/* Audit History */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <ClipboardCheck className="w-3.5 h-3.5" style={{ color: '#8C34E9' }} />
                  <span className="text-xs font-semibold text-white">Audit History</span>
                </div>
                <button
                  onClick={() => setShowAuditForm(!showAuditForm)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold transition-colors hover:bg-white/5"
                  style={{ color: '#8C34E9', border: '1px solid rgba(140,52,233,0.3)' }}
                >
                  <Plus className="w-3 h-3" /> New Audit
                </button>
              </div>

              {/* Audit form */}
              {showAuditForm && (
                <div className="rounded-md p-3 mb-3 space-y-3" style={{ background: headerBg, border: cardBorder }}>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: '#596475' }}>Deployment Rating</label>
                      <div className="flex gap-1.5">
                        {(['strong', 'weak', 'not-started'] as const).map(r => (
                          <button
                            key={r}
                            onClick={() => setAuditForm(f => ({ ...f, deploymentRating: r }))}
                            className={`flex-1 px-2 py-1.5 rounded text-[10px] font-semibold transition-all ${auditForm.deploymentRating === r ? 'ring-1 ring-purple-500' : ''}`}
                            style={{
                              background: r === 'strong' ? 'rgba(16,185,129,0.12)' : r === 'weak' ? 'rgba(239,68,68,0.12)' : 'rgba(100,116,139,0.12)',
                              color: r === 'strong' ? '#10b981' : r === 'weak' ? '#ef4444' : '#8890a0',
                            }}
                          >
                            {r === 'not-started' ? 'N/S' : r.charAt(0).toUpperCase() + r.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: '#596475' }}>Progress Rating</label>
                      <div className="flex gap-1.5">
                        {(['strong', 'weak', 'not-started'] as const).map(r => (
                          <button
                            key={r}
                            onClick={() => setAuditForm(f => ({ ...f, progressRating: r }))}
                            className={`flex-1 px-2 py-1.5 rounded text-[10px] font-semibold transition-all ${auditForm.progressRating === r ? 'ring-1 ring-purple-500' : ''}`}
                            style={{
                              background: r === 'strong' ? 'rgba(16,185,129,0.12)' : r === 'weak' ? 'rgba(239,68,68,0.12)' : 'rgba(100,116,139,0.12)',
                              color: r === 'strong' ? '#10b981' : r === 'weak' ? '#ef4444' : '#8890a0',
                            }}
                          >
                            {r === 'not-started' ? 'N/S' : r.charAt(0).toUpperCase() + r.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: '#596475' }}>Notes</label>
                    <textarea
                      value={auditForm.notes}
                      onChange={e => setAuditForm(f => ({ ...f, notes: e.target.value }))}
                      className="w-full rounded-md px-3 py-2 text-xs text-white resize-none"
                      style={{ background: cellBg, border: cardBorder }}
                      rows={2}
                      placeholder="Audit observations..."
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowAuditForm(false)}
                      className="px-3 py-1.5 rounded text-xs font-medium transition-colors hover:bg-white/5"
                      style={{ color: '#8890a0' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitAudit}
                      disabled={createAuditMutation.isPending}
                      className="px-3 py-1.5 rounded text-xs font-semibold text-white transition-colors"
                      style={{ background: '#8C34E9' }}
                    >
                      {createAuditMutation.isPending ? 'Saving...' : 'Save Audit'}
                    </button>
                  </div>
                </div>
              )}

              {/* Audit list */}
              {auditsQuery.isLoading ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="w-3 h-3 animate-spin" style={{ color: '#8C34E9' }} />
                  <span className="text-xs" style={{ color: '#596475' }}>Loading audits...</span>
                </div>
              ) : auditsQuery.data && auditsQuery.data.length > 0 ? (
                <div className="space-y-2">
                  {auditsQuery.data.map((audit: any) => (
                    <div key={audit.id} className="rounded-md p-2.5" style={{ background: headerBg }}>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-[10px] font-mono" style={{ color: '#596475' }}>
                          {new Date(audit.auditDate).toLocaleDateString()}
                        </span>
                        <span className="text-[10px]" style={{ color: '#596475' }}>by {audit.auditedByName ?? 'Unknown'}</span>
                        <span className="text-[10px]" style={{ color: '#596475' }}>|</span>
                        <span className="text-[10px]" style={{ color: '#596475' }}>Deploy:</span>
                        <RatingBadge rating={audit.deploymentRating} />
                        <span className="text-[10px]" style={{ color: '#596475' }}>Progress:</span>
                        <RatingBadge rating={audit.progressRating} />
                      </div>
                      {audit.notes && (
                        <p className="text-xs mt-1.5" style={{ color: '#8890a0' }}>{audit.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs py-2" style={{ color: '#596475' }}>No audits recorded yet.</p>
              )}
            </div>

            {/* Metric Progress — Audited vs Real */}
            <MetricProgress deploymentTargetId={target.id} targetValue={target.targetValue} unit={target.unit ?? ''} />

            {/* AI Suggestions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />
                  <span className="text-xs font-semibold text-white">AI Improvement Suggestions</span>
                </div>
                <button
                  onClick={handleGetAiSuggestion}
                  disabled={aiLoading}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold transition-colors hover:bg-white/5"
                  style={{ color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
                >
                  {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {aiLoading ? 'Analysing...' : 'Get AI Suggestions'}
                </button>
              </div>
              {aiSuggestion && (
                <div className="rounded-md p-3" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
                  <div className="text-xs leading-relaxed" style={{ color: '#c0c6d0' }}>
                    <Streamdown>{aiSuggestion}</Streamdown>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Deployments() {
  const { planId, isLoading, activeSiteIds } = usePolicy();
  const hierarchy = useHierarchy();
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<'objective' | 'site' | 'category'>('objective');

  // Determine if we should filter by site from the hierarchy breadcrumb
  const selectedSiteId = useMemo(() => {
    try {
      const sId = hierarchy?.selection?.site?.id;
      return sId ? Number(sId) : null;
    } catch {
      return null;
    }
  }, [hierarchy?.selection?.site?.id]);

  // Use listDeploymentTargetsBySite when a specific site is selected,
  // otherwise fall back to listDeploymentTargets for the full plan
  const deploymentsQuery = trpc.policy.listDeploymentTargets.useQuery(
    { planId: planId! },
    { enabled: planId !== null && activeSiteIds.length === 0 }
  );

  const siteDeploymentsQuery = trpc.policy.listDeploymentTargetsBySite.useQuery(
    { siteId: selectedSiteId! },
    { enabled: selectedSiteId !== null }
  );

  // When a BU is selected (multiple sites), fetch all plan targets and filter client-side
  const isBuSelected = activeSiteIds.length > 1;
  const buDeploymentsQuery = trpc.policy.listDeploymentTargets.useQuery(
    { planId: planId! },
    { enabled: planId !== null && isBuSelected }
  );

  // Resolve the correct deployment list based on hierarchy selection
  const deployments = useMemo(() => {
    if (selectedSiteId && siteDeploymentsQuery.data) {
      return siteDeploymentsQuery.data;
    }
    if (isBuSelected && buDeploymentsQuery.data) {
      return buDeploymentsQuery.data.filter((d: any) => activeSiteIds.includes(d.siteId));
    }
    return deploymentsQuery.data ?? [];
  }, [
    selectedSiteId,
    siteDeploymentsQuery.data,
    isBuSelected,
    buDeploymentsQuery.data,
    activeSiteIds,
    deploymentsQuery.data,
  ]);

  // Get unique sites and categories for filters
  const sites = useMemo(() => {
    const s = new Set(deployments.map((d: any) => d.siteName));
    return Array.from(s).filter(Boolean).sort();
  }, [deployments]);

  const categories = ['safety', 'quality', 'delivery', 'cost', 'people'];

  // Filter (site filter is now handled by hierarchy breadcrumb)
  const filtered = useMemo(() => {
    let result = deployments;
    if (filterCategory) result = result.filter((d: any) => d.sqdcpCategory === filterCategory);
    return result;
  }, [deployments, filterCategory]);

  // Group
  const grouped = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const d of filtered) {
      let key: string;
      if (groupBy === 'objective') key = `${d.objectiveCode ?? 'Unknown'} — ${d.objectiveCode ? '' : 'Unlinked'}`;
      else if (groupBy === 'site') key = d.siteName ?? 'Unknown Site';
      else key = d.sqdcpCategory ?? 'unknown';

      if (groupBy === 'objective') {
        // Group by objective code
        key = d.objectiveCode ?? 'Unknown';
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    }
    return groups;
  }, [filtered, groupBy]);

  const anyLoading = deploymentsQuery.isLoading || siteDeploymentsQuery.isLoading || buDeploymentsQuery.isLoading;

  if (isLoading || anyLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#8C34E9' }} />
        <span className="ml-2 text-sm" style={{ color: '#8890a0' }}>Loading deployments...</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header — Oplytics purple gradient */}
      <div className="px-6 py-3 rounded-t-md" style={{ background: 'linear-gradient(135deg, #8C34E9 0%, #5B1FA6 100%)' }}>
        <h2 className="text-lg font-black text-white tracking-wide" style={{ fontFamily: 'Montserrat' }}>Deployment Cascade</h2>
        <p className="text-sm text-white/60">Policy objectives deployed to sites with SQDCP categories</p>
      </div>

      {/* Filters & Controls */}
      <div className="px-4 py-3 flex items-center gap-3 flex-wrap" style={{ background: cellBg, borderLeft: cardBorder, borderRight: cardBorder }}>
        {/* Group by */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase" style={{ color: '#596475' }}>Group by:</span>
          {(['objective', 'site', 'category'] as const).map(g => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              className="px-2 py-1 rounded text-[10px] font-semibold transition-all"
              style={{
                background: groupBy === g ? 'rgba(140,52,233,0.12)' : 'transparent',
                color: groupBy === g ? '#8C34E9' : '#8890a0',
                border: groupBy === g ? '1px solid rgba(140,52,233,0.3)' : '1px solid transparent',
              }}
            >
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>

        <div className="w-px h-5" style={{ background: '#1e2738' }} />

        {/* Category filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase" style={{ color: '#596475' }}>SQDCP:</span>
          <button
            onClick={() => setFilterCategory(null)}
            className="px-2 py-1 rounded text-[10px] font-semibold transition-all"
            style={{
              background: !filterCategory ? 'rgba(140,52,233,0.12)' : 'transparent',
              color: !filterCategory ? '#8C34E9' : '#8890a0',
            }}
          >
            All
          </button>
          {categories.map(cat => {
            const CatIcon = categoryIcons[cat] ?? Target;
            return (
              <button
                key={cat}
                onClick={() => setFilterCategory(filterCategory === cat ? null : cat)}
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold transition-all"
                style={{
                  background: filterCategory === cat ? `${categoryColors[cat]}15` : 'transparent',
                  color: filterCategory === cat ? categoryColors[cat] : '#8890a0',
                }}
              >
                <CatIcon className="w-3 h-3" />
                {cat.charAt(0).toUpperCase()}
              </button>
            );
          })}
        </div>

        <div className="w-px h-5" style={{ background: '#1e2738' }} />

        {/* Site scope indicator — driven by hierarchy breadcrumb */}
        <div className="flex items-center gap-1.5">
          <Factory className="w-3 h-3" style={{ color: '#1DB8CE' }} />
          <span className="text-[10px] font-semibold" style={{ color: activeSiteIds.length > 0 ? '#1DB8CE' : '#596475' }}>
            {activeSiteIds.length === 0
              ? 'All Sites'
              : activeSiteIds.length === 1
                ? `Site: ${hierarchy?.selection?.site?.name ?? sites[0] ?? 'Selected'}`
                : `${activeSiteIds.length} sites (${hierarchy?.selection?.businessUnit?.name ?? 'BU'})`}
          </span>
        </div>

        <div className="ml-auto text-xs" style={{ color: '#596475' }}>
          {filtered.length} deployment{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Summary stats */}
      <div className="px-4 py-3 flex items-center gap-3 flex-wrap" style={{ background: cellBg, borderLeft: cardBorder, borderRight: cardBorder, borderBottom: cardBorder }}>
        {categories.map(cat => {
          const count = deployments.filter((d: any) => d.sqdcpCategory === cat).length;
          const CatIcon = categoryIcons[cat] ?? Target;
          return (
            <div key={cat} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md" style={{ background: `${categoryColors[cat]}08`, border: `1px solid ${categoryColors[cat]}20` }}>
              <CatIcon className="w-3.5 h-3.5" style={{ color: categoryColors[cat] }} />
              <span className="text-xs font-semibold" style={{ color: categoryColors[cat] }}>{count}</span>
              <span className="text-[10px] capitalize" style={{ color: '#596475' }}>{cat}</span>
            </div>
          );
        })}
      </div>

      {/* Grouped deployment cards */}
      <div className="mt-4 space-y-6">
        {Object.entries(grouped).map(([groupKey, items]) => (
          <div key={groupKey}>
            <div className="flex items-center gap-2 mb-3 px-1">
              {groupBy === 'category' && (
                <>
                  {(() => { const CatIcon = categoryIcons[groupKey] ?? Target; return <CatIcon className="w-4 h-4" style={{ color: categoryColors[groupKey] ?? '#8890a0' }} />; })()}
                  <h3 className="text-sm font-bold capitalize" style={{ color: categoryColors[groupKey] ?? '#c0c6d0', fontFamily: 'Montserrat' }}>{groupKey}</h3>
                </>
              )}
              {groupBy === 'objective' && (
                <>
                  <span className="font-mono text-sm font-bold" style={{ color: '#8C34E9' }}>{groupKey}</span>
                  <span className="text-xs" style={{ color: '#596475' }}>— {items.length} deployment{items.length !== 1 ? 's' : ''}</span>
                </>
              )}
              {groupBy === 'site' && (
                <>
                  <Factory className="w-4 h-4" style={{ color: '#1DB8CE' }} />
                  <h3 className="text-sm font-bold" style={{ color: '#c0c6d0', fontFamily: 'Montserrat' }}>{groupKey}</h3>
                  <span className="text-xs" style={{ color: '#596475' }}>— {items.length} deployment{items.length !== 1 ? 's' : ''}</span>
                </>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {items.map((target: any) => (
                <DeploymentCard key={target.id} target={target} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Target className="w-8 h-8 mx-auto mb-3" style={{ color: '#596475' }} />
          <p className="text-sm font-medium" style={{ color: '#8890a0' }}>No deployment targets found</p>
          <p className="text-xs mt-1" style={{ color: '#596475' }}>Adjust filters or create new deployment targets</p>
        </div>
      )}
    </div>
  );
}
