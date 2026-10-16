-- Restore weekly-only enqueueing without deleting reports or delivery history.
-- Stop initial-report notification dispatch in n8n before applying this rollback.
create or replace function private.enqueue_weekly_report_email()
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
