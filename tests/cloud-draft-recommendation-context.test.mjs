import test from 'node:test';
import assert from 'node:assert/strict';
import {rawFixture,rawShot,OWNER} from './cloud-fixtures/raw.js';
import {hydrate} from '../site/cloud/mapping.js';
import * as E from '../site/lib/engine.js';
import * as M from '../site/lib/model.js';
import {recipeGrid} from '../site/lib/ui.js';
import {basketDoseAdvisory} from '../site/cloud/dose-advisory.js';

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
test('new shot more than 2 g from selected basket provides nonblocking guidance',async()=>{
 const result=await submitDose({dose:18,confirm:false});
 assert.equal(result.warnings.length,0,'basket advice may not invoke blocking confirm');
 assert.equal(result.writes.length,1,'shot must still save');
 assert.match(basketDoseAdvisory(18,22),/22[.]0 g reference/);
 assert.equal(result.app.draft.basketId,'draft-basket');
});
test('exactly two grams is within tolerance and over two is advisory',async()=>{
 for(const dose of [20,21,22,23,24]){
  assert.equal(basketDoseAdvisory(dose,22),null);
  const r=await submitDose({dose,confirm:false});
  assert.equal(r.warnings.length,0);assert.equal(r.writes.length,1);
 }
 for(const dose of [19.9,24.1]){
  assert.match(basketDoseAdvisory(dose,22),/more than 2 g/);
  const r=await submitDose({dose,confirm:false});
  assert.equal(r.warnings.length,0);assert.equal(r.writes.length,1);
 }
});
test('editing historical shots never repeats basket advice or changes historical basket identity',async()=>{
 for(const dose of [17,18,20,22,27]){
  assert.equal(basketDoseAdvisory(dose,20,{editing:true}),null);
  const r=await submitDose({dose,editing:true,confirm:false});
  assert.equal(r.warnings.length,0);assert.equal(r.writes.length,1);
  assert.equal(r.writes[0].payload.expected_revision,7);
  assert.equal('basket_version_id' in r.writes[0].payload,false);
 }
});
