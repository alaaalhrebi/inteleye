// Synthetic database rows and React renders only. Never connects to Supabase or n8n.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const root=path.resolve(__dirname,'..'),now=Date.parse('2026-10-17T06:00:00Z');
class Clock extends Date{constructor(...args){super(...(args.length?args:[now]))}static now(){return now}}
function load(file,mocks={}){
 const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,Date:Clock,URL,URLSearchParams,console:{error(){},warn(){}},fetch:()=>assert.fail('unexpected network'),require(name){
  if(Object.hasOwn(mocks,name))return mocks[name];
  if(name.startsWith('@/')){const base='src/'+name.slice(2);return load(fs.existsSync(path.join(root,base+'.ts'))?base+'.ts':base+'.tsx',mocks)}
  return require(name);
 }},{filename:file});return module.exports;
}
const analytics=load('src/lib/dashboard-analytics.ts');
const range=analytics.getDashboardPeriodRange('this_week'),last=analytics.getDashboardPeriodRange('last_week');
const inRange=r=>new Date(r.start.getTime()+3600000).toISOString();
const day=s=>s.slice(0,10);
const client={id:7,user_id:'synthetic-user',name:'Synthetic Customer',plan:'pro',subscription_status:'active',current_period_end:'2026-11-17',next_report_at:'2026-10-23T12:00:00Z'};
const branches=[{id:1,client_id:7,name:'فرع ألف',status:'active'},{id:2,client_id:7,name:'فرع باء',status:'active'},{id:88,client_id:8,name:'FOREIGN BRANCH',status:'active'}];
const platforms=[{id:10,client_id:7,branch_id:1,platform_name:'google_maps',is_active:true,connection_status:'connected'},
 {id:11,client_id:7,branch_id:2,platform_name:'tiktok',is_active:true,connection_status:'connected'},
 {id:12,client_id:7,branch_id:null,platform_name:'x',is_active:true,connection_status:'connected'},
 {id:13,client_id:7,branch_id:1,platform_name:'instagram',is_active:true,connection_status:'connected'},
 {id:88,client_id:8,branch_id:88,platform_name:'google_maps',is_active:true,connection_status:'connected'}];
const feedback=[];
for(const [period,r]of [['current',range],['previous',last]])for(const p of platforms){
 feedback.push({client_id:p.client_id,source_record_id:feedback.length+1,source_table:'synthetic_comments',platform_id:p.id,branch_id:p.branch_id,platform_name:p.platform_name,published_at:inRange(r),
  feedback_text:`${period}-${p.platform_name}-${p.id}`,rating:p.id===10?2:5,sentiment:p.id===10?'negative':'positive',severity:p.id===10?'high':'low',needs_reply:p.id===10,is_complaint:p.id===10,is_sales_opportunity:false,category:[period+'-topic'],analysis_status:'completed'});
}
const reports=[];
for(const [period,r]of [['current',range],['previous',last]])for(const p of platforms){
 reports.push({id:reports.length+1,client_id:p.client_id,platform_id:p.id,branch_id:p.branch_id,report_type:'weekly',status:'completed',created_at:inRange(r),period_start:day(r.start.toISOString()),period_end:day(r.end.toISOString()),
  ai_summary:{recommendations:[{title:'RECOMMENDATION-'+period+'-'+p.id,text:'Advice '+period+' '+p.id}]},stats:{}});
}
reports.push({...reports[0],id:99,created_at:range.end.toISOString(),period_start:day(last.start.toISOString()),period_end:day(range.end.toISOString()),ai_summary:{recommendations:['OUTSIDE-PERIOD-ADVICE']}});
const alerts=feedback.map(row=>({id:row.source_record_id,client_id:row.client_id,branch_id:row.branch_id,platform_id:row.platform_id,status:'new',title:'ALERT-'+row.feedback_text,source_table:row.source_table,source_record_id:row.source_record_id,created_at:row.published_at,priority:'high'}));
function database(patch={},errors={}){
 const rows={clients:[client],branches,client_platforms:platforms,unified_feedback:feedback,reports,alerts,tiktok_videos:[{client_id:7,branch_id:2,platform_id:11,published_at:inRange(range),play_count:55,digg_count:3,comment_count:5,share_count:2}],...patch};
 const calls=[];
 return {calls,auth:{getUser:async()=>({data:{user:{id:client.user_id}}})},from(table){
  const filters=[];const call={table,filters,select:null};calls.push(call);let limit=Infinity,ordering;
  const value=()=>{let data=(rows[table]||[]).filter(row=>filters.every(([op,k,v])=>{
   if(op==='eq')return row[k]===v;
   if(op==='in')return v.includes(row[k]);
   if(op==='gte')return String(row[k])>=String(v);
   if(op==='lte')return String(row[k])<=String(v);
   if(op==='or'&&k.startsWith('branch_id.eq.'))return row.branch_id===Number(k.match(/eq\.(\d+)/)[1])||row.branch_id==null;
   if(op==='or'&&k.startsWith('analysis_status'))return row.analysis_status==null||['pending','processing'].includes(row.analysis_status);
   throw new Error('unexpected operation '+op+' '+k);
  }));
  if(ordering)data=[...data].sort((a,b)=>String(a[ordering[0]]).localeCompare(String(b[ordering[0]]))*(ordering[1]?1:-1));
  return data.slice(0,limit)};
  const result=()=>({data:errors[table]?null:value(),error:errors[table]?{message:'PRIVATE DATABASE ERROR'}:null});
  const q={select(s){call.select=s;return this},eq(k,v){filters.push(['eq',k,v]);return this},in(k,v){filters.push(['in',k,Array.from(v)]);return this},
   gte(k,v){filters.push(['gte',k,v]);return this},lte(k,v){filters.push(['lte',k,v]);return this},or(v){filters.push(['or',v]);return this},
   limit(v){limit=v;return this},order(k,o){ordering=[k,o?.ascending!==false];return this},
   async maybeSingle(){const r=result();return {...r,data:r.data?.[0]??null}},async range(a,b){const r=result();return {...r,data:r.data?.slice(a,b+1)??null}},
   then(resolve){return Promise.resolve(result()).then(resolve)}};return q;
 }};
}
async function render(params={},patch={},errors={}){
 const db=database(patch,errors),captured={};
 const page=load('src/app/dashboard/page.tsx',{
  '@/lib/supabase-server':{createSupabaseServerClient:()=>db},
  'next/navigation':{redirect(url){throw new Error('unexpected redirect '+url)}},
  '@/components/dashboard/DashboardFilters':{default:props=>{captured.filters=props;return null}},
  '@/components/dashboard/DashboardSidebar':{default:props=>{captured.sidebar=props;return null}},
  '@/components/dashboard/ReportProcessingStatus':{default:props=>{captured.progress=props;return null}},
  '@/components/dashboard/InteractiveDashboard':{default:props=>{captured.dashboard=props;return React.createElement('div',null,props.priorityContent)}},
  '@/components/dashboard/LogoutButton':{default:()=>null},'@/components/dashboard/PrintDashboardButton':{default:()=>null},
 }).default;
 const element=await page({searchParams:params});const html=renderToStaticMarkup(element);
 return {db,captured,html,element};
}
for(const [label,params,wanted]of [
 ['default',{},[10,11,12,13]],['branch one',{branch:'1'},[10,12,13]],['branch two',{branch:'2'},[11,12]],
 ['Google',{platform:'10'},[10]],['TikTok',{platform:'11'},[11]],['X',{platform:'12'},[12]],['Instagram',{platform:'13'},[13]],
 ['branch and platform',{branch:'1',platform:'10'},[10]],['account-level link',{branch:'2',platform:'12'},[12]],
 ['conflicting branch/platform',{branch:'1',platform:'11'},[10,12,13]],['forged ownership',{branch:'88',platform:'88'},[10,11,12,13]],
])test(`dashboard ${label} consistently scopes current data and comparison`,async()=>{
 const {captured,db}=await render(params);const p=captured.dashboard;
 assert.deepEqual(Array.from(p.feedback,r=>r.platform_id).sort(),[...wanted].sort());
 assert.deepEqual(Array.from(p.comparisonFeedback,r=>r.platform_id).sort(),[...wanted].sort());
 assert.ok(p.feedback.every(r=>r.feedback_text.startsWith('current-')));
 assert.ok(p.comparisonFeedback.every(r=>r.feedback_text.startsWith('previous-')));
 assert.equal(captured.sidebar.currentPlatformsCount,4); // Account quotas are not display filters.
 for(const call of db.calls.filter(c=>c.table!=='clients'))assert.ok(call.filters.some(([op,k,v])=>op==='eq'&&k==='client_id'&&v===7));
 assert.ok(!JSON.stringify(captured).includes('FOREIGN BRANCH'));
 if(label==='conflicting branch/platform')assert.equal(captured.filters.appliedScope.platformId,null);
});
for(const period of ['this_week','last_week','this_month','last_60_days','last_90_days','last_180_days'])test(`period ${period} scopes feedback, comparison and recommendation reads`,async()=>{
 const {captured,db}=await render({period,platform:'10'});const range=analytics.getDashboardPeriodRange(period);
 assert.equal(captured.dashboard.periodStart,range.start.toISOString());assert.equal(captured.dashboard.periodEnd,range.end.toISOString());
 const current=db.calls.filter(c=>c.table==='unified_feedback'&&c.select.includes('feedback_text'));
 assert.equal(current.length,2);
 assert.ok(current[0].filters.some(([op,k,v])=>op==='gte'&&k==='published_at'&&v===range.start.toISOString()));
 assert.ok(current[1].filters.some(([op,k,v])=>op==='gte'&&k==='published_at'&&v===range.comparisonStart.toISOString()));
 const reportCall=db.calls.find(c=>c.table==='reports'&&c.select.includes('ai_summary'));
 assert.ok(reportCall.filters.some(([op,k,v])=>op==='gte'&&k==='period_start'&&v===day(range.start.toISOString())));
 assert.ok(reportCall.filters.some(([op,k,v])=>op==='lte'&&k==='period_end'&&v===day(range.end.toISOString())));
});
test('smart alerts only display matching comments inside the selected branch/platform/period',async()=>{
 const {html}=await render({branch:'1',platform:'10',period:'last_week'});
 assert.match(html,/ALERT-previous-google_maps-10/);
 assert.doesNotMatch(html,/ALERT-current-|ALERT-previous-tiktok|FOREIGN/);
});
test('priorities never fall back to advice outside the display period',async()=>{
 const current=await render({platform:'10'},{unified_feedback:[]});
 assert.match(current.html,/RECOMMENDATION-current-10/);assert.doesNotMatch(current.html,/RECOMMENDATION-previous|OUTSIDE-PERIOD/);
 const previous=await render({platform:'10',period:'last_week'},{unified_feedback:[]});
 assert.match(previous.html,/RECOMMENDATION-previous-10/);assert.doesNotMatch(previous.html,/RECOMMENDATION-current|OUTSIDE-PERIOD/);
});
test('TikTok metrics read the selected period and platform',async()=>{
 const current=await render({platform:'11',branch:'2'});assert.equal(current.captured.dashboard.tiktokMetrics.playCount,55);
 const previous=await render({platform:'11',branch:'2',period:'last_week'});assert.equal(previous.captured.dashboard.tiktokMetrics.playCount,0);
 const google=await render({platform:'10'});assert.equal(google.db.calls.some(c=>c.table==='tiktok_videos'),false);
});
test('platform health follows the branch/platform selection while subscription counters remain account-wide',async()=>{
 const selected=await render({branch:'1',platform:'10'});
 assert.match(selected.html,/Google Maps/);assert.doesNotMatch(selected.html,/TikTok|Instagram/);
 assert.equal(selected.captured.sidebar.currentPlatformsCount,4);
});
test('a global scope change resets internal chart/comment filters without resetting on normal refresh',async()=>{
 const a=await render({branch:'1',platform:'10'}),b=await render({branch:'1',platform:'10',period:'last_week'}),c=await render({branch:'1',platform:'10'});
 const find=node=>{if(!node||typeof node!=='object')return; if(node.props?.clientName&&node.props?.feedback)return node;for(const child of React.Children.toArray(node.props?.children)){const match=find(child);if(match)return match}};
 assert.notEqual(find(a.element).key,find(b.element).key);assert.equal(find(a.element).key,find(c.element).key);
});
test('essential data failure does not fabricate empty analytics or a successful refresh',async()=>{
 const {captured,html}=await render({platform:'10'},{},{unified_feedback:true});
 assert.equal(captured.filters.hasError,true);assert.equal(captured.dashboard,undefined);
 assert.match(html,/تعذر تحميل بيانات الفترة أو بيانات المقارنة/);assert.doesNotMatch(html,/PRIVATE DATABASE ERROR|لا توجد حالات حرجة/);
});
test('alert failure is distinguished from no alerts and hides raw errors',async()=>{
 const {captured,html}=await render({platform:'10'},{},{alerts:true});
 assert.equal(captured.filters.hasError,true);assert.match(html,/تعذر تحميل التنبيهات/);
 assert.doesNotMatch(html,/لا توجد تنبيهات مفتوحة|PRIVATE DATABASE ERROR/);
});
for(const table of ['client_platforms','branches'])test(`${table} failure shows recovery instead of redirecting or broadening the filter scope`,async()=>{
 const {captured,html}=await render({branch:'1',platform:'10'},{},{[table]:true});
 assert.equal(captured.dashboard,undefined);assert.match(html,/تعذر تحميل بيانات حسابك الآن/);assert.doesNotMatch(html,/PRIVATE DATABASE ERROR/);
});
test('sidebar retains account navigation and quota controls with no duplicate filter inputs',()=>{
 const sidebar=load('src/components/dashboard/DashboardSidebar.tsx').default;
 const html=renderToStaticMarkup(React.createElement(sidebar,{canManagePlatformLinks:true,currentPlatformsCount:2,platformLimit:4,canManageBranches:true,canAccessCustomReports:true}));
 assert.doesNotMatch(html,/<select/);for(const href of ['/onboarding/platforms','/dashboard/replies','/dashboard/reports','/dashboard/branches','/dashboard/platforms','/dashboard/settings'])assert.ok(html.includes(href));
});
test('toolbar shows committed server scope, not a URL whose data has not arrived',()=>{
 const component=load('src/components/dashboard/DashboardFilters.tsx',{'next/navigation':{useRouter:()=>({push(){}}),useSearchParams:()=>new URLSearchParams('branch=2&platform=11&period=this_month')}}).default;
 const html=renderToStaticMarkup(React.createElement(component,{branches:branches.filter(b=>b.client_id===7),platforms:platforms.filter(p=>p.client_id===7),appliedScope:{branchId:1,platformId:10,period:'last_week'}}));
 assert.match(html,/تخصيص عرض لوحة التحكم/);assert.match(html,/تتغير النتائج تلقائيًا حسب اختيارك/);
 assert.match(html,/فرع ألف · Google Maps · الأسبوع الماضي/);assert.match(html,/إعادة ضبط/);
 assert.equal((html.match(/<select/g)||[]).length,3);assert.match(html,/for="dashboard-filter-branch"/);
 assert.doesNotMatch(html,/تم تحديث|بنجاح/);
});
test('filter failure UI offers retry without a success claim or diagnostic leak',()=>{
 const component=load('src/components/dashboard/DashboardFilters.tsx',{'next/navigation':{useRouter:()=>({push(){}}),useSearchParams:()=>new URLSearchParams()}}).default;
 const html=renderToStaticMarkup(React.createElement(component,{branches:[],platforms:[],appliedScope:{branchId:null,platformId:null,period:'this_week'},hasError:true}));
 assert.match(html,/النطاق المطلوب/);assert.match(html,/النتائج المتاحة قد تكون غير مكتملة/);assert.match(html,/إعادة المحاولة/);assert.doesNotMatch(html,/تم تحديث|بنجاح/);
});
test('route error boundary displays safe recovery without raw server errors',()=>{
 const component=load('src/app/dashboard/error.tsx').default;
 const html=renderToStaticMarkup(React.createElement(component,{error:new Error('PRIVATE SERVER ERROR'),reset(){}}));
 assert.match(html,/تعذر تحديث لوحة التحكم/);assert.match(html,/إعادة المحاولة/);assert.doesNotMatch(html,/PRIVATE SERVER ERROR/);
});
