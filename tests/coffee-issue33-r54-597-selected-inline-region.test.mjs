import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedCurrentInlineCompoundRegion as refine} from '../src/server/coffee-selected-inline-region.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const name='Kenya Nkumari, P1 C',source_url='https://www.wreckingballcoffee.com/products/kenya-estate';
const specs='Washed Process. Dried on raised beds. Variety: SL28 and Ruiru 11 (which are exclusive varieties to Kenya). Farm: Nkumari. Producer: Naman Meme. Region: Meru. Elevation; 1400 meters above sea level. Roast level: lightest roast on the menu!';
const blocks=(s=specs,n=name)=>[{tag:'h1',text:n},{tag:'h2',text:'What’s in it:'},{tag:'p',text:s,section:'What’s in it:',educational:false}];
const parse=(story=specs,{title=name,related='',extra=''}={})=>
 extractPublicCoffeeFacts('<html><head><meta property="og:type" content="product"></head><body>'+
 '<main><article class="product"><h1>'+title+'</h1><div class="product-description"><h2>What’s in it:</h2><p>'+story+'</p>'+extra+'</div></article></main>'+related+'</body></html>',{source_url});
test('direct current selected compound Product process/variety/farm/producer/region preserves Meru',()=>{
 const got=refine({name,country:'Kenya',origin:'Kenya',blocks:blocks()});
 assert.equal(got?.value,'Meru, Kenya');
 assert.match(got.quote,/Region: Meru/);
 const q=parse();assert.equal(q.ok,true,JSON.stringify(q));
 assert.equal(q.fields.origin,'Meru, Kenya',JSON.stringify(q));
 assert.equal(q.fields.variety,'SL28 and Ruiru 11',JSON.stringify(q));
 assert.equal(q.fields.elevation_m,'1400 meters above sea level',JSON.stringify(q));
 assert.ok(!q.conflicts?.includes('origin'),JSON.stringify(q.conflicts));
 assert.match(coffeeUrlPreviewMarkup(q),/Meru, Kenya/);
 assert.ok(coffeeSourceReviewSnapshot({...q,source_url}));
});
test('generic current different selected country/region uses only its own literal evidence',()=>{
 const n='Ethiopia Selected Coffee',s=specs.replace('Kenya','Ethiopia').replace('Meru','Guji');
 assert.equal(refine({name:n,country:'Ethiopia',origin:'Ethiopia',blocks:blocks(s,n)})?.value,'Guji, Ethiopia');
});
test('stale, unknown, unsupported, conflicting and identity-mismatched regions fail closed',()=>{
 const variants=[
  {origin:'Meru, Kenya'}, {origin:'Ethiopia'}, {name:'Kenya Different Coffee'},
  {blocks:blocks(specs.replace('Region: Meru.','Region: Meru. Region: Huila.'))},
  {blocks:blocks(specs.replace('Producer: Naman Meme.',''))},
  {blocks:blocks(specs.replace('Farm: Nkumari.',''))},
  {blocks:blocks(specs.replace('Washed Process.',''))},
  {blocks:blocks(specs.replace('Variety:','Varieties of'))},
  {blocks:blocks('Previously '+specs)},
  {blocks:blocks(specs.replace('Region: Meru.','Region: Meru may be different.'))},
  {blocks:[...blocks(),{tag:'p',text:specs.replace('Meru','Huila'),section:'Selected specs'}]}
 ];
 for(const over of variants)assert.equal(refine({name,country:'Kenya',origin:'Kenya',blocks:blocks(),...over}),null,JSON.stringify(over).slice(0,500));
});
test('other products, education and unrelated paragraphs cannot donate a selected region',()=>{
 assert.equal(refine({name,country:'Kenya',origin:'Kenya',blocks:[{tag:'h1',text:name},{tag:'p',text:specs,section:'Related products'}]}),null);
 assert.equal(refine({name,country:'Kenya',origin:'Kenya',blocks:[{tag:'h1',text:name},{tag:'p',text:specs,educational:true}]}),null);
 const q=parse('A wonderful cup.',{related:'<aside class="related-products"><h2>Other Products</h2><p>'+specs+'</p></aside>'});
 assert.notEqual(q.fields.origin,'Meru, Kenya');
});

test('direct typed cultivar and elevation fail closed on ambiguous/nonbotanical or nonmetric evidence',()=>{
 const cases=[
  specs.replace('Variety: SL28 and Ruiru 11 (which are exclusive varieties to Kenya).','Variety: unknown breed.'),
  specs.replace('Variety: SL28 and Ruiru 11 (which are exclusive varieties to Kenya).','Variety: Bourbon. Variety: Caturra.'),
  specs.replace('Elevation; 1400 meters above sea level.','Elevation; 1400 grams.'),
  specs.replace('Elevation; 1400 meters above sea level.','Elevation; 1400 meters. Elevation: 1700 meters.')
 ];
 for(const [i,story] of cases.entries()){
  const q=parse(story);
  assert.equal(q.ok,true,JSON.stringify(q));
  if(i<2)assert.equal(q.fields.variety,undefined,'unqualified cultivar: '+JSON.stringify(q.fields));
  else assert.equal(q.fields.elevation_m,undefined,'unqualified elevation: '+JSON.stringify(q.fields));
 }
});
test('unrelated related-product and mismatched H1 cannot donate compound cultivar/elevation',()=>{
 const other='<aside class="related-products"><h2>Related products</h2><p>'+specs+'</p></aside>';
 const q=parse('A balanced coffee.',{related:other});
 assert.equal(q.fields.variety,undefined,JSON.stringify(q.fields));
 assert.equal(q.fields.elevation_m,undefined,JSON.stringify(q.fields));
 const wrong=parse(specs,{title:'Kenya Another Coffee'});
 assert.equal(wrong.fields.variety,undefined,JSON.stringify(wrong.fields));
 assert.equal(wrong.fields.elevation_m,undefined,JSON.stringify(wrong.fields));
});
