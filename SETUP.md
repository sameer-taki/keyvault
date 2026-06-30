# Setup — what you need to provide

The app is code-complete. To run it for real you need three accounts (Clerk, Supabase,
Vercel) and a few values from each. Nothing here requires secrets in the repo — everything
goes through env vars (`.env.local` locally, Vercel project settings in prod).

## TL;DR — values to send me / put in env

| Variable                            | Where to get it                                            |
| ----------------------------------- | ---------------------------------------------------------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → API Keys                                 |
| `CLERK_SECRET_KEY`                  | Clerk Dashboard → API Keys                                 |
| `CLERK_DOMAIN`                      | Clerk Frontend API domain, e.g. `xxx.clerk.accounts.dev`   |
| `NEXT_PUBLIC_SUPABASE_URL`          | Supabase → Project Settings → API → Project URL            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`     | Supabase → Project Settings → API → `anon` public key      |

> Only the **anon** Supabase key. Never put the `service_role` key in this app — it bypasses
> RLS and would break the security model.

Copy `.env.example` to `.env.local` and fill these in.

## 1. Clerk (auth)

1. Create an application at https://dashboard.clerk.com.
2. Copy the **Publishable key** and **Secret key** into the env vars above.
3. Note your **Frontend API domain** (looks like `pleasant-cat-12.clerk.accounts.dev`, or your
   custom domain in production) → `CLERK_DOMAIN`.
4. Email/password is enough for the MVP; add social providers if you like.

## 2. Supabase (encrypted storage)

1. Create a project at https://supabase.com/dashboard. Copy the **Project URL** and **anon key**.
2. **Wire Clerk in as a third-party auth provider (native integration):**
   - In Clerk, open the **"Connect with Supabase"** page and activate it — this adds the
     `role: authenticated` claim to Clerk tokens.
   - In Supabase: **Authentication → Sign In / Up → Third Party Auth → Add Clerk**, using your
     Clerk domain. (Native integration — do **not** use the deprecated JWT-template approach.)
   - For local dev, `supabase/config.toml` already has `[auth.third_party.clerk]`; set
     `CLERK_DOMAIN` in your shell before `supabase start`.
3. **Apply the schema:** run `supabase/migrations/0001_init.sql` via `supabase db push`
   (CLI) or paste it into the Supabase SQL editor.
4. Verify RLS: sign in and open `/vault`; the connection should work and only your own rows
   are ever visible (policies key on `auth.jwt()->>'sub'`).

> Do **not** use Supabase Edge Functions for authenticated queries — there's a known RS256
> validation issue with the Clerk third-party integration. This app uses client-side queries
> + RLS only.

## 3. Vercel (hosting)

1. Import the repo at https://vercel.com.
2. Add all five env vars (and `CLERK_DOMAIN`) in **Project → Settings → Environment Variables**.
3. Deploy. The build runs `next build`; security headers (incl. CSP) are emitted automatically
   and the CSP is derived from `NEXT_PUBLIC_SUPABASE_URL` + `CLERK_DOMAIN`.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the values above
npm run dev                  # http://localhost:3000
npm test                     # crypto + generator + health + backup unit tests
npm run typecheck && npm run lint
```

## First run

1. Sign up (Clerk).
2. You'll be prompted to **set a master password** — this is separate from your Clerk login and
   is what actually encrypts your vault. **It cannot be recovered if lost** (see
   [docs/SECURITY.md](./docs/SECURITY.md)).
3. Add items, generate passwords, check vault health, and create an encrypted backup.
