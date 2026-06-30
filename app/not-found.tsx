import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="text-4xl" aria-hidden>
        🔒
      </span>
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="max-w-sm text-slate-600 dark:text-slate-400">
        This page doesn’t exist. Your vault is safe and sound.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700"
      >
        Go home
      </Link>
    </main>
  );
}
