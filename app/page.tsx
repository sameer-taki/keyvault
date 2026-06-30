export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="max-w-xl space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Biz Key Vault</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          A zero-knowledge password &amp; secrets vault. Everything is encrypted in your browser
          before it is stored &mdash; the server never sees your secrets.
        </p>
        <p className="text-sm text-slate-500">Phase 0 scaffold &mdash; auth and the vault land in later phases.</p>
      </div>
    </main>
  );
}
