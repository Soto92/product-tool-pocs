export interface DecodedText {
  text: string;
  encoding: 'utf-8' | 'windows-1252';
  replacementRatio: number;
}

function replacementRatio(text: string): number {
  if (text.length === 0) return 0;
  return (text.match(/\uFFFD/g) ?? []).length / text.length;
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export function decodeText(bytes: Uint8Array): DecodedText {
  const utf8 = stripBom(new TextDecoder('utf-8', { fatal: false }).decode(bytes));
  const utf8Ratio = replacementRatio(utf8);
  if (utf8Ratio <= 0.01) {
    return { text: utf8, encoding: 'utf-8', replacementRatio: utf8Ratio };
  }

  try {
    const fallback = stripBom(new TextDecoder('windows-1252').decode(bytes));
    const fallbackRatio = replacementRatio(fallback);
    if (fallbackRatio < utf8Ratio) {
      return { text: fallback, encoding: 'windows-1252', replacementRatio: fallbackRatio };
    }
  } catch {
    // TextDecoder may not support windows-1252 in every runtime; keep UTF-8.
  }

  return { text: utf8, encoding: 'utf-8', replacementRatio: utf8Ratio };
}
