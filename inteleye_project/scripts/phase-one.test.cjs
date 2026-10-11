// Run with: node --test scripts/phase-one.test.cjs
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function load(relative, mocks = {}) {
  const filename = path.join(root, relative);
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, {
    module, exports: module.exports, console, Request, Response, AbortController,
    fetch: () => assert.fail('unexpected external network request'),
    setTimeout, clearTimeout, process,
    require(name) {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`, mocks);
      return require(name);
    },
  }, { filename });
  return module.exports;
}

const validation = load('src/lib/reports/request-validation.ts');
const valid = { branchId: 10, platformIds: [3], reportType: 'custom',
  periodStart: '2026-07-01', periodEnd: '2026-07-31' };
for (const body of [null, [], true, 1, 'text']) {
  test(`report rejects non-object body ${JSON.stringify(body)}`, () => {
    assert.equal(validation.validateReportRequest(body).status, 400);
  });
}
for (const branchId of [true, [10], {}]) {
  test(`report rejects coerced branch ID ${JSON.stringify(branchId)}`, () => {
    assert.equal(validation.validateReportRequest({ ...valid, branchId }).ok, false);
  });
}

const workflow = load('src/lib/reports/n8n.ts');
for (const status of [200, 201, 204, 301, 302]) {
  test(`unexpected workflow HTTP ${status} returns 502`, async () => {
    await assert.rejects(workflow.requestReportFromWorkflow({ ...valid, clientId: 7, requestedBy: 'user' }, {
      environment: { N8N_REPORT_WEBHOOK_URL: 'https://example.test', N8N_REPORT_WEBHOOK_SECRET: 'test' },
      fetchImpl: async () => ({ status, json: async () => ({ request_id: 'id' }) }),
    }), error => error.status === 502);
  });
}
for (const body of [null, [], 10, 'text', {}]) {
  test(`malformed accepted workflow body ${JSON.stringify(body)} returns 502`, async () => {
    await assert.rejects(workflow.requestReportFromWorkflow({ ...valid, clientId: 7, requestedBy: 'user' }, {
      environment: { N8N_REPORT_WEBHOOK_URL: 'https://example.test', N8N_REPORT_WEBHOOK_SECRET: 'test' },
      fetchImpl: async () => ({ status: 202, json: async () => body }),
    }), error => error.status === 502 && error.code === 'INVALID_WORKFLOW_RESPONSE');
  });
}

function reportsRoute(access, loader) {
  return load('src/app/api/reports/route.ts', {
    '@/lib/reports/access': { getReportsAccess: async () => access },
    '@/lib/reports/data': { loadReportsSnapshot: loader },
  });
}
for (const status of [401, 403]) {
  test(`reports GET refuses access ${status} before reading data`, async () => {
    const response = await reportsRoute({ ok: false, status }, () => assert.fail('unexpected read')).GET();
    assert.equal(response.status, status);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  });
}
test('reports GET refuses subscriptions without report permissions', async () => {
  const response = await reportsRoute({ ok: true, permissions: { canViewReports: false } },
    () => assert.fail('unexpected read')).GET();
  assert.equal(response.status, 403);
});
test('reports GET uses server client ID and returns the polling snapshot', async () => {
  const supabase = {};
  const snapshot = { reports: [], branches: [], platforms: [] };
  const response = await reportsRoute({ ok: true, permissions: { canViewReports: true },
    client: { id: 7 }, supabase }, async (db, clientId) => {
      assert.equal(db, supabase); assert.equal(clientId, 7); return snapshot;
    }).GET(new Request('https://example.test/api/reports?client_id=999'));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), snapshot);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
});
test('reports GET hides database errors', async () => {
  const response = await reportsRoute({ ok: true, permissions: { canViewReports: true }, client: { id: 7 } },
    () => { throw new Error('private database details'); }).GET();
  assert.equal(response.status, 503);
  assert.ok(!(await response.text()).includes('private database details'));
});
test('every snapshot query is restricted to the server client ID', async () => {
  const calls = [];
  const supabase = { from(table) {
    const filters = [];
    calls.push({ table, filters });
    const query = { select() { return this; }, eq(...args) { filters.push(args); return this; },
      order() { return this; }, in() { return this; }, limit() { return this; },
      then(resolve) { return Promise.resolve({ data: [], error: null }).then(resolve); } };
    return query;
  } };
  await load('src/lib/reports/data.ts').loadReportsSnapshot(supabase, 7);
  assert.equal(calls.length, 5);
  for (const call of calls) assert.ok(call.filters.some(([key, value]) => key === 'client_id' && value === 7), call.table);
});

for (const [file, method] of [['branches/route.ts', 'POST'], ['platforms/route.ts', 'POST'],
  ['branches/[branchId]/route.ts', 'PATCH'], ['reports/route.ts', 'POST'], ['reports/request/route.ts', 'POST']]) {
  for (const body of [null, []]) {
    test(`${file} rejects ${JSON.stringify(body)} without database mutation`, async () => {
      const route = load(`src/app/api/${file}`, {
        '@/lib/supabase-server': { createSupabaseServerClient: () => ({
          auth: { getUser: async () => ({ data: { user: { id: 'user' } } }) },
          from: () => assert.fail('unexpected database access'),
        }) },
        '@/lib/reports/access': { getReportsAccess: async () => ({ ok: true,
          permissions: { canCreateCustomReport: true } }) },
      });
      const response = await route[method](new Request('https://example.test/api', {
        method, body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
      }), { params: { branchId: '1' } });
      assert.equal(response.status, 400);
    });
  }
}

const document = JSON.parse(fs.readFileSync(path.join(root, 'n8n/workflows/google-maps-sync.json'), 'utf8'));
const parser = new Function('$', '$json', document.nodes.find(node => node.name === 'Parse AI Result').parameters.jsCode);
const batch = { client_id: 7, branch_id: 10, platform_id: 3,
  reviews: [{ google_review_id: 42, review_id: 'external-42' }] };
function parse(results) {
  return parser(() => ({ item: { json: batch } }), { text: JSON.stringify({ results }) });
}
test('AI output is mapped using the original review and tenant', () => {
  const [result] = parse([{ source_record_id: '42', client_id: 999 }]);
  assert.equal(result.json.source_record_id, 42);
  assert.equal(result.json.client_id, 7);
  assert.equal(result.json.external_id, 'external-42');
});
for (const results of [[{ source_record_id: 999 }], [null], [{}], [{ source_record_id: true }],
  [{ source_record_id: 42 }, { source_record_id: '42' }]]) {
  test(`AI output rejects invalid or duplicate reviews ${JSON.stringify(results)}`, () => {
    assert.throws(() => parse(results));
  });
}

// Existing regression suites, compiled in memory using their actual imports.
const Module = require('node:module');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function(name, ...args) {
  return originalResolve.call(this, name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : name, ...args);
};
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText, filename);
for (const file of ['plans.test.ts', 'platforms/normalize.test.ts', 'platforms/n8n.test.ts', 'reports/reports.test.ts', 'subscription-write-errors.test.ts']) {
  require(path.join(root, 'src/lib', file));
}

// Test real route error responses without contacting Supabase or n8n.
for (const file of ['branches/route.ts', 'platforms/route.ts']) {
  for (const scenario of ['quota', 'count failure']) {
    test(`${file} handles ${scenario} without queueing sync`, async () => {
      const error = { code: '23514', message: 'branch_plan_limit_reached' };
      const supabase = {
        auth: { getUser: async () => ({ data: { user: { id: 'test-user' } } }) },
        from(table) {
          let insert = false;
          const query = {
            select() { return this; }, eq() { return this; }, in() { return this; }, order() { return this; },
            insert() { insert = true; return this; },
            maybeSingle: async () => ({ data: { id: 7, plan: 'pro', subscription_status: 'active',
              current_period_end: '2099-01-01', allowed_platforms_count: 2 } }),
            single: async () => { assert.ok(insert); return { data: null, error }; },
            then(resolve) { return Promise.resolve({ data: [], count: 0,
              error: scenario === 'count failure' ? { code: 'unavailable' } : null }).then(resolve); },
          };
          return query;
        },
      };
      const route = load(`src/app/api/${file}`, {
        '@/lib/supabase-server': { createSupabaseServerClient: () => supabase },
        '@/lib/platforms/n8n': { queuePlatformSync: () => assert.fail('unexpected sync'), PlatformSyncWebhookError: class extends Error {} },
      });
      const response = await route.POST(new Request('https://example.test/api', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test', branchName: 'Test', platformName: 'x',
          platformValue: 'public-test', businessActivity: 'test', scope: 'new_branch' }),
      }));
      assert.equal(response.status, scenario === 'quota' ? 403 : 503);
      const data = await response.json();
      assert.ok(data.message);
      assert.ok(!data.message.includes(error.message));
    });
  }
}
