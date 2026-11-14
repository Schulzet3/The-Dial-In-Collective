import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LOCKED_INSTALL_ARGS,classifyInstallFailure,safeFailureHint,installWithBoundedRecovery}
 from '../scripts/audit/ci-install-recovery.mjs';
const result=(status,stderr='')=>({status,stderr,stdout:''});
test('one deterministic locked install is the only command, with zero retry on PASS',async()=>{
 const actual=[];
 const receipt=await installWithBoundedRecovery({
  run:(name,args,opts)=>{actual.push({name,args,opts});return result(0);},
  pause:()=>{throw Error('unexpected retry')},report:()=>{}
 });
 assert.deepEqual(receipt,{ok:true,attempts:1,kind:'SUCCESS'});
 assert.equal(actual.length,1);assert.equal(actual[0].name,'npm');
 assert.deepEqual(actual[0].args,LOCKED_INSTALL_ARGS);
 assert.equal(actual[0].opts.timeout,240000);
});
test('one bounded retry of identical npm ci only after genuine transport outage',async()=>{
 const actual=[],messages=[];let sleeps=0;
 const receipt=await installWithBoundedRecovery({
  run:(name,args)=>{actual.push(name+' '+args.join(' '));return actual.length===1?
   result(1,'npm error code EAI_AGAIN'):result(0);},
  pause:async ms=>{assert.equal(ms,1000);sleeps++;},
  report:x=>messages.push(x)
 });
 assert.deepEqual(receipt,{ok:true,attempts:2,kind:'SUCCESS'});
 assert.equal(sleeps,1);
 assert.equal(actual.length,2);assert.equal(actual[0],actual[1]);
 assert.match(messages.join(' '),/Retry one identical locked install/);
});
test('package resolution, access and test assertions NEVER retry',async()=>{
 for(const message of ['npm error code ERESOLVE','npm error code E401',
  'npm error code E404','npm error code EINTEGRITY',
  'AssertionError expected true','node tests failed',
  'npm error code E401 network ECONNRESET']){
  let attempts=0;
  const receipt=await installWithBoundedRecovery({run:()=>{attempts++;return result(1,message);},
   pause:()=>{throw Error('No retry permitted')},report:()=>{}});
  assert.equal(attempts,1,message);
  assert.equal(receipt.ok,false,message);
  assert.notEqual(receipt.kind,'TRANSIENT_TRANSPORT',message);
 }
});
test('second transport failure stops, masked summary omits secrets',async()=>{
 let attempts=0;
 const secret='https://secret-user:secret-password@registry.npmjs.org/npm';
 const receipt=await installWithBoundedRecovery({
  run:()=>{attempts++;return result(1,'HTTP 503 '+secret);},
  pause:async()=>{},report:()=>{}
 });
 assert.deepEqual(receipt,{ok:false,attempts:2,kind:'TRANSIENT_TRANSPORT',hint:'HTTP_503'});
 assert.equal(attempts,2);
 assert.equal(safeFailureHint('npm error EAI_AGAIN '+secret),'EAI_AGAIN');
 assert.equal(safeFailureHint('sensitive '+secret),'NO_CLASSIFIABLE_CODE');
});
test('unexpected nonnumeric runner termination is never presumed transient',async()=>{
 let attempts=0;
 const receipt=await installWithBoundedRecovery({run:()=>{attempts++;return {status:null,stderr:'EAI_AGAIN',error:new Error('signal')};},
  pause:()=>{throw Error('No retry permitted')},report:()=>{}});
 assert.equal(attempts,1);assert.equal(receipt.kind,'UNKNOWN');
});
test('active CI workflows reuse one implementation; no extra test or build jobs',()=>{
 const load=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const beta=load('.github/workflows/cloud-beta-ci.yml');
 const cloud=load('.github/workflows/cloud-regression.yml');
 assert.equal((beta.match(/run: node scripts\/audit\/ci-install-recovery\.mjs/g)||[]).length,1);
 assert.equal((cloud.match(/run: node scripts\/audit\/ci-install-recovery\.mjs/g)||[]).length,2);
 assert.doesNotMatch(beta+cloud,/run: npm ci --ignore-scripts --no-audit --no-fund/);
 assert.equal((beta.match(/npm run build:cloud/g)||[]).length,1);
 assert.equal((cloud.match(/npm run build:cloud/g)||[]).length,1);
 assert.match(beta,/Run all checked-in Node tests \(HIGH risk only\)/);
});
