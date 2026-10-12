// Synthetic provider responses only. Never makes an external payment request.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(relative, mocks = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, process, Buffer, Request, Response, URL,
    AbortSignal, console, fetch: () => assert.fail('unexpected external request'),
    require(name) {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`, mocks);
      if (name.startsWith('./')) return load(path.join(path.dirname(relative), name + '.ts'), mocks);
      return require(name);
    },
  });
  return module.exports;
}
const provider = load('src/lib/payments/moyasar.ts');
const service = load('src/lib/payments/service.ts', { './moyasar': provider });
const id = '00000000-0000-0000-0000-000000000001';
const env = { PAYMENTS_MODE: 'live', VERCEL_ENV: 'production', MOYASAR_SECRET_KEY: 'sk_live_synthetic_only', NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY: 'pk_live_synthetic_only' };
const payment = { id, amount: 19900, refunded: 0, currency: 'SAR', status: 'paid', metadata: { order_id: id } };
const client = { id: 1, plan: 'basic', subscription_status: 'pending', current_period_end: null, trial_ends_at: null };
for (const patch of [{ PAYMENTS_MODE: 'test' }, { PAYMENTS_MODE: undefined }, { VERCEL_ENV: 'preview' }, { VERCEL_ENV: undefined }, { MOYASAR_SECRET_KEY: 'sk_test_bad' }, { NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY: 'pk_test_bad' }]) {
  test(`rejects unsafe payment environment ${Object.keys(patch)}`, () => {
    assert.throws(() => provider.requireLivePayments({ ...env, ...patch }), e => e.status === 503);
  });
}
test('documented GET response without live field is accepted using Live Basic auth (synthetic key)', async () => {
  const result = await provider.fetchLivePayment(id, { environment: env, fetchImpl: async (url, options) => {
    assert.equal(url, `https://api.moyasar.com/v1/payments/${id}`);
    assert.equal(options.headers.Authorization, `Basic ${Buffer.from(env.MOYASAR_SECRET_KEY + ':').toString('base64')}`);
    assert.equal(options.redirect, 'error'); assert.equal(options.cache, 'no-store');
    return Response.json(payment);
  } });
  assert.equal(result.amount, 19900);
});
for (const patch of [{ live: false }, { amount: 19.9 }, { amount: -1 }, { id: 'wrong' }, { status: 'unknown' }, { metadata: null }]) {
  test(`rejects malformed provider response ${JSON.stringify(patch)}`, async () => {
    await assert.rejects(provider.fetchLivePayment(id, { environment: env, fetchImpl: async () => Response.json({ ...payment, ...patch }) }), e => e.status === 502);
  });
}
test('provider outage never reports success', async () => {
  await assert.rejects(provider.fetchLivePayment(id, { environment: env, fetchImpl: async () => { throw new Error('outage'); } }), e => e.status === 503);
});
test('invalid ID rejected before provider request', async () => {
  await assert.rejects(provider.fetchLivePayment('https://attacker.test', { environment: env }), e => e.status === 400);
});
test('constant-time webhook token accepts exact configured value only', () => {
  const secret = 'synthetic-webhook-token-32-characters';
  assert.equal(provider.verifyWebhookToken(secret, secret), true);
  for (const value of [null, 'incorrect', secret + 'x']) assert.equal(provider.verifyWebhookToken(value, secret), false);
  assert.equal(provider.verifyWebhookToken('x', 'x'), false);
});
for (const [plan, amount] of [['basic', 19900], ['pro', 49900], ['enterprise', 99900]]) {
  test(`initial ${plan} quote preserves existing price`, () => assert.equal(service.quotePayment(client, plan).amount, amount));
}
test('upgrade charges full existing price difference and rejects null expiry', () => {
  const active = { ...client, subscription_status: 'active', current_period_end: new Date(Date.now() + 86400000).toISOString() };
  assert.equal(service.quotePayment(active, 'pro').amount, 30000);
  assert.equal(service.quotePayment(active, 'enterprise').amount, 80000);
  assert.throws(() => service.quotePayment({ ...active, current_period_end: null }, 'pro'), e => e.code === 'PERIOD_REVIEW_REQUIRED');
  assert.throws(() => service.quotePayment(active, 'basic'), e => e.status === 409);
  assert.throws(() => service.quotePayment({ ...active, plan: 'pro' }, 'basic'), e => e.status === 409);
});
for (const plan of [null, {}, 'unknown', 'Basic']) test(`invalid plan rejected ${JSON.stringify(plan)}`, () => {
  assert.throws(() => service.quotePayment(client, plan), e => e.status === 400);
});
test('foreign order metadata rejected without writing financial data', async () => {
  await assert.rejects(service.verifyPayment({ rpc: () => assert.fail('unexpected write') }, { id }, id,
    async () => ({ ...payment, metadata: { order_id: 'foreign' } })), e => e.status === 403);
});
test('verified payment is persisted before activation failure, allowing retry', async () => {
  const calls = [];
  await assert.rejects(service.verifyPayment({ rpc: async (name) => {
    calls.push(name); return name === 'record_verified_payment' ? { error: null } : { error: { code: 'outage' } };
  } }, { id }, id, async () => payment), e => e.code === 'ACTIVATION_PENDING');
  assert.deepEqual(calls, ['record_verified_payment', 'apply_verified_payment']);
});
test('order lookup binds server client ID', async () => {
  const filters = [];
  const query = { select() { return this; }, eq(key, value) { filters.push([key, value]); return this; }, async maybeSingle() { return { data: { id }, error: null }; } };
  await service.readOrder({ from: () => query }, id, 7);
  assert.deepEqual(filters, [['id', id], ['client_id', 7]]);
});

const nextMock = { NextResponse: { json: (body, options) => Response.json(body, options) } };
function routeMocks(extra = {}) {
  return { 'next/server': nextMock, '@/lib/payments/moyasar': provider,
    '@/lib/supabase-server': { createSupabaseServerClient: () => ({ auth: { getUser: async () => ({ data: { user: null }, error: null }) } }) },
    '@/lib/supabase-admin': { createPaymentAdmin: () => assert.fail('unexpected admin access') }, ...extra };
}
for (const route of ['orders', 'verify']) {
  test(`${route} requires authentication before payment writes`, async () => {
    const result = await load(`src/app/api/payments/${route}/route.ts`, routeMocks()).POST(new Request('https://example.test', { method: 'POST' }));
    assert.equal(result.status, 401); assert.equal(result.headers.get('cache-control'), 'private, no-store');
  });
}
test('intent endpoint requires authentication before reading or reserving an order', async () => {
  const result = await load('src/app/api/payments/orders/[orderId]/intent/route.ts', routeMocks())
    .POST(new Request('https://example.test', { method: 'POST', body: '{"mode":"prepare"}' }), { params: { orderId: id } });
  assert.equal(result.status, 401);
  assert.equal(result.headers.get('cache-control'), 'private, no-store');
});
test('intent endpoint binds the authenticated client and ignores supplied amount/secret', async () => {
  const route = load('src/app/api/payments/orders/[orderId]/intent/route.ts', routeMocks({
    '@/lib/payments/http': { paymentAccess: async () => ({ db: {}, client: { id: 7 } }),
      paymentResponse: body => Response.json(body, { headers: { 'Cache-Control': 'private, no-store' } }),
      paymentFailure: () => assert.fail('unexpected failure') },
    '@/lib/payments/service': { readOrder: async (_db, orderId, clientId) => {
      assert.equal(orderId, id); assert.equal(clientId, 7); return { id };
    } },
    '@/lib/payments/intents': { resolveIntent: async (_db, order, client, origin, prepare) => {
      assert.equal(order.id, id); assert.equal(client.id, 7); assert.equal(origin, 'https://example.test'); assert.equal(prepare, true);
      return { status: 'ready', payment_intent: { id, client_secret: 'pi_secret_synthetic' } };
    } },
  }));
  const result = await route.POST(new Request('https://example.test/api', { method: 'POST', body: JSON.stringify({
    mode: 'prepare', client_id: 999, amount: 1, client_secret: 'attacker',
  }) }), { params: { orderId: id } });
  assert.equal((await result.json()).payment_intent.client_secret, 'pi_secret_synthetic');
  assert.equal(result.headers.get('cache-control'), 'private, no-store');
});
test('orders route ignores user-supplied client ID, amount and currency', async () => {
  const route = load('src/app/api/payments/orders/route.ts', routeMocks({
    '@/lib/payments/http': { paymentAccess: async () => ({ db: {}, client: { id: 7 } }),
      paymentResponse: (body, status) => Response.json(body, { status }), paymentFailure: () => assert.fail('unexpected failure') },
    '@/lib/payments/service': { createOrder: async (_db, account, plan) => {
      assert.equal(account.id, 7); assert.equal(plan, 'basic');
      return { id, amount: 19900, currency: 'SAR', target_plan: 'basic', purchase_type: 'subscription', status: 'pending' };
    } },
  }));
  const result = await route.POST(new Request('https://example.test', { method: 'POST', body: JSON.stringify({ plan: 'basic', client_id: 999, amount: 1, currency: 'USD' }) }));
  assert.equal(result.status, 201); assert.equal((await result.json()).amount, 19900);
});
test('webhook authenticates documented body secret before database access', async () => {
  const result = await load('src/app/api/payments/webhook/route.ts', routeMocks()).POST(new Request('https://example.test', { method: 'POST', body: JSON.stringify({ secret_token: 'wrong' }) }));
  assert.equal(result.status, 401);
});
test('malformed webhook JSON is a client error', async () => {
  const result = await load('src/app/api/payments/webhook/route.ts', routeMocks()).POST(new Request('https://example.test', { method: 'POST', body: '{' }));
  assert.equal(result.status, 400);
});
test('webhook treats notification as hint; server service verifies before success', async () => {
  const previous = process.env.MOYASAR_WEBHOOK_SECRET;
  process.env.MOYASAR_WEBHOOK_SECRET = 'synthetic-webhook-token-32-characters';
  try {
    let verified = 0;
    const route = load('src/app/api/payments/webhook/route.ts', routeMocks({
      '@/lib/supabase-admin': { createPaymentAdmin: () => ({}) },
      '@/lib/payments/service': { readOrder: async (_db, lookup) => { assert.equal(lookup, id); return { id }; },
        verifyPayment: async (_db, order, paymentId) => { verified++; assert.equal(order.id, id); assert.equal(paymentId, id); return { status: 'not_paid' }; } },
    }));
    const result = await route.POST(new Request('https://example.test', { method: 'POST', body: JSON.stringify({
      type: 'payment_paid', live: true, secret_token: process.env.MOYASAR_WEBHOOK_SECRET,
      data: { id, status: 'paid', amount: 1, metadata: { order_id: id } },
    }) }));
    assert.equal(result.status, 200); assert.equal((await result.json()).status, 'not_paid'); assert.equal(verified, 1);
    const rejected = await route.POST(new Request('https://example.test', { method: 'POST', body: JSON.stringify({
      live: false, secret_token: process.env.MOYASAR_WEBHOOK_SECRET,
    }) }));
    assert.equal(rejected.status, 400);
  } finally {
    if (previous === undefined) delete process.env.MOYASAR_WEBHOOK_SECRET;
    else process.env.MOYASAR_WEBHOOK_SECRET = previous;
  }
});

test('partially refunded payment cannot be presented as paid for activation', async () => {
  let recorded;
  const result = await service.verifyPayment({ rpc: async (name, fields) => {
    if (name === 'record_verified_payment') { recorded = fields; return { error: null }; }
    return { data: 'not_paid', error: null };
  } }, { id }, id, async () => ({ ...payment, refunded: 1 }));
  assert.equal(recorded.p_status, 'refunded'); assert.equal(result.status, 'not_paid');
});

test('missing Supabase session is 401 rather than backend outage', async () => {
  const route = load('src/app/api/payments/orders/route.ts', routeMocks({
    '@/lib/supabase-server': { createSupabaseServerClient: () => ({ auth: { getUser: async () => ({
      data: { user: null }, error: { name: 'AuthSessionMissingError', status: 400 },
    }) } }) },
  }));
  assert.equal((await route.POST(new Request('https://example.test', { method: 'POST' }))).status, 401);
});


test('Live database access uses only server credentials of the application project', () => {
  const names = ['PAYMENTS_MODE','VERCEL_ENV','MOYASAR_SECRET_KEY','NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','PAYMENTS_TEST_SUPABASE_SERVICE_ROLE_KEY'];
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  try {
    Object.assign(process.env, env, { NEXT_PUBLIC_SUPABASE_URL: 'https://synthetic.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service-key', PAYMENTS_TEST_SUPABASE_SERVICE_ROLE_KEY: 'unused-test-key' });
    let called = 0;
    const admin = load('src/lib/supabase-admin.ts', { 'server-only': {}, '@/lib/payments/moyasar': provider,
      '@supabase/supabase-js': { createClient: (url, key, options) => {
        called++; assert.equal(url, 'https://synthetic.supabase.co'); assert.equal(key, 'synthetic-service-key');
        assert.equal(options.auth.persistSession, false); return {};
      } },
    });
    admin.createPaymentAdmin(); assert.equal(called, 1);
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert.throws(() => admin.createPaymentAdmin(), e => e.code === 'PAYMENT_DATABASE_REQUIRED');
    assert.equal(called, 1);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'synthetic-service-key';
    process.env.VERCEL_ENV = 'preview';
    assert.throws(() => admin.createPaymentAdmin(), e => e.code === 'PAYMENTS_DISABLED');
    assert.equal(called, 1);
  } finally {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name]; else process.env[name] = previous[name];
    }
  }
});
