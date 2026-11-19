import test from 'node:test';
import assert from 'node:assert/strict';
import {chips,radar} from '../site/lib/ui.js';
import {shotCard} from '../site/cloud/shot_card.js';

// Synthetic-only historical ratings. No member, provider, or database reads.
const fiveGreen={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
test('R337 five rated taste chips have legible values even without the color palette',()=>{
 const summary=chips(fiveGreen);
 for(const value of ['Extraction: Balanced','Body: Balanced','Clarity: Distinct','Sweetness: Exceptional','Dryness: None'])
  assert.ok(summary.includes(value),value);
 assert.equal((summary.match(/class="taste-chip severity-0"/g)||[]).length,5);
 assert.equal((summary.match(/: Not rated/g)||[]).length,0);
 assert.match(radar(fiveGreen),/class="radar-result is-ideal"/);
});
test('R337 non-ideal recorded scores remain distinct from missing ratings',()=>{
 const t={extraction:1,body:5,clarity:3,sweetness:null,astringency:5};
 const summary=chips(t);
 for(const value of ['Extraction: Very sour','Body: Very heavy','Clarity: Moderate','Sweetness: Not rated','Dryness: Severe'])
  assert.ok(summary.includes(value),value);
 assert.equal((summary.match(/class="taste-chip is-unrated"/g)||[]).length,1);
 assert.doesNotMatch(radar(t),/class="radar-result /);
});
test('R337 invalid imported scores stay explicitly unrated and never become recorded values',()=>{
 const summary=chips({extraction:0,body:'3',clarity:6,sweetness:5,astringency:1});
 for(const label of ['Extraction','Body','Clarity']) assert.ok(summary.includes(label+': Not rated'));
 assert.match(summary,/Sweetness: Exceptional/);
 assert.match(summary,/Dryness: None/);
});
test('R337 expanded saved History renders all five readable scores and does not rewrite originals',()=>{
 const shot={id:'r337',timestamp:'2026-11-05T01:00:00Z',style:'Turbo',doseG:18,
  yieldG:45,timeS:16,grindSetting:2,tempC:null,hidden:false,
  tasteScales:{...fiveGreen},dialedIn:true,notes:'Original note',
  setupVersionId:'v1',snapshot:{setupName:'Original'}};
 const original=structuredClone(shot);
 const html=shotCard(shot,{expanded:true,activeVersionId:'v1'});
 assert.match(html,/Clarity: Distinct/);
 assert.match(html,/Sweetness: Exceptional/);
 assert.match(html,/Dryness: None/);
 assert.match(html,/Original note/);
 assert.deepEqual(shot,original);
});
