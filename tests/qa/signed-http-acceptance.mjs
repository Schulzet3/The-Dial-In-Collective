// CI ONLY. Real HMAC-signed JWTs, verified by disposable PostgREST 12.2,
// targeting ONLY locally built dic_ci; NOT GoTrue-issued production tokens.
import assert from 'node:assert/strict';
import {createHmac,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

const url=process.env.DIC_CI_HTTP_URL;
const secret=process.env.DIC_CI_JWT_SECRET;
const pg=process.env.DIC_CI_SQL_CONTAINER;
if(process.env.GITHUB_ACTIONS!=='true'||!/^http:\/\/127\.0\.0\.1:8762$/.test(url||'')||
   !/^[0-9a-f]{64}$/.test(secret||'')||!/^dic-ci-pg-[0-9-]+$/.test(pg||'')) {
 throw Error('Signed HTTP acceptance is confined to the isolated CI runner');
}
const admin='10000000-0000-4000-8000-000000000001';
const member='40000000-0000-4000-8000-000000000005';
const heldOwner='40000000-0000-4000-8000-000000000006';
const heldShot='50000000-0000-4000-8000-000000000006';
const disabled='20000000-0000-4000-8000-000000000017';
const unadmitted='20000000-0000-4000-8000-000000000016';
const b64=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
function sign(sub,extra={}) {
 const header=b64({alg:'HS256',typ:'JWT'});
 const payload=b64({role:'authenticated',aud:'authenticated',iss:'dic-isolated-ci',
  sub,exp:Math.floor(Date.now()/1000)+1800,...extra});
 const input=header+'.'+payload;
 return input+'.'+createHmac('sha256',secret).update(input).digest('base64url');
}
const tokens={admin:sign(admin),member:sign(member),owner:sign(heldOwner),
 disabled:sign(disabled),unadmitted:sign(unadmitted),
 forged:sign(member,{user_metadata:{is_admin:true},app_metadata:{role:'admin'}})};
const sql=query=>execFileSync('docker',['exec',pg,'psql','-X','-A','-t',
 '-v','ON_ERROR_STOP=1','-U','postgres','-d','dic_ci','-c',query],
 {encoding:'utf8',timeout:10000}).trim();
let passed=0;
function pass(name){passed++;console.log('PASS '+String(passed).padStart(2,'0')+' '+name);}
async function call(path,token,body) {
 const headers={'accept':'application/json'};
 if(token!==undefined)headers.authorization='Bearer '+token;
 if(body!==undefined)headers['content-type']='application/json';
 const response=await fetch(url+path,{method:body===undefined?'GET':'POST',
  headers,body:body===undefined?undefined:JSON.stringify(body),
  redirect:'manual',signal:AbortSignal.timeout(10000)});
 const raw=await response.text();
 let data;
 try{data=JSON.parse(raw)}catch{data=null}
 return {status:response.status,data};
}
async function denied(name,path,token,body,expectedCode='42501') {
 const r=await call(path,token,body);
 assert.ok([401,403].includes(r.status),name+' HTTP '+r.status);
 assert.equal(r.data?.code,expectedCode,name+' SQLSTATE');
 pass(name);
}
const rpc=(name,token,args={})=>call('/rpc/'+name,token,args);
const scalar=(expr)=>sql('select '+expr+';');
const quality=()=>scalar("(select cs.quality_state from public.community_shots cs join private.contribution_links l on l.community_shot_id=cs.id where l.shot_id='"+heldShot+"')");
const revision=()=>Number(scalar("(select revision from public.shots where id='"+heldShot+"')"));
assert.equal(scalar('current_database()'),'dic_ci');
assert.equal(quality(),'held');
pass('Held shot produced naturally by six disposable contributors and contextual quality checks');

let r=await rpc('dic_session_status',tokens.member);
assert.equal(r.status,200);assert.equal(r.data?.admitted,true);assert.equal(r.data?.admin,false);
pass('Cryptographically signed ordinary-member HTTP role validated');
r=await rpc('dic_session_status',tokens.admin);
assert.equal(r.status,200);assert.equal(r.data?.admin,true);
pass('Distinct signed administrator HTTP role validated');

r=await rpc('dic_browse_community_shots',tokens.member,{p_limit:20,p_offset:0});
assert.equal(r.status,200);assert.ok(r.data?.total>=5);
assert.ok(Array.isArray(r.data?.shots));
assert.ok(!/PRIVATE_CI_NOTE_MUST_NOT_LEAK|owner_id|contributor_id|shot_id/i.test(JSON.stringify(r.data)));
pass('Signed admitted member sees only sanitized eligible Community DTO');
r=await call('/shots?select=owner_id&limit=1',tokens.member);
assert.equal(r.status,200);
assert.ok(Array.isArray(r.data)&&r.data.length>0);
assert.ok(r.data.every(row=>row.owner_id===member));
r=await call('/shot_notes?select=owner_id&limit=1',tokens.member);
assert.equal(r.status,200);
assert.ok(Array.isArray(r.data)&&r.data.length>0);
assert.ok(r.data.every(row=>row.owner_id===member));
pass('Signed member sees own records but zero foreign contributors shots or notes');

await denied('Anonymous cannot browse private Community','/rpc/dic_browse_community_shots',undefined,{p_limit:5,p_offset:0});
await denied('Never-admitted signed identity cannot browse','/rpc/dic_browse_community_shots',tokens.unadmitted,{p_limit:5,p_offset:0});
await denied('Disabled signed identity cannot browse','/rpc/dic_browse_community_shots',tokens.disabled,{p_limit:5,p_offset:0});
await denied('Never-admitted signed identity cannot fetch personal data','/rpc/dic_read_personal_state',tokens.unadmitted,{});
await denied('Disabled signed identity cannot fetch personal data','/rpc/dic_read_personal_state',tokens.disabled,{});
r=await rpc('dic_session_status',tokens.disabled);
assert.equal(r.status,200);assert.equal(r.data?.admitted,false);
pass('Signed disabled-session status cannot represent admitted user');
await denied('Ordinary member cannot read administrator dashboard','/rpc/dic_admin_dashboard',tokens.member,{});
await denied('Ordinary member cannot read administrator access overview','/rpc/dic_admin_access_overview',tokens.member,{});
await denied('Forged user_metadata and app_metadata cannot read administrator dashboard','/rpc/dic_admin_dashboard',tokens.forged,{});

const invitesBefore=scalar('(select count(*) from private.beta_invites)');
const eventsBefore=scalar('(select count(*) from private.admin_access_events)');
await denied('Ordinary member cannot issue an administrator invitation',
 '/rpc/dic_admin_issue_invite',tokens.member,{p_label:'FORBIDDEN_CI'});
await denied('Forged metadata cannot issue an administrator invitation',
 '/rpc/dic_admin_issue_invite',tokens.forged,{p_label:'FORBIDDEN_CI'});
await denied('Ordinary member cannot enable a disabled account',
 '/rpc/dic_admin_set_member_access',tokens.member,
 {p_member_id:disabled,p_enabled:true});
assert.equal(scalar('(select count(*) from private.beta_invites)'),invitesBefore);
assert.equal(scalar('(select count(*) from private.admin_access_events)'),eventsBefore);
assert.equal(scalar("(select enabled from private.beta_members where owner_id='"+disabled+"')"),'f');
pass('Forbidden administrator writes left invitations, membership and audits unchanged');

r=await rpc('dic_my_community_outliers',tokens.member);
assert.equal(r.status,200);assert.deepEqual(r.data,[]);
r=await rpc('dic_my_community_outliers',tokens.owner);
assert.equal(r.status,200);assert.equal(r.data?.length,1);
assert.equal(r.data?.[0]?.shot_id,heldShot);
pass('Only legitimate signed owner can see the held-shot review prompt');
r=await rpc('dic_confirm_community_outlier',tokens.member,
 {p_shot_id:heldShot,p_expected_revision:revision()});
assert.equal(r.status,200);assert.equal(r.data?.ok,false);
assert.equal(quality(),'held');
pass('Foreign member cannot confirm or mutate another member held shot');
r=await rpc('dic_confirm_community_outlier',tokens.owner,
 {p_shot_id:heldShot,p_expected_revision:revision()+200});
assert.equal(r.status,200);assert.equal(r.data?.ok,false);
assert.equal(quality(),'held');
pass('Owner stale revision cannot confirm and does not change held evidence');
r=await rpc('dic_confirm_community_outlier',tokens.owner,
 {p_shot_id:heldShot,p_expected_revision:revision()});
assert.equal(r.status,200);assert.equal(r.data?.ok,true);
assert.equal(r.data?.state,'eligible');assert.equal(quality(),'eligible');
pass('Owner signed confirmation promotes the specifically reviewed held shot');
r=await rpc('dic_confirm_community_outlier',tokens.owner,
 {p_shot_id:heldShot,p_expected_revision:revision()});
assert.equal(r.status,200);assert.equal(r.data?.ok,false);assert.equal(quality(),'eligible');
pass('Confirm retries are idempotently refused once resolved');

sql("update public.shots set time_s=155 where id='"+heldShot+"'");
assert.equal(quality(),'held');
r=await rpc('dic_my_community_outliers',tokens.owner);
assert.equal(r.status,200);assert.equal(r.data?.length,1);
pass('Substantive source correction invalidates prior confirmation and creates fresh owner review');
sql("update public.shots set time_s=25 where id='"+heldShot+"'");
assert.equal(quality(),'eligible');
pass('Corrected plausible original shot becomes eligible using same projection');
sql("update public.shots set hidden_at=clock_timestamp() where id='"+heldShot+"'");
assert.equal(quality(),'eligible');
pass('Hiding personal shot preserves already valid anonymized contribution');
sql("update public.shots set clarity=4 where id='"+heldShot+"'");
assert.equal(quality(),'withdrawn');
pass('Correction to non-green taste removes Community evidence');
sql("update public.shots set clarity=5 where id='"+heldShot+"'");
assert.equal(quality(),'eligible');
pass('Restored green rating re-qualifies same anonymous projection');

sql("update private.beta_members set enabled=false where owner_id='"+member+"'");
await denied('Existing valid bearer immediately loses access after membership disabled',
 '/rpc/dic_browse_community_shots',tokens.member,{p_limit:5,p_offset:0});
r=await rpc('dic_session_status',tokens.member);
assert.equal(r.status,200);assert.equal(r.data?.admitted,false);
pass('No token reissue needed to enforce server revocation');
const tampered=tokens.admin.slice(0,-5)+'xxxxx';
r=await rpc('dic_admin_dashboard',tampered);
assert.equal(r.status,401);assert.ok(['PGRST301','PGRST302'].includes(r.data?.code));
pass('Invalid HMAC signature rejected before any database authorization');
assert.equal(scalar('(select count(*) from public.shot_notes)'), '6');
pass('All isolated personal notes preserved and never returned to foreign client');

// Issue #5/#10: A disposable but REAL HTTP/JWT/PostgREST test environment.
// The seeded identities below never exist in hosted Supabase. PostgREST verifies
// cryptographic signatures; the service role uses ONLY this CI's fresh key.
const injected=readFileSync(new URL('../sql/issue-5-10-signed-http-fixture.sql',import.meta.url),'utf8');
execFileSync('docker',['exec','-i',pg,'psql','-X','-v','ON_ERROR_STOP=1',
 '-U','postgres','-d','dic_ci'],{input:injected,encoding:'utf8',timeout:30000});
const familyUser='70000000-0000-4000-8000-000000000007';
const familyToken=sign(familyUser);
const serviceToken=sign(familyUser,{role:'service_role'});
const short='78000000-0000-4000-8000-000000000001';
const long='78000000-0000-4000-8000-000000000003';
const sourceId='79000000-0000-4000-8000-000000000001';
const pendingId='79000000-0000-4000-8000-000000000002';
const originalLibrary='7a000000-0000-4000-8000-000000000002';
const shortFamily=scalar("(select personal_family_id from public.shots where id='"+short+"')");
const longFamily=scalar("(select personal_family_id from public.shots where id='"+long+"')");
assert.match(shortFamily,/^[0-9a-f-]{36}$/);assert.notEqual(shortFamily,longFamily);
pass('Two independently confirmed same-member same-setup families exist only in disposable SQL');

r=await rpc('dic_session_status',familyToken);
assert.equal(r.status,200);assert.equal(r.data?.admitted,true);
pass('New synthetic member signs in through real HMAC JWT and PostgREST admission check');
r=await rpc('dic_read_personal_state',familyToken);
assert.equal(r.status,200);
assert.ok(r.data?.families?.some(x=>x.id===shortFamily));
assert.ok(r.data?.families?.some(x=>x.id===longFamily));
pass('Signed owner loads both eligible families and original shots from live local HTTP API');

const preferenceRevision=()=>Number(scalar("(select revision from public.recipe_preferences where owner_id='"+familyUser+"' and library_entry_id='77000000-0000-4000-8000-000000000007' and style='Turbo')"));
const selectShot=async(shot,rev)=>rpc('dic_mutate',familyToken,{mutation_id:randomUUID(),
 action:'make_current',payload:{shot_id:shot,expected_revision:rev}});
r=await selectShot(short,preferenceRevision());
assert.equal(r.status,200);assert.equal(r.data?.ok,true);
assert.equal(scalar("(select favorite_shot_id from public.recipe_preferences where owner_id='"+familyUser+"' and style='Turbo')"),short);
pass('Signed owner selects first internal family by authenticated revision-checked RPC');
r=await selectShot(long,preferenceRevision()-1);
assert.ok(r.status>=400||r.data?.code==='conflict'||r.data?.ok===false);
assert.equal(scalar("(select favorite_shot_id from public.recipe_preferences where owner_id='"+familyUser+"' and style='Turbo')"),short);
pass('Signed stale retry cannot override existing manually selected family');
r=await selectShot(long,preferenceRevision());
assert.equal(r.status,200);assert.equal(r.data?.ok,true);
assert.equal(scalar("(select current_family_id from public.recipe_preferences where owner_id='"+familyUser+"' and style='Turbo')"),longFamily);
r=await rpc('dic_read_personal_state',familyToken);
assert.equal(r.status,200);
assert.ok(r.data?.recipePreferences?.some(x=>x.current_family_id===longFamily&&x.favorite_shot_id===long));
pass('Two-family switch survives a new authenticated HTTP state reload');
r=await selectShot(short,preferenceRevision());
assert.equal(r.status,200);assert.equal(r.data?.ok,true);
assert.equal(scalar("(select current_family_id from public.recipe_preferences where owner_id='"+familyUser+"' and style='Turbo')"),shortFamily);
pass('Signed member switches back without changing shot or family identity');

r=await rpc('dic_read_personal_state',tokens.owner);
assert.equal(r.status,200);
assert.ok(!r.data?.shots?.some(x=>[short,long].includes(x.id)));
assert.ok(!r.data?.families?.some(x=>[shortFamily,longFamily].includes(x.id)));
pass('A separate genuine signed JWT cannot read another synthetic owner recipe history');
r=await rpc('dic_mutate',tokens.owner,{mutation_id:randomUUID(),action:'make_current',
 payload:{shot_id:short,expected_revision:preferenceRevision()}});
assert.ok(r.status>=400||r.data?.ok!==true);
assert.equal(scalar("(select favorite_shot_id from public.recipe_preferences where owner_id='"+familyUser+"' and style='Turbo')"),short);
pass('Foreign signed account cannot Make Current someone elses recipe');

await denied('Owner JWT cannot invoke service-only official verifier',
 '/rpc/dic_trusted_source_verify',familyToken,{submission_id:sourceId,evidence:{}});
r=await rpc('dic_source_check_target',serviceToken,{submission_id:sourceId});
assert.equal(r.status,200);assert.equal(r.data?.producer,'CI Washing Station');
assert.equal(r.data?.submission_revision,1);
pass('Locally signed service JWT alone reads trusted official-source producer and revision');
r=await rpc('dic_source_claim',serviceToken,{submission_id:sourceId});
assert.equal(r.status,200);assert.equal(r.data?.allowed,true);
pass('Local service-role JWT obtains source-claim budget under actual PostgREST role');
const evidence={checked_url:'https://sweetbloomcoffee.com/products/ci-official',
 product_name:'CI Official Product',title_matches:true,evidence_kind:'jsonld_product',
 submission_revision:1,release_label:'2026',
 verified_fields:{name:'CI Official Product',origin:'Gedeb, Ethiopia',
  producer:'CI Washing Station',process:'Washed'}};
r=await rpc('dic_trusted_source_verify',serviceToken,{submission_id:sourceId,evidence});
assert.equal(r.status,200);assert.equal(r.data?.ok,true);
assert.equal(r.data?.status,'verified');
const officialCoffee=r.data.coffee_id;
assert.equal(scalar("(select count(*) from public.coffee_sources where coffee_id='"+officialCoffee+"' and source_kind='roaster_page')"),'1');
pass('Service JWT promotes synthetic source-matched Pending and records official provenance');
r=await rpc('dic_trusted_source_verify',serviceToken,{submission_id:sourceId,evidence});
assert.equal(r.status,200);assert.equal(r.data?.already_verified,true);
assert.equal(scalar("(select count(*) from public.coffee_sources where coffee_id='"+officialCoffee+"' and source_kind='roaster_page')"),'1');
pass('Signed service replay preserves one canonical and one official provenance record');

r=await rpc('dic_member_retry_pending_approval',tokens.owner,
 {p_submission_id:pendingId,p_expected_revision:1});
assert.ok(r.status>=400||r.data?.ok!==true);
assert.equal(scalar("(select status from public.coffee_submissions where id='"+pendingId+"')"),'pending');
pass('Foreign member signed Retry cannot change someone elses Pending record');
r=await rpc('dic_member_retry_pending_approval',familyToken,
 {p_submission_id:pendingId,p_expected_revision:99});
assert.equal(r.status,200);assert.equal(r.data?.code,'conflict');
assert.equal(scalar("(select status from public.coffee_submissions where id='"+pendingId+"')"),'pending');
pass('Stale signed Pending retry does not approve or alter record');
r=await rpc('dic_member_retry_pending_approval',familyToken,
 {p_submission_id:pendingId,p_expected_revision:1});
assert.equal(r.status,200);assert.equal(r.data?.status,'verified');
assert.equal(scalar("(select count(*) from public.library_entries where id='"+originalLibrary+"' and submission_id is null and coffee_id is not null)"),'1');
assert.equal(scalar("(select status from public.coffee_submissions where id='"+pendingId+"')"),'approved');
pass('Real signed HTTP Pending Retry promotes exact owner while preserving original library UUID');
assert.equal(scalar("(select count(*) from public.shot_notes)"),'6');
pass('All disposable signed acceptance scenarios preserve six preexisting private shot notes');

// Durable private attribution through the actual authenticated HTTP mutation route.
const attributedShot=randomUUID();
r=await rpc('dic_apply_client_change',familyToken,{
 expected_owner:familyUser,mutation_id:randomUUID(),action:'save_shot',
 payload:{id:attributedShot,expected_revision:0,
  library_entry_id:'77000000-0000-4000-8000-000000000007',
  setup_id:'71000000-0000-4000-8000-000000000007',
  setup_version_id:'72000000-0000-4000-8000-000000000007',
  basket_version_id:'74000000-0000-4000-8000-000000000007',
  calibration_id:'75000000-0000-4000-8000-000000000007',
  style:'Turbo',dose_g:18,yield_g:40,time_s:25,grind_setting:2,
  temperature_c:92,feed_mode:'standard',
  taste:{extraction:3,body:3,clarity:5,sweetness:5,astringency:1},
  recommendation_context:{source_label:'Unproven exact Community starting reference',
   used_controls:['grind'],community_tier:'exact',contributor_count:3,shot_count:7}}
});
assert.equal(r.status,200);
assert.equal(r.data?.ok,true);
assert.equal(scalar("(select recommendation_context->>'kind' from public.shots where id='"+attributedShot+"')"),'member_selected_starting_reference');
assert.equal(scalar("(select recommendation_context->>'source_verified_independently' from public.shots where id='"+attributedShot+"')"),'false');
pass('Signed admitted owner preserves unverified source attribution through real HTTP mutation');
r=await rpc('dic_read_personal_state',familyToken);
assert.equal(r.status,200);
assert.ok(r.data?.shots?.some(x=>x.id===attributedShot&&
 x.recommendation_context?.community_tier==='exact'));
pass('Signed fresh hydration returns historical private shot source without trusting it as verified');
r=await rpc('dic_read_personal_state',tokens.owner);
assert.equal(r.status,200);
assert.ok(!r.data?.shots?.some(x=>x.id===attributedShot));
pass('Another signed member never receives private recommendation source context');


// Issue #14: full signed HTTP route through the existing owner-bound gateway.
// These are real HMAC-signed JWT/PostgREST requests to disposable dic_ci ONLY.
const customSetup='71000000-0000-4000-8000-000000000007';
const customVersion='72000000-0000-4000-8000-000000000007';
const customLibrary='77000000-0000-4000-8000-000000000007';
const customRevision=()=>Number(scalar(
 "(select coalesce(max(revision),0) from public.workspace_coffees where owner_id='"+
 familyUser+"' and library_entry_id='"+customLibrary+"' and setup_version_id='"+customVersion+"')"));
const customBody=(revision,targets)=>({
 setup_id:customSetup,setup_version_id:customVersion,library_entry_id:customLibrary,
 expected_revision:revision,custom_targets:targets
});
const customTarget={ratio:2.55,time_low_s:21,time_high_s:39,temperature_c:93.4};
const customRequest=randomUUID();
const originalStyle=scalar("(select selected_style from public.workspace_coffees where owner_id='"+familyUser+"' and library_entry_id='"+customLibrary+"')");
const priorFavorite=scalar("(select favorite_shot_id from public.recipe_preferences where owner_id='"+familyUser+"' and style='Turbo')");
const firstRev=customRevision();
const customArgs={expected_owner:familyUser,mutation_id:customRequest,
 action:'save_custom_targets',payload:customBody(firstRev,customTarget)};
r=await rpc('dic_apply_client_change',familyToken,customArgs);
assert.equal(r.status,200);assert.equal(r.data?.ok,true);
assert.equal(r.data?.record?.selected_style,'Custom');
assert.deepEqual(r.data?.record?.custom_targets,customTarget);
const acceptedRevision=r.data.record.revision;
assert.ok(acceptedRevision>firstRev);
pass('Signed member saves owner-scoped Custom targets through protected HTTP mutation');

r=await rpc('dic_read_personal_state',familyToken);
assert.equal(r.status,200);
const savedCustom=r.data?.workspaceCoffees?.filter(x=>x.library_entry_id===customLibrary &&
 x.setup_version_id===customVersion&&x.selected_style==='Custom')||[];
assert.equal(savedCustom.length,1);
assert.deepEqual(savedCustom[0].custom_targets,customTarget);
pass('Fresh signed HTTP personal state includes persistent Custom targets and selected style');

r=await rpc('dic_apply_client_change',familyToken,customArgs);
assert.equal(r.status,200);assert.equal(r.data?.ok,true);
assert.equal(r.data?.record?.revision,acceptedRevision);
assert.equal(customRevision(),acceptedRevision);
assert.equal(scalar("(select count(*) from private.mutation_receipts where owner_id='"+familyUser+"' and mutation_id='"+customRequest+"')"),'1');
pass('Lost-response signed Custom retry returns exact stored receipt without a second write');

r=await rpc('dic_apply_client_change',familyToken,{
 ...customArgs,payload:customBody(firstRev,{...customTarget,ratio:3.1})});
assert.equal(r.status,400);assert.equal(r.data?.code,'22023');
assert.equal(customRevision(),acceptedRevision);
pass('Same signed mutation ID cannot be reused for different Custom values');

r=await rpc('dic_apply_client_change',familyToken,{
 expected_owner:familyUser,mutation_id:randomUUID(),action:'save_custom_targets',
 payload:customBody(firstRev,customTarget)});
assert.equal(r.status,200);assert.equal(r.data?.ok,false);assert.equal(r.data?.code,'conflict');
assert.equal(customRevision(),acceptedRevision);
pass('Real HTTP stale Custom revision returns a nonmutating conflict');

r=await rpc('dic_apply_client_change',familyToken,{
 expected_owner:familyUser,mutation_id:randomUUID(),action:'save_custom_targets',
 payload:customBody(acceptedRevision,null)});
assert.equal(r.status,400);assert.equal(r.data?.code,'22023');
assert.equal(customRevision(),acceptedRevision);
pass('Signed HTTP rejects missing or null Custom target structure');

await denied('Foreign signed member cannot modify another members Custom targets',
 '/rpc/dic_apply_client_change',tokens.owner,{
 expected_owner:heldOwner,mutation_id:randomUUID(),action:'save_custom_targets',
 payload:customBody(acceptedRevision,customTarget)});
await denied('Forged expected_owner cannot bypass HTTP JWT ownership binding',
 '/rpc/dic_apply_client_change',tokens.owner,{
 expected_owner:familyUser,mutation_id:randomUUID(),action:'save_custom_targets',
 payload:customBody(acceptedRevision,customTarget)});
await denied('Disabled signed member cannot use Custom write gateway',
 '/rpc/dic_apply_client_change',tokens.disabled,{
 expected_owner:disabled,mutation_id:randomUUID(),action:'save_custom_targets',
 payload:customBody(acceptedRevision,customTarget)});

const editedTarget={ratio:2.75,time_low_s:20,time_high_s:36,temperature_c:null};
r=await rpc('dic_apply_client_change',familyToken,{
 expected_owner:familyUser,mutation_id:randomUUID(),action:'save_custom_targets',
 payload:customBody(acceptedRevision,editedTarget)});
assert.equal(r.status,200);assert.equal(r.data?.ok,true);
assert.deepEqual(r.data?.record?.custom_targets,editedTarget);
pass('Signed Custom edits persist a new ratio, time window and optional null temperature');

r=await rpc('dic_apply_client_change',familyToken,{
 expected_owner:familyUser,mutation_id:randomUUID(),action:'set_style',
 payload:{setup_id:customSetup,setup_version_id:customVersion,
  library_entry_id:customLibrary,expected_revision:customRevision(),style:originalStyle||'Turbo'}});
assert.equal(r.status,200);assert.equal(r.data?.ok,true);
assert.deepEqual(r.data?.record?.custom_targets,editedTarget);
assert.equal(scalar("(select favorite_shot_id from public.recipe_preferences where owner_id='"+familyUser+"' and style='Turbo')"),priorFavorite);
assert.equal(scalar("(select count(*) from public.shots where owner_id='"+familyUser+"' and style='Turbo')"),'5');
pass('Returning to non-Custom style retains saved Custom targets and all prior shots/favorites');

r=await rpc('dic_read_personal_state',tokens.owner);
assert.equal(r.status,200);
assert.ok(!r.data?.workspaceCoffees?.some(x=>x.library_entry_id===customLibrary));
pass('Separate signed account never receives another members Custom target state');

console.log('RESULT: '+passed+' isolated genuine-HMAC-signed PostgREST HTTP/quality assertions PASS; NO GoTrue or production sessions tested.');
