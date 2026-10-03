-- Branch lifecycle is controlled by one status value. The legacy is_active
-- column remains synchronized for compatibility with older integrations that
-- are not part of this repository snapshot.
alter table public.branches
  add column if not exists status text,
  add column if not exists business_activity text,
  add column if not exists suspended_at timestamptz,
  add column if not exists deleted_at timestamptz;

update public.branches
set status = case when is_active is true then 'active' else 'suspended' end
where status is null;

update public.branches b
set business_activity = (
  select cp.business_activity
  from public.client_platforms cp
  where cp.branch_id = b.id
    and nullif(btrim(cp.business_activity), '') is not null
  order by cp.is_active desc, cp.created_at desc
  limit 1
)
where nullif(btrim(b.business_activity), '') is null
  and exists (
    select 1
    from public.client_platforms cp
    where cp.branch_id = b.id
      and nullif(btrim(cp.business_activity), '') is not null
  );

alter table public.branches
  alter column status set default 'active',
  alter column status set not null;

alter table public.branches
  drop constraint if exists branches_status_check;

alter table public.branches
  add constraint branches_status_check
  check (status in ('active', 'suspended', 'deleted'));

create index if not exists branches_client_live_idx
  on public.branches (client_id, status)
  where status <> 'deleted';

alter table public.client_platforms
  add column if not exists last_link_changed_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists archived_reason text,
  add column if not exists replaced_by_platform_id bigint,
  add column if not exists suspended_by_branch_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'client_platforms_replaced_by_platform_id_fkey'
      and conrelid = 'public.client_platforms'::regclass
  ) then
    alter table public.client_platforms
      add constraint client_platforms_replaced_by_platform_id_fkey
      foreign key (replaced_by_platform_id)
      references public.client_platforms(id)
      on delete set null;
  end if;
end;
$$;

alter table public.client_platforms
  drop constraint if exists client_platforms_archived_reason_check;

alter table public.client_platforms
  add constraint client_platforms_archived_reason_check
  check (
    archived_reason is null
    or archived_reason in ('link_changed', 'branch_deleted')
  );

create index if not exists client_platforms_branch_live_idx
  on public.client_platforms (branch_id, is_active)
  where archived_at is null and branch_id is not null;

create or replace function private.sync_branch_legacy_active_flag()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.is_active := new.status = 'active';
  return new;
end;
$$;

drop trigger if exists sync_branch_legacy_active_flag on public.branches;
create trigger sync_branch_legacy_active_flag
before insert or update of status on public.branches
for each row
execute function private.sync_branch_legacy_active_flag();

update public.branches
set is_active = (status = 'active')
where is_active is distinct from (status = 'active');

-- Suspended branches continue to consume a plan slot. Only logically deleted
-- branches are excluded from the limit.
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
        where b.client_id = c.id
          and b.status in ('active', 'suspended')
      ) < private.branch_limit_for_plan(c.plan)
  );
$$;

revoke all on function private.can_add_branch(bigint)
  from public, anon, service_role;
grant execute on function private.can_add_branch(bigint) to authenticated;

drop policy if exists branches_insert_paid on public.branches;
create policy branches_insert_paid
on public.branches
for insert
to authenticated
with check (
  status = 'active'
  and private.can_add_branch(client_id)
);

drop policy if exists client_platforms_update_paid on public.client_platforms;
create policy client_platforms_update_paid
on public.client_platforms
for update
to authenticated
using (private.can_manage_branches(client_id))
with check (private.can_manage_branches(client_id));

create or replace function public.update_branch_details(
  p_branch_id bigint,
  p_name text,
  p_business_activity text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  clean_name text := btrim(coalesce(p_name, ''));
  clean_activity text := btrim(coalesce(p_business_activity, ''));
  target_client_id bigint;
begin
  if clean_name = '' or clean_activity = '' then
    raise check_violation using message = 'branch_details_required';
  end if;

  select b.client_id
  into target_client_id
  from public.branches b
  where b.id = p_branch_id
    and b.status <> 'deleted'
  for update;

  if target_client_id is null or not private.can_manage_branches(target_client_id) then
    raise insufficient_privilege using message = 'branch_not_found_or_forbidden';
  end if;

  update public.branches
  set name = clean_name,
      business_activity = clean_activity
  where id = p_branch_id;

  update public.client_platforms
  set business_activity = clean_activity,
      updated_at = now()
  where branch_id = p_branch_id
    and archived_at is null;
end;
$$;

revoke all on function public.update_branch_details(bigint, text, text)
  from public, anon;
grant execute on function public.update_branch_details(bigint, text, text)
  to authenticated;

create or replace function public.set_branch_status(
  p_branch_id bigint,
  p_status text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_status text;
  target_client_id bigint;
begin
  if p_status not in ('active', 'suspended', 'deleted') then
    raise check_violation using message = 'invalid_branch_status';
  end if;

  select b.client_id, b.status
  into target_client_id, current_status
  from public.branches b
  where b.id = p_branch_id
  for update;

  if target_client_id is null or not private.can_manage_branches(target_client_id) then
    raise insufficient_privilege using message = 'branch_not_found_or_forbidden';
  end if;

  if current_status = 'deleted' and p_status <> 'deleted' then
    raise check_violation using message = 'deleted_branch_cannot_be_reactivated';
  end if;

  if current_status = p_status then
    return;
  end if;

  if p_status = 'suspended' then
    update public.branches
    set status = 'suspended', suspended_at = now(), deleted_at = null
    where id = p_branch_id;

    update public.client_platforms
    set is_active = false,
        suspended_by_branch_at = now(),
        connection_status = 'disconnected',
        updated_at = now()
    where branch_id = p_branch_id
      and archived_at is null
      and is_active is true;
  elsif p_status = 'active' then
    update public.branches
    set status = 'active', suspended_at = null, deleted_at = null
    where id = p_branch_id;

    update public.client_platforms
    set is_active = true,
        suspended_by_branch_at = null,
        connection_status = 'pending',
        last_error = null,
        updated_at = now()
    where branch_id = p_branch_id
      and archived_at is null
      and suspended_by_branch_at is not null;
  else
    update public.branches
    set status = 'deleted', suspended_at = null, deleted_at = now()
    where id = p_branch_id;

    update public.client_platforms
    set is_active = false,
        archived_at = coalesce(archived_at, now()),
        archived_reason = coalesce(archived_reason, 'branch_deleted'),
        suspended_by_branch_at = null,
        connection_status = 'disconnected',
        updated_at = now()
    where branch_id = p_branch_id
      and archived_at is null;
  end if;
end;
$$;

revoke all on function public.set_branch_status(bigint, text)
  from public, anon;
grant execute on function public.set_branch_status(bigint, text)
  to authenticated;

create or replace function public.rotate_branch_platform_link(
  p_branch_id bigint,
  p_platform_id bigint,
  p_platform_url text,
  p_username text default null
)
returns table (
  platform_id bigint,
  platform_name text,
  changed boolean,
  next_link_change_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  old_platform public.client_platforms%rowtype;
  new_platform_id bigint;
  clean_url text := regexp_replace(btrim(coalesce(p_platform_url, '')), '/+$', '');
  clean_username text := nullif(btrim(coalesce(p_username, '')), '');
  normalized_old text;
  normalized_new text;
begin
  if clean_url = '' then
    raise check_violation using message = 'platform_link_required';
  end if;

  select cp.*
  into old_platform
  from public.client_platforms cp
  join public.branches b on b.id = cp.branch_id
  where cp.id = p_platform_id
    and cp.branch_id = p_branch_id
    and cp.is_active is true
    and cp.archived_at is null
    and b.status = 'active'
  for update of cp;

  if old_platform.id is null
     or not private.can_manage_branches(old_platform.client_id) then
    raise insufficient_privilege using message = 'platform_not_found_or_forbidden';
  end if;

  normalized_old := private.normalize_platform_link(old_platform.platform_url);
  normalized_new := private.normalize_platform_link(clean_url);

  if normalized_old = normalized_new then
    return query select
      old_platform.id,
      old_platform.platform_name,
      false,
      case
        when old_platform.last_link_changed_at is null then null
        else old_platform.last_link_changed_at + interval '1 month'
      end;
    return;
  end if;

  if old_platform.last_link_changed_at is not null
     and old_platform.last_link_changed_at + interval '1 month' > now() then
    raise check_violation using message = 'platform_link_change_cooldown';
  end if;

  if exists (
    select 1
    from public.client_platforms duplicate
    where duplicate.client_id = old_platform.client_id
      and duplicate.platform_name = old_platform.platform_name
      and duplicate.is_active is true
      and duplicate.id <> old_platform.id
      and private.normalize_platform_link(duplicate.platform_url) = normalized_new
  ) then
    raise unique_violation using message = 'duplicate_active_platform_link';
  end if;

  update public.client_platforms
  set is_active = false,
      archived_at = now(),
      archived_reason = 'link_changed',
      last_link_changed_at = now(),
      connection_status = 'disconnected',
      updated_at = now()
  where id = old_platform.id;

  insert into public.client_platforms (
    client_id,
    branch_id,
    platform_name,
    platform_url,
    username,
    business_activity,
    business_description,
    settings,
    is_active,
    connection_status,
    last_error,
    last_link_changed_at
  ) values (
    old_platform.client_id,
    old_platform.branch_id,
    old_platform.platform_name,
    clean_url,
    case when old_platform.platform_name = 'x' then clean_username else null end,
    old_platform.business_activity,
    old_platform.business_description,
    old_platform.settings,
    true,
    'pending',
    null,
    now()
  )
  returning id into new_platform_id;

  update public.client_platforms
  set replaced_by_platform_id = new_platform_id
  where id = old_platform.id;

  return query select
    new_platform_id,
    old_platform.platform_name,
    true,
    now() + interval '1 month';
end;
$$;

revoke all on function public.rotate_branch_platform_link(bigint, bigint, text, text)
  from public, anon;
grant execute on function public.rotate_branch_platform_link(bigint, bigint, text, text)
  to authenticated;

-- Weekly and exact claims must ignore suspended/deleted branches while still
-- allowing account-wide links where branch_id is null.
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
    left join public.branches branch on branch.id = cp.branch_id
    where cp.platform_name = p_platform_name
      and cp.is_active is true
      and cp.archived_at is null
      and (cp.branch_id is null or branch.status = 'active')
      and (
        (c.subscription_status = 'trial' and c.trial_ends_at is not null and c.trial_ends_at > now())
        or (c.subscription_status = 'active' and (c.current_period_end is null or c.current_period_end > now()))
      )
      and (cp.last_success_at is null or cp.last_success_at <= now() - interval '7 days')
      and (cp.last_sync_at is null or cp.last_sync_at <= now() - interval '30 minutes')
    order by cp.last_success_at asc nulls first, cp.id asc
    for update of cp skip locked
    limit greatest(1, least(coalesce(p_batch_size, 25), 100))
  ),
  claimed as (
    update public.client_platforms cp
    set last_sync_at = now(),
        connection_status = 'syncing',
        last_error = null,
        updated_at = now()
    from due
    where cp.id = due.id
    returning cp.*
  )
  select
    cp.id, cp.client_id, cp.branch_id, cp.platform_name, cp.platform_url,
    cp.username, cp.business_activity, cp.business_description, cp.settings,
    cp.created_at at time zone 'UTC', cp.last_success_at,
    jsonb_build_object(
      'id', c.id,
      'subscription_status', c.subscription_status,
      'activated_at', c.activated_at,
      'initial_report_generated_at', c.initial_report_generated_at,
      'last_report_at', c.last_report_at,
      'next_report_at', c.next_report_at
    ),
    case when b.id is null then null else jsonb_build_object('id', b.id, 'name', b.name) end
  from claimed cp
  join public.clients c on c.id = cp.client_id
  left join public.branches b on b.id = cp.branch_id
  order by cp.id;
end;
$$;

revoke all on function public.claim_due_platform_syncs(text, integer)
  from public, anon, authenticated;
grant execute on function public.claim_due_platform_syncs(text, integer)
  to service_role;

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
    left join public.branches branch on branch.id = cp.branch_id
    where cp.id = p_platform_id
      and cp.platform_name = p_platform_name
      and cp.is_active is true
      and cp.archived_at is null
      and (cp.branch_id is null or branch.status = 'active')
      and (
        (c.subscription_status = 'trial' and c.trial_ends_at is not null and c.trial_ends_at > now())
        or (c.subscription_status = 'active' and (c.current_period_end is null or c.current_period_end > now()))
      )
      and (
        coalesce(cp.connection_status, 'pending') = 'pending'
        or (cp.last_success_at is null and coalesce(cp.connection_status, 'pending') <> 'syncing')
        or (
          cp.connection_status = 'syncing'
          and (cp.last_sync_at is null or cp.last_sync_at <= now() - interval '30 minutes')
        )
      )
    for update of cp skip locked
  ),
  claimed as (
    update public.client_platforms cp
    set last_sync_at = now(),
        connection_status = 'syncing',
        last_error = null,
        updated_at = now()
    from requested
    where cp.id = requested.id
    returning cp.*
  )
  select
    cp.id, cp.client_id, cp.branch_id, cp.platform_name, cp.platform_url,
    cp.username, cp.business_activity, cp.business_description, cp.settings,
    cp.created_at at time zone 'UTC', cp.last_success_at,
    jsonb_build_object(
      'id', c.id,
      'subscription_status', c.subscription_status,
      'activated_at', c.activated_at,
      'initial_report_generated_at', c.initial_report_generated_at,
      'last_report_at', c.last_report_at,
      'next_report_at', c.next_report_at
    ),
    case when b.id is null then null else jsonb_build_object('id', b.id, 'name', b.name) end
  from claimed cp
  join public.clients c on c.id = cp.client_id
  left join public.branches b on b.id = cp.branch_id;
end;
$$;

revoke all on function public.claim_platform_sync(bigint, text)
  from public, anon, authenticated;
grant execute on function public.claim_platform_sync(bigint, text)
  to service_role;

create or replace function public.ensure_onboarding_main_branch()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user_id uuid := (select auth.uid());
  target_client_id bigint;
  target_branch_id bigint;
begin
  if target_user_id is null then
    raise insufficient_privilege using message = 'Authentication required';
  end if;

  select c.id into target_client_id
  from public.clients c
  where c.user_id = target_user_id
    and (
      (c.subscription_status = 'trial' and c.trial_ends_at is not null and c.trial_ends_at > now())
      or (c.subscription_status = 'active' and (c.current_period_end is null or c.current_period_end > now()))
    )
  order by c.id
  limit 1
  for update;

  if target_client_id is null then
    raise insufficient_privilege using message = 'Active client subscription required';
  end if;

  select b.id into target_branch_id
  from public.branches b
  where b.client_id = target_client_id
    and b.status = 'active'
  order by b.id
  limit 1;

  if target_branch_id is null and exists (
    select 1 from public.branches b
    where b.client_id = target_client_id
      and b.status = 'suspended'
  ) then
    raise check_violation using message = 'main_branch_suspended';
  end if;

  if target_branch_id is null then
    insert into public.branches (client_id, name, status)
    values (target_client_id, 'الفرع الرئيسي', 'active')
    returning id into target_branch_id;
  end if;

  return target_branch_id;
end;
$$;

revoke all on function public.ensure_onboarding_main_branch()
  from public, anon;
grant execute on function public.ensure_onboarding_main_branch()
  to authenticated;

comment on column public.branches.status is
  'Authoritative branch lifecycle: active, suspended, or logically deleted.';
comment on column public.client_platforms.last_link_changed_at is
  'Last actual platform link rotation; the next change is allowed one month later.';
comment on function public.rotate_branch_platform_link(bigint, bigint, text, text) is
  'Archives the old platform connection and creates a new one without mixing historical source data.';
