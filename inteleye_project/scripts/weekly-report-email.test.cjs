// Synthetic fixtures only: no n8n executions, Gmail, or hosted Supabase requests.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const parent = JSON.parse(fs.readFileSync(path.join(root, 'n8n/workflows/platform-reports.json')));
const sender = JSON.parse(fs.readFileSync(path.join(root, 'n8n/workflows/weekly-report-email.json')));
const now = Date.parse('2026-10-15T12:00:00Z');
class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
function load(file, mocks = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, Date: Clock, console, Request, Response,
    process, fetch: () => assert.fail('external request forbidden'), require(name) {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name.startsWith('@/')) return load('src/' + name.slice(2) + '.ts', mocks);
      return require(name);
    } });
  return module.exports;
}
function node(w, name) { return w.nodes.find(n => n.name === name); }
function run(w, name, input, context = {}) {
  const code = node(w, name).parameters.jsCode;
  const result = vm.runInNewContext('(function(){' + code + '\n})()', { $json: input,
    Date: Clock, $input: { all: () => input }, $: name => ({ item: { json: context[name] }, last: () => ({ json: context[name] }) }),
    fetch: () => assert.fail('external request forbidden') });
  return JSON.parse(JSON.stringify(result));
}
const permissions = load('src/lib/subscription-permissions.ts');
for (const [status, plan, view, create] of [['trial', 'basic', true, false], ['trial', 'pro', true, false],
  ['active', 'basic', true, false], ['active', 'pro', true, true], ['active', 'enterprise', true, true], ['pending', 'pro', false, false]]) {
  test(`report access ${status}/${plan} preserves custom entitlements`, () => {
    const p = permissions.getSubscriptionPermissions({ plan, subscription_status: status,
      trial_ends_at: '2026-10-20', current_period_end: '2026-11-01' });
    assert.equal(p.canViewReports, view); assert.equal(p.canCreateCustomReport, create);
  });
}
test('expired trial and paid subscriptions cannot view reports', () => {
  for (const status of ['trial', 'active']) {
    const p = permissions.getSubscriptionPermissions({ subscription_status: status, plan: 'pro',
      trial_ends_at: '2026-10-01', current_period_end: '2026-10-01' });
    assert.equal(p.canViewReports, false); assert.equal(p.canCreateCustomReport, false);
  }
});
function db(rows = {}) {
  const calls = [];
  return { calls, from(table) {
    const filters = []; calls.push({ table, filters });
    const q = { select() { return this; }, eq(...v) { filters.push(v); return this; }, order() { return this; },
      in(key, values) { filters.push([key, values]); return this; }, limit() { return this; }, then(resolve) {
        const data = (rows[table] || []).filter(row => filters.every(([key, value]) =>
          Array.isArray(value) ? value.includes(row[key]) : row[key] === value));
        return Promise.resolve({ data, error: null }).then(resolve);
      } };
    return q;
  } };
}
test('trial snapshot queries completed initial and weekly reports and skips custom requests', async () => {
  const data = load('src/lib/reports/data.ts'), database = db();
  await data.loadReportsSnapshot(database, 7, { trialReportsOnly: true });
  assert.equal(database.calls.some(c => c.table === 'report_requests'), false);
  const filters = database.calls.find(c => c.table === 'reports').filters;
  assert.deepEqual(Array.from(filters.find(([k]) => k === 'report_type')[1]), ['initial', 'initial_historical', 'weekly']);
  assert.ok(filters.some(([k, v]) => k === 'status' && v === 'completed'));
  for (const c of database.calls) assert.ok(c.filters.some(([k, v]) => k === 'client_id' && v === 7));
});
test('trial snapshot returns its completed initial and weekly rows, excluding other types, states and clients', async () => {
  const rows = [
    [1, 7, 'initial_historical', 'completed'], [2, 7, 'initial', 'completed'], [3, 7, 'weekly', 'completed'],
    [4, 7, 'custom', 'completed'], [5, 7, 'monthly', 'completed'], [6, 7, 'initial_historical', 'processing'],
    [7, 7, 'weekly', 'failed'], [8, 8, 'initial_historical', 'completed'], [9, 7, 'unknown', 'completed'],
  ].map(([id, client_id, report_type, status]) => ({ id, client_id, report_type, status }));
  const snapshot = await load('src/lib/reports/data.ts').loadReportsSnapshot(db({ reports: rows }), 7,
    { trialReportsOnly: true });
  assert.deepEqual(Array.from(snapshot.reports, report => report.reportId), [1, 2, 3]);
});
test('paid snapshot keeps the existing report history and requests', async () => {
  const database = db(); await load('src/lib/reports/data.ts').loadReportsSnapshot(database, 7);
  assert.ok(database.calls.some(c => c.table === 'report_requests'));
  assert.equal(database.calls.find(c => c.table === 'reports').filters.length, 1);
});
test('GET API derives trial report scope from server entitlement, not request parameters', async () => {
  const route = load('src/app/api/reports/route.ts', {
    '@/lib/reports/access': { getReportsAccess: async () => ({ ok: true, supabase: {}, client: { id: 7 },
      permissions: { canViewReports: true, isTrialActive: true } }) },
    '@/lib/reports/data': { loadReportsSnapshot: async (_, id, options) => {
      assert.equal(id, 7); assert.equal(options.trialReportsOnly, true); return { reports: [], branches: [], platforms: [] };
    } },
  });
  assert.equal((await route.GET()).status, 200);
});
const client = { id: 7, name: 'Synthetic Customer', email: 'demo@example.test', plan: 'basic',
  subscription_status: 'active', current_period_end: '2026-11-01' };
const severe = { client_id: 7, platform_id: 4, branch_id: 2, severity: 'high', sentiment: 'negative', is_complaint: true,
  feedback_text: 'Synthetic severe complaint', reason: 'Synthetic reason', published_at: '2026-10-10', suggested_reply: 'Synthetic reply' };
const report = { id: 9, client_id: 7, branch_id: 2, platform_id: 4, report_type: 'weekly', status: 'completed',
  period_start: '2026-10-08', period_end: '2026-10-15', stats: { reputation_urgent_cases: [severe] },
  branch: { id: 2, client_id: 7, name: 'فرع تجريبي' },
  platform: { id: 4, client_id: 7, platform_name: 'google_maps' } };
const context = { 'Read Saved Report': report, 'Claim Notification': { id: 'job-1', client_id: 7, report_id: 9 } };
for (const plan of ['basic', 'pro', 'enterprise']) {
  test(`weekly email content is gated by current plan ${plan}`, () => {
    const email = run(sender, 'Prepare Weekly Email', { ...client, plan }, context).json;
    assert.equal(email.skip, false); assert.equal(email.urgent_count, plan === 'basic' ? 0 : 1);
    assert.equal(email.message.includes(severe.feedback_text), plan !== 'basic');
    assert.ok(email.message.includes('https://www.inteleye-sa.com/dashboard/reports'));
  });
}
test('active trial never receives severe details even with saved Pro plan', () => {
  const email = run(sender, 'Prepare Weekly Email', { ...client, plan: 'pro', subscription_status: 'trial', trial_ends_at: '2026-10-20' }, context).json;
  assert.equal(email.skip, false); assert.equal(email.urgent_count, 0); assert.ok(!email.message.includes(severe.feedback_text));
});
test('expired subscriptions and invalid email skip sending', () => {
  for (const patch of [{ current_period_end: '2026-10-01' }, { subscription_status: 'trial', trial_ends_at: '2026-10-01' }, { email: '' }, { email: 'a b@example.test' }]) {
    assert.equal(run(sender, 'Prepare Weekly Email', { ...client, ...patch }, context).json.skip, true);
  }
});
test('severe section excludes other accounts, branches, platforms, and ordinary questions', () => {
  const cases = [severe, { ...severe, severity: 'critical' }, { ...severe, client_id: 8 }, { ...severe, branch_id: 3 },
    { ...severe, platform_id: 5 }, { ...severe, severity: 'medium' }, { ...severe, sentiment: 'neutral', is_complaint: false }];
  const result = run(sender, 'Prepare Weekly Email', { ...client, plan: 'pro' }, { ...context,
    'Read Saved Report': { ...report, stats: { reputation_urgent_cases: cases } } }).json;
  assert.equal(result.urgent_count, 2);
});
test('job/report ownership mismatch fails before building a recipient', () => {
  assert.throws(() => run(sender, 'Prepare Weekly Email', client, { ...context,
    'Claim Notification': { id: 'wrong', client_id: 8, report_id: 9 } }), /NOTIFICATION_SCOPE_MISMATCH/);
});
test('email is HTML; success still requires a Gmail receipt with no automatic resend', () => {
  assert.equal(node(sender, 'Send Weekly Email').parameters.emailType, 'html');
  assert.equal(node(sender, 'Send Weekly Email').retryOnFail, false);
  assert.equal(run(sender, 'Confirm Gmail Receipt', {}).json.status, 'unknown');
  assert.equal(run(sender, 'Confirm Gmail Receipt', { id: 'synthetic-gmail-id' }).json.status, 'sent');
});
test('HTML email includes the existing logo, report branch/platform, readable dates and fixed report link', () => {
  const email = run(sender, 'Prepare Weekly Email', { ...client, plan: 'pro' }, context).json;
  assert.match(email.message, /<html lang="ar" dir="rtl">/);
  assert.match(email.message, /src="https:\/\/www\.inteleye-sa\.com\/logo\.png"/);
  assert.match(email.message, /alt="شعار IntelEye"/);
  assert.match(email.message, /<strong>الفرع:<\/strong> <span dir="auto">فرع تجريبي<\/span>/);
  assert.match(email.message, /<strong>المنصة:<\/strong> <span dir="auto">خرائط Google<\/span>/);
  assert.match(email.subject, /فرع تجريبي \| خرائط Google/);
  assert.match(email.message, /أكتوبر/);
  assert.ok(!email.message.includes('2026-10-08'));
  assert.match(email.message, /رد مقترح — للمراجعة قبل النشر/);
  assert.match(email.message, /لا تثبت صحة الادعاءات أو أسبابها/);
  assert.match(email.message, /لا تُنشر الردود تلقائيًا/);
  assert.match(email.message, /<p dir="auto"/);
});
for (const [key, title] of [['google_maps', 'خرائط Google'], ['x', 'X'], ['tiktok', 'TikTok'], ['instagram', 'Instagram']]) {
  test(`email names the actual ${key} platform and report branch`, () => {
    const email = run(sender, 'Prepare Weekly Email', client, { ...context,
      'Read Saved Report': { ...report, platform: { ...report.platform, platform_name: key } } }).json;
    assert.ok(email.subject.endsWith(' | ' + title));
    assert.ok(email.message.includes('>' + title + '</span>'));
    assert.ok(!email.message.includes(severe.feedback_text));
  });
}
test('missing relations use explicit unknown labels rather than guessing from AI text', () => {
  const email = run(sender, 'Prepare Weekly Email', client, { ...context,
    'Read Saved Report': { ...report, branch_id: null, platform_id: null, branch: null, platform: null,
      stats: { branch_name: 'INVENTED BRANCH', platform_name: 'INVENTED PLATFORM' } } }).json;
  assert.match(email.message, /الفرع غير محدد/);
  assert.match(email.message, /المنصة غير محددة/);
  assert.ok(!email.message.includes('INVENTED'));
});
test('embedded relation labels from another tenant or another record stop delivery', () => {
  for (const patch of [
    { branch: { ...report.branch, client_id: 8 } }, { branch: { ...report.branch, id: 88 } },
    { platform: { ...report.platform, client_id: 8 } }, { platform: { ...report.platform, id: 88 } },
  ]) {
    assert.throws(() => run(sender, 'Prepare Weekly Email', client, { ...context,
      'Read Saved Report': { ...report, ...patch } }), /NOTIFICATION_LABEL_SCOPE_MISMATCH/);
  }
});
test('HTML escapes all untrusted names, feedback, reasons and suggested replies', () => {
  const attack = '<img src=x onerror="alert(1)"> & <script>bad()</script>';
  const email = run(sender, 'Prepare Weekly Email', { ...client, name: attack, plan: 'pro' }, { ...context,
    'Read Saved Report': { ...report, branch: { ...report.branch, name: attack }, stats: {
      reputation_urgent_cases: [{ ...severe, feedback_text: attack, reason: attack, suggested_reply: attack }],
    } } }).json;
  assert.ok(!email.message.includes(attack));
  assert.ok(!email.message.includes('<script>'));
  assert.ok(!email.message.includes('<img src=x'));
  assert.match(email.message, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt; &amp;/);
});
test('subject strips line breaks and bidi control characters without changing recipient', () => {
  const email = run(sender, 'Prepare Weekly Email', { ...client, name: 'Demo\r\nBcc: other@example.test\u202e' }, context).json;
  assert.equal(email.recipient_email, client.email);
  assert.doesNotMatch(email.subject, /[\r\n\u202e]/);
});
test('long emails preview at most five cases, retain total count, and stay below Gmail clipping size', () => {
  const email = run(sender, 'Prepare Weekly Email', { ...client, plan: 'enterprise' }, { ...context,
    'Read Saved Report': { ...report, stats: { reputation_urgent_cases: Array.from({ length: 30 }, () => ({
      ...severe, feedback_text: '"<&خطير'.repeat(1000), reason: '"<&سبب'.repeat(1000), suggested_reply: '"<&رد'.repeat(1000),
    })) } } }).json;
  assert.equal(email.urgent_count, 30);
  assert.equal(email.displayed_urgent_count, 5);
  assert.match(email.message, /نعرض هنا 5 حالات من أصل 30/);
  assert.equal((email.message.match(/رد مقترح — للمراجعة قبل النشر/g) || []).length, 5);
  assert.ok(Buffer.byteLength(email.message, 'utf8') < 90000);
});
test('missing or invalid dates and empty replies render clear fallbacks without malformed timestamps', () => {
  const email = run(sender, 'Prepare Weekly Email', { ...client, plan: 'pro' }, { ...context,
    'Read Saved Report': { ...report, period_start: '2026-02-30', stats: { reputation_urgent_cases: [{
      ...severe, published_at: 'not a date', reason: null, suggested_reply: null,
    }] } } }).json;
  assert.match(email.message, /غير متاح/);
  assert.match(email.message, /لا يوجد رد مقترح محفوظ/);
  assert.doesNotMatch(email.message, /Invalid Date|undefined|2026-02-30|not a date/);
});
test('Pro report without severe cases sends a simple readiness email without alarming section', () => {
  const email = run(sender, 'Prepare Weekly Email', { ...client, plan: 'pro' }, { ...context,
    'Read Saved Report': { ...report, stats: {} } }).json;
  assert.equal(email.urgent_count, 0);
  assert.doesNotMatch(email.message, /حالات عالية الخطورة تستحق مراجعتكم/);
  assert.match(email.message, /عرض التقرير الكامل/);
});
test('saved report embeds existing branch and platform FKs without adding network nodes or inner filtering', () => {
  const select = node(sender, 'Read Saved Report').parameters.queryParameters.parameters.find(p => p.name === 'select').value;
  assert.match(select, /branch:branches\(id,client_id,name\)/);
  assert.match(select, /platform:client_platforms\(id,client_id,platform_name\)/);
  assert.doesNotMatch(select, /!inner/);
  const names = sender.nodes.filter(n => n.type.endsWith('.httpRequest')).map(n => n.name);
  assert.deepEqual(names, ['Read Saved Report', 'Read Notification', 'Claim Notification', 'Read Current Client',
    'Record Delivery Result', 'Record Skipped Notification']);
});
test('uncertain Gmail failures are not retried or marked sent', () => {
  for (const code of [undefined, 500, 503]) {
    const result = run(sender, 'Classify Gmail Failure', { statusCode: code, message: 'private body' }).json;
    assert.equal(result.status, 'unknown'); assert.ok(!JSON.stringify(result).includes('private body'));
  }
  assert.equal(run(sender, 'Classify Gmail Failure', { error: { httpCode: 401 } }).json.status, 'failed');
});
test('workflow dispatch is event-driven, inactive, and after saved weekly report', () => {
  assert.equal(parent.active, false); assert.equal(sender.active, false);
  assert.equal(sender.nodes.some(n => /schedule|webhook|manualTrigger/i.test(n.type)), false);
  assert.equal(parent.connections['Upsert Report'].main[0][0].node, 'Read Final Report');
  assert.equal(parent.connections['Read Final Report'].main[0][0].node, 'Report Coverage Outcome');
  assert.equal(parent.connections['Report Coverage Outcome'].main[0][0].node, 'Is Completed Weekly Report?');
  const n = node(parent, 'Send Weekly Report Notification');
  assert.equal(n.type, 'n8n-nodes-base.executeWorkflow'); assert.equal(n.alwaysOutputData, true);
  assert.equal(n.onError, 'continueRegularOutput');
  const refresh = node(parent, 'Platform Sync Completed Webhook');
  assert.equal(refresh.parameters.authentication, 'headerAuth');
  assert.ok(refresh.credentials.httpHeaderAuth);
  const claim = node(sender, 'Claim Notification').parameters;
  assert.ok(claim.queryParameters.parameters.some(p => p.name === 'status' && p.value === 'eq.pending'));
});
test('parent validates subscription expiry and uses each current loop context', () => {
  const eligible = { id: 7, subscription_status: 'active', current_period_end: '2026-11-01', next_report_at: '2026-10-08',
    client_platforms: [{ is_active: true, connection_status: 'connected', last_success_at: '2026-10-15' }] };
  const results = run(parent, 'Keep Clients Ready For Reports', [{ json: eligible },
    { json: { ...eligible, id: 8, current_period_end: '2026-10-01' } }]);
  assert.equal(results.length, 1); assert.equal(results[0].json.id, 7);
  for (const name of ['Attach Report Context', 'Build Platform Report Stats']) {
    assert.ok(!node(parent, name).parameters.jsCode.includes('.first()'));
    assert.ok(node(parent, name).parameters.jsCode.includes('$input.all()'));
  }
});
test('reputation cases come from actual report rows, not AI invented summaries', () => {
  const rows = [severe, { ...severe, severity: 'medium', source_record_id: 2 }, { ...severe, sentiment: 'positive', is_complaint: false, source_record_id: 3 }]
    .map((json, index) => ({ json: { ...json, source_record_id: json.source_record_id || index + 1 } }));
  const result = run(parent, 'Build Platform Report Stats', rows, { 'Restore Reserved Context': { id: 4, client_id: 7, branch_id: 2 } });
  assert.equal(result[0].json.stats.reputation_urgent_cases.length, 1);
  assert.throws(() => run(parent, 'Build Platform Report Stats', [{ json: { ...severe, source_record_id: 1, client_id: 8 } }],
    { 'Restore Reserved Context': { id: 4, client_id: 7, branch_id: 2 } }), /REPORT_FEEDBACK_SCOPE_MISMATCH/);
});
test('all workflow code is valid JavaScript and graph references existing nodes', () => {
  for (const w of [parent, sender]) {
    const names = new Set(w.nodes.map(n => n.name));
    for (const n of w.nodes) if (n.type.endsWith('.code')) new Function('$json', '$', '$input', n.parameters.jsCode);
    for (const [source, edge] of Object.entries(w.connections)) {
      assert.ok(names.has(source)); for (const output of edge.main) for (const target of output) assert.ok(names.has(target.node));
    }
  }
});
