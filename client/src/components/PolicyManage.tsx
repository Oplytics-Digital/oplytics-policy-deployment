/*
 * PolicyManage — CRUD Admin UI for Policy Deployment
 * Superuser/Admin only. Manages breakthrough objectives, annual objectives,
 * improvement projects, KPIs, and deployment targets.
 * Oplytics dark theme: dark navy bg, purple/teal accents
 */
import { useState, useMemo } from 'react';
import { usePolicy } from '@/contexts/PolicyContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Target,
  ShieldCheck,
  Gauge,
  Truck,
  DollarSign,
  Users,
  Loader2,
  ChevronDown,
  ChevronRight,
  Factory,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { type SqdcpPillar } from '@pablo2410/core-server';

const cellBg = '#0e1624';
const cardBorder = '1px solid #1e2738';
const headerBg = '#131b2e';
const inputBg = '#0a0e1a';
const inputBorder = '1px solid #1e2738';

const categoryOptions = [
  { value: 'safety', label: 'Safety', color: '#ef4444' },
  { value: 'quality', label: 'Quality', color: '#3b82f6' },
  { value: 'delivery', label: 'Delivery', color: '#f59e0b' },
  { value: 'cost', label: 'Cost', color: '#10b981' },
  { value: 'people', label: 'People', color: '#a855f7' },
];

const sqdcpOptions = [
  { value: 'safety', label: 'Safety' },
  { value: 'quality', label: 'Quality' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'cost', label: 'Cost' },
  { value: 'people', label: 'People' },
];

const statusOptions = [
  { value: 'not-started', label: 'Not Started' },
  { value: 'on-track', label: 'On Track' },
  { value: 'at-risk', label: 'At Risk' },
  { value: 'off-track', label: 'Off Track' },
  { value: 'completed', label: 'Completed' },
];

const deployStatusOptions = [
  { value: 'not-deployed', label: 'Not Deployed' },
  { value: 'deployed', label: 'Deployed' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

function InputField({ label, value, onChange, placeholder, type = 'text', className = '' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: '#596475' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md px-3 py-2 text-xs text-white"
        style={{ background: inputBg, border: inputBorder }}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options, className = '' }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: '#596475' }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-md px-3 py-2 text-xs text-white"
        style={{ background: inputBg, border: inputBorder }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Section: Breakthrough Objectives ───
function BreakthroughSection({ planId, refetch }: { planId: number; refetch: () => void }) {
  const [expanded, setExpanded] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ code: '', description: '', category: 'safety' as SqdcpPillar });

  const query = trpc.policy.listBreakthroughObjectives.useQuery({ planId });
  const createMut = trpc.policy.createBreakthroughObjective.useMutation({
    onSuccess: () => { query.refetch(); refetch(); setShowAdd(false); setForm({ code: '', description: '', category: 'safety' }); toast.success('Objective created'); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.policy.updateBreakthroughObjective.useMutation({
    onSuccess: () => { query.refetch(); refetch(); setEditingId(null); toast.success('Objective updated'); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.policy.deleteBreakthroughObjective.useMutation({
    onSuccess: () => { query.refetch(); refetch(); toast.success('Objective deleted'); },
    onError: (e) => toast.error(e.message),
  });

  const items = query.data ?? [];

  return (
    <div className="rounded-md overflow-hidden" style={{ background: cellBg, border: cardBorder }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left"
        style={{ background: headerBg }}
      >
        {expanded ? <ChevronDown className="w-4 h-4" style={{ color: '#8C34E9' }} /> : <ChevronRight className="w-4 h-4" style={{ color: '#596475' }} />}
        <span className="text-sm font-bold text-white" style={{ fontFamily: 'Montserrat' }}>Breakthrough Objectives</span>
        <span className="text-xs ml-auto" style={{ color: '#596475' }}>{items.length} items</span>
      </button>

      {expanded && (
        <div className="p-4 space-y-3">
          {items.map((item: any) => (
            <div key={item.id} className="rounded-md p-3" style={{ background: headerBg, border: cardBorder }}>
              {editingId === item.id ? (
                <EditBreakthroughForm
                  item={item}
                  onSave={(data) => updateMut.mutate({ id: item.id, ...data })}
                  onCancel={() => setEditingId(null)}
                  isPending={updateMut.isPending}
                />
              ) : (
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded" style={{ background: `${categoryOptions.find(c => c.value === item.category)?.color ?? '#8890a0'}15`, color: categoryOptions.find(c => c.value === item.category)?.color ?? '#8890a0' }}>
                    {item.code}
                  </span>
                  <span className="text-xs text-white flex-1">{item.description}</span>
                  <span className="text-[10px] capitalize px-2 py-0.5 rounded" style={{ background: 'rgba(100,116,139,0.12)', color: '#8890a0' }}>{item.category}</span>
                  <button onClick={() => { setEditingId(item.id); setForm({ code: item.code, description: item.description, category: item.category }); }} className="p-1 rounded hover:bg-white/5"><Pencil className="w-3.5 h-3.5" style={{ color: '#596475' }} /></button>
                  <button onClick={() => { if (confirm('Delete this objective?')) deleteMut.mutate({ id: item.id }); }} className="p-1 rounded hover:bg-white/5"><Trash2 className="w-3.5 h-3.5" style={{ color: '#ef4444' }} /></button>
                </div>
              )}
            </div>
          ))}

          {showAdd ? (
            <div className="rounded-md p-3 space-y-3" style={{ background: headerBg, border: '1px solid rgba(140,52,233,0.3)' }}>
              <div className="grid grid-cols-4 gap-3">
                <InputField label="Code" value={form.code} onChange={v => setForm(f => ({ ...f, code: v }))} placeholder="S1" />
                <InputField label="Description" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} placeholder="Reduce workplace incidents" className="col-span-2" />
                <SelectField label="Category" value={form.category} onChange={v => setForm(f => ({ ...f, category: v as typeof f.category }))} options={categoryOptions} />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded text-xs" style={{ color: '#8890a0' }}>Cancel</button>
                <button
                  onClick={() => createMut.mutate({ planId, ...form })}
                  disabled={createMut.isPending || !form.code || !form.description}
                  className="px-3 py-1.5 rounded text-xs font-semibold text-white disabled:opacity-50"
                  style={{ background: '#8C34E9' }}
                >
                  {createMut.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-colors hover:bg-white/5 w-full" style={{ color: '#8C34E9', border: '1px dashed rgba(140,52,233,0.3)' }}>
              <Plus className="w-3.5 h-3.5" /> Add Breakthrough Objective
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function EditBreakthroughForm({ item, onSave, onCancel, isPending }: { item: any; onSave: (data: any) => void; onCancel: () => void; isPending: boolean }) {
  const [form, setForm] = useState({ code: item.code, description: item.description, category: item.category });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3">
        <InputField label="Code" value={form.code} onChange={v => setForm(f => ({ ...f, code: v }))} />
        <InputField label="Description" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} className="col-span-2" />
        <SelectField label="Category" value={form.category} onChange={v => setForm(f => ({ ...f, category: v as typeof f.category }))} options={categoryOptions} />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 rounded text-xs" style={{ color: '#8890a0' }}>Cancel</button>
        <button onClick={() => onSave(form)} disabled={isPending} className="px-3 py-1.5 rounded text-xs font-semibold text-white" style={{ background: '#8C34E9' }}>
          {isPending ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

// ─── Section: Annual Objectives ───
function AnnualObjectivesSection({ planId, refetch }: { planId: number; refetch: () => void }) {
  const [expanded, setExpanded] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ code: '', description: '', ownerName: '', status: 'not-started' as 'not-started' | 'on-track' | 'at-risk' | 'off-track' | 'completed' });

  const query = trpc.policy.listAnnualObjectives.useQuery({ planId });
  const createMut = trpc.policy.createAnnualObjective.useMutation({
    onSuccess: () => { query.refetch(); refetch(); setShowAdd(false); setForm({ code: '', description: '', ownerName: '', status: 'not-started' }); toast.success('Annual objective created'); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.policy.updateAnnualObjective.useMutation({
    onSuccess: () => { query.refetch(); refetch(); setEditingId(null); toast.success('Annual objective updated'); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.policy.deleteAnnualObjective.useMutation({
    onSuccess: () => { query.refetch(); refetch(); toast.success('Annual objective deleted'); },
    onError: (e) => toast.error(e.message),
  });

  const items = query.data ?? [];

  return (
    <div className="rounded-md overflow-hidden" style={{ background: cellBg, border: cardBorder }}>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-2 px-4 py-3 text-left" style={{ background: headerBg }}>
        {expanded ? <ChevronDown className="w-4 h-4" style={{ color: '#1DB8CE' }} /> : <ChevronRight className="w-4 h-4" style={{ color: '#596475' }} />}
        <span className="text-sm font-bold text-white" style={{ fontFamily: 'Montserrat' }}>Annual Objectives</span>
        <span className="text-xs ml-auto" style={{ color: '#596475' }}>{items.length} items</span>
      </button>

      {expanded && (
        <div className="p-4 space-y-3">
          {items.map((item: any) => (
            <div key={item.id} className="rounded-md p-3" style={{ background: headerBg, border: cardBorder }}>
              {editingId === item.id ? (
                <EditAnnualForm item={item} onSave={(data) => updateMut.mutate({ id: item.id, ...data })} onCancel={() => setEditingId(null)} isPending={updateMut.isPending} />
              ) : (
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(29,184,206,0.12)', color: '#1DB8CE' }}>{item.code}</span>
                  <span className="text-xs text-white flex-1">{item.description}</span>
                  <span className="text-[10px]" style={{ color: '#596475' }}>{item.ownerName || '—'}</span>
                  <span className="text-[10px] capitalize px-2 py-0.5 rounded" style={{ background: 'rgba(100,116,139,0.12)', color: '#8890a0' }}>{item.status?.replace('-', ' ')}</span>
                  <button onClick={() => setEditingId(item.id)} className="p-1 rounded hover:bg-white/5"><Pencil className="w-3.5 h-3.5" style={{ color: '#596475' }} /></button>
                  <button onClick={() => { if (confirm('Delete this objective?')) deleteMut.mutate({ id: item.id }); }} className="p-1 rounded hover:bg-white/5"><Trash2 className="w-3.5 h-3.5" style={{ color: '#ef4444' }} /></button>
                </div>
              )}
            </div>
          ))}

          {showAdd ? (
            <div className="rounded-md p-3 space-y-3" style={{ background: headerBg, border: '1px solid rgba(29,184,206,0.3)' }}>
              <div className="grid grid-cols-4 gap-3">
                <InputField label="Code" value={form.code} onChange={v => setForm(f => ({ ...f, code: v }))} placeholder="T1" />
                <InputField label="Description" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} placeholder="Achieve zero lost time incidents" className="col-span-2" />
                <InputField label="Owner" value={form.ownerName} onChange={v => setForm(f => ({ ...f, ownerName: v }))} placeholder="John Smith" />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded text-xs" style={{ color: '#8890a0' }}>Cancel</button>
                <button onClick={() => createMut.mutate({ planId, ...form })} disabled={createMut.isPending || !form.code || !form.description} className="px-3 py-1.5 rounded text-xs font-semibold text-white disabled:opacity-50" style={{ background: '#1DB8CE' }}>
                  {createMut.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-colors hover:bg-white/5 w-full" style={{ color: '#1DB8CE', border: '1px dashed rgba(29,184,206,0.3)' }}>
              <Plus className="w-3.5 h-3.5" /> Add Annual Objective
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function EditAnnualForm({ item, onSave, onCancel, isPending }: { item: any; onSave: (data: any) => void; onCancel: () => void; isPending: boolean }) {
  const [form, setForm] = useState({ code: item.code, description: item.description, ownerName: item.ownerName ?? '', status: item.status ?? 'not-started' });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3">
        <InputField label="Code" value={form.code} onChange={v => setForm(f => ({ ...f, code: v }))} />
        <InputField label="Description" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} className="col-span-2" />
        <InputField label="Owner" value={form.ownerName} onChange={v => setForm(f => ({ ...f, ownerName: v }))} />
      </div>
      <SelectField label="Status" value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))} options={statusOptions} className="w-48" />
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 rounded text-xs" style={{ color: '#8890a0' }}>Cancel</button>
        <button onClick={() => onSave(form)} disabled={isPending} className="px-3 py-1.5 rounded text-xs font-semibold text-white" style={{ background: '#1DB8CE' }}>
          {isPending ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

// ─── Section: Improvement Projects ───
function ProjectsSection({ planId, refetch }: { planId: number; refetch: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', description: '', ownerName: '', status: 'not-started', progress: '0' });

  const query = trpc.policy.listProjects.useQuery({ planId });
  const createMut = trpc.policy.createProject.useMutation({
    onSuccess: () => { query.refetch(); refetch(); setShowAdd(false); setForm({ code: '', name: '', description: '', ownerName: '', status: 'not-started', progress: '0' }); toast.success('Project created'); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.policy.updateProject.useMutation({
    onSuccess: () => { query.refetch(); refetch(); setEditingId(null); toast.success('Project updated'); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.policy.deleteProject.useMutation({
    onSuccess: () => { query.refetch(); refetch(); toast.success('Project deleted'); },
    onError: (e) => toast.error(e.message),
  });

  const items = query.data ?? [];

  return (
    <div className="rounded-md overflow-hidden" style={{ background: cellBg, border: cardBorder }}>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-2 px-4 py-3 text-left" style={{ background: headerBg }}>
        {expanded ? <ChevronDown className="w-4 h-4" style={{ color: '#f59e0b' }} /> : <ChevronRight className="w-4 h-4" style={{ color: '#596475' }} />}
        <span className="text-sm font-bold text-white" style={{ fontFamily: 'Montserrat' }}>Improvement Projects</span>
        <span className="text-xs ml-auto" style={{ color: '#596475' }}>{items.length} items</span>
      </button>

      {expanded && (
        <div className="p-4 space-y-3">
          {items.map((item: any) => (
            <div key={item.id} className="rounded-md p-3" style={{ background: headerBg, border: cardBorder }}>
              {editingId === item.id ? (
                <EditProjectForm item={item} onSave={(data) => updateMut.mutate({ id: item.id, ...data })} onCancel={() => setEditingId(null)} isPending={updateMut.isPending} />
              ) : (
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>{item.code}</span>
                  <span className="text-xs text-white flex-1">{item.name}</span>
                  <span className="text-[10px]" style={{ color: '#596475' }}>{item.ownerName || '—'}</span>
                  <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: '#1e2738' }}>
                    <div className="h-full rounded-full" style={{ width: `${item.progress ?? 0}%`, background: '#f59e0b' }} />
                  </div>
                  <span className="text-[10px]" style={{ color: '#f59e0b' }}>{item.progress ?? 0}%</span>
                  <button onClick={() => setEditingId(item.id)} className="p-1 rounded hover:bg-white/5"><Pencil className="w-3.5 h-3.5" style={{ color: '#596475' }} /></button>
                  <button onClick={() => { if (confirm('Delete this project?')) deleteMut.mutate({ id: item.id }); }} className="p-1 rounded hover:bg-white/5"><Trash2 className="w-3.5 h-3.5" style={{ color: '#ef4444' }} /></button>
                </div>
              )}
            </div>
          ))}

          {showAdd ? (
            <div className="rounded-md p-3 space-y-3" style={{ background: headerBg, border: '1px solid rgba(245,158,11,0.3)' }}>
              <div className="grid grid-cols-4 gap-3">
                <InputField label="Code" value={form.code} onChange={v => setForm(f => ({ ...f, code: v }))} placeholder="FB-1.1" />
                <InputField label="Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Safety audit programme" className="col-span-2" />
                <InputField label="Owner" value={form.ownerName} onChange={v => setForm(f => ({ ...f, ownerName: v }))} placeholder="Jane Doe" />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded text-xs" style={{ color: '#8890a0' }}>Cancel</button>
                <button onClick={() => createMut.mutate({ planId, code: form.code, name: form.name, description: form.description, ownerName: form.ownerName, status: form.status as any, progress: parseInt(form.progress) || 0 })} disabled={createMut.isPending || !form.code || !form.name} className="px-3 py-1.5 rounded text-xs font-semibold text-white disabled:opacity-50" style={{ background: '#f59e0b' }}>
                  {createMut.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-colors hover:bg-white/5 w-full" style={{ color: '#f59e0b', border: '1px dashed rgba(245,158,11,0.3)' }}>
              <Plus className="w-3.5 h-3.5" /> Add Improvement Project
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function EditProjectForm({ item, onSave, onCancel, isPending }: { item: any; onSave: (data: any) => void; onCancel: () => void; isPending: boolean }) {
  const [form, setForm] = useState({ code: item.code, name: item.name, description: item.description ?? '', ownerName: item.ownerName ?? '', status: item.status ?? 'not-started', progress: String(item.progress ?? 0) });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3">
        <InputField label="Code" value={form.code} onChange={v => setForm(f => ({ ...f, code: v }))} />
        <InputField label="Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} className="col-span-2" />
        <InputField label="Owner" value={form.ownerName} onChange={v => setForm(f => ({ ...f, ownerName: v }))} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <SelectField label="Status" value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))} options={statusOptions} />
        <InputField label="Progress (%)" value={form.progress} onChange={v => setForm(f => ({ ...f, progress: v }))} type="number" />
        <InputField label="Description" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 rounded text-xs" style={{ color: '#8890a0' }}>Cancel</button>
        <button onClick={() => onSave({ ...form, progress: parseInt(form.progress) || 0 })} disabled={isPending} className="px-3 py-1.5 rounded text-xs font-semibold text-white" style={{ background: '#f59e0b' }}>
          {isPending ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

// ─── Section: KPIs ───
function KpisSection({ planId, refetch }: { planId: number; refetch: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', unit: '', target: '', current: '', direction: 'up', ownerName: '' });

  const query = trpc.policy.listKpis.useQuery({ planId });
  const createMut = trpc.policy.createKpi.useMutation({
    onSuccess: () => { query.refetch(); refetch(); setShowAdd(false); setForm({ code: '', name: '', unit: '', target: '', current: '', direction: 'up', ownerName: '' }); toast.success('KPI created'); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.policy.updateKpi.useMutation({
    onSuccess: () => { query.refetch(); refetch(); setEditingId(null); toast.success('KPI updated'); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.policy.deleteKpi.useMutation({
    onSuccess: () => { query.refetch(); refetch(); toast.success('KPI deleted'); },
    onError: (e) => toast.error(e.message),
  });

  const items = query.data ?? [];

  return (
    <div className="rounded-md overflow-hidden" style={{ background: cellBg, border: cardBorder }}>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-2 px-4 py-3 text-left" style={{ background: headerBg }}>
        {expanded ? <ChevronDown className="w-4 h-4" style={{ color: '#10b981' }} /> : <ChevronRight className="w-4 h-4" style={{ color: '#596475' }} />}
        <span className="text-sm font-bold text-white" style={{ fontFamily: 'Montserrat' }}>KPIs</span>
        <span className="text-xs ml-auto" style={{ color: '#596475' }}>{items.length} items</span>
      </button>

      {expanded && (
        <div className="p-4 space-y-3">
          {items.map((item: any) => (
            <div key={item.id} className="rounded-md p-3" style={{ background: headerBg, border: cardBorder }}>
              {editingId === item.id ? (
                <EditKpiForm item={item} onSave={(data) => updateMut.mutate({ id: item.id, ...data })} onCancel={() => setEditingId(null)} isPending={updateMut.isPending} />
              ) : (
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>{item.code}</span>
                  <span className="text-xs text-white flex-1">{item.name}</span>
                  <span className="text-[10px]" style={{ color: '#596475' }}>{item.current ?? '—'} / {item.target ?? '—'} {item.unit ?? ''}</span>
                  <span className="text-[10px]" style={{ color: item.direction === 'up' ? '#10b981' : '#ef4444' }}>{item.direction === 'up' ? '↑ Higher' : '↓ Lower'}</span>
                  <button onClick={() => setEditingId(item.id)} className="p-1 rounded hover:bg-white/5"><Pencil className="w-3.5 h-3.5" style={{ color: '#596475' }} /></button>
                  <button onClick={() => { if (confirm('Delete this KPI?')) deleteMut.mutate({ id: item.id }); }} className="p-1 rounded hover:bg-white/5"><Trash2 className="w-3.5 h-3.5" style={{ color: '#ef4444' }} /></button>
                </div>
              )}
            </div>
          ))}

          {showAdd ? (
            <div className="rounded-md p-3 space-y-3" style={{ background: headerBg, border: '1px solid rgba(16,185,129,0.3)' }}>
              <div className="grid grid-cols-4 gap-3">
                <InputField label="Code" value={form.code} onChange={v => setForm(f => ({ ...f, code: v }))} placeholder="IP1.1" />
                <InputField label="Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Lost Time Incident Rate" className="col-span-2" />
                <InputField label="Unit" value={form.unit} onChange={v => setForm(f => ({ ...f, unit: v }))} placeholder="per 200k hrs" />
              </div>
              <div className="grid grid-cols-4 gap-3">
                <InputField label="Target" value={form.target} onChange={v => setForm(f => ({ ...f, target: v }))} placeholder="0.5" />
                <InputField label="Current" value={form.current} onChange={v => setForm(f => ({ ...f, current: v }))} placeholder="1.2" />
                <SelectField label="Direction" value={form.direction} onChange={v => setForm(f => ({ ...f, direction: v }))} options={[{ value: 'up', label: '↑ Higher is Better' }, { value: 'down', label: '↓ Lower is Better' }]} />
                <InputField label="Owner" value={form.ownerName} onChange={v => setForm(f => ({ ...f, ownerName: v }))} placeholder="Owner name" />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded text-xs" style={{ color: '#8890a0' }}>Cancel</button>
                <button onClick={() => createMut.mutate({ planId, ...form, direction: form.direction as 'up' | 'down' })} disabled={createMut.isPending || !form.code || !form.name} className="px-3 py-1.5 rounded text-xs font-semibold text-white disabled:opacity-50" style={{ background: '#10b981' }}>
                  {createMut.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-colors hover:bg-white/5 w-full" style={{ color: '#10b981', border: '1px dashed rgba(16,185,129,0.3)' }}>
              <Plus className="w-3.5 h-3.5" /> Add KPI
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function EditKpiForm({ item, onSave, onCancel, isPending }: { item: any; onSave: (data: any) => void; onCancel: () => void; isPending: boolean }) {
  const [form, setForm] = useState({ code: item.code, name: item.name, unit: item.unit ?? '', target: item.target ?? '', current: item.current ?? '', direction: item.direction ?? 'up', ownerName: item.ownerName ?? '' });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3">
        <InputField label="Code" value={form.code} onChange={v => setForm(f => ({ ...f, code: v }))} />
        <InputField label="Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} className="col-span-2" />
        <InputField label="Unit" value={form.unit} onChange={v => setForm(f => ({ ...f, unit: v }))} />
      </div>
      <div className="grid grid-cols-4 gap-3">
        <InputField label="Target" value={form.target} onChange={v => setForm(f => ({ ...f, target: v }))} />
        <InputField label="Current" value={form.current} onChange={v => setForm(f => ({ ...f, current: v }))} />
        <SelectField label="Direction" value={form.direction} onChange={v => setForm(f => ({ ...f, direction: v }))} options={[{ value: 'up', label: '↑ Higher' }, { value: 'down', label: '↓ Lower' }]} />
        <InputField label="Owner" value={form.ownerName} onChange={v => setForm(f => ({ ...f, ownerName: v }))} />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 rounded text-xs" style={{ color: '#8890a0' }}>Cancel</button>
        <button onClick={() => onSave(form)} disabled={isPending} className="px-3 py-1.5 rounded text-xs font-semibold text-white" style={{ background: '#10b981' }}>
          {isPending ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

// ─── Section: Deployment Targets ───
function DeploymentTargetsSection({ planId, refetch }: { planId: number; refetch: () => void }) {
  const [expanded, setExpanded] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const query = trpc.policy.listDeploymentTargets.useQuery({ planId });
  const bosQuery = trpc.policy.listBreakthroughObjectives.useQuery({ planId });
  const aosQuery = trpc.policy.listAnnualObjectives.useQuery({ planId });
  // TODO(phase-3): remove any cast once tRPC versions are aligned (policy-dep@11.6, portal@11.13)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sitesQuery = (trpc as any).hierarchy.sites.useQuery(undefined);

  const [form, setForm] = useState({
    objectiveId: '',
    objectiveType: 'bo' as 'bo' | 'ao',
    siteId: '',
    sqdcpCategory: 'safety',
    deploymentTitle: '',
    deploymentDescription: '',
    targetMetric: '',
    targetValue: '',
    currentValue: '',
    unit: '',
    status: 'not-deployed',
  });

  const createMut = trpc.policy.createDeploymentTarget.useMutation({
    onSuccess: () => {
      query.refetch(); refetch(); setShowAdd(false);
      setForm({ objectiveId: '', objectiveType: 'bo', siteId: '', sqdcpCategory: 'safety', deploymentTitle: '', deploymentDescription: '', targetMetric: '', targetValue: '', currentValue: '', unit: '', status: 'not-deployed' });
      toast.success('Deployment target created');
    },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.policy.updateDeploymentTarget.useMutation({
    onSuccess: () => { query.refetch(); refetch(); setEditingId(null); toast.success('Deployment target updated'); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.policy.deleteDeploymentTarget.useMutation({
    onSuccess: () => { query.refetch(); refetch(); toast.success('Deployment target deleted'); },
    onError: (e) => toast.error(e.message),
  });

  const items = query.data ?? [];
  const bos = bosQuery.data ?? [];
  const aos = aosQuery.data ?? [];
  const sites = sitesQuery.data ?? [];

  const objectiveOptions = [
    ...bos.map((b: any) => ({ value: `bo-${b.id}`, label: `${b.code} — ${b.description?.slice(0, 50)}`, type: 'bo' as const })),
    ...aos.map((a: any) => ({ value: `ao-${a.id}`, label: `${a.code} — ${a.description?.slice(0, 50)}`, type: 'ao' as const })),
  ];

  const handleCreate = () => {
    const [type, idStr] = form.objectiveId.split('-');
    const selectedSite = sites.find((s: any) => s.id === parseInt(form.siteId));
    const selectedObj = [...bos, ...aos].find((o: any) => o.id === parseInt(idStr));
    createMut.mutate({
      planId,
      objectiveId: parseInt(idStr),
      objectiveType: type as 'bo' | 'ao',
      objectiveCode: selectedObj?.code,
      siteId: parseInt(form.siteId),
      siteName: selectedSite?.name,
      sqdcpCategory: form.sqdcpCategory as any,
      deploymentTitle: form.deploymentTitle,
      deploymentDescription: form.deploymentDescription || undefined,
      targetMetric: form.targetMetric || undefined,
      targetValue: form.targetValue || undefined,
      currentValue: form.currentValue || undefined,
      unit: form.unit || undefined,
      status: form.status as any,
    });
  };

  return (
    <div className="rounded-md overflow-hidden" style={{ background: cellBg, border: cardBorder }}>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-2 px-4 py-3 text-left" style={{ background: headerBg }}>
        {expanded ? <ChevronDown className="w-4 h-4" style={{ color: '#ef4444' }} /> : <ChevronRight className="w-4 h-4" style={{ color: '#596475' }} />}
        <Target className="w-4 h-4" style={{ color: '#ef4444' }} />
        <span className="text-sm font-bold text-white" style={{ fontFamily: 'Montserrat' }}>Deployment Targets</span>
        <span className="text-xs ml-auto" style={{ color: '#596475' }}>{items.length} items</span>
      </button>

      {expanded && (
        <div className="p-4 space-y-3">
          {items.map((item: any) => (
            <div key={item.id} className="rounded-md p-3" style={{ background: headerBg, border: cardBorder }}>
              {editingId === item.id ? (
                <EditDeploymentForm item={item} sites={sites} bos={bos} aos={aos} objectiveOptions={objectiveOptions} onSave={(data) => updateMut.mutate({ id: item.id, ...data })} onCancel={() => setEditingId(null)} isPending={updateMut.isPending} />
              ) : (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>{item.objectiveCode ?? '—'}</span>
                  <span className="text-xs text-white flex-1">{item.deploymentTitle}</span>
                  <span className="text-[10px] flex items-center gap-1" style={{ color: '#596475' }}><Factory className="w-3 h-3" />{item.siteName ?? '—'}</span>
                  <span className="text-[10px] capitalize px-2 py-0.5 rounded" style={{ background: 'rgba(100,116,139,0.12)', color: '#8890a0' }}>{item.sqdcpCategory}</span>
                  <span className="text-[10px] capitalize px-2 py-0.5 rounded" style={{ background: 'rgba(100,116,139,0.12)', color: '#8890a0' }}>{item.status?.replace('-', ' ')}</span>
                  <button onClick={() => setEditingId(item.id)} className="p-1 rounded hover:bg-white/5"><Pencil className="w-3.5 h-3.5" style={{ color: '#596475' }} /></button>
                  <button onClick={() => { if (confirm('Delete this deployment target?')) deleteMut.mutate({ id: item.id }); }} className="p-1 rounded hover:bg-white/5"><Trash2 className="w-3.5 h-3.5" style={{ color: '#ef4444' }} /></button>
                </div>
              )}
            </div>
          ))}

          {showAdd ? (
            <div className="rounded-md p-3 space-y-3" style={{ background: headerBg, border: '1px solid rgba(239,68,68,0.3)' }}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: '#596475' }}>Linked Objective</label>
                  <select value={form.objectiveId} onChange={e => setForm(f => ({ ...f, objectiveId: e.target.value }))} className="w-full rounded-md px-3 py-2 text-xs text-white" style={{ background: inputBg, border: inputBorder }}>
                    <option value="">Select objective...</option>
                    {objectiveOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: '#596475' }}>Site</label>
                  <select value={form.siteId} onChange={e => setForm(f => ({ ...f, siteId: e.target.value }))} className="w-full rounded-md px-3 py-2 text-xs text-white" style={{ background: inputBg, border: inputBorder }}>
                    <option value="">Select site...</option>
                    {sites.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <SelectField label="SQDCP Category" value={form.sqdcpCategory} onChange={v => setForm(f => ({ ...f, sqdcpCategory: v }))} options={sqdcpOptions} />
                <InputField label="Deployment Title" value={form.deploymentTitle} onChange={v => setForm(f => ({ ...f, deploymentTitle: v }))} placeholder="Reduce cost per Kg" className="col-span-2" />
              </div>
              <div className="grid grid-cols-4 gap-3">
                <InputField label="Target Metric" value={form.targetMetric} onChange={v => setForm(f => ({ ...f, targetMetric: v }))} placeholder="Cost per Kg" />
                <InputField label="Target Value" value={form.targetValue} onChange={v => setForm(f => ({ ...f, targetValue: v }))} placeholder="2.50" />
                <InputField label="Current Value" value={form.currentValue} onChange={v => setForm(f => ({ ...f, currentValue: v }))} placeholder="3.10" />
                <InputField label="Unit" value={form.unit} onChange={v => setForm(f => ({ ...f, unit: v }))} placeholder="£/Kg" />
              </div>
              <SelectField label="Status" value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))} options={deployStatusOptions} className="w-48" />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded text-xs" style={{ color: '#8890a0' }}>Cancel</button>
                <button onClick={handleCreate} disabled={createMut.isPending || !form.objectiveId || !form.siteId || !form.deploymentTitle} className="px-3 py-1.5 rounded text-xs font-semibold text-white disabled:opacity-50" style={{ background: '#ef4444' }}>
                  {createMut.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-colors hover:bg-white/5 w-full" style={{ color: '#ef4444', border: '1px dashed rgba(239,68,68,0.3)' }}>
              <Plus className="w-3.5 h-3.5" /> Add Deployment Target
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function EditDeploymentForm({ item, sites, bos, aos, objectiveOptions, onSave, onCancel, isPending }: {
  item: any; sites: any[]; bos: any[]; aos: any[]; objectiveOptions: any[]; onSave: (data: any) => void; onCancel: () => void; isPending: boolean;
}) {
  const [form, setForm] = useState({
    deploymentTitle: item.deploymentTitle,
    deploymentDescription: item.deploymentDescription ?? '',
    sqdcpCategory: item.sqdcpCategory,
    targetMetric: item.targetMetric ?? '',
    targetValue: item.targetValue ?? '',
    currentValue: item.currentValue ?? '',
    unit: item.unit ?? '',
    status: item.status ?? 'not-deployed',
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <InputField label="Deployment Title" value={form.deploymentTitle} onChange={v => setForm(f => ({ ...f, deploymentTitle: v }))} className="col-span-2" />
        <SelectField label="SQDCP Category" value={form.sqdcpCategory} onChange={v => setForm(f => ({ ...f, sqdcpCategory: v }))} options={sqdcpOptions} />
      </div>
      <div className="grid grid-cols-4 gap-3">
        <InputField label="Target Metric" value={form.targetMetric} onChange={v => setForm(f => ({ ...f, targetMetric: v }))} />
        <InputField label="Target Value" value={form.targetValue} onChange={v => setForm(f => ({ ...f, targetValue: v }))} />
        <InputField label="Current Value" value={form.currentValue} onChange={v => setForm(f => ({ ...f, currentValue: v }))} />
        <InputField label="Unit" value={form.unit} onChange={v => setForm(f => ({ ...f, unit: v }))} />
      </div>
      <SelectField label="Status" value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))} options={deployStatusOptions} className="w-48" />
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 rounded text-xs" style={{ color: '#8890a0' }}>Cancel</button>
        <button onClick={() => onSave({ ...form, sqdcpCategory: form.sqdcpCategory as any, status: form.status as any })} disabled={isPending} className="px-3 py-1.5 rounded text-xs font-semibold text-white" style={{ background: '#ef4444' }}>
          {isPending ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───
export default function PolicyManage() {
  const { planId, isLoading, refetch } = usePolicy();
  const { user } = useAuth();

  const isSuperuser = user?.role === 'platform_admin' || user?.role === 'admin';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#8C34E9' }} />
        <span className="ml-2 text-sm" style={{ color: '#8890a0' }}>Loading policy data...</span>
      </div>
    );
  }

  if (!isSuperuser) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-8 h-8 mx-auto mb-3" style={{ color: '#f59e0b' }} />
        <p className="text-sm font-medium" style={{ color: '#8890a0' }}>Access Restricted</p>
        <p className="text-xs mt-1" style={{ color: '#596475' }}>Only superusers and administrators can manage policy deployment data.</p>
      </div>
    );
  }

  if (!planId) {
    return (
      <div className="text-center py-20">
        <Target className="w-8 h-8 mx-auto mb-3" style={{ color: '#596475' }} />
        <p className="text-sm font-medium" style={{ color: '#8890a0' }}>No active policy plan found</p>
        <p className="text-xs mt-1" style={{ color: '#596475' }}>Create a policy plan first to manage objectives and deployments.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="px-6 py-3 rounded-t-md" style={{ background: 'linear-gradient(135deg, #8C34E9 0%, #5B1FA6 100%)' }}>
        <h2 className="text-lg font-black text-white tracking-wide" style={{ fontFamily: 'Montserrat' }}>Manage Policy Deployment</h2>
        <p className="text-sm text-white/60">Add, edit, and delete objectives, projects, KPIs, and deployment targets</p>
      </div>

      {/* Warning banner */}
      <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: 'rgba(245,158,11,0.08)', borderLeft: cardBorder, borderRight: cardBorder, borderBottom: '1px solid rgba(245,158,11,0.2)' }}>
        <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#f59e0b' }} />
        <span className="text-xs" style={{ color: '#f59e0b' }}>Changes here affect the X-Matrix, Bowling Charts, and Deployment Cascade. Proceed with care.</span>
      </div>

      {/* Sections */}
      <div className="mt-4 space-y-4">
        <BreakthroughSection planId={planId} refetch={refetch} />
        <AnnualObjectivesSection planId={planId} refetch={refetch} />
        <ProjectsSection planId={planId} refetch={refetch} />
        <KpisSection planId={planId} refetch={refetch} />
        <DeploymentTargetsSection planId={planId} refetch={refetch} />
      </div>
    </div>
  );
}
