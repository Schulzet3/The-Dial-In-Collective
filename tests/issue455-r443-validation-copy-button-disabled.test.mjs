import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';

// Exercise actual CloudApp Save Shot failure/finally handling without a member,
// browser, network, SQL, or provider mutation.
const root={innerHTML:''},sheet={close(){},querySelector(){return null;}};
globalThis.document={querySelector:s=>s==='#app'?root:sheet};
const {CloudApp}=await import('../site/cloud/main.js');
delete globalThis.document;

async function invalidSave(initialDisabled){
 const app=new CloudApp({},{});
 app.state=hydrate(rawFixture());
 app.logCoffee='coffee';
 app.editing=null;
 const tastes={extraction:3,body:3,sweetness:5,astringency:1}; // clarity intentionally unselected
 app.draft={id:'synthetic-only',doseG:18,yieldG:36,timeS:25,grindSetting:2.5,
  tempC:null,notes:'Original private note (synthetic)',tasteScales:{...tastes}};
 app.readDraft=()=>{};
 const original=structuredClone(app.draft);
 let writes=0;
 app.mutate=async()=>{writes++;throw new Error('No Save write permitted by invalid ratings');};
 const errors=[];
 app.error=e=>errors.push(String(e.message));
 const buttons=[
  {name:'Save Shot',disabled:false},
  {name:'Use Grind',disabled:initialDisabled.includes('grind')},
  {name:'Use Temperature',disabled:initialDisabled.includes('temperature')},
  {name:'Five taste buttons remain selectable',disabled:false}
 ];
 const form={id:'shot',isConnected:false,querySelectorAll(selector){
  assert.equal(selector,'button,input,select,textarea');return buttons;
 }};
 const OriginalFormData=globalThis.FormData;
 globalThis.FormData=class {*[Symbol.iterator](){}};
 try{await app.submit({preventDefault(){},target:form});}
 finally{globalThis.FormData=OriginalFormData;}
 return {app,buttons,original,writes,errors};
}

test('R443 unavailable temperature recommendation stays disabled after incomplete-rating Save',async()=>{
 const f=await invalidSave(['temperature']);
 assert.equal(f.buttons[0].disabled,false);
 assert.equal(f.buttons[1].disabled,false);
 assert.equal(f.buttons[2].disabled,true,'never enable unavailable temperature after validation');
 assert.equal(f.buttons[3].disabled,false,'all five taste controls remain selectable');
 assert.equal(f.writes,0);
 assert.ok(f.errors.some(e=>/rate all five/i.test(e)),String(f.errors));
 assert.deepEqual(f.app.draft,f.original,'ratings, measurements and notes remain intact');
 assert.equal(f.app.busy,false);
});

test('R443 both unavailable copy actions remain unavailable after a failed Save',async()=>{
 const f=await invalidSave(['grind','temperature']);
 assert.equal(f.buttons[1].disabled,true);
 assert.equal(f.buttons[2].disabled,true);
 assert.equal(f.buttons[0].disabled,false);
 assert.equal(f.buttons[3].disabled,false);
 assert.equal(f.writes,0);
 assert.deepEqual(f.app.draft.tasteScales,f.original.tasteScales);
});

test('R443 available copy actions are restored after validation without claiming a successful shot',async()=>{
 const f=await invalidSave([]);
 assert.ok(f.buttons.every(b=>b.disabled===false));
 assert.equal(f.writes,0);
 assert.ok(f.errors.length>0);
 assert.deepEqual(f.app.draft,f.original);
});
