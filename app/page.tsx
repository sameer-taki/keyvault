import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8 text-center">
      <div className="max-w-xl space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Biz Key Vault</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          A zero-knowledge password &amp; secrets vault. Everything is encrypted in your browser
          before it is stored &mdash; the server never sees your secrets.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <SignedOut>
          <Link
            href="/sign-up"
            className="rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700"
          >
            Create account
          </Link>
          <Link
            href="/sign-in"
            className="rounded-lg border border-slate-300 px-5 py-2.5 font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Sign in
          </Link>
        </SignedOut>
        <SignedIn>
          <Link
            href="/vault"
            className="rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700"
          >
            Open your vault
          </Link>
        </SignedIn>
      </div>
    </main>
  );
}
