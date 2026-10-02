-- The platform-added webhook must claim the row that triggered it. Reusing the
-- weekly batch claim here can pick another due account and leave the new link
-- pending indefinitely.
create or replace function public.claim_platform_sync(
  p_platform_id bigint,
  p_platform_name text
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
  if p_platform_id is null or p_platform_id <= 0 then
    raise exception 'Invalid platform id';
  end if;

  if p_platform_name not in ('google_maps', 'x', 'tiktok', 'instagram') then
    raise exception 'Unsupported platform';
  end if;

  return query
  with requested as materialized (
    select cp.id
    from public.client_platforms cp
    join public.clients c on c.id = cp.client_id
    where cp.id = p_platform_id
      and cp.platform_name = p_platform_name
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
        (
          cp.last_success_at is null
          and coalesce(cp.connection_status, 'pending') <> 'syncing'
        )
        or (
          cp.connection_status = 'syncing'
          and (
            cp.last_sync_at is null
            or cp.last_sync_at <= now() - interval '30 minutes'
          )
        )
      )
    for update of cp skip locked
  ),
  claimed as (
    update public.client_platforms cp
    set
      last_sync_at = now(),
      connection_status = 'syncing',
      last_error = null,
      updated_at = now()
    from requested
    where cp.id = requested.id
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
  left join public.branches b on b.id = cp.branch_id;
end;
$$;

-- This SECURITY DEFINER function is intentionally exposed as an RPC only to
-- the trusted n8n service-role credential. It is not callable by site users.
revoke all on function public.claim_platform_sync(bigint, text) from public;
revoke all on function public.claim_platform_sync(bigint, text) from anon;
revoke all on function public.claim_platform_sync(bigint, text) from authenticated;
grant execute on function public.claim_platform_sync(bigint, text) to service_role;

comment on function public.claim_platform_sync(bigint, text) is
  'Atomically claims one newly linked platform for its immediate webhook sync.';
