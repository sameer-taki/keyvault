"use client";

import { useState } from "react";
import { useVault, WrongMasterPasswordError, AUTO_LOCK_MINUTES } from "./VaultProvider";
import StrengthMeter from "./StrengthMeter";

const MIN_LENGTH = 10;

export default function SecurityPanel() {
  const { changeMasterPassword, lock } = useVault();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const tooShort = next.length > 0 && next.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== next;
  const canSubmit = current.length > 0 && next.length >= MIN_LENGTH && confirm === next && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setMsg(null);
    try {
      await changeMasterPassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setMsg({ ok: true, text: "Master password changed. Your items are unchanged." });
    } catch (err) {
      setMsg({
        ok: false,
        text:
          err instanceof WrongMasterPasswordError
            ? "Current master password is incorrect."
            : err instanceof Error
              ? err.message
              : "Could not change the master password.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="font-semibold">Security</h3>

      <section className="space-y-2">
        <p className="text-sm font-medium">Change master password</p>
        <p className="text-xs text-slate-500">
          Re-encrypts your vault key under the new password. Your items don’t change and stay
          unlocked. The new password is just as <strong>unrecoverable</strong> as the old one.
        </p>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Current master password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className={inputClass}
          />
          <div className="space-y-1">
            <input
              type="password"
              autoComplete="new-password"
              placeholder="New master password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className={inputClass}
            />
            <StrengthMeter password={next} />
            {tooShort && <p className="text-xs text-red-600">Use at least {MIN_LENGTH} characters.</p>}
          </div>
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Confirm new master password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
          />
          {mismatch && <p className="text-xs text-red-600">Passwords don’t match.</p>}
          {msg && <p className={`text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}
          <button type="submit" disabled={!canSubmit} className={primaryBtn}>
            {busy ? "Re-encrypting…" : "Change master password"}
          </button>
        </form>
      </section>

      <section className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <p className="text-sm font-medium">Session</p>
        <p className="text-xs text-slate-500">
          Your vault auto-locks after {AUTO_LOCK_MINUTES} minutes idle, when the tab is hidden, and
          when it’s closed.
        </p>
        <button onClick={lock} className={secondaryBtn}>
          Lock now
        </button>
      </section>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900";
const primaryBtn =
  "rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50";
const secondaryBtn =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800";
