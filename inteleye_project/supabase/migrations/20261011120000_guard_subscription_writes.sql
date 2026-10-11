-- Serialize quota-changing writes per account. A real row version also makes
-- stale REPEATABLE READ / SERIALIZABLE transactions fail rather than overbook.
-- This table contains coordination metadata only, not customer content.
create table private.subscription_write_locks (
  client_id bigint primary key references public.clients(id) on delete cascade,
  revision bigint not null default 0
);
revoke all on private.subscription_write_locks from public, anon, authenticated, service_role;

create function private.lock_subscription_writes(p_client_id bigint, p_old_client_id bigint default null)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  account_id bigint;
begin
  -- Use the same order if a write changes accounts.
  for account_id in
    select distinct id from unnest(array[p_client_id, p_old_client_id]) as ids(id)
    where id is not null order by id
  loop
    -- Existing onboarding locks the client first. Match that order here.
    perform 1 from public.clients where id = account_id for update;
    insert into private.subscription_write_locks as locks (client_id)
    values (account_id)
    on conflict (client_id) do update set revision = locks.revision + 1;
  end loop;
end;
$$;

create function private.guard_branch_subscription_write()
returns trigger
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  old_id bigint;
  old_client_id bigint;
  increases_slots boolean;
  slot_limit integer;
begin
  if tg_op = 'UPDATE' then
    old_id := old.id;
    old_client_id := old.client_id;
    if old.status = 'deleted' and new.status <> 'deleted' then
      raise check_violation using message = 'deleted_branch_cannot_be_reactivated';
    end if;
  end if;
  perform private.lock_subscription_writes(new.client_id, old_client_id);

  if tg_op = 'UPDATE' and new.client_id is distinct from old.client_id then
    if exists (select 1 from public.client_platforms cp
               where cp.branch_id = old.id and cp.client_id <> new.client_id) then
      raise check_violation using message = 'platform_branch_client_mismatch';
    end if;
  end if;

  increases_slots := new.status in ('active', 'suspended') and
    (tg_op = 'INSERT' or old.status = 'deleted' or new.client_id is distinct from old_client_id);
  if increases_slots then
    select private.branch_limit_for_plan(c.plan) into slot_limit
    from public.clients c where c.id = new.client_id;
    if (select count(*) from public.branches b
        where b.client_id = new.client_id and b.status in ('active', 'suspended')
          and b.id is distinct from old_id) >= slot_limit then
      raise check_violation using message = 'branch_plan_limit_reached';
    end if;
  end if;
  return new;
end;
$$;

create function private.guard_platform_subscription_write()
returns trigger
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  old_id bigint;
  old_client_id bigint;
  account public.clients%rowtype;
  increases_slots boolean;
  platform_limit integer;
begin
  if tg_op = 'UPDATE' then
    old_id := old.id;
    old_client_id := old.client_id;
  end if;
  perform private.lock_subscription_writes(new.client_id, old_client_id);

  if new.branch_id is not null and not exists (
    select 1 from public.branches b where b.id = new.branch_id and b.client_id = new.client_id
  ) then
    raise check_violation using message = 'platform_branch_client_mismatch';
  end if;

  -- Metadata-only sync writes do not run this trigger. Existing over-limit
  -- accounts may disable or archive links; do not rewrite their data.
  increases_slots := new.is_active is true and
    (tg_op = 'INSERT' or old.is_active is not true
      or new.client_id is distinct from old_client_id
      or new.platform_name is distinct from old.platform_name);
  if increases_slots then
    select c.* into account from public.clients c where c.id = new.client_id;
    if account.subscription_status = 'trial' or lower(btrim(account.plan)) = 'basic' then
      if exists (select 1 from public.client_platforms cp
                 where cp.client_id = new.client_id and cp.is_active is true
                   and cp.id is distinct from old_id) then
        raise check_violation using message = 'platform_link_limit_reached';
      end if;
    end if;

    platform_limit := case when account.subscription_status = 'trial' then 1
                           else private.platform_limit_for_plan(account.plan) end;
    if not exists (select 1 from public.client_platforms cp
                   where cp.client_id = new.client_id and cp.is_active is true
                     and cp.id is distinct from old_id and cp.platform_name = new.platform_name)
       and (select count(distinct cp.platform_name) from public.client_platforms cp
            where cp.client_id = new.client_id and cp.is_active is true
              and cp.id is distinct from old_id) >= platform_limit then
      raise check_violation using message = 'platform_type_limit_reached';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.lock_subscription_writes(bigint, bigint)
  from public, anon, authenticated, service_role;
revoke all on function private.guard_branch_subscription_write()
  from public, anon, authenticated, service_role;
revoke all on function private.guard_platform_subscription_write()
  from public, anon, authenticated, service_role;

-- Run before the existing duplicate-link trigger, which locks individual URLs.
create trigger a_subscription_branch_write
before insert or update of client_id, status on public.branches
for each row execute function private.guard_branch_subscription_write();

create trigger a_subscription_platform_write
before insert or update of client_id, branch_id, platform_name, is_active on public.client_platforms
for each row execute function private.guard_platform_subscription_write();

-- Keep the existing RLS insert helper consistent with the application's Basic
-- single-link entitlement. Ownership and subscription checks stay intact.
create or replace function private.can_use_platform(
  target_client_id bigint, target_platform text, target_branch_id bigint
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.clients c
    where c.id = target_client_id and c.user_id = (select auth.uid())
      and (target_branch_id is null or exists (
        select 1 from public.branches b where b.id = target_branch_id and b.client_id = c.id
      ))
      and (
        (c.subscription_status = 'trial' and c.trial_ends_at is not null and c.trial_ends_at > now()
          and (select count(*) from public.client_platforms cp
               where cp.client_id = c.id and cp.is_active is true) < 1)
        or
        (c.subscription_status = 'active'
          and (c.current_period_end is null or c.current_period_end > now())
          and coalesce(c.allowed_platforms_count, 0) > 0
          and (lower(btrim(c.plan)) <> 'basic' or
            (select count(*) from public.client_platforms cp
             where cp.client_id = c.id and cp.is_active is true) < 1)
          and (
            exists (select 1 from public.client_platforms cp
                    where cp.client_id = c.id and cp.is_active is true and cp.platform_name = target_platform)
            or (select count(distinct cp.platform_name) from public.client_platforms cp
                where cp.client_id = c.id and cp.is_active is true) < c.allowed_platforms_count
          ))
      )
  );
$$;
