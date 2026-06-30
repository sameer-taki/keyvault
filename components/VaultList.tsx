"use client";

import { useMemo, useState } from "react";
import type { VaultItemType } from "@/lib/database.types";
import {
  displayTitle,
  emptyContent,
  ITEM_TYPE_LABELS,
  searchHaystack,
  type DecryptedItem,
  type ItemDraft,
} from "@/lib/items";
import { useVaultItems } from "./useVaultItems";
import ItemEditor from "./ItemEditor";

const TYPE_ICON: Record<VaultItemType, string> = {
  login: "🔑",
  note: "📝",
  card: "💳",
  secret: "🔒",
};
const TYPES: VaultItemType[] = ["login", "note", "card", "secret"];

export default function VaultList() {
  const { items, loading, error, failedCount, saveItem, removeItem } = useVaultItems();
  const [query, setQuery] = useState("");
  const [newMenu, setNewMenu] = useState(false);
  const [editing, setEditing] = useState<ItemDraft | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => searchHaystack(it).includes(q));
  }, [items, query]);

  function openNew(type: VaultItemType) {
    setNewMenu(false);
    setEditing({ type, folder: null, content: emptyContent(type) });
  }

  function openEdit(it: DecryptedItem) {
    setEditing({ id: it.id, type: it.type, folder: it.folder, content: it.content });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search your vault…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900"
        />
        <div className="relative">
          <button
            onClick={() => setNewMenu((v) => !v)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            + New
          </button>
          {newMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setNewMenu(false)} />
              <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => openNew(t)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <span>{TYPE_ICON[t]}</span>
                    {ITEM_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {failedCount > 0 && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
          {failedCount} item(s) could not be decrypted and are hidden.
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-300 bg-red-50 p-2 text-sm text-red-800">{error}</p>
      )}

      {loading ? (
        <p className="py-8 text-center text-slate-500">Decrypting your vault…</p>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-slate-500">
          {items.length === 0 ? "Your vault is empty. Add your first item." : "No matches."}
        </p>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {filtered.map((it) => (
            <li key={it.id}>
              <button
                onClick={() => openEdit(it)}
                className="flex w-full items-center gap-3 bg-white px-4 py-3 text-left hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                <span className="text-xl" aria-hidden>
                  {TYPE_ICON[it.type]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{displayTitle(it)}</span>
                  <span className="block truncate text-xs text-slate-500">{subtitle(it)}</span>
                </span>
                {it.folder && (
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800">
                    {it.folder}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <ItemEditor
          key={editing.id ?? "new"}
          initial={editing}
          onSave={saveItem}
          onDelete={editing.id ? () => removeItem(editing.id!) : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function subtitle(it: DecryptedItem): string {
  switch (it.type) {
    case "login":
      return it.content.username || it.content.url || "—";
    case "card":
      return it.content.number ? `•••• ${it.content.number.slice(-4)}` : "—";
    case "note":
      return it.content.body.slice(0, 60) || "—";
    case "secret":
      return "Hidden secret";
  }
}
