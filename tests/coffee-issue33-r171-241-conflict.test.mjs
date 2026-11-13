import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedCurrentCorroboratedHeroNotesConflict as own} from '../src/server/coffee-selected-hero-notes-conflict.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productCoffeeProse} from '../src/server/coffee-product-prose.mjs';
const selected=(flavors='Tangerine, Maple, Hazelnut',story='Buesaco starts with Tangerine, then Maple Syrup, and finishes with Hazelnut.',notes='Cherry, Tangerine, Nougat')=>
 '<html><head><title>Historic Peru coffee</title></head><body><nav>Related coffees</nav><article class="product">'+
 '<h1>Buesaco</h1><p>SMALLHOLDER FARMS</p><p>BUESACO, COLOMBIA</p><p>'+flavors+'</p>'+
 '<p>'+story+'</p><h2>Description</h2><h4>Harvest Details</h4>'+
 '<p>PROCESS: Washed</p><p>Tasting Notes: '+notes+'</p></article></body></html>';
const clean=x=>String(x||'').replace(/<[^<>]{0,2000}>/gu,' ').replace(/\s+/gu,' ').trim();
test('R171 selected current Buesaco story corroborates distinct three-flavor hero',()=>{
 const v=own(selected(),{name:'Buesaco',notes:'Cherry, Tangerine, Nougat',clean});
 assert.ok(v,JSON.stringify(productCoffeeProse(selected(),clean).map(b=>({tag:b.tag,text:b.text,section:b.section,start:b.start,end:b.end}))).slice(0,5000));
 assert.equal(v.hero,'Tangerine, Maple, Hazelnut');assert.equal(v.printed,'Cherry, Tangerine, Nougat');
});
test('R171 changed chosen H1 does not carry archived sensory conflict',()=>{
 assert.equal(own(selected().replace('<h1>Buesaco</h1>','<h1>Peru Current</h1>'),{name:'Buesaco',notes:'Cherry, Tangerine, Nougat',clean}),null);
});
test('R171 uncorroborated chosen hero does not become a conflict',()=>{
 assert.equal(own(selected(undefined,'Buesaco is currently a washed coffee.'),{name:'Buesaco',notes:'Cherry, Tangerine, Nougat',clean}),null);
});
test('R171 equivalent current hero and direct notes stay unconflicted',()=>{
 assert.equal(own(selected('Cherry, Tangerine, Nougat','Buesaco has Cherry, Tangerine and Nougat.'),{name:'Buesaco',notes:'Cherry, Tangerine, Nougat',clean}),null);
});
test('R171 wrong-product aside cannot contaminate chosen hero',()=>{
 const html=selected('No tasting profile available','Buesaco currently has no published flavor notes.')+
 '<aside><h1>Old Lot</h1><p>Tangerine, Maple, Hazelnut</p><p>Buesaco starts with Tangerine, Maple and Hazelnut.</p></aside>';
 assert.equal(own(html,{name:'Buesaco',notes:'Cherry, Tangerine, Nougat',clean}),null);
});
test('R171 incompatible selected hero vs labeled current notes withheld for member choice',()=>{
 const p=extractPublicCoffeeFacts(selected(),{source_url:'https://novocoffee.com/product/buesaco'});
 assert.equal(p.ok,true,JSON.stringify(p));assert.ok((p.conflicts||[]).includes('tasting_notes'),JSON.stringify(p));
 assert.ok(!p.fields.tasting_notes,JSON.stringify(p));
 const opts=p.conflict_options?.tasting_notes||[];
 assert.ok(opts.some(x=>x.value==='Cherry, Tangerine, Nougat'),JSON.stringify(p));
 assert.ok(opts.some(x=>x.value==='Tangerine, Maple, Hazelnut'),JSON.stringify(p));
});
test('R171 old-harvest negative story does not manufacture source conflict',()=>{
 const p=extractPublicCoffeeFacts(selected('Tangerine, Maple, Hazelnut','Previous harvest had Tangerine, Maple and Hazelnut.'),{source_url:'https://novocoffee.com/product/buesaco'});
 assert.ok(!(p.conflicts||[]).includes('tasting_notes'),JSON.stringify(p));
});

test('R171 comma-bearing named marketing sentence is not a three-token hero list',()=>{
 const line='Buesaco starts with Tangerine, then Maple Syrup, and finishes with Hazelnut.';
 assert.equal(own(selected(line,line),{name:'Buesaco',notes:'Cherry, Tangerine, Nougat',clean}),null);
});
