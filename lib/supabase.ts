"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useSession } from "@clerk/nextjs";
import { useMemo } from "react";
import type { Database } from "./database.types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export type VaultSupabaseClient = SupabaseClient<Database>;

/**
 * Browser Supabase client that authenticates as the current Clerk user.
 *
 * The `accessToken` callback hands Supabase the Clerk session JWT on every
 * request; Postgres RLS then scopes rows to `auth.jwt() ->> 'sub'`. We use the
 * anon key only — never the service_role key — so the browser can never bypass
 * RLS. This is wired to Clerk as a Supabase *third-party auth provider* (native
 * integration), NOT the deprecated JWT template.
 */
export function useSupabaseClient(): VaultSupabaseClient {
  const { session } = useSession();

  return useMemo(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. See SETUP.md.",
      );
    }
    return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      accessToken: async () => (await session?.getToken()) ?? null,
    });
    // Re-create when the session identity changes (sign-in / sign-out).
  }, [session]);
}
