// Issue #1756. HMAC-signed real PostgREST and disposable local dic_ci only.
// No GoTrue-issued production tokens, real accounts, or hosted deletes.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

export async function signupApprovalSecurityAcceptance({rpc,sql,scalar,sign,pass,denied,adminToken,memberToken,pg}) {
 assert.equal(scalar('current_database()'),'dic_ci');
 assert.match(pg,/^dic-ci-pg-[0-9-]+$/);
 const [verified,unverified,rejected,raced]=Array.from({length:4},()=>randomUUID());
 const authIds=[verified,unverified,rejected,raced];
 const values=authIds.map((id,i)=>"('"+id+"','authenticated','authenticated','"+
   id+"@ci.example.invalid',"+(i===1?'null':'now()')+")").join(',');
 const history=()=>scalar("(select md5(coalesce(jsonb_agg(to_jsonb(s) order by s.id)::text,'')) from public.shots s)")+
  scalar("(select md5(coalesce(jsonb_agg(to_jsonb(n) order by n.shot_id)::text,'')) from public.shot_notes n)");
 const originalHistory=history();
 sql("insert into auth.users(id,aud,role,email,email_confirmed_at) values "+values);
 assert.equal(scalar("(select count(*) from private.beta_members where owner_id in ('"+authIds.join("','")+
 "') and enabled=false and admitted_at is null and signup_review_state='pending')"),'4');
 pass('Four new verified/unverified synthetic Auth signups remain pending with admission denied');
 for(const id of [verified,unverified,rejected,raced]){
  const status=await rpc('dic_session_status',sign(id));
  assert.equal(status.status,200);
  assert.equal(status.data?.admitted,false);
  assert.equal(status.data?.approvalState,'pending');
  assert.equal(status.data?.emailVerified,id!==unverified);
  await denied('Signed pending signup cannot read protected personal state',
   '/rpc/dic_read_personal_state',sign(id),{});
 }
 await denied('Ordinary admitted member cannot enumerate signup applications',
  '/rpc/dic_admin_signup_requests',memberToken,{p_offset:0,p_limit:50});
 await denied('Pending identity cannot enumerate signup applications',
  '/rpc/dic_admin_signup_requests',sign(verified),{p_offset:0,p_limit:50});
 await denied('Ordinary member cannot approve pending signup',
  '/rpc/dic_admin_review_signup',memberToken,{p_member_id:verified,p_action:'approve',p_expected_state:'pending'});
 await denied('Pending identity cannot self-approve',
  '/rpc/dic_admin_review_signup',sign(verified),{p_member_id:verified,p_action:'approve',p_expected_state:'pending'});
 let r=await rpc('dic_admin_signup_requests',adminToken,{p_offset:0,p_limit:50});
 assert.equal(r.status,200);
 assert.ok(r.data?.total>=4);
 assert.ok(authIds.every(id=>r.data.items?.some(row=>row.id===id)));
 assert.equal(r.data.items.find(row=>row.id===unverified)?.email_verified,false);
 pass('Real signed administrator reads verified and unverified pending-only applications');
 const countEvents=()=>Number(scalar("(select count(*) from private.dic_signup_review_events where member_id in ('"+
  authIds.join("','")+"'))"));
 const initial=countEvents();
 r=await rpc('dic_admin_review_signup',adminToken,{p_member_id:unverified,p_action:'approve',p_expected_state:'pending'});
 assert.equal(r.status,200);
 assert.equal(r.data?.code,'verify_email_first');
 assert.equal(countEvents(),initial);
 assert.equal(scalar("(select enabled from private.beta_members where owner_id='"+unverified+"')"),'f');
 pass('Admin cannot admit an unverified email and no review audit event is created');
 r=await rpc('dic_admin_review_signup',adminToken,{p_member_id:verified,p_action:'approve',p_expected_state:'pending'});
 assert.equal(r.status,200);
 assert.equal(r.data?.decision,'approve');
 assert.equal(scalar("(select admitted_at is not null and enabled from private.beta_members where owner_id='"+verified+"')"),'t');
 const accepted=await rpc('dic_session_status',sign(verified));
 assert.equal(accepted.status,200);
 assert.equal(accepted.data?.admitted,true);
 assert.equal(accepted.data?.approvalState,'approved');
 const privateStatus=await rpc('dic_read_personal_state',sign(verified));
 assert.equal(privateStatus.status,200);
 pass('Explicit Admin approval enables verified applicant through signed authenticated RPC');
 const auditedAfterApprove=countEvents();
 r=await rpc('dic_admin_review_signup',adminToken,{p_member_id:verified,p_action:'approve',p_expected_state:'pending'});
 assert.equal(r.status,200);
 assert.equal(r.data?.ok,false);
 assert.equal(r.data?.code,'stale_review');
 assert.equal(countEvents(),auditedAfterApprove);
 pass('Repeated Admin approval never creates an extra event or changes membership');
 // NULL is not an optional wildcard for the expected-state CAS. An admin
 // must never resurrect a rejected account by passing NULL as expected state.
 const rejectedAuditBefore=countEvents();
 r=await rpc('dic_admin_review_signup',adminToken,
  {p_member_id:unverified,p_action:'approve',p_expected_state:null});
 assert.ok(r.status>=400||r.data?.ok!==true);
 assert.equal(scalar("(select signup_review_state from private.beta_members where owner_id='"+unverified+"')"),'pending');
 assert.equal(countEvents(),rejectedAuditBefore);
 r=await rpc('dic_admin_review_signup',adminToken,
  {p_member_id:unverified,p_action:null,p_expected_state:'pending'});
 assert.ok(r.status>=400||r.data?.ok!==true);
 assert.equal(countEvents(),rejectedAuditBefore);
 pass('NULL expected state or action cannot bypass mandatory pending compare-and-set');
 r=await rpc('dic_admin_review_signup',adminToken,{p_member_id:rejected,p_action:'reject',p_expected_state:'pending'});
 assert.equal(r.status,200);
 assert.equal(r.data?.decision,'reject');
 const declined=await rpc('dic_session_status',sign(rejected));
 assert.equal(declined.status,200);
 assert.equal(declined.data?.admitted,false);
 assert.equal(declined.data?.approvalState,'rejected');
 assert.equal(scalar("(select count(*) from auth.users where id='"+rejected+"')"),'1');
 await denied('Rejected account remains barred from all personal data',
  '/rpc/dic_read_personal_state',sign(rejected),{});
 r=await rpc('dic_admin_set_member_access',adminToken,{p_member_id:rejected,p_enabled:true});
 assert.ok(r.status>=400||r.data?.ok!==true);
 assert.equal(scalar("(select enabled from private.beta_members where owner_id='"+rejected+"')"),'f');
 pass('Reject preserves Auth identity and cannot be bypassed by legacy Restore Access');
 // Two concurrent independently signed requests target one unlocked pending row.
 // The authoritative row lock serializes decisions, leaving one stale result.
 const racing=await Promise.all(['approve','reject'].map(p_action=>
  rpc('dic_admin_review_signup',adminToken,{p_member_id:raced,p_action,p_expected_state:'pending'})));
 assert.ok(racing.every(x=>x.status===200));
 assert.equal(racing.filter(x=>x.data?.ok===true).length,1);
 assert.equal(racing.filter(x=>x.data?.code==='stale_review').length,1);
 assert.equal(Number(scalar("(select count(*) from private.dic_signup_review_events where member_id='"+raced+"')")),1);
 pass('Parallel Admin Approve/Reject race serializes to one committed decision and one stale retry');
 r=await rpc('dic_admin_review_signup',adminToken,{p_member_id:'10000000-0000-4000-8000-000000000001',p_action:'reject',p_expected_state:'pending'});
 assert.ok(r.status>=400||r.data?.ok!==true);
 pass('Protected administrator cannot reject their own permanent account');
 const old=await rpc('dic_admin_issue_invite',adminToken,{p_label:'OBSOLETE'});
 assert.equal(old.status,404);
 assert.equal(scalar("(select to_regclass('private.beta_invites') is null)"),'t');
 assert.equal(scalar("(select to_regprocedure('public.dic_redeem_invite(text)') is null)"),'t');
 assert.equal(scalar("(select count(*) from auth.users where id in ('"+authIds.join("','")+"'))"),'4');
 assert.equal(history(),originalHistory);
 pass('Legacy invite route/table absent; four Auth identities and every original private shot/note preserved');
}
