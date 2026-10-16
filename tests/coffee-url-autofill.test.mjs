import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {officialPreviewUrl,extractProductPreview} from '../supabase/functions/dic-preview-coffee/preview.mjs';
import {coffeeUrlPreviewMarkup,applyCoffeeUrlFields} from '../site/cloud/coffee-url-autofill.js';

const product=(extra={})=>'<html><head><meta property="og:type" content="product"></head><body>'+
 '<script type="application/ld+json">'+JSON.stringify({
  '@context':'https://schema.org','@type':'Product',name:'Hambela',
  url:'https://sweetbloomcoffee.com/products/hambela',
  additionalProperty:[{name:'Origin',value:'Guji, Ethiopia'}, {name:'Process',value:'Washed'},
   {name:'Variety',value:'Heirloom'}, {name:'Elevation',value:'1,900–2,100 m'},
   {name:'Tasting Notes',value:'Berry, floral, citrus'}, {name:'Harvest',value:'2026'}],...extra
 })+'</script></body></html>';
const link='https://sweetbloomcoffee.com/products/hambela';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('URL preview only fetches allowlisted HTTPS host and plausible product path',()=>{
 assert.equal(officialPreviewUrl(link,'sweetbloomcoffee.com'),link);
 assert.equal(officialPreviewUrl('https://www.sweetbloomcoffee.com/products/hambela?utm_campaign=fall','sweetbloomcoffee.com'), 'https://www.sweetbloomcoffee.com/products/hambela?utm_campaign=fall');
 for(const u of ['http://sweetbloomcoffee.com/products/hambela',
  'https://evil.test/products/hambela','https://sweetbloomcoffee.com.evil.test/products/hambela',
  'https://127.0.0.1/products/hambela','https://user:secret@sweetbloomcoffee.com/products/hambela',
  'https://sweetbloomcoffee.com/admin','https://sweetbloomcoffee.com/products/hambela?next=https://example.org/',
  'https://sweetbloomcoffee.com/products/hambela#foo']){
  assert.equal(officialPreviewUrl(u,'sweetbloomcoffee.com'),null,u);
 }
});
test('trusted official product JSON-LD extracts only supported explicit fields',()=>{
 const result=extractProductPreview(product(),{source_url:link,roaster:'Sweet Bloom'});
 assert.equal(result.ok,true);
 assert.equal(result.fields.name,'Hambela');
 assert.equal(result.fields.roaster,'Sweet Bloom');
 assert.equal(result.fields.origin,'Guji, Ethiopia');
 assert.equal(result.fields.process,'Washed');
 assert.equal(result.fields.variety,'Heirloom');
 assert.equal(result.fields.elevation_m,'1,900–2,100 m');
 assert.equal(result.fields.release_label,'2026');
 assert.equal(result.fields.tasting_notes,'Berry, floral, citrus');
 assert.equal(result.fields.producer,undefined);
 assert.equal(result.fields.roast_level,undefined);
});
test('different linked coffee is not misread as this product',()=>{
 const result=extractProductPreview(product({url:'https://sweetbloomcoffee.com/products/different'}),
  {source_url:link,roaster:'Sweet Bloom'});
 assert.equal(result.ok,false);
 assert.equal(result.reason,'ambiguous_or_missing_product');
});
test('multiple unrelated Product nodes do not become a made-up single coffee',()=>{
 const products=[{ '@type':'Product',name:'Alpha',additionalProperty:[]},{'@type':'Product',name:'Beta',additionalProperty:[]}];
 const html='<script type="application/ld+json">'+JSON.stringify(products)+'</script>';
 const result=extractProductPreview(html,{source_url:link,roaster:'Sweet Bloom'});
 assert.equal(result.ok,false);
});
test('autofill preview escapes user-controlled source fields and never applies automatically',()=>{
 const result={ok:true,source_url:link,fields:{name:'<script>alert(1)</script>',roaster:'Sweet Bloom',origin:'Guji, Ethiopia'},
  match:{classification:'needs_confirmation',candidates:[]}};
 const html=coffeeUrlPreviewMarkup(result);
 assert.ok(html.includes('&lt;script&gt;'));
 assert.ok(!html.includes('<script>'));
 assert.match(html,/Apply Suggested Details/);
 assert.match(html,/similar verified coffee/);
});
test('applying structured fields fills blanks only, preserving typed details and select values',()=>{
 const fields={
  name:{value:'',tagName:'INPUT',dispatchEvent(){}},
  roaster:{value:'My Bag Label',tagName:'INPUT',dispatchEvent(){}},
  origin:{value:'',tagName:'INPUT',dispatchEvent(){}},
  process:{value:'',tagName:'SELECT',options:[{value:''},{value:'Washed'}],dispatchEvent(){}},
  roast_level:{value:'',tagName:'SELECT',options:[{value:''},{value:'Light'}],dispatchEvent(){}}
 };
 const form={elements:{namedItem(key){return fields[key]||null;}}};
 const result={ok:true,fields:{name:'Hambela',roaster:'Sweet Bloom',origin:'Ethiopia',process:'Washed',roast_level:'Dark'}};
 const apply=applyCoffeeUrlFields(form,result);
 assert.deepEqual(apply,{filled:3,skipped:2});
 assert.equal(fields.roaster.value,'My Bag Label');
 assert.equal(fields.name.value,'Hambela');
 assert.equal(fields.process.value,'Washed');
 assert.equal(fields.roast_level.value,'');
});
test('server preview checks admitted Auth and official host before remote fetching',()=>{
 const server=read('supabase/functions/dic-preview-coffee/index.ts');
 assert.match(server,/dic_session_status/);
 assert.match(server,/dic_roaster_preview_target/);
 assert.match(server,/officialPreviewUrl\(source_url,roaster\.official_domain\)/);
 assert.match(server,/dic_url_preview_claim/);
 assert.match(server,/redirect:'manual'/);
 assert.match(server,/950000/);
 assert.match(server,/source_url:checked,match/);
});
test('URL-first SQL prioritizes official URL evidence but cannot use URL alone as Coffee UUID',()=>{
 const sql=read('supabase/migrations/20261016053000_dic_url_first_and_autofill_preview.sql');
 assert.match(sql,/s\.curated_url_match\s+or/);
 assert.match(sql,/official_url_review/);
 assert.match(sql,/match_kind in \('official_url','exact_release'\)/);
 assert.match(sql,/s\.exact_brand and s\.exact_title and s\.curated_url_match/);
 assert.match(sql,/s\.release_key=search_release/);
 assert.match(sql,/service_role/);
 assert.match(sql,/attempts>=25/);
});
test('URL is first visual step but remaining fields retain compact paired layout',()=>{
 const main=read('site/cloud/main.js');
 const add=main.slice(main.indexOf('showAdd(){'),main.indexOf('async finishCoffeeAdd('));
 assert.ok(add.indexOf('Roaster Page URL')<add.indexOf('Name / Bag Label'));
 assert.match(add,/Autofill From URL/);
 assert.match(add,/coffee-url-feedback/);
 assert.match(add,/class="form-grid coffee-detail-grid"/);
});
