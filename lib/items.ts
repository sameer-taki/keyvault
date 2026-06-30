/**
 * Vault item content models and the (de)serialization that bridges plaintext
 * content <-> encrypted blobs. The only fields that ever leave the browser in
 * plaintext are `type` and `folder` (non-secret metadata); everything else is
 * inside the AES-GCM blob.
 */
import { decrypt, encrypt, type CipherBlob } from "./vault-crypto";
import type { VaultItemRow, VaultItemType } from "./database.types";

export interface LoginContent {
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
}
export interface NoteContent {
  title: string;
  body: string;
}
export interface CardContent {
  title: string;
  cardholder: string;
  number: string;
  expiry: string;
  cvv: string;
  notes: string;
}
export interface SecretContent {
  title: string;
  value: string;
  notes: string;
}

export type ItemContent = LoginContent | NoteContent | CardContent | SecretContent;

interface Base {
  id: string;
  folder: string | null;
  updatedAt: string;
  /** Set when the item belongs to a shared collection (Phase 6); null = personal. */
  collectionId: string | null;
}

/** A fully decrypted item, discriminated by `type`. */
export type DecryptedItem =
  | (Base & { type: "login"; content: LoginContent })
  | (Base & { type: "note"; content: NoteContent })
  | (Base & { type: "card"; content: CardContent })
  | (Base & { type: "secret"; content: SecretContent });

/** An item being created or edited in the UI (no id => new). */
export interface ItemDraft {
  id?: string;
  type: VaultItemType;
  folder: string | null;
  content: ItemContent;
  /** ISO timestamp for existing items; absent for new drafts. */
  updatedAt?: string;
  /** Target scope: a collection id to share, or null/undefined for personal. */
  collectionId?: string | null;
}

export const ITEM_TYPE_LABELS: Record<VaultItemType, string> = {
  login: "Login",
  note: "Secure note",
  card: "Card",
  secret: "Secret",
};

/** A blank content object for a new item of the given type. */
export function emptyContent(type: VaultItemType): ItemContent {
  switch (type) {
    case "login":
      return { title: "", username: "", password: "", url: "", notes: "" };
    case "note":
      return { title: "", body: "" };
    case "card":
      return { title: "", cardholder: "", number: "", expiry: "", cvv: "", notes: "" };
    case "secret":
      return { title: "", value: "", notes: "" };
  }
}

/** Groups card-number digits into blocks of 4 for display ("4242 4242 …"). */
export function groupCardDigits(digits: string): string {
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

/** Best-effort display title for list/search; falls back to the type label. */
export function displayTitle(item: DecryptedItem): string {
  return item.content.title.trim() || `Untitled ${ITEM_TYPE_LABELS[item.type].toLowerCase()}`;
}

/** Encrypts item content to a storable blob. */
export async function encryptContent(
  content: ItemContent,
  vaultKey: CryptoKey,
): Promise<CipherBlob> {
  return encrypt(JSON.stringify(content), vaultKey);
}

/** Decrypts a stored row into a typed DecryptedItem. Throws on wrong key / tamper. */
export async function decryptRow(
  row: VaultItemRow,
  vaultKey: CryptoKey,
): Promise<DecryptedItem> {
  const content = JSON.parse(await decrypt(row.blob, vaultKey)) as ItemContent;
  const base: Base = {
    id: row.id,
    folder: row.folder,
    updatedAt: row.updated_at,
    collectionId: row.collection_id,
  };
  // row.type is the source of truth for the discriminant.
  return { ...base, type: row.type, content } as DecryptedItem;
}

/** Concatenates the searchable plaintext fields of an item (lowercased). */
export function searchHaystack(item: DecryptedItem): string {
  const parts: string[] = [item.content.title, item.folder ?? ""];
  switch (item.type) {
    case "login":
      parts.push(item.content.username, item.content.url, item.content.notes);
      break;
    case "note":
      parts.push(item.content.body);
      break;
    case "card":
      parts.push(item.content.cardholder, item.content.notes);
      break;
    case "secret":
      parts.push(item.content.notes);
      break;
  }
  return parts.join(" ").toLowerCase();
}
