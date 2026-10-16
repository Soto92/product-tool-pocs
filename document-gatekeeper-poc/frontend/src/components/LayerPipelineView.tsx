import { CheckCircle2, XCircle, AlertTriangle, CircleSlash } from 'lucide-react';
import type { LayerTelemetry, DetectionLayer } from '../types';

const ALL_LAYERS: DetectionLayer[] = [
  'L1_BINARY_INTEGRITY',
  'L2_METADATA_INSPECTION',
  'L3_PDF_AST_GEOMETRY',
  'L4_VISUAL_OCR_INSPECTION',
  'L5_HEURISTIC_SEMANTIC'
];

const LAYER_META: Record<DetectionLayer, { title: string; desc: string }> = {
  L1_BINARY_INTEGRITY: { title: 'Binary Integrity', desc: 'Magic bytes, SHA-256, polyglot scan' },
  L2_METADATA_INSPECTION: { title: 'Metadata Inspection', desc: 'EXIF, XMP, PDF Info dictionary' },
  L3_PDF_AST_GEOMETRY: { title: 'PDF AST & Geometry', desc: '0-pt fonts, white-on-white, /JS' },
  L4_VISUAL_OCR_INSPECTION: { title: 'Visual OCR Inspection', desc: 'Tesseract pixel-text extraction' },
  L5_HEURISTIC_SEMANTIC: { title: 'Heuristic & Semantic', desc: 'Regex, Unicode smuggling, entropy' }
};

function statusIcon(status: LayerTelemetry['status']) {
  switch (status) {
    case 'PASSED':
      return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    case 'WARNING':
      return <AlertTriangle className="h-4 w-4 text-amber-400" />;
    case 'FAILED':
      return <XCircle className="h-4 w-4 text-rose-500" />;
    case 'SKIPPED':
    default:
      return <CircleSlash className="h-4 w-4 text-slate-500" />;
  }
}

function statusBadge(status: LayerTelemetry['status']) {
  const base = 'rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide';
  switch (status) {
    case 'PASSED':
      return <span className={`${base} bg-emerald-500/15 text-emerald-400`}>PASSED</span>;
    case 'WARNING':
      return <span className={`${base} bg-amber-500/15 text-amber-400`}>WARNING</span>;
    case 'FAILED':
      return <span className={`${base} bg-rose-500/15 text-rose-400`}>FAILED</span>;
    case 'SKIPPED':
    default:
      return <span className={`${base} bg-slate-700/50 text-slate-400`}>SKIPPED</span>;
  }
}

interface Props {
  telemetry: LayerTelemetry[] | null;
}

export default function LayerPipelineView({ telemetry }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {ALL_LAYERS.map((layer, idx) => {
        const t = telemetry?.find(x => x.layer === layer);
        const status = t?.status ?? 'SKIPPED';
        const meta = LAYER_META[layer];
        return (
          <div
            key={layer}
            className="relative flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900 p-3"
          >
            <div className="relative flex flex-col items-center">
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-950 text-xs font-bold text-slate-400">
                {idx + 1}
              </div>
              {idx < ALL_LAYERS.length - 1 && (
                <div className="mt-1 h-full w-px bg-slate-800" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-200">{meta.title}</div>
                  <div className="truncate text-[11px] text-slate-500">{layer}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {telemetry && (
                    <span className="font-mono text-[10px] text-slate-500">{t?.durationMs ?? 0}ms</span>
                  )}
                  {statusIcon(status)}
                  {statusBadge(status)}
                </div>
              </div>
              <div className="mt-1 truncate text-xs text-slate-400">
                {t?.details ?? meta.desc}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}