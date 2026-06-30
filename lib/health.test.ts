import { describe, expect, it } from "vitest";
import { computeHealth } from "./health";
import type { DecryptedItem } from "./items";

function login(id: string, password: string, updatedAt: string): DecryptedItem {
  return {
    id,
    type: "login",
    folder: null,
    updatedAt,
    collectionId: null,
    content: { title: id, username: "", password, url: "", notes: "" },
  };
}

const NOW = new Date("2026-06-30T00:00:00Z").getTime();
const RECENT = "2026-06-01T00:00:00Z";

describe("computeHealth", () => {
  it("returns a perfect score for an empty or note-only vault", () => {
    const note: DecryptedItem = {
      id: "n",
      type: "note",
      folder: null,
      updatedAt: RECENT,
      collectionId: null,
      content: { title: "n", body: "x" },
    };
    expect(computeHealth([], NOW).score).toBe(100);
    expect(computeHealth([note], NOW).score).toBe(100);
  });

  it("flags weak passwords", () => {
    const report = computeHealth([login("a", "123", RECENT)], NOW);
    expect(report.weak).toHaveLength(1);
    expect(report.score).toBeLessThan(100);
  });

  it("flags reused passwords across items", () => {
    const report = computeHealth(
      [login("a", "Sh4red#Strong!pw99", RECENT), login("b", "Sh4red#Strong!pw99", RECENT)],
      NOW,
    );
    expect(report.reused.map((i) => i.itemId).sort()).toEqual(["a", "b"]);
  });

  it("flags old credentials by updatedAt age", () => {
    const report = computeHealth([login("a", "Str0ng!Unique#Pw42x", "2024-01-01T00:00:00Z")], NOW, 365);
    expect(report.old).toHaveLength(1);
    expect(report.old[0]!.detail).toMatch(/Unchanged for \d+ days/);
  });

  it("counts an item once in the score even with multiple issues", () => {
    // weak + reused + old all on the same two items
    const report = computeHealth(
      [login("a", "123", "2020-01-01T00:00:00Z"), login("b", "123", "2020-01-01T00:00:00Z")],
      NOW,
    );
    expect(report.score).toBe(0); // both items flagged, none clean
  });
});
