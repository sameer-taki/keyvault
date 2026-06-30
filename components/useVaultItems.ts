"use client";

import { useCallback, useEffect, useState } from "react";
import { useSupabaseClient } from "@/lib/supabase";
import { useVaultKey } from "./VaultProvider";
import {
  createItem,
  deleteItem as deleteItemRow,
  listItems,
  updateItem,
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
  const [items, setItems] = useState<DecryptedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [failedCount, setFailedCount] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

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
          try {
            decrypted.push(await decryptRow(row, vaultKey));
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
  }, [supabase, vaultKey, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const saveItem = useCallback(
    async (draft: ItemDraft) => {
      const blob = await encryptContent(draft.content, vaultKey);
      const write = { type: draft.type, folder: draft.folder, blob };

      if (draft.id) {
        // Optimistic update: apply locally, reconcile or revert.
        const id = draft.id;
        const prev = items;
        setItems((cur) =>
          cur.map((it) =>
            it.id === id
              ? ({ ...it, type: draft.type, folder: draft.folder, content: draft.content } as DecryptedItem)
              : it,
          ),
        );
        try {
          const row = await updateItem(supabase, id, write);
          const fresh = await decryptRow(row, vaultKey);
          setItems((cur) => cur.map((it) => (it.id === id ? fresh : it)));
        } catch (e) {
          setItems(prev);
          throw e;
        }
      } else {
        const row = await createItem(supabase, write);
        const fresh = await decryptRow(row, vaultKey);
        setItems((cur) => [fresh, ...cur]);
      }
    },
    [items, supabase, vaultKey],
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
