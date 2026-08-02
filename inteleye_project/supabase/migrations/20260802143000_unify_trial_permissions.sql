create or replace function public.can_access_dashboard(target_client_id bigint)
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
      and (
        (
          c.subscription_status = 'trial'
          and c.trial_ends_at is not null
          and c.trial_ends_at > now()
        )
        or (
          c.subscription_status = 'active'
          and (c.current_period_end is null or c.current_period_end > now())
        )
      )
  );
$$;

create or replace function public.can_manage_branches(target_client_id bigint)
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
  );
$$;

create or replace function public.can_access_custom_reports(target_client_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.can_manage_branches(target_client_id);
$$;

create or replace function public.can_add_branch(target_client_id bigint)
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
      ) < case c.plan
        when 'enterprise' then 999
        when 'pro' then 3
        else 1
      end
  );
$$;

create or replace function public.can_use_platform(
  target_client_id bigint,
  target_platform text,
  target_branch_id bigint
)
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
      and (
        target_branch_id is null
        or exists (
          select 1
          from public.branches b
          where b.id = target_branch_id and b.client_id = c.id
        )
      )
      and (
        (
          c.subscription_status = 'trial'
          and c.trial_ends_at is not null
          and c.trial_ends_at > now()
          and (
            select count(*)
            from public.client_platforms cp
            where cp.client_id = c.id and cp.is_active is true
          ) < 1
        )
        or (
          c.subscription_status = 'active'
          and (c.current_period_end is null or c.current_period_end > now())
          and coalesce(c.allowed_platforms_count, 0) > 0
          and (
            exists (
              select 1
              from public.client_platforms cp
              where cp.client_id = c.id
                and cp.is_active is true
                and cp.platform_name = target_platform
            )
            or (
              select count(distinct cp.platform_name)
              from public.client_platforms cp
              where cp.client_id = c.id and cp.is_active is true
            ) < c.allowed_platforms_count
          )
        )
      )
  );
$$;

revoke all on function public.can_access_dashboard(bigint) from public;
revoke all on function public.can_manage_branches(bigint) from public;
revoke all on function public.can_access_custom_reports(bigint) from public;
revoke all on function public.can_add_branch(bigint) from public;
revoke all on function public.can_use_platform(bigint, text, bigint) from public;

grant execute on function public.can_access_dashboard(bigint) to authenticated;
grant execute on function public.can_manage_branches(bigint) to authenticated;
grant execute on function public.can_access_custom_reports(bigint) to authenticated;
grant execute on function public.can_add_branch(bigint) to authenticated;
grant execute on function public.can_use_platform(bigint, text, bigint) to authenticated;

drop policy if exists branches_select_own on public.branches;
drop policy if exists branches_insert_own on public.branches;
drop policy if exists branches_update_own on public.branches;
drop policy if exists branches_delete_paid on public.branches;

create policy branches_select_own
on public.branches
for select
to authenticated
using (public.can_access_dashboard(client_id));

create policy branches_insert_paid
on public.branches
for insert
to authenticated
with check (is_active is true and public.can_add_branch(client_id));

create policy branches_update_paid
on public.branches
for update
to authenticated
using (public.can_manage_branches(client_id))
with check (public.can_manage_branches(client_id));

create policy branches_delete_paid
on public.branches
for delete
to authenticated
using (public.can_manage_branches(client_id));

drop policy if exists "Users can read own platforms" on public.client_platforms;
drop policy if exists "Users can insert own platforms" on public.client_platforms;

create policy client_platforms_select_own
on public.client_platforms
for select
to authenticated
using (public.can_access_dashboard(client_id));

create policy client_platforms_insert_with_limit
on public.client_platforms
for insert
to authenticated
with check (
  is_active is true
  and public.can_use_platform(client_id, platform_name, branch_id)
);

drop policy if exists reports_select_own on public.reports;

create policy reports_select_own
on public.reports
for select
to authenticated
using (
  public.can_access_dashboard(client_id)
  and (
    public.can_access_custom_reports(client_id)
    or report_type <> 'custom'
  )
);

drop policy if exists "Clients can view own report requests" on public.report_requests;
drop policy if exists report_requests_select_paid on public.report_requests;
drop policy if exists report_requests_insert_paid on public.report_requests;

create policy report_requests_select_paid
on public.report_requests
for select
to authenticated
using (public.can_access_custom_reports(client_id));

create policy report_requests_insert_paid
on public.report_requests
for insert
to authenticated
with check (
  public.can_access_custom_reports(client_id)
  and (requested_by is null or requested_by = (select auth.uid()))
);

revoke update on table public.clients from anon, authenticated;
grant update (name, email) on table public.clients to authenticated;
