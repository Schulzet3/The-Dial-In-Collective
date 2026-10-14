import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {hydrate} from '../site/cloud/mapping.js';
import {patchAcknowledgement} from '../site/cloud/cache.js';
import {shotCard,feedLabel} from '../site/cloud/shot_card.js';
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
test('shot overview moves setup/basket/feed above compass and separates Edit and Make Current',()=>{
 const raw=rawFixture();raw.shots=[rawShot({feed_mode:'slow'})];
 const sh=hydrate(raw).shots[0],html=shotCard(sh,{expanded:true,activeVersionId:'version'});
 assert.ok(html.indexOf('Test Home')<html.indexOf('class="radar"'));
 assert.ok(html.indexOf('18 g Basket Dose')<html.indexOf('class="radar"'));
 assert.ok(html.indexOf('Slow Feed')<html.indexOf('class="radar"'));
 assert.ok(html.indexOf('data-action="edit"')<html.indexOf('data-action="make-current"'));
 assert.match(html,/class="shot-actions"/);
 assert.match(html,/class="primary compact" data-action="edit"/);
 assert.match(html,/class="ghost compact" data-action="make-current"/);
 assert.doesNotMatch(shotCard(sh,{expanded:true,activeVersionId:'other'}),/data-action="make-current"/);
 assert.equal(feedLabel(null),'Feed not recorded');
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
test('Settings keeps both manual recovery controls collapsed and offers rename',async()=>{
 const main=await readFile(new URL('../site/cloud/main.js',import.meta.url),'utf8');
 const extension=await readFile(new URL('../site/cloud/import-integration.js',import.meta.url),'utf8');
 assert.match(main,/class="advanced recovery-options"/);
 assert.match(main,/class=settings-recovery/);
 assert.match(main,/button\('Rename','rename-setup'/);
 assert.match(extension,/\.settings-recovery/);
 assert.doesNotMatch(extension,/\.settings-links/);
});
