import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import { ThreatFinding } from '../types/gatekeeper.types.js';
import { scanTextForHeuristics } from './heuristic.service.js';

export interface ImageOcrResult {
  findings: ThreatFinding[];
  ocrText: string;
  sanitizedBuffer?: Buffer;
}

export async function inspectImageOcr(buffer: Buffer): Promise<ImageOcrResult> {
  const findings: ThreatFinding[] = [];
  let ocrText = '';
  try {
    const result = await Tesseract.recognize(buffer, 'eng+por');
    ocrText = result.data.text || '';
  } catch (e) {
    // ignore
  }
  if (ocrText) {
    findings.push(...scanTextForHeuristics(ocrText, 'L4_VISUAL_OCR_INSPECTION'));
  }
  try {
    const sanitized = await sharp(buffer).toBuffer();
    return { findings, ocrText, sanitizedBuffer: sanitized };
  } catch (e) {
    return { findings, ocrText };
  }
}