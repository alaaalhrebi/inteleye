// Synthetic sessions, saved rows, and browser timers only. No external network.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
const now = Date.parse('2026-10-16T12:00:00Z');
class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
function load(file, mocks = {}, globals = {}) {
 const module = { exports: {} };
 const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
 }).outputText;
 vm.runInNewContext(code, { module, exports: module.exports, Date: Clock, console, Request, Response, URL,
  URLSearchParams, AbortController, fetch: () => assert.fail('unexpected network request'), ...globals,
  require(name) {
   if (Object.hasOwn(mocks, name)) return mocks[name];
   if (name.startsWith('@/')) return load('src/' + name.slice(2) + '.ts', mocks, globals);
   return require(name);
  },
 }, { filename: file });
 return module.exports;
}
const { deriveReportProgress: derive, loadReportProgress: read } = load('src/lib/reports/progress.ts');
const platform = { id: 4, client_id: 7, is_active: true, branch_id: 2, connection_status: 'connected', last_success_at: '2026-10-16T11:00:00Z' };
const report = { id: 99, client_id: 7, platform_id: 4, branch_id: 2, report_type: 'initial_historical', status: 'completed', created_at: '2026-10-16T11:10:00Z' };
const base = { clientId: 7, platforms: [platform], reports: [report], hasPendingAnalysis: false, nextReportAt: '2026-10-23T11:00:00Z', now };
for (const [stage, patch] of [
 ['ready', {}], ['collecting', { platforms: [{ ...platform, connection_status: 'syncing' }] }],
 ['queued', { platforms: [{ ...platform, connection_status: 'pending' }] }],
 ['analyzing', { hasPendingAnalysis: true }], ['reporting', { reports: [{ ...report, status: 'processing' }] }],
 ['awaiting_report', { reports: [{ ...report, status: 'pending' }] }],
 ['awaiting_report', { reports: [] }], ['error', { reports: [{ ...report, status: 'failed' }] }],
 ['error', { platforms: [{ ...platform, last_error: 'PRIVATE PROVIDER BODY' }] }],
 ['error', { platforms: [{ ...platform, connection_status: 'disconnected' }] }],
 ['unknown', { readError: true }], ['unknown', { platforms: [] }],
 ['unknown', { platforms: [{ ...platform, connection_status: 'unexpected' }] }],
 ['unknown', { reports: [], platforms: [{ ...platform, last_success_at: null }] }],
]) {
 test(`progress derives ${stage} from saved evidence ${JSON.stringify(patch)}`, () => {
  const result = derive({ ...base, ...patch });
  assert.equal(result.stage, stage);
  assert.ok(!JSON.stringify(result).includes('PRIVATE PROVIDER BODY'));
  assert.equal(result.shouldRefresh, ['queued', 'collecting', 'analyzing', 'awaiting_report', 'reporting'].includes(stage));
 });
}
test('trial-like completed-only read uses waiting wording instead of inventing processing', () => {
 const result = derive({ ...base, reports: [] });
 assert.equal(result.stage, 'awaiting_report'); assert.match(result.description, /قد يكون في الانتظار أو قيد الإعداد/);
});
test('next due date does not reuse an older completed report as proof of current completion', () => {
 const due = { ...base, nextReportAt: '2026-10-16T10:00:00Z' };
 assert.equal(derive(due).stage, 'awaiting_report');
 assert.equal(derive({ ...due, platforms: [{ ...platform, last_success_at: '2026-10-09' }] }).stage, 'queued');
 assert.equal(derive({ ...base, nextReportAt: 'bad date' }).nextReportAt, null);
});
test('report metadata from other clients, branches, platforms, and custom types cannot mark scope ready', () => {
 for (const patch of [{ client_id: 8 }, { platform_id: 5 }, { branch_id: 3 }, { report_type: 'custom' }, { report_type: 'monthly' }]) {
  assert.equal(derive({ ...base, reports: [{ ...report, ...patch }] }).stage, 'awaiting_report');
 }
});
test('each platform needs its own report; a newer failure overrides its old success', () => {
 const second = { ...platform, id: 5 };
 assert.equal(derive({ ...base, platforms: [platform, second] }).stage, 'awaiting_report');
 assert.equal(derive({ ...base, reports: [report, { ...report, status: 'failed', created_at: '2026-10-16T11:30:00Z' }] }).stage, 'error');
});
function database(rows = {}, errors = {}) {
 const calls = [];
 return { calls, from(table) {
  const call = { table, filters: [], selects: [] }; calls.push(call);
  let limit = Infinity, order;
  const q = { select(value) { call.selects.push(value); return this; }, eq(key, value) { call.filters.push(['eq', key, value]); return this; },
   in(key, value) { call.filters.push(['in', key, Array.from(value)]); return this; },
   or(value) { call.filters.push(['or', value]); return this; },
   order(key, options) { order = [key, options?.ascending !== false]; return this; }, limit(value) { limit = value; return this; },
   then(resolve) {
    let data = (rows[table] || []).filter(row => call.filters.every(([op, key, value]) =>
     op === 'eq' ? row[key] === value : op === 'in' ? value.includes(row[key]) :
     row.analysis_status == null || ['pending', 'processing'].includes(row.analysis_status)));
    if (order) data = [...data].sort((a,b) => String(a[order[0]]).localeCompare(String(b[order[0]])) * (order[1] ? 1 : -1));
    return Promise.resolve({ data: data.slice(0, limit), error: errors[table] || null }).then(resolve);
   } };
  return q;
 } };
}
const scope = { clientId: 7, platforms: [platform], branchId: null, platformId: null, nextReportAt: base.nextReportAt };
test('progress reads are client- and platform-scoped and include NULL analysis from left-joined feedback', async () => {
 const db = database({ reports: [report, { ...report, client_id: 8 }], unified_feedback: [{ client_id: 7, platform_id: 4, analysis_status: null }] });
 assert.equal((await read(db, scope)).stage, 'analyzing');
 assert.equal(db.calls.length, 2);
 for (const c of db.calls) {
  assert.ok(c.filters.some(([op,key,value])=>op==='eq'&&key==='client_id'&&value===7));
  assert.deepEqual(c.filters.find(([op,key])=>op==='in'&&key==='platform_id')[2], [4]);
 }
 assert.match(db.calls[1].filters.find(([op])=>op==='or')[1], /analysis_status.is.null/);
});
test('scope excludes another branch but retains intentional account-level platform links', async () => {
 const db = database();
 const result = await read(db, { ...scope, branchId: 3 });
 assert.equal(result.stage, 'unknown'); assert.equal(db.calls.length, 0);
 const account = database();
 await read(account, { ...scope, branchId: 3, platforms: [{ ...platform, branch_id: null }] });
 assert.equal(account.calls.length, 2);
});
test('read failure and history truncation cannot be reported as completed', async () => {
 const failed = database({ reports: [report] }, { unified_feedback: { message: 'PRIVATE ERROR' } });
 const result = await read(failed, scope);
 assert.equal(result.stage, 'unknown'); assert.ok(!JSON.stringify(result).includes('PRIVATE ERROR'));
 assert.equal((await read(database({ reports: Array(1000).fill(report) }), scope)).stage, 'unknown');
});
function route(access) {
 return load('src/app/api/reports/progress/route.ts', { '@/lib/reports/access': { getReportsAccess: async () => access } }).GET;
}
function accessFor(db, patch = {}) {
 return { ok: true, client: { id: 7, next_report_at: base.nextReportAt }, supabase: db,
  permissions: { canViewReports: true, isTrialActive: false }, ...patch };
}
for (const status of [401, 403]) test(`progress GET rejects ${status} before any data access`, async () => {
 const db = database(); const response = await route({ ok: false, status })(new Request('https://example.test/api/reports/progress'));
 assert.equal(response.status, status); assert.equal(db.calls.length, 0);
 assert.equal(response.headers.get('cache-control'), 'private, no-store');
});
test('progress GET rejects an ineligible subscription before reading platform metadata', async () => {
 const db = database(); const response = await route(accessFor(db, { permissions: { canViewReports: false } }))(new Request('https://example.test/api/reports/progress'));
 assert.equal(response.status, 403); assert.equal(db.calls.length, 0);
});
test('progress GET ignores forged client ID and does not leak raw report or platform fields', async () => {
 const db = database({ client_platforms: [platform, { ...platform, client_id: 8, id: 88 }], reports: [report],
  branches: [{ id: 2, client_id: 7, status: 'active' }] });
 const response = await route(accessFor(db))(new Request('https://example.test/api/reports/progress?client_id=8&platform=4&branch=2'));
 assert.equal(response.status, 200); const body = await response.json();
 assert.equal(body.stage, 'ready'); assert.ok(!JSON.stringify(body).includes('client_id'));
 for (const c of db.calls) assert.ok(c.filters.some(([op,k,v])=>op==='eq'&&k==='client_id'&&v===7));
});
test('an account-level link does not authorize a forged branch owned by another customer', async () => {
 const db = database({ client_platforms: [{ ...platform, branch_id: null }],
  branches: [{ id: 88, client_id: 8, status: 'active' }] });
 const response = await route(accessFor(db))(new Request('https://example.test/api/reports/progress?branch=88'));
 assert.equal(response.status, 404);
 assert.equal(db.calls.length, 1);
 assert.equal(db.calls[0].table, 'branches');
});
for (const query of ['platform=88','branch=88','platform=-1','platform=abc','branch=1.2']) {
 test(`progress scope ${query} never reads another account or a conflicting branch`, async () => {
  const db = database({ client_platforms: [platform, { ...platform, id: 88, client_id: 8 }] });
  const response = await route(accessFor(db))(new Request('https://example.test/api/reports/progress?'+query));
  assert.equal(response.status, /abc|-1|1\.2/.test(query) ? 400 : 404);
  assert.ok(db.calls.length <= 1);
 });
}
test('trial progress uses only its first allowed platform and hides inaccessible report state', async () => {
 const db = database({ client_platforms: [platform, { ...platform, id: 5 }], reports: [] });
 const handler = route(accessFor(db, { permissions: { canViewReports: true, isTrialActive: true } }));
 const r = await handler(new Request('https://example.test/api/reports/progress?platform=5'));
 assert.equal(r.status, 404); assert.equal(db.calls.length, 1);
 const own = await handler(new Request('https://example.test/api/reports/progress?platform=4'));
 assert.equal((await own.json()).stage, 'awaiting_report');
});
test('platform read failure returns a safe 503, not a provider diagnostic', async () => {
 const db = database({}, { client_platforms: { message: 'PRIVATE ERROR' } });
 const response = await route(accessFor(db))(new Request('https://example.test/api/reports/progress'));
 assert.equal(response.status, 503); assert.ok(!(await response.text()).includes('PRIVATE ERROR'));
});
test('session service failure returns a safe 503 without exposing infrastructure errors', async () => {
 const handler = load('src/app/api/reports/progress/route.ts', { '@/lib/reports/access': {
  getReportsAccess: async () => { throw new Error('PRIVATE AUTH ERROR'); },
 } }).GET;
 const response = await handler(new Request('https://example.test/api/reports/progress'));
 assert.equal(response.status, 503);
 assert.ok(!(await response.text()).includes('PRIVATE AUTH ERROR'));
});
function browserHarness(fetchImpl, progress = derive({ ...base, reports: [] })) {
 const intervals = new Map(), timeouts = new Map(), cleanup = [], values = [], requests = [];
 let sequence = 0, refreshes = 0;
 const document = { visibilityState: 'visible' };
 const window = { setInterval(fn, delay) { const id = ++sequence; intervals.set(id, { fn, delay }); return id; }, clearInterval(id) { intervals.delete(id); },
  setTimeout(fn, delay) { const id = ++sequence; timeouts.set(id, { fn, delay }); return id; }, clearTimeout(id) { timeouts.delete(id); } };
 const component = load('src/components/dashboard/ReportProcessingStatus.tsx', {
  react: { ...React, useState(initial) { return [initial, value => values.push(value)]; }, useEffect(fn) { const c = fn(); if (c) cleanup.push(c); } },
  'next/navigation': { useRouter: () => ({ refresh() { refreshes++; } }) },
 }, { document, window, fetch: async (url, options) => { requests.push({ url, options }); return fetchImpl(url, options); } }).default;
 component({ progress, branchId: 2, platformId: 4 });
 return { document, requests, values, intervals, timeouts, cleanup: () => cleanup.forEach(c=>c()), get refreshes() { return refreshes; },
  async tick() { for (const { fn, delay } of [...intervals.values()]) { assert.equal(delay, 20000); await fn(); } } };
}
const answer = body => ({ status: 200, ok: true, json: async () => body });
test('bounded visible-tab polling uses only the lightweight GET and never starts a workflow', async () => {
 const h = browserHarness(async () => answer(derive({ ...base, reports: [] })));
 h.document.visibilityState = 'hidden'; await h.tick(); assert.equal(h.requests.length, 0);
 h.document.visibilityState = 'visible'; for (let i=0;i<40;i++) await h.tick();
 assert.equal(h.requests.length, 30); assert.equal(h.refreshes, 0);
 assert.equal(h.intervals.size, 0);
 for (const { url, options } of h.requests) {
  assert.equal(url, '/api/reports/progress?branch=2&platform=4'); assert.equal(options.method, undefined); assert.equal(options.cache, 'no-store');
 }
 h.cleanup();
});
test('confirmed readiness refreshes the dashboard once and stops polling', async () => {
 const h = browserHarness(async () => answer(derive(base)));
 await h.tick(); await h.tick(); assert.equal(h.requests.length, 1); assert.equal(h.refreshes, 1); assert.equal(h.intervals.size, 0);
 h.cleanup();
});
test('overlapping polls are blocked, cleanup aborts, and late results cannot update the page', async () => {
 let resolve;
 const h = browserHarness(() => new Promise(r => { resolve = r; }));
 const first = h.tick(); await h.tick(); assert.equal(h.requests.length, 1);
 h.cleanup(); assert.equal(h.requests[0].options.signal.aborted, true);
 const count = h.values.length; resolve(answer(derive(base))); await first;
 assert.equal(h.refreshes, 0); assert.equal(h.values.length, count);
});
test('network timeout preserves the old state with a retry notice and no full-page refresh', async () => {
 const h = browserHarness((url, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))));
 const pending = h.tick(); assert.equal(h.timeouts.size, 1);
 for (const { fn, delay } of h.timeouts.values()) { assert.equal(delay, 10000); fn(); }
 await pending; assert.ok(h.values.includes(true)); assert.equal(h.refreshes, 0); h.cleanup();
});
for (const status of [401,403,404]) test(`polling stops safely on HTTP ${status} without a login redirect loop`, async () => {
 const h = browserHarness(async () => ({ status, ok: false }));
 await h.tick(); await h.tick(); assert.equal(h.requests.length, 1); assert.equal(h.refreshes, 0); assert.equal(h.intervals.size, 0);
 assert.ok(h.values.includes(true)); h.cleanup();
});
test('ready and error states do not start browser polling', () => {
 for (const progress of [derive(base), derive({ ...base, readError: true }), derive({ ...base, platforms: [{ ...platform, last_error: 'private' }] })]) {
  const h = browserHarness(() => assert.fail('unexpected read'), progress); assert.equal(h.intervals.size, 0); h.cleanup();
 }
});
test('component renders truthful stages, Riyadh schedule, and no progress percentages', () => {
 const component = load('src/components/dashboard/ReportProcessingStatus.tsx', { 'next/navigation': { useRouter: () => ({ refresh() {} }) } }).default;
 const html = renderToStaticMarkup(React.createElement(component, { progress: derive(base), branchId: null, platformId: null }));
 assert.match(html, /تقريرك متاح للمشاهدة/); assert.match(html, /بتوقيت الرياض/); assert.match(html, /مراحل تجهيز التقرير/);
 assert.match(html, /href="\/dashboard\/reports"/); assert.ok(!html.includes('%'));
});
