import VaultWorkspace from "@/components/VaultWorkspace";

export default function VaultPage() {
  return (
    <VaultWorkspace>
      <div className="rounded-2xl border border-green-300 bg-green-50 p-6 text-green-900 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200">
        <h2 className="text-lg font-semibold">Vault unlocked</h2>
        <p className="mt-1 text-sm">
          Your vault key is held in memory for this session only — never written to disk or sent to
          the server. It clears automatically after {""}
          inactivity, when you lock, or when the tab is hidden. Item management arrives next.
        </p>
      </div>
    </VaultWorkspace>
  );
}
