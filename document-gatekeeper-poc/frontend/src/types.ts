export type ThreatSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type DetectionLayer =
  | 'L1_BINARY_INTEGRITY'
  | 'L2_METADATA_INSPECTION'
  | 'L3_PDF_AST_GEOMETRY'
  | 'L4_VISUAL_OCR_INSPECTION'
  | 'L5_HEURISTIC_SEMANTIC';

export type GatekeeperVerdict = 'ALLOW' | 'SANITIZE' | 'BLOCK';

export interface ThreatFinding {
  id: string;
  layer: DetectionLayer;
  severity: ThreatSeverity;
  ruleId: string;
  title: string;
  description: string;
  evidence?: string;
  pageNumber?: number;
}

export interface LayerTelemetry {
  layer: DetectionLayer;
  status: 'PASSED' | 'WARNING' | 'FAILED' | 'SKIPPED';
  durationMs: number;
  details: string;
}

export interface GatekeeperReport {
  requestId: string;
  timestamp: string;
  fileInfo: {
    originalName: string;
    declaredMime: string;
    detectedMime: string;
    sizeBytes: number;
    sha256: string;
  };
  verdict: GatekeeperVerdict;
  riskScore: number;
  telemetry: LayerTelemetry[];
  findings: ThreatFinding[];
  payloads: {
    rawExtractedText: string;
    hiddenOrStrippedText: string[];
    sanitizedSafeText: string;
    spotlightWrappedPrompt: string;
  };
  downloadLink?: string;
}

export type SampleType =
  | 'clean-invoice'
  | 'ghost-text-pdf'
  | 'poisoned-metadata-pdf'
  | 'unicode-smuggling-txt';