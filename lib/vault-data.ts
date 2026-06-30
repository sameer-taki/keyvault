/**
 * Data layer for the encrypted vault. Every function takes the Clerk-authenticated
 * Supabase client; RLS scopes all rows to the current user. Nothing here ever sees
 * plaintext — it moves CipherBlobs and non-secret metadata only.
 */
import type { VaultSupabaseClient } from "./supabase";
import type { ProfileRow } from "./database.types";
import type { CipherBlob, KdfParams } from "./vault-crypto";

export interface NewProfile {
  salt: string;
  wrapped_vault_key: CipherBlob;
  kdf: KdfParams;
}

/** Returns the current user's profile row, or null if they haven't set up a vault yet. */
export async function fetchProfile(supabase: VaultSupabaseClient): Promise<ProfileRow | null> {
  const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
  if (error) throw error;
  return data;
}

/** Creates the current user's profile (one-time, at vault setup). */
export async function createProfile(
  supabase: VaultSupabaseClient,
  input: NewProfile,
): Promise<ProfileRow> {
  const { data, error } = await supabase.from("profiles").insert(input).select("*").single();
  if (error) throw error;
  return data;
}
