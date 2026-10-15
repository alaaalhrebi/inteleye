// Synthetic sessions and database responses only; no hosted Supabase requests.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { NextRequest } = require('next/server');
const root = path.resolve(__dirname, '..');
const user = { id: 'synthetic-user' };
const client = { id: 7, user_id: user.id, name: 'Synthetic Business', plan: 'basic',
  subscription_status: 'trial', trial_ends_at: '2026-11-01T00:00:00Z' };
const now = Date.parse('2026-10-16T06:00:00Z');
class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }

function load(file, mocks) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, process, URL, Request, Response,
    AbortController, setTimeout, clearTimeout, Date: Clock, console: { error() {}, warn() {} },
    fetch: () => assert.fail('external request forbidden'), require(name) {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name === '@/components/dashboard/LogoutButton') {
        return { default: () => React.createElement('button', null, 'تسجيل الخروج') };
      }
      if (name.startsWith('@/components/')) return { default: () => null };
      if (name.startsWith('@/')) return load('src/' + name.slice(2) + '.ts', mocks);
      return require(name);
    },
  }, { filename: file });
  return module.exports;
}

function setup({ authenticated = true, claims = true, clientError = null, profile = client } = {}) {
  let currentError = clientError;
  const calls = [];
  const db = { auth: { getUser: async () => ({ data: { user: authenticated ? user : null } }) }, from(table) {
    calls.push(table);
    const rows = table === 'client_platforms'
      ? [{ id: 9, platform_name: 'tiktok', branch_id: null, is_active: true, connection_status: 'connected' }] : [];
    const q = { select() { return this; }, eq() { return this; }, gte() { return this; }, lte() { return this; },
      order() { return this; }, limit() { return this; }, in() { return this; }, or() { return this; },
      maybeSingle: async () => ({ data: currentError ? null : profile, error: currentError }),
      range: async () => ({ data: [], error: null }),
      then(resolve) { return Promise.resolve({ data: rows, error: null }).then(resolve); },
    }; return q;
  } };
  const mocks = {
    '@/lib/supabase-server': { createSupabaseServerClient: () => db },
    'next/navigation': { redirect(url) { const error = new Error('redirect'); error.destination = url; throw error; } },
    '@supabase/ssr': { createServerClient: () => ({ auth: {
      getClaims: async () => ({ data: { claims: claims ? { sub: user.id } : null }, error: null }),
    } }) },
  };
  return { page: load('src/app/dashboard/page.tsx', mocks).default,
    middleware: load('src/middleware.ts', mocks).middleware, calls,
    recover() { currentError = null; } };
}

async function navigate(app, start = '/dashboard') {
  let url = start;
  const visited = [];
  for (let i = 0; i < 8; i++) {
    assert.ok(!visited.includes(url), 'redirect cycle: ' + [...visited, url].join(' -> '));
    visited.push(url);
    const response = await app.middleware(new NextRequest('https://example.test' + url));
    const location = response.headers.get('location');
    if (location) { const next = new URL(location); url = next.pathname + next.search; continue; }
    if (new URL('https://example.test' + url).pathname !== '/dashboard') return { url, visited };
    try { return { url, visited, html: renderToStaticMarkup(await app.page({})) }; }
    catch (error) { if (!error.destination) throw error; url = error.destination; }
  }
  assert.fail('navigation did not settle');
}

for (const [label, config] of [
  ['failed account query', { clientError: { message: 'private database diagnostic' } }],
  ['missing account row', { profile: null }],
]) {
  test(`${label} renders recovery without bouncing through auth pages`, async () => {
    const app = setup(config), result = await navigate(app);
    assert.deepEqual(result.visited, ['/dashboard']);
    assert.match(result.html, /تعذر تحميل بيانات حسابك الآن/);
    assert.match(result.html, /href="\/dashboard"/);
    assert.ok(!result.html.includes('private database diagnostic'));
    assert.ok(!result.html.includes('http-equiv="refresh"'));
    assert.deepEqual(app.calls, ['clients']);
  });
}

test('an explicit manual retry renders the dashboard once the account query recovers', async () => {
  const app = setup({ clientError: { message: 'temporary outage' } });
  assert.match((await navigate(app)).html, /تعذر تحميل بيانات حسابك الآن/);
  app.recover();
  const result = await navigate(app);
  assert.deepEqual(result.visited, ['/dashboard']);
  assert.match(result.html, /Synthetic Business/);
  assert.ok(!result.html.includes('تعذر تحميل بيانات حسابك الآن'));
});

test('stale claims with no server-verified user settle on login instead of looping', async () => {
  const app = setup({ authenticated: false, claims: true });
  const result = await navigate(app);
  assert.deepEqual(result.visited, ['/dashboard', '/login?reason=session_required']);
  assert.equal(result.url, '/login?reason=session_required');
  assert.equal(app.calls.length, 0);
});

for (const target of ['/dashboard', '/dashboard/reports', '/onboarding/platforms', '/checkout', '/dashboard?reason=session_required']) {
  test(`no claims cannot enter protected route ${target}`, async () => {
    const app = setup({ authenticated: false, claims: false });
    const response = await app.middleware(new NextRequest('https://example.test' + target));
    assert.equal(new URL(response.headers.get('location')).pathname, '/login');
    assert.equal(app.calls.length, 0);
  });
}

for (const target of ['/login', '/signup', '/login?reason=other', '/signup?reason=session_required']) {
  test(`normal authenticated routing is preserved for ${target}`, async () => {
    const response = await setup().middleware(new NextRequest('https://example.test' + target));
    assert.equal(new URL(response.headers.get('location')).pathname, '/dashboard');
  });
}

for (const claims of [false, true]) {
  test(`session recovery login is stable with claims=${claims}`, async () => {
    const response = await setup({ claims }).middleware(new NextRequest('https://example.test/login?reason=session_required'));
    assert.equal(response.headers.get('location'), null);
    assert.equal(response.headers.get('x-middleware-next'), '1');
  });
}
