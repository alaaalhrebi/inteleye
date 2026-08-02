create schema if not exists private;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter function public.can_access_dashboard(bigint) set schema private;
alter function public.can_manage_branches(bigint) set schema private;
alter function public.can_access_custom_reports(bigint) set schema private;
alter function public.can_add_branch(bigint) set schema private;
alter function public.can_use_platform(bigint, text, bigint) set schema private;

create or replace function private.can_access_custom_reports(target_client_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_manage_branches(target_client_id);
$$;

revoke all on function private.can_access_dashboard(bigint)
  from public, anon, service_role;
revoke all on function private.can_manage_branches(bigint)
  from public, anon, service_role;
revoke all on function private.can_access_custom_reports(bigint)
  from public, anon, service_role;
revoke all on function private.can_add_branch(bigint)
  from public, anon, service_role;
revoke all on function private.can_use_platform(bigint, text, bigint)
  from public, anon, service_role;

grant execute on function private.can_access_dashboard(bigint) to authenticated;
grant execute on function private.can_manage_branches(bigint) to authenticated;
grant execute on function private.can_access_custom_reports(bigint) to authenticated;
grant execute on function private.can_add_branch(bigint) to authenticated;
grant execute on function private.can_use_platform(bigint, text, bigint) to authenticated;
