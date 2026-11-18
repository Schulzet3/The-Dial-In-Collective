import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedIconCountryRegion} from '../src/server/coffee-selected-icon-geography.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const clean=(s,n=220)=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim().slice(0,n);
const c=word=>'<h4><img src="https://cdn.example/Origin_16x16.png"> '+word+'</h4>';
const g=word=>'<h4><img src="https://cdn.example/Region_1_16x16.png"> <span>'+word+'</span></h4>';
const good=c('Colombia')+'\n'+g('Antioquia');
const page=(body,extra='',name='Colombia Mina Rica')=>
 '<html><head><title>Old Guatemala SEO</title></head><body><main><article class="product">'+
 '<h1>'+name+'</h1><div class="product__description">'+body+'</div></article></main>'+extra+'</body></html>';
const result=(html)=>selectedIconCountryRegion(html,{clean});
test('R140 selected paired country and region are direct origin',()=>assert.equal(result(page(good)),'Antioquia, Colombia'));
test('R140 actual parser retains direct selected regional precision',()=>{
 const p=extractPublicCoffeeFacts(page(good+'<p>Producer: Mina Rica Farm, San Gabriel</p>'),{source_url:'https://gnosiscoffee.com/products/colombia'});
 assert.equal(p.ok,true);assert.match(p.fields?.origin||'',/Antioquia,\s*Colombia/i,JSON.stringify(p.fields));
});
test('R140 selected name stays chosen rather than icon/SEO',()=>{
 const p=extractPublicCoffeeFacts(page(good,'','Another Selected Coffee'),{source_url:'https://gnosiscoffee.com/products/colombia'});
 assert.equal(p.ok,true);assert.equal(p.fields?.name,'Another Selected Coffee');
});
test('R140 no country means no region inference',()=>assert.equal(result(page(g('Antioquia'))),null));
test('R140 no region means no invented country-region pair',()=>assert.equal(result(page(c('Colombia'))),null));
test('R140 country in nav cannot pair with product region',()=>assert.equal(result(page(g('Antioquia'),'<nav>'+c('Colombia')+'</nav>')),null));
test('R140 related sidebar pair cannot fill selected product',()=>assert.equal(result(page('<p>Washed</p>','<aside>'+good+'</aside>')),null));
test('R140 SEO title cannot supply a missing direct country',()=>assert.equal(result(page(g('Antioquia'),'','Origin_16x16.png Colombia')),null));
test('R140 contradictory selected regional pairs stay blank/reviewable',()=>assert.equal(result(page(good+c('Colombia')+g('Huila'))),null));
test('R140 contradictory selected country pairs stay blank/reviewable',()=>assert.equal(result(page(good+c('Brazil')+g('Minas Gerais'))),null));
test('R140 image titles/alt are not icon-source evidence',()=>{
 const h='<h4><img src="/coffee/photo.png" title="Origin_16x16.png">Colombia</h4>'+
 '<h4><img src="/coffee/photo.png" alt="Region_1_16x16.png">Antioquia</h4>';
 assert.equal(result(page(h)),null);
});
test('R140 unrelated spec between country and region blocks pairing',()=>assert.equal(result(page(c('Colombia')+'<p>Other lot</p>'+g('Antioquia'))),null));
test('R140 template does not contribute missing region',()=>assert.equal(result(page(c('Colombia')+'<template>'+g('Antioquia')+'</template>')),null));
