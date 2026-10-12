// Disposable, network-isolated PostgreSQL. Synthetic accounts only; no credentials read.
const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const container = `inteleye-payments-${process.pid}`;
const args = ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'inteleye_test', '-v', 'ON_ERROR_STOP=1', '-At'];
const uuid = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
function sql(input) { return execFileSync('docker', args, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim(); }
function denied(input, pattern) { assert.throws(() => sql(input), error => String(error.stderr).includes(pattern)); }
function order(n, overrides = '') {
  return sql(`insert into payment_orders(id,client_id,target_plan,amount,currency,purchase_type,environment,baseline_plan,baseline_status,baseline_period_end)
    select '${uuid(n)}',id,'pro',49900,'SAR','subscription','live',plan,subscription_status,current_period_end from clients where id=${n}; ${overrides}`);
}
function record(n, amount = 49900, currency = 'SAR', status = 'paid', paymentId = uuid(n)) {
  return sql(`set role service_role; select record_verified_payment('${paymentId}','${uuid(n)}',${amount},'${currency}','${status}');`);
}
function apply(paymentId) { return sql(`set role service_role; select apply_verified_payment('${paymentId}');`).split('\n').at(-1); }
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
test('payment cycle on isolated PostgreSQL 16', { timeout: 120000 }, async t => {
  execFileSync('docker', ['run', '-d', '--name', container, '--network', 'none', '--env', 'POSTGRES_PASSWORD=synthetic-only',
    '--env', 'POSTGRES_DB=inteleye_test', 'postgres:16-alpine'], { stdio: 'pipe' });
  t.after(() => execFileSync('docker', ['rm', '-f', container], { stdio: 'pipe' }));
  for (let i = 0; ; i++) {
    try { sql('select 1;'); break; } catch (e) { if (i === 100) throw e; await new Promise(r => setTimeout(r, 100)); }
  }
  sql(fs.readFileSync(path.join(root, 'tests/subscription-fixture.sql'), 'utf8'));
  sql(fs.readFileSync(path.join(root, 'migrations/20261011120000_guard_subscription_writes.sql'), 'utf8'));
  sql(`insert into clients(id,user_id,plan,subscription_status) select n,('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'basic','pending' from generate_series(1,20) n;`);
  const before = sql('select md5(string_agg(row_to_json(c)::text,\'\' order by id)) from clients c;');
  sql('begin; ' + fs.readFileSync(path.join(root, 'migrations/20261012120000_add_payment_cycle.sql'), 'utf8') + ' commit;');
  await t.test('migration does not rewrite existing clients', () => {
    assert.equal(sql('select md5(string_agg(row_to_json(c)::text,\'\' order by id)) from clients c;'), before);
  });
  for (let n = 1; n <= 12; n++) order(n);
  await t.test('clients cannot insert orders, forge records, or execute activation', () => {
    denied(`set role authenticated; insert into payment_orders(client_id,target_plan,amount,purchase_type,environment) values(1,'pro',1,'subscription','live');`, 'permission denied');
    denied(`set role authenticated; update payments set provider_status='paid';`, 'permission denied');
    denied(`set role authenticated; select apply_verified_payment('${uuid(1)}');`, 'permission denied');
    denied(`set role authenticated; select record_verified_payment('${uuid(1)}','${uuid(1)}',49900,'SAR','paid');`, 'permission denied');
    denied(`set role anon; select * from payment_orders;`, 'permission denied');
  });
  await t.test('one open order per client', () => {
    denied(`insert into payment_orders(client_id,target_plan,amount,purchase_type,environment) values(1,'pro',49900,'subscription','live');`, 'duplicate key');
  });
  await t.test('simultaneous order creation retains one pending order', async () => {
    const statement = `insert into payment_orders(client_id,target_plan,amount,purchase_type,environment) values(20,'pro',49900,'subscription','live');`;
    const first = session(`begin; ${statement} select 'LOCK_HELD'; select pg_sleep(0.5); commit;`);
    await first.ready;
    const second = session(statement);
    const [a, b] = await Promise.all([first.done, second.done]);
    assert.equal(a.code, 0, a.errors); assert.notEqual(b.code, 0); assert.match(b.errors, /duplicate key/);
    assert.equal(sql('select count(*) from payment_orders where client_id=20;'), '1');
  });
  await t.test('own financial records are isolated by RLS', () => {
    record(1); record(2);
    assert.equal(sql(`set request.jwt.claim.sub='${uuid(1)}'; set role authenticated; select count(*) from payment_orders;`).split('\n').at(-1), '1');
    assert.equal(sql(`set request.jwt.claim.sub='${uuid(1)}'; set role authenticated; select count(*) from payments;`).split('\n').at(-1), '1');
  });
  await t.test('calendar month activation and replay do not extend subscription', () => {
    assert.equal(apply(uuid(1)), 'fulfilled');
    const snapshot = sql('select row_to_json(c)::text from clients c where id=1;');
    assert.equal(sql("select current_period_end = ((payment_orders.activated_at at time zone 'UTC') + interval '1 month') at time zone 'UTC' from payment_orders join clients on client_id=clients.id where client_id=1;"), 't');
    record(1); assert.equal(apply(uuid(1)), 'fulfilled');
    assert.equal(sql('select row_to_json(c)::text from clients c where id=1;'), snapshot);
    assert.equal(sql("select date '2028-01-31' + interval '1 month' = timestamp '2028-02-29';"), 't');
    assert.equal(sql('select allowed_platforms_count from clients where id=1;'), '2');
  });
  for (const [n, amount, currency] of [[3, 1, 'SAR'], [4, 49900, 'USD']]) {
    await t.test(`mismatched amount/currency ${n} retained for review`, () => {
      record(n, amount, currency); assert.equal(apply(uuid(n)), 'review');
      assert.equal(sql(`select subscription_status from clients where id=${n};`), 'pending');
      assert.equal(sql(`select status from payment_orders where client_id=${n};`), 'review');
    });
  }
  await t.test('initiated, failed and authorized payments never activate', () => {
    for (const [n, status] of [[5, 'initiated'], [6, 'failed'], [7, 'authorized']]) {
      record(n, 49900, 'SAR', status); assert.equal(apply(uuid(n)), 'not_paid');
      assert.equal(sql(`select subscription_status from clients where id=${n};`), 'pending');
    }
    record(5); assert.equal(apply(uuid(5)), 'fulfilled');
  });
  await t.test('payment identity cannot be reassigned to another order', () => {
    denied(`select record_verified_payment('${uuid(1)}','${uuid(2)}',49900,'SAR','paid');`, 'payment_order_mismatch');
  });
  await t.test('activation outage retains verified payment and retry fulfills once', () => {
    record(8);
    sql("create function public.synthetic_outage() returns trigger language plpgsql as $$ begin if new.id=8 then raise exception 'synthetic outage'; end if; return new; end $$; create trigger synthetic_outage before update on clients for each row execute function synthetic_outage();");
    denied(`select apply_verified_payment('${uuid(8)}');`, 'synthetic outage');
    assert.equal(sql(`select provider_status||':'||activation_status from payments where id='${uuid(8)}';`), 'paid:pending');
    assert.equal(sql('select subscription_status from clients where id=8;'), 'pending');
    sql('drop trigger synthetic_outage on clients; drop function synthetic_outage();');
    assert.equal(apply(uuid(8)), 'fulfilled'); assert.equal(apply(uuid(8)), 'fulfilled');
  });
  await t.test('simultaneous callback/webhook fulfills once', async () => {
    record(9);
    const a = session(`begin; select 1 from payments where id='${uuid(9)}' for update; select 'LOCK_HELD'; select pg_sleep(0.5); select apply_verified_payment('${uuid(9)}'); commit;`);
    await a.ready;
    const b = session(`select apply_verified_payment('${uuid(9)}');`);
    const results = await Promise.all([a.done, b.done]);
    results.forEach(result => { assert.equal(result.code, 0, result.errors); assert.match(result.output, /fulfilled/); });
    assert.equal(sql(`select count(*) from payments where order_id='${uuid(9)}' and activation_status='applied';`), '1');
  });
  await t.test('second paid transaction is retained without second activation', () => {
    record(9, 49900, 'SAR', 'paid', uuid(99)); assert.equal(apply(uuid(99)), 'review');
    assert.equal(sql(`select count(*) from payments where order_id='${uuid(9)}';`), '2');
  });
  await t.test('different paid IDs arriving simultaneously cannot activate twice', async () => {
    order(14); record(14); record(14, 49900, 'SAR', 'paid', uuid(114));
    const first = session(`begin; select 1 from payments where id='${uuid(14)}' for update; select 'LOCK_HELD'; select pg_sleep(0.5); select apply_verified_payment('${uuid(14)}'); commit;`);
    await first.ready;
    const second = session(`select apply_verified_payment('${uuid(114)}');`);
    const results = await Promise.all([first.done, second.done]);
    results.forEach(result => assert.equal(result.code, 0, result.errors));
    assert.equal(sql(`select count(*) from payments where order_id='${uuid(14)}' and activation_status='applied';`), '1');
    assert.equal(sql(`select count(*) from payments where order_id='${uuid(14)}' and activation_status='review';`), '1');
  });
  await t.test('upgrade retains original expiry; null/expired expiry requires review', () => {
    for (const n of [10, 11, 12]) {
      sql(`update clients set subscription_status='active',current_period_end=${n === 11 ? 'null' : n === 12 ? "now()-interval '1 day'" : "now()+interval '20 days'"} where id=${n};
        update payment_orders set amount=30000,purchase_type='upgrade',baseline_status='active',baseline_period_end=(select current_period_end from clients where id=${n}) where client_id=${n};`);
      record(n, 30000); assert.equal(apply(uuid(n)), n === 10 ? 'fulfilled' : 'review');
    }
    assert.equal(sql('select clients.current_period_end = payment_orders.baseline_period_end from clients join payment_orders on client_id=clients.id where clients.id=10;'), 't');
  });
  await t.test('changed client baseline cannot be downgraded by stale payment', () => {
    order(13); record(13); sql("update clients set plan='enterprise' where id=13;");
    assert.equal(apply(uuid(13)), 'review'); assert.equal(sql('select plan from clients where id=13;'), 'enterprise');
  });
  await t.test('review order cannot be activated using a different paid attempt', () => {
    record(3, 49900, 'SAR', 'paid', uuid(103)); assert.equal(apply(uuid(103)), 'review');
    assert.equal(sql('select subscription_status from clients where id=3;'), 'pending');
  });
  await t.test('intent reservations are atomic across real concurrent sessions', async () => {
    order(15);
    const first = session(`begin; update payment_orders set intent_generation='${uuid(150)}',intent_reserved_at=now()
      where id='${uuid(15)}' and status='pending' and intent_generation is null and intent_id is null;
      select 'LOCK_HELD'; select pg_sleep(0.5); commit;`);
    await first.ready;
    const second = session(`with claim as (update payment_orders set intent_generation='${uuid(151)}',intent_reserved_at=now()
      where id='${uuid(15)}' and status='pending' and intent_generation is null and intent_id is null returning id)
      select count(*) from claim;`);
    const [a, b] = await Promise.all([first.done, second.done]);
    assert.equal(a.code, 0, a.errors); assert.equal(b.code, 0, b.errors); assert.equal(b.output.trim(), '0');
    assert.equal(sql(`select intent_generation from payment_orders where id='${uuid(15)}';`), uuid(150));
  });
  await t.test('reclaimed creation fences late publishers, and committed IDs cannot be cleared as abandoned', () => {
    order(16);
    sql(`update payment_orders set intent_generation='${uuid(160)}',intent_reserved_at=now()-interval '1 minute' where id='${uuid(16)}';`);
    sql(`update payment_orders set intent_generation='${uuid(161)}',intent_reserved_at=now(),intent_id=null
      where id='${uuid(16)}' and intent_generation='${uuid(160)}' and intent_id is null;`);
    assert.equal(sql(`with saved as (update payment_orders set intent_id='${uuid(1600)}'
      where id='${uuid(16)}' and intent_generation='${uuid(160)}' and intent_id is null returning id) select count(*) from saved;`), '0');
    assert.equal(sql(`with saved as (update payment_orders set intent_id='${uuid(1610)}'
      where id='${uuid(16)}' and intent_generation='${uuid(161)}' and intent_id is null returning id) select count(*) from saved;`), '1');
    assert.equal(sql(`with claim as (update payment_orders set intent_generation='${uuid(162)}',intent_reserved_at=now()
      where id='${uuid(16)}' and intent_generation='${uuid(161)}' and intent_id is null returning id) select count(*) from claim;`), '0');
  });
  await t.test('intent identities remain unique and clients cannot change reservation state', () => {
    denied(`update payment_orders set intent_id='${uuid(1610)}' where id='${uuid(15)}';`, 'duplicate key');
    denied(`set role authenticated; update payment_orders set intent_generation=null,intent_reserved_at=null,intent_id=null;`, 'permission denied');
    denied(`update payment_orders set intent_generation=null where id='${uuid(15)}';`, 'check constraint');
  });
  await t.test('changing an unstarted plan and reserving its intent cannot both win', async () => {
    for (const n of [17, 18]) {
      order(n);
      const reserve = `update payment_orders set intent_generation='${uuid(n * 10)}',intent_reserved_at=now()
        where id='${uuid(n)}' and status='pending' and intent_generation is null and intent_id is null`;
      const retire = `update payment_orders set status='expired' where id='${uuid(n)}'
        and status='pending' and intent_generation is null and intent_id is null`;
      const winner = n === 17 ? reserve : retire, loser = n === 17 ? retire : reserve;
      const first = session(`begin; ${winner}; select 'LOCK_HELD'; select pg_sleep(0.5); commit;`);
      await first.ready;
      const second = session(`with changed as (${loser} returning id) select count(*) from changed;`);
      const [a, b] = await Promise.all([first.done, second.done]);
      assert.equal(a.code, 0, a.errors); assert.equal(b.code, 0, b.errors); assert.equal(b.output.trim(), '0');
    }
  });
});
