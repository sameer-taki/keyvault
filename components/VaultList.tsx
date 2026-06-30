"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import HealthPanel from "./HealthPanel";
import BackupPanel from "./BackupPanel";
import SecurityPanel from "./SecurityPanel";
import CopyButton from "./CopyButton";

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
  const [panel, setPanel] = useState<"health" | "backup" | "security" | null>(null);
  const [editing, setEditing] = useState<ItemDraft | null>(null);
  const [folder, setFolder] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const folders = useMemo(
    () => Array.from(new Set(items.map((i) => i.folder).filter((f): f is string => !!f))).sort(),
    [items],
  );

  // Clear the folder filter if its folder disappears (e.g. last item moved/deleted).
  useEffect(() => {
    if (folder && !folders.includes(folder)) setFolder(null);
  }, [folder, folders]);

  // "/" or Cmd/Ctrl+K focuses search (unless already typing somewhere).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing =
        t?.tagName === "INPUT" || t?.tagName === "TEXTAREA" || t?.isContentEditable === true;
      if ((e.key === "/" && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "Escape") {
        setNewMenu(false);
        setPanel(null);
      } else if (e.key.toLowerCase() === "n" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setNewMenu(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function handleImport(drafts: ItemDraft[]): Promise<number> {
    let n = 0;
    for (const d of drafts) {
      await saveItem(d);
      n += 1;
    }
    return n;
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = folder ? items.filter((it) => it.folder === folder) : items;
    if (q) list = list.filter((it) => searchHaystack(it).includes(q));
    return list;
  }, [items, query, folder]);

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
          ref={searchRef}
          type="search"
          placeholder="Search your vault…  ( / )"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900"
        />
        <button onClick={() => setPanel((p) => (p === "health" ? null : "health"))} className={secondaryBtn}>
          Health
        </button>
        <button onClick={() => setPanel((p) => (p === "backup" ? null : "backup"))} className={secondaryBtn}>
          Backup
        </button>
        <button onClick={() => setPanel((p) => (p === "security" ? null : "security"))} className={secondaryBtn}>
          Security
        </button>
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

      {folders.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <FolderChip label="All" active={folder === null} onClick={() => setFolder(null)} />
          {folders.map((f) => (
            <FolderChip key={f} label={f} active={folder === f} onClick={() => setFolder(f)} />
          ))}
        </div>
      )}

      {panel === "health" && <HealthPanel items={items} />}
      {panel === "backup" && <BackupPanel items={items} onImport={handleImport} />}
      {panel === "security" && <SecurityPanel />}

      {failedCount > 0 && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
          {failedCount} item(s) could not be decrypted and are hidden.
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-300 bg-red-50 p-2 text-sm text-red-800">{error}</p>
      )}

      {loading ? (
        <ul className="space-y-2" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <li
              key={i}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
            >
              <span className="h-6 w-6 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
              <span className="flex-1 space-y-2">
                <span className="block h-3 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                <span className="block h-2.5 w-1/2 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              </span>
            </li>
          ))}
        </ul>
      ) : filtered.length === 0 ? (
        items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 py-12 text-center dark:border-slate-700">
            <span className="text-4xl" aria-hidden>
              🔒
            </span>
            <div>
              <p className="font-medium">Your vault is empty</p>
              <p className="text-sm text-slate-500">Add your first login, note, card, or secret.</p>
            </div>
            <button
              onClick={() => openNew("login")}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              + Add your first item
            </button>
          </div>
        ) : (
          <p className="py-8 text-center text-slate-500">No matches for “{query}”.</p>
        )
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {filtered.map((it) => (
            <li
              key={it.id}
              className="flex items-center bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <button
                onClick={() => openEdit(it)}
                className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
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
              <div className="flex items-center gap-1 pr-2">
                <QuickCopies item={it} />
              </div>
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

const secondaryBtn =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800";

const ghostCopy =
  "rounded-lg px-2 py-1.5 text-sm text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-700 dark:hover:text-slate-200";

/** Type-aware quick copy buttons for a list row. */
function QuickCopies({ item }: { item: DecryptedItem }) {
  switch (item.type) {
    case "login":
      return (
        <>
          {item.content.username && (
            <CopyButton value={item.content.username} title="Copy username" className={ghostCopy} />
          )}
          <CopyButton value={item.content.password} sensitive title="Copy password" className={ghostCopy} />
        </>
      );
    case "secret":
      return <CopyButton value={item.content.value} sensitive title="Copy secret" className={ghostCopy} />;
    case "card":
      return <CopyButton value={item.content.number} sensitive title="Copy card number" className={ghostCopy} />;
    case "note":
      return null;
  }
}

function FolderChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        active
          ? "bg-brand-600 text-white"
          : "border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      }`}
    >
      {label}
    </button>
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
