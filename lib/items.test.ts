import { describe, expect, it } from "vitest";
import { generateVaultKey } from "./vault-crypto";
import {
  decryptRow,
  displayTitle,
  emptyContent,
  encryptContent,
  searchHaystack,
  type DecryptedItem,
  type LoginContent,
} from "./items";
import type { VaultItemRow } from "./database.types";

const login: LoginContent = {
  title: "GitHub",
  username: "octocat",
  password: "s3cr3t!",
  url: "https://github.com",
  notes: "work account",
};

describe("item (de)serialization", () => {
  it("round-trips content through encrypt → decryptRow with the right type", async () => {
    const key = await generateVaultKey();
    const blob = await encryptContent(login, key);
    const row: VaultItemRow = {
      id: "abc",
      user_id: "user_1",
      type: "login",
      folder: "Work",
      blob,
      updated_at: "2026-06-01T00:00:00Z",
    };

    const item = await decryptRow(row, key);
    expect(item.type).toBe("login");
    expect(item.id).toBe("abc");
    expect(item.folder).toBe("Work");
    expect(item.content).toEqual(login);
  });

  it("never embeds plaintext in the stored blob", async () => {
    const key = await generateVaultKey();
    const blob = await encryptContent(login, key);
    const serialized = JSON.stringify(blob);
    expect(serialized).not.toContain("GitHub");
    expect(serialized).not.toContain("octocat");
    expect(serialized).not.toContain("s3cr3t!");
  });

  it("emptyContent returns the right shape per type", () => {
    expect(emptyContent("note")).toEqual({ title: "", body: "" });
    expect(Object.keys(emptyContent("card"))).toContain("cvv");
  });
});

describe("display + search helpers", () => {
  const item: DecryptedItem = {
    id: "1",
    type: "login",
    folder: "Personal",
    updatedAt: "2026-06-01T00:00:00Z",
    content: login,
  };

  it("displayTitle falls back when title is blank", () => {
    expect(displayTitle(item)).toBe("GitHub");
    const blank: DecryptedItem = { ...item, content: { ...login, title: "  " } };
    expect(displayTitle(blank)).toMatch(/untitled login/i);
  });

  it("searchHaystack includes searchable fields and folder, lowercased", () => {
    const hay = searchHaystack(item);
    expect(hay).toContain("github");
    expect(hay).toContain("octocat");
    expect(hay).toContain("personal");
    // passwords are intentionally not part of the search index
    expect(hay).not.toContain("s3cr3t");
  });
});
