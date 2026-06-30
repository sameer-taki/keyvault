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

export interface GenOptions {
  length: number;
  lowercase: boolean;
  uppercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

const CLASSES = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?",
} as const;

/** Cryptographically secure index in [0, max) via rejection sampling (no modulo bias). */
function secureIndex(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  let x: number;
  do {
    crypto.getRandomValues(buf);
    x = buf[0]!;
  } while (x >= limit);
  return x % max;
}

/**
 * Generates a random password from the selected character classes using the
 * Web Crypto RNG. Guarantees at least one character from each selected class.
 */
export function generatePassword(opts: GenOptions): string {
  const selected = (Object.keys(CLASSES) as (keyof typeof CLASSES)[]).filter((k) => opts[k]);
  const pools = selected.length > 0 ? selected : (["lowercase"] as const);
  const length = Math.max(opts.length, pools.length);

  // One guaranteed character from each selected class…
  const chars: string[] = pools.map((p) => {
    const set = CLASSES[p];
    return set[secureIndex(set.length)]!;
  });

  // …then fill the rest from the combined pool.
  const all = pools.map((p) => CLASSES[p]).join("");
  while (chars.length < length) {
    chars.push(all[secureIndex(all.length)]!);
  }

  // Fisher–Yates shuffle so the guaranteed chars aren't always at the front.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = secureIndex(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join("");
}
