"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

/** Light/dark toggle. Theme is a non-secret UI preference, so persisting it to
 * localStorage is fine (unlike anything from the vault). */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* ignore storage failures */
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
    >
      {/* Avoid a hydration mismatch by not committing to an icon until mounted. */}
      {mounted ? (theme === "dark" ? "☀️" : "🌙") : "🌗"}
    </button>
  );
}
