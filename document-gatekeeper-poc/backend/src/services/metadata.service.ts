import ExifReader from 'exifreader';
import sharp from 'sharp';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { DetectionLayer, ThreatFinding } from '../types/gatekeeper.types.js';
import { scanTextForHeuristics } from './heuristic.service.js';

export interface MetadataResult {
  findings: ThreatFinding[];
  sanitizedBuffer?: Buffer;
}

export async function inspectImageMetadata(buffer: Buffer): Promise<MetadataResult> {
  const findings: ThreatFinding[] = [];
  try {
    const tags = ExifReader.load(buffer);
    const metaStrings: string[] = [];
    for (const key of Object.keys(tags)) {
      const tag = tags[key] as any;
      if (tag && typeof tag.value === 'string') {
        metaStrings.push(tag.value);
      } else if (tag && Array.isArray(tag.value)) {
        for (const v of tag.value) {
          if (typeof v === 'string') metaStrings.push(v);
        }
      } else if (tag && tag.value) {
        try {
          metaStrings.push(JSON.stringify(tag.value));
        } catch (e) {
          // ignore
        }
      }
    }
    for (const s of metaStrings) {
      findings.push(...scanTextForHeuristics(s, 'L2_METADATA_INSPECTION'));
    }
  } catch (e) {
    // ignore parsing errors
  }

  // strip metadata
  try {
    const sanitized = await sharp(buffer).rotate().toBuffer({ resolveWithObject: false });
    return { findings, sanitizedBuffer: sanitized };
  } catch (e) {
    return { findings };
  }
}

export async function inspectPdfMetadata(buffer: Buffer): Promise<MetadataResult> {
  const findings: ThreatFinding[] = [];
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      isEvalSupported: false,
      useSystemFonts: true
    });
    const pdfDoc = await loadingTask.promise;
    const meta = await pdfDoc.getMetadata();
    const info = meta.info as any;
    if (info) {
      for (const key of Object.keys(info)) {
        const val = info[key];
        if (typeof val === 'string') {
          findings.push(...scanTextForHeuristics(val, 'L2_METADATA_INSPECTION'));
        }
      }
    }
    // also raw metadata
    const metadataStr = meta.metadata as any;
    if (metadataStr && typeof metadataStr === 'string') {
      findings.push(...scanTextForHeuristics(metadataStr, 'L2_METADATA_INSPECTION'));
    } else if (meta.metadata) {
      try {
        findings.push(...scanTextForHeuristics(JSON.stringify(meta.metadata), 'L2_METADATA_INSPECTION'));
      } catch (e) {
        // ignore
      }
    }
  } catch (e) {
    // ignore
  }
  return { findings };
}