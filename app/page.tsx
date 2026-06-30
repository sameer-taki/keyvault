import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import ThemeToggle from "@/components/ThemeToggle";

const FEATURES = [
  ["🔐", "Zero-knowledge", "Everything is encrypted in your browser. The server only ever stores ciphertext."],
  ["🔑", "Master password", "A single password unlocks your vault — separate from your sign-in, never sent anywhere."],
  ["🧮", "Strong crypto", "Argon2id key derivation + AES-GCM, with a built-in password generator."],
  ["📦", "Encrypted backup", "Export a password-protected file and import it anywhere — no plaintext leaves your device."],
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between p-4">
        <span className="font-semibold">🔒 Biz Key Vault</span>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-10 p-8 text-center">
        <div className="max-w-xl space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Your secrets, only yours.</h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            A zero-knowledge password &amp; secrets vault. Everything is encrypted in your browser
            before it&rsquo;s stored &mdash; the server never sees your secrets.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
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
        </div>

        <ul className="grid max-w-3xl gap-4 text-left sm:grid-cols-2">
          {FEATURES.map(([icon, title, desc]) => (
            <li
              key={title}
              className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <p className="font-medium">
                <span className="mr-2" aria-hidden>
                  {icon}
                </span>
                {title}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{desc}</p>
            </li>
          ))}
        </ul>
      </main>

      <footer className="p-6 text-center text-xs text-slate-500">
        A lost master password is unrecoverable by design.
      </footer>
    </div>
  );
}
