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
