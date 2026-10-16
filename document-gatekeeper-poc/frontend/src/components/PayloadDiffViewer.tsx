import { useState } from 'react';
import { Lock, Eye, ShieldCheck } from 'lucide-react';
import type { GatekeeperReport } from '../types';

interface Props {
  report: GatekeeperReport;
}

export default function PayloadDiffViewer({ report }: Props) {
  const [tab, setTab] = useState<'diff' | 'spotlight'>('diff');
  const { rawExtractedText, hiddenOrStrippedText, sanitizedSafeText, spotlightWrappedPrompt } =
    report.payloads;
  const blocked = report.verdict === 'BLOCK';

  // Split raw text so hidden segments are rendered as red badges inline
  function renderRawWithHighlights() {
    if (!hiddenOrStrippedText || hiddenOrStrippedText.length === 0) {
      return <span className="text-slate-300">{rawExtractedText || '(no text extracted)'}</span>;
    }
    const segments: React.ReactNode[] = [];
    let remaining = rawExtractedText;
    let key = 0;
    hiddenOrStrippedText.forEach((seg, i) => {
      const idx = remaining.indexOf(seg);
      if (idx === -1) return;
      segments.push(<span key={`t${key++}`} className="text-slate-300">{remaining.slice(0, idx)}</span>);
      segments.push(
        <span
          key={`h${key++}`}
          className="mx-0.5 inline-block rounded bg-rose-600 px-1.5 py-0.5 font-mono text-[11px] text-white ring-1 ring-rose-400"
          title="Hidden/stripped segment detected by Gatekeeper"
        >
          {seg.length > 120 ? seg.slice(0, 120) + '…' : seg}
        </span>
      );
      remaining = remaining.slice(idx + seg.length);
      void i;
    });
    segments.push(<span key={`t${key++}`} className="text-slate-300">{remaining}</span>);
    return segments;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 rounded-lg bg-slate-950 p-1">
        <button
          onClick={() => setTab('diff')}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            tab === 'diff' ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <Eye className="h-3.5 w-3.5" /> Naive vs. Gatekeeper
          </span>
        </button>
        <button
          onClick={() => setTab('spotlight')}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            tab === 'spotlight' ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Data-Marked Prompt
          </span>
        </button>
      </div>

      {tab === 'diff' ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-slate-800 bg-slate-900">
            <div className="flex items-center gap-2 border-b border-slate-800 px-3 py-2">
              <Eye className="h-3.5 w-3.5 text-rose-400" />
              <span className="text-xs font-semibold text-slate-300">
                What a Naive LLM Extractor Sees
              </span>
            </div>
            <div className="max-h-64 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-[11px] leading-relaxed">
              {renderRawWithHighlights()}
            </div>
            {hiddenOrStrippedText.length > 0 && (
              <div className="border-t border-slate-800 px-3 py-2">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-rose-400">
                  {hiddenOrStrippedText.length} hidden/stripped segment(s)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {hiddenOrStrippedText.map((h, i) => (
                    <span
                      key={i}
                      className="rounded bg-rose-600 px-1.5 py-0.5 font-mono text-[10px] text-white"
                    >
                      {h.length > 60 ? h.slice(0, 60) + '…' : h}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900">
            <div className="flex items-center gap-2 border-b border-slate-800 px-3 py-2">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-semibold text-slate-300">
                What the Gatekeeper Releases
              </span>
            </div>
            {blocked ? (
              <div className="flex flex-col items-center gap-2 bg-rose-950/40 p-6 text-center">
                <Lock className="h-8 w-8 text-rose-500" />
                <div className="text-sm font-bold text-rose-400">CONTENT BLOCKED</div>
                <div className="text-xs text-rose-300/70">
                  Risk score {report.riskScore}/100 — downstream LLM never sees this document.
                </div>
              </div>
            ) : (
              <div className="max-h-64 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-[11px] leading-relaxed text-emerald-200">
                {sanitizedSafeText || '(empty)'}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-800 bg-slate-900">
          <div className="flex items-center gap-2 border-b border-slate-800 px-3 py-2">
            <ShieldCheck className="h-3.5 w-3.5 text-sky-400" />
            <span className="text-xs font-semibold text-slate-300">
              Ready-to-send spotlight-wrapped prompt
            </span>
          </div>
          <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-[11px] leading-relaxed text-sky-200">
            {spotlightWrappedPrompt || '(empty — BLOCKED)'}
          </pre>
        </div>
      )}
    </div>
  );
}