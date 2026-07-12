import { Loader2 } from 'lucide-react';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
      <Loader2 size={32} className="animate-spin text-cyan" />
      <p className="mt-3 text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({ icon, title, subtitle, action }: { icon?: React.ReactNode; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-midnight-700 bg-midnight-900/40 py-16 text-center">
      {icon && <div className="mb-3 text-midnight-600">{icon}</div>}
      <h3 className="font-serif text-xl text-slate-200">{title}</h3>
      {subtitle && <p className="mt-1.5 max-w-sm text-sm text-slate-400">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
