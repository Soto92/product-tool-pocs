import { createHash } from 'node:crypto';
import { fileTypeFromBuffer } from 'file-type';
import { DetectionLayer, ThreatFinding } from '../types/gatekeeper.types.js';

export interface MagicBytesResult {
  sha256: string;
  detectedMime: string | undefined;
  findings: ThreatFinding[];
}

export async function inspectMagicBytes(buffer: Buffer, declaredMime: string): Promise<MagicBytesResult> {
  const findings: ThreatFinding[] = [];

  // 1. SHA-256
  const sha256 = createHash('sha256').update(buffer).digest('hex');

  // 2. Detect actual MIME via magic bytes
  const fileType = await fileTypeFromBuffer(buffer);
  const detectedMime = fileType?.mime;

  // 3. Compare declared vs detected
  if (detectedMime && declaredMime && !detectedMime.includes(declaredMime.split('/')[1]) && !declaredMime.includes(detectedMime.split('/')[1])) {
    findings.push({
      id: `MIME-MISMATCH-${Date.now()}`,
      layer: 'L1_BINARY_INTEGRITY',
      severity: 'HIGH',
      ruleId: 'MIME_TYPE_MISMATCH',
      title: 'Declared MIME Type Does Not Match Magic Bytes',
      description: `Declared MIME: ${declaredMime}, Detected MIME: ${detectedMime}`,
      evidence: `${declaredMime} vs ${detectedMime}`
    });
  }

  // 4. Polyglot signatures in first/last 2048 bytes
  const sliceSize = Math.min(2048, buffer.length);
  const first = buffer.subarray(0, sliceSize).toString('latin1');
  const last = buffer.subarray(Math.max(0, buffer.length - sliceSize)).toString('latin1');

  const polyglotPatterns = [/<html/i, /<script/i, /\bMZ\b/, /PK\x03\x04/];
  for (const pattern of polyglotPatterns) {
    if (pattern.test(first) || pattern.test(last)) {
      findings.push({
        id: `POLYGLOT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        layer: 'L1_BINARY_INTEGRITY',
        severity: 'HIGH',
        ruleId: 'POLYGLOT_SIGNATURE_DETECTED',
        title: 'Potential Polyglot File Signature Detected',
        description: 'Suspicious embedded signature found in file headers/trailers',
        evidence: pattern.source
      });
      break;
    }
  }

  // 5. PDF header check
  if (declaredMime.includes('pdf') || detectedMime?.includes('pdf') || first.startsWith('%PDF')) {
    if (!first.startsWith('%PDF-')) {
      findings.push({
        id: `PDF-HEADER-${Date.now()}`,
        layer: 'L1_BINARY_INTEGRITY',
        severity: 'HIGH',
        ruleId: 'PDF_HEADER_INJECTION',
        title: 'PDF Header Not At Byte Offset 0',
        description: '%PDF- signature not found at beginning of file',
        evidence: first.slice(0, 20)
      });
    }
  }

  return { sha256, detectedMime, findings };
}