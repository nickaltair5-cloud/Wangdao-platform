import { useEffect, useState, useCallback } from 'react';
import { Shield, KeyRound, Flag, Plus, Loader2, Check, Trash2, Copy, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { RegistrationCode, ReportedComment } from '../lib/types';
import { LoadingState, EmptyState } from '../components/States';

type Tab = 'codes' | 'reports';

export function AdminPanel() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>('codes');

  if (!profile || profile.role !== 'admin') {
    return <EmptyState icon={<Shield size={40} />} title="Admin access required" subtitle="This area is restricted to administrators." />;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 animate-fade-in sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="flex items-center gap-2 font-display text-3xl font-bold text-slate-50">
          <Shield size={28} className="text-gold" /> Admin Panel
        </h1>
        <p className="mt-1 text-sm text-slate-400">Manage author access codes and moderate reported comments.</p>
      </header>

      <div className="mb-6 inline-flex rounded-xl border border-midnight-700 bg-midnight-900/60 p-1.5">
        {([
          { id: 'codes', label: 'Manage Codes', icon: <KeyRound size={16} /> },
          { id: 'reports', label: 'Reported Comments', icon: <Flag size={16} /> },
        ] as { id: Tab; label: string; icon: React.ReactNode }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${tab === t.id ? 'bg-gold-gradient text-midnight-950 shadow-gold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'codes' ? <CodesTab /> : <ReportsTab />}
    </div>
  );
}

/* -------------------- CODES TAB -------------------- */
function CodesTab() {
  const [codes, setCodes] = useState<RegistrationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [genBusy, setGenBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_list_codes');
    if (error) console.warn(error);
    setCodes((data as RegistrationCode[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    setGenBusy(true);
    const { data, error } = await supabase.rpc('admin_generate_codes', { p_count: 1 });
    setGenBusy(false);
    if (error) { alert(error.message); return; }
    if (data && data.length > 0) {
      setCopied((data as { code: string }[])[0].code);
      navigator.clipboard?.writeText((data as { code: string }[])[0].code).catch(() => {});
      setTimeout(() => setCopied(null), 2000);
    }
    load();
  };

  const copy = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  const available = codes.filter((c) => !c.used).length;
  const used = codes.filter((c) => c.used).length;

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-4">
          <Stat label="Available" value={available} color="cyan" />
          <Stat label="Used" value={used} color="gold" />
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-ghost px-3"><RefreshCw size={15} /></button>
          <button onClick={generate} disabled={genBusy} className="btn-primary">
            {genBusy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Generate Code
          </button>
        </div>
      </div>

      {loading ? <LoadingState /> : codes.length === 0 ? (
        <EmptyState icon={<KeyRound size={40} />} title="No codes yet" subtitle="Generate single-use author access codes." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-midnight-800 bg-midnight-950/40 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 hidden sm:table-cell">Created</th>
                <th className="px-4 py-3 hidden sm:table-cell">Used</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-midnight-800">
              {codes.map((c) => (
                <tr key={c.id} className="transition hover:bg-midnight-800/30">
                  <td className="px-4 py-3">
                    <span className="font-mono font-medium text-gold-light">{c.code}</span>
                    {copied === c.code && <span className="ml-2 text-xs text-cyan-glow">Copied!</span>}
                  </td>
                  <td className="px-4 py-3">
                    {c.used ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gold/20 px-2 py-0.5 text-xs font-medium text-gold-light">Used</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-cyan/20 px-2 py-0.5 text-xs font-medium text-cyan-glow">Available</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-slate-400 text-xs">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-slate-400 text-xs">{c.used_at ? new Date(c.used_at).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {!c.used && (
                      <button onClick={() => copy(c.code)} className="rounded-md p-1.5 text-slate-400 transition hover:text-cyan-glow" title="Copy">
                        <Copy size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: 'cyan' | 'gold' }) {
  const c = color === 'cyan' ? 'text-cyan-glow border-cyan/30 bg-cyan/10' : 'text-gold-light border-gold/30 bg-gold/10';
  return (
    <div className={`rounded-lg border px-4 py-2 ${c}`}>
      <span className="font-display text-xl font-bold">{value}</span>
      <span className="ml-2 text-xs uppercase tracking-wider opacity-80">{label}</span>
    </div>
  );
}

/* -------------------- REPORTS TAB -------------------- */
function ReportsTab() {
  const [items, setItems] = useState<ReportedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_list_reported_comments');
    if (error) console.warn(error);
    setItems((data as ReportedComment[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: string) => {
    setBusy(id);
    const { error } = await supabase.rpc('admin_approve_comment', { p_comment_id: id });
    setBusy(null);
    if (error) { alert(error.message); return; }
    load();
  };
  const remove = async (id: string) => {
    if (!confirm('Permanently delete this comment?')) return;
    setBusy(id);
    const { error } = await supabase.rpc('admin_delete_comment', { p_comment_id: id });
    setBusy(null);
    if (error) { alert(error.message); return; }
    load();
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-slate-400">{items.length} flagged comment{items.length === 1 ? '' : 's'}</p>
        <button onClick={load} className="btn-ghost px-3"><RefreshCw size={15} /></button>
      </div>

      {loading ? <LoadingState /> : items.length === 0 ? (
        <EmptyState icon={<Flag size={40} />} title="No reported comments" subtitle="The community is behaving well." />
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <div key={r.comment_id} className="card border-red-500/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-midnight-800 text-xs font-bold text-slate-300">
                    {(r.author_username || 'A').slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{r.author_username || 'Unknown'}</p>
                    <p className="text-xs text-slate-500">{new Date(r.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-medium text-red-300">
                  <Flag size={12} /> {r.report_count} report{r.report_count === 1 ? '' : 's'}
                </span>
              </div>

              <div className="mt-3 rounded-lg border border-midnight-700 bg-midnight-950/50 p-3">
                <p className="font-serif text-sm text-slate-300">{r.content}</p>
              </div>

              <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-2.5 text-xs text-red-300">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span><strong>Reason:</strong> {r.reasons || 'No reason given'}</span>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => approve(r.comment_id)} disabled={busy === r.comment_id} className="btn-ghost border-cyan/40 text-cyan-glow hover:bg-cyan/10">
                  {busy === r.comment_id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve
                </button>
                <button onClick={() => remove(r.comment_id)} disabled={busy === r.comment_id} className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/20">
                  {busy === r.comment_id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
