import type { DocumentRecord, ExtractedSegment } from '../../types/ingest';
import { extractImage } from './image';
import { extractPdf } from './pdf';
import { sha256Hex } from './sha256';
import { sniffFile } from './sniff';
import { decodeText } from './text';

export const MAX_BYTES = 10 * 1024 * 1024;

export interface IngestOptions {
  filename: string;
  declaredMime?: string;
  maxBytes?: number;
}

export async function ingestBytes(
  input: Uint8Array,
  options: IngestOptions,
): Promise<DocumentRecord> {
  const maxBytes = options.maxBytes ?? MAX_BYTES;
  if (input.byteLength === 0) {
    throw new Error('The file is empty.');
  }
  if (input.byteLength > maxBytes) {
    throw new Error(
      `The file is ${(input.byteLength / 1024 / 1024).toFixed(1)} MB; the limit is ${(
        maxBytes /
        1024 /
        1024
      ).toFixed(1)} MB.`,
    );
  }

  const sniffed = sniffFile(input, options.filename, options.declaredMime);
  const sha256 = await sha256Hex(input);
  const base = {
    id: crypto.randomUUID(),
    filename: options.filename,
    kind: sniffed.kind,
    declaredMime: options.declaredMime ?? '',
    detectedMime: sniffed.mime,
    sizeBytes: input.byteLength,
    sha256,
    findings: [] as [],
    truncated: false,
    extractedAt: new Date().toISOString(),
  };

  if (sniffed.kind === 'text') {
    const decoded = decodeText(input);
    const segments: ExtractedSegment[] =
      decoded.text.length > 0
        ? [
            {
              id: 'text-1',
              kind: 'text',
              origin: 'text',
              text: decoded.text,
              visibility: 'visible',
              reasons: decoded.encoding === 'windows-1252' ? ['windows-1252 fallback'] : [],
            },
          ]
        : [];
    return { ...base, segments };
  }

  if (sniffed.kind === 'pdf') {
    const pdf = await extractPdf(input);
    return {
      ...base,
      pageCount: pdf.pageCount,
      segments: pdf.segments,
    };
  }

  const image = await extractImage(input);
  return { ...base, segments: image.segments };
}

export async function ingestFile(file: File): Promise<DocumentRecord> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return ingestBytes(bytes, {
    filename: file.name,
    declaredMime: file.type,
  });
}

export { sniffFile } from './sniff';
export { decodeText } from './text';
export { sha256Hex } from './sha256';
