"use client";

import { useVault } from "./VaultProvider";
import SetupForm from "./SetupForm";
import UnlockForm from "./UnlockForm";

/** Renders setup / unlock / the unlocked app depending on vault status. */
export default function VaultGate({ children }: { children: React.ReactNode }) {
  const { status, loadError } = useVault();

  if (status === "unlocked") return <>{children}</>;

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      {status === "loading" && <p className="text-slate-500">Loading your vault…</p>}
      {status === "needs-setup" && <SetupForm />}
      {status === "locked" && <UnlockForm />}
      {status === "error" && (
        <div className="max-w-md rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          Couldn’t load your vault: {loadError}
        </div>
      )}
    </div>
  );
}
