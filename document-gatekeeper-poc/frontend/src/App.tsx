import { useState, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Fingerprint,
  Layers,
  FileSearch,
  Download,
  Loader2,
  Zap
} from 'lucide-react';
import type { GatekeeperReport, SampleType } from './types';
import UploadZone from './components/UploadZone';
import LayerPipelineView from './components/LayerPipelineView';
import FindingsList from './components/FindingsList';
import PayloadDiffViewer from './components/PayloadDiffViewer';

const API = 'http://localhost:3001';

const SAMPLES: { type: SampleType; label: string; color: string }[] = [
  { type: 'clean-invoice', label: 'Clean Invoice PDF', color: 'emerald' },
  { type: 'ghost-text-pdf', label: '0.5pt Ghost Text PDF', color: 'rose' },
  { type: 'poisoned-metadata-pdf', label: 'EXIF/Metadata Poisoned PDF', color: 'amber' },
  { type: 'unicode-smuggling-txt', label: 'Unicode Smuggling Doc', color: 'violet' }
];

function verdictStyles(v: GatekeeperReport['verdict']) {
  switch (v) {
    case 'ALLOW':
      return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', ring: '#34d399' };
    case 'SANITIZE':
      return { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/40', ring: '#fbbf24' };
    case 'BLOCK':
    default:
      return { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/40', ring: '#fb7185' };
  }
}

function RiskGauge({ score, verdict }: { score: number; verdict: GatekeeperReport['verdict'] }) {
  const styles = verdictStyles(verdict);
  const r = 54;
  const c = Math.PI * r; // semicircle length (approx via arc path below)
  void c;
  const circumference = Math.PI * r; // half circle
  const dash = (score / 100) * circumference;
  return (
    <div className="relative flex flex-col items-center">
      <svg width="160" height="92" viewBox="0 0 160 92">
        <path
          d="M 20 80 A 60 60 0 0 1 140 80"
          fill="none"
          stroke="#1e293b"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 20 80 A 60 60 0 0 1 140 80"
          fill="none"
          stroke={styles.ring}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: 'stroke-dasharray 700ms ease' }}
        />
        <text x="80" y="74" textAnchor="middle" className={`fill-current ${styles.text}`} style={{ fontSize: 30, fontWeight: 800, fontFamily: 'ui-monospace, monospace' }}>
          {score}
        </text>
      </svg>
      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
        Risk Score (0–100)
      </div>
    </div>
  );
}

function FileForensics({ report }: { report: GatekeeperReport }) {
  const { fileInfo } = report;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
        <Fingerprint className="h-4 w-4" /> File Forensics
      </div>
      <div className="flex flex-col gap-2.5 text-xs">
        <div className="flex items-start justify-between gap-3">
          <span className="shrink-0 text-slate-500">Filename</span>
          <span className="truncate text-right font-medium text-slate-200">{fileInfo.originalName}</span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span className="shrink-0 text-slate-500">Size</span>
          <span className="text-right font-mono text-slate-300">
            {fileInfo.sizeBytes.toLocaleString()} bytes
          </span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span className="shrink-0 text-slate-500">Declared MIME</span>
          <span className="text-right font-mono text-slate-300">{fileInfo.declaredMime}</span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span className="shrink-0 text-slate-500">Detected MIME</span>
          <span
            className={`text-right font-mono ${
              fileInfo.detectedMime !== fileInfo.declaredMime ? 'text-rose-400' : 'text-slate-300'
            }`}
          >
            {fileInfo.detectedMime}
            {fileInfo.detectedMime !== fileInfo.declaredMime && ' ⚠'}
          </span>
        </div>
        <div className="border-t border-slate-800 pt-2.5">
          <div className="mb-1 text-slate-500">SHA-256</div>
          <code className="block break-all rounded bg-slate-950 p-2 font-mono text-[10px] leading-relaxed text-slate-400">
            {fileInfo.sha256}
          </code>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [report, setReport] = useState<GatekeeperReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeUpload = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API}/api/v1/analyze`, { method: 'POST', body: form });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const data: GatekeeperReport = await res.json();
      setReport(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to analyze file');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const simulate = useCallback(async (type: SampleType) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/v1/simulate/${type}`, { method: 'POST' });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const data: GatekeeperReport = await res.json();
      setReport(data);
    } catch (e: any) {
      setError(e?.message || 'Simulation failed');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const vs = report ? verdictStyles(report.verdict) : null;

  return (
    <div className="flex min-h-full flex-col bg-slate-950 text-slate-200">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-sky-600">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-100">
                AI Document Gatekeeper — Fraud &amp; Prompt Injection Firewall
              </h1>
              <p className="text-xs text-slate-500">
                Zero-trust 5-layer defense-in-depth inspection before any content reaches a downstream LLM
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
              <Zap className="h-3.5 w-3.5 text-amber-400" /> RED-TEAM SIMULATOR
            </span>
            {SAMPLES.map(s => (
              <button
                key={s.type}
                onClick={() => simulate(s.type)}
                disabled={loading}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:bg-slate-800 disabled:opacity-50"
              >
                {s.label}
              </button>
            ))}
            {report?.downloadLink && (
              <a
                href={report.downloadLink}
                download={report.fileInfo.originalName}
                className="flex items-center gap-1.5 rounded-lg border border-sky-600/60 bg-sky-500/10 px-3 py-1.5 text-[11px] font-semibold text-sky-300 transition-colors hover:bg-sky-500/20"
              >
                <Download className="h-3.5 w-3.5" /> Preview Sample
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Loading / error strip */}
      {loading && (
        <div className="flex items-center justify-center gap-2 border-b border-slate-800 bg-slate-900/40 py-2 text-xs text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin text-sky-400" /> Running 5-layer inspection pipeline…
        </div>
      )}
      {error && (
        <div className="border-b border-rose-900/60 bg-rose-950/40 px-6 py-2 text-xs text-rose-300">
          {error} — is the backend running on {API}?
        </div>
      )}

      {/* Main 3-column grid */}
      <main className="grid flex-1 grid-cols-1 gap-4 p-6 xl:grid-cols-[340px_1fr_440px]">
        {/* LEFT: Upload & forensics */}
        <section className="flex flex-col gap-4">
          <UploadZone onFile={analyzeUpload} loading={loading} />

          {report && vs && (
            <>
              <div className={`flex items-center justify-between rounded-xl border ${vs.border} ${vs.bg} p-4`}>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Gatekeeper Verdict
                  </div>
                  <div className={`mt-1 text-3xl font-black tracking-tight ${vs.text}`}>
                    {report.verdict}
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-slate-500">
                    req {report.requestId} · {new Date(report.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-current">
                  {report.verdict === 'ALLOW' && <ShieldCheck className={`h-6 w-6 ${vs.text}`} />}
                  {report.verdict === 'SANITIZE' && <ShieldAlert className={`h-6 w-6 ${vs.text}`} />}
                  {report.verdict === 'BLOCK' && <ShieldX className={`h-6 w-6 ${vs.text}`} />}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <RiskGauge score={report.riskScore} verdict={report.verdict} />
              </div>

              <FileForensics report={report} />
            </>
          )}

          {!report && !loading && (
            <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-6 text-center text-xs text-slate-500">
              Upload a document or click one of the Red-Team Simulator buttons to run a full
              5-layer inspection.
            </div>
          )}
        </section>

        {/* CENTER: Pipeline & findings */}
        <section className="flex flex-col gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Layers className="h-4 w-4" /> 5-Layer Defense Pipeline
            </div>
            <LayerPipelineView telemetry={report?.telemetry ?? null} />
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" /> Threat Findings
              </span>
              <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-400">
                {report?.findings.length ?? 0} finding(s)
              </span>
            </div>
            <div className="max-h-[480px] overflow-auto pr-1">
              <FindingsList findings={report?.findings ?? []} />
            </div>
          </div>
        </section>

        {/* RIGHT: Payload diff */}
        <section className="flex flex-col gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <FileSearch className="h-4 w-4" /> Payload Diff &amp; Spotlight Prompt
            </div>
            {report ? (
              <PayloadDiffViewer report={report} />
            ) : (
              <div className="rounded-lg border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">
                Analysis results will appear here.
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 px-6 py-3 text-center text-[11px] text-slate-600">
        Document Fraud &amp; Indirect Prompt Injection Gatekeeper PoC — inspect before you trust.
      </footer>
    </div>
  );
}