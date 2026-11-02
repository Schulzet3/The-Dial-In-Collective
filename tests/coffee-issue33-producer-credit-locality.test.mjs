// Issue #33: selected product producer-credit geography without a comma
// before an explicit growing country. Synthetic adversarial fixtures are not
// the raw current official page; see ninth3 official source receipt.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractCoffeeIdentityEvidence} from '../src/server/coffee-identity-evidence.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const url='https://shop.iconikcoffee.com/products/washed-sidra-giorgio-bressani';
const name='Bressani Family Washed Sidra';
const clean=(s,max=6001)=>String(s).replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&')
 .replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
const page=(body,head='')=>'<html><head>'+head+'</head><body><main><article class="product">'+
 '<h1>'+name+'</h1>'+body+'</article></main></body></html>';
const producer='<p>Producer: Bressani Family</p>';
const credit='<p><span>Bressani Family, San Jerónimo Guatemala</span></p>';
const direct=(html,fields={producer:'Bressani Family'})=>
 extractCoffeeIdentityEvidence(html,{name,fields,clean}).facts;
const origin=facts=>facts.filter(x=>x.label==='Origin').map(x=>x.value);

test('#312 exact selected producer credit + literal locality and country supplies origin',()=>{
 assert.deepEqual(origin(direct(page(producer+credit))),['San Jerónimo, Guatemala']);
 const parsed=extractPublicCoffeeFacts(page(producer+credit+'<p>Process: Washed</p><p>Variety: Sidra</p>'),
  {source_url:url});
 assert.equal(parsed.ok,true,JSON.stringify(parsed));
 assert.equal(parsed.fields.origin,'San Jerónimo, Guatemala');
 assert.equal(parsed.fields.producer,'Bressani Family');
 assert.equal(parsed.fields.process,'Washed');
});

test('Unicode current product credit also works in a BR-separated short paragraph',()=>{
 const html=page(producer+'<p><strong>Bressani Family, San Jerónimo Guatemala</strong><br><span>1550m</span></p>');
 assert.deepEqual(origin(direct(html)),['San Jerónimo, Guatemala']);
});

test('unmatched producer, unnamed producer and a different selected H1 cannot donate locality',()=>{
 assert.deepEqual(origin(direct(page('<p>Other Family, San Jerónimo Guatemala</p>'))),[]);
 assert.deepEqual(origin(direct(page(credit),{})),[]);
 assert.deepEqual(origin(extractCoffeeIdentityEvidence(page(credit),{
  name:'Another Washed Sidra',fields:{producer:'Bressani Family'},clean
 }).facts),[]);
});

test('stale SEO-only locality is never canonical',()=>{
 const seo='<meta property="og:description" content="Bressani Family, San Jerónimo Guatemala">';
 const parsed=extractPublicCoffeeFacts(page(producer+'<p>Washed Sidra.</p>',seo),{source_url:url});
 assert.equal(parsed.ok,true);
 assert.equal(parsed.fields.origin,undefined);
 assert.deepEqual(origin(direct(page(producer+'<p>Washed Sidra.</p>',seo))),[]);
});

test('missing country, cultivar and navigation/related product cannot supply a growing locality',()=>{
 for(const value of ['Bressani Family, San Jerónimo','Bressani Family, Sidra Guatemala',
  'Bressani Family, Coffee Shop Guatemala']){
  assert.deepEqual(origin(direct(page(producer+'<p>'+value+'</p>'))),[],value);
 }
 for(const tag of ['nav','footer','aside']){
  assert.deepEqual(origin(direct(page(producer+'<'+tag+'>Bressani Family, San Jerónimo Guatemala</'+tag+'>'))),[],tag);
 }
});

test('two distinct current locality credits remain unresolved; existing direct origin is never overwritten',()=>{
 const two=page(producer+credit+'<p>Bressani Family, Santa Maria Guatemala</p>');
 assert.deepEqual(origin(direct(two)),[]);
 assert.deepEqual(origin(direct(page(producer+credit),{producer:'Bressani Family',
  origin:'Lake Atitlán, Guatemala'})),[]);
});
