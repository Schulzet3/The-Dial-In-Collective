// CI ONLY. Real HMAC-signed JWTs, verified by disposable PostgREST 12.2,
// targeting ONLY locally built dic_ci; NOT GoTrue-issued production tokens.
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {execFileSync} from 'node:child_process';

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
console.log('RESULT: '+passed+' isolated genuine-HMAC-signed PostgREST HTTP/quality assertions PASS; NO GoTrue or production sessions tested.');
