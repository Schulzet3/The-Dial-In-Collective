import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture,rawShot,TIME} from './cloud-fixtures/raw.js';
import {chooseRecipeFamily,recommendation,baseline,editShot} from '../site/lib/engine.js';
import {activeVersion,coffeeState} from '../site/lib/model.js';
const make=({preference='',favorite=null}={})=>{
 const raw=rawFixture();raw.preferences.tasting_preferences=preference;
 raw.families=[
  {id:'short',library_entry_id:'coffee',style:'Turbo',statistics:{ratio:{center:2.02}},created_at:TIME},
  {id:'long',library_entry_id:'coffee',style:'Turbo',statistics:{ratio:{center:2.82}},created_at:TIME}
 ];
 raw.recipePreferences=[{setup_id:'setup',setup_version_id:'version',library_entry_id:'coffee',
  style:'Turbo',current_family_id:'short',favorite_shot_id:favorite,revision:2}];
 raw.shots=[
  rawShot({id:'short-a',personal_family_id:'short',yield_g:36,time_s:25,grind_setting:1.1,feed_mode:'standard'}),
  rawShot({id:'short-b',personal_family_id:'short',yield_g:37,time_s:27,grind_setting:1.2,feed_mode:'standard',pulled_at:'2026-10-02T12:00:00Z'}),
  rawShot({id:'long-a',personal_family_id:'long',yield_g:50,time_s:19,grind_setting:1.5,feed_mode:'standard',pulled_at:'2026-10-03T12:00:00Z'}),
  rawShot({id:'long-b',personal_family_id:'long',yield_g:52,time_s:22,grind_setting:1.6,feed_mode:'standard',pulled_at:'2026-10-04T12:00:00Z'})
 ];
 const s=hydrate(raw);return {s,raw};
};
const choose=s=>chooseRecipeFamily(s,'coffee','Turbo',activeVersion(s),activeVersion(s).baskets[0],'standard',coffeeState(s,'coffee'));
test('clarity uses only a cautious longer-ratio tie-breaker for equally strong compatible successes',()=>{
 const {s,raw}=make({preference:'bright clarity citrus'});
 const before=structuredClone(s);
 const pick=choose(s),rec=recommendation(s,'coffee');
 assert.equal(pick.family.id,'long');
 assert.equal(pick.basis,'taste_proxy');
 assert.equal(rec.familyId,'long');
 assert.ok(rec.ratio.center>2.7);
 assert.equal(rec.observations,2);
 assert.match(rec.reasons[0],/taste differences are not verified/);
 assert.equal(raw.recipePreferences[0].current_family_id,'short','auto Current is not an explicit favorite');
 assert.deepEqual(s,before,'selection does not edit a member preference or shot');
});
test('body preference favors compatible shorter-ratio success, without inventing sensory findings',()=>{
 const {s}=make({preference:'rich syrupy body'});
 const rec=recommendation(s,'coffee');
 assert.equal(rec.familyId,'short');
 assert.match(rec.reasons[0],/shorter-ratio/);
});
test('explicit Make Current favorite overrides auto taste and keeps one family window',()=>{
 const {s}=make({preference:'bright citrus clarity',favorite:'short-a'});
 const pick=choose(s),rec=recommendation(s,'coffee');
 assert.equal(pick.basis,'manual');assert.equal(rec.familyId,'short');
 assert.equal(rec.ratio.center,(36/18+37/18)/2);
 assert.equal(rec.observations,2);
});
test('invalid or hidden favorite is not a permanent recipe lock',()=>{
 const {s}=make({preference:'clarity',favorite:'short-a'});
 s.shots.find(x=>x.id==='short-a').hidden=true;
 assert.equal(recommendation(s,'coffee').familyId,'long');
 s.shots.find(x=>x.id==='short-a').hidden=false;
 s.shots.find(x=>x.id==='short-a').dialedIn=false;
 assert.equal(recommendation(s,'coffee').familyId,'long');
});
test('confirmed local successes outrank single candidate even if candidate has preferred ratio',()=>{
 const {s}=make({preference:'clarity'});
 s.shots=s.shots.filter(sh=>sh.id!=='long-b');
 assert.equal(recommendation(s,'coffee').familyId,'short');
 assert.equal(choose(s).basis,'equipment_evidence');
});
test('matching basket, feed and calibration outrank taste even when other family has more history',()=>{
 const {s}=make({preference:'clarity'});
 for(const sh of s.shots.filter(x=>x.familyId==='long'))sh.feedMode='slow';
 assert.equal(recommendation(s,'coffee').familyId,'short');
 const recSlow=recommendation(s,'coffee',{feedMode:'slow'});
 assert.equal(recSlow.familyId,'long');
 assert.equal(recSlow.time.center,20.5);
});
test('one family only, unrelated style and unverified/hidden shots cannot hijack chosen window',()=>{
 const {s}=make({preference:'clarity'});
 for(const sh of s.shots.filter(x=>x.familyId==='long'))sh.dialedIn=false;
 assert.equal(recommendation(s,'coffee').familyId,'short');
 const rec=recommendation(s,'coffee');
 assert.equal(rec.familySelection.candidates,1);
 assert.deepEqual(rec.reasons,[]);
 const other=s.shots.find(x=>x.id==='long-a');
 other.dialedIn=true;other.style='Traditional';
 assert.equal(recommendation(s,'coffee').familyId,'short');
});
test('no compatible local time from another basket, feed or setup is presented as proven',()=>{
 const {s}=make({preference:'clarity'});
 for(const sh of s.shots.filter(x=>x.familyId==='long')){
  sh.setupVersionId='prior-version';sh.snapshot.grinder='Prior grinder';
  sh.snapshot.burrs='Prior burrs';sh.timeS=71;sh.tempC=89;
 }
 for(const sh of s.shots.filter(x=>x.familyId==='short'))sh.hidden=true;
 const rec=recommendation(s,'coffee');
 assert.equal(rec.familyId,'long');
 assert.equal(rec.established,false);
 assert.equal(rec.time.center,baseline(s.coffees[0],'Turbo',18,s.preferences).time.center);
 assert.equal(rec.tempC,baseline(s.coffees[0],'Turbo',18,s.preferences).tempC);
 assert.equal(rec.observations,2);
 assert.match(rec.source,/other setup/);
});
test('changing taste preferences does not alter any stored shots/families or current preferences',()=>{
 const {s}=make();
 const past=structuredClone(s);
 assert.equal(recommendation(s,'coffee').familyId,'short');
 s.preferences='bright fruity clarity';
 assert.equal(recommendation(s,'coffee').familyId,'long');
 s.preferences='rich syrupy body';
 assert.equal(recommendation(s,'coffee').familyId,'short');
 s.preferences=past.preferences;
 assert.deepEqual(s,past);
});
test('family-grind reference cannot leak across ratio families during recalibration',()=>{
 const {s}=make({preference:'clarity',favorite:'short-a'});
 const v=activeVersion(s);v.calibrationId='new-cal';
 // Only the manually chosen family's old-calibration grind may be estimated.
 const rec=recommendation(s,'coffee');
 assert.equal(rec.familyId,'short');
 assert.match(rec.grind.source,/Estimated from previous calibration/);
 assert.notEqual(rec.grind.value,1.6);
});

test('editing the explicitly preferred all-green shot into another ratio family preserves the owners selection',()=>{
 const {s}=make({preference:'clarity',favorite:'short-a'});
 const p=coffeeState(s,'coffee');
 const beforeOthers=s.shots.filter(sh=>sh.id!=='short-a').map(sh=>({id:sh.id,familyId:sh.familyId,revision:sh.revision}));
 assert.equal(recommendation(s,'coffee').familyId,'short');
 const edited=s.shots.find(sh=>sh.id==='short-a');
 // The corrected yield makes this shot part of the established longer-ratio family.
 // The other original short-family success must remain untouched.
 const result=editShot(s,edited.id,{yieldG:51});
 assert.equal(result.id,'short-a');
 assert.equal(result.familyId,'long');
 assert.equal(p.currentFamilies.Turbo,'long');
 assert.equal(p.favoriteShots.long,'short-a');
 assert.equal(p.favoriteShots.short,undefined);
 assert.equal(choose(s).basis,'manual');
 assert.equal(recommendation(s,'coffee').familyId,'long');
 assert.deepEqual(s.shots.filter(sh=>sh.id!=='short-a').map(sh=>({id:sh.id,familyId:sh.familyId,revision:sh.revision})),beforeOthers);
});
test('correcting an ordinary nonfavorite shot does not transfer the preferred family',()=>{
 const {s}=make({preference:'clarity',favorite:'short-a'});
 const p=coffeeState(s,'coffee');
 const moved=editShot(s,'short-b',{yieldG:51});
 assert.equal(moved.familyId,'long');
 assert.equal(p.currentFamilies.Turbo,'short');
 assert.equal(p.favoriteShots.short,'short-a');
 assert.equal(choose(s).basis,'manual');
 assert.equal(recommendation(s,'coffee').familyId,'short');
});
test('correcting an explicit favorite to non-green releases invalid manual selection',()=>{
 const {s}=make({preference:'clarity',favorite:'short-a'});
 const p=coffeeState(s,'coffee');
 const corrected=editShot(s,'short-a',{tasteScales:{extraction:1,body:1,clarity:1,sweetness:1,astringency:5}});
 assert.equal(corrected.dialedIn,false);
 assert.equal(corrected.familyId,null);
 assert.equal(p.favoriteShots.short,undefined);
 assert.equal(p.currentFamilies.Turbo,undefined);
 assert.notEqual(choose(s).basis,'manual');
 assert.equal(recommendation(s,'coffee').familyId,'long');
});
