import type { DetectedFile, FileKind } from '../../types/ingest';

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const GIF87 = [0x47, 0x49, 0x46, 0x38, 0x37, 0x61];
const GIF89 = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((value, index) => bytes[index] === value);
}

function containsAscii(bytes: Uint8Array, text: string, limit = 2048): boolean {
  const needle = new TextEncoder().encode(text);
  const end = Math.min(bytes.length, limit) - needle.length;
  for (let i = 0; i <= end; i += 1) {
    let match = true;
    for (let j = 0; j < needle.length; j += 1) {
      if (bytes[i + j] !== needle[j]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}

function isWebp(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  return (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

function looksLikeText(bytes: Uint8Array): boolean {
  const sample = bytes.subarray(0, Math.min(bytes.length, 8192));
  if (sample.some((byte) => byte === 0)) return false;
  const decoded = new TextDecoder('utf-8', { fatal: false }).decode(sample);
  const replacement = (decoded.match(/\uFFFD/g) ?? []).length;
  return decoded.length === 0 || replacement / decoded.length < 0.01;
}

function mimeFor(kind: FileKind): string {
  if (kind === 'pdf') return 'application/pdf';
  if (kind === 'image') return 'image/*';
  return 'text/plain';
}

function fromDeclared(declaredMime: string | undefined, filename: string): DetectedFile | null {
  const lower = filename.toLowerCase();
  if (declaredMime === 'application/pdf' || lower.endsWith('.pdf')) {
    return { kind: 'pdf', mime: 'application/pdf', confidence: 'low', reason: 'declared type/extension' };
  }
  if (declaredMime?.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/.test(lower)) {
    return { kind: 'image', mime: declaredMime ?? 'image/*', confidence: 'low', reason: 'declared type/extension' };
  }
  if (declaredMime?.startsWith('text/') || /\.(txt|md|csv|json|log)$/.test(lower)) {
    return { kind: 'text', mime: declaredMime ?? 'text/plain', confidence: 'low', reason: 'declared type/extension' };
  }
  return null;
}

export function sniffFile(
  bytes: Uint8Array,
  filename = '',
  declaredMime?: string,
): DetectedFile {
  if (startsWith(bytes, PDF_SIGNATURE) || containsAscii(bytes, '%PDF-')) {
    return { kind: 'pdf', mime: 'application/pdf', confidence: 'high', reason: '%PDF- signature' };
  }
  if (startsWith(bytes, PNG_SIGNATURE)) {
    return { kind: 'image', mime: 'image/png', confidence: 'high', reason: 'PNG signature' };
  }
  if (startsWith(bytes, JPEG_SIGNATURE)) {
    return { kind: 'image', mime: 'image/jpeg', confidence: 'high', reason: 'JPEG signature' };
  }
  if (startsWith(bytes, GIF87) || startsWith(bytes, GIF89)) {
    return { kind: 'image', mime: 'image/gif', confidence: 'high', reason: 'GIF signature' };
  }
  if (isWebp(bytes)) {
    return { kind: 'image', mime: 'image/webp', confidence: 'high', reason: 'WebP signature' };
  }
  if (looksLikeText(bytes)) {
    return { kind: 'text', mime: 'text/plain', confidence: 'high', reason: 'valid text, no NUL bytes' };
  }

  const declared = fromDeclared(declaredMime, filename);
  if (declared) return declared;

  return {
    kind: 'text',
    mime: mimeFor('text'),
    confidence: 'low',
    reason: 'unknown binary; treated as text',
  };
}
