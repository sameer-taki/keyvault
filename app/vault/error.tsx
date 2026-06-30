"use client";

export default function VaultError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isConfig = /Missing NEXT_PUBLIC_|SETUP\.md/.test(error.message);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md space-y-3 rounded-2xl border border-red-300 bg-red-50 p-6 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
        <h1 className="text-lg font-semibold">
          {isConfig ? "App not configured" : "Something went wrong"}
        </h1>
        {isConfig ? (
          <p>
            The Clerk / Supabase environment variables are missing. See <code>SETUP.md</code> and
            set them in <code>.env.local</code> (local) or your Vercel project settings.
          </p>
        ) : (
          <p>An unexpected error occurred while loading your vault.</p>
        )}
        <button
          onClick={reset}
          className="rounded-lg border border-red-300 px-3 py-1.5 font-medium hover:bg-red-100 dark:border-red-700 dark:hover:bg-red-900/40"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
