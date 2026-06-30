"use client";

import { useState } from "react";
import { copySensitive, copyText } from "@/lib/clipboard";

interface Props {
  value: string;
  /** Auto-clear the clipboard after a timeout (use for passwords/secrets). */
  sensitive?: boolean;
  title?: string;
  className?: string;
}

/**
 * A small copy-to-clipboard button. Stops click propagation so it can sit inside
 * a clickable list row without triggering the row's action.
 */
export default function CopyButton({ value, sensitive, title = "Copy", className }: Props) {
  const [copied, setCopied] = useState(false);

  async function onClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (!value) return;
    try {
      await (sensitive ? copySensitive(value) : copyText(value));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard can be unavailable (permissions/insecure context); fail quietly.
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        title={sensitive ? `${title} (auto-clears)` : title}
        aria-label={title}
        className={
          className ??
          "rounded-lg border border-slate-300 px-2 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
        }
        disabled={!value}
      >
        {copied ? "✓" : "⧉"}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </>
  );
}
