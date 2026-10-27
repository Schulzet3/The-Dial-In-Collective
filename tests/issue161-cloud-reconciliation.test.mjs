import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate,applyPending,shotPayload} from '../site/cloud/mapping.js';
import {rawFixture,rawShot,OWNER} from './cloud-fixtures/raw.js';
import {recommendation,nextAdvice} from '../site/lib/engine.js';

const root={innerHTML:''},sheet={open:false,innerHTML:'',close(){this.open=false;},querySelector(){return null;}};
globalThis.document={
 querySelector:selector=>selector==='#app'?root:sheet,
 createElement:()=>({open:false,dataset:{},setAttribute(){},addEventListener(){},replaceChildren(){},close(){this.open=false;},querySelector(){return null;}}),
 body:{append(){}}
};
const {CloudApp}=await import('../site/cloud/main.js');
delete globalThis.document;
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true}});
const tastes={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
function makeApp(handler){
 const app=new CloudApp({recommendationCommunityEvidence:handler},{});
 app.identity={id:OWNER};app.status={admitted:true};app.state=hydrate(rawFixture());
 app.render=()=>{app.renderCount=(app.renderCount||0)+1;};
 return app;
}
const key=app=>JSON.stringify([app.identity.id,app.epoch,'coffee',app.state.setups[0].workspaces.version.coffees.coffee.style]);
test('Community evidence refresh is bounded, fresh after expiry, style-specific and offline-safe',async()=>{
 let calls=0;
 const app=makeApp(async()=>({version:++calls}));
 await app.loadRecommendationEvidence('coffee');
 assert.equal(calls,1);
 assert.equal(app.recommendationEvidence.coffee.Turbo.version,1);
 await app.loadRecommendationEvidence('coffee');
 assert.equal(calls,1,'cached evidence is reused within five minutes');
 const prior=key(app);app.recommendationEvidenceAttemptedAt.set(prior,Date.now()-300001);
 await app.loadRecommendationEvidence('coffee');
 assert.equal(calls,2,'expired evidence updates without requiring sign-out');
 assert.equal(app.recommendationEvidence.coffee.Turbo.version,2);
 app.state.setups[0].workspaces.version.coffees.coffee.style='Traditional';
 await app.loadRecommendationEvidence('coffee');
 assert.equal(calls,3,'other shot style requires its own evidence');
 navigator.onLine=false;
 try{app.recommendationEvidenceAttemptedAt.set(key(app),Date.now()-300001);await app.loadRecommendationEvidence('coffee');}
 finally{navigator.onLine=true;}
 assert.equal(calls,3,'no remote reads while offline');
});
test('failed Community refresh keeps last successful recommendation and throttles retries',async()=>{
 let calls=0,fail=false;
 const app=makeApp(async()=>{calls++;if(fail)throw new Error('Network unavailable');return {value:42};});
 await app.loadRecommendationEvidence('coffee');
 const original=app.recommendationEvidence.coffee.Turbo;
 fail=true;app.recommendationEvidenceAttemptedAt.set(key(app),Date.now()-300001);
 await app.loadRecommendationEvidence('coffee');
 assert.equal(app.recommendationEvidence.coffee.Turbo,original);
 assert.equal(app.state.communityEvidence.coffee.Turbo,original);
 await app.loadRecommendationEvidence('coffee');
 assert.equal(calls,2,'failed refresh does not trigger immediate repeat requests');
});
test('single-flight requests and account changes never mix Community evidence',async()=>{
 const waits=[];const handler=()=>new Promise(resolve=>waits.push(resolve));
 const app=makeApp(handler);
 const old=app.loadRecommendationEvidence('coffee'),duplicate=app.loadRecommendationEvidence('coffee');
 assert.equal(waits.length,1);
 await duplicate;
 const oldKey=key(app);
 app.resetAccount();app.identity={id:'different-admitted-account'};app.status={admitted:true};app.state=hydrate(rawFixture());
 assert.equal(app.recommendationEvidenceAttemptedAt.size,0,'logout clears cached attempt metadata');
 assert.equal(app.recommendationEvidence.coffee,undefined,'no old owner evidence');
 const recent=app.loadRecommendationEvidence('coffee');
 assert.equal(waits.length,2);
 waits[0]({value:'old-member'});await old;
 assert.equal(app.recommendationEvidence.coffee,undefined,'stale owner response is discarded');
 assert.equal(app.recommendationEvidenceRequests.size,1,'old completion does not cancel the new owner request');
 assert.equal(app.recommendationEvidenceRequests.has(oldKey),false);
 waits[1]({value:'new-member'});await recent;
 assert.equal(app.recommendationEvidence.coffee.Turbo.value,'new-member');
});
test('indexed hydration keeps first-match source rows, original notes, historical bags and newest visible advice',()=>{
 const r=rawFixture();
 r.submissions.push({id:'submission',proposed_data:{name:'Wrong duplicate'}});
 r.shots=[
  rawShot({id:'older',pulled_at:'2026-10-01T12:00:00Z',bag_id:'old-bag'}),
  rawShot({id:'newer',pulled_at:'2026-10-02T12:00:00Z'}),
  rawShot({id:'invisible',pulled_at:'2026-10-03T12:00:00Z',hidden_at:'2026-10-04T12:00:00Z'})
 ];
 r.notes=[{shot_id:'older',notes:'First private note'},{shot_id:'older',notes:'Incorrect duplicate'},{shot_id:'newer',notes:'Second private note'}];
 const before=structuredClone(r),s=hydrate(r);
 assert.deepEqual(r,before,'hydration must never mutate source rows or owner data');
 assert.equal(s.coffees[0].name,'Test Coffee');
 assert.equal(s.shots[0].bagId,'old-bag');
 assert.equal(s.shots[0].notes,'First private note');
 assert.equal(s.shots[1].notes,'Second private note');
 assert.equal(s.shots[0].suggestion,undefined,'older shot is not overwritten');
 assert.equal(s.shots[2].suggestion,undefined,'hidden shot is excluded');
 const last=s.shots[1],rec=recommendation(s,'coffee',{style:last.style,basketId:last.basketId,feedMode:last.feedMode||undefined,ignoreAdvice:true});
 assert.deepEqual(last.suggestion,nextAdvice(s,last,rec),'newest visible shot retains original recommendation');
 const payload=shotPayload(s,'coffee',{id:'fresh',style:'Turbo',doseG:18,yieldG:36,timeS:26,grindSetting:1,basketId:'basketv',feedMode:'standard',tasteScales:{...tastes},notes:'Kept'});
 assert.equal(Object.hasOwn(payload,'bag_id'),false,'new shots must not invent bag associations');
});
test('equal timestamps choose original first row and larger libraries keep distinct shot records',()=>{
 const r=rawFixture();r.shots=[
  rawShot({id:'same-first',pulled_at:'2026-10-02T12:00:00Z'}),
  rawShot({id:'same-second',pulled_at:'2026-10-02T12:00:00Z'})
 ];
 const simple=hydrate(r);
 assert.ok(simple.shots[0].suggestion,'first equal-timestamp shot wins');
 assert.equal(simple.shots[1].suggestion,undefined);
 r.shots=[];r.library=[];r.workspaceCoffees=[];
 for(let c=0;c<35;c++){
  const id='coffee-'+c;
  r.library.push({id,owner_id:OWNER,submission_id:'submission',created_at:'2026-10-01T12:00:00Z'});
  r.workspaceCoffees.push({setup_version_id:'version',library_entry_id:id,selected_style:'Turbo',basket_version_id:'basketv',revision:1});
  for(let j=0;j<6;j++)r.shots.push(rawShot({id:'shot-'+c+'-'+j,library_entry_id:id,pulled_at:'2026-10-'+String(10+j)+'T12:00:00Z',bag_id:j===0?'historic-bag':null}));
 }
 const copy=structuredClone(r),state=hydrate(r);
 assert.equal(state.coffees.length,35);assert.equal(state.shots.length,210);
 assert.deepEqual(state.shots.map(x=>x.id),r.shots.map(x=>x.id));
 assert.deepEqual(r,copy);
 assert.equal(state.shots.filter(x=>x.suggestion!==undefined).length,35);
 const queued={status:'pending',action:'save_shot',payload:{id:'queued',setup_id:'setup',setup_version_id:'version',library_entry_id:'coffee-1',basket_version_id:'basketv',style:'Custom',pulled_at:'2026-10-26T12:00:00Z',dose_g:18,yield_g:40,time_s:27,grind_setting:2,feed_mode:'standard',taste:tastes,notes:'Preserve outbox',bag_id:'old-reference'}};
 const rendered=applyPending(state,[queued]);
 assert.equal(rendered.shots.at(-1).style,'Custom');
 assert.equal(rendered.shots.at(-1).bagId,'old-reference');
 assert.equal(queued.payload.bag_id,'old-reference');
});
