"use client";

import { UserButton } from "@clerk/nextjs";
import { VaultProvider, useVault } from "./VaultProvider";
import VaultGate from "./VaultGate";

/** Top-level client shell for the /vault route: provider + header + gated content. */
export default function VaultWorkspace({ children }: { children: React.ReactNode }) {
  return (
    <VaultProvider>
      <Shell>{children}</Shell>
    </VaultProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { status, lock } = useVault();

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
            <UserButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <VaultGate>{children}</VaultGate>
      </main>
    </div>
  );
}
