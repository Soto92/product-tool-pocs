import * as exifr from 'exifr';
import type { ExtractedSegment } from '../../types/ingest';

export interface ImageExtraction {
  segments: ExtractedSegment[];
  metadata: Record<string, unknown>;
}

function meaningfulString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) return value;
  if (value instanceof Uint8Array) {
    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(value).replace(/\0+$/g, '');
    return decoded.trim().length > 0 ? decoded.trim() : null;
  }
  return null;
}

export async function extractImage(bytes: Uint8Array): Promise<ImageExtraction> {
  const parsed = (await exifr
    .parse(bytes, {
      exif: true,
      xmp: true,
      iptc: true,
      icc: false,
      gps: false,
      reviveValues: false,
    })
    .catch(() => null)) as Record<string, unknown> | null;

  const segments: ExtractedSegment[] = [];
  for (const [key, value] of Object.entries(parsed ?? {})) {
    const text = meaningfulString(value);
    if (!text) continue;
    segments.push({
      id: `exif-${key}`,
      kind: 'metadata',
      origin: 'metadata',
      text,
      visibility: 'hidden',
      reasons: [key],
    });
  }

  return { segments, metadata: parsed ?? {} };
}
