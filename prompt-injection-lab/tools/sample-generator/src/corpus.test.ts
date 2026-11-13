import { describe, expect, it } from 'vitest';
import { verifyCorpus } from './verify';

describe('generated corpus', () => {
  it('matches the manifest and safety rules', async () => {
    const result = await verifyCorpus();
    expect(result.errors).toEqual([]);
  }, 20_000);
});
