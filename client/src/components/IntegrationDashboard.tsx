/**
 * IntegrationDashboard — Subdomain Integration Management & Push Log Monitor
 * Shows API endpoint documentation, test functionality, and push log history.
 * Superuser/Admin only. Oplytics dark theme.
 */
import { useState, useMemo } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import {
  Plug,
  Copy,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Send,
  Clock,
  ArrowUpRight,
  Shield,
  Code2,
  Activity,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

const cellBg = '#0e1624';
const cardBorder = '1px solid #1e2738';
const headerBg = '#131b2e';

const sourceColors: Record<string, string> = {
  sqdcp: '#3b82f6',
  oee: '#10b981',
  safety: '#ef4444',
  action: '#f59e0b',
  manual: '#8890a0',
  api: '#a855f7',
};

const statusColors: Record<string, { bg: string; text: string }> = {
  success: { bg: 'rgba(16,185,129,0.1)', text: '#10b981' },
  partial: { bg: 'rgba(245,158,11,0.1)', text: '#f59e0b' },
  failed: { bg: 'rgba(239,68,68,0.1)', text: '#ef4444' },
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
      style={{ background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(140,52,233,0.1)', color: copied ? '#10b981' : '#a78bfa' }}
    >
      {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function ApiDocSection() {
  const [expanded, setExpanded] = useState(true);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const endpoints = [
    {
      method: 'POST',
      path: '/api/service/policy/metrics/push',
      description: 'Push a single metric reading from a subdomain',
      body: `{
  "deploymentTargetId": 1,    // OR use "objectiveCode": "C1"
  "period": "2026-03",
  "periodType": "monthly",     // optional: "daily" | "weekly" | "monthly"
  "actualValue": 6.85,
  "source": "sqdcp",           // "sqdcp" | "oee" | "safety" | "action"
  "notes": "Auto-pushed from SQDCP cost module"
}`,
      response: `{ "id": 42, "deploymentTargetId": 1, "success": true }`,
    },
    {
      method: 'POST',
      path: '/api/service/policy/metrics/bulk-push',
      description: 'Push multiple metric readings in a single request (max 100)',
      body: `{
  "source": "sqdcp",
  "metrics": [
    { "deploymentTargetId": 1, "period": "2026-03", "actualValue": 6.85 },
    { "objectiveCode": "S1", "period": "2026-03", "actualValue": 2 },
    { "deploymentTargetId": 5, "period": "2026-03", "actualValue": 42 }
  ]
}`,
      response: `{ "total": 3, "success": 3, "failed": 0, "results": [...] }`,
    },
    {
      method: 'GET',
      path: '/api/service/policy/deployments',
      description: 'List all deployment targets (to discover target IDs)',
      body: null,
      response: `[{ "id": 1, "objectiveCode": "C1", "siteName": "Vita Middleton", ... }]`,
    },
  ];

  return (
    <div className="rounded-md overflow-hidden" style={{ border: cardBorder, background: cellBg }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left"
        style={{ background: headerBg }}
      >
        {expanded ? <ChevronDown className="w-4 h-4" style={{ color: '#a78bfa' }} /> : <ChevronRight className="w-4 h-4" style={{ color: '#a78bfa' }} />}
        <Code2 className="w-4 h-4" style={{ color: '#8C34E9' }} />
        <span className="text-sm font-semibold text-white">API Documentation</span>
      </button>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Auth header */}
          <div className="rounded-md p-3" style={{ background: '#0a0e1a', border: '1px solid #1e2738' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />
                <span className="text-xs font-semibold" style={{ color: '#f59e0b' }}>Authentication Required</span>
              </div>
            </div>
            <p className="text-xs mb-2" style={{ color: '#8890a0' }}>
              All requests must include the <code className="px-1 py-0.5 rounded text-xs" style={{ background: 'rgba(140,52,233,0.15)', color: '#a78bfa' }}>X-Service-Key</code> header with the SERVICE_API_KEY value.
            </p>
            <div className="flex items-center gap-2 p-2 rounded" style={{ background: 'rgba(140,52,233,0.05)', border: '1px solid rgba(140,52,233,0.2)' }}>
              <code className="text-xs flex-1 font-mono" style={{ color: '#a78bfa' }}>X-Service-Key: {'<SERVICE_API_KEY>'}</code>
            </div>
          </div>

          {/* Base URL */}
          <div className="flex items-center gap-2 p-2 rounded" style={{ background: '#0a0e1a', border: '1px solid #1e2738' }}>
            <span className="text-xs" style={{ color: '#596475' }}>Base URL:</span>
            <code className="text-xs font-mono flex-1" style={{ color: '#10b981' }}>{baseUrl}</code>
            <CopyButton text={baseUrl} label="Base URL" />
          </div>

          {/* Endpoints */}
          {endpoints.map((ep, i) => (
            <div key={i} className="rounded-md overflow-hidden" style={{ border: '1px solid #1e2738' }}>
              <div className="flex items-center gap-2 px-3 py-2" style={{ background: '#0a0e1a' }}>
                <span className="px-1.5 py-0.5 rounded text-xs font-bold" style={{
                  background: ep.method === 'POST' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)',
                  color: ep.method === 'POST' ? '#3b82f6' : '#10b981',
                }}>{ep.method}</span>
                <code className="text-xs font-mono flex-1" style={{ color: '#e2e8f0' }}>{ep.path}</code>
                <CopyButton text={`${baseUrl}${ep.path}`} label="Endpoint URL" />
              </div>
              <div className="px-3 py-2">
                <p className="text-xs mb-2" style={{ color: '#8890a0' }}>{ep.description}</p>
                {ep.body && (
                  <div className="mb-2">
                    <span className="text-xs font-semibold" style={{ color: '#596475' }}>Request Body:</span>
                    <pre className="mt-1 p-2 rounded text-xs overflow-x-auto" style={{ background: '#0a0e1a', color: '#a78bfa', border: '1px solid #1e2738' }}>{ep.body}</pre>
                  </div>
                )}
                <div>
                  <span className="text-xs font-semibold" style={{ color: '#596475' }}>Response:</span>
                  <pre className="mt-1 p-2 rounded text-xs overflow-x-auto" style={{ background: '#0a0e1a', color: '#10b981', border: '1px solid #1e2738' }}>{ep.response}</pre>
                </div>
              </div>
            </div>
          ))}

          {/* cURL example */}
          <div className="rounded-md p-3" style={{ background: '#0a0e1a', border: '1px solid #1e2738' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold" style={{ color: '#596475' }}>Example cURL (single push):</span>
              <CopyButton text={`curl -X POST ${baseUrl}/api/service/policy/metrics/push \\\n  -H "Content-Type: application/json" \\\n  -H "X-Service-Key: <YOUR_SERVICE_API_KEY>" \\\n  -d '{"deploymentTargetId": 1, "period": "2026-03", "actualValue": 6.85, "source": "sqdcp"}'`} label="cURL command" />
            </div>
            <pre className="text-xs overflow-x-auto" style={{ color: '#a78bfa' }}>
{`curl -X POST ${baseUrl}/api/service/policy/metrics/push \\
  -H "Content-Type: application/json" \\
  -H "X-Service-Key: <YOUR_SERVICE_API_KEY>" \\
  -d '{"deploymentTargetId": 1, "period": "2026-03", "actualValue": 6.85, "source": "sqdcp"}'`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function PushLogTable() {
  const logsQuery = trpc.policy.listPushLogs.useQuery({ limit: 50 });
  const logs = logsQuery.data ?? [];

  return (
    <div className="rounded-md overflow-hidden" style={{ border: cardBorder, background: cellBg }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ background: headerBg }}>
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" style={{ color: '#8C34E9' }} />
          <span className="text-sm font-semibold text-white">Push Log History</span>
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(140,52,233,0.15)', color: '#a78bfa' }}>{logs.length}</span>
        </div>
        <button
          onClick={() => logsQuery.refetch()}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
          style={{ background: 'rgba(140,52,233,0.1)', color: '#a78bfa' }}
        >
          <RefreshCw className={`w-3 h-3 ${logsQuery.isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {logsQuery.isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#8C34E9' }} />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="w-6 h-6 mx-auto mb-2" style={{ color: '#596475' }} />
          <p className="text-xs" style={{ color: '#596475' }}>No push logs yet. Metrics will appear here when subdomains push data via the API.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: '#0a0e1a' }}>
                <th className="px-3 py-2 text-left font-semibold" style={{ color: '#596475' }}>Time</th>
                <th className="px-3 py-2 text-left font-semibold" style={{ color: '#596475' }}>Source</th>
                <th className="px-3 py-2 text-left font-semibold" style={{ color: '#596475' }}>Endpoint</th>
                <th className="px-3 py-2 text-center font-semibold" style={{ color: '#596475' }}>Metrics</th>
                <th className="px-3 py-2 text-center font-semibold" style={{ color: '#596475' }}>Status</th>
                <th className="px-3 py-2 text-left font-semibold" style={{ color: '#596475' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => {
                const statusStyle = statusColors[log.status] ?? statusColors.failed;
                return (
                  <tr key={log.id} className="border-t" style={{ borderColor: '#1e2738' }}>
                    <td className="px-3 py-2 whitespace-nowrap" style={{ color: '#8890a0' }}>
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-1.5 py-0.5 rounded text-xs font-semibold uppercase" style={{
                        background: `${sourceColors[log.source] ?? '#596475'}15`,
                        color: sourceColors[log.source] ?? '#596475',
                      }}>
                        {log.source}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <code className="text-xs font-mono" style={{ color: '#a78bfa' }}>
                        {log.endpoint?.replace('/api/service/policy/', '') ?? '—'}
                      </code>
                    </td>
                    <td className="px-3 py-2 text-center" style={{ color: '#e2e8f0' }}>
                      {log.metricsCreated ?? 0}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="px-1.5 py-0.5 rounded text-xs font-semibold" style={{
                        background: statusStyle.bg,
                        color: statusStyle.text,
                      }}>
                        {log.status === 'success' && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                        {log.status === 'failed' && <XCircle className="w-3 h-3 inline mr-1" />}
                        {log.status === 'partial' && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                        {log.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 max-w-[200px] truncate" style={{ color: log.errorMessage ? '#ef4444' : '#596475' }}>
                      {log.errorMessage || (log.deploymentTargetId ? `Target #${log.deploymentTargetId}` : '—')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SubdomainStatus() {
  const subdomains = [
    { name: 'SQDCP', domain: 'sqdcp.oplytics.digital', source: 'sqdcp', color: '#3b82f6', description: 'Safety, Quality, Delivery, Cost, People metrics' },
    { name: 'OEE Manager', domain: 'oeemanager.oplytics.digital', source: 'oee', color: '#10b981', description: 'Overall Equipment Effectiveness data' },
    { name: 'Safety Manager', domain: 'safetymanager.oplytics.digital', source: 'safety', color: '#ef4444', description: 'Safety incidents and audit data' },
    { name: 'Action Manager', domain: 'actionmanager.oplytics.digital', source: 'action', color: '#f59e0b', description: 'Action completion and Gemba walk data' },
  ];

  return (
    <div className="rounded-md overflow-hidden" style={{ border: cardBorder, background: cellBg }}>
      <div className="flex items-center gap-2 px-4 py-3" style={{ background: headerBg }}>
        <Plug className="w-4 h-4" style={{ color: '#8C34E9' }} />
        <span className="text-sm font-semibold text-white">Connected Subdomains</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
        {subdomains.map((sd) => (
          <div key={sd.source} className="rounded-md p-3 flex items-start gap-3" style={{ background: '#0a0e1a', border: '1px solid #1e2738' }}>
            <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: `${sd.color}15` }}>
              <ArrowUpRight className="w-4 h-4" style={{ color: sd.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{sd.name}</span>
                <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: `${sd.color}15`, color: sd.color }}>{sd.source}</span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: '#596475' }}>{sd.description}</p>
              <code className="text-xs font-mono mt-1 block" style={{ color: '#8890a0' }}>{sd.domain}</code>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TestPushSection({ planId }: { planId: number | null }) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const deploymentsQuery = trpc.policy.listDeploymentTargets.useQuery(
    { planId: planId! },
    { enabled: planId !== null }
  );
  const targets = deploymentsQuery.data ?? [];

  const [form, setForm] = useState({
    deploymentTargetId: '',
    period: new Date().toISOString().slice(0, 7),
    actualValue: '',
    source: 'sqdcp',
    notes: 'Test push from integration dashboard',
  });

  const createMut = trpc.policy.createMetric.useMutation({
    onSuccess: () => {
      setTestResult({ success: true, message: 'Test push successful! Metric recorded.' });
      toast.success('Test metric pushed successfully');
    },
    onError: (e) => {
      setTestResult({ success: false, message: e.message });
      toast.error('Test push failed');
    },
  });

  const handleTest = () => {
    if (!form.deploymentTargetId || !form.actualValue) {
      toast.error('Select a deployment target and enter a value');
      return;
    }
    setTesting(true);
    setTestResult(null);
    createMut.mutate({
      deploymentTargetId: parseInt(form.deploymentTargetId),
      period: form.period,
      periodType: 'monthly',
      actualValue: form.actualValue,
      source: form.source as any,
      notes: form.notes,
    }, {
      onSettled: () => setTesting(false),
    });
  };

  return (
    <div className="rounded-md overflow-hidden" style={{ border: cardBorder, background: cellBg }}>
      <div className="flex items-center gap-2 px-4 py-3" style={{ background: headerBg }}>
        <Send className="w-4 h-4" style={{ color: '#8C34E9' }} />
        <span className="text-sm font-semibold text-white">Test Push</span>
        <span className="text-xs" style={{ color: '#596475' }}>— Simulate a metric push from a subdomain</span>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: '#596475' }}>Deployment Target</label>
            <select
              value={form.deploymentTargetId}
              onChange={(e) => setForm({ ...form, deploymentTargetId: e.target.value })}
              className="w-full px-2 py-1.5 rounded text-xs"
              style={{ background: '#0a0e1a', border: '1px solid #1e2738', color: '#e2e8f0' }}
            >
              <option value="">Select target...</option>
              {targets.map((t: any) => (
                <option key={t.id} value={t.id}>{t.objectiveCode} — {t.deploymentTitle} ({t.siteName})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: '#596475' }}>Period</label>
            <input
              type="text"
              value={form.period}
              onChange={(e) => setForm({ ...form, period: e.target.value })}
              placeholder="2026-03"
              className="w-full px-2 py-1.5 rounded text-xs"
              style={{ background: '#0a0e1a', border: '1px solid #1e2738', color: '#e2e8f0' }}
            />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: '#596475' }}>Actual Value</label>
            <input
              type="text"
              value={form.actualValue}
              onChange={(e) => setForm({ ...form, actualValue: e.target.value })}
              placeholder="6.85"
              className="w-full px-2 py-1.5 rounded text-xs"
              style={{ background: '#0a0e1a', border: '1px solid #1e2738', color: '#e2e8f0' }}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: '#596475' }}>Source</label>
            <select
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              className="w-full px-2 py-1.5 rounded text-xs"
              style={{ background: '#0a0e1a', border: '1px solid #1e2738', color: '#e2e8f0' }}
            >
              <option value="sqdcp">SQDCP</option>
              <option value="oee">OEE Manager</option>
              <option value="safety">Safety Manager</option>
              <option value="action">Action Manager</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: '#596475' }}>Notes</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional notes"
              className="w-full px-2 py-1.5 rounded text-xs"
              style={{ background: '#0a0e1a', border: '1px solid #1e2738', color: '#e2e8f0' }}
            />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-white transition-colors"
            style={{ background: testing ? '#596475' : '#8C34E9' }}
          >
            {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            {testing ? 'Pushing...' : 'Send Test Push'}
          </button>
          {testResult && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: testResult.success ? '#10b981' : '#ef4444' }}>
              {testResult.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {testResult.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function IntegrationDashboard() {
  const { user } = useAuth();
  const isSuperuser = user?.role === 'platform_admin' || user?.role === 'enterprise_admin';
  const plansQuery = trpc.policy.listPlans.useQuery(undefined, { enabled: isSuperuser });
  const activePlanId = plansQuery.data?.find((p: any) => p.status === 'active')?.id ?? plansQuery.data?.[0]?.id ?? null;

  if (!isSuperuser) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-8 h-8 mx-auto mb-3" style={{ color: '#f59e0b' }} />
        <p className="text-sm font-medium" style={{ color: '#8890a0' }}>Access Restricted</p>
        <p className="text-xs mt-1" style={{ color: '#596475' }}>Only superusers and administrators can access integration settings.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="px-6 py-3 rounded-t-md" style={{ background: 'linear-gradient(135deg, #8C34E9 0%, #5B1FA6 100%)' }}>
        <h2 className="text-lg font-black text-white tracking-wide" style={{ fontFamily: 'Montserrat' }}>Integration Dashboard</h2>
        <p className="text-sm text-white/60">Configure and monitor subdomain metric auto-push connections</p>
      </div>

      <div className="mt-4 space-y-4">
        <SubdomainStatus />
        <ApiDocSection />
        <TestPushSection planId={activePlanId} />
        <PushLogTable />
      </div>
    </div>
  );
}
