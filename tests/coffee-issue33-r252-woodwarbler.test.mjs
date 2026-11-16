import test from 'node:test';
import assert from 'node:assert/strict';
import {cases,direct,fields} from '../scripts/audit/issue33-r252-woodwarbler-check.mjs';
const own={
 415:'Milk Chocolate, Brown Sugar, Orange, Medium Acidity & Body, Smooth finish Medium-Dark Roast Milling Process: Fully Washed',
 416:'Guatemala Honey, Lime, Orange, Medium Body & Acidity Medium Roast Milling Process: Fully Washed',
 417:'Washed Process Very similar to a Colombian Coffee Chocolate, Almond, Caramel, Balanced, Mild Acidity Medium Roast'
};
const page=(n,body=own[n],sibling='')=>'<article class="product"><h1>'+cases[n].name+'</h1><div class="product__description">'+body+'</div></article>'+sibling;
for(const n of [415,416,417]){
 test('#'+n+' selected H1 + own facts',()=>assert.deepEqual(direct(n,page(n),[cases[n].name]),{identity:true,own_facts:true}));
 test('#'+n+' wrong or duplicate headings fail closed',()=>{
  for(const h of [[],['Other'],[cases[n].name,'Other'],[cases[n].name,cases[n].name]])
   assert.equal(direct(n,page(n),h).identity,false);
 });
 test('#'+n+' related prose cannot restore a missing direct flavor',()=>{
  const token=n===415?'Milk Chocolate, Brown Sugar, Orange':n===416?'Honey, Lime, Orange':'Chocolate, Almond, Caramel';
  assert.equal(direct(n,page(n,own[n].replace(token,'UNPUBLISHED'),'<aside>'+own[n]+'</aside>'),[cases[n].name]).own_facts,false);
 });
}
test('Honduras cannot become Colombia through a comparative sentence',()=>{
 const f={name:cases[417].name,roaster:'Wood Warbler Coffee',origin:'Honduras',process:'Washed',roast_level:'Medium',tasting_notes:'Chocolate, Almond, Caramel'};
 assert.ok(Object.values(fields(417,f)).every(Boolean));
 assert.equal(fields(417,{...f,origin:'Honduras, Colombia'}).no_comparison_country,false);
 assert.equal(fields(417,{...f,tasting_notes:'Chocolate, Almond, Caramel, nut flavors'}).no_educational_taste,false);
});
test('Washed milling is not a decaffeination or invented farmer/harvest',()=>{
 const f={name:cases[415].name,roaster:'Wood Warbler Coffee',origin:'El Salvador',process:'Washed',roast_level:'Medium-Dark',tasting_notes:'Milk Chocolate, Brown Sugar, Orange'};
 assert.ok(Object.values(fields(415,f)).every(Boolean));
 assert.equal(fields(415,{...f,decaffeination_method:'Water Process'}).no_unpublished_decaf,false);
 assert.equal(fields(415,{...f,producer:'Other Coffee'}).no_unpublished_producer,false);
 assert.equal(fields(415,{...f,harvest_year:'2026'}).no_unpublished_lot_year,false);
});
test('Guatemala selected Medium is not category Medium-Dark',()=>{
 const f={name:cases[416].name,roaster:'Wood Warbler Coffee',origin:'Guatemala',process:'Washed',roast_level:'Medium',tasting_notes:'Honey, Lime, Orange'};
 assert.ok(Object.values(fields(416,f)).every(Boolean));
 assert.equal(fields(416,{...f,roast_level:'Medium-Dark'}).roast,false);
});
