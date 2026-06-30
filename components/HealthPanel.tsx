"use client";

import { useMemo } from "react";
import { computeHealth, type HealthIssue } from "@/lib/health";
import type { DecryptedItem } from "@/lib/items";

export default function HealthPanel({ items }: { items: DecryptedItem[] }) {
  const report = useMemo(() => computeHealth(items), [items]);
  const color =
    report.score >= 80 ? "text-green-600" : report.score >= 50 ? "text-amber-600" : "text-red-600";

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Vault health</h3>
        <span className={`text-2xl font-bold ${color}`}>{report.score}</span>
      </div>
      <p className="text-xs text-slate-500">
        Computed in your browser over {report.checked} credential(s). Nothing is sent anywhere.
      </p>

      {report.checked === 0 ? (
        <p className="text-sm text-slate-500">No logins or secrets to analyze yet.</p>
      ) : (
        <div className="space-y-3">
          <IssueGroup label="Weak" tone="red" issues={report.weak} />
          <IssueGroup label="Reused" tone="amber" issues={report.reused} />
          <IssueGroup label="Old" tone="slate" issues={report.old} />
          {report.weak.length + report.reused.length + report.old.length === 0 && (
            <p className="text-sm text-green-700">No issues found. Nicely done.</p>
          )}
        </div>
      )}
    </div>
  );
}

function IssueGroup({
  label,
  tone,
  issues,
}: {
  label: string;
  tone: "red" | "amber" | "slate";
  issues: HealthIssue[];
}) {
  if (issues.length === 0) return null;
  const dot = tone === "red" ? "bg-red-500" : tone === "amber" ? "bg-amber-500" : "bg-slate-400";
  return (
    <div>
      <p className="mb-1 flex items-center gap-2 text-sm font-medium">
        <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
        {label} ({issues.length})
      </p>
      <ul className="space-y-1 pl-4 text-sm text-slate-600 dark:text-slate-400">
        {issues.map((i, idx) => (
          <li key={`${i.itemId}-${idx}`} className="flex justify-between gap-3">
            <span className="truncate">{i.title}</span>
            <span className="shrink-0 text-xs text-slate-400">{i.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
