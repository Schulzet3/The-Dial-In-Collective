// Issue #33: current official H1 vs historical reused Shopify slug; synthetic fixtures only.
// Raw current official HTML/parser replay is a separate guarded post-merge CI step.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
const wrap=(name,body,seo='')=>'<html><head><meta property="og:type" content="product">'+seo+
 '</head><body><main><article class="product"><h1>'+name+'</h1><div itemprop="description">'+body+
 '</div></article></main></body></html>';
const parse=(url,name,body,seo)=>extractPublicCoffeeFacts(wrap(name,body,seo),{source_url:url});
test('#30 Bonjo reused Guatemala slug must retain selected Costa Rica El Poeta identity and direct quality tier',()=>{
 const url='https://bonjocoffee.com/products/guatemala-finca-el-rincon-copy';
 const body='<p>Sourced exclusively from a small group of family-owned farms—cultivated by dedicated producers Julia Vega Rodríguez, Olman Cruz Vega, Ricardo Chávez Garita, and Juan Bautista Mejia Rojas—this coffee is a testament to meticulous craftsmanship.</p>'+
  '<h2>Details & Origin</h2><p>Country: Costa Rica</p><p>Region: West Valley – San Rafael de San Ramón</p>'+
  '<p>Process: Fully Washed & Sun Dried</p><p>Quality Grade: Gold Collection (Strictly Hard Bean)</p>'+
  '<h2>Flavor Notes</h2><p>Brown Sugar, Hibiscus, Raspberry, Honey</p>';
 const r=parse(url,'Costa Rica, El Poeta',body,
  '<title>Old Guatemala Finca El Rincon</title><meta name="description" content="Old Guatemala estate coffee">');
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.name,'Costa Rica, El Poeta');
 assert.match(r.fields.origin||'',/Costa Rica/i);
 assert.doesNotMatch(JSON.stringify(r.fields),/Guatemala|Finca El Rincon/i);
 assert.equal(r.fields.process,'Washed');
 assert.equal(r.fields.release_label,'Gold Collection');
 assert.match(coffeeUrlPreviewMarkup(r),/Costa Rica/);
});
test('#293 Seeds selected Habtamu H1 must outrank old Guji Getachew SEO and unrelated founder role',()=>{
 const url='https://seedscoffee.com/products/ethiopia-guji-getachew-copy';
 const body='<p>Tastes Like: Cherry, Papaya, Lime Candy</p>'+
  '<p>Habtamu Fekadu Aga (Kuri Mountain Coffee) was founded in 2015 by Aaga Dinsa, the grandson of a coffee farmer in Kuri kebele. The company works with 144 registered outgrowers.</p>';
 const r=parse(url,'Ethiopia Yirgacheffe Habtamu',body,
  '<title>Old Ethiopia Guji Getachew</title><meta name="description" content="Old Getachew Zekele Guji lot">');
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.name,'Ethiopia Yirgacheffe Habtamu');
 assert.match(r.fields.tasting_notes||'',/Cherry.*Papaya.*Lime Candy/i);
 assert.doesNotMatch(JSON.stringify(r.fields),/Getachew Zekele|Guji Getachew/i);
 assert.notEqual(r.fields.producer,'Aaga Dinsa');
});
test('#520 Lineage Sulladjah Dried In Cherry is Natural; historical mixed-method narrative is not current washed proof',()=>{
 const url='https://www.lineageroasting.com/products/copy-of-kenya-gaikundo-2';
 const body='<h2>Deets</h2><p>Country: Ethiopia, Limu, Abana Estate</p>'+
  '<p>Elevation: 2100m</p><p>Processing Method: Dried In Cherry</p>'+
  '<p>Variety: Heirloom</p><p>Harvest Period: November - January</p>'+
  '<h2>Tasting Notes</h2><p>Caramel, Fig</p>'+
  '<h2>Description</h2><p>Visiting Abana estate in November of 2022, our first day on the farm we walked the property.</p>'+
  '<p>The Sulladjah lots were processed with traditional Ethiopian washed and natural methods.</p>';
 const r=parse(url,'Ethiopia, Dry Processed - Sulladjah Coffee Beans',body,
  '<title>Old Kenya Gaikundo</title><meta name="description" content="Kenya Gaikundo Washed lot">');
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.match(r.fields.name,/Sulladjah/);
 assert.equal(r.fields.process,'Natural',JSON.stringify(r.fields));
 assert.notEqual(r.fields.producer,'Abana Estate');
 assert.doesNotMatch(JSON.stringify(r.fields),/Kenya Gaikundo/i);
 assert.match(coffeeUrlPreviewMarkup(r),/Sulladjah/);
});
test('guarded public source selector is bounded to the three exact original603 identities',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/roaster-source-probe.yml',import.meta.url),'utf8');
 assert.match(workflow,/\[dic-issue33-eleventh3\]/);
 assert.match(workflow,/\[dic-issue33-eleventh3\]'\) && '30,293,520'/);
 const source=readFileSync(new URL('../scripts/audit/issue33-original603-focused-source-review.mjs',import.meta.url),'utf8');
 assert.match(source,/fetchPublicCoffeeHtml\(r.official_url/);
 assert.match(source,/extractPublicCoffeeFacts\(res.html/);
 assert.match(source,/coffeeUrlPreviewMarkup\(p\)/);
});
