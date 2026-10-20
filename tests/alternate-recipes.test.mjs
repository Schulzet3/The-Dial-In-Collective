// Alternate recipe-family presentation is a lightweight read-only projection
// of actual member-scoped, all-green, nonhidden shots. Synthetic fixtures only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {alternateRecipesMarkup} from '../site/cloud/alternate-recipes.js';
import {recommendation} from '../site/lib/engine.js';
import {rawFixture,rawShot,TIME} from './cloud-fixtures/raw.js';

function fixture(){
 const raw=rawFixture();
 raw.families=[
  {id:'family-short',library_entry_id:'coffee',style:'Turbo',statistics:{ratio:{center:2.0}},created_at:TIME},
  {id:'family-long',library_entry_id:'coffee',style:'Turbo',statistics:{ratio:{center:2.8}},created_at:TIME},
  {id:'family-other-style',library_entry_id:'coffee',style:'Traditional',statistics:{ratio:{center:2.8}},created_at:TIME}
 ];
 raw.recipePreferences=[{setup_id:'setup',setup_version_id:'version',library_entry_id:'coffee',
  style:'Turbo',current_family_id:'family-short',revision:2}];
 raw.shots=[
  rawShot({id:'short-1',personal_family_id:'family-short',yield_g:36,time_s:23,feed_mode:'standard'}),
  rawShot({id:'short-2',personal_family_id:'family-short',yield_g:37,time_s:24,feed_mode:'standard',pulled_at:'2026-10-02T12:00:00Z'}),
  rawShot({id:'long-1',personal_family_id:'family-long',yield_g:50,time_s:20,grind_setting:1.4,feed_mode:'standard',pulled_at:'2026-10-03T12:00:00Z'}),
  rawShot({id:'long-2',personal_family_id:'family-long',yield_g:52,time_s:22,grind_setting:1.5,feed_mode:'standard',pulled_at:'2026-10-04T12:00:00Z'}),
  rawShot({id:'other-style',personal_family_id:'family-other-style',style:'Traditional',yield_g:50,feed_mode:'standard'})
 ];
 return hydrate(raw);
}
test('current preferred family stays primary while only other same-style success is collapsed',()=>{
 const s=fixture(),rec=recommendation(s,'coffee');
 assert.equal(rec.familyId,'family-short');
 const html=alternateRecipesMarkup(s,'coffee','Turbo',rec);
 assert.match(html,/Alternate Dialed-In Recipes \(1\)/);
 assert.match(html,/<details[^>]*><summary>Alternate Dialed-In Recipes/);
 assert.match(html,/1:2\.8/);
 assert.match(html,/2 successful shots on this setup/);
 assert.match(html,/Time 20\.0–22\.0 s/);
 assert.match(html,/Grind 1\.4–1\.5/);
 assert.match(html,/data-action="make-current" data-id="long-2"/);
 assert.doesNotMatch(html,/data-id="short-|other-style|class="radar"/);
 assert.equal(recommendation(s,'coffee').familyId,'family-short','read-only view never changes preference');
});
test('hidden or unsuccessful shots cannot become alternates',()=>{
 const s=fixture(),rec=recommendation(s,'coffee');
 for(const sh of s.shots.filter(x=>x.familyId==='family-long'))sh.hidden=true;
 assert.equal(alternateRecipesMarkup(s,'coffee','Turbo',rec),'');
 for(const sh of s.shots.filter(x=>x.familyId==='family-long'))sh.hidden=false;
 for(const sh of s.shots.filter(x=>x.familyId==='family-long'))sh.dialedIn=false;
 assert.equal(alternateRecipesMarkup(s,'coffee','Turbo',rec),'');
});
test('alternate from a different setup is a ratio reference and never selectable',()=>{
 const s=fixture(),rec=recommendation(s,'coffee');
 for(const sh of s.shots.filter(x=>x.familyId==='family-long'))sh.setupVersionId='old-setup-version';
 const html=alternateRecipesMarkup(s,'coffee','Turbo',rec);
 assert.match(html,/from another setup/);
 assert.match(html,/Grind and time not copied across setups/);
 assert.doesNotMatch(html,/data-action="make-current"|Time 20|Grind 1\.4/);
});
test('pending synchronization or offline read-only mode never offers preference writes',()=>{
 const s=fixture(),rec=recommendation(s,'coffee');
 assert.doesNotMatch(alternateRecipesMarkup(s,'coffee','Turbo',rec,{canSelect:false}),/data-action="make-current"/);
 const pending=s.shots.find(x=>x.id==='long-2');pending.cloudPending=true;
 const html=alternateRecipesMarkup(s,'coffee','Turbo',rec);
 assert.match(html,/data-id="long-1"/);
 s.shots.find(x=>x.id==='long-1').cloudPending=true;
 assert.doesNotMatch(alternateRecipesMarkup(s,'coffee','Turbo',rec),/data-action="make-current"/);
});
test('no alternate disclosure when the only family is already current or no successful main window',()=>{
 const s=fixture(),rec=recommendation(s,'coffee');
 s.shots=s.shots.filter(sh=>sh.familyId!=='family-long');
 assert.equal(alternateRecipesMarkup(s,'coffee','Turbo',rec),'');
 assert.equal(alternateRecipesMarkup(s,'coffee','Turbo',{familyId:null,doseG:18}),'');
});
