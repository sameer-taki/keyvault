# Biz Key Vault

A **zero-knowledge** password & secrets vault. All encryption and decryption happens in your
browser; the server only ever stores ciphertext and non-secret metadata.

- **Frontend / hosting:** Next.js (App Router) on Vercel
- **Auth:** Clerk
- **Storage:** Supabase Postgres behind Row Level Security
- **Crypto:** Argon2id (via `hash-wasm`) + AES‑GCM (Web Crypto) — see `lib/vault-crypto.ts`

> The master password is **separate** from your Clerk login and is **never** sent anywhere.
> A lost master password is **unrecoverable by design.**

## Features

- Master-password unlock with Argon2id key derivation; vault key held in memory only.
- Auto-lock on idle, tab-hide, and tab-close.
- Items: logins, secure notes, cards, secrets — all encrypted client-side (only `type` and
  `folder` are stored as plaintext metadata).
- In-memory search, crypto-backed password generator, and edit/delete with optimistic UI.
- Client-side vault-health report (weak / reused / old credentials).
- Password-protected **encrypted export/import** (no plaintext ever written to the file).
- Strict security headers + CSP; no analytics, no secret logging.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Clerk + Supabase values (see SETUP.md)
npm run dev
```

Open http://localhost:3000.

## Scripts

| Command             | What it does                          |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Local dev server                      |
| `npm run build`     | Production build                      |
| `npm run start`     | Serve the production build            |
| `npm run lint`      | ESLint (next/core-web-vitals)         |
| `npm run typecheck` | `tsc --noEmit` (strict)               |
| `npm test`          | Vitest unit tests (crypto core first) |
| `npm run format`    | Prettier write                        |

## What you need to provide

External credentials and one-time dashboard setup are documented in **[SETUP.md](./SETUP.md)**.

## Security model

See **[CLAUDE.md](./CLAUDE.md)** for the golden rules and **[docs/SECURITY.md](./docs/SECURITY.md)**
for the threat model, key hierarchy, and the pre-launch checklist.
