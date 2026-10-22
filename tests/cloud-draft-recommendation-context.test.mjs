import test from 'node:test';
import assert from 'node:assert/strict';
import {rawFixture,rawShot,OWNER} from './cloud-fixtures/raw.js';
import {hydrate} from '../site/cloud/mapping.js';
import * as E from '../site/lib/engine.js';
import * as M from '../site/lib/model.js';
import {recipeGrid} from '../site/lib/ui.js';

let form;
const reference={innerHTML:''};
const sheet={
 close(){},
 querySelector(selector){
  if(selector==='#shot')return form;
  if(selector==='#log-reference')return reference;
  const name=selector.match(/^\[name=(\w+)\]$/)?.[1];
  return name?form.elements[name]:null;
 }
};
globalThis.document={
 querySelector:selector=>selector==='#sheet'?sheet:{},
 createElement:()=>({setAttribute(){},addEventListener(){},replaceChildren(){}}),
 body:{append(){}}
};
const {CloudApp}=await import('../site/cloud/main.js');
delete globalThis.document;

function bindForm(draft){
 const elements={};
 for(const key of ['doseG','yieldG','timeS','grindSetting','notes'])elements[key]={value:String(draft[key]??'')};
 elements.temperature={value:draft.tempC==null?'':String(draft.tempC)};
 elements.slowFeed={checked:draft.feedMode==='slow'};
 form={elements};
 reference.innerHTML='';
}
async function firstShotFixture(){
 const raw=rawFixture();
 raw.workspaceCoffees[0].selected_style='Traditional';
 Object.assign(raw.setupPreferences[0],{track_temperature:true,track_slow_feed:true,temperature_unit:'C'});
 const app=new CloudApp({},{});
 app.identity={id:OWNER};app.status={admitted:true};app.raw=raw;app.state=hydrate(raw);
 app.show=()=>{};app.error=error=>{throw error;};
 let attempts=0;
 app.mutate=async action=>{assert.equal(action,'set_style');attempts++;throw new Error('Connection interrupted');};
 await app.startFirstShot('coffee',{querySelector:()=>({value:'Turbo'})});
 assert.equal(attempts,1);
 assert.equal(M.coffeeState(app.state,'coffee').style,'Traditional');
 assert.equal(app.draft.style,'Turbo');
 bindForm(app.draft);
 return {app,raw};
}
function click(app,action){
 const target={dataset:{action}};
 return app.click({target:{closest:()=>target}});
}
test('Use Recommendation keeps the selected first-shot style when its preference save fails',async()=>{
 const {app}=await firstShotFixture();
 const wanted=E.recommendation(app.state,'coffee',{style:'Turbo',basketId:app.draft.basketId,feedMode:'standard'});
 const stale=E.recommendation(app.state,'coffee',{feedMode:'standard'});
 assert.notEqual(wanted.grind.value,stale.grind.value,'fixture distinguishes the two styles');
 await click(app,'use-grind');
 assert.equal(Number(form.elements.grindSetting.value),wanted.grind.value);
 assert.equal(Number(app.draft.grindSetting),wanted.grind.value);
 assert.equal(app.draft.style,'Turbo');
 assert.equal(M.coffeeState(app.state,'coffee').style,'Traditional','using a suggestion must not rewrite the saved workspace');
});
test('Slow Feed refresh keeps the open draft style and basket instead of the persisted workspace choice',async()=>{
 const {app}=await firstShotFixture();
 M.activeVersion(app.state).baskets.push({id:'draft-basket',doseG:22,name:'22 g basket',archived:false});
 app.draft.basketId='draft-basket';
 form.elements.slowFeed.checked=true;
 const wanted=E.recommendation(app.state,'coffee',{style:'Turbo',basketId:'draft-basket',feedMode:'slow'});
 const stale=E.recommendation(app.state,'coffee',{feedMode:'slow'});
 assert.notEqual(wanted.style,stale.style);
 assert.notEqual(wanted.doseG,stale.doseG);
 app.change({target:{name:'slowFeed'}});
 assert.equal(reference.innerHTML,recipeGrid(wanted,true,'C'));
 assert.equal(app.draft.style,'Turbo');
 assert.equal(app.draft.basketId,'draft-basket');
 assert.equal(app.draft.feedMode,'slow');
});
test('temperature recommendation uses the retained draft style after newer history is hydrated',async()=>{
 const {app,raw}=await firstShotFixture();
 raw.shots=[
  rawShot({id:'traditional-history',style:'Traditional',temperature_c:91,feed_mode:'standard',personal_family_id:null}),
  rawShot({id:'turbo-history',style:'Turbo',temperature_c:96,feed_mode:'standard',personal_family_id:null})
 ];
 app.state=hydrate(raw);
 const wanted=E.recommendation(app.state,'coffee',{style:'Turbo',basketId:app.draft.basketId,feedMode:'standard'});
 assert.equal(wanted.tempC,96);
 assert.equal(E.recommendation(app.state,'coffee',{feedMode:'standard'}).tempC,91);
 await click(app,'use-temp');
 assert.equal(Number(form.elements.temperature.value),96);
 assert.equal(app.draft.tempC,96);
 assert.equal(app.draft.style,'Turbo');
});

async function submitDose({dose,editing=false,confirm=true}){
 const {app}=await firstShotFixture();
 const version=M.activeVersion(app.state);
 version.baskets.push({id:'draft-basket',doseG:22,name:'22 g basket',archived:false});
 Object.assign(app.draft,{basketId:'draft-basket',doseG:dose,yieldG:60,timeS:18,grindSetting:3,
  tasteScales:{extraction:3,body:3,clarity:5,sweetness:5,astringency:1}});
 if(editing)app.editing={...app.draft,id:app.draft.id,revision:7,basketId:'historical-basket',
  snapshot:{basketDoseG:20,tempUnit:'C'}};
 bindForm(app.draft);
 const buttons=[{disabled:false}];
 Object.assign(form,{id:'shot',querySelectorAll:()=>buttons});
 const writes=[],warnings=[];
 app.mutate=async(action,payload)=>{writes.push({action,payload});};
 app.render=()=>{};
 const previousFormData=globalThis.FormData,previousConfirm=globalThis.confirm;
 globalThis.FormData=class {
  constructor(source){this.source=source;}
  *[Symbol.iterator](){for(const [key,element] of Object.entries(this.source.elements))yield [key,element.value??''];}
 };
 globalThis.confirm=message=>{warnings.push(message);return confirm;};
 try{await app.submit({preventDefault(){},target:form});}
 finally{
  globalThis.FormData=previousFormData;
  if(previousConfirm===undefined)delete globalThis.confirm;else globalThis.confirm=previousConfirm;
 }
 assert.equal(app.busy,false);
 assert.equal(buttons[0].disabled,false);
 return {app,writes,warnings};
}
test('matching new-shot dose does not warn when the workspace basket differs',async()=>{
 const matching=await submitDose({dose:22});
 assert.equal(matching.warnings.length,0,'22 g matches the draft basket, despite the workspace 18 g choice');
 assert.equal(matching.writes.length,1);
 assert.equal(matching.writes[0].payload.basket_version_id,'draft-basket');
 assert.equal(matching.writes[0].payload.dose_g,22);
});
test('new-shot dose outside the draft basket warns even when it matches the workspace basket',async()=>{
 const outside=await submitDose({dose:18,confirm:false});
 assert.equal(outside.warnings.length,1,'18 g is outside the draft basket even though it matches the workspace choice');
 assert.match(outside.warnings[0],/22\.0 g reference/);
 assert.equal(outside.writes.length,0,'declining the warning preserves the draft without submitting');
 assert.equal(outside.app.draft.basketId,'draft-basket');
});
test('draft basket dose confirmation retains the strict greater-than-one-gram boundary',async()=>{
 for(const dose of [21,23]){
  const result=await submitDose({dose});
  assert.equal(result.warnings.length,0,`${dose} g differs by exactly 1 g`);
  assert.equal(result.writes.length,1);
 }
 for(const dose of [20.9,23.1]){
  const result=await submitDose({dose});
  assert.equal(result.warnings.length,1,`${dose} g differs by more than 1 g`);
  assert.match(result.warnings[0],/22\.0 g reference/);
  assert.equal(result.writes.length,1,'accepting the advisory permits submission');
 }
});
test('edited-shot dose confirmation still uses the historical snapshot, not either current basket',async()=>{
 for(const dose of [19,20,21]){
  const result=await submitDose({dose,editing:true});
  assert.equal(result.warnings.length,0,`${dose} g is within 1 g of the original 20 g snapshot`);
  assert.equal(result.writes.length,1);
  assert.equal(result.writes[0].payload.expected_revision,7);
  assert.equal('basket_version_id' in result.writes[0].payload,false,'editing does not rewrite historical basket identity');
 }
 const outside=await submitDose({dose:22,editing:true,confirm:false});
 assert.equal(outside.warnings.length,1,'a 22 g draft basket cannot replace the original 20 g snapshot');
 assert.match(outside.warnings[0],/20\.0 g reference/);
 assert.equal(outside.writes.length,0);
});
