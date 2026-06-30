/**
 * Data layer for the encrypted vault. Every function takes the Clerk-authenticated
 * Supabase client; RLS scopes all rows to the current user. Nothing here ever sees
 * plaintext — it moves CipherBlobs and non-secret metadata only.
 */
import type { VaultSupabaseClient } from "./supabase";
import type { ProfileRow, VaultItemRow, VaultItemType } from "./database.types";
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

/**
 * Updates the current user's profile (used when rotating the master password).
 * RLS scopes this to the single own row, so no explicit filter is needed; the
 * not-null filter on user_id just satisfies PostgREST's "update needs a filter".
 */
export async function updateProfile(
  supabase: VaultSupabaseClient,
  input: NewProfile,
): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from("profiles")
    .update(input)
    .not("user_id", "is", null)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export interface ItemWrite {
  type: VaultItemType;
  folder: string | null;
  blob: CipherBlob;
}

/** Lists the current user's encrypted items, newest first. */
export async function listItems(supabase: VaultSupabaseClient): Promise<VaultItemRow[]> {
  const { data, error } = await supabase
    .from("vault_items")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Inserts a new encrypted item. */
export async function createItem(
  supabase: VaultSupabaseClient,
  input: ItemWrite,
): Promise<VaultItemRow> {
  const { data, error } = await supabase.from("vault_items").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

/** Updates an existing encrypted item (updated_at is refreshed by a DB trigger). */
export async function updateItem(
  supabase: VaultSupabaseClient,
  id: string,
  input: ItemWrite,
): Promise<VaultItemRow> {
  const { data, error } = await supabase
    .from("vault_items")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Deletes an item by id (RLS ensures it must be the caller's own row). */
export async function deleteItem(supabase: VaultSupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("vault_items").delete().eq("id", id);
  if (error) throw error;
}
