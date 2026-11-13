import { describe, expect, it } from 'vitest';
import {
  ALL_DEFENSE_FLAGS_ON,
  DEFENSE_FLAGS,
  DEFENSE_FLAG_IDS,
  EMPTY_DEFENSE_FLAGS,
  PRESETS,
  PRESET_FLAGS,
  derivePreset,
  enabledCount,
  getMasterState,
  groupCount,
  setMaster,
} from './catalog';

describe('defense catalog', () => {
  it('has stable unique flag IDs', () => {
    expect(new Set(DEFENSE_FLAG_IDS).size).toBe(DEFENSE_FLAG_IDS.length);
    expect(DEFENSE_FLAG_IDS).toHaveLength(15);
  });

  it('starts every defense off in the unsafe preset', () => {
    expect(PRESET_FLAGS.unsafe).toEqual(EMPTY_DEFENSE_FLAGS);
    expect(enabledCount(PRESET_FLAGS.unsafe)).toBe(0);
  });

  it('turns every defense on in paranoid', () => {
    expect(PRESET_FLAGS.paranoid).toEqual(ALL_DEFENSE_FLAGS_ON);
    expect(enabledCount(PRESET_FLAGS.paranoid)).toBe(DEFENSE_FLAG_IDS.length);
  });

  it('matches the documented preset matrix', () => {
    expect(enabledCount(PRESET_FLAGS.naive)).toBe(1);
    expect(PRESET_FLAGS.naive['prompt.instructionHierarchy']).toBe(true);

    expect(enabledCount(PRESET_FLAGS.spotlight)).toBe(1);
    expect(PRESET_FLAGS.spotlight['prompt.dataMarking']).toBe(true);

    expect(enabledCount(PRESET_FLAGS.sandwich)).toBe(2);
    expect(PRESET_FLAGS.sandwich['prompt.sandwich']).toBe(true);

    expect(enabledCount(PRESET_FLAGS.clean)).toBe(3);
    expect(PRESET_FLAGS.clean['input.unicode']).toBe(true);
    expect(PRESET_FLAGS.clean['input.metadata']).toBe(true);
    expect(PRESET_FLAGS.clean['input.hiddenLayers']).toBe(true);

    expect(PRESET_FLAGS.recommended['input.failClosed']).toBe(false);
    expect(PRESET_FLAGS.recommended['human.review']).toBe(false);
    expect(PRESET_FLAGS.recommended['output.blockCanary']).toBe(true);
    expect(PRESET_FLAGS.recommended['agency.readOnly']).toBe(true);
  });

  it('exposes exactly seven presets with unsafe first', () => {
    expect(PRESETS.map((preset) => preset.id)).toEqual([
      'unsafe',
      'naive',
      'spotlight',
      'sandwich',
      'clean',
      'recommended',
      'paranoid',
    ]);
    expect(PRESETS[0].dangerous).toBe(true);
  });

  it('derives a preset from exact flags and custom otherwise', () => {
    expect(derivePreset(PRESET_FLAGS.recommended)).toBe('recommended');
    const custom = { ...PRESET_FLAGS.recommended, 'human.review': true };
    expect(derivePreset(custom)).toBe('custom');
  });

  it('derives master states and toggles all children', () => {
    expect(getMasterState(EMPTY_DEFENSE_FLAGS, 'input.guardrails')).toBe('off');
    expect(getMasterState(ALL_DEFENSE_FLAGS_ON, 'input.guardrails')).toBe('on');

    const mixed = { ...EMPTY_DEFENSE_FLAGS, 'input.unicode': true };
    expect(getMasterState(mixed, 'input.guardrails')).toBe('mixed');

    const on = setMaster(mixed, 'input.guardrails', true);
    expect(on['input.unicode']).toBe(true);
    expect(on['input.metadata']).toBe(true);
    expect(on['input.hiddenLayers']).toBe(true);

    const off = setMaster(on, 'input.guardrails', false);
    expect(getMasterState(off, 'input.guardrails')).toBe('off');
  });

  it('counts defenses by group without counting demo options', () => {
    expect(groupCount(EMPTY_DEFENSE_FLAGS, 'input')).toEqual({ enabled: 0, total: 4 });
    expect(groupCount(ALL_DEFENSE_FLAGS_ON, 'output')).toEqual({ enabled: 4, total: 4 });
    expect(DEFENSE_FLAGS.map((flag) => flag.group)).not.toContain('demo');
  });
});
