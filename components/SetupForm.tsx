"use client";

import { useState } from "react";
import { useVault } from "./VaultProvider";
import StrengthMeter from "./StrengthMeter";

const MIN_LENGTH = 10;

export default function SetupForm() {
  const { setupVault } = useVault();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tooShort = password.length > 0 && password.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit =
    password.length >= MIN_LENGTH && confirm === password && acknowledged && !busy;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await setupVault(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set up your vault.");
      setBusy(false);
    }
  }

  return (
    <Card title="Set up your vault">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Choose a <strong>master password</strong>. It encrypts everything in your vault and is
        <strong> different from your sign-in password</strong>.
      </p>

      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
        <strong>There is no recovery.</strong> We never see this password, so if you forget it your
        vault cannot be decrypted — by us or anyone. Store it somewhere safe.
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="mp" className="text-sm font-medium">
            Master password
          </label>
          <input
            id="mp"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
          <StrengthMeter password={password} />
          {tooShort && (
            <p className="text-xs text-red-600">Use at least {MIN_LENGTH} characters.</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="mp2" className="text-sm font-medium">
            Confirm master password
          </label>
          <input
            id="mp2"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
          />
          {mismatch && <p className="text-xs text-red-600">Passwords don’t match.</p>}
        </div>

        <label className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-0.5"
          />
          I understand that a lost master password means my vault is permanently unrecoverable.
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={!canSubmit} className={primaryButtonClass}>
          {busy ? "Securing your vault…" : "Create vault"}
        </button>
      </form>
    </Card>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900";
const primaryButtonClass =
  "w-full rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50";

export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </div>
  );
}
