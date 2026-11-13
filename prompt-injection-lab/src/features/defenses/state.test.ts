import { describe, expect, it } from 'vitest';
import { DEFENSE_FLAG_IDS } from './catalog';
import {
  DEFAULT_STATE,
  applyPreset,
  defenseSummary,
  groupSummary,
  toggleFlag,
  toggleMaster,
} from './state';

describe('lab state', () => {
  it('starts in the damage state: unsafe, malicious sample, no defenses', () => {
    expect(DEFAULT_STATE.preset).toBe('unsafe');
    expect(DEFAULT_STATE.demo.variant).toBe('malicious');
    expect(DEFAULT_STATE.demo.multiTurn).toBe(true);
    expect(DEFAULT_STATE.demo.ocr).toBe(true);
    expect(defenseSummary(DEFAULT_STATE)).toEqual({
      enabled: 0,
      total: DEFENSE_FLAG_IDS.length,
      dangerous: true,
    });
  });

  it('applies recommended without touching demo setup', () => {
    const next = applyPreset(DEFAULT_STATE, 'recommended');
    expect(next.preset).toBe('recommended');
    expect(next.demo).toEqual(DEFAULT_STATE.demo);
    expect(defenseSummary(next).enabled).toBeGreaterThan(0);
  });

  it('marks a manual divergence as custom', () => {
    const next = toggleFlag(DEFAULT_STATE, 'prompt.sandwich');
    expect(next.flags['prompt.sandwich']).toBe(true);
    expect(next.preset).toBe('custom');
    expect(groupSummary(next, 'prompt')).toEqual({ enabled: 1, total: 4 });
  });

  it('toggles a master group and derives the preset', () => {
    const next = toggleMaster(DEFAULT_STATE, 'input.guardrails');
    expect(next.flags['input.unicode']).toBe(true);
    expect(next.flags['input.metadata']).toBe(true);
    expect(next.flags['input.hiddenLayers']).toBe(true);
    expect(next.preset).toBe('clean');

    const off = toggleMaster(next, 'input.guardrails');
    expect(off.flags['input.unicode']).toBe(false);
    expect(off.preset).toBe('unsafe');
  });
});
