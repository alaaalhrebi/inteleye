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
  // Phase 1 of the initial-report experience extends the already installed policies.
  sql(`insert into reports values
    (10,1,'initial','completed'),(11,1,'monthly','completed'),(12,1,'initial_historical','processing'),
    (13,2,'initial_historical','completed'),(14,3,'initial_historical','completed'),(15,1,'initial','failed');`);
  const migration = fs.readFileSync(path.join(root, 'migrations/20261016090000_allow_trial_initial_reports.sql'), 'utf8');
  const readTrial = "set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001'; set role authenticated; select string_agg(id::text,',' order by id) from reports;";
  const beforeExtension = sql(`select json_build_object(
    'clients',(select json_agg(c order by id) from clients c),
    'reports',(select json_agg(r order by id) from reports r),
    'notifications',(select json_agg(n order by id) from report_email_notifications n))::text;`);
  sql('begin; ' + migration + ' commit;');
  await t.test('initial report migration preserves every client, report and delivery state', () => {
    assert.equal(sql(`select json_build_object(
      'clients',(select json_agg(c order by id) from clients c),
      'reports',(select json_agg(r order by id) from reports r),
      'notifications',(select json_agg(n order by id) from report_email_notifications n))::text;`), beforeExtension);
    assert.equal(sql("select polpermissive from pg_policy where polrelid='reports'::regclass and polname='reports_subscription_scope_guard';"), 'f');
  });
  await t.test('trial reads own completed initial and weekly reports despite a broad existing policy', () => {
    assert.equal(sql(readTrial), '1,3,4,10,100');
  });
  await t.test('paid history and expired-trial isolation survive the extension', () => {
    assert.equal(sql("set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002'; set role authenticated; select string_agg(id::text,',' order by id) from reports;"), '5,6,13');
    assert.equal(sql("set request.jwt.claim.sub='00000000-0000-0000-0000-000000000003'; set role authenticated; select count(*) from reports;"), '0');
    assert.equal(sql("set request.jwt.claim.sub='00000000-0000-0000-0000-000000000099'; set role authenticated; select count(*) from reports;"), '0');
    denied('set role anon; select * from reports;');
  });
  await t.test('extension does not enable custom creation for trial or Basic or change Pro access', () => {
    for (const id of [1, 4]) {
      const uid = `00000000-0000-0000-0000-${String(id).padStart(12, '0')}`;
      denied(`set request.jwt.claim.sub='${uid}'; set role authenticated; insert into report_requests values('extension-${id}',${id},'${uid}');`);
    }
    const uid = '00000000-0000-0000-0000-000000000002';
    sql(`set request.jwt.claim.sub='${uid}'; set role authenticated; insert into report_requests values('extension-pro',2,'${uid}');`);
  });
  await t.test('rollback restores weekly-only trial access and keeps existing data', () => {
    sql(fs.readFileSync(path.join(root, 'rollback/20261016090000_allow_trial_initial_reports.sql'), 'utf8'));
    assert.equal(sql(readTrial), '1,4,100');
    assert.equal(sql("select count(*) from reports where report_type in ('initial','initial_historical');"), '6');
    assert.equal(sql('select status from report_email_notifications where report_id=1;'), 'sent');
    sql('begin; ' + migration + ' commit;');
    assert.equal(sql(readTrial), '1,3,4,10,100');
  });
  const initialEmailMigration = fs.readFileSync(path.join(root, 'migrations/20261016210000_notify_initial_report_completion.sql'), 'utf8');
  const snapshot = () => sql(`select json_build_object(
    'clients',(select json_agg(c order by id) from clients c),
    'reports',(select json_agg(r order by id) from reports r),
    'notifications',(select json_agg(n order by id) from report_email_notifications n))::text;`);
  await t.test('initial-email installation preserves all rows and does not enqueue historical reports', () => {
    const before = snapshot();
    sql('begin; ' + initialEmailMigration + ' commit;');
    assert.equal(snapshot(), before);
    sql("update reports set status='completed' where id in (3,10,13);");
    assert.equal(sql('select count(*) from report_email_notifications where report_id in (3,10,13);'), '0');
  });
  await t.test('first initial completion enqueues once, failure and incomplete states do not', () => {
    sql("insert into reports values (20,1,'initial_historical','pending'),(21,2,'initial_historical','processing');");
    sql("update reports set status='failed' where id=20; update reports set status='processing' where id=20;");
    assert.equal(sql('select count(*) from report_email_notifications where report_id in (20,21);'), '0');
    sql("update reports set status='completed' where id=20; update reports set status='completed' where id=20;");
    assert.equal(sql('select count(*) from report_email_notifications where report_id=20 and client_id=1;'), '1');
    sql("insert into reports values (22,2,'initial_historical','completed'),(23,2,'initial','completed'),(24,2,'monthly','completed'),(25,2,'custom','completed');");
    assert.equal(sql('select count(*) from report_email_notifications where report_id in (22,23);'), '2');
    assert.equal(sql('select count(*) from report_email_notifications where report_id in (24,25);'), '0');
  });
  await t.test('concurrent initial-email senders claim one job and never reset uncertain or sent delivery', async () => {
    const statement = "update report_email_notifications set status='sending' where report_id=20 and status='pending' returning 'CLAIMED';";
    const first = session(`begin; set role service_role; ${statement} select 'LOCK_HELD'; select pg_sleep(0.3); commit;`);
    await first.ready;
    const second = session(`set role service_role; ${statement}`);
    const [a, b] = await Promise.all([first.done, second.done]);
    assert.equal(a.code, 0, a.errors); assert.equal(b.code, 0, b.errors);
    assert.ok(a.output.includes('CLAIMED')); assert.ok(!b.output.includes('CLAIMED'));
    for (const status of ['sending', 'unknown', 'sent']) {
      sql(`update report_email_notifications set status='${status}' where report_id=20; update reports set status='completed' where id=20;`);
      assert.equal(sql('select status from report_email_notifications where report_id=20;'), status);
      assert.equal(sql('select count(*) from report_email_notifications where report_id=20;'), '1');
    }
  });
  await t.test('trigger remains private and tenant read policies are unchanged by notification extension', () => {
    for (const role of ['authenticated', 'anon', 'service_role']) denied(`set role ${role}; select private.enqueue_weekly_report_email();`);
    assert.equal(sql("set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001'; set role authenticated; select count(*) from reports where client_id=2;"), '0');
    assert.equal(sql("select count(*) from pg_trigger where tgrelid='reports'::regclass and tgname='enqueue_weekly_report_email' and not tgisinternal;"), '1');
  });
  await t.test('notification rollback keeps history, restores weekly-only, and reapplication does not backfill', () => {
    const before = snapshot();
    sql(fs.readFileSync(path.join(root, 'rollback/20261016210000_notify_initial_report_completion.sql'), 'utf8'));
    assert.equal(snapshot(), before);
    sql("insert into reports values (26,1,'initial_historical','completed'),(27,1,'weekly','completed');");
    assert.equal(sql('select count(*) from report_email_notifications where report_id=26;'), '0');
    assert.equal(sql('select count(*) from report_email_notifications where report_id=27;'), '1');
    sql('begin; ' + initialEmailMigration + ' commit;');
    sql("update reports set status='completed' where id=26;");
    assert.equal(sql('select count(*) from report_email_notifications where report_id=26;'), '0');
    assert.equal(sql('select status from report_email_notifications where report_id=20;'), 'sent');
  });
});
