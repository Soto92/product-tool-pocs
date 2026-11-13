import { describe, expect, it } from 'vitest';
import { sniffFile } from './sniff';

const encoder = new TextEncoder();

describe('sniffFile', () => {
  it('detects PDF by signature', () => {
    const result = sniffFile(encoder.encode('%PDF-1.7\n...'), 'invoice.pdf');
    expect(result.kind).toBe('pdf');
    expect(result.confidence).toBe('high');
  });

  it('detects PNG and JPEG by signature, not extension', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
    expect(sniffFile(png, 'receipt.txt').kind).toBe('image');
    expect(sniffFile(png, 'receipt.txt').mime).toBe('image/png');

    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
    expect(sniffFile(jpeg, 'receipt.pdf').mime).toBe('image/jpeg');
  });

  it('detects UTF-8 text without a declared type', () => {
    const result = sniffFile(encoder.encode('Meeting notes\nAction item'), 'notes.bin');
    expect(result.kind).toBe('text');
    expect(result.confidence).toBe('high');
  });

  it('uses the declared type as a low-confidence fallback', () => {
    const binary = new Uint8Array([0, 1, 2, 3, 4, 5]);
    expect(sniffFile(binary, 'unknown.bin', 'application/pdf')).toMatchObject({
      kind: 'pdf',
      confidence: 'low',
    });
  });

  it('treats NUL-containing unknown data as low-confidence text', () => {
    const result = sniffFile(new Uint8Array([0, 1, 2, 3]), 'unknown.bin');
    expect(result.kind).toBe('text');
    expect(result.confidence).toBe('low');
  });
});
