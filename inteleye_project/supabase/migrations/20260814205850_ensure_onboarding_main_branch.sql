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

  select c.id
  into target_client_id
  from public.clients c
  where c.user_id = target_user_id
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
  order by c.id
  limit 1
  for update;

  if target_client_id is null then
    raise insufficient_privilege using message = 'Active client subscription required';
  end if;

  select b.id
  into target_branch_id
  from public.branches b
  where b.client_id = target_client_id
    and b.is_active is true
  order by b.id
  limit 1;

  if target_branch_id is null then
    insert into public.branches (client_id, name, is_active)
    values (target_client_id, 'الفرع الرئيسي', true)
    returning id into target_branch_id;
  end if;

  return target_branch_id;
end;
$$;

revoke all on function public.ensure_onboarding_main_branch() from public;
revoke all on function public.ensure_onboarding_main_branch() from anon;
grant execute on function public.ensure_onboarding_main_branch() to authenticated;

comment on function public.ensure_onboarding_main_branch() is
  'Returns the authenticated client active branch, creating one main onboarding branch when none exists.';
