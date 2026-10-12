-- Prepared Live payment cycle. Apply only with separate production approval,
-- in a single transaction. No existing client data is rewritten.
create table public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  client_id bigint not null references public.clients(id),
  target_plan text not null check (target_plan in ('basic', 'pro', 'enterprise')),
  amount integer not null check (amount > 0),
  currency text not null default 'SAR' check (currency = 'SAR'),
  purchase_type text not null check (purchase_type in ('subscription', 'upgrade')),
  environment text not null check (environment = 'live'),
  baseline_plan text,
  baseline_status text,
  baseline_period_end timestamptz,
  status text not null default 'pending' check (status in ('pending', 'fulfilled', 'review', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '15 minutes',
  -- No client_secret is stored: only a fenced reservation and the provider ID.
  intent_generation uuid,
  intent_reserved_at timestamptz,
  intent_id uuid,
  check ((intent_generation is null) = (intent_reserved_at is null)),
  check (intent_id is null or intent_generation is not null),
  activated_at timestamptz,
  subscription_period_end timestamptz
);
create unique index payment_orders_one_pending_per_client
  on public.payment_orders(client_id) where status = 'pending';

create unique index payment_orders_unique_intent on public.payment_orders(intent_id) where intent_id is not null;

create table public.payments (
  id text primary key,
  order_id uuid not null references public.payment_orders(id),
  amount integer not null check (amount >= 0),
  currency text not null,
  environment text not null check (environment = 'live'),
  provider_status text not null,
  activation_status text not null default 'pending'
    check (activation_status in ('pending', 'applied', 'review', 'not_paid')),
  verified_at timestamptz not null default now(),
  applied_at timestamptz
);
create index payments_order_idx on public.payments(order_id);
create unique index payments_one_application_per_order
  on public.payments(order_id) where activation_status = 'applied';

alter table public.payment_orders enable row level security;
alter table public.payments enable row level security;
revoke all on public.payment_orders, public.payments from public, anon, authenticated;
grant select on public.payment_orders, public.payments to authenticated;
grant select, insert, update on public.payment_orders, public.payments to service_role;
create policy payment_orders_read_own on public.payment_orders
for select to authenticated using (exists (
  select 1 from public.clients c where c.id = client_id and c.user_id = (select auth.uid())
));
create policy payments_read_own on public.payments
for select to authenticated using (exists (
  select 1 from public.payment_orders o where o.id = order_id
));

-- Server-only: store an independently fetched provider response before activation.
-- Do not overwrite the ownership of an existing provider payment ID.
create function public.record_verified_payment(
  p_id text, p_order_id uuid, p_amount integer, p_currency text, p_status text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  existing_order uuid;
begin
  insert into public.payments(id, order_id, amount, currency, environment, provider_status, activation_status)
  values (p_id, p_order_id, p_amount, p_currency, 'live', p_status,
          case when p_status = 'paid' then 'pending' else 'not_paid' end)
  on conflict (id) do nothing;
  select order_id into existing_order from public.payments where id = p_id for update;
  if existing_order is distinct from p_order_id then
    raise check_violation using message = 'payment_order_mismatch';
  end if;
  update public.payments set provider_status = p_status, amount = p_amount, currency = p_currency, verified_at = now(),
    activation_status = case
      when activation_status in ('applied', 'review') then activation_status
      when p_status = 'paid' then 'pending' else 'not_paid' end
  where id = p_id;
end;
$$;

-- Idempotent transaction: fulfill once, or retain verified payment for review/retry.
create function public.apply_verified_payment(p_id text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  payment public.payments%rowtype;
  payment_order public.payment_orders%rowtype;
  account public.clients%rowtype;
  activation_time timestamptz;
  period_end timestamptz;
begin
  select * into payment from public.payments where id = p_id for update;
  if not found then raise check_violation using message = 'payment_not_verified'; end if;
  select * into payment_order from public.payment_orders where id = payment.order_id for update;
  if payment.activation_status = 'applied' then return 'fulfilled'; end if;
  if payment.provider_status <> 'paid' then return 'not_paid'; end if;
  if payment_order.status in ('fulfilled', 'review') or payment.activation_status = 'review' then
    update public.payments set activation_status = 'review' where id = p_id;
    return 'review';
  end if;
  if payment.amount <> payment_order.amount or payment.currency <> payment_order.currency
     or payment.environment <> payment_order.environment then
    update public.payments set activation_status = 'review' where id = p_id;
    update public.payment_orders set status = 'review' where id = payment_order.id;
    return 'review';
  end if;
  select * into account from public.clients where id = payment_order.client_id for update;
  if account.plan is distinct from payment_order.baseline_plan
     or account.subscription_status is distinct from payment_order.baseline_status
     or account.current_period_end is distinct from payment_order.baseline_period_end then
    update public.payments set activation_status = 'review' where id = p_id;
    update public.payment_orders set status = 'review' where id = payment_order.id;
    return 'review';
  end if;
  activation_time := clock_timestamp();
  if payment_order.purchase_type = 'upgrade' then
    if account.current_period_end is null or account.current_period_end <= activation_time then
      update public.payments set activation_status = 'review' where id = p_id;
      update public.payment_orders set status = 'review' where id = payment_order.id;
      return 'review';
    end if;
    period_end := account.current_period_end;
  else
    -- UTC makes calendar-month arithmetic independent of session timezone/DST.
    period_end := ((activation_time at time zone 'UTC') + interval '1 month') at time zone 'UTC';
  end if;
  update public.clients set plan = payment_order.target_plan,
    subscription_status = 'active', current_period_end = period_end
  where id = account.id;
  update public.payments set activation_status = 'applied', applied_at = activation_time where id = p_id;
  update public.payment_orders set status = 'fulfilled', activated_at = activation_time,
    subscription_period_end = period_end where id = payment_order.id;
  return 'fulfilled';
end;
$$;
revoke all on function public.record_verified_payment(text, uuid, integer, text, text)
  from public, anon, authenticated;
revoke all on function public.apply_verified_payment(text) from public, anon, authenticated;
grant execute on function public.record_verified_payment(text, uuid, integer, text, text) to service_role;
grant execute on function public.apply_verified_payment(text) to service_role;
