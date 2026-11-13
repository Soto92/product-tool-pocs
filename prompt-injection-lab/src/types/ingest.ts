export type FileKind = 'pdf' | 'image' | 'text';

export type SegmentOrigin = 'pdf-text' | 'metadata' | 'ocr' | 'text' | 'filename';

export type SegmentVisibility = 'visible' | 'hidden' | 'invisible-unicode';

export interface ExtractedSegment {
  id: string;
  kind: 'text' | 'metadata' | 'ocr';
  origin: SegmentOrigin;
  text: string;
  page?: number;
  visibility: SegmentVisibility;
  reasons: string[];
}

export interface DetectedFile {
  kind: FileKind;
  mime: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export interface DocumentRecord {
  id: string;
  filename: string;
  kind: FileKind;
  declaredMime: string;
  detectedMime: string;
  sizeBytes: number;
  sha256: string;
  pageCount?: number;
  segments: ExtractedSegment[];
  /** Detection lands in the next phase; always empty for now. */
  findings: [];
  truncated: boolean;
  extractedAt: string;
}
