import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';

// Exercise the actual CloudApp Save Shot path using only a synthetic in-memory
// promise. No account, provider, SQL, live browser or member data is accessed.
const root={innerHTML:''};
const sheet={closeCount:0,activeShot:null,headerClose:null,
 close(){this.closeCount++;this.activeShot=null;},
 querySelector(selector){return selector==='[data-action="close"]'?this.headerClose:selector==='#shot'?this.activeShot:null;}
};
globalThis.document={querySelector:selector=>selector==='#app'?root:sheet};
const {CloudApp}=await import('../site/cloud/main.js');
delete globalThis.document;

function pendingShot({fail=false}={}){
 const app=new CloudApp({},{});
 app.state=hydrate(rawFixture());
 app.logCoffee='coffee';
 app.editing=null;
 app.draft={
  id:'r444-synthetic',style:'Turbo',basketId:'basketv',
  doseG:18,yieldG:50,timeS:15,grindSetting:2.5,tempC:null,
  feedMode:'standard',tasteScales:{extraction:3,body:3,clarity:5,sweetness:5,astringency:1},
  notes:'Synthetic private notes'
 };
 app.readDraft=()=>{};
 app.render=()=>{};
 const baseline=structuredClone(app.draft);
 let resolve, reject, writes=0,action,payload;
 const gate=new Promise((ok,bad)=>{resolve=ok;reject=bad;});
 app.mutate=async(a,p)=>{writes++;action=a;payload=structuredClone(p);await gate;};
 const errors=[];
 app.error=error=>errors.push(String(error.message));
 const controls=[
  {name:'Save Shot',disabled:false},
  {name:'Rate Extraction',disabled:false},
  {name:'Rate Body',disabled:false},
  {name:'Rate Clarity',disabled:false},
  {name:'Rate Sweetness',disabled:false},
  {name:'Rate Dryness',disabled:false},
  {name:'Copy Grind',disabled:false},
  {name:'Copy Temperature (unavailable)',disabled:true},
  {name:'Dose',disabled:false},
  {name:'Yield',disabled:false},
  {name:'Time',disabled:false},
  {name:'Grind Setting',disabled:false},
  {name:'Brew Temperature',disabled:false},
  {name:'Slow Feed',disabled:false},
  {name:'Private Notes',disabled:false}
 ];
 const attrs={};
 const form={
  id:'shot',isConnected:false,
  querySelectorAll(selector){assert.equal(selector,'button,input,select,textarea');return controls;},
  setAttribute(name,value){attrs[name]=value;},
  removeAttribute(name){delete attrs[name];}
 };
 sheet.activeShot=form;sheet.headerClose={disabled:false};const closeCountBefore=sheet.closeCount;
 const OriginalFormData=globalThis.FormData;
 globalThis.FormData=class {*[Symbol.iterator](){}};
 const task=app.submit({preventDefault(){},target:form})
  .finally(()=>{globalThis.FormData=OriginalFormData;});
 return {app,baseline,controls,attrs,task,errors,writes:()=>writes,action:()=>action,payload:()=>payload,resolve,reject,fail,headerClose:sheet.headerClose,closeCountBefore,closeCount:()=>sheet.closeCount,form};
}

test('R444 in-flight Save freezes all five ratings, all measurements, feed and notes',async()=>{
 const s=pendingShot();
 assert.equal(s.writes(),1,'valid five-rating shot enters a single queued save');
 assert.equal(s.action(),'save_shot');
 assert.ok(s.controls.every(c=>c.disabled),'every form control freezes pending save');
 assert.equal(s.attrs['aria-busy'],'true');
 assert.equal(s.payload().notes,'Synthetic private notes');
 assert.equal(s.payload().feed_mode,'standard');
 assert.deepEqual(s.payload().taste,s.baseline.tasteScales);
 s.resolve();
 await s.task;
 assert.equal(s.app.busy,false);
 assert.equal(s.attrs['aria-busy'],undefined);
 assert.equal(s.controls[7].disabled,true,'unavailable temperature remains disabled');
 assert.ok(s.controls.filter((c,i)=>i!==7).every(c=>!c.disabled),'rating and original controls restored');
 assert.deepEqual(s.app.draft,s.baseline,'saved source measurements and ratings unchanged');
 assert.equal(s.errors.length,0);
});

test('R444 failed asynchronous Save restores previous controls and original draft',async()=>{
 const s=pendingShot({fail:true});
 assert.ok(s.controls.every(c=>c.disabled));
 s.reject(new Error('Synthetic network outage'));
 await s.task;
 assert.equal(s.writes(),1);
 assert.deepEqual(s.errors,['Synthetic network outage']);
 assert.equal(s.app.busy,false);
 assert.equal(s.attrs['aria-busy'],undefined);
 assert.equal(s.controls[7].disabled,true);
 assert.ok(s.controls.filter((c,i)=>i!==7).every(c=>!c.disabled));
 assert.deepEqual(s.app.draft,s.baseline,'member retains five ratings, measurements and notes for retry');
});

function clickHeaderClose(app){
 return app.click({target:{closest(selector){return selector==='[data-action]'?{dataset:{action:'close'}}:null;}}});
}

test('R451 Save Shot locks header Close and preserves its pending draft',async()=>{
 const s=pendingShot();
 assert.equal(s.headerClose.disabled,true,'header Close outside #shot must be locked');
 await clickHeaderClose(s.app);
 assert.equal(s.closeCount(),s.closeCountBefore,'pending Save must not dismiss the draft');
 assert.equal(sheet.activeShot,s.form,'original in-flight form stays open');
 assert.equal(s.writes(),1);
 s.resolve();await s.task;
 assert.equal(s.closeCount(),s.closeCountBefore+1,'successful Save closes once');
 assert.equal(s.headerClose.disabled,false,'header Close restored');
 assert.equal(s.app.justSavedId,s.baseline.id);
 assert.deepEqual(s.app.draft,s.baseline,'five tastes and private notes unchanged');
 assert.equal(s.errors.length,0);
});

test('R451 failed Save restores header Close and retains five ratings for retry',async()=>{
 const s=pendingShot({fail:true});
 assert.equal(s.headerClose.disabled,true);
 await clickHeaderClose(s.app);
 assert.equal(s.closeCount(),s.closeCountBefore);
 s.reject(new Error('Synthetic deferred save failure'));
 await s.task;
 assert.equal(s.headerClose.disabled,false);
 assert.deepEqual(s.errors,['Synthetic deferred save failure']);
 assert.deepEqual(s.app.draft,s.baseline);
 assert.equal(s.closeCount(),s.closeCountBefore,'failed Save leaves draft open');
 await clickHeaderClose(s.app);
 assert.equal(s.closeCount(),s.closeCountBefore+1,'Close works again after failure');
});
