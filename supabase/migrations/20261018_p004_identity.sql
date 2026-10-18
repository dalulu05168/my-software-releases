-- P004 isolated identity schema. Migration is NOT deployed.
create schema if not exists p004;
create table if not exists p004.accounts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete restrict,
  role text not null check (role in ('master','ops','client')),
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now()
);
create table if not exists p004.ops_clients (
  ops_account_id uuid not null references p004.accounts(id),
  client_account_id uuid not null references p004.accounts(id),
  primary key (ops_account_id, client_account_id),
  check (ops_account_id <> client_account_id)
);
create table if not exists p004.audit_events (
  id bigint generated always as identity primary key,
  actor_account_id uuid references p004.accounts(id),
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
alter table p004.accounts enable row level security;
alter table p004.ops_clients enable row level security;
alter table p004.audit_events enable row level security;
-- Intentionally no client-access policies. All access is denied to anon/authenticated
-- until separately reviewed server-derived identity policies are implemented.
revoke all on schema p004 from anon, authenticated;
revoke all on all tables in schema p004 from anon, authenticated;
