-- Apply only after production approval, inside BEGIN/COMMIT.
-- No backfill: existing reports do not generate notifications on installation.
create table public.report_email_notifications (
  id uuid primary key default gen_random_uuid(),
  report_id bigint not null references public.reports(id),
  client_id bigint not null references public.clients(id),
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed', 'unknown', 'skipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  gmail_message_id text,
  error_code text,
  unique (report_id, client_id)
);
alter table public.report_email_notifications enable row level security;
revoke all on public.report_email_notifications from public, anon, authenticated;
grant select, update on public.report_email_notifications to service_role;

create function private.enqueue_weekly_report_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.report_type = 'weekly' and new.status = 'completed' then
    insert into public.report_email_notifications(report_id, client_id)
      values (new.id, new.client_id) on conflict (report_id, client_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function private.enqueue_weekly_report_email()
  from public, anon, authenticated, service_role;
create trigger enqueue_weekly_report_email
after insert or update of status, report_type on public.reports
for each row execute function private.enqueue_weekly_report_email();

-- Add a permissive trial policy in case existing policies only admit paid users.
create policy reports_read_trial_weekly on public.reports for select to authenticated
using (report_type = 'weekly' and status = 'completed' and exists (
  select 1 from public.clients c where c.id = reports.client_id
    and c.user_id = (select auth.uid()) and c.subscription_status = 'trial'
    and c.trial_ends_at > now()
));
-- The restrictive policy also bounds any broader existing permissive policies.
create policy reports_subscription_scope_guard on public.reports
as restrictive for select to authenticated using (exists (
  select 1 from public.clients c where c.id = reports.client_id
    and c.user_id = (select auth.uid()) and (
      (c.subscription_status = 'active' and (c.current_period_end is null or c.current_period_end > now()))
      or (c.subscription_status = 'trial' and c.trial_ends_at > now()
        and reports.report_type = 'weekly' and reports.status = 'completed')
    )
));
