// Local-only: creates its own network-isolated disposable PostgreSQL container.
// No environment credentials, Supabase URL, or external database URL are used.
const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const directory = path.resolve(__dirname, '..');
const container = `inteleye-quota-${process.pid}`;
const args = ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'inteleye_test', '-v', 'ON_ERROR_STOP=1', '-At'];
const uuid = id => `00000000-0000-0000-0000-${String(id).padStart(12, '0')}`;
function sql(text) {
  return execFileSync('docker', args, { input: text, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}
function asUser(id, text) {
  return sql(`SET request.jwt.claim.sub='${uuid(id)}'; SET ROLE authenticated; ${text}`);
}
function branch(client, name = 'test') {
  return `INSERT INTO public.branches(client_id,name,status) VALUES (${client},'${name}','active') RETURNING id;`;
}
function platform(client, branchId, type = 'google_maps', suffix = 'test') {
  return `INSERT INTO public.client_platforms(client_id,branch_id,platform_name,platform_url,is_active)
    VALUES (${client},${branchId ?? 'NULL'},'${type}','https://public.example/${suffix}',true) RETURNING id;`;
}
function lastId(output) { return Number(output.split('\n').find(line => /^\d+$/.test(line))); }
function denied(action, expected) {
  assert.throws(action, error => String(error.stderr).includes(expected), expected);
}
function session(text) {
  const child = spawn('docker', args);
  let stdout = '', stderr = '';
  let unlock;
  const ready = new Promise(resolve => { unlock = resolve; });
  child.stdout.on('data', chunk => { stdout += chunk; if (stdout.includes('LOCK_HELD')) unlock(); });
  child.stderr.on('data', chunk => { stderr += chunk; });
  const done = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', code => { unlock(); resolve({ code, stdout, stderr }); });
  });
  child.stdin.end(text);
  return { ready, done };
}

test('subscription guards on disposable PostgreSQL 16', { timeout: 120000 }, async t => {
  execFileSync('docker', ['run', '-d', '--name', container, '--network', 'none',
    '--env', 'POSTGRES_PASSWORD=local-test-only', '--env', 'POSTGRES_DB=inteleye_test', 'postgres:16-alpine'], { stdio: 'pipe' });
  t.after(() => execFileSync('docker', ['rm', '-f', container], { stdio: 'pipe' }));
  for (let attempt = 0; ; attempt++) {
    try { sql('SELECT 1;'); break; } catch (error) {
      if (attempt === 100) throw error;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  sql(fs.readFileSync(path.join(directory, 'tests/subscription-fixture.sql'), 'utf8'));
  sql('GRANT EXECUTE ON FUNCTION private.normalize_platform_link(text) TO authenticated;');
  sql(`INSERT INTO public.clients(id,user_id,plan,subscription_status,current_period_end,trial_ends_at)
    SELECT id, ('00000000-0000-0000-0000-' || lpad(id::text,12,'0'))::uuid,
    CASE WHEN id IN (1,2,11,20,21,22,23) THEN 'basic' WHEN id=4 THEN 'enterprise' ELSE 'pro' END,
    CASE WHEN id=5 THEN 'trial' WHEN id=6 THEN 'expired' ELSE 'active' END,
    now()+interval '1 year', now()+interval '1 week' FROM generate_series(1,40) id;`);

  await t.test('reproduces the original Basic limit and foreign-branch update gaps, then rolls back', () => {
    sql(`BEGIN; SET request.jwt.claim.sub='${uuid(1)}'; SET ROLE authenticated; ` + branch(1) + platform(1, null, 'google_maps', 'first') +
      platform(1, 1, 'google_maps', 'second') + 'ROLLBACK;');
    const own = lastId(sql(branch(1)));
    const foreign = lastId(sql(branch(2)));
    const link = lastId(asUser(1, platform(1, own)));
    asUser(1, `BEGIN; UPDATE public.client_platforms SET branch_id=${foreign} WHERE id=${link}; ROLLBACK;`);
    sql('DELETE FROM public.client_platforms; DELETE FROM public.branches;');
  });
  // Existing over-limit data is deliberately left unchanged by migration.
  for (let index = 0; index < 4; index++) sql(branch(12, `legacy-${index}`));
  for (const type of ['google_maps', 'x', 'instagram']) sql(platform(12, null, type, `legacy-${type}`));
  sql('BEGIN; ' + fs.readFileSync(path.join(directory, 'migrations/20261011120000_guard_subscription_writes.sql'), 'utf8') + ' COMMIT;');

  let basicBranch, basicLink, proBranch, proLink, foreignBranch;
  await t.test('Basic creates one branch and one link normally', () => {
    basicBranch = lastId(asUser(1, branch(1)));
    basicLink = lastId(asUser(1, platform(1, basicBranch)));
    assert.ok(basicLink > 0);
  });
  await t.test('Basic rejects a second same-type global link through direct authenticated SQL', () => {
    denied(() => asUser(1, platform(1, null, 'google_maps', 'second')), 'platform_link_limit_reached');
  });
  await t.test('Basic helper also returns false when its link slot is occupied', () => {
    assert.equal(asUser(1, `SELECT private.can_use_platform(1,'google_maps',NULL);`).split('\n').at(-1), 'f');
  });
  await t.test('Basic rejects a second link even through service_role', () => {
    denied(() => sql('SET ROLE service_role; ' + platform(1, null, 'x')), 'platform_link_limit_reached');
  });
  await t.test('Basic rejects an additional branch', () => {
    denied(() => asUser(1, branch(1, 'second')), 'branch_plan_limit_reached');
  });
  await t.test('same public URL is allowed in another account', () => {
    foreignBranch = lastId(asUser(2, branch(2)));
    assert.ok(lastId(asUser(2, platform(2, foreignBranch))) > 0);
  });
  await t.test('foreign branch is rejected on platform insertion', () => {
    denied(() => asUser(3, platform(3, foreignBranch)), 'platform_branch_client_mismatch');
  });
  await t.test('foreign branch is rejected on direct platform update', () => {
    denied(() => asUser(1, `UPDATE public.client_platforms SET branch_id=${foreignBranch} WHERE id=${basicLink};`), 'platform_branch_client_mismatch');
  });
  await t.test('inactive links also cannot be attached to a foreign branch', () => {
    denied(() => sql(`INSERT INTO public.client_platforms(client_id,branch_id,platform_name,is_active) VALUES (3,${foreignBranch},'x',false);`), 'platform_branch_client_mismatch');
  });
  await t.test('branch ownership cannot be moved away from its linked account', () => {
    denied(() => sql(`UPDATE public.branches SET client_id=3 WHERE id=${basicBranch};`), 'platform_branch_client_mismatch');
  });
  await t.test('Pro may link its two platform types normally', () => {
    proBranch = lastId(asUser(3, branch(3)));
    proLink = lastId(asUser(3, platform(3, proBranch, 'google_maps', 'pro-google')));
    assert.ok(lastId(asUser(3, platform(3, null, 'x', 'pro-x'))) > 0);
  });
  await t.test('Pro rejects a third platform type by insertion', () => {
    denied(() => asUser(3, platform(3, null, 'instagram')), 'platform_type_limit_reached');
  });
  await t.test('Pro same-type links in other scopes remain allowed', () => {
    assert.ok(lastId(asUser(3, platform(3, null, 'google_maps', 'other-google'))) > 0);
  });
  await t.test('direct platform-name update cannot introduce a third type', () => {
    denied(() => asUser(3, `UPDATE public.client_platforms SET platform_name='tiktok' WHERE id=${proLink};`), 'platform_type_limit_reached');
  });
  await t.test('replacing the only link of a type preserves its slot', () => {
    const link = lastId(asUser(7, platform(7, null, 'x', 'replace-type')));
    asUser(7, `UPDATE public.client_platforms SET platform_name='tiktok' WHERE id=${link};`);
  });
  await t.test('direct reactivation cannot exceed Basic link limit', () => {
    const link = lastId(sql(`INSERT INTO public.client_platforms(client_id,platform_name,is_active) VALUES (1,'x',false) RETURNING id;`));
    denied(() => asUser(1, `UPDATE public.client_platforms SET is_active=true WHERE id=${link};`), 'platform_link_limit_reached');
  });
  await t.test('suspend and reactivate branch using the existing RPC', () => {
    asUser(1, `SELECT public.set_branch_status(${basicBranch},'suspended');`);
    asUser(1, `SELECT public.set_branch_status(${basicBranch},'active');`);
    assert.equal(sql(`SELECT is_active FROM public.client_platforms WHERE id=${basicLink};`), 't');
  });
  await t.test('suspended branches still count against the quota', () => {
    asUser(1, `SELECT public.set_branch_status(${basicBranch},'suspended');`);
    denied(() => asUser(1, branch(1)), 'branch_plan_limit_reached');
    asUser(1, `SELECT public.set_branch_status(${basicBranch},'active');`);
  });
  await t.test('existing rotate-link RPC archives the old link and creates its replacement', () => {
    asUser(1, `SELECT * FROM public.rotate_branch_platform_link(${basicBranch},${basicLink},'https://public.example/replacement',NULL);`);
    assert.equal(sql('SELECT count(*) FROM public.client_platforms WHERE client_id=1 AND is_active;'), '1');
  });
  await t.test('n8n service-role sync metadata updates do not consume slots', () => {
    sql("SET ROLE service_role; UPDATE public.client_platforms SET connection_status='connected',last_sync_at=now(),last_error=NULL WHERE client_id=1 AND is_active;");
    assert.equal(sql("SELECT count(*) FROM public.client_platforms WHERE client_id=1 AND connection_status='connected' AND is_active;"), '1');
  });
  await t.test('Trial can obtain its main branch and first link', () => {
    const id = lastId(asUser(5, 'SELECT public.ensure_onboarding_main_branch();'));
    assert.ok(lastId(asUser(5, platform(5, id))) > 0);
    denied(() => asUser(5, platform(5, null, 'x')), 'platform_link_limit_reached');
  });
  await t.test('expired subscription still cannot insert links', () => {
    denied(() => asUser(6, platform(6, null)), 'row-level security');
  });
  await t.test('anonymous table privileges do not bypass RLS', () => {
    denied(() => sql('SET ROLE anon; ' + platform(3, null, 'x')), 'row-level security');
  });
  await t.test('internal coordination table is inaccessible to API roles', () => {
    for (const role of ['anon', 'authenticated', 'service_role']) {
      denied(() => sql(`SET ROLE ${role}; SELECT * FROM private.subscription_write_locks;`), 'permission denied');
    }
  });
  await t.test('Enterprise retains all four platform types', () => {
    for (const type of ['google_maps', 'x', 'tiktok', 'instagram']) asUser(4, platform(4, null, type, type));
  });
  await t.test('migration preserves over-limit data and permits metadata changes and disabling', () => {
    assert.equal(sql('SELECT count(*) FROM public.branches WHERE client_id=12;'), '4');
    assert.equal(sql('SELECT count(*) FROM public.client_platforms WHERE client_id=12 AND is_active;'), '3');
    asUser(12, "UPDATE public.branches SET name='updated legacy name' WHERE client_id=12;");
    asUser(12, "UPDATE public.client_platforms SET last_error=NULL WHERE client_id=12;");
    denied(() => asUser(12, platform(12, null, 'tiktok')), 'platform_type_limit_reached');
    asUser(12, "UPDATE public.client_platforms SET is_active=false WHERE client_id=12 AND platform_name='instagram';");
  });
  await t.test('n8n service role can create a valid first link and update its sync fields', () => {
    const id = lastId(sql('SET ROLE service_role; ' + branch(14)));
    const link = lastId(sql('SET ROLE service_role; ' + platform(14, id)));
    sql(`SET ROLE service_role; UPDATE public.client_platforms SET connection_status='syncing' WHERE id=${link};`);
  });
  await t.test('moving a link between two branches of the same account and to global is allowed', () => {
    const id = lastId(asUser(14, branch(14, 'other')));
    const link = lastId(sql('SELECT id FROM public.client_platforms WHERE client_id=14;'));
    asUser(14, `UPDATE public.client_platforms SET branch_id=${id} WHERE id=${link};`);
    asUser(14, `UPDATE public.client_platforms SET branch_id=NULL WHERE id=${link};`);
  });
  await t.test('multi-row platform insertion cannot overbook Basic', () => {
    denied(() => sql("INSERT INTO public.client_platforms(client_id,platform_name,platform_url,is_active) VALUES (11,'x','https://public.example/one',true),(11,'tiktok','https://public.example/two',true);"), 'platform_link_limit_reached');
    assert.equal(sql('SELECT count(*) FROM public.client_platforms WHERE client_id=11;'), '0');
  });
  await t.test('multi-row insert cannot overbook branches and rolls back the whole statement', () => {
    denied(() => sql("INSERT INTO public.branches(client_id,name,status) VALUES (11,'one','active'),(11,'two','active');"), 'branch_plan_limit_reached');
    assert.equal(sql('SELECT count(*) FROM public.branches WHERE client_id=11;'), '0');
  });
  await t.test('deleted branch cannot be resurrected using a direct update', () => {
    const id = lastId(sql("INSERT INTO public.branches(client_id,name,status) VALUES (11,'old','deleted') RETURNING id;"));
    denied(() => asUser(11, `UPDATE public.branches SET status='active' WHERE id=${id};`), 'deleted_branch_cannot_be_reactivated');
  });

  for (const [client, kind, isolation] of [[20, 'branch', 'READ COMMITTED'], [21, 'platform', 'READ COMMITTED'],
    [22, 'branch', 'REPEATABLE READ'], [23, 'platform', 'SERIALIZABLE']]) {
    await t.test(`concurrent ${kind} writes cannot overbook under ${isolation}`, async () => {
      const aWrite = kind === 'branch' ? branch(client, 'first') : platform(client, null, 'google_maps', 'first');
      const bWrite = kind === 'branch' ? branch(client, 'second') : platform(client, null, 'x', 'second');
      const a = session(`BEGIN; ${aWrite} SELECT 'LOCK_HELD'; SELECT pg_sleep(0.6); COMMIT;`);
      await a.ready;
      const b = session(`BEGIN ISOLATION LEVEL ${isolation}; SELECT count(*) FROM public.branches;
        ${bWrite} COMMIT;`);
      const [first, second] = await Promise.all([a.done, b.done]);
      assert.equal(first.code, 0, first.stderr);
      assert.notEqual(second.code, 0);
      assert.match(second.stderr, /limit_reached|could not serialize/);
      assert.equal(sql(`SELECT count(*) FROM public.${kind === 'branch' ? 'branches' : 'client_platforms'} WHERE client_id=${client};`), '1');
    });
  }
  await t.test('concurrent direct reactivation cannot overbook Basic', async () => {
    const links = sql("INSERT INTO public.client_platforms(client_id,platform_name,is_active) VALUES (11,'x',false),(11,'tiktok',false) RETURNING id;")
      .split('\n').filter(line => /^\d+$/.test(line)).map(Number);
    const first = session(`BEGIN; UPDATE public.client_platforms SET is_active=true WHERE id=${links[0]}; SELECT 'LOCK_HELD'; SELECT pg_sleep(0.6); COMMIT;`);
    await first.ready;
    const second = session(`UPDATE public.client_platforms SET is_active=true WHERE id=${links[1]};`);
    const [a, b] = await Promise.all([first.done, second.done]);
    assert.equal(a.code, 0, a.stderr);
    assert.notEqual(b.code, 0);
    assert.match(b.stderr, /platform_link_limit_reached/);
    assert.equal(sql('SELECT count(*) FROM public.client_platforms WHERE client_id=11 AND is_active;'), '1');
  });
  await t.test('concurrent new types cannot exceed the Pro two-type limit', async () => {
    sql(platform(30, null, 'x', 'existing'));
    const first = session(`BEGIN; ${platform(30, null, 'google_maps', 'first')} SELECT 'LOCK_HELD'; SELECT pg_sleep(0.6); COMMIT;`);
    await first.ready;
    const second = session(platform(30, null, 'instagram', 'second'));
    const [a, b] = await Promise.all([first.done, second.done]);
    assert.equal(a.code, 0, a.stderr);
    assert.notEqual(b.code, 0);
    assert.match(b.stderr, /platform_type_limit_reached/);
    assert.equal(sql('SELECT count(distinct platform_name) FROM public.client_platforms WHERE client_id=30 AND is_active;'), '2');
  });
  await t.test('rollback restores the original helper and removes guards without deleting customer rows', () => {
    const before = sql('SELECT count(*) FROM public.client_platforms;');
    sql('BEGIN; ' + fs.readFileSync(path.join(directory, 'rollback/20261011120000_guard_subscription_writes.sql'), 'utf8') + ' COMMIT;');
    assert.equal(sql('SELECT count(*) FROM public.client_platforms;'), before);
    assert.equal(asUser(1, "SELECT private.can_use_platform(1,'google_maps',NULL);").split('\n').at(-1), 't');
    assert.equal(sql("SELECT to_regclass('private.subscription_write_locks') IS NULL;"), 't');
  });
});
