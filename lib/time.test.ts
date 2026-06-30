import { describe, expect, it } from "vitest";
import { relativeTime } from "./time";

const NOW = new Date("2026-06-30T12:00:00Z").getTime();

describe("relativeTime", () => {
  it("formats past times", () => {
    expect(relativeTime("2026-06-27T12:00:00Z", NOW)).toBe("3 days ago");
    expect(relativeTime("2026-06-30T11:00:00Z", NOW)).toBe("1 hour ago");
  });

  it("handles 'now'-ish times", () => {
    expect(relativeTime("2026-06-30T12:00:00Z", NOW)).toMatch(/now|second/);
  });

  it("returns empty string for invalid input", () => {
    expect(relativeTime("not-a-date", NOW)).toBe("");
  });
});
