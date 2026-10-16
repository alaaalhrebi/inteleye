// Runs exported n8n JavaScript against synthetic inputs. No external requests.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const load = file => JSON.parse(fs.readFileSync(path.join(root, 'n8n/workflows', file)));
const reports = load('platform-reports.json');
const tiktok = load('tiktok-comments-clockworks.json');
const node = (workflow, name) => {
  const found = workflow.nodes.find(n => n.name === name);
  assert.ok(found, `Missing ${name}`); return found;
};
const now = Date.parse('2026-10-16T12:00:00Z');
function globals(input, context = {}, execution = 'synthetic-1', clock = now) {
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [clock])); } static now() { return clock; } }
  return { Date: Clock, $json: input[0]?.json || {}, $execution: { id: execution },
    $now: { toUTC: () => ({ toISO: () => new Clock().toISOString() }) },
    $input: { all: () => input }, $: name => ({
      last: () => ({ json: context[name] || {} }), item: { json: context[name] || {} },
      all: () => Array.isArray(context[name]) ? context[name].map(json => ({ json })) : [{ json: context[name] || {} }],
    }), fetch: () => assert.fail('External requests forbidden') };
}
function run(workflow, name, input, context = {}, execution, clock) {
  const result = vm.runInNewContext('(function(){' + node(workflow, name).parameters.jsCode + '\n})()',
    globals(input, context, execution, clock), { timeout: 1000 });
  return JSON.parse(JSON.stringify(result));
}
function expression(source, input, context = {}, execution) {
  assert.ok(source.startsWith('={{') && source.endsWith('}}'));
  return vm.runInNewContext('(' + source.slice(3, -2) + ')', globals(input, context, execution), { timeout: 1000 });
}
const items = (...rows) => rows.map(json => ({ json }));
const branch = { id: 10, client_id: 7, name: 'Synthetic branch' };
const client = { id: 7, name: 'Synthetic business', subscription_status: 'trial', trial_ends_at: '2026-10-20',
  activated_at: '2026-10-15T10:00:00Z', created_at: '2026-10-15T10:00:00Z', next_report_at: '2026-10-15T10:00:00Z',
  initial_report_generated_at: null, client_platforms: [{ id: 4, is_active: true, connection_status: 'connected', last_success_at: '2026-10-16T10:00:00Z' }] };
const platform = { id: 4, client_id: 7, branch_id: 10, platform_name: 'tiktok', is_active: true,
  created_at: '2026-10-15T10:00:00', branches: branch };
function contextFor(account = client, source = platform, clock = now) {
  const period = run(reports, 'Determine Report Period', items(account), {}, undefined, clock).json;
  const linked = run(reports, 'Attach Report Context', items(source), { 'Determine Report Period': period }, undefined, clock)[0].json;
  const resolved = run(reports, 'Resolve Platform Report Period', items({}), { 'Loop Platform Reports': linked }, undefined, clock)[0].json;
  return run(reports, 'Prepare Report Window', items(resolved), { 'Resolve Platform Report Period': resolved }, undefined, clock)[0].json;
}
const context = contextFor();
const scopeContext = { 'Prepare Report Window': context };
function reservation(saved = {}, execution = 'synthetic-1') {
  return run(reports, 'Evaluate Report Reservation', items(saved), scopeContext, execution)[0].json;
}
function rowFor(plan, id = 20) { return { ...plan.claim_body, id, branch_id: 10, platform_id: 4, client_id: 7,
  report_scope: context.report_scope, report_type: 'initial_historical', period_start: '2026-09-15', period_end: '2026-10-15' }; }

test('27 completed analysis batch items dispatch one current-platform event', () => {
  const inputs = Array.from({ length: 27 }, (_, id) => ({ json: { id } }));
  assert.equal(node(tiktok, 'Verify Platform Analysis Complete').executeOnce, true);
  assert.equal(node(tiktok, 'Complete TikTok Sync').executeOnce, true);
  const result = run(tiktok, 'Prepare Report Dispatch', inputs,
    { 'Continue TikTok Platform': { client_id: 7, platform_id: 4 } });
  assert.deepEqual(result, items({ source: 'platform_sync_completed', client_id: 7, platform_id: 4 }));
  assert.equal(tiktok.connections['Complete TikTok Sync'].main[0][0].node, 'Prepare Report Dispatch');
  assert.equal(tiktok.connections['Prepare Report Dispatch'].main[0][0].node, 'Refresh Client Reports');
  assert.equal(tiktok.connections['Refresh Client Reports'].main[0][0].node, 'Loop Over Items');
  assert.equal(node(tiktok, 'Refresh Client Reports').onError, undefined);
});
test('completion is gated by remaining pending comments in the same client and platform', () => {
  const q = node(tiktok, 'Verify Platform Analysis Complete').parameters.queryParameters.parameters;
  assert.ok(q.some(p => p.name === 'analysis_status' && p.value === 'eq.pending'));
  for (const key of ['client_id', 'platform_id']) assert.ok(q.some(p => p.name === key));
  assert.equal(tiktok.connections['Loop TikTok Analysis Batches'].main[0][0].node, 'Verify Platform Analysis Complete');
  assert.equal(tiktok.connections['Platform Analysis Still Pending?'].main[0][0].node, 'Incomplete Analysis Context');
  const failure = run(tiktok, 'Incomplete Analysis Context', items({ id: 99 }),
    { 'Continue TikTok Platform': { client_id: 7, platform_id: 4 } })[0].json;
  assert.equal(failure.sync_error, 'ANALYSIS_INCOMPLETE');
  assert.equal(tiktok.connections['Incomplete Analysis Context'].main[0][0].node, 'Fail TikTok Sync');
});
test('native report invocation has a scoped input and no public unauthenticated endpoint', () => {
  assert.equal(node(reports, 'Platform Sync Completed Input').type, 'n8n-nodes-base.executeWorkflowTrigger');
  assert.equal(node(reports, 'Platform Sync Completed Webhook').parameters.authentication, 'headerAuth');
  const trigger = run(reports, 'Resolve Report Trigger', items({ source: 'platform_sync_completed', client_id: 7, platform_id: 4 }));
  assert.deepEqual(trigger, items({ client_id: 7, platform_id: 4, targeted: true }));
  for (const value of [{ client_id: 'bad' }, { platform_id: 4 }, { client_id: 7, platform_id: -1 }, { source: 'platform_sync_completed', client_id: 7 }]) {
    assert.throws(() => run(reports, 'Resolve Report Trigger', items(value)), /INVALID_REPORT_SCOPE/);
  }
});
test('targeted report readiness does not fan out to other tenants or foreign platforms', () => {
  const targeted = { client_id: 7, platform_id: 4, targeted: true };
  const result = run(reports, 'Keep Clients Ready For Reports', items(client, { ...client, id: 8 }), { 'Resolve Report Trigger': targeted });
  assert.equal(result.length, 1); assert.equal(result[0].json.id, 7);
  assert.equal(run(reports, 'Keep Clients Ready For Reports', items(client),
    { 'Resolve Report Trigger': { ...targeted, platform_id: 999 } }).length, 0);
});
test('trial expiry, incomplete sync, empty platforms and future weekly schedule block generation', () => {
  const rejected = [
    { ...client, trial_ends_at: '2026-10-01' }, { ...client, client_platforms: [] },
    { ...client, client_platforms: [{ ...client.client_platforms[0], connection_status: 'syncing' }] },
    { ...client, client_platforms: [{ ...client.client_platforms[0], last_success_at: null }] },
    { ...client, initial_report_generated_at: '2026-10-15', next_report_at: '2026-10-22' },
  ];
  assert.equal(run(reports, 'Keep Clients Ready For Reports', items(...rejected)).length, 0);
  assert.equal(run(reports, 'Keep Clients Ready For Reports', items({ ...client, next_report_at: null })).length, 1);
});
test('initial period stays stable across midnight, retries and repeated completion timestamps', () => {
  const later = contextFor({ ...client, next_report_at: '2026-10-16T11:00:00Z',
    client_platforms: [{ ...client.client_platforms[0], last_success_at: '2026-10-16T11:01:00Z' }] }, platform, now + 86400000);
  for (const key of ['period_start', 'period_end', 'report_scope']) assert.equal(later[key], context[key]);
  assert.equal(context.period_end, '2026-10-15T10:00:00.000Z');
  assert.equal(context.report_type, 'initial_historical');
});
test('platform context rejects a foreign client, branch, future anchor or missing link timestamp', () => {
  for (const value of [{ ...platform, client_id: 8 }, { ...platform, branches: { ...branch, client_id: 8 } },
    { ...platform, created_at: '2026-11-01' }, { ...platform, created_at: null }]) {
    assert.throws(() => contextFor(client, value), /REPORT_PLATFORM_SCOPE_MISMATCH|INVALID_PLATFORM_REPORT_ANCHOR/);
  }
  assert.notEqual(contextFor(client, { ...platform, id: 5 }).report_scope, context.report_scope);
});
test('weekly windows start at each platform previous cutoff, avoiding multi-platform gaps', () => {
  const weekly = { ...context, report_type: 'weekly', period_start: '2026-10-15T18:00:00Z', period_end: '2026-10-16T12:00:00Z' };
  const previous = { id: 20, client_id: 7, platform_id: 4, branch_id: 10, report_scope: context.report_scope,
    report_type: 'initial_historical', status: 'completed', period_start: '2026-09-15', period_end: '2026-10-15',
    stats: { report_generation: { period_start: '2026-09-15T10:00:00Z', period_end: '2026-10-15T10:00:00Z' } } };
  const result = run(reports, 'Resolve Platform Report Period', items(previous), { 'Loop Platform Reports': weekly })[0].json;
  assert.equal(result.period_start, '2026-10-15T10:00:00.000Z');
  const url = expression(node(reports, 'Read Previous Platform Report').parameters.url, items(weekly));
  assert.equal(new URL(url).searchParams.has('period_end'), false);
  assert.throws(() => run(reports, 'Resolve Platform Report Period', items({ ...previous, client_id: 8 }),
    { 'Loop Platform Reports': weekly }), /REPORT_PREVIOUS_SCOPE_MISMATCH/);
});
test('first reservation uses the existing composite index and metadata inside stats only', () => {
  const plan = reservation();
  assert.equal(plan.claim_method, 'POST'); assert.equal(plan.claim_body.status, 'processing');
  assert.equal(new URL(plan.claim_url).searchParams.get('on_conflict'), 'client_id,report_type,period_start,period_end,report_scope');
  assert.equal(plan.claim_body.stats.report_generation.owner, 'synthetic-1');
  assert.equal(Object.hasOwn(plan.claim_body, 'generation_owner'), false);
  assert.equal(Object.hasOwn(plan.claim_body, 'generation_key'), false);
  assert.ok(node(reports, 'Reserve Report').parameters.headerParameters.parameters.some(p => p.value.includes('ignore-duplicates')));
});
test('processing and pending reports are never taken over by elapsed time', () => {
  const original = rowFor(reservation());
  for (const status of ['pending', 'processing']) assert.equal(reservation({ ...original, status, updated_at: '2000-01-01' }).action, 'skip');
});
test('completed report is reused with its original ID instead of generating another', () => {
  const row = { ...rowFor(reservation()), status: 'completed' };
  const plan = reservation(row);
  assert.equal(plan.action, 'completed'); assert.equal(plan.saved_report.id, row.id);
});
test('failed reservation retries same row and frozen period with conditional previous ownership', () => {
  const failed = { ...rowFor(reservation()), status: 'failed' };
  const plan = reservation(failed, 'synthetic-2');
  assert.equal(plan.claim_method, 'PATCH');
  assert.equal(new URL(plan.claim_url).searchParams.get('id'), 'eq.20');
  assert.equal(new URL(plan.claim_url).searchParams.get('status'), 'eq.failed');
  assert.equal(new URL(plan.claim_url).searchParams.get('stats->report_generation->>owner'), 'eq.synthetic-1');
  assert.equal(plan.claim_body.stats.report_generation.owner, 'synthetic-2');
  assert.equal(plan.claim_body.stats.report_generation.period_end, context.period_end);
});
test('legacy failed row is preserved for review; midnight is never invented', () => {
  const legacy = { ...rowFor(reservation()), status: 'failed', stats: {}, report_scope: context.legacy_report_scope };
  const before = JSON.stringify(legacy);
  assert.throws(() => reservation(legacy), /REPORT_LEGACY_COVERAGE_REVIEW_REQUIRED/);
  assert.equal(JSON.stringify(legacy), before);
});
test('inconsistent saved period metadata fails before changing a failed reservation', () => {
  const failed = { ...rowFor(reservation()), status: 'failed', period_end: '2026-10-14' };
  assert.throws(() => reservation(failed), /REPORT_PERIOD_METADATA_MISMATCH/);
});
test('reservation read-back handles a lost write response but only the winner may generate', () => {
  const plan = reservation(), row = rowFor(plan);
  const ctx = { ...scopeContext, 'Evaluate Report Reservation': plan };
  assert.equal(run(reports, 'Validate Report Reservation', items(row), ctx)[0].json.id, row.id);
  const condition = node(reports, 'Report Reservation Acquired?').parameters.conditions.conditions[0].leftValue;
  assert.equal(expression(condition, items(row), {}, 'synthetic-1'), true);
  assert.equal(expression(condition, items(row), {}, 'synthetic-2'), false);
  assert.throws(() => run(reports, 'Validate Report Reservation', items({}), ctx), /NOT_CONFIRMED/);
  assert.throws(() => run(reports, 'Validate Report Reservation', items({ ...row, client_id: 8 }), ctx), /SCOPE_MISMATCH/);
});
test('save and failure handlers fence late writers by ID, tenant, platform, state and metadata owner', () => {
  const reserved = run(reports, 'Restore Reserved Context', items(rowFor(reservation())), scopeContext)[0].json;
  const input = items({ ...reserved, platform_id: reserved.id });
  for (const name of ['Upsert Report', 'Record Report Failure']) {
    const url = expression(node(reports, name).parameters.url, input, { 'Restore Reserved Context': reserved });
    const q = new URL(url).searchParams;
    for (const [key, value] of [['id','eq.20'],['client_id','eq.7'],['platform_id','eq.4'],['status','eq.processing'],['stats->report_generation->>owner','eq.synthetic-1']]) {
      assert.equal(q.get(key), value);
    }
  }
});
test('empty completed sync produces a truthful zero-data report without another AI call', () => {
  const reserved = run(reports, 'Restore Reserved Context', items(rowFor(reservation())), scopeContext)[0].json;
  const stats = run(reports, 'Build Platform Report Stats', items({}), { 'Restore Reserved Context': reserved });
  assert.equal(stats[0].json.stats.total_feedback, 0);
  const condition = node(reports, 'Report Has Feedback?').parameters.conditions.conditions[0].leftValue;
  assert.equal(expression(condition, stats), false);
  const empty = run(reports, 'Build Empty Report', stats)[0].json;
  assert.equal(empty.report_id, 20); assert.equal(empty.total_feedback, 0);
  assert.match(empty.executive_summary, /لا توجد تعليقات/);
});
test('failed report never advances the schedule or reaches Gmail; completed scopes must all match', () => {
  const period = run(reports, 'Determine Report Period', items(client)).json;
  const row = { ...rowFor(reservation()), status: 'completed' };
  const ctx = { 'Determine Report Period': period, 'Attach Report Context': [context] };
  for (const patch of [{ status: 'failed' }, { client_id: 8 }, { platform_id: 5 }, { branch_id: 11 }]) {
    const result = run(reports, 'Check Client Report Completion', items({ ...row, ...patch }), ctx)[0].json;
    assert.equal(result.all_reports_ready, false);
  }
  const ready = run(reports, 'Check Client Report Completion', items(row), ctx)[0].json;
  assert.equal(ready.all_reports_ready, true); assert.equal(ready.report_period_end, context.period_end);
  assert.throws(() => run(reports, 'Assert Report Batch', items({ report_generation_failed: true })), /RETRY_AVAILABLE/);
});
test('weekly notification contract and pending job claim remain unchanged', () => {
  const condition = node(reports, 'Is Completed Weekly Report?').parameters.conditions.conditions[0].leftValue;
  for (const status of ['failed', 'processing', 'pending']) assert.equal(expression(condition, items({ report_type: 'weekly', status })), false);
  assert.equal(expression(condition, items({ report_type: 'initial_historical', status: 'completed' })), false);
  assert.equal(expression(condition, items({ report_type: 'weekly', status: 'completed' })), true);
  assert.equal(reports.connections['Upsert Report'].main[0][0].node, 'Read Final Report');
  const sender = load('weekly-report-email.json');
  assert.ok(node(sender, 'Claim Notification').parameters.queryParameters.parameters.some(p => p.name === 'status' && p.value === 'eq.pending'));
});

// Precision regressions: execute the JSON code with complete same-day history,
// not a date-only stub that can hide an excluded previous report.
const at = hour => `2026-10-16T${String(hour).padStart(2,'0')}:00:00.000Z`;
function preciseRow(id, start, end, extra = {}) {
  return { id, client_id:7, platform_id:4, branch_id:10, report_type:'weekly', status:'completed',
    report_scope:context.base_report_scope+':window:'+end.replace(/[-:.]/g,''),
    period_start:start.slice(0,10), period_end:end.slice(0,10), updated_at:at(12),
    stats:{ report_generation:{version:1,owner:'saved-'+id,period_start:start,period_end:end} }, ...extra };
}
function periodPlan(history, target = {}, execution = 'synthetic-1') {
  const c={...context,report_type:'weekly',period_start:at(10),period_end:at(12),...target};
  return run(reports,'Resolve Platform Report Period',items(...(history.length?history:[{}])),
    {'Loop Platform Reports':c},execution)[0].json;
}
function prepared(plan, anchor) {
  return run(reports,'Prepare Report Window',items(anchor || plan), {'Resolve Platform Report Period':plan})[0].json;
}
function completedCheck(rows, target = {}) {
  const p={...context,report_type:'weekly',period_start:at(10),period_end:at(12),...target};
  return run(reports,'Check Client Report Completion',items(...(rows.length?rows:[{}])),
    {'Determine Report Period':{id:7,report_type:'weekly',period_start:p.period_start,period_end:p.period_end},
      'Attach Report Context':[p]})[0].json;
}
test('same-day previous report is retained and next report starts at its exact cutoff', () => {
  const first=preciseRow(30,at(9),at(10));
  const plan=periodPlan([first],{period_start:at(11)});
  assert.equal(plan.period_start,at(10));
  assert.equal(plan.period_end,at(12));
  assert.equal(plan.report_anchor.id,30);
  assert.equal(plan.anchor_required,true);
  assert.equal(completedCheck([first]).all_reports_ready,false);
});
test('same-date completed report cannot masquerade as the next hourly interval', () => {
  const row=preciseRow(31,at(10),at(11));
  const ctx={...context,period_start:at(11),period_end:at(12),report_type:'weekly',report_scope:row.report_scope};
  assert.throws(()=>run(reports,'Evaluate Report Reservation',items(row),{'Prepare Report Window':ctx}),/REPORT_SAVED_COVERAGE_MISMATCH/);
  const result=completedCheck([row]);
  assert.equal(result.all_reports_ready,false);
  assert.equal(result.report_period_end,null);
});
test('adjacent reports in one day have distinct keys and collectively prove coverage', () => {
  const a=preciseRow(31,at(10),at(11)),b=preciseRow(32,at(11),at(12));
  assert.notEqual(a.report_scope,b.report_scope);
  const covered=completedCheck([a,b]);
  assert.equal(covered.all_reports_ready,true);assert.equal(covered.report_period_end,at(12));
  const plan=periodPlan([a,b]);
  assert.equal(plan.coverage_complete,true);
  const c=prepared(plan);
  assert.equal(run(reports,'Evaluate Report Reservation',items(b),{'Prepare Report Window':c})[0].json.action,'skip');
});
test('an exact completed report can be reused, while partial or date-only coverage cannot', () => {
  const row=preciseRow(31,at(10),at(12));
  const plan=periodPlan([row]);assert.equal(plan.coverage_complete,false);
  const c=prepared(plan);
  const result=run(reports,'Evaluate Report Reservation',items(row),{'Prepare Report Window':c})[0].json;
  assert.equal(result.action,'completed');assert.equal(result.saved_report.id,row.id);
  for(const status of ['completed','failed','processing','pending']) {
    const legacy={...row,status,stats:{}}; const before=JSON.stringify(legacy);
    assert.throws(()=>periodPlan([legacy]),/REPORT_LEGACY_COVERAGE_REVIEW_REQUIRED/);
    assert.throws(()=>completedCheck([legacy]),/REPORT_LEGACY_COVERAGE_REVIEW_REQUIRED/);
    assert.equal(JSON.stringify(legacy),before);
  }
});
test('known gaps and overlaps stop scheduling and do not silently repair historical rows', () => {
  const first=preciseRow(1,at(9),at(10));
  for(const second of [preciseRow(2,at(11),at(12)),preciseRow(2,'2026-10-16T09:30:00.000Z',at(12))]) {
    assert.throws(()=>periodPlan([first,second]),/REPORT_COVERAGE_CHAIN_REVIEW_REQUIRED/);
  }
  assert.equal(completedCheck([first,preciseRow(2,at(11),at(12))]).all_reports_ready,false);
  assert.throws(()=>completedCheck([first,preciseRow(2,'2026-10-16T09:30:00.000Z',at(12))]),/REPORT_COVERAGE_OVERLAP_REVIEW_REQUIRED/);
});
test('a competing boundary reservation is recovered rather than issuing an overlapping window', () => {
  const first=preciseRow(30,at(9),at(10));
  const oldPlan=periodPlan([first]); // proposes 10 -> 12
  const winner={...first,stats:{report_generation:{...first.stats.report_generation,next_period_end:at(11)}}};
  const next=prepared(oldPlan,winner);
  assert.equal(next.period_start,at(10));assert.equal(next.period_end,at(11));
  assert.ok(next.report_scope.endsWith('20261016T110000000Z'));
  assert.equal(next.requested_period_end,at(12));
});
test('unfinished window must settle before a later target can be issued', () => {
  const first=preciseRow(30,at(9),at(10));
  first.stats.report_generation.next_period_end=at(11);
  const pending=preciseRow(31,at(10),at(11),{status:'processing'});
  const plan=periodPlan([first,pending]);
  assert.equal(plan.existing_report_id,31);assert.equal(plan.period_end,at(11));
  const c=prepared(plan,first);
  assert.equal(run(reports,'Evaluate Report Reservation',items(pending),{'Prepare Report Window':c})[0].json.action,'skip');
  assert.equal(completedCheck([first,pending]).all_reports_ready,false);
});
test('reserved but uncreated window survives a crash and is generated before a later target', () => {
  const first=preciseRow(30,at(9),at(10));
  first.stats.report_generation.next_period_end=at(11);
  const plan=periodPlan([first]);
  assert.equal(plan.period_end,at(11));assert.equal(plan.existing_report_id,null);
  const ready=prepared(plan,first);
  const claim=run(reports,'Evaluate Report Reservation',items({}),{'Prepare Report Window':ready})[0].json;
  assert.equal(claim.claim_body.stats.report_generation.period_end,at(11));
  const report={...claim.claim_body,id:31,status:'completed'};
  assert.equal(expression(node(reports,'Continue Platform Coverage?').parameters.conditions.conditions[0].leftValue,
    items(report),{'Report Coverage Outcome':report,'Loop Platform Reports':{period_end:at(12)}}),true);
});
test('timestamps with equivalent timezone offsets compare as instants', () => {
  const row=preciseRow(30,at(9),at(10));
  row.stats.report_generation.period_start='2026-10-16T12:00:00+03:00';
  row.stats.report_generation.period_end='2026-10-16T13:00:00+03:00';
  assert.equal(periodPlan([row]).period_start,at(10));
});
test('consecutive windows crossing UTC midnight retain the exact shared boundary', () => {
  const end='2026-10-16T00:30:00.000Z';
  const previous=preciseRow(30,'2026-10-15T23:30:00.000Z',end);
  const plan=periodPlan([previous],{period_start:'2026-10-16T00:45:00.000Z',period_end:'2026-10-16T01:00:00.000Z'});
  assert.equal(plan.period_start,end);
  assert.equal(plan.period_end,'2026-10-16T01:00:00.000Z');
});
test('common account watermark never exceeds the least proven platform coverage', () => {
  const p1={...context,report_type:'initial_historical'},p2={...context,id:5,base_report_scope:'tiktok:branch:10:platform:5',report_scope:'tiktok:branch:10:platform:5',
    period_start:'2026-09-15T11:00:00.000Z',period_end:'2026-10-15T11:00:00.000Z'};
  const a=rowFor(reservation());a.status='completed';
  const b={...a,id:21,platform_id:5,report_scope:p2.report_scope,stats:{report_generation:{owner:'b',period_start:p2.period_start,period_end:p2.period_end}}};
  const result=run(reports,'Check Client Report Completion',items(a,b),
    {'Determine Report Period':{id:7,report_type:'initial_historical'},'Attach Report Context':[p1,p2]})[0].json;
  assert.equal(result.all_reports_ready,true);assert.equal(result.report_period_end,p1.period_end);
});
test('new platform on an existing account establishes a precise initial window before continuing', () => {
  const empty=periodPlan([]);
  assert.equal(empty.report_type,'initial_historical');
  assert.equal(empty.period_end,context.link_report_end);
  const first=prepared(empty);
  const claim=run(reports,'Evaluate Report Reservation',items({}),{'Prepare Report Window':first})[0].json;
  const saved={...claim.claim_body,id:30,status:'completed',updated_at:at(12)};
  const next=periodPlan([saved]);
  assert.equal(next.report_type,'weekly');assert.equal(next.period_start,saved.stats.report_generation.period_end);
  assert.equal(next.period_end,at(12));assert.equal(next.anchor_required,true);
  assert.equal(reports.connections['Continue Platform Coverage?'].main[0][0].node,'Read Previous Platform Report');
});
test('uncertain legacy scope is isolated from other platforms and clients in the scheduled batch', () => {
  assert.equal(node(reports,'Resolve Platform Report Period').onError,'continueErrorOutput');
  assert.equal(reports.connections['Resolve Platform Report Period'].main[1][0].node,'Review Platform Coverage');
  assert.equal(reports.connections['Review Platform Coverage'].main[0][0].node,'Loop Platform Reports');
  const flag=run(reports,'Review Platform Coverage',items({}),{'Loop Platform Reports':context})[0].json;
  assert.equal(flag.report_generation_review_required,true);assert.equal(flag.client_id,7);
  assert.equal(reports.connections['Check Client Report Completion'].main[1][0].node,'Review Client Coverage');
  assert.equal(reports.connections['Review Client Coverage'].main[0][0].node,'Loop Clients');
  const clientFlag=run(reports,'Review Client Coverage',items({}),{'Determine Report Period':client})[0].json;
  assert.throws(()=>run(reports,'Assert Report Batch',items(clientFlag)),/REPORT_COVERAGE_REVIEW_REQUIRED/);
});
test('legacy labels or unassigned platform IDs cannot disappear from the history check', () => {
  const target={...context,report_type:'weekly',period_start:at(10),period_end:at(12)};
  const q=new URL(expression(node(reports,'Read Previous Platform Report').parameters.url,items(target))).searchParams;
  assert.equal(q.get('client_id'),'eq.7');assert.equal(q.get('branch_id'),'eq.10');
  assert.equal(q.get('or'),'(platform_id.eq.4,platform_id.is.null)');
  assert.equal(q.has('report_scope'),false);
  for(const extra of [{report_scope:'google_maps'}, {platform_id:null}]) {
    assert.throws(()=>periodPlan([preciseRow(30,at(9),at(10),extra)]),/REPORT_PREVIOUS_SCOPE_MISMATCH/);
  }
});
test('half-open timestamp windows assign a boundary comment to exactly one consecutive report', () => {
  const filter=node(reports,'Get Platform Feedback').parameters.queryParameters.parameters.find(p=>p.name==='and').value;
  const a={...context,period_start:at(10),period_end:at(11)},b={...context,period_start:at(11),period_end:at(12)};
  assert.equal(expression(filter,items(a)),`(published_at.gte.${at(10)},published_at.lt.${at(11)})`);
  assert.equal(expression(filter,items(b)),`(published_at.gte.${at(11)},published_at.lt.${at(12)})`);
  for(const value of [Date.parse(at(11))-1,Date.parse(at(11)),Date.parse(at(11))+1]) {
    const count=[a,b].filter(p=>value>=Date.parse(p.period_start)&&value<Date.parse(p.period_end)).length;
    assert.equal(count,1);
  }
});
for(const platform_name of ['google_maps','x','instagram','tiktok']) {
  test(`full timestamp continuity and scope isolation for ${platform_name}`,()=>{
    const base=`${platform_name}:branch:10:platform:4`;
    const target={...context,platform_name,base_report_scope:base,legacy_report_scope:`${platform_name}:branch:10`,report_scope:base,
      report_type:'weekly',period_start:at(10),period_end:at(12)};
    const previous=preciseRow(30,at(9),at(10),{report_scope:base+':window:20261016T100000000Z'});
    const plan=run(reports,'Resolve Platform Report Period',items(previous),{'Loop Platform Reports':target})[0].json;
    assert.equal(plan.period_start,at(10));
    assert.equal(plan.report_anchor.platform_id,4);
    assert.throws(()=>run(reports,'Resolve Platform Report Period',items({...previous,client_id:8}),{'Loop Platform Reports':target}),/REPORT_PREVIOUS_SCOPE_MISMATCH/);
  });
}
test('exports have valid expressions, unique node IDs and no dangling graph edges', () => {
  for (const workflow of [reports, tiktok]) {
    assert.equal(workflow.active, false);
    assert.equal(Object.keys(workflow.pinData || {}).length, 0, 'No pinned customer/execution data in exports');
    const names = new Set(workflow.nodes.map(n => n.name)), ids = new Set(workflow.nodes.map(n => n.id));
    assert.equal(names.size, workflow.nodes.length); assert.equal(ids.size, workflow.nodes.length);
    for (const n of workflow.nodes) {
      if (n.type.endsWith('.code')) new Function('$json', '$', '$input', '$execution', n.parameters.jsCode);
      const walk = value => {
        if (typeof value === 'string' && value.startsWith('={{') && value.endsWith('}}')) new Function('return ('+value.slice(3,-2)+');');
        else if (value && typeof value === 'object') Object.values(value).forEach(walk);
      };
      walk(n.parameters);
    }
    for (const [source, outputs] of Object.entries(workflow.connections)) {
      assert.ok(names.has(source));
      for (const lane of outputs.main) for (const target of lane) assert.ok(names.has(target.node));
    }
  }
});
