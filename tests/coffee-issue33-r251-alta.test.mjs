import test from 'node:test';
import assert from 'node:assert/strict';
import {cases,direct,fields} from '../scripts/audit/issue33-r251-alta-check.mjs';
const own={
427:'El Madron - Organic - Decaf Chiapas, Mexico Medium Typica, Caturra Washed, Mountain Water Process 1800m Toffee, Pumpkin Spice, Lime',
428:'Kirima Batian Light Roast SL28, SL34, Batian Washed 1,847m Cherry, Raisin, Lemon Kiaguthu Washing Station'
};
const html=(n,p=own[n],side='')=>'<article class="product"><h1>'+cases[n].name+'</h1><div class="product__description">'+p+'</div></article>'+side;
for(const n of [427,428]){
 test('#'+n+' direct chosen source',()=>assert.deepEqual(direct(n,html(n),[cases[n].name]),{identity:true,own_facts:true}));
 test('#'+n+' no borrowed heading',()=>{
  for(const h of [[],['Other Coffee'],[cases[n].name,cases[n].name]])assert.equal(direct(n,html(n),h).identity,false);
 });
 test('#'+n+' sibling prose cannot fill missing selected fact',()=>{
  const p=own[n].replace(n===427?'Mountain Water Process':'Kiaguthu Washing Station','WITHHELD');
  assert.equal(direct(n,html(n,p,'<aside>'+own[n]+'</aside>'),[cases[n].name]).own_facts,false);
 });
}
test('same #427 coffee can be both washed green and water decaffeinated',()=>{
 const f={roast_level:'Medium',process:'Washed',decaffeination_method:'Water Process',origin:'Chiapas, Mexico',tasting_notes:'Toffee, Pumpkin Spice, Lime',variety:'Typica, Caturra',elevation_m:'1800m'};
 assert.ok(Object.values(fields(427,f)).every(Boolean));
 assert.equal(fields(427,{...f,process:'Water Process'}).washed_green,false);
});
test('#428 historic mountain, factory and cultivar are not lot elevation or release',()=>{
 const f={roast_level:'Light',process:'Washed',elevation_m:'1,847m',tasting_notes:'Cherry, Raisin, Lemon',variety:'SL28, SL34, Batian'};
 assert.ok(Object.values(fields(428,f)).every(Boolean));
 assert.equal(fields(428,{...f,elevation_m:'5,199m'}).elevation,false);
 assert.equal(fields(428,{...f,release_year:'2010'}).no_2010_1964_release,false);
});
