import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { ExtractedSegment } from '../../types/ingest';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export interface PdfExtraction {
  segments: ExtractedSegment[];
  pageCount: number;
  metadata: Record<string, unknown>;
}

function meaningfulString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) return value;
  return null;
}

export async function extractPdf(bytes: Uint8Array): Promise<PdfExtraction> {
  const task = pdfjs.getDocument({
    data: bytes,
    useSystemFonts: true,
  });
  const doc = await task.promise;
  const segments: ExtractedSegment[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      let text = '';
      for (const item of content.items) {
        if (!('str' in item)) continue;
        text += item.str;
        if (item.hasEOL) text += '\n';
        else text += ' ';
      }
      const normalized = text.replace(/[ \t]+\n/g, '\n').replace(/\s+/g, ' ').trim();
      if (normalized.length > 0) {
        segments.push({
          id: `p${pageNumber}-text`,
          kind: 'text',
          origin: 'pdf-text',
          page: pageNumber,
          text: normalized,
          visibility: 'visible',
          reasons: [],
        });
      }
      page.cleanup();
    }

    const meta = await doc.getMetadata().catch(() => null);
    const info = (meta?.info ?? {}) as Record<string, unknown>;
    for (const [key, value] of Object.entries(info)) {
      const text = meaningfulString(value);
      if (!text) continue;
      segments.push({
        id: `metadata-${key}`,
        kind: 'metadata',
        origin: 'metadata',
        text,
        visibility: 'hidden',
        reasons: [key],
      });
    }

    const xmpEntries = meta?.metadata
      ? Array.from(meta.metadata as Iterable<[string, unknown]>)
      : [];
    for (const [key, value] of xmpEntries) {
      const text = meaningfulString(value);
      if (!text) continue;
      segments.push({
        id: `xmp-${key}`,
        kind: 'metadata',
        origin: 'metadata',
        text,
        visibility: 'hidden',
        reasons: [`XMP:${key}`],
      });
    }

    return { segments, pageCount: doc.numPages, metadata: info };
  } finally {
    await task.destroy();
  }
}
