create or replace function private.can_create_custom_report(
  target_client_id bigint
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
      and c.subscription_status = 'active'
      and (c.current_period_end is null or c.current_period_end > now())
      and c.plan in ('pro', 'enterprise')
  );
$$;

revoke all on function private.can_create_custom_report(bigint)
  from public, anon, service_role;
grant execute on function private.can_create_custom_report(bigint)
  to authenticated;

drop policy if exists report_requests_insert_paid
  on public.report_requests;
drop policy if exists report_requests_insert_advanced_plans
  on public.report_requests;

create policy report_requests_insert_advanced_plans
on public.report_requests
for insert
to authenticated
with check (
  private.can_create_custom_report(client_id)
  and requested_by = (select auth.uid())
);
