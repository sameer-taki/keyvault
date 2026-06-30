# CLAUDE.md — zero-knowledge vault (personal project)

A zero-knowledge password & secrets vault. Next.js on Vercel, Supabase for storage, Clerk for auth.

## Golden rule (read first)
This is a vault. The server must NEVER be able to read a user's secrets.
- ALL encryption/decryption happens client-side, only via `lib/vault-crypto.ts`. Never add a second crypto path.
- NEVER send the master password, the derived master key, or the unwrapped vault key to any server, API route, log, analytics, or error reporter.
- The vault key lives in React memory only (context/state). NEVER write it to localStorage, sessionStorage, cookies, or Supabase.
- Supabase stores ciphertext + non-secret metadata ONLY. A column that would hold a plaintext secret is a bug.
- The master password is NOT the Clerk login password. They are two separate secrets.

If you are ever unsure whether a change leaks a secret, STOP and ask the human. (These rules are loaded as context, not enforced policy — treat them as hard constraints anyway.)

## Architecture
- Clerk = identity + session (sign-in/up via Clerk components).
- Supabase Postgres = encrypted storage behind Row Level Security.
  - Clerk is wired in as a Supabase **third-party auth provider** (native integration; NOT the deprecated JWT template).
  - RLS keys on the Clerk user id: `auth.jwt() ->> 'sub'`. Do NOT use `auth.uid()` (returns a UUID — wrong for Clerk).
  - `user_id` columns are `text`, default `(auth.jwt() ->> 'sub')`.
  - The browser Supabase client passes the Clerk token via the `accessToken` callback.
- Vercel = hosting. Server-side code must stay secret-free.
- Do NOT use Supabase Edge Functions for authenticated queries (known RS256 issue with the Clerk integration). Use client-side queries + RLS.

## Tenancy
- MVP is single-user: tenant = user, owner-scoped rows. (Assumption — confirm before adding org features.)
- A future org/sharing layer will use Clerk Organizations (`org_id` claim) + asymmetric keys. Design schemas so it can be added later; do not build it yet.

## Stack & conventions
- Next.js App Router, TypeScript (strict), Tailwind. Functional components + hooks.
- Deps: `@clerk/nextjs`, `@supabase/supabase-js`, `hash-wasm` (Argon2id), Web Crypto (built-in).
- Layout: `app/` routes · `lib/` (vault-crypto, supabase client, clerk helpers) · `components/` UI · `supabase/migrations/` SQL.
- Secrets via env vars only; never commit `.env*`. Browser-exposed vars use the `NEXT_PUBLIC_` prefix.
- Prefer small, reviewable diffs. Keep unit tests for `lib/vault-crypto.ts` green.

## Commands
- `npm run dev` — local dev
- `npm run build` · `npm run lint` · `npm run typecheck`
- `npm test` — unit tests (crypto core first)
- Supabase CLI for migrations (`supabase db push`)

## Escalate to the human — don't decide alone
- Any change to `lib/vault-crypto.ts`, the KDF params, or the key hierarchy.
- Any change to RLS policies, the Clerk↔Supabase auth config, or the auth section of `supabase/config.toml`.
- Adding any dependency, especially anything crypto-related.
- Anything that writes user data to a new destination (a log, analytics, a third party).
- Before launching to anyone other than the developer — a security review is required first.
