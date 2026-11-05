// Issue #33 original603 selected current producer-role boundaries #290/#380/#571.
// Synthetic, adversarial exact-product fixtures; genuine public HTML evidence
// is in the bounded current-source run 41812776713, NOT this test file.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const html=(name,paras,tail='')=>'<html><body><main><article class="product"><h1>'+name+'</h1><div itemprop="description">'+
 paras.map(p=>'<p>'+p+'</p>').join('')+'</div></article></main>'+tail+'</body></html>';
const parse=(name,paras,tail='')=>extractPublicCoffeeFacts(html(name,paras,tail),{
 source_url:'https://example-roaster.test/products/selected-coffee'});
const assertNoProducer=(r)=>{assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.fields.producer,undefined,JSON.stringify(r.fields));};
const guji='Natural Organic Ethiopia Guiji';
const gujiStory='Handpicked and sun-dried using the natural process, the beans retain their fruity sweetness, producing an aromatic coffee. Grown organically, this coffee reflects the care and tradition of Ethiopia’s smallholder farmers.';
test('#290 broad country-level appreciation is not automatically selected-lot producer',()=>{
 assertNoProducer(parse(guji,['Origin: Guji, Ethiopia','Process: Natural',gujiStory]));
 assertNoProducer(parse(guji,['Origin: Guji, Ethiopia','Process: Natural',gujiStory.replace('this coffee','another coffee')]));
});
test('#290 explicit this-lot smallholder collection remains eligible (positive control)',()=>{
 const r=parse(guji,['This coffee comes from the Guji zone of Ethiopia, a collection from smallholder farmers.']);
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.producer,'smallholder farmers',JSON.stringify(r.fields));
});
const horizon='Horizon Organic';
const horizonStory='The Horizon Organic blend features two great coffee communities sharing one vision of producing high-quality coffee through sustainable, organic practices. Huehuetenango, Guatemala is home to the organic producing community ACODIHUE. Nicaragua contributes coffee from Matagalpa.';
test('#380 one Guatemala component cannot become whole Guatemala/Nicaragua blend producer',()=>{
 const r=parse(horizon,['Origin: Guatemala / Nicaragua','Region: Huehuetenango(GT) / Matagalpa(NI)',horizonStory],
  '<aside class="related-products"><h3>MEET Marta Solares</h3><p>Marta Solares grows coffee at La Esperanza.</p></aside>');
 assertNoProducer(r);
 assert.notEqual(r.fields.producer,'ACODIHUE');
 assert.notEqual(r.fields.producer,'Marta Solares');
});
const dulce='Brazil Capricornio Dulce Signature';
const dulceStory='The Dulce Signature is made up of a 50% naturally processed yellow catuai cherries and 50% honey processed mondo novo cherries. Capricornio is renowned for their experimental practices and leading the way in Brazil. The team collaborated openly to share valuable techniques. Dulce is part of their signature series, crafted blends to meet desired profiles.';
test('#571 signature program/processing organization is not proven current growing producer',()=>{
 const r=parse(dulce,[dulceStory]);
 assertNoProducer(r);
 assert.notEqual(r.fields.process,'Natural',JSON.stringify(r.fields));
 assert.notEqual(r.fields.process,'Honey',JSON.stringify(r.fields));
});
test('#571 direct selected Producer label, unlike signature-program story, is admissible',()=>{
 const r=parse(dulce,[dulceStory,'Producer: Capricornio']);
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.producer,'Capricornio',JSON.stringify(r.fields));
});
