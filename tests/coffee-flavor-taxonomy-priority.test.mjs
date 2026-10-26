import test from 'node:test';
import assert from 'node:assert/strict';
import {isCoarseCoffeeFlavorTaxonomy} from '../src/server/coffee-page-metadata.mjs';
import {coffeeTastingNotesSubset,equivalentCoffeeTastingNotes} from '../src/server/coffee-flavor-evidence.mjs';

const profile='Cherry, apple, red wine, grilled pineapple';
test('short unseparated storefront Flavor Notes chips cannot overwrite more explicit selected tasting notes',()=>{
 for(const category of ['Berry Tropical Wine','Chocolate Tropical Citrus Caramel','Vanilla/Oak Nutty Chocolate']){
  assert.equal(isCoarseCoffeeFlavorTaxonomy('Flavor Notes',category,profile),true,category);
 }
});
test('genuine separate lists, short profiles, single words and other labels are not silenced',()=>{
 for(const [label,category,selected] of [
  ['Flavor Notes','Tobacco, licorice',profile],
  ['Flavor Notes','Tobacco',profile],
  ['Flavor Notes','Berry Tropical Wine','Cherry'],
  ['Tasting Notes','Berry Tropical Wine',profile],
  ['Tastes like','Berry Tropical Wine',profile],
  ['Flavor Notes','A long freeform sentence about an entire different profile that is not a compact flavor chip.','Cherry, apple, lemon'],
 ]) assert.equal(isCoarseCoffeeFlavorTaxonomy(label,category,selected),false,category);
});
test('independently published shorter generic Tastes like lists are subsets only, never contradictory additions',()=>{
 assert.equal(coffeeTastingNotesSubset('Milk chocolate, Toasted almond, Brown sugar',
  'Milk chocolate, toasted almond, brown sugar, gentle citrus'),true);
 assert.equal(coffeeTastingNotesSubset('Milk chocolate, raspberry',
  'Milk chocolate, toasted almond, brown sugar, gentle citrus'),false);
 assert.equal(equivalentCoffeeTastingNotes('Vanilla, honey, oak, nutty, spice',
  'Nutty, Vanilla, Honey, Oak, Spice'),true);
});
