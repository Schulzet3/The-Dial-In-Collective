import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedNkumariR74DirectEvidence as proof} from '../scripts/audit/issue33-r74-597-selected-contract.mjs';
const name = 'Kenya Nkumari, P1 C';
const direct = "Tastes Like: Floral, grapefruit aroma with bright, tangy acidity. Round, almost savory, caramel low balance. Notes and Notes: WBCR chose this Kenya P1 C. What's in it: Washed Process. Dried on raised beds. Variety: SL28 and Ruiru 11 (which are exclusive varieties to Kenya). Farm: Nkumari. Producer: Naman Meme. Region: Meru. Elevation: 1400 meters above sea level. Roast level: lightest roast on the menu! The Full Story: Producer Naman Meme manages the well-ordered Nkumari Estate in Kenya’s Meru region, where SL28 and Ruiru11 varieties grow under macadamia shade. This limited selection comes in at a C, or 14 screen.";
const wrap = (text = direct, selected = name) => '<main><h1>' + selected + '</h1><p>' + text + '</p></main>';
test('current exact selected Nkumari supports all eight direct bounded facts', () => {
  assert.deepEqual(Object.values(proof(wrap(), [name])), Array(8).fill(true));
});
test('different Kenya release and duplicated/absent selected H1 fail identity', () => {
  for (const h of [['Kenya AA Karumandi'], [], [name, name]])
    assert.equal(proof(wrap(), h).identity, false);
});
test('other coffee related nav, scripts, and aside cannot supply selected facts', () => {
  const hidden = '<main><h1>' + name + '</h1><p>Selected coffee has no details.</p><nav>' + direct +
    '</nav><aside>' + direct + '</aside><script>' + direct + '</script></main>';
  assert.equal(Object.values(proof(hidden, [name])).filter(Boolean).length, 1);
});
test('historical or other estate producer cannot replace current Naman Meme', () => {
  const p = proof(wrap(direct.replaceAll('Naman Meme', 'Another Farmer')), [name]);
  assert.equal(p.exactFarmProducerRegionElevation, false);
  assert.equal(p.namedCurrentManager, false);
});
test('screen grade C/14 cannot substitute SL28 and Ruiru11 selected varieties', () => {
  const p = proof(wrap(direct.replace('Variety: SL28 and Ruiru 11', 'Variety: C screen 14')), [name]);
  assert.equal(p.selectedVarieties, false);
  assert.equal(p.gradingNotVariety, true);
});
test('roaster-relative roast description is not an explicit absolute Light label', () => {
  assert.equal(proof(wrap(), [name]).relativeNotCategoricalRoast, true);
  assert.equal(proof(wrap(direct.replace('lightest roast on the menu', 'medium roast')), [name]).relativeNotCategoricalRoast, false);
});
test('changed farm or Meru estate origin fails selected current provenance', () => {
  assert.equal(proof(wrap(direct.replace('Farm: Nkumari', 'Farm: Elsewhere')), [name]).exactFarmProducerRegionElevation, false);
  assert.equal(proof(wrap(direct.replace('Region: Meru', 'Region: Kirinyaga')), [name]).exactFarmProducerRegionElevation, false);
});
test('missing washed/raised-bed process or exact selected notes fails closed', () => {
  assert.equal(proof(wrap(direct.replace('Washed Process.', 'Natural Process.')), [name]).directlyWashedAndRaisedBed, false);
  assert.equal(proof(wrap(direct.replace('caramel low balance', 'winey low balance')), [name]).selectedTasting, false);
});
test('menu and other countries grading examples are never current selected source', () => {
  const p = proof(wrap('Related Kenya, Tanzania and Colombia bean screen grading; unknown source.'), [name]);
  assert.equal(Object.values(p).filter(Boolean).length, 1);
});
