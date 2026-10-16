-- Local proposal. Apply only with separate production approval, inside BEGIN/COMMIT.
-- Reuses the existing trigger and delivery queue. No backfill or table/policy changes.
create or replace function private.enqueue_weekly_report_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.report_type in ('weekly', 'initial_historical', 'initial')
      and new.status = 'completed' then
    -- A rewrite of an already completed report is not a new completion event.
    -- In particular, do not notify old initial reports after this installation.
    if tg_op = 'UPDATE' then
      if old.status = 'completed' and old.report_type = new.report_type then
        return new;
      end if;
    end if;
    insert into public.report_email_notifications(report_id, client_id)
      values (new.id, new.client_id)
      on conflict (report_id, client_id) do nothing;
  end if;
  return new;
end;
$$;
-- CREATE OR REPLACE preserves existing ACLs; restate the original restriction.
revoke all on function private.enqueue_weekly_report_email()
  from public, anon, authenticated, service_role;
