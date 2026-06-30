"use client";

import { useCallback, useEffect, useState } from "react";
import { generatePassword, type GenOptions } from "@/lib/password";
import StrengthMeter from "./StrengthMeter";

const DEFAULTS: GenOptions = {
  length: 20,
  lowercase: true,
  uppercase: true,
  numbers: true,
  symbols: true,
};

const TOGGLES: { key: keyof Omit<GenOptions, "length">; label: string }[] = [
  { key: "lowercase", label: "a-z" },
  { key: "uppercase", label: "A-Z" },
  { key: "numbers", label: "0-9" },
  { key: "symbols", label: "!@#" },
];

export default function PasswordGenerator({ onUse }: { onUse?: (password: string) => void }) {
  const [opts, setOpts] = useState<GenOptions>(DEFAULTS);
  const [value, setValue] = useState("");
  const [copied, setCopied] = useState(false);

  const regenerate = useCallback(() => setValue(generatePassword(opts)), [opts]);

  useEffect(() => {
    regenerate();
  }, [regenerate]);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <div className="flex items-center gap-2">
        <code className="flex-1 break-all rounded bg-slate-100 px-2 py-1.5 font-mono text-sm dark:bg-slate-800">
          {value}
        </code>
        <button type="button" onClick={regenerate} className={iconBtn} title="Regenerate">
          ↻
        </button>
        <button type="button" onClick={copy} className={iconBtn} title="Copy">
          {copied ? "✓" : "⧉"}
        </button>
      </div>

      <StrengthMeter password={value} />

      <div className="flex items-center gap-3 text-sm">
        <label className="flex flex-1 items-center gap-2">
          <span className="w-16 text-slate-500">Length {opts.length}</span>
          <input
            type="range"
            min={8}
            max={64}
            value={opts.length}
            onChange={(e) => setOpts((o) => ({ ...o, length: Number(e.target.value) }))}
            className="flex-1"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        {TOGGLES.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={opts[key]}
              onChange={(e) => setOpts((o) => ({ ...o, [key]: e.target.checked }))}
            />
            {label}
          </label>
        ))}
      </div>

      {onUse && (
        <button
          type="button"
          onClick={() => onUse(value)}
          className="w-full rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          Use this password
        </button>
      )}
    </div>
  );
}

const iconBtn =
  "rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800";
