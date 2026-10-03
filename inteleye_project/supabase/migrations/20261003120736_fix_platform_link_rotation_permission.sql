-- rotate_branch_platform_link is SECURITY INVOKER and calls this pure helper.
-- Granting only this immutable normalizer keeps table access protected by RLS.
grant execute on function private.normalize_platform_link(text)
  to authenticated;
