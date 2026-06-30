/**
 * Encrypted export / import. The export file is a single password-encrypted blob
 * (Argon2id-derived key + AES-GCM) — it contains NO plaintext, so it is safe to
 * store anywhere. Import decrypts with the export password, after which the UI
 * re-encrypts each item under the current vault key. This makes backups portable
 * across accounts while staying zero-knowledge end to end.
 */
import {
  decrypt,
  deriveMasterKey,
  encrypt,
  KDF_PARAMS,
  newSalt,
  type CipherBlob,
  type KdfParams,
} from "./vault-crypto";
import type { VaultItemType } from "./database.types";
import type { DecryptedItem, ItemContent } from "./items";

export const EXPORT_FORMAT = "biz-key-vault.export";
export const EXPORT_VERSION = 1;

export interface PlainExportItem {
  type: VaultItemType;
  folder: string | null;
  content: ItemContent;
}

export interface ExportFile {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  kdf: KdfParams;
  salt: string;
  data: CipherBlob;
}

export class WrongExportPasswordError extends Error {
  constructor() {
    super("Incorrect export password.");
    this.name = "WrongExportPasswordError";
  }
}

/** Produces the JSON text of an encrypted export protected by `password`. */
export async function exportVault(
  items: DecryptedItem[],
  password: string,
  params: KdfParams = KDF_PARAMS,
): Promise<string> {
  if (!password) throw new Error("An export password is required.");
  const salt = newSalt();
  const key = await deriveMasterKey(password, salt, params);
  const plain: PlainExportItem[] = items.map((it) => ({
    type: it.type,
    folder: it.folder,
    content: it.content,
  }));
  const data = await encrypt(JSON.stringify(plain), key);
  const file: ExportFile = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    kdf: params,
    salt,
    data,
  };
  return JSON.stringify(file, null, 2);
}

/** Decrypts an export file to plaintext items. Throws WrongExportPasswordError on bad password. */
export async function importVault(fileText: string, password: string): Promise<PlainExportItem[]> {
  let file: ExportFile;
  try {
    file = JSON.parse(fileText) as ExportFile;
  } catch {
    throw new Error("This file isn’t valid JSON.");
  }
  if (file?.format !== EXPORT_FORMAT || !file.data || !file.salt) {
    throw new Error("This isn’t a Biz Key Vault export file.");
  }
  const key = await deriveMasterKey(password, file.salt, file.kdf ?? KDF_PARAMS);
  let json: string;
  try {
    json = await decrypt(file.data, key);
  } catch {
    throw new WrongExportPasswordError();
  }
  return JSON.parse(json) as PlainExportItem[];
}
