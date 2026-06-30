-- 0001_init.sql — profiles + vault_items, owner-scoped by Clerk user id.
--
-- IMPORTANT (Clerk + Supabase third-party auth):
--   user_id is TEXT and defaults to the Clerk subject claim, auth.jwt()->>'sub'.
--   RLS policies key on auth.jwt()->>'sub'. Do NOT use auth.uid() — it returns a
--   UUID and is wrong for Clerk-issued tokens.
--
-- The server stores ciphertext + non-secret metadata ONLY. No column here ever
-- holds a plaintext secret or the vault key in unwrapped form.

create table if not exists profiles (
  user_id           text primary key default (auth.jwt()->>'sub'),
  salt              text  not null,        -- base64 per-user KDF salt
  wrapped_vault_key jsonb not null,        -- { iv, data } from wrapVaultKey()
  kdf               jsonb not null,        -- KDF_PARAMS snapshot (so params can evolve)
  created_at        timestamptz not null default now()
);

create table if not exists vault_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null default (auth.jwt()->>'sub'),
  type       text not null,               -- 'login' | 'note' | 'card' | 'secret'
  folder     text,                        -- non-secret metadata only
  blob       jsonb not null,              -- { iv, data } ciphertext from encrypt()
  updated_at timestamptz not null default now()
);

-- RLS-filtered list queries always scope by user_id.
create index if not exists vault_items_user_id_idx on vault_items (user_id);

alter table profiles    enable row level security;
alter table vault_items enable row level security;

-- Profiles: a user may read/insert/update only their own row.
create policy "own profile select" on profiles for select to authenticated
  using ((select auth.jwt()->>'sub') = user_id);
create policy "own profile insert" on profiles for insert to authenticated
  with check ((select auth.jwt()->>'sub') = user_id);
create policy "own profile update" on profiles for update to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

-- Vault items: full CRUD on rows the user owns; cannot read or write others'.
create policy "own items all" on vault_items for all to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);

-- Keep updated_at fresh on every write (clients don't set it).
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger vault_items_set_updated_at
  before update on vault_items
  for each row execute function set_updated_at();
