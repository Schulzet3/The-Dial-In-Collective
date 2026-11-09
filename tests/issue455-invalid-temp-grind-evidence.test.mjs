import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture,rawShot} from './cloud-fixtures/raw.js';
import {activeVersion} from '../site/lib/model.js';
import {grindGuidance} from '../site/lib/engine.js';

// Synthetic imported rows only; no provider, Auth or actual member data.
const row=(id,tempC,grindSetting=2.2,feed='standard')=>
 rawShot({id,temperature_c:tempC,grind_setting:grindSetting,feed_mode:feed});
function state(...shots){const raw=rawFixture();raw.shots=shots;return hydrate(raw);}
function guide(s,feed='standard'){
 return grindGuidance(s,s.coffees.find(c=>c.id==='coffee'),'Turbo',
  activeVersion(s).baskets.find(b=>b.id==='basketv'),feed);
}

test('R123 imported all-green shot above Log Shot temperature range cannot prove grind',()=>{
 const s=state(row('invalid-high',145,1.1)),before=structuredClone(s),g=guide(s);
 assert.equal(g.source,'Espresso range starting estimate');
 assert.equal(g.proven,false);
 assert.notEqual(g.value,1.1);
 assert.deepEqual(s,before);
});
test('R123 imported all-green shot below Log Shot temperature range cannot prove grind',()=>{
 const s=state(row('invalid-low',65,1.2)),g=guide(s);
 assert.equal(g.source,'Espresso range starting estimate');
 assert.equal(g.proven,false);
 assert.notEqual(g.value,1.2);
});
test('R123 actual valid temperature continues to prove same-coffee grind',()=>{
 const s=state(row('valid-temp',92,2.2)),before=structuredClone(s),g=guide(s);
 assert.equal(g.source,'Your successful setting');
 assert.equal(g.proven,true);
 assert.equal(g.value,2.2);
 assert.deepEqual(s,before);
});
test('R123 optional unrecorded temperature retains measured shot eligibility',()=>{
 const s=state(row('no-temp',null,2.3)),g=guide(s);
 assert.equal(g.source,'Your successful setting');
 assert.equal(g.proven,true);
 assert.equal(g.value,2.3);
});
test('R123 valid history is not biased by an otherwise green invalid-temp import',()=>{
 const s=state(row('valid',93,2.1),row('invalid',135,4.9)),g=guide(s);
 assert.equal(g.source,'Your successful setting');
 assert.equal(g.proven,true);
 assert.equal(g.value,2.1);
});
test('R123 invalid-temperature Slow Feed history cannot appear as proven or paired feed result',()=>{
 const s=state(row('standard',92,4,'standard'),row('invalid-slow',140,1,'slow')),
  before=structuredClone(s),g=guide(s,'slow');
 assert.equal(g.source,'Slow Feed starting estimate adjusted from your Standard Feed result');
 assert.equal(g.proven,false);
 assert.notEqual(g.value,1);
 assert.deepEqual(s,before);
});
