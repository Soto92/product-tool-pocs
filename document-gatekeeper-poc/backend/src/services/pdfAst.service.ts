import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { ThreatFinding } from '../types/gatekeeper.types.js';
import { scanTextForHeuristics } from './heuristic.service.js';

export interface PdfInspectionResult {
  findings: ThreatFinding[];
  rawText: string;
  visibleCleanText: string;
  hiddenSegments: string[];
}

export async function inspectPdfBuffer(buffer: Buffer): Promise<PdfInspectionResult> {
  const findings: ThreatFinding[] = [];
  const hiddenSegments: string[] = [];
  let rawText = '';
  let visibleCleanText = '';

  // 1. Raw Binary Structure Scan for Active Content
  const rawLatin1 = buffer.toString('latin1');
  const activeTagsRegex = /\/(JS|JavaScript|Launch|OpenAction|AA|RichMedia|EmbeddedFiles|URI)\b/g;
  const matchedTags = Array.from(new Set(rawLatin1.match(activeTagsRegex) || []));

  if (matchedTags.length > 0) {
    const isCritical = matchedTags.some(t => ['/JS', '/JavaScript', '/Launch'].includes(t));
    findings.push({
      id: `PDF-STRUCT-${Date.now()}`,
      layer: 'L3_PDF_AST_GEOMETRY',
      severity: isCritical ? 'CRITICAL' : 'MEDIUM',
      ruleId: 'PDF_ACTIVE_DICTIONARY',
      title: 'Suspicious PDF Action/Script Dictionary Detected',
      description: `PDF contains active structural tags that may execute actions or external calls: ${matchedTags.join(', ')}`,
      evidence: matchedTags.join(', ')
    });
  }

  // 2. Parse PDF Document via pdfjs-dist
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
    useSystemFonts: true
  });
  const pdfDoc = await loadingTask.promise;

  // 3. Inspect Page Geometry & Operator Lists
  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent({ includeMarkedContent: true });
    const opList = await page.getOperatorList();

    // Detect Invisible Text Rendering Mode (Tr = 3) or Near-White RGB fills in OperatorList
    let hasInvisibleRenderMode = false;
    let nearWhiteFillCount = 0;
    // pdfjs silently drops text outside the page from getTextContent(), so we also
    // collect out-of-bounds text matrices straight from the operator list.
    const offCanvasMatrices: Array<{ x: number; y: number }> = [];
    let pageHasOffCanvasItem = false;

    for (let i = 0; i < opList.fnArray.length; i++) {
      const fn = opList.fnArray[i];
      const args = opList.argsArray[i];

      // OPS.setTextMatrix === 20 — args are [a, b, c, d, e, f]
      if (fn === pdfjsLib.OPS.setTextMatrix && Array.isArray(args) && args.length === 6) {
        const tx = args[4] as number;
        const ty = args[5] as number;
        const isOut =
          tx < -15 ||
          ty < -15 ||
          tx > viewport.width + 15 ||
          ty > viewport.height + 15;
        if (isOut && !offCanvasMatrices.some((c) => c.x === tx && c.y === ty)) {
          offCanvasMatrices.push({ x: tx, y: ty });
        }
      }

      // OPS.setTextRenderingMode === 38 (mode 3 = invisible text)
      if (fn === pdfjsLib.OPS.setTextRenderingMode && args?.[0] === 3) {
        hasInvisibleRenderMode = true;
      }

      // OPS.setFillRGBColor === 59
      if (fn === pdfjsLib.OPS.setFillRGBColor && Array.isArray(args) && args.length === 3) {
        const [r, g, b] = args.map((v: number) => (v <= 1 ? v * 255 : v));
        if (r >= 248 && g >= 248 && b >= 248) {
          nearWhiteFillCount++;
        }
      }
    }

    if (hasInvisibleRenderMode) {
      findings.push({
        id: `PDF-TR3-P${pageNum}`,
        layer: 'L3_PDF_AST_GEOMETRY',
        severity: 'HIGH',
        ruleId: 'PDF_INVISIBLE_RENDER_MODE',
        title: 'PDF Text Rendering Mode 3 (Invisible Text) Used',
        description: `Page ${pageNum} explicitly instructs the PDF renderer to draw text with 0% visibility (Tr = 3) while keeping it in the text stream.`,
        pageNumber: pageNum
      });
    }

    // 4. Inspect Individual Text Items
    for (const item of textContent.items) {
      if (!('str' in item) || !item.str.trim()) continue;

      const text = item.str;
      rawText += text + ' ';

      const [scaleX, skewY, , scaleY, x, y] = item.transform as any;
      const calculatedFontSize = Math.hypot(scaleX, skewY);
      const effectiveHeight = Math.max(calculatedFontSize, Math.abs(scaleY), (item as any).height || 0);

      const isMicroFont = effectiveHeight < 1.5;
      const isOffCanvas =
        x < -15 ||
        y < -15 ||
        x > viewport.width + 15 ||
        y > viewport.height + 15;

      if (isMicroFont || isOffCanvas) {
        pageHasOffCanvasItem = pageHasOffCanvasItem || isOffCanvas;
        hiddenSegments.push(text);
        findings.push({
          id: `PDF-GEOM-P${pageNum}-${Math.random().toString(36).slice(2, 7)}`,
          layer: 'L3_PDF_AST_GEOMETRY',
          severity: 'HIGH',
          ruleId: isMicroFont ? 'PDF_MICRO_FONT_TEXT' : 'PDF_OFF_CANVAS_TEXT',
          title: isMicroFont
            ? `Microscopic / Zero-Size Font Detected (${effectiveHeight.toFixed(2)}pt)`
            : `Off-Canvas Hidden Text Detected (x:${Math.round(x)}, y:${Math.round(y)})`,
          description: `Hidden text segment discovered on page ${pageNum} that is invisible to human reviewers but readable by LLM extractors.`,
          evidence: text.slice(0, 160),
          pageNumber: pageNum
        });

        findings.push(...scanTextForHeuristics(text, 'L3_PDF_AST_GEOMETRY', pageNum, true));
      } else {
        const visibleHeuristics = scanTextForHeuristics(text, 'L5_HEURISTIC_SEMANTIC', pageNum, false);
        findings.push(...visibleHeuristics);

        if (visibleHeuristics.length === 0) {
          visibleCleanText += text + ' ';
        } else {
          hiddenSegments.push(text);
        }
      }
    }

    // Text matrices outside the page bounds are dropped by pdfjs' text extractor,
    // so report them straight from the operator list (covers off-canvas injections).
    if (!pageHasOffCanvasItem) {
      for (const m of offCanvasMatrices) {
        findings.push({
          id: `PDF-MATRIX-P${pageNum}-${Math.abs(Math.round(m.x))}-${Math.abs(Math.round(m.y))}`,
          layer: 'L3_PDF_AST_GEOMETRY',
          severity: 'HIGH',
          ruleId: 'PDF_OFF_CANVAS_TEXT',
          title: `Off-Canvas Text Matrix Detected (x:${Math.round(m.x)}, y:${Math.round(m.y)})`,
          description: `Page ${pageNum} positions text outside its MediaBox (${Math.round(viewport.width)}x${Math.round(viewport.height)}). pdfjs' text extractor silently drops these items, but extractors that read the raw content stream still capture them.`,
          evidence: `setTextMatrix [.., ${Math.round(m.x)}, ${Math.round(m.y)}] outside page bounds`,
          pageNumber: pageNum
        });
      }
    }

    if (nearWhiteFillCount > 0 && hiddenSegments.length === 0) {
      findings.push({
        id: `PDF-WHITE-P${pageNum}`,
        layer: 'L3_PDF_AST_GEOMETRY',
        severity: 'MEDIUM',
        ruleId: 'PDF_NEAR_WHITE_FILL_COLOR',
        title: 'Near-White Text Color Fill Operations Detected',
        description: `Page ${pageNum} contains ${nearWhiteFillCount} RGB fill operations near pure white (RGB >= 248), commonly used for white-on-white text injection.`,
        pageNumber: pageNum
      });
    }
  }

  return {
    findings,
    rawText: rawText.trim(),
    visibleCleanText: visibleCleanText.trim(),
    hiddenSegments
  };
}