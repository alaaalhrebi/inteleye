// Disposable PostgreSQL with --network none. Never reads hosted credentials.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const container = `inteleye-weekly-email-${process.pid}`;
const args = ['exec', '-i', container, 'psql', '-X', '-U', 'postgres', '-d', 'inteleye_test', '-v', 'ON_ERROR_STOP=1', '-Atq'];
const sql = input => execFileSync('docker', args, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
function denied(input) { assert.throws(() => sql(input), e => /permission denied|row-level security/.test(String(e.stderr))); }
function session(input) {
  const child = spawn('docker', args); let output = '', errors = '', readyResolve;
  const ready = new Promise(resolve => { readyResolve = resolve; });
  child.stdout.on('data', data => { output += data; if (output.includes('LOCK_HELD')) readyResolve(); });
  child.stderr.on('data', data => { errors += data; });
  const done = new Promise((resolve, reject) => {
    child.on('error', reject); child.on('close', code => { readyResolve(); resolve({ code, output, errors }); });
  });
  child.stdin.end(input); return { ready, done };
}
test('weekly notifications and trial RLS on isolated PostgreSQL', { timeout: 60000 }, async t => {
  execFileSync('docker', ['run', '-d', '--name', container, '--network', 'none', '--env', 'POSTGRES_PASSWORD=synthetic-only',
    '--env', 'POSTGRES_DB=inteleye_test', 'postgres:16-alpine'], { stdio: 'pipe' });
  t.after(() => execFileSync('docker', ['rm', '-f', container], { stdio: 'pipe' }));
  for (let i = 0; ; i++) {
    try { sql('select 1;'); break; } catch (e) { if (i === 100) throw e; await new Promise(r => setTimeout(r, 100)); }
  }
  sql(fs.readFileSync(path.join(root, 'tests/subscription-fixture.sql'), 'utf8'));
  sql(`create table reports(id bigint primary key, client_id bigint references clients(id), report_type text, status text);
    alter table reports enable row level security;
    grant select on reports to authenticated; grant select,insert,update on reports to service_role;
    create policy existing_broad_read on reports for select to authenticated using (true);
    insert into clients(id,user_id,plan,subscription_status,trial_ends_at,current_period_end) values
      (1,'00000000-0000-0000-0000-000000000001','basic','trial',now()+interval '1 day',null),
      (2,'00000000-0000-0000-0000-000000000002','pro','active',null,now()+interval '1 month'),
      (3,'00000000-0000-0000-0000-000000000003','basic','trial',now()-interval '1 day',null),
      (4,'00000000-0000-0000-0000-000000000004','basic','active',null,now()+interval '1 month');
    insert into reports values(100,1,'weekly','completed');`);
  sql(`create table report_requests(id text primary key,client_id bigint,requested_by uuid);
    alter table report_requests enable row level security; grant insert,select on report_requests to authenticated;`);
  sql(fs.readFileSync(path.join(root, 'migrations/20260802210744_restrict_custom_report_requests_to_advanced_plans.sql'), 'utf8'));
  const before = sql("select md5(string_agg(row_to_json(c)::text,'' order by id)) from clients c;");
  sql('begin; ' + fs.readFileSync(path.join(root, 'migrations/20261015120000_weekly_report_notifications.sql'), 'utf8') + ' commit;');
  await t.test('installation rewrites no clients and backfills no historical notifications', () => {
    assert.equal(sql("select md5(string_agg(row_to_json(c)::text,'' order by id)) from clients c;"), before);
    assert.equal(sql('select count(*) from report_email_notifications;'), '0');
  });
  sql(`insert into reports values (1,1,'weekly','completed'),(2,1,'custom','completed'),(3,1,'initial_historical','completed'),
    (4,1,'weekly','processing'),(5,2,'weekly','completed'),(6,2,'custom','completed'),(7,3,'weekly','completed');`);
  await t.test('only completed weekly reports enqueue; completion updates enqueue once', () => {
    assert.equal(sql('select count(*) from report_email_notifications;'), '3');
    sql("update reports set status='completed' where id=4; update reports set status='completed' where id=4;");
    assert.equal(sql('select count(*) from report_email_notifications where report_id=4;'), '1');
  });
  await t.test('trial direct DB reads exclude custom, initial, processing, and other accounts', () => {
    sql("insert into reports values(8,1,'weekly','processing');");
    assert.equal(sql("set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001'; set role authenticated; select string_agg(id::text,',' order by id) from reports;"), '1,4,100');
  });
  await t.test('paid users retain own report history but never other customers', () => {
    assert.equal(sql("set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002'; set role authenticated; select string_agg(id::text,',' order by id) from reports;"), '5,6');
  });
  await t.test('expired trial reads nothing even under an existing permissive policy', () => {
    assert.equal(sql("set request.jwt.claim.sub='00000000-0000-0000-0000-000000000003'; set role authenticated; select count(*) from reports;"), '0');
  });
  await t.test('existing DB policy still forbids custom creation for trial and Basic, allowing Pro', () => {
    for (const id of [1, 4]) {
      const uid = `00000000-0000-0000-0000-${String(id).padStart(12, '0')}`;
      denied(`set request.jwt.claim.sub='${uid}'; set role authenticated; insert into report_requests values('request-${id}',${id},'${uid}');`);
    }
    const uid = '00000000-0000-0000-0000-000000000002';
    sql(`set request.jwt.claim.sub='${uid}'; set role authenticated; insert into report_requests values('request-pro',2,'${uid}');`);
    assert.equal(sql('select count(*) from report_requests;'), '1');
  });
  await t.test('customers and anonymous users cannot read or mutate delivery state', () => {
    for (const role of ['authenticated', 'anon']) {
      denied(`set role ${role}; select * from report_email_notifications;`);
      denied(`set role ${role}; update report_email_notifications set status='sent';`);
      denied(`set role ${role}; select private.enqueue_weekly_report_email();`);
    }
  });
  await t.test('concurrent senders acquire one claim only', async () => {
    const statement = "update report_email_notifications set status='sending' where report_id=1 and status='pending' returning 'CLAIMED';";
    const first = session(`begin; set role service_role; ${statement} select 'LOCK_HELD'; select pg_sleep(0.3); commit;`);
    await first.ready;
    const second = session(`set role service_role; ${statement}`);
    const [a, b] = await Promise.all([first.done, second.done]);
    assert.equal(a.code, 0, a.errors); assert.equal(b.code, 0, b.errors);
    assert.ok(a.output.includes('CLAIMED')); assert.ok(!b.output.includes('CLAIMED'));
  });
  await t.test('duplicate report completion never resets sending, unknown, or sent jobs', () => {
    sql("update reports set status='completed' where id=1;");
    assert.equal(sql('select status from report_email_notifications where report_id=1;'), 'sending');
    for (const status of ['unknown', 'sent']) {
      sql(`set role service_role; update report_email_notifications set status='${status}' where report_id=1; update reports set status='completed' where id=1;`);
      assert.equal(sql('select status from report_email_notifications where report_id=1;'), status);
      assert.equal(sql("set role service_role; update report_email_notifications set status='sending' where report_id=1 and status='pending' returning 'CLAIMED';"), '');
    }
  });
});
