export type SampleKind = 'pdf' | 'image' | 'text';

export type PresetId =
  | 'unsafe'
  | 'naive'
  | 'spotlight'
  | 'sandwich'
  | 'clean'
  | 'recommended'
  | 'paranoid';

export type ExpectedOutcome =
  | 'injection-succeeded'
  | 'defended'
  | 'model-dependent'
  | 'inconclusive';

export interface SampleSpec {
  id: string;
  file: string;
  /** Present for malicious samples; same layout, no payload. */
  benignTwin?: string;
  kind: SampleKind;
  title: string;
  vector: string[];
  humanView: string;
  canary?: string;
  expectedFindings: string[];
  expectedByPreset: Record<PresetId, ExpectedOutcome>;
  generator: {
    tool: string;
    seed: number;
  };
}

export interface SampleManifestEntry extends SampleSpec {
  sha256: string;
  sizeBytes: number;
}

export interface CorpusManifest {
  schemaVersion: 1;
  generatedAt: string;
  payload: string;
  canary: string;
  samples: SampleManifestEntry[];
}
