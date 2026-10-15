-- Only after separate approval and after disabling the email dispatch in n8n.
-- Retain delivery history to prevent duplicates if notifications are re-enabled.
begin;
drop trigger if exists enqueue_weekly_report_email on public.reports;
drop function if exists private.enqueue_weekly_report_email();
drop policy if exists reports_read_trial_weekly on public.reports;
drop policy if exists reports_subscription_scope_guard on public.reports;
commit;
