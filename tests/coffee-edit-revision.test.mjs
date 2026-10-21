import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';

const root={innerHTML:''},sheet={close(){},querySelector(){return null;}};
globalThis.document={querySelector:selector=>selector==='#app'?root:sheet};
const {CloudApp}=await import('../site/cloud/main.js');
delete globalThis.document;
function fixture(canonical=true){
 const raw=rawFixture();raw.submissions[0].revision=2;
 raw.submissions[0].source_url='https://example.invalid/products/original';
 if(canonical){
  raw.library[0].coffee_id='canonical';raw.submissions[0].status='approved';raw.submissions[0].canonical_coffee_id='canonical';
  raw.coffees=[{id:'canonical',name:'Corrected Coffee Name',roaster:'Corrected Roaster',origin:'New origin',revision:7}];
 }
 const app=new CloudApp({},{});app.raw=raw;app.state=hydrate(raw);
 app.show=(title,html)=>{app.shown={title,html};};return {app,raw};
}
const value=(html,name)=>html.match(new RegExp('name="'+name+'"[^>]*value="([^"]*)"'))?.[1];
test('new canonical correction uses current shared facts and canonical revision rather than original submission',()=>{
 const f=fixture();f.app.showEditCoffee('coffee');
 assert.equal(f.app.editCoffeeRevision,7);assert.equal(f.app.shown.title,'Suggest Coffee Corrections');
 assert.equal(value(f.app.shown.html,'name'),'Corrected Coffee Name');assert.equal(value(f.app.shown.html,'origin'),'New origin');
 assert.equal(value(f.app.shown.html,'source_url'),'https://example.invalid/products/original');
});
test('existing pending correction retains its own revision and intentional empty source URL',()=>{
 const f=fixture();f.raw.submissions.push({id:'correction',canonical_coffee_id:'canonical',status:'pending',revision:11,
  updated_at:'2026-10-21T01:00:00Z',source_url:null,proposed_data:{name:'Owner Correction',roaster:'Corrected Roaster'}});
 f.app.showEditCoffee('coffee');
 assert.equal(f.app.editCoffeeRevision,11);assert.equal(value(f.app.shown.html,'name'),'Owner Correction');
 assert.equal(value(f.app.shown.html,'source_url'),'');
});
test('correction selection uses the same timestamp and ID ordering as the server',()=>{
 const f=fixture();f.raw.submissions.push(...['a','b'].map((id,i)=>({id,canonical_coffee_id:'canonical',status:'pending',revision:10+i,
  updated_at:'2026-10-21T01:00:00Z',proposed_data:{name:'Correction '+id,roaster:'Roaster'}})));
 f.app.showEditCoffee('coffee');assert.equal(f.app.editCoffeeRevision,11);assert.equal(value(f.app.shown.html,'name'),'Correction b');
});
test('unapproved private submission continues to use its own facts and revision',()=>{
 const f=fixture(false);f.app.showEditCoffee('coffee');
 assert.equal(f.app.editCoffeeRevision,2);assert.equal(f.app.shown.title,'Edit Coffee Details');
 assert.equal(value(f.app.shown.html,'name'),'Test Coffee');
});
