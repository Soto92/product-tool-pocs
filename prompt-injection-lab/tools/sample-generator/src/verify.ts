import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CorpusManifest, PresetId } from '../../../src/types/corpus';
import { CANARY } from './constants';

const PRESETS: PresetId[] = [
  'unsafe',
  'naive',
  'spotlight',
  'sandwich',
  'clean',
  'recommended',
  'paranoid',
];

const projectRoot = fileURLToPath(new URL('../../..', import.meta.url));
const outputDir = join(projectRoot, 'public', 'samples');
const manifestPath = join(outputDir, 'manifest.json');
const MAX_BYTES = 5 * 1024 * 1024;

export interface VerifyResult {
  errors: string[];
  warnings: string[];
}

function allowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'example.invalid';
  } catch {
    return false;
  }
}

export async function verifyCorpus(): Promise<VerifyResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as CorpusManifest;

  if (manifest.schemaVersion !== 1) errors.push(`schemaVersion is ${manifest.schemaVersion}, expected 1`);
  if (manifest.canary !== CANARY) errors.push(`manifest canary is ${manifest.canary}, expected ${CANARY}`);
  if (!manifest.payload.includes(CANARY)) errors.push('manifest payload does not contain the canary');
  if (manifest.samples.length !== 13) errors.push(`manifest has ${manifest.samples.length} samples, expected 13`);

  const seen = new Set<string>();
  for (const sample of manifest.samples) {
    if (seen.has(sample.id)) errors.push(`duplicate sample id: ${sample.id}`);
    seen.add(sample.id);

    const path = join(outputDir, sample.file);
    try {
      const bytes = await readFile(path);
      const info = await stat(path);
      if (info.size !== sample.sizeBytes) {
        errors.push(`${sample.file}: size ${info.size} != manifest ${sample.sizeBytes}`);
      }
      const hash = createHash('sha256').update(bytes).digest('hex');
      if (hash !== sample.sha256) errors.push(`${sample.file}: sha256 mismatch`);
      if (info.size > MAX_BYTES) errors.push(`${sample.file}: exceeds ${MAX_BYTES} bytes`);

      const raw = bytes.toString('latin1');
      for (const match of raw.matchAll(/https?:\/\/[^\s)"'<>\\]+/g)) {
        const url = match[0];
        if (!allowedUrl(url)) errors.push(`${sample.file}: external URL ${url}`);
      }
    } catch (error) {
      errors.push(`${sample.file}: ${(error as Error).message}`);
    }

    if (sample.benignTwin) {
      try {
        await stat(join(outputDir, sample.benignTwin));
      } catch {
        errors.push(`${sample.file}: missing benign twin ${sample.benignTwin}`);
      }
    } else if (!sample.vector.includes('control')) {
      errors.push(`${sample.file}: malicious sample has no benignTwin`);
    }

    if (!sample.expectedFindings.every((rule) => typeof rule === 'string' && rule.length > 0)) {
      errors.push(`${sample.file}: invalid expectedFindings`);
    }

    for (const preset of PRESETS) {
      if (!sample.expectedByPreset[preset]) {
        errors.push(`${sample.file}: missing expected outcome for preset ${preset}`);
      }
    }
    const extraPresets = Object.keys(sample.expectedByPreset).filter(
      (preset) => !PRESETS.includes(preset as PresetId),
    );
    if (extraPresets.length > 0) {
      errors.push(`${sample.file}: unknown presets ${extraPresets.join(', ')}`);
    }

    if (!sample.vector.includes('control') && !sample.canary) {
      errors.push(`${sample.file}: malicious sample has no canary`);
    }
  }

  for (const control of ['01-clean-invoice', '12-clean-receipt', '13-clean-notes']) {
    if (!seen.has(control)) errors.push(`missing clean control ${control}`);
  }

  if (warnings.length === 0) warnings.push('none');

  return { errors, warnings };
}

async function main(): Promise<void> {
  const result = await verifyCorpus();
  if (result.errors.length > 0) {
    for (const error of result.errors) console.error(`ERROR ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(`corpus verified: ${join(outputDir, 'manifest.json')}`);
  for (const warning of result.warnings) console.log(`WARN ${warning}`);
}

const isMain = Boolean(process.argv[1]) && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
