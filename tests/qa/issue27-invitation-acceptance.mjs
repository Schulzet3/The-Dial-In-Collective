// Disposable PostgreSQL/PostgREST only. No hosted credentials or real invitations.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

export async function invitationSecurityAcceptance({rpc,sql,scalar,sign,pass,denied,adminToken,pg}) {
 assert.equal(scalar('current_database()'),'dic_ci');
 assert.match(pg,/^dic-ci-pg-[0-9-]+$/);
 const identities=Array.from({length:4},()=>randomUUID());
 const [first,second,unverified,unused]=identities;
 sql(`insert into auth.users(id,aud,role,email,email_confirmed_at) values ${identities.map(id=>
  `('${id}','authenticated','authenticated','${id}@ci.example.invalid',${id===unverified?'null':'now()'})`).join(',')}`);
 const snapshot=()=>scalar("(select md5(coalesce(jsonb_agg(to_jsonb(s) order by s.id)::text,'')) from public.shots s)")+
  scalar("(select md5(coalesce(jsonb_agg(to_jsonb(n) order by n.shot_id)::text,'')) from public.shot_notes n)");
 const historyBefore=snapshot();
 const issue=async()=>{
  const r=await rpc('dic_admin_issue_invite',adminToken,{p_label:'Disposable Issue27 acceptance'});
  assert.equal(r.status,200);assert.equal(r.data?.ok,true);
  assert.match(r.data.invite_code,/^dic-[a-f0-9]{64}$/);
  return r.data;
 };
 const code=await issue();
 assert.equal(scalar(`(select expires_at is null and max_uses=1 and uses=0 from private.beta_invites where id='${code.id}')`),'t');
 pass('Issued invitation is single-use with no calendar expiration');
 // Prove age alone cannot expire an otherwise unused code.
 sql(`update private.beta_invites set created_at=now()-interval '20 years' where id='${code.id}'`);
 let r=await rpc('dic_redeem_invite',sign(unverified),{token:code.invite_code});
 assert.equal(r.status,200);assert.equal(r.data?.ok,false);assert.equal(r.data?.code,'verify_email');
 assert.equal(scalar(`(select uses from private.beta_invites where id='${code.id}')`),'0');
 await denied('Anonymous invitation redemption rejected before admission','/rpc/dic_redeem_invite',undefined,{token:code.invite_code});
 pass('Unconfirmed email cannot consume or redeem a valid invitation');
 r=await rpc('dic_admin_access_overview',adminToken);
 assert.equal(r.status,200);assert.ok(!JSON.stringify(r.data).includes(code.invite_code));
 pass('Plaintext invitation is returned once and absent from administrator listing');

 // Hold the real invitation row so both independently signed HTTP transactions
 // reach the database concurrently before either can consume it. This detects
 // a removed FOR UPDATE gate; Promise.all alone may accidentally run serially.
 const lock=spawn('docker',['exec','-i',pg,'psql','-X','-A','-t','-v','ON_ERROR_STOP=1',
  '-U','postgres','-d','dic_ci'],{stdio:['pipe','pipe','pipe']});
 let output='';
 const locked=new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(Error('Invitation race lock not acquired')),5000);
  lock.stdout.on('data',chunk=>{output+=chunk;if(output.includes('ISSUE27_LOCKED')){clearTimeout(timeout);resolve();}});
  lock.once('error',error=>{clearTimeout(timeout);reject(error);});
  lock.once('exit',()=>{if(!output.includes('ISSUE27_LOCKED')){clearTimeout(timeout);reject(Error('Invitation lock exited early'));}});
 });
 const exited=new Promise(resolve=>lock.once('exit',resolve));
 let pending;
 try {
  lock.stdin.write(`begin; select id from private.beta_invites where id='${code.id}' for update;\n\\echo ISSUE27_LOCKED\n`);
  await locked;
  pending=Promise.all([first,second].map(id=>rpc('dic_redeem_invite',sign(id),{token:code.invite_code})));
  let waiting=0;
  for(let attempt=0;attempt<35;attempt++){
   waiting=Number(scalar("(select count(*) from pg_stat_activity where datname='dic_ci' and wait_event_type='Lock' and query ilike '%dic_redeem_invite%')"));
   if(waiting>=2)break;
   await delay(100);
  }
  assert.ok(waiting>=2,'Both redemption transactions must demonstrably overlap at the row lock');
  lock.stdin.end('commit;\n\\q\n');
  assert.equal(await exited,0);
  const results=await pending;
  assert.ok(results.every(result=>result.status===200));
  assert.equal(results.filter(result=>result.data?.ok===true).length,1);
  assert.equal(results.filter(result=>result.data?.code==='invalid_invite').length,1);
  const winner=results[0].data.ok?first:second;
  const loser=winner===first?second:first;
  assert.equal(scalar(`(select uses from private.beta_invites where id='${code.id}')`),'1');
  assert.equal(scalar(`(select count(*) from private.invite_redemptions where invite_id='${code.id}')`),'1');
  assert.equal(scalar(`(select count(*) from private.beta_members where owner_id in ('${first}','${second}') and enabled and admitted_at is not null)`),'1');
  pass('Two provably overlapping signed redemptions of a 20-year-old code admit exactly one account');
  r=await rpc('dic_redeem_invite',sign(winner),{token:code.invite_code});
  assert.equal(r.status,200);assert.equal(r.data?.ok,true);
  r=await rpc('dic_redeem_invite',sign(loser),{token:code.invite_code});
  assert.equal(r.status,200);assert.equal(r.data?.ok,false);
  assert.equal(scalar(`(select uses from private.beta_invites where id='${code.id}')`),'1');
  pass('Winner retry is idempotent and a different account cannot reuse the spent invitation');
  r=await rpc('dic_admin_revoke_invite',adminToken,{p_invite_id:code.id});
  assert.equal(r.status,200);assert.equal(r.data?.ok,true);
  r=await rpc('dic_session_status',sign(winner));
  assert.equal(r.status,200);assert.equal(r.data?.admitted,true);
  pass('Revoking an already-used code preserves its admitted account');
  r=await rpc('dic_admin_set_member_access',adminToken,{p_member_id:winner,p_enabled:false});
  assert.equal(r.status,200);assert.equal(r.data?.enabled,false);
  await denied('An existing signed bearer loses personal access immediately after removal','/rpc/dic_read_personal_state',sign(winner),{});
  const fresh=await issue();
  r=await rpc('dic_redeem_invite',sign(winner),{token:fresh.invite_code});
  assert.equal(r.status,200);assert.equal(r.data?.code,'access_revoked');
  assert.equal(scalar(`(select uses from private.beta_invites where id='${fresh.id}')`),'0');
  pass('Removed account cannot regain access by redeeming a fresh code');
  r=await rpc('dic_admin_set_member_access',adminToken,{p_member_id:winner,p_enabled:true});
  assert.equal(r.status,200);assert.equal(r.data?.enabled,true);
  r=await rpc('dic_session_status',sign(winner));
  assert.equal(r.status,200);assert.equal(r.data?.admitted,true);
  pass('Administrator restoration retains the same admitted account without another redemption');
  r=await rpc('dic_admin_revoke_invite',adminToken,{p_invite_id:fresh.id});
  assert.equal(r.status,200);assert.equal(r.data?.ok,true);
  r=await rpc('dic_redeem_invite',sign(unused),{token:fresh.invite_code});
  assert.equal(r.status,200);assert.equal(r.data?.ok,false);
  assert.equal(scalar(`(select uses from private.beta_invites where id='${fresh.id}')`),'0');
  pass('Revoked unused invitation cannot admit a new account');
 } finally {
  if(lock.exitCode===null){lock.stdin.end('rollback;\n\\q\n');await exited;}
  if(pending)await Promise.allSettled([pending]);
 }
 assert.equal(snapshot(),historyBefore);
 pass('Invitation concurrency, revocation and restoration preserve every preexisting shot and note');
}
