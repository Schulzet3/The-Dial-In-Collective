import test from 'node:test';import assert from 'node:assert/strict';
import {Outbox,independentMutations} from '../site/cloud/outbox.js';
import {patchAcknowledgement} from '../site/cloud/cache.js';
import {CloudError,createCloudClient,secureOrigin,validateNewPassword} from '../site/cloud/client.js';
import {hydrate,applyPending,shotPayload} from '../site/cloud/mapping.js';
import {emailConfirmationView} from '../site/cloud/confirmation.js';
import * as M from '../site/lib/model.js';import * as E from '../site/lib/engine.js';
import {rawFixture,rawShot,OWNER,TIME} from './cloud-fixtures/raw.js';
class Store{constructor(){this.events=[];this.receipts=[];this.seq=0;}async put(e){const old=this.events.find(x=>x.id===e.id&&x.owner===e.owner);this.events=this.events.filter(x=>!(x.id===e.id&&x.owner===e.owner));this.events.push({...structuredClone(e),sequence:old?.sequence||++this.seq});}async list(owner){return structuredClone(this.events.filter(x=>x.owner===owner).sort((a,b)=>a.sequence-b.sequence));}async acknowledge(event,result){this.receipts.push({event,result});this.events=this.events.filter(x=>!(x.id===event.id&&x.owner===event.owner));}}
function queueFixture(){let owner='a',i=0;const store=new Store(),calls=[],remote={async mutate(e){calls.push(e);return {ok:true};}};const q=new Outbox({store,remote,identity:()=>owner?{id:owner}:null,uuid:()=>String(++i),now:()=>TIME});return {q,store,remote,calls,owner:v=>owner=v};}
test('new cloud workspace has full library but no pin',()=>{const s=hydrate(rawFixture());assert.equal(s.coffees.length,1);assert.equal(M.workspace(s).currentCoffeeId,null);});
test('missing historical feed and temperature are not fabricated',()=>{const r=rawFixture();r.shots=[rawShot()];const s=hydrate(r);assert.equal(s.shots[0].feedMode,null);assert.equal(s.shots[0].tempC,null);assert.equal(s.shots[0].grindSetting,0);});
test('pending coffee remains pending, not verified',()=>{const s=hydrate(rawFixture());assert.equal(s.coffees[0].status,'pending');assert.equal(s.coffees[0].name,'Test Coffee');});
test('initial log measurements yield/time/grind remain blank',()=>{const d=E.prefill(hydrate(rawFixture()),'coffee');assert.equal(d.doseG,18);assert.equal(d.yieldG,'');assert.equal(d.timeS,'');assert.equal(d.grindSetting,'');});
test('recorded grind zero is preserved as a valid prior',()=>{const r=rawFixture();r.shots=[rawShot({feed_mode:'standard'})];const d=E.prefill(hydrate(r),'coffee');assert.equal(d.grindSetting,0);assert.equal(d.yieldG,'');});
test('new log disabled feed tracking means standard',()=>{const s=hydrate(rawFixture());const d={...E.prefill(s,'coffee'),id:'new',yieldG:50,timeS:20,grindSetting:0,tasteScales:{extraction:3,body:3,clarity:5,sweetness:5,astringency:1},tempC:95,feedMode:'slow'};const p=shotPayload(s,'coffee',d);assert.equal(p.feed_mode,'standard');assert.equal(p.temperature_c,null);assert.equal(p.grind_setting,0);});
test('new log enabled slow feed preserves actual condition',()=>{const r=rawFixture();r.setupPreferences[0].track_slow_feed=true;const s=hydrate(r);const d={...E.prefill(s,'coffee'),id:'new',yieldG:50,timeS:20,grindSetting:.5,tasteScales:{extraction:3,body:3,clarity:5,sweetness:5,astringency:1},feedMode:'slow'};assert.equal(shotPayload(s,'coffee',d).feed_mode,'slow');});
test('pending new shot renders once with pending mark and pin',()=>{const s=hydrate(rawFixture()),sh=rawShot();const event={status:'pending',action:'save_shot',payload:{...sh,id:'new',taste:{extraction:3,body:3,clarity:5,sweetness:5,astringency:1}}};const next=applyPending(s,[event,event]);assert.equal(next.shots.length,1);assert.equal(next.shots[0].cloudPending,true);assert.equal(M.workspace(next).currentCoffeeId,'coffee');assert.equal(s.shots.length,0);});
test('acknowledged shot survives subsequent read failure through cache patch',()=>{const raw=rawFixture(),shot=rawShot();const next=patchAcknowledgement(raw,{owner:OWNER,action:'save_shot',createdAt:TIME,payload:{notes:'Private test note'}},{ok:true,record:shot});assert.equal(next.shots.length,1);assert.equal(next.shots[0].id,'shot');assert.equal(next.notes[0].notes,'Private test note');assert.equal(next.workspaces[0].current_library_entry_id,'coffee');assert.equal(raw.shots.length,0);});
test('acknowledged edit updates existing record without duplicate',()=>{const raw=rawFixture();raw.shots=[rawShot()];const next=patchAcknowledgement(raw,{owner:OWNER,action:'save_shot',payload:{expected_revision:2}},{record:rawShot({time_s:23,revision:3})});assert.equal(next.shots.length,1);assert.equal(next.shots[0].time_s,23);});
test('cache patch does not claim server family stats it did not receive',()=>{const next=patchAcknowledgement(rawFixture(),{owner:OWNER,action:'save_shot',createdAt:TIME,payload:{}},{record:rawShot()});assert.equal(next.families.length,0);});
test('outbox persists before making network call',async()=>{const f=queueFixture();await f.q.enqueue('save_shot',{});assert.equal(f.calls.length,0);assert.equal((await f.q.pending()).length,1);});
test('same timestamp queue stays in insertion order',async()=>{const f=queueFixture();for(let i=0;i<12;i++)await f.q.enqueue('save_shot',{n:i});await f.q.flush();assert.deepEqual(f.calls.map(x=>x.payload.n),Array.from({length:12},(_,i)=>i));});
test('lost response retains exact event for idempotent retry',async()=>{const f=queueFixture();await f.q.enqueue('save_shot',{n:1});let once=true;const seen=[];f.remote.mutate=async e=>{seen.push(structuredClone(e));if(once){once=false;throw Error('offline');}return {ok:true};};assert.equal((await f.q.flush()).state,'offline');await f.q.flush();assert.deepEqual(seen[0],seen[1]);});
test('conflicts are retained and block later writes',async()=>{const f=queueFixture();await f.q.enqueue('save_shot',{});await f.q.enqueue('save_shot',{});f.remote.mutate=async()=>({ok:false,code:'conflict',revision:4});assert.equal((await f.q.flush()).state,'conflict');assert.equal(f.store.events.length,2);assert.equal(f.store.events.find(x=>x.id==='1').status,'conflict');});
test('a rejected shot does not block a different, fully identified offline shot',async()=>{
 const f=queueFixture();
 const shot=id=>({id,setup_version_id:'version-1',library_entry_id:'coffee-1'});
 await f.q.enqueue('save_shot',shot('shot-a'));
 await f.q.enqueue('save_shot',shot('shot-b'));
 f.remote.mutate=async event=>{f.calls.push(event);return event.payload.id==='shot-a'?{ok:false,code:'conflict'}:{ok:true};};
 const first=await f.q.flush();
 assert.equal(first.state,'conflict');assert.equal(first.sent,1);
 assert.deepEqual(f.calls.map(e=>e.payload.id),['shot-a','shot-b']);
 assert.deepEqual(f.store.events.map(e=>e.payload.id),['shot-a']);
 await f.q.flush();
 assert.deepEqual(f.calls.map(e=>e.payload.id),['shot-a','shot-b'],'no held mutation or settled shot is replayed');
});
test('a rejected shot does not block unrelated preference change but unknown dependencies stay put',async()=>{
 const f=queueFixture();
 await f.q.enqueue('save_shot',{id:'bad',setup_version_id:'v',library_entry_id:'c'});
 await f.q.enqueue('save_preferences',{theme:'dark',expected_revision:2});
 await f.q.enqueue('make_current',{shot_id:'bad',expected_revision:2});
 f.remote.mutate=async e=>{f.calls.push(e);return e.action==='save_shot'?{ok:false,code:'conflict'}:{ok:true};};
 const result=await f.q.flush();
 assert.equal(result.state,'conflict');assert.equal(result.sent,1);
 assert.deepEqual(f.calls.map(e=>e.action),['save_shot','save_preferences']);
 assert.equal(f.store.events.length,2,'held shot and dependent make_current stay durable');
});
test('held authorization denial never lets later independent operations proceed',async()=>{
 const f=queueFixture();
 await f.q.enqueue('save_shot',{id:'blocked',setup_version_id:'v',library_entry_id:'c'});
 await f.q.enqueue('save_shot',{id:'later',setup_version_id:'v',library_entry_id:'c'});
 let calls=0;
 f.remote.mutate=async()=>{calls++;throw new CloudError('Forbidden','42501');};
 const first=await f.q.flush(),again=await f.q.flush();
 assert.equal(first.accessDenied,true);
 assert.equal(again.accessDenied,true);
 assert.equal(calls,1,'no later writes attempted under denied identity');
 assert.equal(f.store.events.length,2);
});
test('same shot and unknown setup dependencies remain blocked while held',async()=>{
 const f=queueFixture();
 await f.q.enqueue('save_shot',{id:'same',setup_version_id:'v',library_entry_id:'c'});
 await f.q.enqueue('save_shot',{id:'same',setup_version_id:'v',library_entry_id:'c',expected_revision:5});
 await f.q.enqueue('create_setup',{id:'different'});
 let calls=0;f.remote.mutate=async()=>{calls++;return {ok:false,code:'conflict'};};
 assert.equal((await f.q.flush()).state,'conflict');
 assert.equal(calls,1);assert.equal(f.store.events.length,3);
 assert.equal(independentMutations({action:'create_setup',payload:{id:'bad'}},{action:'save_shot',payload:{id:'different',setup_version_id:'v',library_entry_id:'c'}}),false);
});
test('no retry-overwrite of unresolved conflict',async()=>{const f=queueFixture();await f.q.enqueue('save_shot',{});let n=0;f.remote.mutate=async()=>{n++;return {ok:false,code:'conflict'};};await f.q.flush();await f.q.flush();assert.equal(n,1);});
test('server validation rejection retains local event',async()=>{const f=queueFixture();await f.q.enqueue('save_shot',{});f.remote.mutate=async()=>{throw new CloudError('bad','22023');};assert.equal((await f.q.flush()).state,'rejected');assert.equal(f.store.events.length,1);});
test('authorization denials remain distinguishable in fresh and retained queue rejections',async()=>{
 for(const error of [new CloudError('No access','42501'),Object.assign(new CloudError('Forbidden'),{status:403}),new CloudError('Invalid claims','PGRST303')]){
  const f=queueFixture();await f.q.enqueue('save_shot',{dose_g:18});let calls=0;
  f.remote.mutate=async()=>{calls++;throw error;};
  const fresh=await f.q.flush(),retained=await f.q.flush();
  assert.equal(fresh.accessDenied,true);assert.equal(fresh.recheckAccess,undefined);
  assert.equal(retained.accessDenied,true);assert.equal(retained.recheckAccess,true);assert.equal(calls,1);
  assert.equal(f.store.events[0].error.status,error.status);assert.deepEqual(f.store.events[0].payload,{dose_g:18});
 }
});
test('validation failures do not masquerade as a membership denial',async()=>{
 const f=queueFixture();await f.q.enqueue('save_shot',{});f.remote.mutate=async()=>{throw new CloudError('Invalid dose','23514');};
 assert.equal((await f.q.flush()).accessDenied,undefined);assert.equal((await f.q.flush()).accessDenied,undefined);
});
test('failed local error annotation cannot hide a fresh remote access denial',async()=>{
 const f=queueFixture();await f.q.enqueue('save_shot',{dose_g:18});
 f.remote.mutate=async()=>{throw new CloudError('No access','42501');};
 f.store.put=async()=>{throw new Error('Storage unavailable');};
 assert.equal((await f.q.flush()).accessDenied,true);
 assert.equal(f.store.events[0].status,'pending');assert.deepEqual(f.store.events[0].payload,{dose_g:18});
});
test('account B cannot flush account A pending data',async()=>{const f=queueFixture();await f.q.enqueue('save_shot',{a:true});f.owner('b');await f.q.enqueue('save_shot',{b:true});await f.q.flush();assert.equal(f.calls.length,1);assert.equal(f.calls[0].owner,'b');assert.equal(f.store.events[0].owner,'a');});
test('changing accounts stops in-flight queue before next event',async()=>{const f=queueFixture();await f.q.enqueue('save_shot',{});await f.q.enqueue('save_shot',{});f.remote.mutate=async()=>{f.owner('b');return {ok:true};};assert.equal((await f.q.flush()).state,'account_changed');assert.equal(f.store.events.length,1);});
test('signed-out queue cannot create new writes',async()=>{const f=queueFixture();f.owner(null);await assert.rejects(f.q.enqueue('save_shot',{}),{code:'signed_out'});});
test('unsupported actions fail closed',async()=>{const f=queueFixture();await assert.rejects(f.q.enqueue('make_admin',{}),{code:'unsupported_action'});});
test('caller mutation cannot alter queued payload',async()=>{const f=queueFixture(),p={a:1};await f.q.enqueue('save_shot',p);p.a=2;assert.equal(f.store.events[0].payload.a,1);});
test('concurrent flush calls only send one copy',async()=>{const f=queueFixture();await f.q.enqueue('save_shot',{});await Promise.all([f.q.flush(),f.q.flush()]);assert.equal(f.calls.length,1);});
test('disk failure does not claim queued/synced success',async()=>{const f=queueFixture();f.store.put=async()=>{throw Error('disk full');};await assert.rejects(f.q.enqueue('save_shot',{}));assert.equal(f.calls.length,0);});
test('HTTPS/local development origins only for accounts',()=>{secureOrigin({protocol:'https:',hostname:'test.example'},true);secureOrigin({protocol:'http:',hostname:'localhost'},true);assert.throws(()=>secureOrigin({protocol:'http:',hostname:'192.168.1.9'},false),{code:'insecure_origin'});assert.throws(()=>secureOrigin({protocol:'file:',hostname:''},true));});
function authFixture(){let listener;const calls=[],sdk={auth:{onAuthStateChange(fn){listener=fn;return {data:{subscription:{unsubscribe(){}}}};},async getUser(){return {data:{user:{id:'a',email:'a@example.invalid',user_metadata:{admin:true}}}};}},async rpc(name,p){calls.push({name,p});return {data:{ok:true}};}};for(const name of ['signInWithPassword','signUp','resetPasswordForEmail','updateUser','signOut'])sdk.auth[name]=async(...args)=>{calls.push({name,args});return {data:{}};};const c=createCloudClient(sdk,{redirectUrl:'https://test.example/',assertSecure:()=>{}});return {c,calls,event:(...x)=>listener(...x)};}
test('session profile strips untrusted metadata privileges',async()=>{const f=authFixture();assert.deepEqual(await f.c.identity(),{id:'a',email:'a@example.invalid'});f.c.dispose();});
test('auth callbacks defer and strip tokens',async()=>{const f=authFixture();let seen;f.c.onAuthChange((e,u)=>seen=u);f.event('SIGNED_IN',{user:{id:'a',email:'a@example.invalid'},access_token:'secret'});assert.equal(seen,undefined);await Promise.resolve();assert.deepEqual(seen,{id:'a',email:'a@example.invalid'});f.c.dispose();});
test('password recovery uses app return URL',async()=>{const f=authFixture();await f.c.requestReset(' a@example.invalid ');assert.deepEqual(f.calls[0].args,['a@example.invalid',{redirectTo:'https://test.example/'}]);f.c.dispose();});
test('signout scope only affects current device',async()=>{const f=authFixture();await f.c.signOut();assert.deepEqual(f.calls[0].args,[{scope:'local'}]);f.c.dispose();});
test('admission comes from server, not user metadata',async()=>{const f=authFixture();await f.c.status();assert.equal(f.calls[0].name,'dic_session_status');f.c.dispose();});
test('browser writes bind original queue owner at server boundary',async()=>{const f=authFixture();await f.c.mutate({id:'mutation',owner:OWNER,action:'save_shot',payload:{id:'shot'}});assert.equal(f.calls[0].name,'dic_apply_client_change');assert.equal(f.calls[0].p.expected_owner,OWNER);f.c.dispose();});
test('hydration restores latest-shot advice to the main recommendation',()=>{const r=rawFixture();r.shots=[rawShot({feed_mode:'standard',grind_setting:1,extraction:4,is_dialed_in:false,personal_family_id:null})];const s=hydrate(r),rec=E.recommendation(s,'coffee');assert.ok(s.shots[0].suggestion);assert.equal(rec.grind.source,'Next setting to try');assert.equal(rec.grind.value,1.2);});

test('new passwords accept at least 8 characters with a number and special character, without uppercase',()=>{
 assert.equal(validateNewPassword('Latte@12'),null);
 assert.equal(validateNewPassword('coffee!1'),null);
 assert.equal(validateNewPassword('Coffee 1!'),null);
});
test('new password validation rejects too short, missing digits, and missing symbols',()=>{
 assert.match(validateNewPassword('Short!A'),/8 characters/);
 assert.match(validateNewPassword('coffeebar!'),/number/);
 assert.match(validateNewPassword('Coffee123'),/special/);
 assert.match(validateNewPassword('Coffee🙂12'),/special/);
 assert.match(validateNewPassword(''),/8 characters/);
});

test('email verification is a prominent dedicated screen with a sign-in route',()=>{
 const page=emailConfirmationView('person@example.com');
 assert.match(page,/<h2[^>]*>Check your email to confirm your address<\/h2>/);
 assert.match(page,/We requested a verification link for/);
 assert.match(page,/person@example\.com/);
 assert.match(page,/data-view="signin"/);
 assert.match(page,/data-view="signup"/);
 assert.doesNotMatch(page,/id="auth-signup"/);
});
test('confirmation page safely escapes the submitted email',()=>{
 const page=emailConfirmationView('a<script>@example.com');
 assert.doesNotMatch(page,/<script>/);
 assert.match(page,/a&lt;script&gt;@example\.com/);
});
test('signup uses confirmation page rather than a temporary inline notice',async()=>{
 const {readFile}=await import('node:fs/promises');
 const file=await readFile(new URL('../site/cloud/main.js',import.meta.url),'utf8');
 assert.match(file,/this\.authView='check-email'/);
 assert.match(file,/return emailConfirmationView\(this\.confirmationEmail\)/);
 assert.doesNotMatch(file,/this\.notice='Check your email to confirm your address\./);
});
