import test from 'node:test';
import assert from 'node:assert/strict';
import {rawFixture,OWNER} from './cloud-fixtures/raw.js';

const root={innerHTML:''},sheet={close(){},querySelector(){return null;}};
globalThis.document={querySelector:selector=>selector==='#app'?root:sheet};
const {CloudApp}=await import('../site/cloud/main.js');
delete globalThis.document;
function fixture(sourceVerified){
 const raw=rawFixture();raw.submissions[0].source_url='https://example.invalid/products/coffee';
 const app=new CloudApp({async verifyCoffeeSource(){return {
  ok:true,status:'verified',...(sourceVerified===undefined?{}:{source_verified:sourceVerified})
 };}},{});
 app.identity={id:OWNER};app.status={admitted:true};app.raw=raw;
 app.render=()=>{};app.sync=async()=>{app.synced=true;};
 app.mutate=async(action,payload)=>{
  assert.equal(action,'submit_coffee');raw.library[0].id=payload.library_entry_id;
 };
 return app;
}
test('source retry distinguishes concurrent catalog approval from official evidence',async()=>{
 for(const flag of [undefined,false,true]){
  const app=fixture(flag);
  await app.click({target:{closest:()=>({dataset:{action:'retry-pending-source',id:'coffee'}})}});
  assert.equal(app.synced,true);
  if(flag===true)assert.match(app.notice,/Official roaster evidence verified/);
  else assert.equal(app.notice,'Coffee is already approved in the shared catalog.');
 }
});
test('new-coffee source check also requires explicit evidence before claiming official verification',async()=>{
 for(const flag of [undefined,false,true]){
  const app=fixture(flag);
  await app.finishCoffeeAdd({name:'Test Coffee',roaster:'Fictional Roaster',
   source_url:'https://example.invalid/products/coffee'},{classification:'new'});
  assert.equal(app.synced,true);
  if(flag===true)assert.match(app.notice,/Official source verified/);
  else assert.equal(app.notice,'Coffee is already approved in the shared catalog.');
 }
});
