"use client";

import { estimateStrength } from "@/lib/password";

const BAR_COLORS = ["bg-slate-200", "bg-red-500", "bg-amber-500", "bg-lime-500", "bg-green-600"];

export default function StrengthMeter({ password }: { password: string }) {
  const { score, label, bits } = estimateStrength(password);
  return (
    <div className="space-y-1">
      <div className="flex gap-1" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded ${i <= score ? BAR_COLORS[score] : "bg-slate-200 dark:bg-slate-700"}`}
          />
        ))}
      </div>
      <p className="text-xs text-slate-500">
        Strength: {label}
        {password ? ` · ~${bits} bits` : ""}
      </p>
    </div>
  );
}
