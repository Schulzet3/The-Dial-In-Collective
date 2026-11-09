import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion,coffeeState} from '../site/lib/model.js';
import {recommendation,prefill} from '../site/lib/engine.js';

const state=()=>hydrate(rawFixture());
const options=basketId=>({style:'Turbo',basketId,feedMode:'standard'});
const recipe=(s,id)=>recommendation(s,'coffee',options(id));
const logDraft=(s,id)=>prefill(s,'coffee',options(id));
// Synthetic archived data only. Never actual member or provider state.
test('R122 archived explicit basket falls back to active basket for recipe and Log Shot',()=>{
 const s=state(),v=activeVersion(s),current=v.baskets.find(b=>b.id==='basketv');
 assert.ok(current&&!current.archived);
 v.baskets.push({id:'retired-28',name:'Retired 28g',doseG:28,archived:true});
 const original=structuredClone(s),rec=recipe(s,'retired-28'),draft=logDraft(s,'retired-28');
 assert.equal(rec.basketId,current.id);assert.equal(rec.doseG,current.doseG);
 assert.equal(draft.basketId,current.id);assert.equal(draft.doseG,current.doseG);
 assert.deepEqual(draft.tasteScales,{extraction:null,body:null,clarity:null,sweetness:null,astringency:null});
 assert.equal(draft.notes,'');
 assert.deepEqual(s,original);
});
test('R122 valid active alternative basket preserves explicit choice and corresponding dose',()=>{
 const s=state(),v=activeVersion(s);
 v.baskets.push({id:'active-22',name:'Existing 22g',doseG:22,archived:false});
 const original=structuredClone(s),rec=recipe(s,'active-22'),draft=logDraft(s,'active-22');
 assert.equal(rec.basketId,'active-22');assert.equal(rec.doseG,22);
 assert.equal(draft.basketId,'active-22');assert.equal(draft.doseG,22);
 assert.deepEqual(s,original);
});
test('R122 archived saved basket preference falls back without changing stored preference',()=>{
 const s=state(),v=activeVersion(s),current=v.baskets.find(b=>b.id==='basketv');
 v.baskets.push({id:'retired',name:'Archived',doseG:30,archived:true});
 coffeeState(s,'coffee').basketId='retired';
 const original=structuredClone(s),rec=recipe(s,undefined),draft=logDraft(s,undefined);
 assert.equal(rec.basketId,current.id);assert.equal(rec.doseG,current.doseG);
 assert.equal(draft.basketId,current.id);assert.equal(draft.doseG,current.doseG);
 assert.deepEqual(s,original);
});
test('R122 missing explicit basket reference falls back without mutating state',()=>{
 const s=state(),v=activeVersion(s),current=v.baskets.find(b=>b.id==='basketv');
 const original=structuredClone(s),rec=recipe(s,'not-found'),draft=logDraft(s,'not-found');
 assert.equal(rec.basketId,current.id);assert.equal(rec.doseG,current.doseG);
 assert.equal(draft.basketId,current.id);assert.equal(draft.doseG,current.doseG);
 assert.deepEqual(s,original);
});
