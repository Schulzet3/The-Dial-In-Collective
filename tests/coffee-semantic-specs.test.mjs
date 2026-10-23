// Compact representative storefront structures; these are synthetic fixtures,
// not captured page HTML. The Sweet Bloom facts were source-checked Oct 23 2026.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const product=(body,{name='Arbey Cordoba',roaster='Sweet Bloom Coffee',url='https://sweetbloomcoffee.com/products/arbey-cordoba-26'}={})=>extractPublicCoffeeFacts(
 '<html><head><meta property="og:type" content="product"><meta property="og:title" content="'+name+'"><meta property="og:site_name" content="'+roaster+'"></head><body><main><h1>'+name+'</h1>'+body+'</main></body></html>',{source_url:url});

test('Sweet Bloom suffix variety and reversed producer/elevation cards preserve the actual coffee facts',()=>{
 const r=product('<section><h4>bourbon ají variety</h4><p>Huila, Colombia</p><p>mango, bing cherry, pineapple</p><p>washed process</p></section>'+
  '<div class="metric"><h2>Arbey Cordoba</h2><p>PRODUCER</p></div>'+
  '<div class="metric"><h2>since 2025</h2><p>RELATIONSHIP</p></div>'+
  '<div class="metric"><h2>1886 masl</h2><p>Elevation</p></div>'+
  '<p>Archived: 07.02.26</p>');
 assert.equal(r.ok,true);
 assert.equal(r.fields.variety,'bourbon ají');
 assert.equal(r.fields.producer,'Arbey Cordoba');
 assert.equal(r.fields.elevation_m,'1886 masl');
 assert.equal(r.fields.process,'Washed');
 assert.equal(r.fields.release_label,undefined,'Relationship and archival dates are not crop dates');
});

test('explicit suffix varieties retain unfamiliar compound names and Unicode accents',()=>{
 for(const value of ['Bourbon Ají','Pink Bourbon','SL28 & SL34','Ethiopian Heirloom','Bourbon Aji\u0301']){
  const r=product('<h4><strong>'+value+'</strong> variety</h4>');
  assert.equal(r.fields.variety,value);
 }
});

test('nested metric labels share cultivar and multilingual aliases with ordinary product fields',()=>{
 const r=product('<section class="specifications">'+
  '<div><h3><span>Variété(s)</span></h3><p><em>Catuaí</em>, <strong>Pacamara</strong></p></div>'+
  '<div><h3><span>Producteur</span></h3><p><strong>Rosa Martínez</strong></p></div>'+
  '<div><h3>País de origen</h3><p>Costa Rica</p></div>'+
  '<div><h3>Altitud</h3><p>1,850 msnm</p></div>'+
  '<div><h3>Notas de cata</h3><p>Ciruela, cacao, caramelo</p></div>'+
  '<div><h3>Cosecha</h3><p>Diciembre 2025</p></div></section>');
 assert.equal(r.fields.variety,'Catuaí, Pacamara');
 assert.equal(r.fields.producer,'Rosa Martínez');
 assert.equal(r.fields.origin,'Costa Rica');
 assert.equal(r.fields.elevation_m,'1,850 msnm');
 assert.equal(r.fields.tasting_notes,'Ciruela, cacao, caramelo');
 assert.equal(r.fields.release_label,'Diciembre 2025');
});

test('rich multiline specification rows keep values together without merging neighboring facts',()=>{
 const r=product('<div class="details"><p><strong>Cultivars:</strong><br><em>SL28</em>, <em>SL34</em><br>'+
  '<strong>Grower:</strong><br>Alicia Torres<br><strong>Country:</strong><br>Kenya</p></div>');
 assert.equal(r.fields.variety,'SL28, SL34');
 assert.equal(r.fields.producer,'Alicia Torres');
 assert.equal(r.fields.origin,'Kenya');
});

test('inline emphasis after a label preserves the entire value and stops at the next label',()=>{
 const r=product('<div><strong>Cultivars</strong> <em>SL28</em>, <em>SL34</em> '+
  '<strong>Country</strong> <span>Kenya</span></div>');
 assert.equal(r.fields.variety,'SL28, SL34');
 assert.equal(r.fields.origin,'Kenya');
});

test('a labeled list preserves every cultivar rather than flattening adjacent words',()=>{
 const r=product('<section><h3>Cultivars</h3><ul><li>SL28</li><li>SL34</li><li>Batian</li></ul></section>');
 assert.equal(r.fields.variety,'SL28, SL34, Batian');
});

test('compact metric pairs beyond the old 60 KB window remain readable',()=>{
 const r=product('<div aria-hidden="true">'+(' '.repeat(80)+'<span></span>').repeat(850)+'</div>'+
  '<section><div><h3>Cultivar</h3><p>Chiroso</p></div>'+
  '<div><h3>Grower</h3><p>Lucía López</p></div>'+
  '<div><h3>Harvest date</h3><p>February 2026</p></div></section>');
 assert.equal(r.fields.variety,'Chiroso');
 assert.equal(r.fields.producer,'Lucía López');
 assert.equal(r.fields.release_label,'February 2026');
});

test('reverse cards never assign relationship years or neighboring headings as producer',()=>{
 const r=product('<div><h2>since 2025</h2><p>PRODUCER</p></div>'+
  '<div><h2>About this coffee</h2><p>Grower</p></div>'+
  '<div><h2>1886 masl</h2><p>Elevation</p></div>');
 assert.equal(r.fields.producer,undefined);
 assert.equal(r.fields.release_label,undefined);
 assert.equal(r.fields.elevation_m,'1886 masl');
});

test('unselected roast spectrum labels remain blank even in value-before-label markup',()=>{
 const r=product('<div><h2>Light</h2><p>Roast Level</p><h2>Medium</h2></div>');
 assert.equal(r.fields.roast_level,undefined);
});

test('suffix wording in education and unrelated cards is not cultivar evidence',()=>{
 const r=product('<p>Bourbon is a coffee variety.</p><p>Learn about the Bourbon variety</p>'+
  '<p>Explore our Geisha variety</p><h2>You may also like</h2><h4>Pacamara variety</h4>');
 assert.equal(r.fields.variety,undefined);
});

test('named Onyx product metrics keep priority over general variety education',()=>{
 const r=product('<div class="a-stat" data-name="roast-level"><p>Light<br><label>ROAST LEVEL</label></p></div>'+
  '<div class="a-stat" data-name="variety"><p>Mixed<br><label>VARIETY</label></p></div>'+
  '<h2>Variety education</h2><p>Bourbon Ají variety</p>',
  {name:'Geometry',roaster:'Onyx Coffee Lab',url:'https://onyxcoffeelab.com/products/geometry'});
 assert.equal(r.fields.variety,'Mixed');
});

test('a product title that happens to be a field label is still only a coffee name',()=>{
 const r=product('<p>Rosa Martínez</p>',{name:'Producer'});
 assert.equal(r.fields.name,'Producer');
 assert.equal(r.fields.producer,undefined);
});

test('semantic metric parsing stays bounded on malformed deep and repeated-attribute markup',()=>{
 const code=`import {extractPublicCoffeeFacts as extract} from './src/server/coffee-page-metadata.mjs';
 const samples=['<div>'.repeat(18000),'<div '+('class="spec" ').repeat(15000)+'>',
 '<p><strong>Cultivar:</strong>'+('<span>'.repeat(9000))+'Bourbon'+('</span>'.repeat(9000))+'</p>'];
 for(const s of samples)extract('<h1>Audit Coffee</h1>'+s,{source_url:'https://example.invalid/products/audit'});
 console.log('bounded');`;
 const result=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd:new URL('..',import.meta.url),timeout:4000,encoding:'utf8'});
 assert.equal(result.error,undefined,result.error?.message);assert.equal(result.status,0,result.stderr);
 assert.equal(result.stdout.trim(),'bounded');
});
