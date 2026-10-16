import { ShieldAlert, FileWarning } from 'lucide-react';
import type { ThreatFinding, ThreatSeverity } from '../types';

const SEV_STYLE: Record<ThreatSeverity, { badge: string; border: string; dot: string }> = {
  LOW: { badge: 'bg-sky-500/15 text-sky-400', border: 'border-sky-500/30', dot: 'bg-sky-400' },
  MEDIUM: { badge: 'bg-amber-500/15 text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-400' },
  HIGH: { badge: 'bg-orange-500/15 text-orange-400', border: 'border-orange-500/30', dot: 'bg-orange-400' },
  CRITICAL: { badge: 'bg-rose-500/20 text-rose-400', border: 'border-rose-500/40', dot: 'bg-rose-500' }
};

const SEV_ORDER: Record<ThreatSeverity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3
};

interface Props {
  findings: ThreatFinding[];
}

export default function FindingsList({ findings }: Props) {
  if (findings.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-800 bg-slate-900/50 p-6 text-center">
        <ShieldAlert className="h-6 w-6 text-emerald-400" />
        <div className="text-sm font-medium text-slate-300">No threats detected</div>
        <div className="text-xs text-slate-500">All heuristic rules passed for this document.</div>
      </div>
    );
  }

  const sorted = [...findings].sort(
    (a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]
  );

  return (
    <div className="flex flex-col gap-2.5">
      {sorted.map(f => {
        const s = SEV_STYLE[f.severity];
        return (
          <div
            key={f.id}
            className={`rounded-lg border ${s.border} bg-slate-900 p-3`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${s.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                {f.severity}
              </span>
              <span className="font-mono text-[10px] text-slate-500">{f.ruleId}</span>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">{f.layer}</span>
              {f.pageNumber !== undefined && (
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                  Page {f.pageNumber}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-slate-200">
              <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
              <span>{f.title}</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{f.description}</p>
            {f.evidence && (
              <pre className="mt-2 overflow-x-auto rounded bg-rose-950/50 border border-rose-900/50 p-2 font-mono text-[11px] text-rose-300 whitespace-pre-wrap break-all">
                {f.evidence}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
}