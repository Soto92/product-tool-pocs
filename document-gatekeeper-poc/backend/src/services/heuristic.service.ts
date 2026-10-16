import { DetectionLayer, ThreatFinding, ThreatSeverity } from '../types/gatekeeper.types.js';

interface HeuristicRule {
  ruleId: string;
  title: string;
  severity: ThreatSeverity;
  regex: RegExp;
  description: string;
}

const HEURISTIC_RULES: HeuristicRule[] = [
  {
    ruleId: 'INJ_SYSTEM_OVERRIDE',
    title: 'System Instruction Override Attempt',
    severity: 'CRITICAL',
    regex: /\b(ignore|disregard|forget|override|bypass)\s+(all\s+)?(previous|prior|above|earlier|system|initial)\s+(instructions|prompts|rules|directions|constraints|guidelines)/i,
    description: 'Imperative command attempting to nullify the downstream LLM system prompt.'
  },
  {
    ruleId: 'INJ_PERSONA_HIJACK',
    title: 'Role / Persona Hijacking',
    severity: 'HIGH',
    regex: /\b(you\s+are\s+now|act\s+as|assume\s+the\s+role\s+of|new\s+system\s+prompt|from\s+now\s+on\s+you\s+must|enter\s+developer\s+mode|dan\s+mode)\b/i,
    description: 'Attempt to reassign the identity or operational mode of the AI assistant.'
  },
  {
    ruleId: 'INJ_DELIMITER_SMUGGLING',
    title: 'LLM Chat Template / Delimiter Smuggling',
    severity: 'CRITICAL',
    regex: /(<\|im_start\|>|<\|im_end\|>|<\|system\|>|<\|user\|>|<\|assistant\|>|\[INST\]|\[\/INST\]|<<SYS>>|<\/SYS>>|###\s*(System|Instruction|Human|Assistant)\s*:)/i,
    description: 'Special control tokens or chat template delimiters used to spoof a system boundary.'
  },
  {
    ruleId: 'FRAUD_DECISION_MANIPULATION',
    title: 'Automated Approval / Fraud Manipulation Directive',
    severity: 'CRITICAL',
    regex: /\b(approve\s+this\s+(document|invoice|contract|loan|claim|request)|mark\s+as\s+(valid|approved|verified|authentic)|risk\s+score\s+(is\s+)?zero|no\s+fraud\s+detected\s+override)\b/i,
    description: 'Direct instruction attempting to manipulate automated document verification or financial approval.'
  },
  {
    ruleId: 'EXFIL_MARKDOWN_IMAGE',
    title: 'Markdown Image Data Exfiltration Webhook',
    severity: 'HIGH',
    regex: /!\[[^\]]*\]\(https?:\/\/[^)\s]+(\?[^)\s]*)?\)/i,
    description: 'Markdown image injection designed to exfiltrate conversation context via external HTTP GET parameters when rendered.'
  },
  {
    ruleId: 'OBFUSCATED_BASE64_PAYLOAD',
    title: 'Suspicious Encoded Payload Block',
    severity: 'MEDIUM',
    regex: /\b(?:[A-Za-z0-9+/]{4}){12,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?\b/,
    description: 'Long Base64-encoded string detected inside document text, frequently used to bypass keyword filters.'
  }
];

export function scanTextForHeuristics(
  text: string,
  layer: DetectionLayer,
  pageNumber?: number,
  escalateSeverity = false
): ThreatFinding[] {
  const findings: ThreatFinding[] = [];

  // 1. Check for Invisible Unicode / ASCII Tag Smuggling
  const stegoRegex = /[\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF\u{E0000}-\u{E007F}]/gu;
  const stegoMatches = text.match(stegoRegex);
  if (stegoMatches && stegoMatches.length >= 3) {
    findings.push({
      id: `UNI-STEGO-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      layer,
      severity: 'CRITICAL',
      ruleId: 'UNICODE_ASCII_SMUGGLING',
      title: 'Invisible Unicode / Tag Character Smuggling',
      description: `Detected ${stegoMatches.length} invisible zero-width, BiDi override, or Unicode Tag characters designed to hide instructions from human view.`,
      evidence: stegoMatches
        .slice(0, 6)
        .map(c => `U+${c.codePointAt(0)?.toString(16).toUpperCase()}`)
        .join(', '),
      pageNumber
    });
  }

  // 2. Evaluate Regex Rules
  for (const rule of HEURISTIC_RULES) {
    const match = text.match(rule.regex);
    if (match) {
      findings.push({
        id: `${rule.ruleId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        layer,
        severity: escalateSeverity ? 'CRITICAL' : rule.severity,
        ruleId: rule.ruleId,
        title: rule.title,
        description: rule.description,
        evidence: match[0].slice(0, 150),
        pageNumber
      });
    }
  }

  return findings;
}