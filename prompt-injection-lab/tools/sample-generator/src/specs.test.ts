import { describe, expect, it } from 'vitest';
import type { PresetId } from '../../../src/types/corpus';
import {
  CANARY,
  CANONICAL_PAYLOAD,
  EXFIL_MARKDOWN,
} from './constants';
import { SAMPLES } from './specs';

const PRESETS: PresetId[] = [
  'unsafe',
  'naive',
  'spotlight',
  'sandwich',
  'clean',
  'recommended',
  'paranoid',
];

describe('sample specs', () => {
  it('contains 13 unique samples', () => {
    expect(SAMPLES).toHaveLength(13);
    expect(new Set(SAMPLES.map((sample) => sample.id)).size).toBe(13);
    expect(new Set(SAMPLES.map((sample) => sample.file)).size).toBe(13);
  });

  it('pairs every malicious sample with a benign twin', () => {
    const malicious = SAMPLES.filter((sample) => !sample.vector.includes('control'));
    expect(malicious.length).toBeGreaterThan(0);
    for (const sample of malicious) {
      expect(sample.benignTwin, sample.id).toBeTruthy();
      expect(sample.canary, sample.id).toBe(CANARY);
    }
  });

  it('keeps clean controls free of the canary', () => {
    const controls = SAMPLES.filter((sample) => sample.vector.includes('control'));
    expect(controls.map((sample) => sample.id)).toEqual([
      '01-clean-invoice',
      '12-clean-receipt',
      '13-clean-notes',
    ]);
    for (const sample of controls) {
      expect(sample.canary).toBeUndefined();
      expect(sample.benignTwin).toBeUndefined();
    }
  });

  it('defines an outcome for every preset', () => {
    for (const sample of SAMPLES) {
      for (const preset of PRESETS) {
        expect(sample.expectedByPreset[preset], `${sample.id}:${preset}`).toBeTruthy();
      }
      expect(Object.keys(sample.expectedByPreset).sort()).toEqual([...PRESETS].sort());
    }
  });

  it('uses only the reserved example.invalid host', () => {
    const urls = `${CANONICAL_PAYLOAD} ${EXFIL_MARKDOWN}`.match(/https?:\/\/[^\s)]+/g) ?? [];
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expect(new URL(url).hostname).toBe('example.invalid');
  });
});
