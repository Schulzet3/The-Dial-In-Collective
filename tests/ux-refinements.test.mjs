import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {hydrate} from '../site/cloud/mapping.js';
import {patchAcknowledgement} from '../site/cloud/cache.js';
import {shotCard,feedLabel} from '../site/cloud/shot_card.js';
import {shotSummary,recipeGrid,nextShotAdjustment,nextShotGuidance,nextShotTitle} from '../site/lib/ui.js';
import * as E from '../site/lib/engine.js';
import {rawFixture,rawShot,OWNER,TIME} from './cloud-fixtures/raw.js';

test('Slow Feed defaults remain independent between home and office',()=>{
 const raw=rawFixture();
 raw.setups.push({...raw.setups[0],id:'office',name:'Office',active_version_id:'office-version'});
 raw.versions.push({...raw.versions[0],id:'office-version',setup_id:'office'});
 raw.calibrations.push({...raw.calibrations[0],id:'office-cal',setup_id:'office'});
 raw.baskets.push({...raw.baskets[0],id:'office-basket',setup_id:'office'});
 raw.basketVersions.push({...raw.basketVersions[0],id:'office-basketv',setup_id:'office',basket_id:'office-basket'});
 raw.setupPreferences[0].track_slow_feed=true;raw.setupPreferences[0].slow_feed=true;
 raw.setupPreferences.push({...raw.setupPreferences[0],setup_id:'office',setup_version_id:'office-version',calibration_id:'office-cal',default_basket_version_id:'office-basketv',slow_feed:false});
 const state=hydrate(raw);
 assert.equal(E.prefill(state,'coffee').feedMode,'slow');
 state.activeSetupId='office';assert.equal(E.prefill(state,'coffee').feedMode,'standard');
 state.activeSetupId='setup';assert.equal(E.prefill(state,'coffee').feedMode,'slow');
});

test('cloud-acknowledged new shot updates cached feed; editing an old shot does not',()=>{
 const raw=rawFixture();raw.setupPreferences[0].track_slow_feed=true;
 const sh=rawShot({feed_mode:'slow',pulled_at:'2026-10-14T18:00:00Z'});
 const next=patchAcknowledgement(raw,{owner:OWNER,action:'save_shot',payload:{},createdAt:sh.pulled_at},{record:sh});
 assert.equal(next.setupPreferences[0].slow_feed,true);
 assert.equal(next.setupPreferences[0].last_feed_shot_at,sh.pulled_at);
 assert.equal(E.prefill(hydrate(next),'coffee').feedMode,'slow');
 const edited=patchAcknowledgement(next,{owner:OWNER,action:'save_shot',payload:{expected_revision:2}},{record:{...sh,feed_mode:'standard'}});
 assert.equal(edited.setupPreferences[0].slow_feed,true);
 assert.equal(raw.setupPreferences[0].slow_feed,false);
});
test('stale offline shots cannot roll back the newer default',()=>{
 const raw=rawFixture();raw.setupPreferences[0].track_slow_feed=true;
 raw.setupPreferences[0].slow_feed=false;raw.setupPreferences[0].last_feed_shot_at='2026-10-14T18:00:00Z';
 const stale=rawShot({feed_mode:'slow',pulled_at:'2026-10-14T17:00:00Z'});
 const next=patchAcknowledgement(raw,{owner:OWNER,action:'save_shot',payload:{}},{record:stale});
 assert.equal(next.setupPreferences[0].slow_feed,false);
});
test('shot history is compact and equipment context only appears at bottom when expanded',()=>{
 const raw=rawFixture();raw.shots=[rawShot({feed_mode:'slow'})];
 const sh=hydrate(raw).shots[0],html=shotCard(sh,{expanded:true,activeVersionId:'version'});
 assert.ok(html.indexOf('Test Home')>html.indexOf('class="radar"'));
 assert.match(html,/class="shot-topline"/);
 assert.match(html,/class="shot-date">\d{1,2}\/\d{1,2}\/\d{4}<\/span>/);
 assert.ok(html.indexOf('18 g')>html.indexOf('class="radar"'));
 assert.doesNotMatch(shotCard(sh,{expanded:false,activeVersionId:'version'}),/Test Home|Basket Dose/);
 assert.ok(html.indexOf('Slow Feed')>html.indexOf('class="radar"'));
 assert.ok(html.indexOf('data-action="edit"')<html.indexOf('data-action="make-current"'));
 assert.ok(html.indexOf('data-action="edit"')>html.indexOf('class="shot-record-context"'));
 assert.doesNotMatch(shotCard(sh,{expanded:false,activeVersionId:'version'}),/data-action="edit"/);
 assert.match(html,/class="shot-actions"/);
 assert.match(html,/class="primary compact history-edit" data-action="edit"/);
 assert.match(html,/class="ghost compact history-make-current" data-action="make-current"/);
 assert.match(html,/class="shot-actions"/);
 assert.doesNotMatch(shotCard(sh,{expanded:true,activeVersionId:'other'}),/data-action="make-current"/);
 assert.equal(feedLabel(null),'Feed Not Recorded');
});
test('new successful shots adjust recommendation windows without Make Current',()=>{
 const raw=rawFixture();
 raw.families=[{id:'family',library_entry_id:'coffee',style:'Turbo',statistics:{ratio:{center:2.77}},created_at:TIME}];
 raw.shots=[rawShot({id:'shot-a',feed_mode:'standard',pulled_at:TIME}),rawShot({id:'shot-b',feed_mode:'standard',pulled_at:'2026-10-02T12:00:00Z',yield_g:52,time_s:24})];
 const rec=E.recommendation(hydrate(raw),'coffee');
 assert.equal(rec.observations,2);
 assert.equal(rec.established,true);
 assert.ok(rec.yield.center>=50&&rec.yield.center<=52);
 assert.ok(rec.time.center>=22&&rec.time.center<=24);
});
test('rename_setup acknowledgement only updates the setup display record',()=>{
 const raw=rawFixture(),updated={...raw.setups[0],name:'Office espresso',revision:2};
 const next=patchAcknowledgement(raw,{action:'rename_setup',owner:OWNER,payload:{setup_id:'setup'}},{record:updated});
 assert.equal(next.setups[0].name,'Office espresso');
 assert.equal(next.versions[0].machine_model,'Test machine');
 assert.equal(raw.setups[0].name,'Test Home');
});
test('Settings follows approved sections and removes routine Recovery UI',async()=>{
 const main=await readFile(new URL('../site/cloud/main.js',import.meta.url),'utf8');
 const settings=main.slice(main.indexOf(' settings(){'),main.indexOf(' showSetup(){'));
 assert.doesNotMatch(settings,/recovery-options|import-backup|settings-recovery/);
 assert.match(settings,/button\('Rename','rename-setup'/);
 for(const [a,b] of [['Active Setup','Add Another Setup'],['Add Another Setup','Advanced Setup Options'],['Admin Dashboard','Cloud Sync Details'],['Cloud Sync Details','Sign Out On This Device']])assert.ok(settings.indexOf(a)<settings.indexOf(b));
 assert.match(settings,/settings-signout/);
});

test('shot summary labels Grind in Title Case without altering notes',()=>{
 assert.match(shotSummary({doseG:18,yieldG:50,timeS:22,grindSetting:1.3}),/Grind 1\.3/);
 assert.doesNotMatch(shotSummary({doseG:18,yieldG:50,timeS:22,grindSetting:1.3}),/ grind /);
});
test('unproven grinder range is shown with a single suggested starting center',()=>{
 const raw=rawFixture(),s=hydrate(raw),rec=E.recommendation(s,'coffee');
 assert.ok(rec.grind.range,'starting grind should be a band');
 const html=recipeGrid(rec);
 assert.match(html,/Try [0-9]/);
 assert.match(html,/Grind/);
});


test('New Setup keeps grinder range copy behind an accessible lowercase i control',async()=>{
 const main=await readFile(new URL('../site/cloud/main.js',import.meta.url),'utf8');
 const form=main.slice(main.indexOf(' showSetup(){'),main.indexOf(' showRenameSetup('));
 const css=await readFile(new URL('../site/visual.css',import.meta.url),'utf8');
 assert.match(form,/Grinder Espresso Range/);
 assert.match(form,/data-action="grinder-range-info"/);
 assert.match(form,/aria-label="About Grinder Espresso Range"/);
 assert.match(form,/aria-expanded="false" aria-controls="grinder-range-description"/);
 assert.match(form,/id="grinder-range-description" hidden/);
 assert.match(form,/Enter the range of grind settings you would normally use for espresso, not the grinder's entire adjustment range\./);
 assert.match(form,/aria-hidden="true">i<\/span>/);
 for(const name of ['finest_setting','coarsest_setting']){
  assert.match(form,new RegExp("field\\('"+(name==='finest_setting'?'Finest':'Coarsest')+" Espresso Setting','"+name+"'"));
 }
 assert.match(main,/if\(a==='grinder-range-info'\|\|a==='next-shot-info'\)\{/);
 assert.match(main,/description\.hidden=!description\.hidden;/);
 assert.match(main,/target\.setAttribute\('aria-expanded',String\(!description\.hidden\)\)/);
 assert.match(css,/\.inline-info-button:focus-visible/);
 assert.match(css,/#new-setup \.grinder-range-description\[hidden\]\{display:none\}/);
});

test('approved Option A arrow with i disclosure preserves prior setup helper',async()=>{
 const main=await readFile(new URL('../site/cloud/main.js',import.meta.url),'utf8');
 const css=await readFile(new URL('../site/visual.css',import.meta.url),'utf8');
 assert.match(main,/next-shot-label">\$\{advice\.next\?\x27Next Shot Recommendation\x27:\x27Shot Feedback\x27\}/);
 assert.match(main,/class="inline-info-button" data-action="next-shot-info"/);
 assert.match(main,/\$\{advice\.next\?`<button type="button"/);
 assert.match(main,/data-action="next-shot-info"/);
 assert.match(main,/aria-expanded="false" aria-controls="next-shot-info-\$\{e\(c\.id\)\}"/);
 assert.match(main,/\$\{advice\.next\?`<p class="next-shot-info-text helper" id="next-shot-info-\$\{e\(c\.id\)\}" hidden/);
 assert.match(main,/if\(a==='grinder-range-info'\|\|a==='next-shot-info'\)/);
 assert.match(main,/Changing only one setting helps isolate its effect/);
 assert.doesNotMatch(main,/One adjustment at a time/);
 assert.match(css,/\.inline-info-button:focus-visible/);
 assert.match(css,/\.feedback-panel \.next-shot-arrow/);
 assert.doesNotMatch(css,/\.grinder-range-info-button/);
});
test('single grind adjustment shows the actual arrow and unchanged variables',()=>{
 const shot={doseG:18,yieldG:40,grindSetting:2.5,tempC:93};
 const advice={title:'Try a little finer',text:'Try grind 2.4. Keep dose and yield similar, then taste again.',next:{grindSetting:2.4,yieldCenter:40}};
 assert.equal(nextShotTitle(advice),'Try grinding slightly finer');
 assert.deepEqual(nextShotAdjustment(advice,shot,true,'C'),{label:'Grind',before:'2.5',after:'2.4',unit:'',keep:'dose, yield, and temperature'});
 const html=nextShotGuidance(advice,shot,true,'C');
 assert.match(html,/2\.5<\/span>/);
 assert.match(html,/2\.4<\/span>/);
 assert.match(html,/next-shot-arrow/);
 assert.match(html,/Keep dose, yield, and temperature unchanged\./);
 assert.match(nextShotGuidance(advice,{...shot,tempC:null},true,'C'),/Keep dose and yield unchanged\./);
 assert.doesNotMatch(html,/One adjustment at a time|Time.*unchanged/);
});
test('yield and temperature arrows follow measurement units',()=>{
 const shot={doseG:18,yieldG:40,grindSetting:2.5,tempC:93};
 const yieldHtml=nextShotGuidance({text:'A longer yield',next:{grindSetting:2.5,yieldCenter:42}},shot,true,'C');
 assert.match(yieldHtml,/40\.0.*42\.0/);
 assert.match(yieldHtml,/next-shot-unit">g/);
 assert.match(yieldHtml,/Keep dose, grind, and temperature unchanged/);
 const tempHtml=nextShotGuidance({text:'Cooler',next:{grindSetting:2.5,yieldCenter:40,tempC:92}},shot,true,'F');
 assert.match(tempHtml,/199.*198/);
 assert.match(tempHtml,/°F/);
 assert.match(tempHtml,/Keep dose, grind, and yield unchanged/);
});
test('multi-change, unknown, prep, and successful shots never invent an arrow',()=>{
 const shot={doseG:18,yieldG:40,grindSetting:2.5,tempC:null};
 const mixed={text:'Try a different recipe.',next:{grindSetting:2.4,yieldCenter:42}};
 assert.equal(nextShotAdjustment(mixed,shot),null);
 assert.doesNotMatch(nextShotGuidance(mixed,shot),/next-shot-arrow/);
 assert.match(nextShotGuidance(mixed,shot),/Try a different recipe/);
 assert.equal(nextShotAdjustment({next:{tempC:92}},shot,true,'F'),null);
 assert.equal(nextShotAdjustment({next:{grindSetting:2.4,flowMode:'slow'}},shot),null);
 assert.match(nextShotGuidance({text:'Focus on distribution.',next:{grindSetting:2.5,yieldCenter:40}},shot),/Focus on distribution/);
 assert.match(nextShotGuidance({text:'Dialed in.',next:null},shot),/Dialed in/);
 assert.equal(nextShotTitle({title:'Try a little coarser'}),'Try grinding slightly coarser');
});
test('evenness advice isolates distribution instead of adjusting tamp too',()=>{
 const s=hydrate(rawFixture());
 const shot={coffeeId:'coffee',setupVersionId:'version',basketId:'basketv',calibrationId:'cal',
  style:'Turbo',feedMode:'standard',doseG:18,yieldG:40,timeS:21,grindSetting:2.5,
  tasteScales:{extraction:2,body:3,clarity:1,sweetness:3,astringency:1}};
 const advice=E.nextAdvice(s,shot,E.recommendation(s,'coffee'));
 assert.equal(advice.title,'Check evenness first');
 assert.match(advice.text,/distributing the grounds more evenly/);
 assert.match(advice.text,/keeping tamp and recipe settings unchanged/);
});

test('owner-approved URL Autofill emphasis changes only the New Coffee button',async()=>{
 const main=await readFile(new URL('../site/cloud/main.js',import.meta.url),'utf8');
 const css=await readFile(new URL('../site/visual.css',import.meta.url),'utf8');
 const match=main.match(/\$\{button\('Autofill From URL','preview-coffee-url','','([^']+)'\)\}/g)||[];
 assert.deepEqual(match,["\$\{button('Autofill From URL','preview-coffee-url','','secondary coffee-url-autofill-button')}"]);
 assert.match(css,/\.coffee-url-actions \.coffee-url-autofill-button\{width:100%;flex:1 0 100%;min-height:56px;padding:14px 18px;font-size:16px;/);
 assert.match(main,/<div class="form-grid coffee-detail-grid">/);
 assert.match(main,/<button class="primary full space-top">Add Coffee<\/button>/);
 assert.match(main,/<span class="helper">Optional · Official coffee product page<\/span>/);
 assert.doesNotMatch(main,/More Coffee Details<\/summary>/);
});
