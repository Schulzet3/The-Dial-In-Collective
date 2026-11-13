import test from 'node:test';
import assert from 'node:assert/strict';
import {extractSelectedNextCoffeeProduct} from '../src/server/coffee-next-selected-product.mjs';

const url='https://www.bluebottlecoffee.com/us/eng/product/example-coffee';
const stateFor=(selected={},extras={})=>({
 page:'/[region]/[lang]/product/[slug]',
 query:{region:'us',lang:'eng',slug:'example-coffee'},
 props:{pageProps:{
  slug:'example-coffee',
  conversion:{slug:{current:'example-coffee'},name:{eng:'Example Coffee'},...selected},
  productRecs:extras.productRecs||[{slug:{current:'other-coffee'},name:{eng:'Other'},
   roastLevel:[{label:{eng:'Dark'}}],processing:[{description:{eng:'Natural'}}]}]
 }}
});
const parse=(state,source=url)=>{
 const html=`<script type="application/json" id="__NEXT_DATA__">${JSON.stringify(state)}</script>`;
 return extractSelectedNextCoffeeProduct(html,{source_url:source});
};
const fact=(result,field)=>result.source_facts.find(item=>item.field===field);
const pointer=(object,path)=>path.split('/').slice(1).reduce((value,key)=>value?.[key],object);

test('selected normalized roast and process cite their original nonzero array positions',()=>{
 const state=stateFor({
  roastLevel:[{label:{eng:'Mystery Roast'}},{label:{eng:'Light Roast'}}],
  processing:[{description:{eng:''}},{description:{eng:'Washed'}}]
 });
 const result=parse(state);
 assert.equal(result.ok,true);
 assert.equal(result.fields.roast_level,'Light');
 assert.equal(result.fields.process,'Washed');
 assert.equal(fact(result,'roast_level').source_path,'/props/pageProps/conversion/roastLevel/1/label/eng');
 assert.equal(fact(result,'process').source_path,'/props/pageProps/conversion/processing/1/description/eng');
 assert.equal(pointer(state,fact(result,'roast_level').source_path),'Light Roast');
 assert.equal(pointer(state,fact(result,'process').source_path),'Washed');
 assert.deepEqual(result.conflicts,undefined);
});

test('case-insensitive dedupe retains first valid source index, never the filtered zero',()=>{
 const state=stateFor({
  roastLevel:[{label:{eng:''}},{label:{eng:'Medium'}},{label:{eng:'medium roast'}}],
  processing:[{description:{eng:''}},{description:{eng:'Washed'}},{description:{eng:'WASHED'}}]
 });
 const result=parse(state);
 assert.equal(result.fields.roast_level,'Medium');
 assert.equal(result.fields.process,'Washed');
 assert.match(fact(result,'roast_level').source_path,/\/1\/label\/eng$/);
 assert.match(fact(result,'process').source_path,/\/1\/description\/eng$/);
});

test('first-entry provenance and valid selected values remain unchanged',()=>{
 const state=stateFor({
  roastLevel:[{label:{eng:'Dark'}}],
  processing:[{description:{eng:'Natural'}}]
 });
 const result=parse(state);
 assert.equal(result.fields.roast_level,'Dark');
 assert.equal(result.fields.process,'Natural');
 assert.match(fact(result,'roast_level').source_path,/\/0\/label\/eng$/);
 assert.match(fact(result,'process').source_path,/\/0\/description\/eng$/);
});

test('multiple legitimate entries are conflicts, not a falsely cited first selection',()=>{
 const result=parse(stateFor({
  roastLevel:[{label:{eng:'Light'}},{label:{eng:'Dark'}}],
  processing:[{description:{eng:'Washed'}},{description:{eng:'Honey'}}]
 }));
 assert.deepEqual(result.conflicts,['roast_level','process']);
 assert.deepEqual(result.conflict_options.roast_level.map(x=>x.value),['Light','Dark']);
 assert.deepEqual(result.conflict_options.process.map(x=>x.value),['Washed','Honey']);
 assert.equal(result.fields.roast_level,undefined);
 assert.equal(result.fields.process,undefined);
 assert.equal(fact(result,'roast_level'),undefined);
 assert.equal(fact(result,'process'),undefined);
});

test('unsupported processing is never normalized into a published process',()=>{
 const result=parse(stateFor({processing:[{description:{eng:'experimental fermentation'}}]}));
 assert.equal(result.ok,true);
 assert.equal(result.fields.process,undefined);
 assert.equal(fact(result,'process'),undefined);
});

test('untrusted ninth entries cannot expand the bounded first-eight selection',()=>{
 const empties=Array.from({length:8},()=>({label:{eng:''}}));
 const desc=Array.from({length:8},()=>({description:{eng:''}}));
 const result=parse(stateFor({
  roastLevel:[...empties,{label:{eng:'Light'}}],
  processing:[...desc,{description:{eng:'Natural'}}]
 }));
 assert.equal(result.fields.roast_level,undefined);
 assert.equal(result.fields.process,undefined);
});

test('related product roast and process never contaminate exact selected product facts',()=>{
 const result=parse(stateFor({roastLevel:[],processing:[]}));
 assert.equal(result.ok,true);
 assert.equal(result.fields.name,'Example Coffee');
 assert.equal(result.fields.roast_level,undefined);
 assert.equal(result.fields.process,undefined);
});

test('a changed selected product identity fails closed',()=>{
 const result=parse(stateFor({slug:{current:'another-coffee'},roastLevel:[{label:{eng:'Light'}}]}));
 assert.equal(result.ok,false);
 assert.equal(result.reason,'ambiguous_or_missing_product');
});

test('unsupported public URL route is not treated as the selected Next product',()=>{
 const result=parse(stateFor({roastLevel:[{label:{eng:'Light'}}]}),
  'https://www.bluebottlecoffee.com/us/eng/collection/example-coffee');
 assert.equal(result,null);
});
