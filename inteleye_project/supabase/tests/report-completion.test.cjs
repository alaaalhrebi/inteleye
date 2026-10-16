// Disposable PostgreSQL only, network disabled. No hosted credentials or API calls.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync, spawn } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const workflow = JSON.parse(fs.readFileSync(path.join(root, 'n8n/workflows/platform-reports.json')));
const sender = JSON.parse(fs.readFileSync(path.join(root, 'n8n/workflows/weekly-report-email.json')));
const node = (w, name) => w.nodes.find(n => n.name === name);
const container = `inteleye-report-completion-${process.pid}`;
const args = ['exec','-i',container,'psql','-X','-U','postgres','-d','synthetic','-v','ON_ERROR_STOP=1','-Atq'];
const sql = input => execFileSync('docker', args, { input, encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }).trim();
const literal = value => value == null ? 'null' : typeof value === 'number' ? String(value) :
  typeof value === 'boolean' ? String(value) : Array.isArray(value) ? `array[${value.map(literal).join(',')}]::text[]` :
  "'" + (typeof value === 'object' ? JSON.stringify(value) : String(value)).replaceAll("'", "''") + "'" + (typeof value === 'object' ? '::jsonb' : '');
function globals(json, context, execution = 'owner-a') {
  return { $json: json, $input: { all: () => [{ json }] }, $execution: { id: execution },
    $now: { toUTC: () => ({ toISO: () => '2026-10-16T12:00:00.000Z' }) },
    $: name => ({ last: () => ({ json: context[name] }), item: { json: context[name] },
      all: () => Array.isArray(context[name]) ? context[name].map(json=>({json})) : [{json:context[name] || {}}] }),
    fetch: () => assert.fail('Network access forbidden') };
}
function run(name, json, context, execution) {
  return JSON.parse(JSON.stringify(vm.runInNewContext('(function(){'+node(workflow,name).parameters.jsCode+'\n})()', globals(json,context,execution))));
}
function runRows(name, rows, context, execution) {
  const g=globals(rows[0] || {},context,execution);
  g.$input={all:()=>rows.length?rows.map(json=>({json})):[{json:{}}]};
  return JSON.parse(JSON.stringify(vm.runInNewContext('(function(){'+node(workflow,name).parameters.jsCode+'\n})()',g)));
}
function expression(source, json, context, execution) {
  if (typeof source !== 'string' || !source.startsWith('={{')) return source;
  return vm.runInNewContext('('+source.slice(3,-2)+')', globals(json,context,execution));
}
// Translate the exported PostgREST write filters into SQL against this isolated
// fixture. This exercises real unique-index contention and row-lock rechecks;
// it is not a substitute for an n8n/PostgREST staging execution.
function statement(method, address, body) {
  const url = new URL(address), table = url.pathname.split('/').at(-1);
  assert.ok(['reports','report_email_notifications'].includes(table));
  const identifier = key => { assert.match(key, /^[a-z_]+$/); return '"'+key+'"'; };
  const fields = Object.keys(body);
  if (method === 'POST') {
    const conflict = url.searchParams.get('on_conflict');
    assert.equal(conflict,'client_id,report_type,period_start,period_end,report_scope');
    return `insert into ${table} (${fields.map(identifier).join(',')}) values (${fields.map(k=>literal(body[k])).join(',')}) on conflict (${conflict}) do nothing returning id;`;
  }
  assert.equal(method,'PATCH');
  const filters=[];
  for (const [key,value] of url.searchParams) {
    let column;
    if (key === 'stats->report_generation->>owner') column = "stats->'report_generation'->>'owner'";
    else if (key === 'stats->report_generation->>next_period_end') column = "stats->'report_generation'->>'next_period_end'";
    else column = identifier(key);
    if (value === 'is.null') filters.push(`${column} is null`);
    else { assert.ok(value.startsWith('eq.'),value); filters.push(`${column} = ${literal(value.slice(3))}`); }
  }
  assert.ok(filters.length >= 3);
  return `update ${table} set ${fields.map(k=>identifier(k)+'='+literal(body[k])).join(',')} where ${filters.join(' and ')} returning id;`;
}
function nodeWrite(w, name, json, context) {
  const p=node(w,name).parameters;
  const url=new URL(expression(p.url,json,context));
  for (const q of p.queryParameters?.parameters || []) url.searchParams.set(q.name,expression(q.value,json,context));
  return statement(p.method,url.href,expression(p.jsonBody,json,context));
}
function session(input) {
  const child=spawn('docker',args); let output='',errors='',signal;
  const ready=new Promise(resolve=>{signal=resolve;});
  child.stdout.on('data',chunk=>{output+=chunk; if(output.includes('LOCK_HELD'))signal();});
  child.stderr.on('data',chunk=>{errors+=chunk;});
  const done=new Promise((resolve,reject)=>{ child.on('error',reject); child.on('close',code=>{signal();resolve({code,output,errors});}); });
  child.stdin.end(input);return { ready,done };
}
async function race(a,b) {
  const first=session(`begin; set role service_role; ${a} select 'LOCK_HELD'; select pg_sleep(0.2); commit;`);
  await first.ready;
  const second=session('set role service_role; '+b);
  const results=await Promise.all([first.done,second.done]);
  for(const r of results)assert.equal(r.code,0,r.errors);
  assert.match(results[0].output,/\d/);assert.equal(results[1].output.trim(),'');
}
const context={ id:4,client_id:7,branch_id:10,platform_name:'tiktok',report_type:'initial_historical',
  report_scope:'tiktok:branch:10:platform:4',legacy_report_scope:'tiktok:branch:10',period_start:'2026-09-15T10:00:00.000Z',period_end:'2026-10-15T10:00:00.000Z' };
const read = id => JSON.parse(sql(`select row_to_json(r) from reports r where id=${Number(id)};`));
const plan = (saved={},execution='owner-a',scope=context) => run('Evaluate Report Reservation',saved,
  {'Prepare Report Window':scope},execution)[0].json;
const planSQL = p => statement(p.claim_method,p.claim_url,p.claim_body);
function restored(row,scope=context,owner='owner-a') {
  return run('Restore Reserved Context',row,{'Prepare Report Window':scope},owner)[0].json;
}
function saveSQL(row,scope=context,owner='owner-a') {
  const c=restored(row,scope,owner);
  const data={...c,platform_id:scope.id,total_feedback:1,stats:{total_feedback:1,report_generation:c.report_generation}};
  return nodeWrite(workflow,'Upsert Report',data,{});
}
function failureSQL(row,scope=context,owner='owner-a') {
  const c=restored(row,scope,owner);
  return nodeWrite(workflow,'Record Report Failure',{}, {'Restore Reserved Context':c});
}

test('report reservation, retry and Gmail claims on isolated PostgreSQL', { timeout:60000 }, async t=>{
  execFileSync('docker',['run','-d','--name',container,'--network','none','--env','POSTGRES_PASSWORD=synthetic-only','--env','POSTGRES_DB=synthetic','postgres:16-alpine'],{stdio:'pipe'});
  t.after(()=>execFileSync('docker',['rm','-f',container],{stdio:'pipe'}));
  for(let i=0;;i++){try{sql('select 1;');break;}catch(e){if(i===100)throw e;await new Promise(r=>setTimeout(r,100));}}
  // Relevant production metadata supplied by the owner; all data below is fake.
  // Identity generation is a local fixture assumption, not an assertion about
  // unexported production sequence/identity metadata.
  sql(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema private; create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,private,auth to anon,authenticated,service_role;
    create table clients(id bigint primary key,user_id uuid,subscription_status text,trial_ends_at timestamptz,current_period_end timestamptz);
    create table branches(id bigint primary key,client_id bigint references clients(id));
    create table client_platforms(id bigint primary key,client_id bigint references clients(id),branch_id bigint references branches(id));
    create table report_requests(id bigint primary key);
    insert into clients values(7,'00000000-0000-0000-0000-000000000007','trial',now()+interval '1 day',null),
      (8,'00000000-0000-0000-0000-000000000008','active',null,now()+interval '1 month');
    insert into branches values(10,7),(11,7),(20,8);
    insert into client_platforms values(4,7,10),(5,7,11),(6,8,20);
    create table reports(
      id bigint generated by default as identity primary key,
      branch_id bigint references branches(id) on delete cascade,positive_pct numeric not null default 0,
      negative_pct numeric not null default 0,pdf_url text,sent_at timestamp,created_at timestamp not null default now(),
      client_id bigint not null references clients(id) on delete cascade,report_type text not null default 'weekly',
      period_start date not null,period_end date not null,total_feedback integer not null default 0,
      total_sales_opportunities integer not null default 0,total_complaints integer not null default 0,total_needs_reply integer not null default 0,
      platforms text[] not null default array[]::text[],neutral_pct numeric not null default 0,
      stats jsonb not null default '{}',ai_summary jsonb not null default '{}',status text not null default 'pending',
      updated_at timestamptz not null default now(),report_scope text not null default 'google_maps',
      platform_id bigint references client_platforms(id),request_id bigint references report_requests(id) on delete set null,
      constraint reports_status_check check(status in ('pending','processing','completed','failed')),
      constraint reports_report_type_check check(report_type in ('weekly','monthly','custom','initial_historical')),
      constraint reports_period_check check(period_end>=period_start),
      constraint reports_percentages_check check(positive_pct between 0 and 100 and negative_pct between 0 and 100 and neutral_pct between 0 and 100));
    create unique index uq_reports_scope_period on reports(client_id,report_type,period_start,period_end,report_scope);
    alter table reports enable row level security;
    grant select,insert,update on reports to anon,authenticated,service_role;
    grant select on clients to authenticated;
    grant usage,select on all sequences in schema public to authenticated,service_role;
    create policy reports_select_own on reports for select to authenticated using(exists(select 1 from clients c where c.id=reports.client_id and c.user_id=auth.uid()));
    create function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end;$$;
    create trigger reports_set_updated_at before update on reports for each row execute function public.set_updated_at();`);
  sql(fs.readFileSync(path.join(root,'supabase/migrations/20261015120000_weekly_report_notifications.sql'),'utf8'));
  sql(fs.readFileSync(path.join(root,'supabase/migrations/20261016090000_allow_trial_initial_reports.sql'),'utf8'));
  sql(fs.readFileSync(path.join(root,'supabase/migrations/20261016210000_notify_initial_report_completion.sql'),'utf8'));
  let initialId;
  await t.test('simultaneous inserts acquire one row with the existing scope-period index',async()=>{
    await race(planSQL(plan({},'owner-a')),planSQL(plan({},'owner-b')));
    assert.equal(sql('select count(*) from reports;'),'1');
    initialId=Number(sql('select id from reports;'));
    assert.equal(read(initialId).stats.report_generation.owner,'owner-a');
    assert.equal(sql('select count(*) from report_email_notifications;'),'0');
  });
  let firstRow;
  await t.test('a lost reserve response can be read back and cannot transfer ownership',()=>{
    firstRow=read(initialId);
    const p=plan({},'owner-b');
    assert.equal(sql('set role service_role; '+planSQL(p)),'');
    assert.equal(read(initialId).stats.report_generation.owner,'owner-a');
    assert.equal(restored(firstRow).report_id,initialId);
    assert.throws(()=>restored(firstRow,context,'owner-b'),/REPORT_OWNER_MISMATCH/);
  });
  await t.test('report generation failure persists failed without queuing any email',()=>{
    assert.equal(sql('set role service_role; '+failureSQL(firstRow)),String(initialId));
    assert.equal(read(initialId).status,'failed');
    assert.equal(read(initialId).stats.report_generation.error_code,'REPORT_GENERATION_FAILED');
    assert.equal(sql('select count(*) from report_email_notifications;'),'0');
  });
  let retryRow;
  await t.test('two simultaneous retries reuse the same ID and only one gets failed -> processing',async()=>{
    const failed=read(initialId);
    await race(planSQL(plan(failed,'retry-a')),planSQL(plan(failed,'retry-b')));
    assert.equal(sql('select count(*) from reports;'),'1');
    retryRow=read(initialId); assert.equal(retryRow.stats.report_generation.owner,'retry-a');
  });
  await t.test('late original saves and failures cannot overwrite the retry owner',()=>{
    assert.equal(sql('set role service_role; '+saveSQL(firstRow)),'');
    assert.equal(sql('set role service_role; '+failureSQL(firstRow)),'');
    assert.equal(read(initialId).status,'processing');
    assert.equal(sql('set role service_role; '+saveSQL(retryRow,context,'retry-a')),String(initialId));
    assert.equal(read(initialId).status,'completed');
    assert.equal(plan(read(initialId),'later').action,'completed');
    assert.equal(sql(`select count(*) from report_email_notifications where report_id=${initialId};`),'1');
    sql(`update reports set status='completed' where id=${initialId};`);
    assert.equal(sql(`select count(*) from report_email_notifications where report_id=${initialId};`),'1');
  });
  await t.test('27 repeated completion events do not insert or replace the completed initial report',()=>{
    for(let i=0;i<27;i++)assert.equal(sql('set role service_role; '+planSQL(plan({},'repeat-'+i))),'');
    assert.equal(sql('select count(*) from reports;'),'1');
    assert.equal(read(initialId).stats.report_generation.owner,'retry-a');
  });
  let weeklyId,weeklyRow;
  const weeklyScope={...context,report_type:'weekly',period_start:context.period_end,period_end:'2026-10-22T10:00:00.000Z'};
  await t.test('weekly completion queues one notification, and duplicate saves never create another',()=>{
    weeklyId=Number(sql('set role service_role; '+planSQL(plan({},'owner-a',weeklyScope))));
    weeklyRow=read(weeklyId);
    const statement=saveSQL(weeklyRow,weeklyScope);
    assert.equal(sql('set role service_role; '+statement),String(weeklyId));
    // Saving can succeed while its HTTP response is lost: the failure handler
    // must not downgrade that completed report or discard its pending email.
    assert.equal(sql('set role service_role; '+failureSQL(weeklyRow,weeklyScope)),'');
    assert.equal(read(weeklyId).status,'completed');
    assert.equal(sql('set role service_role; '+statement),'');
    sql(`update reports set status='completed' where id=${weeklyId};`);
    assert.equal(sql(`select count(*) from report_email_notifications where report_id=${weeklyId};`),'1');
  });
  let job;
  await t.test('concurrent Gmail senders acquire one pending notification only',async()=>{
    job=JSON.parse(sql(`select row_to_json(n) from report_email_notifications n where report_id=${weeklyId};`));
    const statement=nodeWrite(sender,'Claim Notification',job,{'Read Saved Report':read(weeklyId)});
    await race(statement,statement);
    assert.equal(sql(`select status from report_email_notifications where report_id=${weeklyId};`),'sending');
  });
  await t.test('ambiguous or sent Gmail receipt is retained and repeated report completion cannot resend',()=>{
    const claim=nodeWrite(sender,'Claim Notification',job,{'Read Saved Report':read(weeklyId)});
    for(const status of ['unknown','sent']){
      sql(`update report_email_notifications set status='${status}' where report_id=${weeklyId};
        update reports set status='completed' where id=${weeklyId};`);
      assert.equal(sql('set role service_role; '+claim),'');
      assert.equal(sql(`select count(*) from report_email_notifications where report_id=${weeklyId};`),'1');
      assert.equal(sql(`select status from report_email_notifications where report_id=${weeklyId};`),status);
    }
  });
  await t.test('other tenant and branch scopes can reserve independently without sharing records',()=>{
    for(const scope of [{...context,client_id:8,id:6,branch_id:20,report_scope:'tiktok:branch:20:platform:6'},
      {...context,id:5,branch_id:11,report_scope:'tiktok:branch:11:platform:5'}]){
      assert.match(sql('set role service_role; '+planSQL(plan({},'separate',scope))),/^\d+$/);
    }
    assert.equal(sql('select count(*) from reports;'),'4');
  });
  await t.test('RLS preserves trial completed-only isolation and denies direct report writes',()=>{
    const auth="set request.jwt.claim.sub='00000000-0000-0000-0000-000000000007';set role authenticated;";
    assert.equal(sql(auth+"select count(*) from reports where client_id=8;"),'0');
    assert.equal(sql(auth+"select count(*) from reports where status<>'completed';"),'0');
    const before=sql(`select stats::text from reports where id=${initialId};`);
    assert.equal(sql(auth+`update reports set stats='{}' where id=${initialId} returning id;`),'');
    assert.equal(sql(`select stats::text from reports where id=${initialId};`),before);
    assert.throws(()=>sql(auth+planSQL(plan({},'client'))),e=>/row-level security/.test(String(e.stderr)));
    assert.equal(sql('set role anon;select count(*) from reports;'),'0');
    assert.equal(sql("select count(*) from information_schema.columns where table_name='reports' and column_name in ('generation_key','generation_owner');"),'0');
  });
  let anchor,slot11,slot12,firstHour,secondHour,firstJob;
  const base='tiktok:branch:11:platform:7';
  const hour=h=>`2026-10-15T${String(h).padStart(2,'0')}:00:00.000Z`;
  const initialScope={...context,id:7,branch_id:11,base_report_scope:base,legacy_report_scope:'tiktok:branch:11',
    report_scope:base+':window:20261015T100000000Z',link_report_start:context.period_start,link_report_end:context.period_end};
  const history=()=>JSON.parse(sql('select coalesce(json_agg(r order by id),\'[]\') from reports r where platform_id=7;'));
  const resolve=(targetEnd,rows=history())=>runRows('Resolve Platform Report Period',rows,
    {'Loop Platform Reports':{...initialScope,report_type:'weekly',period_start:hour(10),period_end:targetEnd}})[0].json;
  const window=(resolved,row)=>run('Prepare Report Window',row,{'Resolve Platform Report Period':resolved})[0].json;
  const reserveWindow=p=>nodeWrite(workflow,'Reserve Next Report Window',p,{});
  const coverage=()=>runRows('Check Client Report Completion',history(),{
    'Determine Report Period':{id:7,report_type:'weekly',period_start:hour(10),period_end:hour(12)},
    'Attach Report Context':[{...initialScope,report_type:'weekly',period_start:hour(10),period_end:hour(12)}],
  })[0].json;
  await t.test('different concurrent requested cutoffs reserve one successor on a precise predecessor',async()=>{
    sql('insert into client_platforms values(7,7,11);');
    const id=Number(sql('set role service_role; '+planSQL(plan({},'owner-a',initialScope))));
    sql('set role service_role; '+saveSQL(read(id),initialScope));anchor=read(id);
    const a=resolve(hour(11)),b=resolve(hour(12));
    await race(reserveWindow(a),reserveWindow(b));
    anchor=read(id);
    assert.equal(anchor.stats.report_generation.next_period_end,hour(11));
    slot11=window(a,anchor);const recovered=window(b,anchor);
    assert.equal(slot11.period_end,hour(11));assert.equal(recovered.period_end,hour(11));
    assert.equal(slot11.report_scope,recovered.report_scope);
    // The initial completion queued one email; reserving the next window must not add another.
    assert.equal(sql(`select count(*) from report_email_notifications where report_id=${id};`),'1');
  });
  await t.test('same frozen hourly window still permits just one concurrent report insert',async()=>{
    await race(planSQL(plan({},'hour-one-a',slot11)),planSQL(plan({},'hour-one-b',slot11)));
    const id=Number(sql("select id from reports where platform_id=7 and report_type='weekly';"));
    firstHour=read(id);assert.equal(firstHour.stats.report_generation.owner,'hour-one-a');
    sql('set role service_role; '+saveSQL(firstHour,slot11,'hour-one-a'));
    firstHour=read(id);
    assert.equal(firstHour.stats.report_generation.period_start,hour(10));
    assert.equal(firstHour.stats.report_generation.period_end,hour(11));
    assert.equal(sql('select count(*) from reports where platform_id=7;'),'2');
    assert.equal(coverage().all_reports_ready,false);
    assert.equal(coverage().report_period_end,null);
    firstJob=JSON.parse(sql(`select row_to_json(n) from report_email_notifications n where report_id=${id};`));
    sql(`update report_email_notifications set status='sent' where report_id=${id};`);
  });
  await t.test('next hour reserves from exact previous endpoint without resetting its sent email',()=>{
    const p=resolve(hour(12));
    assert.equal(p.period_start,hour(11));assert.equal(p.report_anchor.id,firstHour.id);
    sql('set role service_role; '+reserveWindow(p));
    slot12=window(p,read(firstHour.id));
    assert.equal(slot12.period_start,hour(11));assert.equal(slot12.period_end,hour(12));
    assert.notEqual(slot12.report_scope,slot11.report_scope);
    assert.equal(sql(`select count(*) from report_email_notifications where report_id=${firstHour.id};`),'1');
    assert.equal(sql(`select status from report_email_notifications where report_id=${firstHour.id};`),'sent');
  });
  await t.test('two same-day reports persist distinct exact periods with one notification per report',async()=>{
    await race(planSQL(plan({},'hour-two-a',slot12)),planSQL(plan({},'hour-two-b',slot12)));
    const id=Number(sql("select max(id) from reports where platform_id=7;"));
    secondHour=read(id);
    sql('set role service_role; '+saveSQL(secondHour,slot12,'hour-two-a'));secondHour=read(id);
    assert.equal(secondHour.period_start,firstHour.period_start);
    assert.equal(secondHour.period_end,firstHour.period_end);
    assert.equal(firstHour.stats.report_generation.period_end,secondHour.stats.report_generation.period_start);
    assert.equal(sql('select count(*) from reports where platform_id=7;'),'3');
    assert.equal(sql(`select count(*) from report_email_notifications where report_id in (${firstHour.id},${secondHour.id});`),'2');
    assert.equal(coverage().all_reports_ready,true);
    assert.equal(coverage().report_period_end,hour(12));
  });
  await t.test('stale predecessor cannot allocate a different overlapping window or repeat the first email',()=>{
    const stale=resolve(hour(12),[{...anchor,stats:{...anchor.stats,report_generation:{...anchor.stats.report_generation,next_period_end:undefined}}}]);
    assert.equal(sql('set role service_role; '+reserveWindow(stale)),'');
    const recovered=window(stale,read(anchor.id));
    assert.equal(recovered.period_end,hour(11));
    assert.equal(sql('set role service_role; '+planSQL(plan({},'late-writer',recovered))),'');
    assert.equal(sql(`select status from report_email_notifications where report_id=${firstHour.id};`),'sent');
    const receipt=nodeWrite(sender,'Claim Notification',firstJob,{'Read Saved Report':read(firstHour.id)});
    assert.equal(sql('set role service_role; '+receipt),'');
  });
  await t.test('date-only legacy reports and their email states remain untouched when coverage is uncertain',()=>{
    sql("insert into client_platforms values(8,7,11);insert into reports(client_id,platform_id,branch_id,report_type,status,period_start,period_end,report_scope) values(7,8,11,'weekly','completed','2026-10-15','2026-10-15','tiktok:branch:11');");
    const old=JSON.parse(sql('select row_to_json(r) from reports r where platform_id=8;'));
    const before=sql(`select row_to_json(r)::text from reports r where id=${old.id};`);
    const notice=sql(`select row_to_json(n)::text from report_email_notifications n where report_id=${old.id};`);
    const scope={...initialScope,id:8,report_type:'weekly',base_report_scope:'tiktok:branch:11:platform:8',period_start:hour(10),period_end:hour(12)};
    assert.throws(()=>runRows('Resolve Platform Report Period',[old],{'Loop Platform Reports':scope}),/REPORT_LEGACY_COVERAGE_REVIEW_REQUIRED/);
    assert.equal(sql(`select row_to_json(r)::text from reports r where id=${old.id};`),before);
    assert.equal(sql(`select row_to_json(n)::text from report_email_notifications n where report_id=${old.id};`),notice);
  });
});
