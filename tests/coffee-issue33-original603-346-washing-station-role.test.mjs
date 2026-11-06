import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeFieldKey} from '../src/server/coffee-semantic-specs.mjs';
import {collectCoffeeSourceFacts} from '../src/server/coffee-source-facts.mjs';

// Direct selected current official primary source: original603 #346, retrieved
// 2026-11-06 exact merged 9f871078ec81c6715e2f10f421c9669f42733e64,
// GitHub Actions 42249862789, original source HTML sha256
// 191e6d9fb862d98c612a1ccdb6e0724208a5974ae34889f4dcb906c7162fcbbf.
// These deliberately narrow HTML fixtures are not the captured full page.
const url='https://sparkyscraftcoffeeroasting.com/products/below-zero-blend';
const name='Below Zero Ethiopia Natural';
const h1='<main><h1>'+name+'</h1>';
const facts='<p>Washing Station | Idido</p><p>Process | Natural</p>'+ 
 '<p>Variety | Heirloom Ethiopian Varieties</p><p>Elevation | 1850-1880 MASL</p>'+ 
 '<p>Region | Idido, Yirgacheffe</p><p>Country | Ethiopia</p>';
const parse=body=>extractPublicCoffeeFacts(h1+body+'</main>',{source_url:url});
const station=preview=>(preview.source_facts||[]).filter(f=>/washing station/i.test(f.label||'')&&f.value==='Idido');

test('only a Washing Station label cannot autofill the named coffee producer',()=>{
 const result=parse(facts);
 assert.equal(result.ok,true);
 assert.equal(result.fields.name,name);
 assert.equal(result.fields.producer,undefined,'a station or place is not a named grower');
 assert.equal(result.fields.process,'Natural');
 assert.equal(result.fields.variety,'Heirloom Ethiopian Varieties');
 assert.ok(station(result).length>0,'literal station source must remain for review');
 assert.ok(station(result).every(f=>f.field!=='producer'));
});

test('typed literal station survives both semantic and current selected source review without producer promotion',()=>{
 assert.equal(coffeeFieldKey('Washing Station'),'washing_station');
 const rows=collectCoffeeSourceFacts(h1+facts+'</main>',{name,source_url:url});
 const kept=rows.filter(f=>/washing station/i.test(f.label||'')&&f.value==='Idido');
 assert.ok(kept.length>0);
 assert.ok(kept.every(f=>f.field!=='producer'));
 assert.ok(kept.some(f=>f.source_url===url));
});

test('a separate explicitly identified producer outranks a washing station but both remain attributed',()=>{
 const result=parse('<p>Producer | Alem Desta</p>'+facts);
 assert.equal(result.ok,true);
 assert.equal(result.fields.producer,'Alem Desta');
 assert.ok(station(result).length>0);
 assert.ok(station(result).every(f=>f.field!=='producer'));
});

test('real standalone farmer and farm labels retain prior behavior',()=>{
 assert.equal(parse('<p>Farmer | Alem Desta</p>').fields.producer,'Alem Desta');
 assert.equal(parse('<p>Farm | Finca Azul</p>').fields.producer,'Finca Azul');
 assert.equal(parse('<p>Producer | Idido</p><p>Washing Station | Idido</p>').fields.producer,'Idido');
});

test('related and other-product washing stations cannot become selected producer facts',()=>{
 const result=parse('<p>Process | Natural</p>'+ 
  '<section class="related-products"><h2>You may also like</h2><p>Washing Station | Idido</p>'+ 
  '<p>Producer | Unrelated Grower</p></section>');
 assert.equal(result.ok,true);
 assert.equal(result.fields.producer,undefined);
});

test('unrelated structured Product station label cannot become selected producer',()=>{
 const other={'@type':'Product',name:'Another Coffee',url:'https://roaster.example/products/another-coffee',
  additionalProperty:[{'@type':'PropertyValue',name:'Washing Station',value:'Idido'}]};
 const result=parse('<script type="application/ld+json">'+JSON.stringify(other)+'</script>'+facts);
 assert.equal(result.fields.producer,undefined);
 assert.ok(station(result).some(f=>f.source_url===url));
});
