# Security model, threat model & pre-launch checklist

This is a **zero-knowledge** vault: the server stores ciphertext and a little non-secret
metadata, and never has the means to read a user's secrets. The golden rules live in
[../CLAUDE.md](../CLAUDE.md); this document explains the design and how to verify it.

## Key hierarchy

```
master password  ──Argon2id(salt, 64 MiB, t=3)──▶  master key  (AES-GCM, non-extractable)
   (user input, never stored/sent)                     │
                                                        │ wraps / unwraps
                                                        ▼
                                                   vault key  (random 256-bit AES-GCM)
                                                        │  in React memory ONLY while unlocked
                                                        │ encrypts / decrypts
                                                        ▼
                                                   vault items  (login / note / card / secret)
```

- The **master password** and **master key** never leave the browser and are never persisted.
- The **vault key** exists at rest ONLY in wrapped (encrypted) form, in `profiles.wrapped_vault_key`.
  At runtime it lives in React state only and is dropped on lock / idle / tab-hide / tab-close.
- Every ciphertext is `{ iv, data }` with a fresh random 96-bit IV and a 128-bit GCM tag.
- All of this is implemented in exactly one place: [`lib/vault-crypto.ts`](../lib/vault-crypto.ts).

## What the server (Supabase) can and cannot see

| Stored                                            | Visible to server? |
| ------------------------------------------------- | ------------------- |
| `vault_items.type` (`login`/`note`/`card`/`secret`) | Yes — metadata     |
| `vault_items.folder`                              | Yes — metadata      |
| `vault_items.blob` (title, username, password, …) | No — AES-GCM ciphertext |
| `profiles.salt`, `profiles.kdf`                   | Yes — non-secret KDF params |
| `profiles.wrapped_vault_key`                      | No — encrypted under the master key |
| master password / master key / unwrapped vault key | Never stored or transmitted |

Row-Level Security scopes every row to the Clerk user (`auth.jwt()->>'sub'`). This was
verified against Postgres with a two-user isolation test (see the Phase 2 commit).

## Recovery — read this before relying on the vault

**A lost master password is unrecoverable by design.** Because we never see it and never store
it, there is no reset, no backdoor, and no support path that can recover your data. If you
forget it, the ciphertext is permanently undecryptable.

Mitigations the app provides:
- The setup screen requires you to explicitly acknowledge this before creating the vault.
- **Encrypted export** (Backup panel) lets you keep an offline, password-protected copy. Store
  your master password (and any export password) in a safe place — a physical record or a second
  trusted password manager.

## Transport & app hardening

- Strict security headers in [`next.config.mjs`](../next.config.mjs): HSTS, `X-Frame-Options:
  DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, a locked-down
  `Permissions-Policy`, and a **Content-Security-Policy** that only allows `self`, Clerk, and your
  Supabase project (derived from env).
- No analytics, no third-party error reporting, no logging of secrets. There are zero `console.*`
  calls in `app/`, `components/`, or `lib/`. Secrets are never put in URLs, query strings, or
  server components.
- **Known follow-up:** the CSP uses `'unsafe-inline'` for scripts/styles (required by Next.js and
  Tailwind out of the box). Tightening to a nonce-based CSP via middleware is the recommended next
  hardening step before any non-personal launch.

## Pre-launch security checklist

- [ ] `npm test` green (crypto round-trip, wrong-password rejection, fresh IVs, generator, health, backup).
- [ ] `npm run typecheck` and `npm run lint` clean.
- [ ] RLS verified with two real users — neither can see the other's rows.
- [ ] Clerk↔Supabase uses the **native third-party** integration (not the JWT template).
- [ ] Only the Supabase **anon** key is deployed; `service_role` is not in the app or client env.
- [ ] DevTools check: after unlock, the master password / vault key never appear in network
      requests, `localStorage`, `sessionStorage`, cookies, or IndexedDB.
- [ ] CSP verified in the browser console (no violations) against the real Clerk + Supabase hosts.
- [ ] Master-password irrecoverability is clearly communicated to every user.
- [ ] **Independent security review completed** — required before any non-personal use
      (see [CLAUDE.md](../CLAUDE.md): launch gating).

## Privacy & legal context (Fiji)

This project is operated from Fiji (`.fj`). The design is intended to align with Fiji's
constitutional protection of personal privacy:

- **Constitution of Fiji 2013, s.24** guarantees the right to personal privacy, including the
  **confidentiality of personal information** and communications. A zero-knowledge architecture
  is a strong technical expression of that right: personal data is confidential even from the
  operator.
- Fiji does **not** yet have a single comprehensive data-protection statute equivalent to the
  GDPR; privacy protection is primarily constitutional, with sectoral provisions. Treat data
  minimisation (we store only ciphertext + minimal metadata) and purpose limitation as the
  operating baseline.
- **Before any non-personal / commercial use**, confirm current obligations with Fijian legal
  counsel — the legislative landscape is evolving (digital-ID and privacy-bill activity), and
  consider where Supabase hosts data (data-residency) relative to your requirements.

Sources:
[DLA Piper — Data Protection Laws of the World: Fiji](https://www.dlapiperdataprotection.com/index.html?t=law&c=FJ) ·
[Constitution of Fiji 2013, s.24 (privacy)](https://www.laws.gov.fj/) ·
[Information Act 2018 (Laws of Fiji)](https://www.laws.gov.fj/Acts/DisplayAct/2460)

> This section is engineering context, not legal advice.
