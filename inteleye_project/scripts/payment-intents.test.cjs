// All provider calls are synthetic; no Live keys, network or external DB is used.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(file, globals = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, process, Buffer, Request, Response, URL, URLSearchParams, AbortSignal,
    performance, console: { error() {} },
    fetch: () => assert.fail('unexpected external provider request'), require(name) {
      if (name.startsWith('@/')) return load('src/' + name.slice(2) + '.ts', globals);
      if (name.startsWith('./')) return load(path.join(path.dirname(file), name + '.ts'), globals);
      return require(name);
    }, ...globals });
  return module.exports;
}
const { resolveIntent } = load('src/lib/payments/intents.ts');
const { createOrder } = load('src/lib/payments/service.ts');
const api = load('src/lib/payments/intents-provider.ts');
const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const now = Date.now();
const client = { id: 1, plan: 'basic', subscription_status: 'pending', current_period_end: null, trial_ends_at: null };
const template = { id: uid(1), client_id: 1, target_plan: 'basic', amount: 19900, currency: 'SAR', purchase_type: 'subscription',
  status: 'pending', expires_at: new Date(now - 1000).toISOString(), baseline_plan: 'basic', baseline_status: 'pending', baseline_period_end: null,
  intent_generation: null, intent_reserved_at: null, intent_id: null };
const copy = v => JSON.parse(JSON.stringify(v));
function database(initial = {}) {
  const db = { order: { ...copy(template), ...initial }, payments: [], applied: 0, ambiguousPublish: false };
  db.from = table => {
    const filters = []; let update;
    const query = { select() { return this; }, eq(k, v) { filters.push([k, v]); return this; }, is(k, v) { filters.push([k, v]); return this; },
      limit() { return this; }, update(fields) { update = fields; return this; }, insert(fields) { db.inserted = copy(fields); return this; }, async single() { return { data: { ...db.inserted, id: uid(77) }, error: null }; },
      async maybeSingle() {
        const candidates = table === 'payment_orders' ? [db.order] : db.payments;
        const row = candidates.find(r => filters.every(([k, v]) => r[k] === v));
        if (!row) return { data: null, error: null };
        if (update) Object.assign(row, copy(update)); // Atomic conditional update, like PostgREST.
        if (update?.intent_id && db.ambiguousPublish) { db.ambiguousPublish = false; return { data: null, error: { code: 'lost response' } }; }
        return { data: copy(row), error: null };
      } };
    return query;
  };
  db.rpc = async (name, args) => {
    if (name === 'record_verified_payment') {
      let row = db.payments.find(p => p.id === args.p_id);
      if (!row) { row = { id: args.p_id, order_id: args.p_order_id }; db.payments.push(row); }
      Object.assign(row, { provider_status: args.p_status, amount: args.p_amount, currency: args.p_currency });
      return { error: null };
    }
    const row = db.payments.find(p => p.id === args.p_id);
    if (row.provider_status !== 'paid') return { data: 'not_paid', error: null };
    if (row.amount !== db.order.amount || row.currency !== db.order.currency) { db.order.status = 'review'; return { data: 'review', error: null }; }
    if (db.activationOutage) return { data: null, error: { code: 'outage' } };
    if (db.order.status !== 'fulfilled') db.applied++;
    db.order.status = 'fulfilled'; return { data: 'fulfilled', error: null };
  };
  return db;
}
function fakeProvider(db, status = 'created', paymentStatus = 'paid') {
  const p = { creates: 0, intentStatus: status, paymentStatus, resultMissing: false, serverTime: now, expires: now + 3600000,
    async create(input) { p.creates++; return { id: uid(100 + p.creates), status: 'created', amount: input.amount, currency: input.currency,
      callback_url: input.callback_url, client_secret: 'pi_secret_synthetic', expires_at: new Date(now + 3600000).toISOString(), server_time: now }; },
    async fetch(id) { return { id, amount: 19900, currency: 'SAR', status: p.intentStatus, client_secret: 'pi_secret_synthetic',
      expires_at: new Date(p.expires).toISOString(), server_time: p.serverTime }; },
    async find() { return p.resultMissing ? null : uid(200); },
    async payment(id) { return { id, amount: 19900, currency: 'SAR', refunded: 0, status: p.paymentStatus,
      metadata: { order_id: db.order.id, attempt_id: db.order.intent_generation } }; } };
  return p;
}
const run = (db, p, prepare = true, time = now) => resolveIntent(db, copy(db.order), client, 'https://example.test', prepare, p, time);
const active = { intent_id: uid(20), intent_generation: uid(21), intent_reserved_at: new Date(now - 50000).toISOString() };
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }

test('opening checkout creates no provider intent before pay is pressed', async () => {
  const db = database(), p = fakeProvider(db);
  assert.equal((await run(db, p, false)).status, 'ready'); assert.equal(p.creates, 0); assert.equal(db.order.intent_generation, null);
});
test('closing/reopening checkout reuses the committed unused intent', async () => {
  const db = database(), p = fakeProvider(db); const first = await run(db, p);
  assert.equal(p.creates, 1); assert.equal(first.payment_intent.id, db.order.intent_id);
  assert.equal((await run(db, p, false)).payment_intent, undefined);
  const second = await run(db, p); assert.equal(second.payment_intent.id, first.payment_intent.id); assert.equal(p.creates, 1);
});
test('simultaneous tabs do not create a second usable intent', async () => {
  const db = database(), p = fakeProvider(db), entered = deferred(), finish = deferred();
  const original = p.create; p.create = async input => { entered.resolve(); await finish.promise; return original(input); };
  const a = run(db, p); await entered.promise;
  const b = await run(db, p); assert.equal(b.status, 'waiting'); assert.equal(b.payment_intent, undefined);
  finish.resolve(); const result = await a; assert.equal(result.status, 'ready'); assert.equal(p.creates, 1);
});
test('lost intent creation response retains an unexposed reservation, then safely recovers', async () => {
  const db = database(), p = fakeProvider(db); p.create = async () => { throw new Error('synthetic network failure'); };
  await assert.rejects(run(db, p)); const generation = db.order.intent_generation;
  assert.equal((await run(db, p)).status, 'waiting'); assert.equal(db.order.intent_id, null);
  const healthy = fakeProvider(db); assert.equal((await run(db, healthy, true, now + 31000)).status, 'ready');
  assert.notEqual(db.order.intent_generation, generation);
});
test('late creation response is fenced and never exposes its secret', async () => {
  const db = database(), p = fakeProvider(db), entered = deferred(), late = deferred();
  p.create = async () => { entered.resolve(); return late.promise; };
  const first = run(db, p); await entered.promise;
  const newer = fakeProvider(db); const b = await run(db, newer, true, now + 31000);
  const winningId = b.payment_intent.id;
  late.resolve({ id: uid(999), client_secret: 'pi_secret_never_exposed' });
  const a = await first; assert.equal(a.status, 'waiting'); assert.equal(a.payment_intent, undefined);
  assert.equal(db.order.intent_id, winningId);
});
test('lost database response after successful publication reuses the same intent', async () => {
  const db = database(), p = fakeProvider(db); db.ambiguousPublish = true;
  await assert.rejects(run(db, p), e => e.code === 'INTENT_SAVE_PENDING');
  assert.ok(db.order.intent_id); const result = await run(db, p);
  assert.equal(result.status, 'ready'); assert.equal(p.creates, 1);
});
test('provider outage never releases a published intent', async () => {
  const db = database(active), p = fakeProvider(db); p.fetch = async () => { throw new Error('outage'); };
  await assert.rejects(run(db, p, true, now + 86400000)); assert.equal(db.order.intent_id, active.intent_id); assert.equal(p.creates, 0);
});
test('fulfilled intent is not treated as paid; initiated payment blocks another charge', async () => {
  const db = database(active), p = fakeProvider(db, 'fulfilled', 'initiated');
  assert.equal((await run(db, p)).status, 'waiting'); assert.equal(db.applied, 0); assert.equal(p.creates, 0);
});
test('fulfilled intent with missing payment ID remains blocked even after a day', async () => {
  const db = database(active), p = fakeProvider(db, 'fulfilled'); p.resultMissing = true;
  assert.equal((await run(db, p, true, now + 86400000)).status, 'waiting'); assert.equal(p.creates, 0); assert.equal(db.applied, 0);
});
test('paid recovery fulfills once and never returns another intent', async () => {
  const db = database(active), p = fakeProvider(db, 'fulfilled', 'paid');
  assert.equal((await run(db, p)).status, 'fulfilled'); assert.equal((await run(db, p)).status, 'fulfilled');
  assert.equal(p.creates, 0); assert.equal(db.applied, 1);
});
test('paid activation outage retains payment and a retry activates without charging', async () => {
  const db = database(active), p = fakeProvider(db, 'fulfilled', 'paid'); db.activationOutage = true;
  await assert.rejects(run(db, p), e => e.code === 'ACTIVATION_PENDING');
  assert.equal(db.payments[0].provider_status, 'paid'); assert.equal(p.creates, 0);
  db.activationOutage = false; assert.equal((await run(db, p)).status, 'fulfilled'); assert.equal(db.applied, 1);
});
for (const status of ['failed', 'voided']) test(`confirmed ${status} allows one replacement under concurrent requests`, async () => {
  const db = database(active), p = fakeProvider(db, 'fulfilled', status);
  const results = await Promise.all([run(db, p), run(db, p)]);
  assert.equal(results.filter(r => r.payment_intent).length, 1); assert.equal(p.creates, 1); assert.equal(db.applied, 0);
});
test('confirmed cancellation of an unused intent permits replacement', async () => {
  const db = database(active), p = fakeProvider(db, 'canceled'); assert.equal((await run(db, p)).status, 'ready'); assert.equal(p.creates, 1);
});
test('local time alone cannot expire an intent; provider-confirmed expiry can', async () => {
  const db = database(active), p = fakeProvider(db); p.expires = now + 1000;
  assert.equal((await run(db, p, true, now + 86400000)).payment_intent.id, active.intent_id); assert.equal(p.creates, 0);
  p.serverTime = now + 2000; assert.equal((await run(db, p)).status, 'ready'); assert.equal(p.creates, 1);
});
test('missing provider clock cannot authorize expiry-based replacement', async () => {
  const db = database(active), p = fakeProvider(db); p.serverTime = null; p.expires = now - 1000;
  assert.equal((await run(db, p)).payment_intent.id, active.intent_id); assert.equal(p.creates, 0);
});
test('order timeout does not issue a new order while an intent is unresolved', async () => {
  const db = database(active); const order = await createOrder(db, client, 'basic'); assert.equal(order.id, template.id);
});
test('changing account baseline never returns a chargeable intent', async () => {
  const db = database({ ...active, baseline_plan: 'enterprise' }), p = fakeProvider(db);
  await assert.rejects(run(db, p), e => e.code === 'ACCOUNT_CHANGED'); assert.equal(p.creates, 0);
});
test('wrong payment attempt metadata cannot activate the account', async () => {
  const db = database(active), p = fakeProvider(db, 'fulfilled'); const original = p.payment;
  p.payment = async id => ({ ...await original(id), metadata: { order_id: template.id, attempt_id: uid(999) } });
  await assert.rejects(run(db, p), e => e.code === 'PAYMENT_ORDER_MISMATCH'); assert.equal(db.applied, 0); assert.equal(p.creates, 0);
});

const env = { PAYMENTS_MODE: 'live', VERCEL_ENV: 'production', MOYASAR_SECRET_KEY: 'sk_live_synthetic', NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY: 'pk_live_synthetic' };
const intent = { id: uid(99), amount: 19900, currency: 'SAR', status: 'created', callback_url: 'https://example.test/checkout/success',
  client_secret: 'pi_secret_synthetic', expires_at: new Date(now + 3600000).toISOString() };
test('intent creation sends approved values only, never card data', async () => {
  const result = await api.createLiveIntent({ amount: 19900, currency: 'SAR', description: 'synthetic', callback_url: intent.callback_url }, {
    environment: env, fetchImpl: async (url, options) => {
      assert.equal(url, 'https://api.moyasar.com/v1/payment_intents'); assert.equal(options.method, 'POST'); assert.equal(options.redirect, 'error');
      const body = JSON.parse(options.body); assert.equal(body.amount, 19900); assert.equal(body.source, undefined);
      assert.equal(options.headers.Authorization, 'Basic ' + Buffer.from(env.MOYASAR_SECRET_KEY + ':').toString('base64'));
      return Response.json(intent, { headers: { Date: new Date(now).toUTCString() } });
    } });
  assert.equal(result.id, intent.id);
});
for (const patch of [{ amount: 1 }, { currency: 'USD' }, { callback_url: 'https://other.test' }, { status: 'fulfilled' }, { client_secret: 'wrong' }]) {
  test(`invalid created intent cannot reach browser ${Object.keys(patch)}`, async () => {
    await assert.rejects(api.createLiveIntent({ amount: 19900, currency: 'SAR', description: 'synthetic', callback_url: intent.callback_url }, {
      environment: env, fetchImpl: async () => Response.json({ ...intent, ...patch }),
    }));
  });
}
test('recover missing payment ID via exact metadata and reject incomplete pagination', async () => {
  const data = { payments: [{ id: uid(50), metadata: { order_id: uid(1), attempt_id: uid(2) } }], meta: { next_page: null } };
  const id = await api.findAttemptPayment(uid(1), uid(2), { environment: env, fetchImpl: async url => {
    const u = new URL(url); assert.equal(u.searchParams.get('metadata[attempt_id]'), uid(2)); assert.equal(u.searchParams.get('metadata[order_id]'), uid(1));
    return Response.json(data);
  } });
  assert.equal(id, uid(50));
  await assert.rejects(api.findAttemptPayment(uid(1), uid(2), { environment: env, fetchImpl: async () => Response.json({ ...data, meta: {} }) }));
});
test('an empty provider list does not prove failure', async () => {
  assert.equal(await api.findAttemptPayment(uid(1), uid(2), { environment: env,
    fetchImpl: async () => Response.json({ payments: [], meta: { next_page: null } }) }), null);
});
test('multiple payments for the same attempt require review', async () => {
  await assert.rejects(api.findAttemptPayment(uid(1), uid(2), { environment: env, fetchImpl: async () => Response.json({
    payments: [3, 4].map(n => ({ id: uid(n), metadata: { order_id: uid(1), attempt_id: uid(2) } })), meta: { next_page: null },
  }) }), e => e.code === 'MULTIPLE_ATTEMPT_PAYMENTS');
});


test('a plan may change before any attempt without relying on the timeout', async () => {
  const db = database();
  const result = await createOrder(db, client, 'pro');
  assert.equal(db.order.status, 'expired'); assert.equal(result.amount, 49900); assert.equal(result.target_plan, 'pro');
});
test('a plan cannot change while an intent or unpublished reservation is unresolved', async () => {
  for (const state of [active, { intent_generation: uid(99), intent_reserved_at: new Date(now - 86400000).toISOString() }]) {
    const db = database(state);
    await assert.rejects(createOrder(db, client, 'pro'), e => e.code === 'ORDER_IN_PROGRESS');
    assert.equal(db.inserted, undefined); assert.equal(db.order.status, 'pending');
  }
});


test('returning to a cached paid order rechecks provider status before first activation', async () => {
  const db = database(active);
  db.payments.push({ id: uid(200), order_id: template.id, provider_status: 'paid', amount: 19900, currency: 'SAR' });
  let fetched = 0;
  const order = await createOrder(db, client, 'basic', async id => {
    fetched++; return { id, amount: 19900, currency: 'SAR', refunded: 0, status: 'voided', metadata: { order_id: template.id } };
  });
  assert.equal(fetched, 1); assert.equal(order.status, 'pending'); assert.equal(db.applied, 0);
  assert.equal(db.payments[0].provider_status, 'voided'); assert.equal(db.inserted, undefined);
});

function diagnosticApi() {
  const logs = []; let tick = 100;
  const provider = load('src/lib/payments/intents-provider.ts', {
    performance: { now: () => { const value = tick; tick += 25; return value; } },
    console: { error: (event, fields) => logs.push({ event, ...JSON.parse(JSON.stringify(fields)) }) },
  });
  return { provider, logs };
}
const createInput = { amount: 19900, currency: 'SAR', description: 'private-order-description', callback_url: intent.callback_url };
const sensitive = [env.MOYASAR_SECRET_KEY, env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY,
  intent.client_secret, createInput.description, createInput.callback_url, '4111111111111111', 'private-cookie'];
function safeLogs(logs) {
  const output = JSON.stringify(logs);
  for (const value of sensitive) assert.ok(!output.includes(value), `diagnostic leaked ${value}`);
  for (const row of logs) {
    assert.equal(row.event, 'payment_intent_provider_failure');
    assert.equal(row.duration_ms, 25);
    assert.deepEqual(Object.keys(row).sort(), ['duration_ms', 'error_code', 'event', 'http_status', 'operation',
      ...(row.provider_error_code ? ['provider_error_code'] : []), 'stage'].sort());
  }
}
for (const status of [401, 403, 422, 429, 500]) {
  test(`diagnostics retain provider HTTP ${status} without exposing rejection contents or retrying`, async () => {
    const { provider, logs } = diagnosticApi(); let calls = 0;
    await assert.rejects(provider.createLiveIntent(createInput, { environment: env, fetchImpl: async () => {
      calls++; return Response.json({ type: 'invalid_request_error', message: sensitive.join(' '),
        client_secret: intent.client_secret, headers: { Authorization: env.MOYASAR_SECRET_KEY }, source: { number: '4111111111111111' } }, { status });
    } }), e => e.code === 'PROVIDER_REJECTED' && e.status === 503);
    assert.equal(calls, 1); assert.equal(logs.length, 1);
    assert.equal(logs[0].http_status, status); assert.equal(logs[0].stage, 'http');
    assert.equal(logs[0].operation, 'create'); assert.equal(logs[0].provider_error_code, 'invalid_request_error'); safeLogs(logs);
  });
}
test('unrecognized provider codes and non-JSON HTTP errors never reach logs', async () => {
  for (const response of [Response.json({ code: sensitive.join(' '), message: sensitive.join(' ') }, { status: 403 }),
    new Response(sensitive.join(' '), { status: 502 })]) {
    const { provider, logs } = diagnosticApi();
    await assert.rejects(provider.fetchLiveIntent(intent.id, { environment: env, fetchImpl: async () => response }), e => e.code === 'PROVIDER_REJECTED');
    assert.equal(logs.length, 1); assert.equal(logs[0].operation, 'fetch');
    assert.equal(logs[0].provider_error_code, 'UNKNOWN_PROVIDER_ERROR'); safeLogs(logs);
  }
});
for (const name of ['TimeoutError', 'AbortError', 'TypeError']) {
  test(`network diagnostic ${name} excludes exception message and preserves error behavior`, async () => {
    const { provider, logs } = diagnosticApi();
    await assert.rejects(provider.createLiveIntent(createInput, { environment: env, fetchImpl: async () => {
      const error = new Error(sensitive.join(' ')); error.name = name; throw error;
    } }), e => e.code === 'PROVIDER_UNAVAILABLE' && e.status === 503);
    assert.equal(logs[0].http_status, null); assert.equal(logs[0].stage, 'network');
    assert.equal(logs[0].error_code, name === 'TimeoutError' ? 'TIMEOUT' : name === 'AbortError' ? 'ABORTED' : 'NETWORK_ERROR'); safeLogs(logs);
  });
}
test('successful HTTP with invalid JSON logs parse failure once', async () => {
  const { provider, logs } = diagnosticApi();
  await assert.rejects(provider.createLiveIntent(createInput, { environment: env,
    fetchImpl: async () => new Response(sensitive.join(' '), { status: 200 }) }), e => e.code === 'INVALID_INTENT_RESPONSE' && e.status === 502);
  assert.equal(logs.length, 1); assert.equal(logs[0].stage, 'parse'); assert.equal(logs[0].http_status, 200); safeLogs(logs);
});
test('schema and order mismatches log safe validation failures; success stays silent', async () => {
  for (const patch of [{ client_secret: 'wrong' }, { amount: 1 }]) {
    const { provider, logs } = diagnosticApi();
    await assert.rejects(provider.createLiveIntent(createInput, { environment: env,
      fetchImpl: async () => Response.json({ ...intent, ...patch }) }), e => e.status === 502);
    assert.equal(logs.length, 1); assert.equal(logs[0].stage, 'validation'); assert.equal(logs[0].http_status, 200); safeLogs(logs);
  }
  const { provider, logs } = diagnosticApi();
  assert.equal((await provider.createLiveIntent(createInput, { environment: env,
    fetchImpl: async () => Response.json(intent) })).id, intent.id);
  assert.equal(logs.length, 0);
});
test('list operation logs validation failure without query metadata or response contents', async () => {
  const { provider, logs } = diagnosticApi();
  await assert.rejects(provider.findAttemptPayment(uid(1), uid(2), { environment: env,
    fetchImpl: async () => Response.json({ payments: sensitive }) }), e => e.code === 'INVALID_PROVIDER_RESPONSE');
  assert.equal(logs[0].operation, 'list'); assert.equal(logs[0].stage, 'validation'); safeLogs(logs);
  assert.ok(!JSON.stringify(logs).includes(uid(1))); assert.ok(!JSON.stringify(logs).includes(uid(2)));
});
test('diagnosed creation rejection keeps the reservation and never retries automatically', async () => {
  const db = database(), { provider, logs } = diagnosticApi(); let calls = 0;
  const p = fakeProvider(db);
  p.create = input => provider.createLiveIntent(input, { environment: env, fetchImpl: async () => {
    calls++; return Response.json({ type: 'authentication_error' }, { status: 401 });
  } });
  await assert.rejects(run(db, p), e => e.code === 'PROVIDER_REJECTED');
  const generation = db.order.intent_generation;
  assert.ok(generation); assert.ok(db.order.intent_reserved_at); assert.equal(db.order.intent_id, null);
  assert.equal(db.order.status, 'pending'); assert.equal(db.payments.length, 0);
  assert.equal((await run(db, p, false)).status, 'waiting');
  assert.equal((await run(db, p)).status, 'waiting');
  assert.equal(calls, 1); assert.equal(db.order.intent_generation, generation); safeLogs(logs);
});
