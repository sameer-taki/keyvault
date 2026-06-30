/**
 * vault-crypto.ts — the zero-knowledge crypto core.
 *
 * THE source of truth for all encryption in this app. There must be exactly ONE
 * crypto path. Do not add a second one, and do not weaken these primitives
 * without a human review of the KDF params and key hierarchy (see CLAUDE.md).
 *
 * Key hierarchy
 * -------------
 *   master password  ──Argon2id(salt)──▶  master key (AES-GCM, non-extractable)
 *        (user input)                          │
 *                                              │ wraps / unwraps
 *                                              ▼
 *                                         vault key (AES-GCM, random, 256-bit)
 *                                              │
 *                                              │ encrypts / decrypts
 *                                              ▼
 *                                         vault items (login / note / card / secret)
 *
 * - The master password and master key never leave the browser and are never persisted.
 * - The vault key lives in React memory only; at rest it exists ONLY wrapped (encrypted)
 *   under the master key, stored in the `profiles.wrapped_vault_key` column.
 * - Every ciphertext is { iv, data } with a fresh random IV (AES-GCM, 96-bit IV, 128-bit tag).
 */

import { argon2id } from "hash-wasm";

/** A unit of ciphertext: base64url-free standard base64 of the IV and the AES-GCM output. */
export interface CipherBlob {
  /** base64-encoded 12-byte initialization vector */
  iv: string;
  /** base64-encoded ciphertext (includes the 16-byte GCM auth tag) */
  data: string;
}

/** Snapshot of the KDF configuration. Stored per-profile so params can evolve safely. */
export interface KdfParams {
  algorithm: "argon2id";
  /** memory cost in KiB */
  memorySize: number;
  /** time cost (passes) */
  iterations: number;
  parallelism: number;
  /** derived key length in bytes */
  hashLength: number;
}

/**
 * Argon2id parameters. 64 MiB / 3 passes / 1 lane meets and exceeds the OWASP
 * minimum (19 MiB, t=2) while staying tolerable on phones. Changing these is a
 * key-hierarchy change — escalate to a human (CLAUDE.md).
 */
export const KDF_PARAMS: KdfParams = {
  algorithm: "argon2id",
  memorySize: 65536, // 64 MiB
  iterations: 3,
  parallelism: 1,
  hashLength: 32, // 256-bit master key
};

const IV_BYTES = 12; // AES-GCM standard nonce length
const SALT_BYTES = 16;

/** Returns the platform Web Crypto implementation (browser or Node 18+ global). */
function getCrypto(): Crypto {
  const c = globalThis.crypto;
  if (!c || !c.subtle) {
    throw new Error("Web Crypto API is unavailable in this environment.");
  }
  return c;
}

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(length);
  getCrypto().getRandomValues(bytes);
  return bytes;
}

/**
 * Normalizes any Uint8Array to one guaranteed to be backed by a plain ArrayBuffer.
 * Web Crypto's `BufferSource` requires `ArrayBuffer` (not `ArrayBufferLike`) backing
 * under TypeScript 5.7+ typed-array generics; this defensive copy keeps the crypto
 * boundary type-safe regardless of where the bytes came from (hash-wasm, TextEncoder…).
 */
function abView(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(bytes.byteLength);
  out.set(bytes);
  return out;
}

// --- base64 helpers (work in both browser and Node, binary-safe) ------------

function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  const chunk = 0x8000; // avoid call-stack limits on large inputs
  for (let i = 0; i < view.length; i += chunk) {
    binary += String.fromCharCode(...view.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// --- salt -------------------------------------------------------------------

/** Generates a new random per-user salt, base64-encoded for storage. */
export function newSalt(): string {
  return toBase64(randomBytes(SALT_BYTES));
}

// --- master key (from the master password) ----------------------------------

/**
 * Derives the master key from the user's master password + salt via Argon2id.
 * Returned as a non-extractable AES-GCM CryptoKey used ONLY to wrap/unwrap the
 * vault key. The raw key material is never exposed to JS.
 */
export async function deriveMasterKey(
  masterPassword: string,
  salt: string,
  params: KdfParams = KDF_PARAMS,
): Promise<CryptoKey> {
  if (!masterPassword) {
    throw new Error("Master password is required.");
  }
  const raw = await argon2id({
    password: masterPassword,
    salt: fromBase64(salt),
    parallelism: params.parallelism,
    iterations: params.iterations,
    memorySize: params.memorySize,
    hashLength: params.hashLength,
    outputType: "binary",
  });
  return getCrypto().subtle.importKey("raw", abView(raw as Uint8Array), { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

// --- vault key --------------------------------------------------------------

/**
 * Generates a fresh random 256-bit vault key. Extractable so it can be exported
 * once for wrapping at sign-up. After unlock, use the non-extractable key
 * returned by `unwrapVaultKey` for day-to-day item encryption.
 */
export async function generateVaultKey(): Promise<CryptoKey> {
  return getCrypto().subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

/** Encrypts (wraps) the vault key under the master key. Store the result at rest. */
export async function wrapVaultKey(vaultKey: CryptoKey, masterKey: CryptoKey): Promise<CipherBlob> {
  const raw = await getCrypto().subtle.exportKey("raw", vaultKey);
  return encryptBytes(new Uint8Array(raw), masterKey);
}

/**
 * Decrypts (unwraps) the vault key with the master key. A thrown error means the
 * master password was wrong (GCM auth tag mismatch) — this is the unlock check.
 * The returned key is non-extractable: it can encrypt/decrypt items but cannot
 * be exported back out of the Web Crypto boundary.
 */
export async function unwrapVaultKey(wrapped: CipherBlob, masterKey: CryptoKey): Promise<CryptoKey> {
  const raw = await decryptBytes(wrapped, masterKey);
  return getCrypto().subtle.importKey("raw", abView(raw), { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

/**
 * Re-wraps the vault key under a NEW master key without changing the vault key
 * itself — used when the user changes their master password. The wrapped blob is
 * decrypted with the old master key (a throw means the current password was wrong)
 * and re-encrypted with the new master key. The raw vault-key material exists only
 * transiently as bytes here; it is never imported as an extractable key, persisted,
 * or transmitted. Because the vault key is unchanged, existing items stay decryptable
 * and nothing needs to be re-encrypted.
 *
 * This is key MANAGEMENT within the existing hierarchy (master pw -> master key ->
 * wraps vault key); it does NOT alter the key hierarchy or the KDF.
 */
export async function rewrapVaultKey(
  wrapped: CipherBlob,
  oldMasterKey: CryptoKey,
  newMasterKey: CryptoKey,
): Promise<CipherBlob> {
  const raw = await decryptBytes(wrapped, oldMasterKey);
  return encryptBytes(raw, newMasterKey);
}

// --- item encryption --------------------------------------------------------

/** Encrypts a UTF-8 string (e.g. JSON.stringify(item)) with the vault key. */
export async function encrypt(plaintext: string, key: CryptoKey): Promise<CipherBlob> {
  return encryptBytes(new TextEncoder().encode(plaintext), key);
}

/** Decrypts a CipherBlob back to its original UTF-8 string. Throws if tampered/wrong key. */
export async function decrypt(blob: CipherBlob, key: CryptoKey): Promise<string> {
  const bytes = await decryptBytes(blob, key);
  return new TextDecoder().decode(bytes);
}

// --- low-level AES-GCM (shared by wrap and item encryption) -----------------

async function encryptBytes(plaintext: Uint8Array, key: CryptoKey): Promise<CipherBlob> {
  const iv = randomBytes(IV_BYTES);
  const data = await getCrypto().subtle.encrypt({ name: "AES-GCM", iv }, key, abView(plaintext));
  return { iv: toBase64(iv), data: toBase64(data) };
}

async function decryptBytes(blob: CipherBlob, key: CryptoKey): Promise<Uint8Array> {
  const data = await getCrypto().subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(blob.iv) },
    key,
    fromBase64(blob.data),
  );
  return new Uint8Array(data);
}
