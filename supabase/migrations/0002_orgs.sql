-- 0002_orgs.sql — organizations & sharing (Phase 6), additive and zero-knowledge.
--
-- Builds on 0001. The single-user model is untouched: personal items have
-- collection_id IS NULL and keep working exactly as before. Sharing is layered on
-- via per-member RSA keypairs + per-collection AES keys wrapped to each member.
--
-- Clerk org claims: policies key on auth.jwt()->>'org_id' (the ACTIVE organization
-- in the Clerk session token) alongside auth.jwt()->>'sub'. Configure Clerk so org
-- claims are present when an organization is active.
--
-- The server still stores ciphertext + public keys + non-secret metadata ONLY. A
-- wrapped_private_key is encrypted under the member's vault key; a
-- wrapped_collection_key is RSA-encrypted to a member's public key. Neither is
-- usable by the server.

-- Public keys: readable by any authenticated user (public keys are, by definition,
-- public — they only let others wrap secrets TO that member). Writable by the owner.
create table if not exists member_public_keys (
  user_id    text primary key default (auth.jwt()->>'sub'),
  public_key text not null,                 -- base64 SPKI
  created_at timestamptz not null default now()
);

-- Private keys at rest: encrypted under the owner's vault key. Owner-only, every op.
create table if not exists member_private_keys (
  user_id             text primary key default (auth.jwt()->>'sub'),
  wrapped_private_key jsonb not null,        -- { iv, data } under the member's vault key
  created_at          timestamptz not null default now()
);

create table if not exists collections (
  id         uuid primary key default gen_random_uuid(),
  org_id     text not null,                  -- Clerk org id
  name       text not null,                  -- non-secret label
  created_by text not null default (auth.jwt()->>'sub'),
  created_at timestamptz not null default now()
);

-- The collection key, wrapped once per member (RSA-OAEP to their public key).
create table if not exists collection_members (
  collection_id          uuid not null references collections(id) on delete cascade,
  user_id                text not null,       -- the member this wrap is for
  org_id                 text not null,       -- denormalized for RLS
  wrapped_collection_key text not null,       -- base64 RSA-OAEP(collection key)
  added_by               text not null default (auth.jwt()->>'sub'),
  created_at             timestamptz not null default now(),
  primary key (collection_id, user_id)
);

-- Shared items live in vault_items with collection_id set; personal items keep NULL.
alter table vault_items add column if not exists org_id text;
alter table vault_items add column if not exists collection_id uuid
  references collections(id) on delete set null;

create index if not exists vault_items_collection_idx on vault_items (collection_id);
create index if not exists collection_members_user_idx on collection_members (user_id);

alter table member_public_keys  enable row level security;
alter table member_private_keys enable row level security;
alter table collections         enable row level security;
alter table collection_members  enable row level security;

-- Public keys: anyone signed in can read; you manage only your own.
create policy "public keys readable" on member_public_keys for select to authenticated
  using (true);
create policy "own public key insert" on member_public_keys for insert to authenticated
  with check ((select auth.jwt()->>'sub') = user_id);
create policy "own public key update" on member_public_keys for update to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

-- Private keys: strictly owner-only.
create policy "own private key all" on member_private_keys for all to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);

-- Collections: visible to members of the active org; created within the active org.
create policy "collections in my org" on collections for select to authenticated
  using ((select auth.jwt()->>'org_id') = org_id);
create policy "create collection in my org" on collections for insert to authenticated
  with check (
    (select auth.jwt()->>'org_id') = org_id and (select auth.jwt()->>'sub') = created_by
  );
create policy "creator manages collection" on collections for update to authenticated
  using ((select auth.jwt()->>'sub') = created_by);
create policy "creator deletes collection" on collections for delete to authenticated
  using ((select auth.jwt()->>'sub') = created_by);

-- Collection memberships: a member can always read their own wrap; org members can
-- see the membership list (each wrap is RSA-encrypted to its member, so reading
-- another row's wrap is useless). Org members can add/remove members.
create policy "memberships visible" on collection_members for select to authenticated
  using (
    (select auth.jwt()->>'sub') = user_id or (select auth.jwt()->>'org_id') = org_id
  );
create policy "members add members" on collection_members for insert to authenticated
  with check (
    (select auth.jwt()->>'org_id') = org_id and (select auth.jwt()->>'sub') = added_by
  );
create policy "members remove members" on collection_members for delete to authenticated
  using ((select auth.jwt()->>'org_id') = org_id);

-- vault_items: in addition to the existing "own items all" policy (0001), allow full
-- access to items in a collection the caller belongs to. RLS gates row visibility to
-- members; the collection key (held only by members) gates actual decryption.
create policy "collection items for members" on vault_items for all to authenticated
  using (
    collection_id is not null and exists (
      select 1 from collection_members cm
      where cm.collection_id = vault_items.collection_id
        and cm.user_id = (select auth.jwt()->>'sub')
    )
  )
  with check (
    collection_id is not null
    and org_id = (select auth.jwt()->>'org_id')
    and exists (
      select 1 from collection_members cm
      where cm.collection_id = vault_items.collection_id
        and cm.user_id = (select auth.jwt()->>'sub')
    )
  );
