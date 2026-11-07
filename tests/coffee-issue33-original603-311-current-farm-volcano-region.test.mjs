import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedCurrentFarmVolcanoRegion as select} from '../src/server/coffee-selected-farm-volcano-region.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const name='Volcán Atitlán Guatemala';
const origin='Guatemala',producer='Giorgio Bressani',process='Washed';
const story="Finca San Jerónimo Miramar sits on a volcano in Atitlán. In 2015, Iconik made contact with Giorgio, a third-generation coffee producer, who showed us the ropes on his family farm. Giorgio has what we call a Varietal Library, where he grows Liberica, Gesha, Bourbon. San Jerónimo is focused on sustainable farming.";
const args={name,origin,producer,process};
const blocks=(paragraph=story)=>[{tag:'h1',text:name},
 {tag:'p',text:paragraph,section:'Selected farm',educational:false}];
const page=(paragraph=story)=>'<html><head><meta property="og:type" content="product"></head><body><main class="product"><article><h1>'+name+'</h1><div class="product__description"><p>Origin: Guatemala</p><p>Producer: Giorgio Bressani</p><p>Process: Washed</p><p>Tasting Notes: Black cherry, walnut, nougat</p><p>'+paragraph+'</p></div></article></main></body></html>';
const url='https://shop.iconikcoffee.com/products/washed-guatemala-finca-san-jeronimo';

test('selected current farm, title region, credited producer and process refine only the region',()=>{
 const r=select({...args,blocks:blocks()});
 assert.equal(r?.value,'Atitlán, Guatemala',JSON.stringify(r));
 assert.match(r.quote,/Finca San Jerónimo Miramar/);
 assert.match(r.quote,/volcano in Atitlán/);
 assert.doesNotMatch(r.value,/San Jerónimo/);
});
test('Add Coffee parser and Source Review preserve chosen identity and geographic provenance',()=>{
 const r=extractPublicCoffeeFacts(page(),{source_url:url});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.name,name);
 assert.equal(r.fields.origin,'Atitlán, Guatemala',JSON.stringify(r.fields));
 assert.equal(r.fields.producer,producer);
 assert.equal(r.fields.process,process);
 assert.ok(!(r.conflicts||[]).includes('origin'));
 assert.match(coffeeUrlPreviewMarkup(r),/Atitlán, Guatemala/);
 assert.ok(coffeeSourceReviewSnapshot({...r,source_url:url}));
 assert.ok(r.source_facts.some(f=>f.field==='origin'&&/Finca San Jerónimo Miramar/.test(f.value)));
});
test('generic rule applies to different exact selected region and farm',()=>{
 const other={name:'Volcán Acatenango Guatemala',origin:'Guatemala',producer:'Elena Perez',process:'Natural',
  blocks:[{tag:'h1',text:'Volcán Acatenango Guatemala'},
   {tag:'p',text:'Finca La Esperanza sits on a volcano in Acatenango. Elena, a second-generation coffee producer, showed us her family farm.',section:'Selected farm'}]};
 assert.equal(select(other)?.value,'Acatenango, Guatemala');
});
test('mismatched H1, geography, farmer, processing and coffee identity fail closed',()=>{
 for(const override of [{name:'Volcán Other Guatemala'},{origin:'Nicaragua'},
  {origin:'Atitlán, Guatemala'},{producer:'Elena Perez'},{producer:''},
  {process:'Other/Unknown'},{process:''}])
  assert.equal(select({...args,...override,blocks:blocks()}),null,JSON.stringify(override));
 assert.equal(select({...args,blocks:[...blocks(),{tag:'h1',text:'Other Coffee'}]}),null);
 assert.equal(select({...args,blocks:blocks(story.replace('volcano in Atitlán','volcano in Acatenango'))}),null);
});
test('historical, educational, unrelated, contradictory and facility-only prose fail closed',()=>{
 for(const txt of ['Previously '+story,story.replace('coffee producer','roaster'),
  story.replace('his family farm','a processing site')])
  assert.equal(select({...args,blocks:blocks(txt)}),null,txt);
 for(const section of ['Related products','Other coffees','Customer reviews'])
  assert.equal(select({...args,blocks:[blocks()[0],{...blocks()[1],section}]}),null,section);
 assert.equal(select({...args,blocks:blocks().map(x=>x.tag==='p'?{...x,educational:true}:x)}),null);
 assert.equal(select({...args,blocks:[...blocks(),{tag:'p',text:story.replace('Atitlán','Acatenango'),section:'Selected farm'}]}),null);
});
