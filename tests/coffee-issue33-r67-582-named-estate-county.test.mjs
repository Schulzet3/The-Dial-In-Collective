import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedCurrentNamedEstateCountyOrigin as refine} from '../src/server/coffee-selected-current-estate-county.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const name='Oneska - Kenya',producer='Onesmus and Karen Njagi';
const story='Oneska is the small estate farm of Onesmus Njagi, a retired schoolteacher, and his wife, Karen, on the slopes of Mount Kenya in Embu County.';
const opts={name,origin:'Mount Kenya, Kenya',producer,process:'Washed'};
const doc=({title=name,hero='Embu Kenya',origin='Mount Kenya, Kenya',prose=story,grower=producer,process='Washed',tail='',head=''}={})=>
 '<html><head>'+head+'</head><body><main><article class="product"><h1>'+title+'</h1>'+
 '<div class="product-subtitle">'+hero+'</div><h2>Description</h2><p>'+prose+'</p>'+
 '<h2>Details</h2><dl><dt>Origin</dt><dd>'+origin+'</dd><dt>Producer</dt><dd>'+grower+
 '</dd><dt>Processing</dt><dd>'+process+'</dd></dl>'+tail+'</article></main></body></html>';
test('matched current estate and hero county refine a broad mountain, not contradicting locality',()=>{
 assert.equal(refine(doc(),opts)?.value,'Embu, Kenya');
 assert.equal(refine(doc(),{...opts,origin:'Kenya'})?.value,'Embu, Kenya');
 assert.equal(refine(doc(),{...opts,origin:'Kirinyaga, Kenya'}),null);
});
test('no borrowing from old lot, wrong country/identity, producer/process, sibling or SEO',()=>{
 const wrong=[
  [doc({title:'Kamavindi - Kenya'}),opts],
  [doc({hero:'Nyeri Kenya'}),opts],
  [doc({hero:'Last year Embu Kenya'}),opts],
  [doc({prose:'Last year '+story}),opts],
  [doc({prose:story.replace('Oneska is','Previously Oneska was')}),opts],
  [doc({grower:'Other Cooperative'}),opts],
  [doc({process:'Natural'}),opts],
  [doc({tail:'<h1>Other coffee</h1>'}),opts],
  [doc({prose:'Current details absent.<h2>Related products</h2>'+story}),opts],
  [doc({head:'<meta name="description" content="'+story+' Embu Kenya">',prose:'Current story unrelated.'}),opts],
  [doc(),{...opts,origin:'Mount Kenya, Ethiopia'}],
  [doc(),{...opts,producer:'Other Person'}],
  [doc(),{...opts,process:'Honey'}]
 ];
 for(const [html,fields] of wrong)assert.equal(refine(html,fields),null,
  html.slice(0,120)+' | '+JSON.stringify(fields));
});
test('actual parser and editable Add Coffee retain direct named estate county',()=>{
 const url='https://www.tandemcoffee.com/products/kamavindi-kenya-copy';
 const parsed=extractPublicCoffeeFacts(doc(),{source_url:url});
 assert.equal(parsed.ok,true,JSON.stringify(parsed).slice(0,2000));
 assert.equal(parsed.fields.origin,'Embu, Kenya',JSON.stringify(parsed).slice(0,2400));
 assert.equal(parsed.fields.process,'Washed');
 assert.ok(parsed.source_facts?.some(f=>f.field==='origin'&&
  f.label==='Exact selected named estate growing county'),JSON.stringify(parsed).slice(0,2000));
 assert.ok(coffeeUrlPreviewMarkup(parsed).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...parsed,source_url:url}));
});
