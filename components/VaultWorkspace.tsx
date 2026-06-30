"use client";

import { UserButton } from "@clerk/nextjs";
import { VaultProvider, useVault, LOCK_WARNING_SECONDS } from "./VaultProvider";
import VaultGate from "./VaultGate";
import ThemeToggle from "./ThemeToggle";

/** Top-level client shell for the /vault route: provider + header + gated content. */
export default function VaultWorkspace({ children }: { children: React.ReactNode }) {
  return (
    <VaultProvider>
      <Shell>{children}</Shell>
    </VaultProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { status, lock, lockWarning, keepAlive } = useVault();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <span className="font-semibold">Biz Key Vault</span>
          <div className="flex items-center gap-3">
            {status === "unlocked" && (
              <button
                onClick={lock}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Lock
              </button>
            )}
            <ThemeToggle />
            <UserButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <VaultGate>{children}</VaultGate>
      </main>

      {status === "unlocked" && lockWarning && (
        <div
          role="alert"
          className="fixed inset-x-0 bottom-4 z-30 mx-auto flex w-[min(90vw,28rem)] items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-lg dark:border-amber-700 dark:bg-amber-950/80 dark:text-amber-200"
        >
          <span>Locking in ~{LOCK_WARNING_SECONDS}s due to inactivity.</span>
          <button
            onClick={keepAlive}
            className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 font-medium text-white hover:bg-amber-700"
          >
            Stay unlocked
          </button>
        </div>
      )}
    </div>
  );
}
