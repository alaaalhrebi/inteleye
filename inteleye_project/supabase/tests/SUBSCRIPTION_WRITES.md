# Subscription write guards

Prepared on `fix/subscription-write-guards`. This change has not been applied to
hosted Supabase, pushed to main, or deployed. Production application requires
separate explicit approval.

## Scope and behavior

- Keep branches Basic=1, Pro=3, Enterprise=20. Suspended branches still count.
- Keep platform types Basic=1, Pro=2, Enterprise=4; Trial has one active link.
- Basic has one active link in total, including global and branch-scoped links.
- No new total-link limit for Pro/Enterprise. Existing scope and duplicate-link
  rules remain. The same public URL remains allowed in different accounts.
- Verify branch ownership on insert/update, including inactive platform rows.
- Do not allow a branch's account to change while it has links from another account.
- Preserve the existing RPC rule that deleted branches cannot be reactivated,
  including through direct table updates.
- No public RPC, merged branch/platform creation, UI, report or price changes.

The new private coordination table has only an account ID and revision. It is
populated lazily and is inaccessible to anon, authenticated and service_role.
Trigger functions run as their owner with an empty search_path. Writes serialize
per account. A changing revision causes stale repeatable-read/serializable
transactions to abort rather than count against an old snapshot. Client locks
are acquired first to match existing onboarding. Deadlocks/serialization errors
are returned as a retryable 409 by the application; no automatic replay of a
partially completed branch/platform request is introduced.

Metadata-only platform sync writes (timestamps, status, last_error) do not invoke
the new platform trigger. Service-role changes to quota/ownership columns do,
because bypassing RLS must not bypass these invariants. Existing over-limit or
incorrectly linked data is not rewritten or deleted. New increases are checked;
legacy accounts can archive/disable links and edit metadata. Link replacement or
reactivation can be rejected until the account fits its current allowance.
Lowering a plan does not automatically remove existing records.

## Safe testing

From `/workspace/inteleye/inteleye_project`:

```sh
node --test supabase/tests/subscription-writes.test.cjs
node --test scripts/phase-one.test.cjs
./node_modules/.bin/tsc --noEmit --incremental false
npm run check:n8n
npm run build
```

The database runner creates a disposable PostgreSQL 16 container with
`--network none`, uses docker exec and a Unix socket, and removes the container
afterward. It does not read Supabase credentials or accept an external database
URL. Docker must be available; the official postgres:16-alpine image is needed.
The fixture reproduces relevant definitions from the user-supplied production
catalogs, with synthetic rows and minimal table columns. It is not a full copy of
Supabase or a live n8n end-to-end test.

Tests cover original gaps, RLS, API errors, Basic/Trial/Pro/Enterprise, multi-row
writes, concurrent inserts/reactivation, stronger isolation levels, shared URLs,
foreign branches, onboarding, rotation, lifecycle, service-role sync metadata,
legacy over-limit records and rollback. Existing functional tests remain enabled.

Validated in this workspace: 99 application tests and 39 database scenarios
(the database runner reports 40 including its parent test), zero final failures.
Production build, TypeScript and all four workflow structural checks passed.
Standalone lint is blocked by the repository's missing ESLint configuration;
no lint configuration was added. Initial API-test failures were caused by the
test VM lacking a fetch binding; the harness now rejects unexpected external
network requests, and all cases pass. Live n8n and production data were not used.

## Before production approval: read-only impact checks

Run only after explicit permission to inspect production. These aggregates do
not output customer IDs, URLs, or content. No cleanup is automatic.

```sql
SELECT count(*) AS basic_accounts_over_link_limit
FROM (
  SELECT cp.client_id
  FROM public.client_platforms cp
  JOIN public.clients c ON c.id = cp.client_id
  WHERE lower(btrim(c.plan)) = 'basic' AND cp.is_active IS TRUE
  GROUP BY cp.client_id HAVING count(*) > 1
) affected;

SELECT count(*) AS mismatched_platform_branch_rows
FROM public.client_platforms cp
JOIN public.branches b ON b.id = cp.branch_id
WHERE cp.client_id IS DISTINCT FROM b.client_id;

SELECT count(*) AS accounts_over_branch_limit
FROM (
  SELECT b.client_id, c.plan
  FROM public.branches b JOIN public.clients c ON c.id = b.client_id
  WHERE b.status IN ('active', 'suspended')
  GROUP BY b.client_id, c.plan
  HAVING count(*) > CASE lower(btrim(c.plan))
    WHEN 'enterprise' THEN 20 WHEN 'pro' THEN 3 ELSE 1 END
) affected;

SELECT count(*) AS accounts_over_platform_type_limit
FROM (
  SELECT cp.client_id, c.plan, c.subscription_status
  FROM public.client_platforms cp JOIN public.clients c ON c.id = cp.client_id
  WHERE cp.is_active IS TRUE
  GROUP BY cp.client_id, c.plan, c.subscription_status
  HAVING count(DISTINCT cp.platform_name) > CASE
    WHEN c.subscription_status = 'trial' THEN 1
    WHEN lower(btrim(c.plan)) = 'enterprise' THEN 4
    WHEN lower(btrim(c.plan)) = 'pro' THEN 2 ELSE 1 END
) affected;
```

## Apply, only after separate production approval

1. Retain the supplied original definitions and take the normal database backup.
2. Review the aggregate checks and agree how to handle any affected accounts;
   no customer cleanup is included in this migration.
3. Apply only `20261011120000_guard_subscription_writes.sql` using the project's
   migration process. Do not blindly apply all older migrations. If applying
   manually in SQL Editor, wrap the file in BEGIN/COMMIT so any error rolls back
   the entire change. Allow for short DDL locks on the two tables.
4. Deploy the API error-handling changes only after their separate approval.
5. Validate authorized test accounts and existing workflow behavior. Local
   service-role tests do not establish that the deployed n8n workflows ran.

## Rollback

The rollback file is under `supabase/rollback/`, outside automatic migrations.
After approval, run its full contents in one BEGIN/COMMIT transaction. It drops
only the new triggers, their private functions and coordination table, and
restores the original `private.can_use_platform` definition. No customer rows,
existing indexes, old triggers or RLS policies are removed. Reconcile migration
history with the deployment tool used before attempting a later reapplication.
The API error mappings are backward-compatible, or can be reverted with this
branch's application changes. Rollback restores the original protection gaps.
