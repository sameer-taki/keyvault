"use client";

import { useEffect, useState } from "react";
import { useSupabaseClient } from "@/lib/supabase";

type Status =
  | { kind: "loading" }
  | { kind: "ok" }
  | { kind: "needs-migration" }
  | { kind: "auth-error"; detail: string }
  | { kind: "error"; detail: string };

/**
 * A trivial authenticated query that proves the Clerk -> Supabase token flow and
 * RLS are working. It selects the current user's own profile row; an empty result
 * is still a success (the request was authorized). Postgres error 42P01 means the
 * schema migration (Phase 2) hasn't been applied yet.
 */
export default function ConnectionCheck() {
  const supabase = useSupabaseClient();
  const [status, setStatus] = useState<Status>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { error } = await supabase.from("profiles").select("user_id").limit(1);
      if (cancelled) return;
      if (!error) {
        setStatus({ kind: "ok" });
      } else if (error.code === "42P01") {
        setStatus({ kind: "needs-migration" });
      } else if (/jwt|token|auth|permission/i.test(error.message)) {
        setStatus({ kind: "auth-error", detail: error.message });
      } else {
        setStatus({ kind: "error", detail: error.message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const styles = "rounded-lg border p-4 text-sm";
  switch (status.kind) {
    case "loading":
      return <div className={`${styles} border-slate-200 dark:border-slate-800`}>Checking…</div>;
    case "ok":
      return (
        <div className={`${styles} border-green-300 bg-green-50 text-green-800`}>
          ✓ Authenticated Supabase query succeeded under your Clerk identity.
        </div>
      );
    case "needs-migration":
      return (
        <div className={`${styles} border-amber-300 bg-amber-50 text-amber-800`}>
          ✓ Connected and authorized, but the schema isn’t applied yet. Run the Phase 2 migration
          (<code>supabase/migrations/0001_init.sql</code>).
        </div>
      );
    case "auth-error":
      return (
        <div className={`${styles} border-red-300 bg-red-50 text-red-800`}>
          ✗ Auth failed: {status.detail}. Check the Clerk↔Supabase third-party provider setup.
        </div>
      );
    default:
      return (
        <div className={`${styles} border-red-300 bg-red-50 text-red-800`}>
          ✗ Query error: {status.detail}
        </div>
      );
  }
}
