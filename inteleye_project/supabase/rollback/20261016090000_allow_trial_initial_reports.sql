-- Restore weekly-only trial access after separate production approval.
-- Preserve reports, notification history, and every other policy.
begin;
alter policy reports_read_trial_weekly on public.reports
using (report_type = 'weekly' and status = 'completed' and exists (
  select 1 from public.clients c where c.id = reports.client_id
    and c.user_id = (select auth.uid()) and c.subscription_status = 'trial'
    and c.trial_ends_at > now()
));
alter policy reports_subscription_scope_guard on public.reports
using (exists (
  select 1 from public.clients c where c.id = reports.client_id
    and c.user_id = (select auth.uid()) and (
      (c.subscription_status = 'active' and (c.current_period_end is null or c.current_period_end > now()))
      or (c.subscription_status = 'trial' and c.trial_ends_at > now()
        and reports.report_type = 'weekly' and reports.status = 'completed')
    )
));
commit;
