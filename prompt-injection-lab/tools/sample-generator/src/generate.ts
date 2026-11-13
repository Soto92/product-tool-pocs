import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CorpusManifest, SampleManifestEntry, SampleSpec } from '../../../src/types/corpus';
import { CANARY, CANONICAL_PAYLOAD, GENERATED_AT } from './constants';
import { generateImage } from './image';
import { generatePdf, type PdfMode } from './pdf';
import { SAMPLES } from './specs';
import { generateText } from './text';

const projectRoot = fileURLToPath(new URL('../../..', import.meta.url));
const outputDir = join(projectRoot, 'public', 'samples');

const PDF_MODES: Record<string, PdfMode> = {
  '01-clean-invoice': 'clean',
  '02-white-on-white': 'white',
  '03-off-canvas': 'offcanvas',
  '04-poisoned-metadata': 'metadata',
  '05-unicode-smuggling': 'unicode',
  '06-invisible-render-mode': 'invisible',
  '09-delimiter-smuggling': 'delimiter',
  '10-encoded-payload': 'encoded',
  '11-active-content': 'active',
};

const TWIN_PDF_LAYOUT: Record<string, 'invoice' | 'note' | 'memo'> = {
  '02-white-on-white': 'invoice',
  '03-off-canvas': 'invoice',
  '04-poisoned-metadata': 'invoice',
  '05-unicode-smuggling': 'note',
  '06-invisible-render-mode': 'invoice',
  '09-delimiter-smuggling': 'memo',
  '10-encoded-payload': 'memo',
  '11-active-content': 'invoice',
};

async function sha256(path: string): Promise<string> {
  const bytes = await readFile(path);
  return createHash('sha256').update(bytes).digest('hex');
}

async function generateOne(spec: SampleSpec): Promise<void> {
  const target = join(outputDir, spec.file);

  if (spec.kind === 'text') {
    const mode =
      spec.id === '08-plain-text-injection'
        ? 'injection'
        : spec.id === '13-clean-notes'
          ? 'clean-notes'
          : 'clean-injection';
    await generateText(mode, target);
  } else if (spec.kind === 'image') {
    await generateImage(spec.id === '07-low-contrast-exif' ? 'low-contrast' : 'clean', target);
  } else {
    const mode = PDF_MODES[spec.id];
    if (!mode) throw new Error(`No PDF mode for ${spec.id}`);
    await generatePdf(mode, target);
  }

  if (!spec.benignTwin) return;

  const twinPath = join(outputDir, spec.benignTwin);
  if (spec.kind === 'text') {
    await generateText('clean-injection', twinPath);
  } else if (spec.kind === 'image') {
    await generateImage('clean', twinPath);
  } else {
    const layout = TWIN_PDF_LAYOUT[spec.id];
    if (!layout) throw new Error(`No benign twin layout for ${spec.id}`);
    await generatePdf('clean', twinPath, { layout });
  }
}

async function main(): Promise<void> {
  await mkdir(outputDir, { recursive: true });

  for (const spec of SAMPLES) {
    await generateOne(spec);
    process.stdout.write(`generated ${spec.file}${spec.benignTwin ? ` (+ ${spec.benignTwin})` : ''}\n`);
  }

  const samples: SampleManifestEntry[] = [];
  for (const spec of SAMPLES) {
    const path = join(outputDir, spec.file);
    const bytes = await readFile(path);
    samples.push({
      ...spec,
      sha256: await sha256(path),
      sizeBytes: bytes.byteLength,
    });
  }

  const manifest: CorpusManifest = {
    schemaVersion: 1,
    generatedAt: GENERATED_AT,
    payload: CANONICAL_PAYLOAD,
    canary: CANARY,
    samples,
  };

  await writeFile(join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  process.stdout.write(`wrote ${join(outputDir, 'manifest.json')}\n`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
