"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSupabaseClient } from "@/lib/supabase";
import { useVaultKey } from "./VaultProvider";
import {
  addCollectionMember,
  createCollectionRow,
  fetchMyMemberKeys,
  fetchPublicKey,
  listCollections,
  listMyMemberships,
  storeMemberKeys,
} from "@/lib/sharing";
import {
  exportPublicKey,
  generateCollectionKey,
  generateMemberKeypair,
  importPublicKey,
  unwrapCollectionKeyWithPrivate,
  unwrapPrivateKey,
  wrapCollectionKeyForMember,
  wrapPrivateKey,
} from "@/lib/vault-crypto";
import type { CollectionRow } from "@/lib/database.types";

interface SharingContextValue {
  /** Member keypair bootstrapped and collection keys loaded. */
  ready: boolean;
  error: string | null;
  myUserId: string | null;
  /** Active Clerk organization id, or null when none is selected. */
  orgId: string | null;
  collections: CollectionRow[];
  /** collectionId -> unwrapped AES collection key (only for collections the user is in). */
  collectionKeys: Map<string, CryptoKey>;
  /** Increments whenever collectionKeys change (for effect deps). */
  keysVersion: number;
  createCollection: (name: string) => Promise<void>;
  shareCollection: (collectionId: string, targetUserId: string) => Promise<void>;
  getCollection: (id: string) => CollectionRow | undefined;
  refresh: () => void;
}

const SharingContext = createContext<SharingContextValue | null>(null);

export function SharingProvider({ children }: { children: React.ReactNode }) {
  const supabase = useSupabaseClient();
  const vaultKey = useVaultKey();
  const { userId, orgId } = useAuth();

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [collectionKeys, setCollectionKeys] = useState<Map<string, CryptoKey>>(new Map());
  const [keysVersion, setKeysVersion] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  // The caller's own keys, held in memory for the session.
  const privateKeyRef = useRef<CryptoKey | null>(null);
  const publicSpkiRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setReady(false);
    setError(null);
    (async () => {
      try {
        // 1. Bootstrap the member keypair (private key wrapped under the vault key).
        let existing = await fetchMyMemberKeys(supabase, userId);
        if (!existing) {
          const pair = await generateMemberKeypair();
          const spki = await exportPublicKey(pair.publicKey);
          const wrapped = await wrapPrivateKey(pair.privateKey, vaultKey);
          await storeMemberKeys(supabase, { public_key: spki, wrapped_private_key: wrapped });
          existing = { public_key: spki, wrapped_private_key: wrapped };
        }
        publicSpkiRef.current = existing.public_key;
        privateKeyRef.current = await unwrapPrivateKey(existing.wrapped_private_key, vaultKey);

        // 2. Load collections + unwrap the collection keys the user can access.
        const [cols, myMemberships] = await Promise.all([
          listCollections(supabase),
          listMyMemberships(supabase, userId),
        ]);
        const keys = new Map<string, CryptoKey>();
        for (const m of myMemberships) {
          try {
            keys.set(
              m.collection_id,
              await unwrapCollectionKeyWithPrivate(m.wrapped_collection_key, privateKeyRef.current),
            );
          } catch {
            // Skip a membership whose wrap we can't open (shouldn't happen).
          }
        }
        if (cancelled) return;
        setCollections(cols);
        setCollectionKeys(keys);
        setKeysVersion((v) => v + 1);
        setReady(true);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to set up sharing.");
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, vaultKey, userId, reloadKey]);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);
  const getCollection = useCallback(
    (id: string) => collections.find((c) => c.id === id),
    [collections],
  );

  const createCollection = useCallback(
    async (name: string) => {
      if (!orgId) throw new Error("Select an organization first.");
      if (!userId || !publicSpkiRef.current) throw new Error("Sharing isn’t ready yet.");
      const collectionKey = await generateCollectionKey();
      const row = await createCollectionRow(supabase, { org_id: orgId, name });
      const myPublic = await importPublicKey(publicSpkiRef.current);
      const wrapped = await wrapCollectionKeyForMember(collectionKey, myPublic);
      await addCollectionMember(supabase, {
        collection_id: row.id,
        user_id: userId,
        org_id: orgId,
        wrapped_collection_key: wrapped,
      });
      setCollections((c) => [...c, row]);
      setCollectionKeys((m) => new Map(m).set(row.id, collectionKey));
      setKeysVersion((v) => v + 1);
    },
    [orgId, userId, supabase],
  );

  const shareCollection = useCallback(
    async (collectionId: string, targetUserId: string) => {
      const collection = collections.find((c) => c.id === collectionId);
      const collectionKey = collectionKeys.get(collectionId);
      if (!collection || !collectionKey) throw new Error("You’re not a member of that collection.");
      const targetSpki = await fetchPublicKey(supabase, targetUserId);
      if (!targetSpki) throw new Error("That member hasn’t set up their vault for sharing yet.");
      const targetPublic = await importPublicKey(targetSpki);
      const wrapped = await wrapCollectionKeyForMember(collectionKey, targetPublic);
      await addCollectionMember(supabase, {
        collection_id: collectionId,
        user_id: targetUserId,
        org_id: collection.org_id,
        wrapped_collection_key: wrapped,
      });
    },
    [collections, collectionKeys, supabase],
  );

  const value = useMemo<SharingContextValue>(
    () => ({
      ready,
      error,
      myUserId: userId ?? null,
      orgId: orgId ?? null,
      collections,
      collectionKeys,
      keysVersion,
      createCollection,
      shareCollection,
      getCollection,
      refresh,
    }),
    [ready, error, userId, orgId, collections, collectionKeys, keysVersion, createCollection, shareCollection, getCollection, refresh],
  );

  return <SharingContext.Provider value={value}>{children}</SharingContext.Provider>;
}

export function useSharing(): SharingContextValue {
  const ctx = useContext(SharingContext);
  if (!ctx) throw new Error("useSharing must be used within a SharingProvider.");
  return ctx;
}
