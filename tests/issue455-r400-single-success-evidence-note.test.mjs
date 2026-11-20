import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture,rawShot,TIME} from './cloud-fixtures/raw.js';
import {recommendation} from '../site/lib/engine.js';
import {recipeGrid} from '../site/lib/ui.js';

// Synthetic in-memory cloud mappings; no real member data, database or provider writes.
const oneShotRaw=(shotChanges={})=>{
 const raw=rawFixture();
 raw.families=[{id:'family',library_entry_id:'coffee',style:'Turbo',
  statistics:{ratio:{center:50/18}},created_at:TIME}];
 raw.shots=[rawShot({feed_mode:'standard',...shotChanges})];
 return raw;
};

test('R400 one real complete five-green personal success gets a visibly cautious window note',()=>{
 const raw=oneShotRaw(),original=structuredClone(raw);
 const s=hydrate(raw),before=structuredClone(s);
 const rec=recommendation(s,'coffee');
 assert.equal(rec.source,'Your dialed in window');
 assert.equal(rec.observations,1);
 assert.equal(rec.established,true,'one usable success remains valid personal history');
 const html=recipeGrid(rec);
 assert.match(html,/One successful shot so far/);
 assert.match(html,/not a guaranteed result/);
 assert.match(html,/class="helper recipe-evidence-note"/);
 assert.deepEqual(raw,original,'research disclosure never edits underlying cloud records');
 assert.deepEqual(s,before,'rendering and recommending never mutate member shots');
});

test('R400 repeat successes do not get a misleading single-shot caveat',()=>{
 const raw=oneShotRaw();
 raw.shots.push(rawShot({id:'second',feed_mode:'standard',
  pulled_at:'2026-10-02T12:00:00Z',yield_g:51}));
 const rec=recommendation(hydrate(raw),'coffee');
 assert.equal(rec.observations,2);
 assert.doesNotMatch(recipeGrid(rec),/One successful shot so far/);
});

test('R400 missing fifth rating cannot establish a personal one-success window',()=>{
 const raw=oneShotRaw({sweetness:null});
 const rec=recommendation(hydrate(raw),'coffee');
 assert.notEqual(rec.source,'Your dialed in window');
 assert.doesNotMatch(recipeGrid(rec),/One successful shot so far/);
});

test('R400 other setup, changed advice and generic priors cannot claim local one-shot evidence',()=>{
 const raw=oneShotRaw();
 const rec=recommendation(hydrate(raw),'coffee');
 const before=structuredClone(rec);
 for(const override of [
  {source:'Starting reference from your other setup',established:false},
  {source:'Adjustment from your latest taste rating'},
  {source:'Unproven exact Community starting reference',familyId:null},
  {observations:0}, {observations:2}, {established:false}
 ]){
  assert.doesNotMatch(recipeGrid({...rec,...override}),/One successful shot so far/);
 }
 assert.deepEqual(rec,before,'UI note does not change measured recipe or evidence labels');
});
