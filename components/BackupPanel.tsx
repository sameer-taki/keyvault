"use client";

import { useState } from "react";
import { exportVault, importVault, WrongExportPasswordError } from "@/lib/backup";
import type { DecryptedItem, ItemDraft } from "@/lib/items";

interface Props {
  items: DecryptedItem[];
  onImport: (drafts: ItemDraft[]) => Promise<number>;
}

export default function BackupPanel({ items, onImport }: Props) {
  const [exportPw, setExportPw] = useState("");
  const [importPw, setImportPw] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<"export" | "import" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function doExport() {
    if (!exportPw) return;
    setBusy("export");
    setMsg(null);
    try {
      const text = await exportVault(items, exportPw);
      const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `biz-key-vault-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportPw("");
      setMsg({ ok: true, text: `Exported ${items.length} item(s) as an encrypted file.` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Export failed." });
    } finally {
      setBusy(null);
    }
  }

  async function doImport() {
    if (!file || !importPw) return;
    setBusy("import");
    setMsg(null);
    try {
      const text = await file.text();
      const plain = await importVault(text, importPw);
      const drafts: ItemDraft[] = plain.map((p) => ({
        type: p.type,
        folder: p.folder,
        content: p.content,
      }));
      const count = await onImport(drafts);
      setImportPw("");
      setFile(null);
      setMsg({ ok: true, text: `Imported ${count} item(s) into your vault.` });
    } catch (e) {
      setMsg({
        ok: false,
        text:
          e instanceof WrongExportPasswordError
            ? "Incorrect export password."
            : e instanceof Error
              ? e.message
              : "Import failed.",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="font-semibold">Encrypted backup</h3>

      <section className="space-y-2">
        <p className="text-sm font-medium">Export</p>
        <p className="text-xs text-slate-500">
          Downloads a single encrypted file (no plaintext). You’ll need this password to restore it
          — it is independent of your master password.
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Export password"
            value={exportPw}
            onChange={(e) => setExportPw(e.target.value)}
            className={inputClass}
          />
          <button
            onClick={doExport}
            disabled={!exportPw || busy !== null}
            className={primaryBtn}
          >
            {busy === "export" ? "Encrypting…" : "Export"}
          </button>
        </div>
      </section>

      <section className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <p className="text-sm font-medium">Import</p>
        <p className="text-xs text-slate-500">
          Items are re-encrypted under your current vault key and added to your vault.
        </p>
        <input
          type="file"
          accept="application/json,.json"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm dark:text-slate-400 dark:file:bg-slate-800"
        />
        <div className="flex gap-2">
          <input
            type="password"
            autoComplete="off"
            placeholder="Export password"
            value={importPw}
            onChange={(e) => setImportPw(e.target.value)}
            className={inputClass}
          />
          <button
            onClick={doImport}
            disabled={!file || !importPw || busy !== null}
            className={primaryBtn}
          >
            {busy === "import" ? "Importing…" : "Import"}
          </button>
        </div>
      </section>

      {msg && (
        <p className={`text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>
      )}
    </div>
  );
}

const inputClass =
  "min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900";
const primaryBtn =
  "shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50";
