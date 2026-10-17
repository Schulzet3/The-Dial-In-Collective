import test from 'node:test';
import assert from 'node:assert/strict';
import {extractDelimitedCoffeeSpecs} from '../src/server/coffee-delimited-specs.mjs';
import {extractLayoutEvidence} from '../src/server/coffee-product-layouts.mjs';
const clean=(s,max=4000)=>String(s).replace(/<[^>]*>/g,' ')
 .replace(/&amp;/g,'&').replace(/&nbsp;|&#160;/g,' ')
 .replace(/\s+/g,' ').trim().slice(0,max);
const exact='<p><strong>Banko Gotiti CWS // Gedeb, Yirgacheffe, Gedeo Zone, Ethiopia</strong><br>'+
 '<strong><span>Washed-processed heirloom varietals // 2170 masl</span></strong></p>';
const narrative='<p>For this washed-process lot, beans are submerged in water tanks for a 24- to 48-hour fermentation period. '+
 'They are dried on raised African drying beds for roughly 10 to 15 days.</p>';
const run=html=>extractDelimitedCoffeeSpecs(html,{clean});

test('nested Queen City spec yields station plus origin, processing, variety and elevation',()=>{
 assert.deepEqual(run(exact).fields,{producer:'Banko Gotiti CWS',
  origin:'Gedeb, Yirgacheffe, Gedeo Zone, Ethiopia',process:'Washed',
  variety:'heirloom',elevation_m:'2170 masl'});
});
test('two adjacent paragraphs preserve the Natural offering as a distinct process',()=>{
 const p='<p>Banko Gotiti CWS // Gedeb, Ethiopia</p><p>Natural-processed heirloom varietals // 2170 masl</p>';
 assert.equal(run(p).fields.process,'Natural');
 assert.equal(run(p).fields.producer,'Banko Gotiti CWS');
});
test('Unicode producer, variety and localities retain their original spelling',()=>{
 const p='<p>Sonia Bola\u00f1os // Sevilla, San Agust\u00edn, Huila, Colombia<br>Fully washed Pink Bourbon // 1,780 masl</p>';
 const r=run(p).fields;
 assert.equal(r.producer,'Sonia Bola\u00f1os');
 assert.equal(r.origin,'Sevilla, San Agust\u00edn, Huila, Colombia');
 assert.equal(r.variety,'Pink Bourbon');assert.equal(r.elevation_m,'1,780 masl');
});
test('altitude ranges and plus markers remain source facts, not invented midpoints',()=>{
 for(const elevation of ['1,900\u20132,100 masl','2,450+ masl','1900 - 2100 m.a.s.l.','2170 meters above sea level']){
  assert.equal(run(exact.replace('2170 masl',elevation)).fields.elevation_m,elevation);
 }
});
test('invalid altitude bounds, backwards ranges and malformed comma grouping are rejected',()=>{
 for(const elevation of ['2,17 masl','2200-1900 masl','2450+-2500 masl','0 masl','9900 masl','200 feet']){
  assert.deepEqual(run(exact.replace('2170 masl',elevation)).fields,{},elevation);
 }
});
test('farm or station names containing Coffee are not mistaken for navigation',()=>{
 assert.equal(run(exact.replace('Banko Gotiti CWS','Banko Gotiti Coffee Washing Station')).fields.producer,'Banko Gotiti Coffee Washing Station');
});
test('visible inline spans and entity-decoded ampersands do not split identity fields',()=>{
 const p='<p><span>Mar\u00eda &amp; Juan</span> // <em>Huila, Colombia</em><br><span>Washed</span> Pink Bourbon // 1800 m</p>';
 assert.equal(run(p).fields.producer,'Mar\u00eda & Juan');
 assert.equal(run(p).fields.variety,'Pink Bourbon');
});
test('no paired processing evidence means no invented producer or origin',()=>{
 assert.deepEqual(run('<p>Banko Gotiti CWS // Gedeb, Ethiopia</p>').fields,{});
 assert.deepEqual(run('<h1>Banko Gotiti // Ethiopia</h1><p>Imported by someone.</p>').fields,{});
});
test('do not combine identity and processing across a story or product heading',()=>{
 for(const gap of ['<p>Meet another producer.</p>','<h2>Another Coffee</h2>','<div>'+'.'.repeat(260)+'</div>']){
  const p='<p>Banko Gotiti CWS // Gedeb, Ethiopia</p>'+gap+'<p>Washed heirloom // 2170 masl</p>';
  assert.deepEqual(run(p).fields,{},gap.slice(0,40));
 }
});
test('removed scripts do not corrupt paragraph offsets or heading boundaries',()=>{
 const p='<script>'+'.'.repeat(600)+'</script><p>Banko Gotiti CWS // Gedeb, Ethiopia</p>'+
 '<h2>Another Coffee</h2><p>Washed heirloom // 2170 masl</p>';
 assert.deepEqual(run(p).fields,{});
});
test('shipping locality and promotional prose never become coffee producer evidence',()=>{
 assert.deepEqual(run(exact.replace('Banko Gotiti CWS // Gedeb, Yirgacheffe, Gedeo Zone, Ethiopia','Shipping // Denver, Colorado')).fields,{});
 assert.deepEqual(run(exact.replace('Banko Gotiti CWS','Subscribe Today')).fields,{});
});
test('duplicate responsive markup is harmless; different source tuples fail closed',()=>{
 assert.equal(run(exact+exact).fields.producer,'Banko Gotiti CWS');
 assert.deepEqual(run(exact+exact.replace('Banko Gotiti CWS','Other CWS')).fields,{});
 assert.deepEqual(run(exact+exact.replace('Washed-processed','Natural-processed')).fields,{});
});
test('compound processing terms do not masquerade as cultivars or a single process',()=>{
 for(const process of ['Anaerobic Natural heirloom','Washed and Natural Bourbon','Honey processed Anaerobic Bourbon']){
  const p=exact.replace('Washed-processed heirloom varietals',process);
  assert.deepEqual(run(p).fields,{},process);
 }
});
test('unrelated related-product and review sections cannot contribute fields',()=>{
 for(const heading of ['Related Products','Customer Reviews','More Coffees','Recently Viewed']){
  assert.deepEqual(run('<h2><span>'+heading+'</span></h2>'+exact).fields,{},heading);
 }
 assert.equal(run(exact+'<h2><span>Related Products</span></h2>'+exact.replace('Banko Gotiti CWS','Other CWS')).fields.producer,'Banko Gotiti CWS');
});
test('navigation, footer, template, scripts and noscript fallbacks are excluded',()=>{
 for(const tag of ['nav','footer','aside','template','script','noscript']){
  assert.deepEqual(run('<'+tag+'>'+exact+'</'+tag+'>').fields,{},tag);
 }
});
test('processing and drying wording is retained only from this matched lot narrative',()=>{
 const r=run(exact+narrative);
 assert.equal(r.details.processing_detail,'submerged in water tanks for a 24- to 48-hour fermentation period');
 assert.equal(r.details.drying_method,'raised African drying beds for roughly 10 to 15 days');
 assert.equal(r.fields.roast_level,undefined);assert.equal(r.fields.release_label,undefined);
 assert.equal(r.details.recommended_rest,undefined);
 assert.equal(r.fields.time_s,undefined);
});
test('processing text from another method, a distant article or an importer is not inherited',()=>{
 assert.deepEqual(run(exact+narrative.replace('washed-process','natural-process')).details,{});
 assert.deepEqual(run(exact+'<p>Imported by Kidane Teklu, Leafy Coffee. Second year sourcing this coffee.</p>').details,{});
 assert.equal(run(exact+'<p>Imported by Kidane Teklu.</p>').fields.producer,'Banko Gotiti CWS');
});
test('source window is bounded and invalid input fails safely',()=>{
 assert.deepEqual(run('x'.repeat(60001)),{fields:{},details:{}});
 assert.deepEqual(run(null),{fields:{},details:{}});
 assert.deepEqual(extractDelimitedCoffeeSpecs(exact),{fields:{},details:{}});
});
test('layout integration adds missing station and supplemental facts without replacing earlier fields',()=>{
 const fields={producer:'Previously Explicit Producer'};
 const details=extractLayoutEvidence('<main>'+exact+narrative+'</main>',{
  fields,addField:(key,value)=>{if(!fields[key])fields[key]=value;},clean});
 assert.equal(fields.producer,'Previously Explicit Producer');
 assert.equal(fields.origin,'Gedeb, Yirgacheffe, Gedeo Zone, Ethiopia');
 assert.match(details.drying_method,/raised African/);
});
