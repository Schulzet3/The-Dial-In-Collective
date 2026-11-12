import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {recordRecommendationUse,reconcileRecommendationUse} from '../site/cloud/recommendation-use.js';
import {shotCard} from '../site/cloud/shot_card.js';
const source=(name)=>readFileSync(new URL(name,import.meta.url),'utf8');
test('button Use Recommendation records a bounded member-selected origin visible on the private shot card',()=>{
 const c=recordRecommendationUse(null,'grind','Current saved reference',{tier:'exact',contributorCount:4,shotCount:5});
 assert.equal(c.kind,'member_selected_starting_reference');
 assert.deepEqual(c.used_controls,['grind']);
 assert.equal(c.source_label,'Current saved reference');
 assert.equal(c.contributor_count,4);
 const html=shotCard({id:'local-1',timestamp:'2026-11-12T20:00:00Z',style:'Traditional',
  doseG:18,yieldG:36,timeS:28,grindSetting:6,feedMode:'standard',
  tasteScales:{extraction:3,body:3,clarity:5,sweetness:5,astringency:1},
  recommendationContext:c,snapshot:{setupName:'Test setup'}},{expanded:true});
 assert.match(html,/data-recommendation-source/);
 assert.match(html,/Used grind from: Current saved reference/);
 assert.doesNotMatch(html,/independent source verification\.\s*<\/p>[\s\S]*data-recommendation-source/);
});
test('unchanged copied grind and temperature survive, numeric display formatting is equivalent',()=>{
 let c=recordRecommendationUse(null,'grind','Same starting recipe');
 c=recordRecommendationUse(c,'temperature','Same starting recipe');
 assert.deepEqual(c.used_controls,['grind','temperature']);
 assert.deepEqual(reconcileRecommendationUse(c,{grind:'6.0',temperature:'201'},{grind:'6',temperature:'201.0'}),c);
});
test('manual change removes only changed copied control; no false origin after both changes',()=>{
 let c=recordRecommendationUse(null,'grind','Source');
 c=recordRecommendationUse(c,'temperature','Source');
 const partial=reconcileRecommendationUse(c,{grind:'6',temperature:'201'},{grind:'7',temperature:'201'});
 assert.deepEqual(partial.used_controls,['temperature']);
 assert.equal(reconcileRecommendationUse(c,{grind:'6',temperature:'201'},{grind:'7',temperature:'202'}),null);
 assert.equal(reconcileRecommendationUse(c,{grind:'6',temperature:'201'},{grind:'',temperature:'201'}).used_controls[0],'temperature');
 assert.equal(reconcileRecommendationUse(c,{grind:'6',temperature:'201'},{grind:null,temperature:''}),null);
});
test('different recommendation source does not mislabel previously copied other control',()=>{
 const old=recordRecommendationUse(null,'grind','Standard feed reference');
 const next=recordRecommendationUse(old,'temperature','Slow feed reference');
 assert.deepEqual(next.used_controls,['temperature']);
 assert.equal(next.source_label,'Slow feed reference');
 assert.equal(recordRecommendationUse(null,'pressure','Source'),null);
});
test('no synthetic taste/temperature or unrelated archived context rewrites',()=>{
 const unrelated={kind:'historic',notes:'Private',used_controls:['grind']};
 assert.strictEqual(reconcileRecommendationUse(unrelated,{grind:'5'},{grind:'6'}),unrelated);
 const c=recordRecommendationUse(null,'grind','Source');
 assert.equal(reconcileRecommendationUse(c,{},{grind:'5'}),null);
 assert.equal(Object.hasOwn(c,'tasteScales'),false);
});
test('Log Shot wires actual copied measurements and save-time readDraft reconciliation',()=>{
 const main=source('../site/cloud/main.js');
 assert.ok(main.includes("import {recordRecommendationUse,reconcileRecommendationUse} from './recommendation-use.js'"));
 assert.ok(main.includes("this.appliedRecommendationValues.grind=String(r.grind.value)"));
 assert.ok(main.includes("this.appliedRecommendationValues.temperature=String(temperatureInput.value)"));
 assert.ok(main.includes("this.draft.recommendationContext=reconcileRecommendationUse("));
 assert.ok(main.includes("this.draft.recommendationContext=recordRecommendationUse("));
 assert.ok(main.includes("this.readDraft();const d=this.draft,validation=M.validateShot(d"));
 assert.ok(main.includes("M.validateShot(d,{allowLegacyCustom:!!this.editing&&this.editing.style==='Custom'})"));
});
