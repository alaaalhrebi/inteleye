-- Keep plan limits synchronized across stored client data and RLS helpers.
create or replace function private.platform_limit_for_plan(target_plan text)
returns integer
language sql
immutable
security invoker
set search_path = ''
as $$
  select case lower(trim(coalesce(target_plan, '')))
    when 'enterprise' then 4
    when 'pro' then 2
    else 1
  end;
$$;

create or replace function private.branch_limit_for_plan(target_plan text)
returns integer
language sql
immutable
security invoker
set search_path = ''
as $$
  select case lower(trim(coalesce(target_plan, '')))
    when 'enterprise' then 20
    when 'pro' then 3
    else 1
  end;
$$;

create or replace function private.sync_client_plan_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.allowed_platforms_count := private.platform_limit_for_plan(new.plan);
  return new;
end;
$$;

revoke all on function private.platform_limit_for_plan(text)
  from public, anon, authenticated, service_role;
revoke all on function private.branch_limit_for_plan(text)
  from public, anon, authenticated, service_role;
revoke all on function private.sync_client_plan_limits()
  from public, anon, authenticated, service_role;

drop trigger if exists sync_client_plan_limits on public.clients;

create trigger sync_client_plan_limits
before insert or update of plan, allowed_platforms_count
on public.clients
for each row
execute function private.sync_client_plan_limits();

update public.clients
set allowed_platforms_count = private.platform_limit_for_plan(plan)
where allowed_platforms_count is distinct from private.platform_limit_for_plan(plan);

create or replace function private.can_add_branch(target_client_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.clients c
    where c.id = target_client_id
      and c.user_id = (select auth.uid())
      and c.subscription_status = 'active'
      and (c.current_period_end is null or c.current_period_end > now())
      and (
        select count(*)
        from public.branches b
        where b.client_id = c.id and b.is_active is true
      ) < private.branch_limit_for_plan(c.plan)
  );
$$;

revoke all on function private.can_add_branch(bigint)
  from public, anon, service_role;
grant execute on function private.can_add_branch(bigint) to authenticated;
