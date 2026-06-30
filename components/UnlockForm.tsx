"use client";

import { useState } from "react";
import { SignOutButton } from "@clerk/nextjs";
import { useVault, WrongMasterPasswordError } from "./VaultProvider";
import { Card } from "./SetupForm";

export default function UnlockForm() {
  const { unlock } = useVault();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    setError(null);
    try {
      await unlock(password);
    } catch (err) {
      setError(
        err instanceof WrongMasterPasswordError
          ? "Incorrect master password."
          : err instanceof Error
            ? err.message
            : "Could not unlock your vault.",
      );
      setBusy(false);
      setPassword("");
    }
  }

  return (
    <Card title="Unlock your vault">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Enter your master password to decrypt your vault for this session.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="mp" className="text-sm font-medium">
            Master password
          </label>
          <input
            id="mp"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy || !password}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Unlocking…" : "Unlock"}
        </button>
      </form>
      <p className="text-center text-xs text-slate-500">
        Not you?{" "}
        <SignOutButton>
          <button className="underline hover:text-slate-700 dark:hover:text-slate-300">
            Sign out
          </button>
        </SignOutButton>
      </p>
    </Card>
  );
}
