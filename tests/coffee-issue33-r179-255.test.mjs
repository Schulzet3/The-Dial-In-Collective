import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {normalizeRoastLabel,roastLabelHint} from '../src/server/roast-level-evidence.mjs';
import {chosen255,source255} from '../scripts/audit/issue33-r179-255-check.mjs';
const own='<h1>OUT SIDE | DARKER ROAST | MEXICO</h1>'+
 '<p>PROCESS -- WASHED</p><p>REGION -- CHIAPAS, MEXICO</p>'+
 '<p>ALTITUDE -- 900-1250 MASL</p><p>CULTIVARS -- TYPICA AND BOURBON</p>'+
 '<p>NOTES -- COCOA, CARAMEL, BROWN SPICE</p>'+
 '<p>Hey! So, this coffee was produced by smallholder growers across the Chiapas communities of Chilon, Simojovel, Yalajon, Sitala, Sabanila, and Ocosingo.</p>';
const page=(selected=own,other='')=>'<html><head><title>Old OUT SIDE Brazil Dark Roast</title><meta name="description" content="Former Peru offering notes nougat and cherry"></head><body><nav>Brazil Dark</nav><main><article class="product">'+selected+'</article></main>'+other+'<footer>Related Colombia Natural Cocoa</footer></body></html>';
const parse=(selected=own,other='')=>extractPublicCoffeeFacts(page(selected,other),{source_url:chosen255.url});
test('#255 current selected Mexico identity not Brazil URL slug',()=>{
 const s=source255(page());assert.equal(s.identity,true);assert.deepEqual(s.headings,[chosen255.name]);
});
test('#255 own Chiapas and washed processing',()=>{
 const s=source255(page());assert.equal(s.geography,true);assert.equal(s.process,true);
});
test('#255 own elevation range, both cultivars and notes',()=>{
 const s=source255(page());assert.equal(s.altitude,true);assert.equal(s.cultivars,true);assert.equal(s.own_notes,true);
});
test('#255 smallholder community story is literal selected evidence',()=>{
 assert.equal(source255(page()).selected_smallholders,true);
});
test('#255 actual parser keeps selected Mexico not old Peru metadata',()=>{
 const r=parse();assert.equal(r.ok,true,JSON.stringify(r).slice(0,2000));
 assert.equal(r.fields?.name,chosen255.name,JSON.stringify(r).slice(0,2000));
 assert.ok(!String(r.fields?.origin||'').toLowerCase().includes('peru'),JSON.stringify(r).slice(0,2000));
});
test('#255 undefined Darker Roast is not silently mapped to seven-tier Dark',()=>{
 assert.equal(normalizeRoastLabel('Darker Roast'),null);
 assert.ok(roastLabelHint('Darker Roast'));
 const r=parse();assert.ok(!r.fields?.roast_level,JSON.stringify(r).slice(0,2200));
});
test('#255 direct notes must not borrow old Peru cherry or nougat',()=>{
 const r=parse();const notes=String(r.fields?.tasting_notes||'').toLowerCase();
 assert.ok(!notes.includes('cherry')&&!notes.includes('nougat'),JSON.stringify(r).slice(0,1900));
});
test('#255 related product and customer reviews cannot change current origin',()=>{
 const r=parse(own,'<aside class="related-products"><h2>PERU</h2><p>Producer Cajamarca, Natural, cherry and nougat.</p></aside><section class="customer-reviews"><p>COLOMBIA DARKER ROAST, previous lot</p></section>');
 assert.ok(!String(r.fields?.origin||'').toLowerCase().includes('peru'),JSON.stringify(r).slice(0,2200));
 assert.ok(!String(r.fields?.origin||'').toLowerCase().includes('colombia'),JSON.stringify(r).slice(0,2200));
});
test('#255 changed current H1 cannot certify old Mexico product',()=>{
 assert.equal(source255(page(own.replace('OUT SIDE | DARKER ROAST | MEXICO','OUT SIDE | DARKER ROAST | PERU'))).identity,false);
});
test('#255 absent own notes cannot satisfy literal source proof',()=>{
 assert.equal(source255(page(own.replace('COCOA, CARAMEL, BROWN SPICE','CHERRY, NOUGAT'))).own_notes,false);
});
test('#255 missing selected farm story cannot count as direct product evidence',()=>{
 assert.equal(source255(page(own.replace(/<p>Hey![\s\S]*?<\/p>/,'<p>Read more about other farms.</p>'))).selected_smallholders,false);
});
test('#255 unprinted decaf and espresso recipes remain blank',()=>{
 const r=parse();assert.ok(!r.fields?.decaffeination_method&&!r.fields?.espresso_recipe,JSON.stringify(r).slice(0,1800));
});

test('#255 current exact smallholder localities are separately reviewable; canonical producer stays anonymous',()=>{
 const r=parse();assert.equal(r.ok,true,JSON.stringify(r).slice(0,1800));
 assert.equal(r.fields?.producer,'smallholder growers',JSON.stringify(r).slice(0,1800));
 const facts=(r.source_facts||[]).filter(x=>x.field==='producer_locality_context');
 assert.equal(facts.length,1,JSON.stringify(facts));
 assert.deepEqual(facts[0].value.split(', '),['Chilon','Simojovel','Yalajon','Sitala','Sabanila','Ocosingo']);
 assert.match(r.producer_review_note||'',/not individually named producers/i);
});
test('#255 stale SEO or another related coffee cannot donate growing communities',()=>{
 const without=own.replace(/<p>Hey![\s\S]*?<\/p>/,'<p>No producer details published.</p>');
 const r=parse(without,'<aside>Other coffee was produced by smallholder growers across the Chiapas communities of Wrongville and Losttown.</aside>');
 assert.equal((r.source_facts||[]).filter(x=>x.field==='producer_locality_context').length,0);
});
test('#255 prose about former coffee does not qualify as current locality',()=>{
 const r=parse(own.replace('this coffee was produced','Previously, this coffee was produced'));
 assert.equal((r.source_facts||[]).filter(x=>x.field==='producer_locality_context').length,0);
});
test('#255 producer towns from mismatched region are withheld',()=>{
 const r=parse(own.replace('the Chiapas communities','the Cajamarca communities'));
 assert.equal((r.source_facts||[]).filter(x=>x.field==='producer_locality_context').length,0);
});
test('#255 contradictory current locality lists require review and no chosen list',()=>{
 const r=parse(own+'<p>This coffee was produced by smallholder growers across the Chiapas communities of Newtown and Othertown.</p>');
 assert.equal((r.source_facts||[]).filter(x=>x.field==='producer_locality_context').length,0);
});
test('#255 one community and malformed locality names do not produce structured source fact',()=>{
 for(const phrase of ['the Chiapas communities of Chilon','the Chiapas communities of Chilon, 404town']){
  const r=parse(own.replace('the Chiapas communities of Chilon, Simojovel, Yalajon, Sitala, Sabanila, and Ocosingo',phrase));
  assert.equal((r.source_facts||[]).filter(x=>x.field==='producer_locality_context').length,0,phrase);
 }
});
