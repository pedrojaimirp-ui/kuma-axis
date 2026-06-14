-- RLS hardening: close direct-table-write gaps ----------------------------

-- Gap 1: withdrawal_requests allowed direct INSERT with arbitrary amount/
-- fee_amount/net_amount/status, bypassing request_withdrawal's balance
-- check. request_withdrawal is security definer and does not need this
-- policy — drop it. With no insert policy and RLS enabled, direct inserts
-- by authenticated users are denied by default.
drop policy "withdrawal_requests_insert_own" on public.withdrawal_requests;

-- Gap 2: profiles_update_own has no with check, so a user could PATCH
-- their own referred_by to redirect future commissions to a different
-- upline. Block changes to referred_by the same way role-escalation is
-- already blocked.
create function public.prevent_referral_change()
returns trigger as $$
begin
  if new.referred_by is distinct from old.referred_by and auth.role() = 'authenticated' then
    raise exception 'Cannot change referred_by';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger profiles_prevent_referral_change
  before update on public.profiles
  for each row execute procedure public.prevent_referral_change();

-- Gap 3: orders_insert_own allowed inserting an order directly with
-- status = 'paid'. createOrder always inserts 'pending_payment' — enforce
-- that at the policy level too.
drop policy "orders_insert_own" on public.orders;
create policy "orders_insert_own" on public.orders
  for insert with check (user_id = auth.uid() and status = 'pending_payment');
