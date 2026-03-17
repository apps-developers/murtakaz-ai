/** Blocklist of dangerous tokens that must never appear in AI-generated formulas */
const BLOCKED_TOKENS = [
  "eval",
  "fetch",
  "require",
  "import",
  "Function",
  "process",
  "document",
  "window",
  "globalThis",
  "setTimeout",
  "setInterval",
  "XMLHttpRequest",
  "WebSocket",
  "exec",
  "child_process",
  "__proto__",
  "constructor",
  "prototype",
];

/**
 * Validates that an AI-generated formula is safe to use.
 * Returns { safe: true } or { safe: false, reason: string }.
 */
export function validateFormula(formula: string): { safe: boolean; reason?: string } {
  if (!formula || typeof formula !== "string") {
    return { safe: false, reason: "Formula is empty or not a string." };
  }

  const lower = formula.toLowerCase();

  for (const token of BLOCKED_TOKENS) {
    if (lower.includes(token.toLowerCase())) {
      return { safe: false, reason: `Formula contains blocked token: "${token}"` };
    }
  }

  // Check for assignment operators (=, but not == or ===)
  if (/(?<![=!<>])=(?!=)/.test(formula)) {
    return { safe: false, reason: "Formula contains assignment operator." };
  }

  return { safe: true };
}
