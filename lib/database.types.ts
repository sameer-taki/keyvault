/**
 * Hand-written Supabase schema types, kept in sync with
 * `supabase/migrations/0001_init.sql`. Mirrors the flat shape the Supabase type
 * generator emits (so the typed client resolves Insert/Update correctly). Only
 * ciphertext + non-secret metadata is ever stored, so jsonb columns are typed as
 * opaque crypto blobs.
 */
import type { CipherBlob, KdfParams } from "./vault-crypto";

export type VaultItemType = "login" | "note" | "card" | "secret";

// NOTE: these MUST be `type` aliases, not `interface`s. Supabase's typed client
// constrains each table to `Record<string, unknown>`, and an interface is not
// assignable to that (interfaces can be augmented, so they lack an implicit index
// signature). Using `interface` here silently collapses every table to `never`.
export type ProfileRow = {
  user_id: string;
  salt: string;
  wrapped_vault_key: CipherBlob;
  kdf: KdfParams;
  created_at: string;
};

export type VaultItemRow = {
  id: string;
  user_id: string;
  type: VaultItemType;
  folder: string | null;
  blob: CipherBlob;
  updated_at: string;
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: {
          user_id?: string;
          salt: string;
          wrapped_vault_key: CipherBlob;
          kdf: KdfParams;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          salt?: string;
          wrapped_vault_key?: CipherBlob;
          kdf?: KdfParams;
          created_at?: string;
        };
        Relationships: [];
      };
      vault_items: {
        Row: VaultItemRow;
        Insert: {
          id?: string;
          user_id?: string;
          type: VaultItemType;
          folder?: string | null;
          blob: CipherBlob;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: VaultItemType;
          folder?: string | null;
          blob?: CipherBlob;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
