import { describe, expect, it } from 'vitest';
import { decodeText } from './text';

describe('decodeText', () => {
  it('decodes UTF-8 and strips a BOM', () => {
    const bytes = new TextEncoder().encode('\uFEFFInvoice 1042 — carbonara');
    const result = decodeText(bytes);
    expect(result.encoding).toBe('utf-8');
    expect(result.text).toBe('Invoice 1042 — carbonara');
    expect(result.replacementRatio).toBe(0);
  });

  it('falls back to windows-1252 for invalid UTF-8', () => {
    const bytes = new Uint8Array([0x43, 0x61, 0x66, 0xe9]); // "Café" in windows-1252
    const result = decodeText(bytes);
    expect(result.encoding).toBe('windows-1252');
    expect(result.text).toBe('Café');
  });

  it('handles empty input', () => {
    expect(decodeText(new Uint8Array())).toEqual({
      text: '',
      encoding: 'utf-8',
      replacementRatio: 0,
    });
  });
});
