import { describe, expect, it } from "vitest";
import { exportVault, importVault, WrongExportPasswordError } from "./backup";
import { KDF_PARAMS } from "./vault-crypto";
import type { DecryptedItem } from "./items";

const FAST_KDF = { ...KDF_PARAMS, memorySize: 8192, iterations: 1 };

const items: DecryptedItem[] = [
  {
    id: "1",
    type: "login",
    folder: "Work",
    updatedAt: "2026-06-01T00:00:00Z",
    collectionId: null,
    content: { title: "GitHub", username: "me", password: "p@ss", url: "https://github.com", notes: "" },
  },
  {
    id: "2",
    type: "secret",
    folder: null,
    updatedAt: "2026-06-02T00:00:00Z",
    collectionId: null,
    content: { title: "API key", value: "sk-123", notes: "prod" },
  },
];

describe("encrypted backup", () => {
  it("round-trips items through export → import with the right password", async () => {
    const file = await exportVault(items, "backup-pw", FAST_KDF);
    const restored = await importVault(file, "backup-pw");

    expect(restored).toHaveLength(2);
    expect(restored[0]).toEqual({ type: "login", folder: "Work", content: items[0]!.content });
    expect(restored[1]!.content).toEqual(items[1]!.content);
  });

  it("never contains plaintext in the export file", async () => {
    const file = await exportVault(items, "backup-pw", FAST_KDF);
    expect(file).not.toContain("GitHub");
    expect(file).not.toContain("sk-123");
    expect(file).not.toContain("p@ss");
  });

  it("throws on a wrong export password", async () => {
    const file = await exportVault(items, "right-pw", FAST_KDF);
    await expect(importVault(file, "wrong-pw")).rejects.toBeInstanceOf(WrongExportPasswordError);
  });

  it("rejects a non-export file", async () => {
    await expect(importVault(JSON.stringify({ hello: "world" }), "x")).rejects.toThrow(
      /isn’t a Biz Key Vault export/,
    );
  });
});
