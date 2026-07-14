-- ============================================================
--  2137 Rent Book — database schema (Supabase / Postgres)
--  Run this in the Supabase SQL editor on a fresh project.
--  Creates tables, computed totals, a status view, and
--  row-level security so only signed-in members can read/write.
-- ============================================================

-- ---------- extensions ----------
create extension if not exists "pgcrypto";      -- for gen_random_uuid()

-- ============================================================
--  MEMBERS  (the allow-list: who is allowed into this rent book)
--  You add a row here for each person after they sign up.
--  Two rows to start: you (owner) and your bookkeeper.
-- ============================================================
create table if not exists members (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  email    text,
  role     text not null default 'staff' check (role in ('owner','staff')),
  added_at timestamptz not null default now()
);

-- Helper: is the current signed-in user a member?
create or replace function is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where user_id = auth.uid());
$$;

-- ============================================================
--  TENANTS
-- ============================================================
create table if not exists tenants (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  unit          text not null,
  beds          text default '2BR',
  lease_rent    numeric(10,2) not null default 0,
  deposit       numeric(10,2) default 0,
  lease_start   date,
  lease_end     date,
  program       text default 'Section 8',
  govt_default  numeric(10,2) default 0,     -- usual govt share
  portion_default numeric(10,2) default 0,   -- usual tenant share
  phone         text,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ============================================================
--  PARKING SPOTS
-- ============================================================
create table if not exists parking_spots (
  id      uuid primary key default gen_random_uuid(),
  name    text not null,
  spot    text not null,
  amount  numeric(10,2) not null default 0,
  method  text default 'Zelle'
);

-- ============================================================
--  PAYMENTS  (one row per tenant per month)
--  total is computed automatically. Confirmed / variance are
--  derived in the payment_status view below (they need lease_rent).
-- ============================================================
create table if not exists payments (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  month        text not null,                       -- 'YYYY-MM'
  govt         numeric(10,2) not null default 0,
  portion      numeric(10,2) not null default 0,
  assistance   numeric(10,2) not null default 0,
  check_num    text,
  bank_confirm boolean not null default false,
  notes        text,
  total        numeric(10,2) generated always as (govt + portion + assistance) stored,
  updated_at   timestamptz not null default now(),
  updated_by   uuid references auth.users(id),
  unique (tenant_id, month)
);
create index if not exists payments_month_idx on payments(month);

-- ============================================================
--  PARKING PAYMENTS  (one row per spot per month)
-- ============================================================
create table if not exists parking_payments (
  id        uuid primary key default gen_random_uuid(),
  spot_id   uuid not null references parking_spots(id) on delete cascade,
  month     text not null,
  paid      boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (spot_id, month)
);

-- ============================================================
--  RENT TERMS  (effective-dated govt/tenant split per tenant)
--  Each dated term sets the expected split from that date forward;
--  the arrears ledger uses the earliest term as the tenant's start,
--  so a tenant contributes no history before their lease begins.
-- ============================================================
create table if not exists rent_terms (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  effective_from  date not null,
  lease_rent      numeric(10,2) not null default 0,
  govt_expected   numeric(10,2) not null default 0,
  tenant_expected numeric(10,2) not null default 0,
  note            text,
  created_at      timestamptz not null default now()
);
create index if not exists rent_terms_tenant_idx on rent_terms(tenant_id, effective_from);

-- ============================================================
--  EXPENSES  (building- or unit-level spend)
-- ============================================================
create table if not exists expenses (
  id         uuid primary key default gen_random_uuid(),
  spent_on   date not null,
  amount     numeric(10,2) not null default 0,
  category   text,
  vendor     text,
  unit       text,
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists expenses_spent_on_idx on expenses(spent_on);

-- ============================================================
--  NOTES / LOG  (shared building + per-tenant notes)
--  tenant_id null = building-wide log entry.
-- ============================================================
create table if not exists notes (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid references tenants(id) on delete cascade,
  body         text not null,
  author_email text,
  created_at   timestamptz not null default now()
);
create index if not exists notes_tenant_idx on notes(tenant_id);

-- ============================================================
--  VIEW: payment_status
--  Joins payments to their tenant and computes the same logic
--  your spreadsheet did: variance and paid/partial/owed status.
-- ============================================================
create or replace view payment_status as
select
  p.id, p.tenant_id, t.name, t.unit, t.program, p.month,
  p.govt, p.portion, p.assistance, p.total,
  t.lease_rent,
  (p.total - t.lease_rent)                         as variance,
  p.check_num, p.bank_confirm, p.notes,
  case
    when p.total <= 0.001                    then 'owed'
    when p.total - t.lease_rent >= -0.5      then 'paid'
    else 'partial'
  end as status
from payments p
join tenants t on t.id = p.tenant_id;

-- ============================================================
--  Keep updated_at / updated_by fresh on every write
-- ============================================================
create or replace function touch_payment() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;
drop trigger if exists trg_touch_payment on payments;
create trigger trg_touch_payment before insert or update on payments
  for each row execute function touch_payment();

-- ============================================================
--  ROW-LEVEL SECURITY
--  Nobody touches anything unless they are in the members table.
-- ============================================================
alter table members          enable row level security;
alter table tenants          enable row level security;
alter table parking_spots    enable row level security;
alter table payments         enable row level security;
alter table parking_payments enable row level security;
alter table rent_terms       enable row level security;
alter table expenses         enable row level security;
alter table notes            enable row level security;

-- members: a signed-in user may see their own membership row;
-- only an owner may add/remove members.
create policy members_self_read on members
  for select using (user_id = auth.uid() or is_member());
create policy members_owner_write on members
  for all using (exists (select 1 from members m where m.user_id = auth.uid() and m.role = 'owner'))
  with check (exists (select 1 from members m where m.user_id = auth.uid() and m.role = 'owner'));

-- all data tables: full read/write for any member.
create policy tenants_rw on tenants
  for all using (is_member()) with check (is_member());
create policy parking_rw on parking_spots
  for all using (is_member()) with check (is_member());
create policy payments_rw on payments
  for all using (is_member()) with check (is_member());
create policy parking_pay_rw on parking_payments
  for all using (is_member()) with check (is_member());
create policy rent_terms_rw on rent_terms
  for all using (is_member()) with check (is_member());
create policy expenses_rw on expenses
  for all using (is_member()) with check (is_member());
create policy notes_rw on notes
  for all using (is_member()) with check (is_member());

-- ============================================================
--  REALTIME  (live sync)
--  Add the data tables to Supabase's realtime publication so the
--  app receives insert/update/delete events over the websocket and
--  every signed-in device stays in sync without a refresh. RLS still
--  applies to the stream, so non-members receive nothing.
--  Idempotent and safe if some tables (rent_terms/expenses/notes)
--  live in a separate migration.
-- ============================================================
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'tenants','parking_spots','payments','parking_payments','rent_terms','expenses','notes'
  ] loop
    if to_regclass('public.' || tbl) is not null
       and not exists (
         select 1 from pg_publication_tables
         where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = tbl
       ) then
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    end if;
  end loop;
end $$;

-- Done. Next: run seed.sql to load the 2137 roster.
