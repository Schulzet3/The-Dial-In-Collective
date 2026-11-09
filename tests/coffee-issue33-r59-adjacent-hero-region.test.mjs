import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedCurrentAdjacentHeroRegion as refine} from '../src/server/coffee-selected-adjacent-hero-region.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const name='Heri Agena - Ethiopia';
const url='https://www.tandemcoffee.com/products/heri-agena-ethiopia';
const selected=({h1=name,subtitle='Bensa, Sidama Ethiopia',pre='',post='',origin='Ethiopia'}={})=>
 '<html><head><meta property="og:type" content="product"></head><main><article class="product">'+
 pre+'<h1>'+h1+'</h1><div class="product__subtitle">'+subtitle+'</div>'+
 '<div class="product-description"><p>Origin: '+origin+'</p><p>Producer: Smallholder Farmers</p>'+
 '<p>Variety: Heirloom</p><p>Elevation: 2380-2500 MASL</p><p>Processing: Washed</p>'+
 '<p>We hear: Plum, Lemonade, Wildflower Honey</p></div>'+post+'</article></main></html>';
test('R59 original603 #581 selected hero gives current Bensa Sidama origin and UI',()=>{
 const html=selected();
 assert.equal(refine(html,{name,origin:'Ethiopia'})?.value,'Bensa, Sidama, Ethiopia');
 const out=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(out.ok,true,JSON.stringify(out));
 assert.equal(out.fields.origin,'Bensa, Sidama, Ethiopia',JSON.stringify(out));
 assert.ok(coffeeUrlPreviewMarkup(out).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...out,source_url:url}));
});
test('R59 generic distinct selected #580 hero geography and existing fine origins',()=>{
 const otherName='Faver Ninco - Colombia';
 const html=selected({h1:otherName,subtitle:'Santa Maria, Huila Colombia',origin:'Colombia'});
 assert.equal(refine(html,{name:otherName,origin:'Colombia'})?.value,'Santa Maria, Huila, Colombia');
 assert.equal(refine(html,{name:otherName,origin:'Huila, Colombia'}),null);
});
test('R59 reject changed H1, historic/related/SEO, wrong country, misleading sensory, ambiguous hero',()=>{
 for(const [html,props] of [
  [selected({h1:'Hamasho Borena - Ethiopia'}),{name,origin:'Ethiopia'}],
  [selected({subtitle:'Other coffee',post:'<h2>Related products</h2><p>Bensa, Sidama Ethiopia</p>'}),{name,origin:'Ethiopia'}],
  [selected({subtitle:'Other coffee',pre:'<meta content="Bensa, Sidama Ethiopia">'}),{name,origin:'Ethiopia'}],
  [selected({subtitle:'Last year Bensa, Sidama Ethiopia'}),{name,origin:'Ethiopia'}],
  [selected({subtitle:'Bensa, Sidama Kenya'}),{name,origin:'Ethiopia'}],
  [selected(),{name,origin:'Kenya'}],
  [selected(),{name,origin:'Sidama, Ethiopia'}],
  [selected({subtitle:'Chocolate, Cherry Ethiopia'}),{name,origin:'Ethiopia'}],
  [selected({post:'<h1>Other coffee</h1>'}),{name,origin:'Ethiopia'}],
  [selected({subtitle:'Bensa, Sidama Ethiopia; Bura, Sidama Ethiopia'}),{name,origin:'Ethiopia'}]
 ])assert.equal(refine(html,props),null,JSON.stringify({html,props}).slice(0,480));
});
test('R59 contradictory present origin cannot be overwritten by the hero',()=>{
 const p=extractPublicCoffeeFacts(selected({origin:'Kenya'}),{source_url:url});
 assert.notEqual(p.fields?.origin,'Bensa, Sidama, Ethiopia');
});
