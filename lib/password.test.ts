import { describe, expect, it } from "vitest";
import { estimateStrength, generatePassword, type GenOptions } from "./password";

const base: GenOptions = {
  length: 20,
  lowercase: true,
  uppercase: true,
  numbers: true,
  symbols: true,
};

describe("generatePassword", () => {
  it("respects the requested length", () => {
    expect(generatePassword({ ...base, length: 32 })).toHaveLength(32);
  });

  it("includes at least one char from each selected class", () => {
    for (let i = 0; i < 50; i++) {
      const pw = generatePassword(base);
      expect(pw).toMatch(/[a-z]/);
      expect(pw).toMatch(/[A-Z]/);
      expect(pw).toMatch(/[0-9]/);
      expect(pw).toMatch(/[^a-zA-Z0-9]/);
    }
  });

  it("only uses selected classes", () => {
    const pw = generatePassword({ length: 40, lowercase: true, uppercase: false, numbers: true, symbols: false });
    expect(pw).toMatch(/^[a-z0-9]+$/);
  });

  it("falls back to lowercase when nothing is selected", () => {
    const pw = generatePassword({ length: 16, lowercase: false, uppercase: false, numbers: false, symbols: false });
    expect(pw).toMatch(/^[a-z]+$/);
  });

  it("never returns shorter than the number of selected classes", () => {
    const pw = generatePassword({ ...base, length: 2 });
    expect(pw.length).toBeGreaterThanOrEqual(4);
  });

  it("produces different passwords across calls", () => {
    const set = new Set(Array.from({ length: 100 }, () => generatePassword(base)));
    expect(set.size).toBe(100);
  });
});

describe("estimateStrength", () => {
  it("rates a long mixed password higher than a short simple one", () => {
    const weak = estimateStrength("abc");
    const strong = estimateStrength("Tr0ub4dour&3xtr4Long!!");
    expect(strong.score).toBeGreaterThan(weak.score);
  });

  it("returns score 0 for empty input", () => {
    expect(estimateStrength("").score).toBe(0);
  });
});
