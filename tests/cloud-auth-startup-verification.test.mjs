import test from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers';

const root={innerHTML:'',querySelector(){return null;}};
const sheet={open:false,innerHTML:'',close(){this.open=false;},querySelector(){return null;}};
globalThis.document={querySelector:selector=>selector==='#app'?root:sheet};
const {CloudApp}=await import('../site/cloud/main.js');
delete globalThis.document;

const user={id:'10000000-0000-4000-8000-000000000001',email:'member@example.invalid'};
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const settle=()=>new Promise(resolve=>setImmediate(resolve));

function fixture(response){
 const frames=[];
 const store={async readCache(){return null;},async clearCache(){},async list(){return [];}};
 let workspaceVisits=0;
 const app=new CloudApp({async status(){return response();}},store);
 // Capture the actual auth() template on each startup render, without DOM mocking.
 app.render=()=>frames.push(app.auth());
 app.sync=async()=>{workspaceVisits++;};
 return {app,frames,get workspaceVisits(){return workspaceVisits;}};
}

test('INITIAL_SESSION never renders a false approval card while admission is unknown',async()=>{
 const response=deferred(),f=fixture(()=>response.promise);
 f.app.authChanged('INITIAL_SESSION',user);
 assert.match(f.frames[0],/Checking Account Access/);
 assert.doesNotMatch(f.frames[0],/Account Approval Pending|Verify your email|Check Approval Status/);
 assert.equal(f.workspaceVisits,0,'unknown access must not load private workspace');
 response.resolve({authenticated:true,admitted:true,emailVerified:true,admin:false});
 await settle();
 assert.equal(f.app.status.admitted,true);
 assert.equal(f.workspaceVisits,1,'admitted account continues to its workspace');
 assert.equal(f.frames.some(frame=>frame.includes('Account Approval Pending')),false);
});

test('only a verified server-side pending state shows actual approval instructions',async()=>{
 const response=deferred(),f=fixture(()=>response.promise);
 f.app.authChanged('INITIAL_SESSION',user);
 assert.doesNotMatch(f.frames[0],/Account Approval Pending/);
 response.resolve({authenticated:true,admitted:false,emailVerified:false,approvalState:'pending'});
 await settle();
 const rendered=f.frames.at(-1);
 assert.match(rendered,/Account Approval Pending/);
 assert.match(rendered,/Verify your email/);
 assert.match(rendered,/Check Approval Status/);
 assert.equal(f.workspaceVisits,0,'unadmitted user never reads workspace');
});

test('known rejected and revoked accounts retain accurate denial screens',()=>{
 const f=fixture(()=>Promise.resolve(null));
 f.app.identity=user;
 for(const [approvalState,heading] of [['rejected','Account Request Declined'],['revoked','Account Access Removed']]){
  f.app.status={authenticated:true,admitted:false,emailVerified:true,approvalState};
  assert.match(f.app.auth(),new RegExp(heading));
  assert.doesNotMatch(f.app.auth(),/Checking Account Access/);
 }
});

test('failed admission check shows retry, not an invented pending state',async()=>{
 const f=fixture(async()=>{throw new TypeError('Failed to fetch');});
 f.app.authChanged('INITIAL_SESSION',user);
 await settle();
 const rendered=f.frames.at(-1);
 assert.match(rendered,/Connection Needed/);
 assert.match(rendered,/Try Again/);
 assert.match(rendered,/Sign Out/);
 assert.doesNotMatch(rendered,/Account Approval Pending|Verify your email/);
 assert.equal(f.workspaceVisits,0);
});

test('account switch clears stale status and verifies before showing next account',async()=>{
 const response=deferred(),f=fixture(()=>response.promise);
 f.app.identity=user;
 f.app.status={authenticated:true,admitted:true,emailVerified:true};
 f.app.syncState='offline';
 f.app.authChanged('SIGNED_IN',{id:'20000000-0000-4000-8000-000000000002',email:'next@example.invalid'});
 assert.equal(f.app.status,null);
 assert.equal(f.app.syncState,'connecting');
 assert.match(f.frames[0],/Checking Account Access/);
 assert.doesNotMatch(f.frames[0],/Account Approval Pending|Connection Needed/);
 response.resolve({authenticated:true,admitted:true,emailVerified:true});
 await settle();
 assert.equal(f.workspaceVisits,1);
});


test('pending account status poll admits the user and shows dismissible confirmation',async()=>{
 const pending={authenticated:true,admitted:false,emailVerified:true,approvalState:'pending',admin:false};
 const approved={authenticated:true,admitted:true,emailVerified:true,approvalState:'approved',admin:false};
 const f=fixture(()=>Promise.resolve(approved));f.app.identity=user;f.app.status=pending;
 await f.app.pollOnce();
 assert.equal(f.workspaceVisits,1);
 assert.equal(f.app.status.admitted,true);
 assert.equal(f.app.accountApprovalNotice,true);
 await f.app.pollOnce();assert.equal(f.app.accountApprovalNotice,true);
 assert.equal(f.app.status.admitted,true,'a fake auth-template-only render cannot contradict server admission');
});

test('existing members and rejected users do not receive false approval confirmation',async()=>{
 const approved={authenticated:true,admitted:true,emailVerified:true,approvalState:'approved',admin:false};
 const a=fixture(()=>Promise.resolve(approved));a.app.identity=user;a.app.status=approved;
 await a.app.pollOnce();assert.equal(a.app.accountApprovalNotice,false);
 const rejected={authenticated:true,admitted:false,emailVerified:true,approvalState:'rejected',admin:false};
 const r=fixture(()=>Promise.resolve(rejected));r.app.identity=user;r.app.status={...rejected,approvalState:'pending'};
 await r.app.pollOnce();assert.equal(r.app.accountApprovalNotice,false);
 assert.match(r.frames.at(-1),/Account Request Declined/);
 assert.equal(r.workspaceVisits,0);
});

test('failed approval check never invents admission',async()=>{
 const f=fixture(async()=>{throw Error('Network unavailable');});
 f.app.identity=user;f.app.status={authenticated:true,admitted:false,approvalState:'pending'};
 await f.app.pollOnce();assert.equal(f.app.accountApprovalNotice,false);
 assert.equal(f.workspaceVisits,0);
});
