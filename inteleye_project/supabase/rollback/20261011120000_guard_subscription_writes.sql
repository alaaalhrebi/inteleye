-- Apply manually only if reverting this migration; restores the supplied original helper.
-- Run in a transaction. No customer rows are deleted or rewritten.
drop trigger a_subscription_platform_write on public.client_platforms;
drop trigger a_subscription_branch_write on public.branches;
drop function private.guard_platform_subscription_write();
drop function private.guard_branch_subscription_write();
drop function private.lock_subscription_writes(bigint, bigint);
drop table private.subscription_write_locks;
CREATE OR REPLACE FUNCTION private.can_use_platform(target_client_id bigint, target_platform text, target_branch_id bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from public.clients c
    where c.id = target_client_id
      and c.user_id = (select auth.uid())
      and (
        target_branch_id is null
        or exists (
          select 1 from public.branches b
          where b.id = target_branch_id and b.client_id = c.id
        )
      )
      and (
        (
          c.subscription_status = 'trial'
          and c.trial_ends_at is not null
          and c.trial_ends_at > now()
          and (
            select count(*) from public.client_platforms cp
            where cp.client_id = c.id and cp.is_active is true
          ) < 1
        )
        or (
          c.subscription_status = 'active'
          and (c.current_period_end is null or c.current_period_end > now())
          and coalesce(c.allowed_platforms_count, 0) > 0
          and (
            exists (
              select 1 from public.client_platforms cp
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
$function$;
