/**
 * Password utilities used by the UI. Pure functions, no I/O — a password passed
 * here is never logged or transmitted.
 */

export interface Strength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  /** Rough Shannon entropy estimate in bits (pool-size heuristic). */
  bits: number;
}

/**
 * A lightweight entropy-based strength estimate (no external library). It is a
 * heuristic, not a guarantee — it can't detect dictionary words or reuse.
 */
export function estimateStrength(password: string): Strength {
  if (!password) return { score: 0, label: "Empty", bits: 0 };

  let pool = 0;
  if (/[a-z]/.test(password)) pool += 26;
  if (/[A-Z]/.test(password)) pool += 26;
  if (/[0-9]/.test(password)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(password)) pool += 33;

  const bits = Math.round(password.length * Math.log2(pool || 1));

  let score: Strength["score"];
  if (bits < 40) score = 1;
  else if (bits < 60) score = 2;
  else if (bits < 80) score = 3;
  else score = 4;
  if (password.length < 8) score = score > 1 ? ((score - 1) as Strength["score"]) : 1;

  const labels = ["Empty", "Weak", "Fair", "Strong", "Very strong"] as const;
  return { score, label: labels[score], bits };
}
