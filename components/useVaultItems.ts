"use client";

import { useCallback, useEffect, useState } from "react";
import { useSupabaseClient } from "@/lib/supabase";
import { useVaultKey } from "./VaultProvider";
import { useSharing } from "./SharingProvider";
import {
  createItem,
  deleteItem as deleteItemRow,
  listItems,
  updateItem,
  type ItemWrite,
} from "@/lib/vault-data";
import { decryptRow, encryptContent, type DecryptedItem, type ItemDraft } from "@/lib/items";

interface UseVaultItems {
  items: DecryptedItem[];
  loading: boolean;
  error: string | null;
  /** Number of rows that failed to decrypt (corrupt/foreign data). */
  failedCount: number;
  saveItem: (draft: ItemDraft) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  reload: () => void;
}

export function useVaultItems(): UseVaultItems {
  const supabase = useSupabaseClient();
  const vaultKey = useVaultKey();
  const { collectionKeys, keysVersion, getCollection } = useSharing();
  const [items, setItems] = useState<DecryptedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [failedCount, setFailedCount] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  // The right key for a row: the collection key for shared items, else the vault key.
  const keyFor = useCallback(
    (collectionId: string | null): CryptoKey | undefined =>
      collectionId ? collectionKeys.get(collectionId) : vaultKey,
    [collectionKeys, vaultKey],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const rows = await listItems(supabase);
        const decrypted: DecryptedItem[] = [];
        let failed = 0;
        for (const row of rows) {
          const key = keyFor(row.collection_id);
          if (!key) {
            // A shared item whose collection key we don't hold yet — count, don't crash.
            failed += 1;
            continue;
          }
          try {
            decrypted.push(await decryptRow(row, key));
          } catch {
            failed += 1;
          }
        }
        if (cancelled) return;
        setItems(decrypted);
        setFailedCount(failed);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load items.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, keyFor, reloadKey, keysVersion]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const saveItem = useCallback(
    async (draft: ItemDraft) => {
      const collectionId = draft.collectionId ?? null;
      const key = keyFor(collectionId);
      if (!key) throw new Error("Missing encryption key for the selected collection.");
      const orgId = collectionId ? (getCollection(collectionId)?.org_id ?? null) : null;

      const blob = await encryptContent(draft.content, key);
      const write: ItemWrite = {
        type: draft.type,
        folder: draft.folder,
        blob,
        org_id: orgId,
        collection_id: collectionId,
      };

      if (draft.id) {
        // Optimistic update: apply locally, reconcile or revert.
        const id = draft.id;
        const prev = items;
        setItems((cur) =>
          cur.map((it) =>
            it.id === id
              ? ({
                  ...it,
                  type: draft.type,
                  folder: draft.folder,
                  content: draft.content,
                  collectionId,
                } as DecryptedItem)
              : it,
          ),
        );
        try {
          const row = await updateItem(supabase, id, write);
          const fresh = await decryptRow(row, key);
          setItems((cur) => cur.map((it) => (it.id === id ? fresh : it)));
        } catch (e) {
          setItems(prev);
          throw e;
        }
      } else {
        const row = await createItem(supabase, write);
        const fresh = await decryptRow(row, key);
        setItems((cur) => [fresh, ...cur]);
      }
    },
    [items, supabase, keyFor, getCollection],
  );

  const removeItem = useCallback(
    async (id: string) => {
      // Optimistic delete: remove now, restore on failure.
      const prev = items;
      setItems((cur) => cur.filter((it) => it.id !== id));
      try {
        await deleteItemRow(supabase, id);
      } catch (e) {
        setItems(prev);
        throw e;
      }
    },
    [items, supabase],
  );

  return { items, loading, error, failedCount, saveItem, removeItem, reload };
}
