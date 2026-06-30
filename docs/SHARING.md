# Phase 6 — organizations & sharing (design)

Status: **crypto layer + schema/RLS implemented and verified; UI is the remaining increment.**
This adds team sharing **without** weakening the zero-knowledge guarantee: the server still
cannot read shared secrets.

## Key model

```
member (per user)
  RSA-OAEP keypair
    public key   ── stored in clear (member_public_keys) — lets others wrap keys TO this member
    private key  ── exported (pkcs8), AES-GCM-encrypted under the member's VAULT key,
                    stored in member_private_keys. Only that member, once unlocked, can use it.

collection (a shared folder within a Clerk organization)
  collection key (random AES-GCM)
    encrypts the collection's items (same encrypt()/decrypt() as personal items)
    wrapped (RSA-OAEP) to EACH member's public key → one row per member in collection_members
```

To read a shared item, a member: unlocks their vault → decrypts their private key → RSA-unwraps
the collection key → AES-decrypts the item. The server only ever holds public keys, encrypted
private keys, per-member wrapped collection keys, and ciphertext.

Crypto primitives live in the single crypto module (`lib/vault-crypto.ts`):
`generateMemberKeypair`, `exportPublicKey`/`importPublicKey`, `wrapPrivateKey`/`unwrapPrivateKey`,
`generateCollectionKey`, `wrapCollectionKeyForMember`, `unwrapCollectionKeyWithPrivate`.
Covered by `lib/sharing-crypto.test.ts` (round-trips + cross-member isolation).

## Schema & RLS (`supabase/migrations/0002_orgs.sql`)

- `member_public_keys` — readable by any authenticated user (public keys are public); writable
  by the owner only.
- `member_private_keys` — owner-only for every operation.
- `collections` — visible to members of the active Clerk org (`auth.jwt()->>'org_id'`); created
  by org members; managed/deleted by the creator.
- `collection_members` — a member can always read their own wrap; org members can see the
  membership list and add/remove members. Each `wrapped_collection_key` is RSA-encrypted to its
  member, so reading another row's wrap is useless.
- `vault_items` gains nullable `org_id` + `collection_id`. The 0001 "own items" policy is
  untouched (personal items keep working); a new policy grants access to items in a collection
  the caller belongs to. **RLS gates row visibility to members; the collection key (held only by
  members) gates actual decryption** — defense in depth.

Verified against Postgres 16: org members read shared items and their own personal items;
a same-org non-member sees the collection exists but none of its items; a different-org user
sees nothing; private keys are never visible to other members; cross-member writes work.

## Clerk configuration

- Enable **Organizations** in Clerk and surface `<OrganizationSwitcher/>`.
- Ensure the session token includes org claims (`org_id`, `org_role`) when an org is active —
  RLS depends on `auth.jwt()->>'org_id'`.

## Remaining increment (UI)

1. `OrganizationSwitcher` in the vault header; a member-key bootstrap (generate keypair on first
   org use, store public + wrapped-private).
2. Collections list + "New collection"; share/unshare members (wrap the collection key to each
   member's public key).
3. Item editor: choose Personal vs a Collection; route encryption through the collection key when
   shared.
4. Health/search across personal + shared scopes.

## Notes / decisions to confirm

- Public keys are world-readable to authenticated users (enables user-id enumeration). Acceptable
  for the MVP; tighten later (e.g. expose only within shared orgs) if needed.
- Membership/role enforcement is coarse (any org member can add/remove). Consider gating writes by
  Clerk `org_role` (admin) before non-personal use.
- Rotating a collection key on member removal (to revoke access to future items) is recommended;
  past ciphertext a removed member already saw can't be retroactively protected.
