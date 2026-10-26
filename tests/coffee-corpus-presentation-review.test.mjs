import test from 'node:test';
import assert from 'node:assert/strict';
import {presentationEquivalent,reviewCorpusPresentation} from '../scripts/audit/coffee-corpus-presentation-review.mjs';

test('metre notation with thousands punctuation, range dashes, and ASL qualifiers is strictly value-equivalent',()=>{
 for (const [a,b] of [
  ['1850 meters','1,850 meters'],
  ['1200–1800 masl','1.200 - 1.800 masl'],
  ['1600–1700 MASL','1,600–1,700 MASL'],
  ['2000–2200 meters','2,000 - 2,200 Meters Above Sea Level'],
  ['1500–1900','1,500-1900 METERS'],
  ['1300–2000m','1300 to 2000 meters'],
  ['about 1600m','~1600 meters'],
  ['1600+ meters','1600 + masl'],
 ])assert.equal(presentationEquivalent('elevation_m',a,b),'same_literal_elevation_meters',a+' | '+b);
});

test('altitude comparison rejects numeric change, missing range bound and altered approximate/plus meaning',()=>{
 for (const [a,b] of [
  ['1200–1800m','1200–1801m'],['1200–1800m','1200m'],
  ['1600+ meters','1600 meters'],['approximately 1600m','1600m'],
  ['1.5km','1500m'],['1200-1800m','1200 and 1800m'],
  ['1200ft','1200m'],['12.5m','125m'],['1,500m','1500-2000m'],
  ['1200m, 1600m','1200-1600m'],
 ])assert.equal(presentationEquivalent('elevation_m',a,b),null,a+' | '+b);
});

test('ordered literal note and variety lists ignore separators only, never omit meaningful words',()=>{
 for(const [field,a,b] of [
  ['tasting_notes','melon, plum, lemon verbena','melon, plum, and lemon verbena'],
  ['tasting_notes','Prickly Pear, Guava Jelly','Prickly Pear & Guava Jelly'],
  ['variety','SL28; SL34','SL 28 and SL 34'],
  ['producer','Oscar and Francisca Chacón','Oscar & Francisca Chacón'],
 ])assert.equal(presentationEquivalent(field,a,b),'same_ordered_literal_list');
 for(const [field,a,b] of [
  ['tasting_notes','stone fruit, lemon','stone fruit'],
  ['tasting_notes','milk chocolate, cherries','cherries, milk chocolate'],
  ['tasting_notes','strawberry jam, chocolate','strawberry jam and chocolate cherries'],
  ['tasting_notes','black cherry, cocoa','black cherry in milk, cocoa'],
  ['variety','SL28, SL34, Batian','SL28 and SL34'],
  ['producer','the Ketiara Cooperative','Ketiara Cooperative'],
 ])assert.equal(presentationEquivalent(field,a,b),null,a+' | '+b);
});

test('approved Light-Medium spelling is not a universal mapping of roast ranges',()=>{
 assert.equal(presentationEquivalent('roast_level','Light-Medium','Medium-Light'),'approved_light_medium_alias');
 assert.equal(presentationEquivalent('roast_level','Light/Medium','Medium-Light'),null);
 assert.equal(presentationEquivalent('roast_level','Medium','Medium-Light'),null);
});

test('full-frozen comparison guard rejects incomplete/misreported results and leaves strict counts untouched',()=>{
 const one={case_id:'a',canonical:[{field:'tasting_notes',expected:'melon, plum',actual:'melon and plum',status:'review_required'}]};
 assert.throws(()=>reviewCorpusPresentation({type:'strict_source_oracle_comparison',records:[one],counts:{cases:1,canonical_assertions:1}}),/Wrong or partial/);
 const records=Array.from({length:603},(_,n)=>({case_id:'x'+n,canonical:Array.from({length:n===0?3400:1},(_,i)=>({field:'tasting_notes',status:n===0&&i===3399?'review_required':'exact_equivalent',expected:'melon, plum',actual:'melon and plum'}))}));
 const comparison={type:'strict_source_oracle_comparison',records,counts:{cases:603,canonical_assertions:4002,exact_equivalent:4001,missing:0,review_required:1}};
 const result=reviewCorpusPresentation(comparison);
 assert.deepEqual(result.counts,{exact:4001,missing:0,review_required:1,presentational_equivalents:1,still_missing:0,still_requires_source_review:0});
 assert.deepEqual(comparison.counts,{cases:603,canonical_assertions:4002,exact_equivalent:4001,missing:0,review_required:1});
 assert.throws(()=>reviewCorpusPresentation({...comparison,counts:{...comparison.counts,exact_equivalent:3999}}),/do not reconcile/);
});
