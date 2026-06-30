/**
 * Hand-written Supabase schema types, kept in sync with
 * `supabase/migrations/0001_init.sql`. Only ciphertext + non-secret metadata
 * is ever stored, so the jsonb columns are typed as opaque crypto blobs.
 */
import type { CipherBlob, KdfParams } from "./vault-crypto";

export type VaultItemType = "login" | "note" | "card" | "secret";

export interface ProfileRow {
  user_id: string;
  salt: string;
  wrapped_vault_key: CipherBlob;
  kdf: KdfParams;
  created_at: string;
}

export interface VaultItemRow {
  id: string;
  user_id: string;
  type: VaultItemType;
  folder: string | null;
  blob: CipherBlob;
  updated_at: string;
}

/** Columns the client supplies on insert; the rest are defaulted by Postgres. */
type ProfileInsert = Pick<ProfileRow, "salt" | "wrapped_vault_key" | "kdf"> &
  Partial<Pick<ProfileRow, "user_id">>;
type ProfileUpdate = Partial<ProfileInsert>;

type VaultItemInsert = Pick<VaultItemRow, "type" | "blob"> &
  Partial<Pick<VaultItemRow, "id" | "user_id" | "folder">>;
type VaultItemUpdate = Partial<Pick<VaultItemRow, "type" | "folder" | "blob">>;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      vault_items: {
        Row: VaultItemRow;
        Insert: VaultItemInsert;
        Update: VaultItemUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
