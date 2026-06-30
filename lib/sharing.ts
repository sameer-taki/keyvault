/**
 * Data layer for organizations & sharing (Phase 6). Moves public keys, encrypted
 * private keys, per-member wrapped collection keys, and ciphertext only — never a
 * usable secret. RLS scopes everything to the caller + their active Clerk org.
 */
import type { VaultSupabaseClient } from "./supabase";
import type { CipherBlob } from "./vault-crypto";
import type { CollectionMemberRow, CollectionRow } from "./database.types";

export interface MyMemberKeys {
  public_key: string;
  wrapped_private_key: CipherBlob;
}

/** Returns the caller's keypair (public + vault-key-wrapped private), or null if not set up. */
export async function fetchMyMemberKeys(
  sb: VaultSupabaseClient,
  myUserId: string,
): Promise<MyMemberKeys | null> {
  const { data: priv, error: e1 } = await sb
    .from("member_private_keys")
    .select("wrapped_private_key")
    .maybeSingle();
  if (e1) throw e1;
  if (!priv) return null;
  const { data: pub, error: e2 } = await sb
    .from("member_public_keys")
    .select("public_key")
    .eq("user_id", myUserId)
    .maybeSingle();
  if (e2) throw e2;
  if (!pub) return null;
  return { public_key: pub.public_key, wrapped_private_key: priv.wrapped_private_key };
}

/** Stores the caller's public key and vault-key-wrapped private key (one-time setup). */
export async function storeMemberKeys(
  sb: VaultSupabaseClient,
  input: { public_key: string; wrapped_private_key: CipherBlob },
): Promise<void> {
  const { error: e1 } = await sb.from("member_public_keys").insert({ public_key: input.public_key });
  if (e1) throw e1;
  const { error: e2 } = await sb
    .from("member_private_keys")
    .insert({ wrapped_private_key: input.wrapped_private_key });
  if (e2) throw e2;
}

/** Looks up another member's public key (to wrap a collection key to them). */
export async function fetchPublicKey(
  sb: VaultSupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await sb
    .from("member_public_keys")
    .select("public_key")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.public_key ?? null;
}

/** Collections visible to the caller's active org. */
export async function listCollections(sb: VaultSupabaseClient): Promise<CollectionRow[]> {
  const { data, error } = await sb.from("collections").select("*").order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function createCollectionRow(
  sb: VaultSupabaseClient,
  input: { org_id: string; name: string },
): Promise<CollectionRow> {
  const { data, error } = await sb.from("collections").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

/** The caller's own membership rows (each carries the collection key wrapped to them). */
export async function listMyMemberships(
  sb: VaultSupabaseClient,
  myUserId: string,
): Promise<CollectionMemberRow[]> {
  const { data, error } = await sb
    .from("collection_members")
    .select("*")
    .eq("user_id", myUserId);
  if (error) throw error;
  return data ?? [];
}

export async function listCollectionMembers(
  sb: VaultSupabaseClient,
  collectionId: string,
): Promise<CollectionMemberRow[]> {
  const { data, error } = await sb
    .from("collection_members")
    .select("*")
    .eq("collection_id", collectionId);
  if (error) throw error;
  return data ?? [];
}

export async function addCollectionMember(
  sb: VaultSupabaseClient,
  input: { collection_id: string; user_id: string; org_id: string; wrapped_collection_key: string },
): Promise<void> {
  const { error } = await sb.from("collection_members").insert(input);
  if (error) throw error;
}

export async function removeCollectionMember(
  sb: VaultSupabaseClient,
  collectionId: string,
  userId: string,
): Promise<void> {
  const { error } = await sb
    .from("collection_members")
    .delete()
    .eq("collection_id", collectionId)
    .eq("user_id", userId);
  if (error) throw error;
}
