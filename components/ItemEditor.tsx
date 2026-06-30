"use client";

import { useState } from "react";
import type { VaultItemType } from "@/lib/database.types";
import { ITEM_TYPE_LABELS, type ItemContent, type ItemDraft } from "@/lib/items";
import PasswordGenerator from "./PasswordGenerator";

type FieldKind = "text" | "password" | "textarea" | "url";
interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
}

const FIELDS: Record<VaultItemType, FieldDef[]> = {
  login: [
    { key: "title", label: "Name", kind: "text" },
    { key: "username", label: "Username / email", kind: "text" },
    { key: "password", label: "Password", kind: "password" },
    { key: "url", label: "Website", kind: "url" },
    { key: "notes", label: "Notes", kind: "textarea" },
  ],
  note: [
    { key: "title", label: "Title", kind: "text" },
    { key: "body", label: "Note", kind: "textarea" },
  ],
  card: [
    { key: "title", label: "Name", kind: "text" },
    { key: "cardholder", label: "Cardholder", kind: "text" },
    { key: "number", label: "Card number", kind: "text" },
    { key: "expiry", label: "Expiry (MM/YY)", kind: "text" },
    { key: "cvv", label: "CVV", kind: "password" },
    { key: "notes", label: "Notes", kind: "textarea" },
  ],
  secret: [
    { key: "title", label: "Name", kind: "text" },
    { key: "value", label: "Secret value", kind: "password" },
    { key: "notes", label: "Notes", kind: "textarea" },
  ],
};

interface Props {
  initial: ItemDraft;
  onSave: (draft: ItemDraft) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

export default function ItemEditor({ initial, onSave, onDelete, onClose }: Props) {
  // All content fields are strings; edit as a flat record and cast on save.
  const [fields, setFields] = useState<Record<string, string>>(
    () => ({ ...(initial.content as unknown as Record<string, string>) }),
  );
  const [folder, setFolder] = useState(initial.folder ?? "");
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [genFor, setGenFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: string, value: string) => setFields((f) => ({ ...f, [key]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSave({
        id: initial.id,
        type: initial.type,
        folder: folder.trim() || null,
        content: fields as unknown as ItemContent,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
      setBusy(false);
    }
  }

  async function remove() {
    if (!onDelete) return;
    if (!confirm("Delete this item? This cannot be undone.")) return;
    setBusy(true);
    setError(null);
    try {
      await onDelete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete.");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-20 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        className="my-8 w-full max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {initial.id ? "Edit" : "New"} {ITEM_TYPE_LABELS[initial.type].toLowerCase()}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>

        {FIELDS[initial.type].map((f) => (
          <div key={f.key} className="space-y-1">
            <label htmlFor={f.key} className="text-sm font-medium">
              {f.label}
            </label>

            {f.kind === "textarea" ? (
              <textarea
                id={f.key}
                rows={3}
                value={fields[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
                className={inputClass}
              />
            ) : (
              <div className="flex items-center gap-2">
                <input
                  id={f.key}
                  type={f.kind === "password" && !reveal[f.key] ? "password" : f.kind === "url" ? "url" : "text"}
                  autoComplete="off"
                  value={fields[f.key] ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  className={inputClass}
                />
                {f.kind === "password" && (
                  <button
                    type="button"
                    onClick={() => setReveal((r) => ({ ...r, [f.key]: !r[f.key] }))}
                    className={iconBtn}
                    title={reveal[f.key] ? "Hide" : "Show"}
                  >
                    {reveal[f.key] ? "🙈" : "👁"}
                  </button>
                )}
                {f.kind === "password" && (initial.type === "login" || initial.type === "secret") && (
                  <button
                    type="button"
                    onClick={() => setGenFor((g) => (g === f.key ? null : f.key))}
                    className={iconBtn}
                    title="Generate"
                  >
                    🎲
                  </button>
                )}
              </div>
            )}

            {genFor === f.key && (
              <PasswordGenerator
                onUse={(pw) => {
                  set(f.key, pw);
                  setReveal((r) => ({ ...r, [f.key]: true }));
                  setGenFor(null);
                }}
              />
            )}
          </div>
        ))}

        <div className="space-y-1">
          <label htmlFor="folder" className="text-sm font-medium">
            Folder <span className="font-normal text-slate-400">(optional, not encrypted)</span>
          </label>
          <input
            id="folder"
            type="text"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            className={inputClass}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          {onDelete ? (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/40"
            >
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={iconBtn + " px-4"}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900";
const iconBtn =
  "rounded-lg border border-slate-300 px-2.5 py-2 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800";
