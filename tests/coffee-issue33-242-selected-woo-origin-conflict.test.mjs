// Original603 #242: same selected official Woo Danche H5 prints GEDEB
// but Harvest Details Location prints Geed. Both remain reviewable.
import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedWooShortOriginConflict as check} from '../src/server/coffee-selected-woo-short-origin-conflict.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const name='Danche',url='https://novocoffee.com/product/danche';
const clean=(v,max=250)=>String(v??'').replace(/<[^<>]*>/gu,' ').replace(/\s+/gu,' ').trim().slice(0,max);
const facts=[
 {field:'origin',source_type:'html',label:'LOCATION',value:'Geed, Ethiopia'},
 {field:'producer',source_type:'html',label:'PRODUCER',value:'Neguesse Debela'}
];
const page=({title=name,heading='GEDEB, ETHIOPIA',author='NEGUESSE DEBELA',short=true,
 location='Geed, Ethiopia',producer='Neguesse Debela',extra=''}={})=>
 '<html><head><meta property="og:type" content="product"></head><body><main>'+
 '<article class="product"><div class="summary entry-summary"><h1>'+title+'</h1>'+
 (short?'<div class="woocommerce-product-details__short-description">'+
 '<h5>'+author+'<br />'+heading+'</h5><p>Lemon-lime, Honeysuckle, Blueberry Pie</p></div>':'')+
 '</div><section><h4>Harvest Details</h4>'+
 '<p>Location: '+location+'</p><p>Producer: '+producer+'</p>'+
 '<p>Process: Washed</p><p>Variety: Local Cultivars</p>'+
 '<p>Tasting Notes: Lemon-lime, Honeysuckle, Blueberry Pie</p></section>'+
 extra+'</article></main></body></html>';
const direct=(p=page(),options={})=>check(p,{
 name,origin:'Geed, Ethiopia',producer:'Neguesse Debela',source_facts:facts,clean,...options
});
test('unique selected producer H5 and Location label are materially contradictory',()=>{
 const c=direct();
 assert.equal(c?.spec,'Geed, Ethiopia');
 assert.equal(c?.hero,'GEDEB, ETHIOPIA');
 assert.match(c?.quote||'',/NEGUESSE DEBELA.*GEDEB, ETHIOPIA/i);
});
test('actual parser retains both literals, withholds origin, leaves process and Add Coffee usable',()=>{
 const q=extractPublicCoffeeFacts(page(),{source_url:url});
 assert.equal(q.ok,true,JSON.stringify(q));
 assert.equal(q.fields.name,'Danche');
 assert.equal(q.fields.origin,undefined,JSON.stringify(q));
 assert.ok(q.conflicts?.includes('origin'),JSON.stringify(q));
 assert.match(JSON.stringify(q.conflict_options||{}),/Geed, Ethiopia/);
 assert.match(JSON.stringify(q.conflict_options||{}),/GEDEB, ETHIOPIA/);
 assert.ok(q.source_facts?.some(f=>f.conflicting&&f.field==='origin'&&
  /Geed, Ethiopia/.test(f.value)),JSON.stringify(q));
 assert.ok(q.conflict_options?.origin?.some(x=>/GEDEB, ETHIOPIA/.test(x.value)),JSON.stringify(q));
 assert.equal(q.fields.process,'Washed');
 assert.equal(q.fields.producer,'Neguesse Debela');
 assert.ok(coffeeUrlPreviewMarkup(q));
 assert.ok(coffeeSourceReviewSnapshot({...q,source_url:url}));
});
test('matching direct H5 does not manufacture a conflict',()=>{
 assert.equal(direct(page({heading:'Geed, Ethiopia'})),null);
 const q=extractPublicCoffeeFacts(page({heading:'Geed, Ethiopia'}),{source_url:url});
 assert.equal(q.ok,true,JSON.stringify(q));
 assert.ok(!q.conflicts?.includes('origin'),JSON.stringify(q));
});
test('SEO, another H1, producer mismatch, absent H5 and related products cannot override selected Location',()=>{
 assert.equal(direct(page({short:false,extra:'<meta name="description" content="GEDEB, ETHIOPIA">'})),null);
 assert.equal(direct(page({title:'Different Coffee'})),null);
 assert.equal(direct(page({author:'Someone Else'})),null);
 assert.equal(direct(page({short:false,extra:'<aside class="related products"><h5>NEGUESSE DEBELA<br/>GEDEB, ETHIOPIA</h5></aside>'})),null);
});
test('absent exact source label, other country and ambiguous duplicate H5 fail closed',()=>{
 assert.equal(direct(page(),{source_facts:facts.filter(f=>f.field!=='origin')}),null);
 assert.equal(direct(page(),{source_facts:facts.filter(f=>f.field!=='producer')}),null);
 assert.equal(direct(page({heading:'Gedeb, Colombia'})),null);
 assert.equal(direct(page({heading:'Gedeb, Ethiopia AND Colombia'})),null);
 const duplicated=page().replace('</h5>','</h5><h5>NEGUESSE DEBELA<br/>ANOTHER, ETHIOPIA</h5>');
 assert.equal(direct(duplicated),null);
});
