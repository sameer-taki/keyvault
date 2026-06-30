import { describe, expect, it } from "vitest";
import {
  decrypt,
  deriveMasterKey,
  encrypt,
  generateVaultKey,
  KDF_PARAMS,
  newSalt,
  unwrapVaultKey,
  wrapVaultKey,
  type CipherBlob,
} from "./vault-crypto";

// Use cheaper KDF params in tests so the suite stays fast. The wrong-password
// behaviour we assert is independent of the cost parameters.
const FAST_KDF = { ...KDF_PARAMS, memorySize: 8192, iterations: 1 };

async function setupVault(masterPassword: string) {
  const salt = newSalt();
  const masterKey = await deriveMasterKey(masterPassword, salt, FAST_KDF);
  const vaultKey = await generateVaultKey();
  const wrapped = await wrapVaultKey(vaultKey, masterKey);
  return { salt, masterKey, vaultKey, wrapped };
}

describe("item encryption", () => {
  it("round-trips plaintext through encrypt → decrypt", async () => {
    const vaultKey = await generateVaultKey();
    const plaintext = JSON.stringify({ title: "GitHub", password: "hunter2 🐙", note: "líne\nbreak" });

    const blob = await encrypt(plaintext, vaultKey);
    const back = await decrypt(blob, vaultKey);

    expect(back).toBe(plaintext);
  });

  it("produces a different IV (and ciphertext) on every call", async () => {
    const vaultKey = await generateVaultKey();
    const a = await encrypt("same plaintext", vaultKey);
    const b = await encrypt("same plaintext", vaultKey);

    expect(a.iv).not.toBe(b.iv);
    expect(a.data).not.toBe(b.data);
  });

  it("fails to decrypt with a different vault key", async () => {
    const k1 = await generateVaultKey();
    const k2 = await generateVaultKey();
    const blob = await encrypt("secret", k1);

    await expect(decrypt(blob, k2)).rejects.toThrow();
  });

  it("fails to decrypt tampered ciphertext (GCM auth)", async () => {
    const vaultKey = await generateVaultKey();
    const blob = await encrypt("secret", vaultKey);
    const tampered: CipherBlob = { iv: blob.iv, data: flipFirstByte(blob.data) };

    await expect(decrypt(tampered, vaultKey)).rejects.toThrow();
  });
});

describe("vault key wrapping", () => {
  it("unwraps with the correct master password and the key decrypts items", async () => {
    const password = "correct horse battery staple";
    const { salt, vaultKey, wrapped } = await setupVault(password);

    const blob = await encrypt("top secret", vaultKey);

    // Simulate a fresh session: re-derive the master key from the password + salt.
    const reMasterKey = await deriveMasterKey(password, salt, FAST_KDF);
    const reVaultKey = await unwrapVaultKey(wrapped, reMasterKey);

    expect(await decrypt(blob, reVaultKey)).toBe("top secret");
  });

  it("throws when the master password is wrong", async () => {
    const { salt, wrapped } = await setupVault("the right password");

    const wrongMasterKey = await deriveMasterKey("the WRONG password", salt, FAST_KDF);

    await expect(unwrapVaultKey(wrapped, wrongMasterKey)).rejects.toThrow();
  });

  it("the unwrapped vault key is non-extractable", async () => {
    const password = "pw";
    const { salt, wrapped } = await setupVault(password);
    const masterKey = await deriveMasterKey(password, salt, FAST_KDF);

    const vaultKey = await unwrapVaultKey(wrapped, masterKey);

    expect(vaultKey.extractable).toBe(false);
  });
});

describe("salt", () => {
  it("generates unique salts", () => {
    const salts = new Set(Array.from({ length: 100 }, () => newSalt()));
    expect(salts.size).toBe(100);
  });
});

function flipFirstByte(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  bytes[0] = bytes[0]! ^ 0xff;
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]!);
  return btoa(out);
}
