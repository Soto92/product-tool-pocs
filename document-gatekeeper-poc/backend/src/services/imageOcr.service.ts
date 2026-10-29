import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import { ThreatFinding } from '../types/gatekeeper.types.js';
import { scanTextForHeuristics } from './heuristic.service.js';

export interface ImageOcrResult {
  findings: ThreatFinding[];
  /** Everything a naive OCR/VLM pipeline would read (original + recovered low-contrast text). */
  ocrText: string;
  /** Text with every line that tripped a heuristic removed. */
  cleanText: string;
  /** Lines that were only readable after contrast normalisation (deliberately hidden). */
  hiddenSegments: string[];
  sanitizedBuffer?: Buffer;
}

function normalizeLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim().toLowerCase();
}

export async function inspectImageOcr(buffer: Buffer): Promise<ImageOcrResult> {
  const findings: ThreatFinding[] = [];

  // --- Pass 1: OCR on the image as-is -------------------------------------
  let baseText = '';
  try {
    const result = await Tesseract.recognize(buffer, 'eng+por');
    baseText = (result.data.text || '').trim();
  } catch {
    // OCR failures must not break the pipeline
  }

  if (baseText) {
    findings.push(...scanTextForHeuristics(baseText, 'L4_VISUAL_OCR_INSPECTION'));
  }

  // --- Pass 2: OCR on a contrast-normalised copy --------------------------
  // Attackers hide instructions in near-background colours (e.g. #f2f2f2 on
  // white): invisible to humans and often missed by plain OCR, but still read
  // by vision models. Normalising contrast recovers that text.
  let extraText = '';
  try {
    const enhanced = await sharp(buffer).grayscale().normalize().toBuffer();
    const result = await Tesseract.recognize(enhanced, 'eng+por');
    const enhancedText = (result.data.text || '').trim();

    const baseLines = new Set(baseText.split('\n').map(normalizeLine).filter(Boolean));
    const extraLines = enhancedText
      .split('\n')
      .filter((line) => line.trim() && !baseLines.has(normalizeLine(line)));

    extraText = extraLines.map((l) => l.trim()).join('\n');

    if (extraText) {
      const extraFindings = scanTextForHeuristics(extraText, 'L4_VISUAL_OCR_INSPECTION');

      if (extraFindings.length > 0) {
        findings.push({
          id: `IMG-LOWCONTRAST-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          layer: 'L4_VISUAL_OCR_INSPECTION',
          severity: 'HIGH',
          ruleId: 'IMG_LOW_CONTRAST_HIDDEN_TEXT',
          title: 'Low-Contrast Hidden Text Recovered By Enhanced OCR',
          description:
            'Text drawn in a near-invisible low-contrast colour was recovered only after contrast normalisation. This pattern hides instructions from human reviewers while keeping them readable by OCR/VLM pipelines.',
          evidence: extraText.slice(0, 200)
        });
      }

      findings.push(...extraFindings);
    }
  } catch {
    // enhancement/OCR failure is non-fatal
  }

  const hiddenSegments = extraText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  // --- Clean text: drop lines whose content tripped a heuristic -----------
  const evidence = findings
    .map((f) => (f.evidence || '').toLowerCase().trim())
    .filter((e) => e.length > 8);

  const cleanLines = baseText
    .split('\n')
    .map((l) => l.trim())
    .filter((line) => {
      if (!line) return false;
      const norm = line.toLowerCase();
      return !evidence.some((ev) => norm.includes(ev) || ev.includes(norm));
    });

  let sanitizedBuffer: Buffer | undefined;
  try {
    sanitizedBuffer = await sharp(buffer).toBuffer();
  } catch {
    // ignore
  }

  return {
    findings,
    ocrText: [baseText, extraText].filter(Boolean).join('\n').trim(),
    cleanText: cleanLines.join('\n').trim(),
    hiddenSegments,
    sanitizedBuffer
  };
}