-- A workflow may already be running when a branch is suspended, deleted, or
-- its platform link is rotated. Service-role requests bypass RLS, so enforce
-- the lifecycle at the database write boundary as well as at claim time.
create or replace function private.guard_active_platform_sync_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  platform_is_writable boolean;
begin
  -- Historical rows without a platform id predate the sync contract. Keep
  -- them readable and editable; every current workflow supplies platform_id.
  if new.platform_id is null then
    return new;
  end if;

  select exists (
    select 1
    from public.client_platforms cp
    left join public.branches b on b.id = cp.branch_id
    where cp.id = new.platform_id
      and cp.is_active is true
      and cp.archived_at is null
      and cp.branch_id is not distinct from new.branch_id
      and (cp.branch_id is null or b.status = 'active')
  )
  into platform_is_writable;

  if not platform_is_writable then
    raise check_violation using message = 'platform_sync_not_active';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_active_platform_sync_write()
  from public, anon, authenticated;

drop trigger if exists guard_active_platform_sync_write on public.google_reviews;
create trigger guard_active_platform_sync_write
before insert or update on public.google_reviews
for each row execute function private.guard_active_platform_sync_write();

drop trigger if exists guard_active_platform_sync_write on public.x_mentions;
create trigger guard_active_platform_sync_write
before insert or update on public.x_mentions
for each row execute function private.guard_active_platform_sync_write();

drop trigger if exists guard_active_platform_sync_write on public.tiktok_videos;
create trigger guard_active_platform_sync_write
before insert or update on public.tiktok_videos
for each row execute function private.guard_active_platform_sync_write();

drop trigger if exists guard_active_platform_sync_write on public.tiktok_comments;
create trigger guard_active_platform_sync_write
before insert or update on public.tiktok_comments
for each row execute function private.guard_active_platform_sync_write();

drop trigger if exists guard_active_platform_sync_write on public.instagram_posts;
create trigger guard_active_platform_sync_write
before insert or update on public.instagram_posts
for each row execute function private.guard_active_platform_sync_write();

drop trigger if exists guard_active_platform_sync_write on public.instagram_comments;
create trigger guard_active_platform_sync_write
before insert or update on public.instagram_comments
for each row execute function private.guard_active_platform_sync_write();

drop trigger if exists guard_active_platform_sync_write on public.feedback_analysis;
create trigger guard_active_platform_sync_write
before insert or update on public.feedback_analysis
for each row execute function private.guard_active_platform_sync_write();

comment on function private.guard_active_platform_sync_write() is
  'Rejects sync writes from an in-flight workflow after its platform or branch stops being active.';
