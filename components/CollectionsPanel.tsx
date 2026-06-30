"use client";

import { useState } from "react";
import { OrganizationSwitcher, useOrganization } from "@clerk/nextjs";
import { useSharing } from "./SharingProvider";

export default function CollectionsPanel() {
  const { ready, error, orgId, collections, collectionKeys, createCollection, shareCollection } =
    useSharing();
  const { memberships } = useOrganization({ memberships: { infinite: true } });

  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      await createCollection(name.trim());
      setName("");
      setMsg({ ok: true, text: "Collection created." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not create collection." });
    } finally {
      setBusy(false);
    }
  }

  async function share(collectionId: string, userId: string, label: string) {
    setBusy(true);
    setMsg(null);
    try {
      await shareCollection(collectionId, userId);
      setMsg({ ok: true, text: `Shared with ${label}.` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not share." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">Shared collections</h3>
        <OrganizationSwitcher hidePersonal afterCreateOrganizationUrl="/vault" afterSelectOrganizationUrl="/vault" />
      </div>

      <p className="text-xs text-slate-500">
        Items in a collection are encrypted with a key shared only to its members — the server still
        can’t read them.
      </p>

      {!orgId ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Select or create an organization above to start sharing.
        </p>
      ) : !ready ? (
        <p className="text-sm text-slate-500">Setting up your sharing keys…</p>
      ) : (
        <>
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New collection name"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            <button
              onClick={create}
              disabled={busy || !name.trim()}
              className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Create
            </button>
          </div>

          {collections.length === 0 ? (
            <p className="text-sm text-slate-500">No collections yet.</p>
          ) : (
            <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {collections.map((c) => {
                const canShare = collectionKeys.has(c.id);
                const open = selected === c.id;
                return (
                  <li key={c.id} className="p-3">
                    <button
                      onClick={() => setSelected(open ? null : c.id)}
                      className="flex w-full items-center justify-between text-left text-sm font-medium"
                    >
                      <span>📁 {c.name}</span>
                      <span className="text-xs text-slate-400">
                        {canShare ? (open ? "Hide" : "Share…") : "No access"}
                      </span>
                    </button>

                    {open && canShare && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-slate-500">Share with an organization member:</p>
                        {(memberships?.data ?? []).map((m) => {
                          const uid = m.publicUserData?.userId;
                          const label =
                            m.publicUserData?.identifier ??
                            [m.publicUserData?.firstName, m.publicUserData?.lastName]
                              .filter(Boolean)
                              .join(" ") ??
                            uid ??
                            "member";
                          if (!uid) return null;
                          return (
                            <div key={uid} className="flex items-center justify-between gap-2 text-sm">
                              <span className="truncate">{label}</span>
                              <button
                                onClick={() => share(c.id, uid, label)}
                                disabled={busy}
                                className="shrink-0 rounded-lg border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
                              >
                                Share
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {msg && <p className={`text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}
        </>
      )}
    </div>
  );
}
