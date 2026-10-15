-- Phase 1: allow an active trial to read its completed initial and weekly reports.
-- Apply after 20261015120000_weekly_report_notifications.sql, inside BEGIN/COMMIT.
-- No report creation, data rewrite, notification backfill, or custom permissions change.
-- Retain the legacy policy name so the previous migration's rollback stays compatible.
alter policy reports_read_trial_weekly on public.reports
using (
  report_type in ('initial', 'initial_historical', 'weekly')
  and status = 'completed'
  and exists (
    select 1 from public.clients c
    where c.id = reports.client_id
      and c.user_id = (select auth.uid())
      and c.subscription_status = 'trial'
      and c.trial_ends_at > now()
  )
);

alter policy reports_subscription_scope_guard on public.reports
using (exists (
  select 1 from public.clients c
  where c.id = reports.client_id
    and c.user_id = (select auth.uid())
    and (
      (c.subscription_status = 'active'
        and (c.current_period_end is null or c.current_period_end > now()))
      or (c.subscription_status = 'trial' and c.trial_ends_at > now()
        and reports.report_type in ('initial', 'initial_historical', 'weekly')
        and reports.status = 'completed')
    )
));
