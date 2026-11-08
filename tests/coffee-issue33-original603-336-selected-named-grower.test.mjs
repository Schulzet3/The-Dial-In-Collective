// Issue #33 original603 #336: selected named human grower vs explicitly labeled Farm.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {selectedDirectProductCredits} from '../src/server/coffee-direct-product-prose.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const source_url='https://coffee.example/products/mexico-luis-ordonez-2026';
const chosen='Mexico Luis Ordóñez';
const story="We first purchased Luis’s coffee in 2020 and we've continued to do so every year since. Located in the Amatenango de la Frontera municipality of Chiapas, Mexico, Luis cultivates more than a dozen different varieties and is highly focused on quality.";
const spec='<p>Country: Mexico</p><p>State: Chiapas</p><p>Municipality: Amatenango de la Frontera</p><p>Farm: La Piedra</p><p>Process: Washed</p><p>Notes: Nut Brittle, Chocolate, Clementine</p>';
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const page=(name,body,storyFirst=false)=>'<html><head><meta property="og:type" content="product"></head><body><main class="product">'+(storyFirst?body+'<h1>'+esc(name)+'</h1>':'<h1>'+esc(name)+'</h1><section class="product-information">'+body+'</section>')+'</main></body></html>';
const clean=s=>String(s).replace(/<[^>]{0,800}>/g,' ').replace(/\s+/g,' ').trim();
const parse=(name,body,first=false)=>extractPublicCoffeeFacts(page(name,body,first),{source_url});

test('exact selected current named cultivator overrides Farm fallback, retains Farm provenance and UI',()=>{
 const p=parse(chosen,'<p>'+esc(story)+'</p>'+spec);
 assert.equal(p.ok,true);
 assert.equal(p.fields.producer,'Luis Ordóñez',JSON.stringify(p.fields));
 assert.equal(p.roaster_details.farm,'La Piedra');
 assert.equal(p.fields.process,'Washed');
 assert.match(coffeeUrlPreviewMarkup(p),/Luis Ordóñez/u);
 assert.ok(coffeeSourceReviewSnapshot({...p,source_url}));
 assert.ok(p.source_facts.some(f=>f.label?.toLowerCase()==='farm'&&f.value==='La Piedra'&&f.field!=='producer'));
 const direct=selectedDirectProductCredits(page(chosen,'<p>'+esc(story)+'</p>'+spec),{name:chosen,clean});
 assert.equal(direct.producer,'Luis Ordóñez');
 assert.equal(direct.named_current_cultivator_producer,true);
});

test('generic selected H1 grower credit is not a roaster or URL allowlist',()=>{
 const n='Peru Elena Flores',s="We first sourced Elena's coffee in 2021 and we've continued to do so every year since. Elena grows coffee on her family farm.";
 const p=parse(n,'<p>'+s+'</p><p>Farm: Villa Verde</p>');
 assert.equal(p.fields.producer,'Elena Flores',JSON.stringify(p.fields));
 assert.equal(p.roaster_details.farm,'Villa Verde');
});

test('competing title, missing present cultivation, old/other lot and absent continuity do not override Farm',()=>{
 const cases=[
  ['Mexico Ada Flores',story],
  [chosen,"We first purchased Luis’s coffee in 2020, but stopped buying it. Luis cultivates coffee now."],
  [chosen,"We first purchased Luis’s coffee in 2020 and we've continued to do so every year since. María cultivates coffee."],
  [chosen,"We first purchased Luis’s coffee in 2020 and we've continued to do so every year since. Luis previously cultivated coffee."],
  [chosen,"Our other coffee: We first purchased Luis’s coffee in 2020 and we've continued to do so every year since. Luis cultivates coffee."],
  [chosen,"A different farmer's coffee: We first purchased Luis’s coffee in 2020 and we've continued to do so every year since. Luis cultivates coffee."],
  [chosen,"In 2020 we first bought Luis’s coffee. Luis cultivates coffee."],
  [chosen,"We first purchased Luis’s coffee in 2020 and we've continued to do so every year since, but no longer work with him. Luis cultivates coffee."],
  [chosen,"Luis cultivates coffee at this farm. Last season we purchased his coffee."],
 ];
 for(const [name,s] of cases){
  const p=parse(name,'<p>'+esc(s)+'</p>'+spec);
  assert.notEqual(p.fields.producer,'Luis Ordóñez',s);
 }
 const unselected=page(chosen,'<p>Current lot is from a different farmer.</p>'+spec+
 '<aside class="related-products"><h2>Other coffee</h2><p>'+esc(story)+'</p></aside>');
 assert.notEqual(extractPublicCoffeeFacts(unselected,{source_url}).fields.producer,'Luis Ordóñez');
});

test('explicit contrary Producer always wins; farm-only product cannot fabricate a person',()=>{
 const p=parse(chosen,'<p>'+esc(story)+'</p>'+spec+'<p>Producer: Ana Flores</p>');
 assert.notEqual(p.fields.producer,'Luis Ordóñez',JSON.stringify(p.fields));
 const bare=parse('Mexico Sierra Grande','<p>This coffee is sourced from Sierra Grande.</p><p>Farm: La Piedra</p>');
 assert.equal(bare.fields.producer,'La Piedra');
 assert.ok(bare.source_facts.some(f=>f.label?.toLowerCase()==='farm'&&f.value==='La Piedra'&&f.field==='producer'));
});
