import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedCurrentVisibleLabeledFact as literal} from '../scripts/audit/issue33-r50-visible-label-proof.mjs';
const selected='Tasting notes: Jasmine Mochi, Blueberry Pie, Brown Butter\nLa Esperanza farm is managed by the Alvarez family.\n✹ Farm : Finca La Esperanza ✹ Region : La Libertad ✹ Varietals : Bourbon\n✹ Processing : Natural ✹ Altitude : 1,000-1,450 meters';
test('R50 actual merchant bold-label text is accepted with whitespace before colon',()=>{
 assert.equal(literal(selected,'Farm','Finca La Esperanza'),true);
 assert.equal(literal(selected,'Processing','Natural'),true);
});
test('R50 hostile values and unrelated label absence are rejected',()=>{
 for(const [txt,k,val] of [
  ['Our story names Finca La Esperanza but no selected product label','Farm','Finca La Esperanza'],
  ['✹ Farm: Another Estate ✹ Processing: Natural','Farm','Finca La Esperanza'],
  ['✹ Farm: Finca La Esperanza ✹ Processing: Washed','Processing','Natural'],
  ['✹ Old Farm : Finca La Esperanza','Farm','Finca La Esperanza'],
  ['✹ Processing: Naturally occurring floral notes','Processing','Natural'],
  ['Farm: Finca La Esperanza North','Farm','Finca La Esperanza'],
  ['<meta content="Farm: Finca La Esperanza">','Processing','Natural']
 ])assert.equal(literal(txt,k,val),false,txt);
});
