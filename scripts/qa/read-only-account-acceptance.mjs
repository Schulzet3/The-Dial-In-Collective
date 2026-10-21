// OWNER-RUN CONSOLE HELPER. No app bundle imports this file.
// Copy this entire file into DevTools on https://app.dialincollective.com/.
// Session secrets stay inside this closure. Only the redacted report is printed.
async function runReadOnlyAccountAcceptance(env, loadConfig) {
 const origin='https://app.dialincollective.com';
 const project='https://azviqqejypsefzilgonr.supabase.co';
 if(env.location.origin!==origin)throw new Error('WRONG_ORIGIN');
 const expectedRole=env.prompt('Expected account role: admin or member','admin');
 if(!['admin','member'].includes(expectedRole))throw new Error('CANCELLED');
 const config=(await loadConfig()).CLOUD_CONFIG;
 if(config?.supabaseUrl?.replace(/\/$/,'')!==project||!config.publishableKey)throw new Error('WRONG_PROJECT');
 const session=JSON.parse(env.localStorage.getItem('dic_cloud_auth_v1')||'null');
 if(!session?.access_token||!session.user?.id||session.expires_at*1000<=Date.now()+60000)throw new Error('SIGN_IN_OR_REFRESH_FIRST');
 const uid=session.user.id;
 const ownerTables=['account_preferences','bags','basket_versions','baskets','coffee_submissions','experiments','grinder_calibrations','library_entries','personal_recipe_families','recipe_preferences','setup_preferences','setup_versions','setups','shot_notes','shots','workspace_coffees','workspace_state'];
 const getRPCs=['dic_browse_community_shots','dic_my_community_outliers','dic_admin_dashboard','dic_admin_access_overview'];
 // These two VOLATILE public wrappers were inspected on production; both only
 // SELECT from STABLE, read-only private helpers. No other POST is permitted.
 const readPostRPCs=['dic_session_status','dic_read_personal_state'];
 const checks=[];
 const report={version:2,started_at:new Date().toISOString(),expected_role:expectedRole,reviewed_source:'e7e16e5e13b35a6f4b6aa81db5b09b93b1aefc60',checks,unverified:['administrator mutation RPC denials (no mutation endpoint invoked)','genuine disabled/nonadmitted account sessions','held-shot confirmation/correction/retry/hide/version-conflict lifecycle','cross-account timing/races and persistent offline cache isolation','all canonical releases beyond currently returned eligible rows','current production source must be independently checked against reviewed_source']};
 function add(name,pass,r,extra={}){checks.push({name,result:pass?'PASS':'FAIL',http_status:r?.status??null,error_class:r?.code??null,...extra});}
 async function request(path,{mode='member',method='GET'}={}){
  const url=new URL(path,project);
  const route=url.pathname;
  const rpc=route.startsWith('/rest/v1/rpc/')?route.slice('/rest/v1/rpc/'.length):null;
  const table=route.startsWith('/rest/v1/')?route.slice('/rest/v1/'.length):null;
  const allowed=method==='GET'?(route==='/auth/v1/user'||getRPCs.includes(rpc)||ownerTables.includes(table)||table==='community_shots'):(method==='POST'&&readPostRPCs.includes(rpc)&&!url.search);
  if(url.origin!==project||!allowed)throw new Error('REQUEST_NOT_ALLOWLISTED');
  const headers={apikey:config.publishableKey};
  if(mode==='member')headers.Authorization='Bearer '+session.access_token;
  else if(mode==='invalid')headers.Authorization='Bearer dic-invalid-nonsecret-test';
  if(method==='POST')headers['Content-Type']='application/json';
  try{
   const response=await env.fetch(url.href,{method,headers,...(method==='POST'?{body:'{}'}:{}),credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',signal:env.AbortSignal.timeout(15000)});
   let data=null;try{data=await response.json();}catch{/* No raw error bodies. */}
   const code=['42501','PGRST301','PGRST302','PGRST303','PGRST106','PGRST202','PGRST205','PGRST000'].includes(data?.code)?data.code:null;
   return {status:response.status,ok:response.ok,data,code};
  }catch{return {status:null,ok:false,data:null,code:'TRANSPORT_ERROR'};}
 }
 const denied=r=>[401,403].includes(r.status)&&r.code==='42501';
 const identity=await request('/auth/v1/user');
 add('server_validated_current_identity',identity.ok&&identity.data?.id===uid,identity);
 if(checks.at(-1).result!=='PASS')return report;
 const status=await request('/rest/v1/rpc/dic_session_status',{method:'POST'});
 const roleOK=status.ok&&status.data?.authenticated===true&&status.data?.admitted===true&&status.data?.emailVerified===true&&status.data?.admin===(expectedRole==='admin');
 add('expected_admitted_role',roleOK,status);
 if(!roleOK)return report;
 const state=await request('/rest/v1/rpc/dic_read_personal_state',{method:'POST'});
 const arrays=['setups','versions','setupPreferences','calibrations','baskets','basketVersions','library','submissions','workspaces','workspaceCoffees','shots','notes','families','recipePreferences','experiments'];
 const validState=state.ok&&arrays.every(k=>Array.isArray(state.data?.[k]));
 const stateOwned=validState&&arrays.every(k=>state.data[k].every(row=>row?.owner_id===uid))&&(!state.data.preferences||state.data.preferences.owner_id===uid);
 add('personal_state_only_current_owner',stateOwned,state,{schema_present:validState});
 for(const table of ownerTables){
  const r=await request('/rest/v1/'+table+'?'+new URLSearchParams({select:'owner_id',owner_id:'neq.'+uid,limit:'1'}));
  if(table==='coffee_submissions'&&expectedRole==='admin'){
   // This is intentionally NOT an owner-only table for admitted administrators.
   // Source: 20261009192735_dic_coffee_catalog.sql submission_read policy;
   // security_foundation.sql #38 explicitly requires cross-owner admin review.
   // Record this as outside owner-isolation scope, never an isolation PASS.
   const valid=r.ok&&Array.isArray(r.data)&&r.data.length<=1&&r.data.every(row=>typeof row?.owner_id==='string'&&row.owner_id!==uid);
   add('foreign_owner_read:'+table,valid,r,{result:valid?'NOT_APPLICABLE':'FAIL',outcome:valid?'ADMIN_REVIEW_ACCESS':'UNEXPECTED_RESPONSE',observed_rows:Array.isArray(r.data)?r.data.length:null});
   continue;
  }
  const empty=r.ok&&Array.isArray(r.data)&&r.data.length===0;
  const blocked=denied(r);
  add('foreign_owner_read:'+table,empty||blocked,r,{outcome:empty?'NO_FOREIGN_ROW':blocked?'ACCESS_DENIED':'UNEXPECTED_RESPONSE',observed_rows:Array.isArray(r.data)?r.data.length:null});
 }
 const topKeys=['shots','total','offset','page_size'];
 const fields=['coffee_name','roaster','release_key','release_label','release_origin','release_process','release_producer','release_variety','release_roast_level','style','observed_on','dose_g','yield_g','ratio','time_s','extraction','body','clarity','sweetness','astringency','shot_count','contributor_count'];
 const browse=await request('/rest/v1/rpc/dic_browse_community_shots?p_limit=40&p_offset=0');
 const rows=browse.data?.shots;
 const scalar=v=>v===null||['string','number','boolean'].includes(typeof v);
 const dtoOK=browse.ok&&Array.isArray(rows)&&Object.keys(browse.data).every(k=>topKeys.includes(k))&&topKeys.every(k=>Object.hasOwn(browse.data,k))&&rows.every(row=>row&&fields.every(k=>Object.hasOwn(row,k))&&Object.keys(row).every(k=>fields.includes(k))&&Object.values(row).every(scalar)&&/^[a-f0-9]{64}$/.test(row.release_key));
 add('community_exact_sanitized_schema',dtoOK,browse,{observed_rows:Array.isArray(rows)?rows.length:null});
 const rawUUID=/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;
 const email=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
 add('community_no_raw_uuid_email_or_nested_payload',dtoOK&&!rawUUID.test(JSON.stringify(rows))&&!email.test(JSON.stringify(rows)),browse);
 if(Array.isArray(rows)&&rows.length===0)report.unverified.push('positive Community payload content: no eligible row returned');
 const held=await request('/rest/v1/rpc/dic_my_community_outliers');
 const ownShotIds=new Set(validState?state.data.shots.map(row=>row.id):[]);
 add('held_reviews_only_own_known_shots',held.ok&&Array.isArray(held.data)&&held.data.every(row=>ownShotIds.has(row.shot_id)),held,{observed_rows:Array.isArray(held.data)?held.data.length:null});
 if(Array.isArray(held.data)&&held.data.length===0)report.unverified.push('positive held-review ownership case: no held row returned');
 for(const name of ['dic_admin_dashboard','dic_admin_access_overview']){
  const r=await request('/rest/v1/rpc/'+name);
  const shape=name==='dic_admin_dashboard'?r.data?.review_only===true&&typeof r.data?.counts==='object':Array.isArray(r.data?.members)&&Array.isArray(r.data?.invites);
  add('admin_read_authorization:'+name,expectedRole==='admin'?r.ok&&shape:denied(r),r);
 }
 const raw=await request('/rest/v1/community_shots?select=id&limit=1');
 add('direct_community_table_denied',denied(raw),raw);
 for(const name of ['dic_browse_community_shots','dic_my_community_outliers','dic_admin_dashboard','dic_admin_access_overview','dic_read_personal_state']){
  const r=await request('/rest/v1/rpc/'+name,{mode:'anonymous',method:readPostRPCs.includes(name)?'POST':'GET'});
  add('anonymous_denied:'+name,denied(r),r);
 }
 const invalid=await request('/rest/v1/rpc/dic_browse_community_shots',{mode:'invalid'});
 add('invalid_bearer_rejected',invalid.status===401,invalid);
 // Verify account continuity at the end; do not print either identity.
 const finalIdentity=await request('/auth/v1/user');
 const currentSession=JSON.parse(env.localStorage.getItem('dic_cloud_auth_v1')||'null');
 add('identity_unchanged_through_run',finalIdentity.ok&&finalIdentity.data?.id===uid&&currentSession?.user?.id===uid,finalIdentity);
 report.finished_at=new Date().toISOString();
 report.summary={passed:checks.filter(x=>x.result==='PASS').length,failed:checks.filter(x=>x.result==='FAIL').length,not_applicable:checks.filter(x=>x.result==='NOT_APPLICABLE').length,acceptance:'PARTIAL_READ_ONLY_EVIDENCE_ONLY'};
 return report;
}

// BROWSER ENTRY: intentionally no token, ID, email, payload, or raw error output.
void runReadOnlyAccountAcceptance(globalThis,()=>import('/cloud/config.js')).then(
 report=>console.log(JSON.stringify(report,null,2)),
 ()=>console.error('Read-only acceptance stopped without a report. Check the app origin, sign in/refresh normally, and enter admin or member. Do not share raw console/session data.')
);
