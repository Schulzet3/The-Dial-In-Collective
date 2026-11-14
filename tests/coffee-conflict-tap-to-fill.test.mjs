import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 coffeeUrlPreviewMarkup,coffeeUrlCompactPreviewMarkup,applyCoffeeConflictChoice,applyCoffeeSubmittedDifference,
 markCoffeeConflictChoices,markCoffeeSubmittedDifferences,coffeeSourceReviewSnapshot,applyCoffeeUrlFields,applyCoffeeRoastVariant,elevationWithDefaultMeters
} from '../site/cloud/coffee-url-autofill.js';

const url='https://roaster.example.org/products/single-lot';
const mk=(value='',tagName='INPUT',values=[])=>({value,tagName,dataset:{},
 options:values.map(value=>({value})),events:[],dispatchEvent(e){this.events.push(e.type);}});
const makeForm=fields=>({elements:{namedItem:key=>fields[key]||null}});
const choice=(field,options)=>({ok:true,source_url:url,fields:{name:'Single Lot'},conflicts:[field],
 conflict_options:{[field]:options.map((value,i)=>({value,label:'Current product '+(i+1),source_url:url}))}});
test('conflicting sources render accessible touch choices and separate cited sources, never auto-save',()=>{
 const input='<img src=x onerror="alert(1)">';
 const html=coffeeUrlPreviewMarkup(choice('origin',[input,'Colombia']));
 assert.match(html,/data-action="choose-coffee-conflict"/);
 assert.match(html,/data-conflict-field="origin"/);
 assert.match(html,/data-conflict-index="1"/);
 assert.match(html,/aria-pressed="false"/);
 assert.match(html,/type="button"/);
 assert.match(html,/aria-label="Use Colombia for Origin"/);
 assert.match(html,/View Original Source/);
 assert.match(html,/Tap the correct option to autofill, or type a value in the field/);
 assert.doesNotMatch(html,/Review conflicting details|These published readings disagree|Nothing was selected automatically|Nothing is saved until Add Coffee/);
 assert.ok(html.includes('&lt;img'));
 assert.doesNotMatch(html,/<img\b|onerror="/);
 assert.doesNotMatch(html,/data-conflict-value=|data-action="apply-coffee-url"/);
});
test('one explicit tap replaces only the corresponding form value; next tap replaces it again',()=>{
 const fields={origin:mk('Origin typed by member'),roaster:mk('Original roaster'),name:mk('My Name')};
 const form=makeForm(fields),result=choice('origin',['Ethiopia','Colombia']);
 assert.deepEqual(applyCoffeeConflictChoice(form,result,'origin',0),{applied:true,field:'origin',value:'Ethiopia'});
 assert.equal(fields.origin.value,'Ethiopia');assert.equal(fields.roaster.value,'Original roaster');
 assert.deepEqual(applyCoffeeConflictChoice(form,result,'origin',1),{applied:true,field:'origin',value:'Colombia'});
 assert.equal(fields.origin.value,'Colombia');assert.equal(fields.origin.dataset.coffeeConflictChoiceValue,'Colombia');
 assert.deepEqual(fields.origin.events,['change','change']);
 assert.deepEqual(result.fields,{name:'Single Lot'});
 assert.equal(result.conflict_options.origin[0].value,'Ethiopia');
});
test('only preview-offered field/index can be selected; untrusted forged and stale choices do nothing',()=>{
 const fields={origin:mk('manual'),name:mk('My Name')},form=makeForm(fields),result=choice('origin',['Guji','Sidama']);
 for(const [field,index] of [['name',0],['constructor',0],['origin',-1],['origin',99],['origin',NaN],['origin',0.5]]){
  assert.equal(applyCoffeeConflictChoice(form,result,field,index).applied,false);
 }
 assert.equal(applyCoffeeConflictChoice(form,{ok:false,conflicts:['origin']},'origin',0).applied,false);
 assert.equal(fields.origin.value,'manual');assert.equal(fields.name.value,'My Name');
});
test('canonical select maps only unambiguous roast option labels; ambiguous roast is not forced',()=>{
 const fields={roast_level:mk('', 'SELECT',['','Ultra Light','Light','Medium-Light','Medium','Medium-Dark','Dark'])},form=makeForm(fields);
 const result=choice('roast_level',['Coffee_Light Roast','Medium Roast','Light/Medium','Full City']);
 assert.equal(applyCoffeeConflictChoice(form,result,'roast_level',0).value,'Light');
 assert.equal(applyCoffeeConflictChoice(form,result,'roast_level',1).value,'Medium');
 assert.deepEqual(applyCoffeeConflictChoice(form,result,'roast_level',2),{applied:false,reason:'unsupported_option'});
 assert.equal(fields.roast_level.value,'Medium');
 assert.equal(applyCoffeeConflictChoice(form,result,'roast_level',3).value,'Medium-Dark');
});
test('process dropdown unsupported published wording is review-only, not an invented category',()=>{
 const fields={process:mk('', 'SELECT',['','Washed','Natural','Other/Unknown'])},form=makeForm(fields);
 const result=choice('process',['Fully Washed','Natural']);
 assert.deepEqual(applyCoffeeConflictChoice(form,result,'process',0),{applied:false,reason:'unsupported_option'});
 assert.equal(fields.process.value,'');
 assert.equal(applyCoffeeConflictChoice(form,result,'process',1).value,'Natural');
});
test('elevation retains explicit units and approved default meters when source is unitless',()=>{
 const fields={elevation_m:mk('')},form=makeForm(fields);
 const result=choice('elevation_m',['1,300-1,600','4,600 feet']);
 assert.equal(applyCoffeeConflictChoice(form,result,'elevation_m',0).value,'1,300-1,600 m');
 assert.equal(applyCoffeeConflictChoice(form,result,'elevation_m',1).value,'4,600 feet');
 assert.equal(elevationWithDefaultMeters('1,300-1,600'),'1,300-1,600 m');
});
test('pressed state follows explicit local choice and clears when member edits',()=>{
 const fields={origin:mk('')},form=makeForm(fields),result=choice('origin',['Ethiopia','Colombia']);
 const buttons=[0,1].map(i=>({dataset:{conflictField:'origin',conflictIndex:String(i)},
  states:[],setAttribute(name,value){if(name==='aria-pressed')this.states.push(value);}}));
 const panel={querySelectorAll:()=>buttons};
 markCoffeeConflictChoices(panel,form,result);
 assert.equal(buttons[0].states.at(-1),'false');
 applyCoffeeConflictChoice(form,result,'origin',1);
 markCoffeeConflictChoices(panel,form,result);
 assert.equal(buttons[0].states.at(-1),'false');assert.equal(buttons[1].states.at(-1),'true');
 fields.origin.value='Manual correction';
 markCoffeeConflictChoices(panel,form,result);
 assert.equal(buttons[1].states.at(-1),'false');
});
test('one-click normal autofill does not override an explicitly chosen conflict',()=>{
 const fields={origin:mk('')},form=makeForm(fields),conflict=choice('origin',['Ethiopia','Colombia']);
 applyCoffeeConflictChoice(form,conflict,'origin',0);
 assert.deepEqual(applyCoffeeUrlFields(form,{ok:true,fields:{origin:'Kenya'}}),{filled:0,skipped:1});
 assert.equal(fields.origin.value,'Ethiopia');
});
test('delegated action rejects old URL and form, and never issues another preview request',()=>{
 const main=readFileSync(new URL('../site/cloud/main.js',import.meta.url),'utf8');
 const start=main.indexOf("if(a==='choose-coffee-conflict')");
 const end=main.indexOf("if(a==='choose-coffee-roast-variant')",start);
 assert.ok(start>=0&&end>start);
 const handler=main.slice(start,end);
 assert.match(handler,/panel\.contains\(target\)/);
 assert.match(handler,/this\.coffeeUrlPreviewInput!==String\(form\.elements\.source_url\.value/);
 assert.match(handler,/this\.coffeeUrlActivePreview/);
 assert.match(handler,/applyCoffeeConflictChoice\(/);
 assert.match(handler,/markCoffeeConflictChoices\(/);
 assert.match(handler,/updateDecafFields\(form\)/);
 assert.doesNotMatch(handler,/previewCoffeeUrl\(|saveCoffee|mutate\(/);
 const css=readFileSync(new URL('../site/visual.css',import.meta.url),'utf8');
 assert.match(css,/\.coffee-conflict-choice\{[^}]*min-height:44px/);
 assert.match(css,/\.coffee-conflict-choice\[aria-pressed="true"\]/);
});

test('explicitly tapped conflict survives a subsequent roast-variant panel selection',()=>{
 const roast=mk('', 'SELECT',['','Light','Medium-Dark']);
 const form=makeForm({roast_level:roast});
 assert.equal(applyCoffeeConflictChoice(form,choice('roast_level',['Light','Medium-Dark']),'roast_level',0).value,'Light');
 assert.equal(applyCoffeeRoastVariant(form,{fields:{roast_level:'Light'}},{fields:{roast_level:'Medium-Dark'}}),0);
 assert.equal(roast.value,'Light');
 assert.equal(roast.dataset.coffeeConflictChoiceValue,'Light');
});

test('post-add saved and submitted differences require a tap and change only the selected edit field',()=>{
 const fields={origin:mk('Kenya'),process:mk('Natural','SELECT',['','Washed','Natural'])};
 const form=makeForm(fields);
 const differences=[{key:'origin',label:'Origin',current:'Kenya',submitted:'Costa Rica'},
  {key:'process',label:'Process',current:'Natural',submitted:'Washed'}];
 assert.deepEqual(applyCoffeeSubmittedDifference(form,differences,'origin','submitted'),
  {applied:true,field:'origin',value:'Costa Rica',source:'submitted'});
 assert.equal(fields.process.value,'Natural');
 assert.deepEqual(applyCoffeeSubmittedDifference(form,differences,'process','submitted'),
  {applied:true,field:'process',value:'Washed',source:'submitted'});
 assert.equal(applyCoffeeSubmittedDifference(form,differences,'origin','saved').value,'Kenya');
 assert.deepEqual(fields.origin.events,['change','change']);
});
test('post-add taps reject fabricated fields and unsupported dropdown choices; empty saved values can be restored',()=>{
 const fields={origin:mk('Original'),roast_level:mk('Medium','SELECT',['','Light','Medium'])},form=makeForm(fields);
 const diffs=[{key:'origin',current:'',submitted:'Costa Rica'},{key:'roast_level',current:'Medium',submitted:'Custom Dark'}];
 assert.equal(applyCoffeeSubmittedDifference(form,diffs,'name','submitted').applied,false);
 assert.equal(applyCoffeeSubmittedDifference(form,diffs,'origin','not-a-source').applied,false);
 assert.equal(applyCoffeeSubmittedDifference(form,diffs,'roast_level','submitted').reason,'unsupported_option');
 assert.equal(fields.roast_level.value,'Medium');
 assert.equal(applyCoffeeSubmittedDifference(form,diffs,'origin','saved').value,'');
 assert.equal(fields.origin.value,'');
});
test('post-add selected state follows explicit choice, not later manual edits',()=>{
 const fields={origin:mk('Kenya')},form=makeForm(fields);
 const differences=[{key:'origin',current:'Kenya',submitted:'Ethiopia'}];
 const buttons=['saved','submitted'].map(source=>({dataset:{differenceField:'origin',differenceSource:source},
  attrs:[],setAttribute(name,value){this.attrs.push({name,value});}}));
 const panel={querySelectorAll:()=>buttons};
 markCoffeeSubmittedDifferences(panel,form,differences);
 assert.equal(buttons[1].attrs.at(-1).value,'false');
 applyCoffeeSubmittedDifference(form,differences,'origin','submitted');
 markCoffeeSubmittedDifferences(panel,form,differences);
 assert.equal(buttons[1].attrs.at(-1).value,'true');
 fields.origin.value='Member edit';
 markCoffeeSubmittedDifferences(panel,form,differences);
 assert.equal(buttons[1].attrs.at(-1).value,'false');
});
test('preview eliminates repeated details and source-download UI while retaining original evidence',()=>{
 const result={...choice('origin',['Ethiopia','Kenya']),
  fields:{name:'Lot X',roaster:'Roaster X',origin:'Ethiopia',process:'Natural'},
  source_facts:[{label:'Published process',value:'Natural',field:'process',source_url:url,source_type:'html'}],
  roaster_recipe:{ratio:2.5},match:{classification:'needs_confirmation'}};
 const html=coffeeUrlCompactPreviewMarkup(result);
 assert.match(html,/Tap the correct option to autofill, or type a value in the field/);
 assert.match(html,/Roaster's published espresso reference/);
 assert.match(html,/A similar coffee already exists/);
 assert.doesNotMatch(html,/Unverified Page|Official Source Preview|Approved Catalog|coffee-source-label/);
 assert.doesNotMatch(html,/Published source information|Download Source Review|The webpage is not yet a verified official source/);
 assert.doesNotMatch(html,/<dl class="coffee-url-fields">/);
 const snapshot=coffeeSourceReviewSnapshot(result,{checkedAt:'2026-11-14T00:00:00Z'});
 assert.equal(snapshot.published_source_information[0].value,'Natural');
 assert.equal(snapshot.roaster_espresso_reference.ratio,2.5);
});
test('post-add comparison buttons are delegated and never auto-submit',()=>{
 const main=readFileSync(new URL('../site/cloud/main.js',import.meta.url),'utf8');
 const start=main.indexOf("if(a==='choose-coffee-difference')");
 const end=main.indexOf("if(a==='choose-coffee-conflict')",start);
 assert.ok(start>=0&&end>start);
 const handler=main.slice(start,end);
 assert.match(main,/data-action="choose-coffee-difference"/);
 assert.match(main,/coffeeUrlCompactPreviewMarkup\(/);
 assert.doesNotMatch(main,/coffeeUrlPreviewMarkup\(/);
 assert.match(main,/data-difference-field=/);
 assert.match(main,/aria-pressed="false"/);
 assert.match(handler,/panel\.contains\(target\)/);
 assert.match(handler,/applyCoffeeSubmittedDifference\(/);
 assert.doesNotMatch(handler,/mutate\(|submit\(|finishCoffeeAdd\(/);
 const css=readFileSync(new URL('../site/visual.css',import.meta.url),'utf8');
 assert.match(css,/\.coffee-difference-choice\{[^}]*min-height:48px/);
 assert.match(css,/\.coffee-difference-choice\[aria-pressed="true"\]/);
});
