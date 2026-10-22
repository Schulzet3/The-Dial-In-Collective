import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setImmediate as tick} from 'node:timers/promises';
import vm from 'node:vm';
import {isAccessDenied} from '../site/cloud/client.js';
import {e} from '../site/lib/ui.js';

const source=readFileSync(new URL('../site/admin/main.js',import.meta.url),'utf8')
 .replace(/^import .*?;\n/gm,'').replace(/start\(\);\s*$/,'globalThis.started=start();');
const ID='00000000-0000-4000-8000-000000000001';
const URL_A='https://example.invalid/products/original';
function deferred(){let resolve;const promise=new Promise(done=>resolve=done);return {promise,resolve};}
async function boot({deferPreview=false}={}){
 const events={},calls=[],previewStarted=deferred(),previewReply=deferred();
 const controls=[
  {name:'name',value:'Canonical Coffee',readOnly:true},
  {name:'roaster',value:'Original Roaster',readOnly:true},
  {name:'release_label',value:'',readOnly:true},
  {name:'origin',value:''},{name:'process',value:'Washed'},
  {name:'variety',value:'',disabled:true},
  {name:'source_url',value:URL_A}
 ];
 const fields=Object.fromEntries(controls.map(field=>[field.name,field]));
 controls.namedItem=name=>fields[name];
 const form={dataset:{id:ID,type:'approved',revision:'4'},elements:controls,hidden:false,isConnected:true,
  matches:selector=>selector==='[data-record-form]'};
 const actionNotice={textContent:''};
 const root={innerHTML:'',addEventListener:(name,handler)=>{events[name]=handler;},
  querySelector:selector=>selector==='#admin-action-notice'?actionNotice:null,
  querySelectorAll:selector=>selector==='[data-record-form]'?[form]:[],
  contains:item=>item===form};
 const sdk={
  auth:{onAuthStateChange(){},async getUser(){return {data:{user:{id:ID}}};},
   async getSession(){return {data:{session:{access_token:'synthetic-preview-token'}}};}},
  from(){return {select:()=>({eq:()=>({async maybeSingle(){return {data:null};}})})};},
  async rpc(name,args){
   calls.push({name,args});
   if(name==='dic_session_status')return {data:{authenticated:true,admitted:true,admin:true}};
   if(name==='dic_admin_records')return {data:{items:[],total:0,offset:args.p_offset}};
   if(name==='dic_admin_edit_coffee')return {data:{ok:true,revision:5,audited:true}};
   return {data:{}};
  }
 };
 const preview={ok:true,fields:{release_label:'2026 Harvest',origin:'Kenya',process:'Natural',variety:'Bourbon'}};
 const context=vm.createContext({document:{querySelector:()=>root},supabase:{createClient:()=>sdk},
  CLOUD_CONFIG:{enabled:true},secureOrigin(){},isAccessDenied,e,applyAppearance(){},readAppearance:()=> 'light',
  renderAdminDashboard:()=> 'Admin fixture',renderAdminDenied:()=> 'Access denied',confirm:()=>{throw Error('Unapproved extra confirmation');},
  fetch:async()=>{
   previewStarted.resolve();
   if(deferPreview)await previewReply.promise;
   return {ok:true,async json(){return preview;}};
  }});
 vm.runInContext(source,context);await context.started;
 return {fields,form,calls,actionNotice,previewStarted:previewStarted.promise,releasePreview:()=>previewReply.resolve(),
  preview(){events.click({target:{closest:()=>({dataset:{action:'extract-coffee-url',id:ID}})}});},
  save(){events.submit({target:form,preventDefault(){}});}};
}
test('approved coffee preview preserves readonly identity and typed facts while enriching editable blanks',async()=>{
 const f=await boot();f.preview();await tick();
 assert.equal(f.fields.release_label.value,'','unknown immutable release must not be inferred into the saved identity');
 assert.equal(f.fields.variety.value,'','disabled fields are not enrichment targets');
 assert.equal(f.fields.origin.value,'Kenya');
 assert.equal(f.fields.process.value,'Washed','typed existing facts are not replaced');
 f.save();await tick();
 const saved=f.calls.find(call=>call.name==='dic_admin_edit_coffee');
 assert.ok(saved);assert.equal(saved.args.p_expected_revision,4);
 assert.equal(saved.args.p_reason,'');assert.equal(Object.hasOwn(saved.args.p_details,'reason'),false);
 assert.equal(saved.args.p_details.name,'Canonical Coffee');
 assert.equal(saved.args.p_details.roaster,'Original Roaster');
 assert.equal(saved.args.p_details.release_label,'');
 assert.equal(saved.args.p_details.origin,'Kenya');
 assert.equal(saved.args.p_details.process,'Washed');
});
test('a preview response for an earlier source URL cannot populate the replacement draft',async()=>{
 const f=await boot({deferPreview:true});f.preview();await f.previewStarted;
 f.fields.source_url.value='https://example.invalid/products/replacement';
 f.releasePreview();await tick();
 assert.equal(f.fields.origin.value,'');
 assert.equal(f.fields.release_label.value,'');
 assert.equal(f.fields.source_url.value,'https://example.invalid/products/replacement');
 assert.equal(f.calls.some(call=>call.name==='dic_admin_edit_coffee'),false);
});
