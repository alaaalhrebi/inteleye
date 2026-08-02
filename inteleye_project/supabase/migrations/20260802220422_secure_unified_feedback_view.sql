alter view public.unified_feedback
  set (security_invoker = true);

revoke all on public.unified_feedback
  from public, anon, authenticated, service_role;
grant select on public.unified_feedback
  to authenticated, service_role;

drop policy if exists reviews_select_own
  on public.google_reviews;
create policy reviews_select_own
on public.google_reviews
for select
to authenticated
using (
  exists (
    select 1
    from public.branches b
    where b.id = google_reviews.branch_id
      and private.can_access_dashboard(b.client_id)
  )
);

drop policy if exists x_mentions_select_own
  on public.x_mentions;
create policy x_mentions_select_own
on public.x_mentions
for select
to authenticated
using (private.can_access_dashboard(client_id));

drop policy if exists tiktok_comments_select_own
  on public.tiktok_comments;
create policy tiktok_comments_select_own
on public.tiktok_comments
for select
to authenticated
using (private.can_access_dashboard(client_id));

drop policy if exists instagram_comments_select_own
  on public.instagram_comments;
create policy instagram_comments_select_own
on public.instagram_comments
for select
to authenticated
using (private.can_access_dashboard(client_id));

drop policy if exists feedback_analysis_select_own
  on public.feedback_analysis;
create policy feedback_analysis_select_own
on public.feedback_analysis
for select
to authenticated
using (private.can_access_dashboard(client_id));
