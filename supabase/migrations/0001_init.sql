-- profiles --------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text not null unique,
  referral_code text not null unique,
  referred_by uuid references public.profiles (id),
  role text not null default 'user' check (role in ('user', 'admin', 'owner')),
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index profiles_referred_by_idx on public.profiles (referred_by);

alter table public.profiles enable row level security;

-- security definer function to check admin/owner role without triggering
-- RLS recursion on public.profiles (policies cannot safely query their own
-- table directly).
create function public.is_admin_or_owner()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'owner')
  );
$$ language sql security definer stable set search_path = public;

grant execute on function public.is_admin_or_owner() to authenticated;

create policy "profiles_select_own_or_admin" on public.profiles
  for select using (
    auth.uid() = id
    or public.is_admin_or_owner()
  );

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- prevent authenticated users from escalating their own role via the app.
-- direct SQL editor / migration connections (auth.role() is null, no JWT
-- claims) and service_role connections are still allowed to change role,
-- which is required for the manual admin/owner promotion in Task 15.
create function public.prevent_role_self_escalation()
returns trigger as $$
begin
  if new.role <> old.role and auth.role() = 'authenticated' then
    raise exception 'Cannot change your own role';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger profiles_prevent_role_escalation
  before update on public.profiles
  for each row execute procedure public.prevent_role_self_escalation();

-- auto-create profile row on signup -------------------------------------
create function public.handle_new_user()
returns trigger as $$
declare
  referred_by_id uuid;
begin
  begin
    referred_by_id := (new.raw_user_meta_data->>'referred_by')::uuid;
  exception when invalid_text_representation then
    referred_by_id := null;
  end;

  insert into public.profiles (id, full_name, phone, referral_code, referred_by, terms_accepted_at)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'referral_code',
    referred_by_id,
    now()
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- resolve a referral code to a profile id, callable by anon --------------
create function public.resolve_referral_code(code text)
returns uuid as $$
  select id from public.profiles where referral_code = code;
$$ language sql security definer stable set search_path = public;

grant execute on function public.resolve_referral_code(text) to anon, authenticated;

-- packages ----------------------------------------------------------------
create table public.packages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  price numeric not null,
  bags int not null,
  commissions_json jsonb not null,
  daily_spins int not null,
  referral_spins int not null,
  activation_requirement jsonb
);

alter table public.packages enable row level security;

create policy "packages_select_all" on public.packages
  for select using (true);

insert into public.packages (code, name, price, bags, commissions_json, daily_spins, referral_spins, activation_requirement)
values
  ('kuma1', 'KUMA 1', 75000, 2, '{"L1": 5000, "L2": 2000, "L3": 3500, "L4": 1000}', 1, 1, null),
  ('kuma2', 'KUMA 2', 170000, 4, '{"L1": 12000, "L2": 3000, "L3": 4500, "L4": 1000}', 2, 1, null),
  ('kuma3', 'KUMA 3', 280000, 6, '{"L1": 20000, "L2": 5000, "L3": 7000, "L4": 2000}', 3, 1, '{"min_direct_referrals": 10}');

-- orders --------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  package_id uuid not null references public.packages (id),
  shipping_address jsonb not null,
  auto_renew boolean not null default false,
  status text not null default 'pending_payment' check (status in ('pending_payment', 'paid', 'rejected')),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

create policy "orders_select_own_or_admin" on public.orders
  for select using (
    user_id = auth.uid()
    or public.is_admin_or_owner()
  );

create policy "orders_insert_own" on public.orders
  for insert with check (user_id = auth.uid());

create policy "orders_update_admin" on public.orders
  for update using (public.is_admin_or_owner());

-- platform settings -----------------------------------------------------
create table public.platform_settings (
  id int primary key default 1,
  owner_commission_percent numeric not null default 5,
  constraint platform_settings_single_row check (id = 1)
);

alter table public.platform_settings enable row level security;

create policy "platform_settings_select_admin" on public.platform_settings
  for select using (public.is_admin_or_owner());

insert into public.platform_settings (id, owner_commission_percent) values (1, 5);
