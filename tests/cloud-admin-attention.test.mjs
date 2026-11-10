import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root={innerHTML:'',querySelector(){return null;}};
const sheet={open:false,close(){},querySelector(){return null;}};
const reviewSheet={open:false,close(){},replaceChildren(){},querySelector(){return null;}};
globalThis.document={querySelector:selector=>selector==='#app'?root:selector==='#sheet'?sheet:reviewSheet};
const {CloudApp}=await import('../site/cloud/main.js');
delete globalThis.document;
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true}});
function fixture(counts){
 let calls=0;
 const client={async adminAttentionCounts(){calls++;return typeof counts==='function'?counts():counts;}};
 const app=new CloudApp(client,{});
 app.identity={id:'10000000-0000-4000-8000-000000000001',email:'admin@fixture.invalid'};
 app.status={authenticated:true,admitted:true,admin:true};
 return {app,get calls(){return calls;}};
}
const counts={pending_accounts:12,pending_verified_accounts:2,pending_coffees:1,conflicts:1,unfinished_account_deletions:1};
test('Admin count excludes unverified signups, includes actionable review and deletion tasks',async()=>{
 const f=fixture(counts);await f.app.refreshAdminAttention();
 assert.equal(f.calls,1);assert.equal(f.app.adminAttentionCount,5);
 assert.match(f.app.adminAttentionBadge(),/>5<\/span>/);
 assert.match(f.app.adminAttentionBadge(),/5 administrator items require attention/);
 const source=readFileSync(new URL('../site/cloud/main.js',import.meta.url),'utf8');
 assert.match(source,/icon\('settings',20\)\+this\.adminAttentionBadge\(\)/);
 assert.match(source,/Admin Dashboard<\/span>\$\{this\.adminAttentionBadge\(\)\}/);
 const css=readFileSync(new URL('../site/styles.css',import.meta.url),'utf8');
 assert.match(css,/\.settings-attention-trigger/);assert.match(css,/\.admin-action-badge/);
});
test('Nonadmins, unadmitted accounts and offline views cannot request Admin counts',async()=>{
 const f=fixture(counts);
 f.app.status.admin=false;await f.app.refreshAdminAttention();assert.equal(f.calls,0);
 f.app.status.admin=true;navigator.onLine=false;await f.app.refreshAdminAttention();
 assert.equal(f.calls,0);assert.equal(f.app.adminAttentionBadge(),'');
 navigator.onLine=true;f.app.status.admitted=false;await f.app.refreshAdminAttention();assert.equal(f.calls,0);
});
test('Unknown or malformed count never becomes zero or stale',async()=>{
 const f=fixture({...counts,pending_verified_accounts:undefined});
 await f.app.refreshAdminAttention();assert.equal(f.app.adminAttentionCount,null);
 assert.equal(f.app.adminAttentionBadge(),'');
});
test('Late Admin count cannot appear in a different account session',async()=>{
 let resolve;const delayed=new Promise(r=>{resolve=r;});
 const f=fixture(()=>delayed),pending=f.app.refreshAdminAttention();
 f.app.identity={id:'20000000-0000-4000-8000-000000000002'};
 f.app.epoch++;resolve(counts);await pending;
 assert.equal(f.app.adminAttentionCount,null);assert.equal(f.app.adminAttentionBadge(),'');
});
test('Zero actionable tasks hides badge but retains Admin authorization',async()=>{
 const f=fixture({...counts,pending_verified_accounts:0,pending_coffees:0,conflicts:0,unfinished_account_deletions:0});
 await f.app.refreshAdminAttention();
 assert.equal(f.app.adminAttentionCount,0);assert.equal(f.app.adminAttentionBadge(),'');
});
