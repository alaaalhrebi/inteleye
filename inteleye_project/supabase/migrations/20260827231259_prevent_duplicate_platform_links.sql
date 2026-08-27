create or replace function private.normalize_platform_link(target_url text)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select lower(regexp_replace(btrim(coalesce(target_url, '')), '/+$', ''));
$$;

create or replace function private.prevent_duplicate_active_platform_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_url text;
begin
  if new.is_active is not true then
    return new;
  end if;

  normalized_url := private.normalize_platform_link(new.platform_url);

  -- Serialize attempts for the same client, platform, and normalized link.
  perform pg_advisory_xact_lock(
    hashtextextended(
      concat_ws('|', new.client_id::text, new.platform_name, normalized_url),
      0
    )
  );

  if exists (
    select 1
    from public.client_platforms as existing
    where existing.client_id = new.client_id
      and existing.platform_name = new.platform_name
      and existing.is_active is true
      and existing.id <> coalesce(new.id, 0)
      and existing.branch_id is distinct from new.branch_id
      and private.normalize_platform_link(existing.platform_url) = normalized_url
  ) then
    raise exception 'duplicate_active_platform_link'
      using
        errcode = '23505',
        constraint = 'uq_client_platform_normalized_url_active';
  end if;

  return new;
end;
$$;

revoke all on function private.normalize_platform_link(text)
  from public, anon, authenticated, service_role;
revoke all on function private.prevent_duplicate_active_platform_link()
  from public, anon, authenticated, service_role;

drop trigger if exists prevent_duplicate_active_platform_link
  on public.client_platforms;

create trigger prevent_duplicate_active_platform_link
before insert or update of client_id, platform_name, platform_url, is_active
on public.client_platforms
for each row
execute function private.prevent_duplicate_active_platform_link();
