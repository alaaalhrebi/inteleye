create or replace function private.schedule_new_platform_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.clients
  set
    activated_at = coalesce(activated_at, new.created_at, now()),
    next_report_at = now()
  where id = new.client_id;

  return new;
end;
$$;

revoke all on function private.schedule_new_platform_sync() from public;
revoke all on function private.schedule_new_platform_sync() from anon;
revoke all on function private.schedule_new_platform_sync() from authenticated;

drop trigger if exists schedule_new_platform_sync_on_insert
on public.client_platforms;

create trigger schedule_new_platform_sync_on_insert
after insert on public.client_platforms
for each row
execute function private.schedule_new_platform_sync();

alter table public.client_platforms
drop constraint if exists client_platforms_connection_status_check;

alter table public.client_platforms
add constraint client_platforms_connection_status_check
check (
  connection_status = any (
    array['pending'::text, 'syncing'::text, 'connected'::text, 'disconnected'::text, 'error'::text]
  )
);

-- Account-wide Google links intentionally have no branch. Keep their feedback
-- at account scope just like X, TikTok and Instagram.
alter table public.google_reviews
alter column branch_id drop not null;

create or replace function public.claim_due_platform_syncs(
  p_platform_name text,
  p_batch_size integer default 25
)
returns table (
  id bigint,
  client_id bigint,
  branch_id bigint,
  platform_name text,
  platform_url text,
  username text,
  business_activity text,
  business_description text,
  settings jsonb,
  created_at timestamptz,
  last_success_at timestamptz,
  clients jsonb,
  branches jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_platform_name not in ('google_maps', 'x', 'tiktok', 'instagram') then
    raise exception 'Unsupported platform';
  end if;

  return query
  with due as materialized (
    select cp.id
    from public.client_platforms cp
    join public.clients c on c.id = cp.client_id
    where cp.platform_name = p_platform_name
      and cp.is_active is true
      and (
        (
          c.subscription_status = 'trial'
          and c.trial_ends_at is not null
          and c.trial_ends_at > now()
        )
        or (
          c.subscription_status = 'active'
          and (
            c.current_period_end is null
            or c.current_period_end > now()
          )
        )
      )
      and (
        cp.last_success_at is null
        or cp.last_success_at <= now() - interval '7 days'
      )
      and (
        cp.last_sync_at is null
        or cp.last_sync_at <= now() - interval '30 minutes'
      )
    order by cp.last_success_at asc nulls first, cp.id asc
    for update of cp skip locked
    limit greatest(1, least(coalesce(p_batch_size, 25), 100))
  ),
  claimed as (
    update public.client_platforms cp
    set
      last_sync_at = now(),
      connection_status = 'syncing',
      last_error = null,
      updated_at = now()
    from due
    where cp.id = due.id
    returning cp.*
  )
  select
    cp.id,
    cp.client_id,
    cp.branch_id,
    cp.platform_name,
    cp.platform_url,
    cp.username,
    cp.business_activity,
    cp.business_description,
    cp.settings,
    cp.created_at at time zone 'UTC',
    cp.last_success_at,
    jsonb_build_object(
      'id', c.id,
      'subscription_status', c.subscription_status,
      'activated_at', c.activated_at,
      'initial_report_generated_at', c.initial_report_generated_at,
      'last_report_at', c.last_report_at,
      'next_report_at', c.next_report_at
    ) as clients,
    case
      when b.id is null then null
      else jsonb_build_object('id', b.id, 'name', b.name)
    end as branches
  from claimed cp
  join public.clients c on c.id = cp.client_id
  left join public.branches b on b.id = cp.branch_id
  order by cp.id;
end;
$$;

revoke all on function public.claim_due_platform_syncs(text, integer) from public;
revoke all on function public.claim_due_platform_syncs(text, integer) from anon;
revoke all on function public.claim_due_platform_syncs(text, integer) from authenticated;
grant execute on function public.claim_due_platform_syncs(text, integer) to service_role;

create or replace function public.complete_platform_sync(p_platform_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.client_platforms
  set
    last_sync_at = now(),
    last_success_at = now(),
    connection_status = 'connected',
    last_error = null,
    updated_at = now()
  where id = p_platform_id
    and is_active is true;

  if not found then
    raise exception 'Platform not found';
  end if;
end;
$$;

revoke all on function public.complete_platform_sync(bigint) from public;
revoke all on function public.complete_platform_sync(bigint) from anon;
revoke all on function public.complete_platform_sync(bigint) from authenticated;
grant execute on function public.complete_platform_sync(bigint) to service_role;

create or replace function public.fail_platform_sync(
  p_platform_id bigint,
  p_error text default 'تعذر سحب البيانات من المصدر'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.client_platforms
  set
    last_sync_at = now(),
    connection_status = 'error',
    last_error = left(
      coalesce(nullif(trim(p_error), ''), 'تعذر سحب البيانات من المصدر'),
      300
    ),
    updated_at = now()
  where id = p_platform_id
    and is_active is true;

  if not found then
    raise exception 'Platform not found';
  end if;
end;
$$;

revoke all on function public.fail_platform_sync(bigint, text) from public;
revoke all on function public.fail_platform_sync(bigint, text) from anon;
revoke all on function public.fail_platform_sync(bigint, text) from authenticated;
grant execute on function public.fail_platform_sync(bigint, text) to service_role;

update public.clients c
set
  activated_at = coalesce(c.activated_at, c.created_at, now()),
  next_report_at = coalesce(c.next_report_at, now())
where exists (
  select 1
  from public.client_platforms cp
  where cp.client_id = c.id
    and cp.is_active is true
);

insert into public.branches (client_id, name, is_active)
select distinct c.id, 'الفرع الرئيسي', true
from public.clients c
join public.client_platforms cp on cp.client_id = c.id
where cp.is_active is true
  and cp.branch_id is null
  and (c.subscription_status = 'trial' or lower(coalesce(c.plan, 'basic')) = 'basic')
  and not exists (
    select 1
    from public.branches b
    where b.client_id = c.id
      and b.is_active is true
  );

update public.client_platforms cp
set branch_id = (
  select b.id
  from public.branches b
  where b.client_id = cp.client_id
    and b.is_active is true
  order by b.id
  limit 1
)
from public.clients c
where c.id = cp.client_id
  and cp.branch_id is null
  and cp.is_active is true
  and (c.subscription_status = 'trial' or lower(coalesce(c.plan, 'basic')) = 'basic');

comment on function public.claim_due_platform_syncs(text, integer) is
  'Atomically claims new or weekly platform sync jobs for trusted backend workers.';

comment on function public.complete_platform_sync(bigint) is
  'Marks a claimed platform sync as successfully fetched and analyzed.';

comment on function public.fail_platform_sync(bigint, text) is
  'Marks a claimed platform sync as failed without exposing provider credentials.';
