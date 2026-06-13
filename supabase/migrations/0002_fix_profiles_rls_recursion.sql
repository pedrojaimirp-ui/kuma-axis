-- Fixes "infinite recursion detected in policy for relation 'profiles'" (42P17).
-- The original admin-check policies queried public.profiles from within a
-- policy on public.profiles itself, which re-triggers RLS recursively.
-- This introduces a security definer helper that bypasses RLS for the
-- admin/owner check, and rewrites the affected policies to use it.

create function public.is_admin_or_owner()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'owner')
  );
$$ language sql security definer stable set search_path = public;

grant execute on function public.is_admin_or_owner() to authenticated;

drop policy "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (
    auth.uid() = id
    or public.is_admin_or_owner()
  );

drop policy "orders_select_own_or_admin" on public.orders;
create policy "orders_select_own_or_admin" on public.orders
  for select using (
    user_id = auth.uid()
    or public.is_admin_or_owner()
  );

drop policy "orders_update_admin" on public.orders;
create policy "orders_update_admin" on public.orders
  for update using (public.is_admin_or_owner());

drop policy "platform_settings_select_admin" on public.platform_settings;
create policy "platform_settings_select_admin" on public.platform_settings
  for select using (public.is_admin_or_owner());
