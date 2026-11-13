import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {officialPreviewUrl,extractProductPreview} from '../supabase/functions/dic-preview-coffee/preview.mjs';
import {coffeeUrlPreviewMarkup,applyCoffeeUrlFields} from '../site/cloud/coffee-url-autofill.js';
import {createCloudClient} from '../site/cloud/client.js';

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
test('trusted official preview supports seven roast levels and historic synonyms',()=>{
 for(const [source,expected] of [
  ['Ultra Light','Ultra Light'],['Very Light','Very Light'],
  ['Light-Medium','Medium-Light'],['Medium Light','Medium-Light'],
  ['Medium-Dark','Medium-Dark']
 ]){
  const html=product({additionalProperty:[{name:'Roast Level',value:source}]});
  const r=extractProductPreview(html,{source_url:link,roaster:'Sweet Bloom'});
  assert.equal(r.fields.roast_level,expected,source);
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
test('autofill preview escapes external fields and never submits a coffee',()=>{
 const result={ok:true,source_url:link,fields:{name:'<script>alert(1)</script>',roaster:'Sweet Bloom',origin:'Guji, Ethiopia'},
  match:{classification:'needs_confirmation',candidates:[]}};
 const html=coffeeUrlPreviewMarkup(result);
 assert.ok(html.includes('&lt;script&gt;'));
 assert.ok(!html.includes('<script>'));
 assert.match(html,/Review or correct them, then click Add Coffee/);
  assert.doesNotMatch(html,/Apply Suggested Details|apply-coffee-url/);
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
test('multi-origin and named-farm values populate only blanks with Other/Unknown selected',()=>{
 const fields={
  origin:{value:'',tagName:'INPUT',dispatchEvent(){}},
  producer:{value:'',tagName:'INPUT',dispatchEvent(){}},
  process:{value:'',tagName:'SELECT',options:[{value:''},{value:'Washed'},{value:'Other/Unknown'}],dispatchEvent(){}},
  name:{value:'My Coffee',tagName:'INPUT',dispatchEvent(){}}
 };
 const form={elements:{namedItem(key){return fields[key]||null;}}};
 const result={ok:true,fields:{name:'Dead Reckoning',
  origin:'Ethiopia, Colombia, Peru',producer:'Finca Deborah, Hacienda La Esperanza',process:'Other/Unknown'}};
 assert.deepEqual(applyCoffeeUrlFields(form,result),{filled:3,skipped:1});
 assert.equal(fields.name.value,'My Coffee');
 assert.equal(fields.origin.value,'Ethiopia, Colombia, Peru');
 assert.equal(fields.producer.value,'Finca Deborah, Hacienda La Esperanza');
 assert.equal(fields.process.value,'Other/Unknown');
});
test('active preview is universal Netlify, retired legacy Edge cannot gate domains',()=>{
 const client=read('site/cloud/client.js');
 const legacy=read('supabase/functions/dic-preview-coffee/index.ts');
 const current=read('netlify/functions/coffee-url-preview.mjs');
 assert.match(client,/previewPath='\/api\/coffee-preview'/);
 assert.match(current,/safeCoffeeUrl\(source_url\)/);
 assert.match(legacy,/retired_endpoint/);
 assert.doesNotMatch(legacy,/dic_roaster_directory|dic_roaster_preview_target|dic_url_preview_claim/);
});
test('URL-first SQL prioritizes official URL evidence but cannot use URL alone as Coffee UUID',()=>{
 const sql=read('supabase/migrations/20261016154252_dic_url_first_and_autofill_preview.sql');
 assert.match(sql,/s\.curated_url_match\s+or/);
 assert.match(sql,/official_url_review/);
 assert.match(sql,/match_kind in \('official_url','exact_release'\)/);
 assert.match(sql,/s\.exact_brand and s\.exact_title and s\.curated_url_match/);
 assert.match(sql,/search_release is not null and s\.release_key=search_release/);
 assert.match(sql,/s\.compatible_process/);
 assert.match(sql,/service_role/);
 assert.match(sql,/attempts>=25/);
});
test('URL is first visual step but remaining fields retain compact paired layout',()=>{
 const main=read('site/cloud/main.js');
 const add=main.slice(main.indexOf('showAdd(){'),main.indexOf('async finishCoffeeAdd('));
 assert.ok(add.indexOf('Roaster Page URL')<add.indexOf('Coffee Name'));
 assert.match(add,/Autofill From URL/);
 assert.match(add,/coffee-url-feedback/);
 assert.match(add,/class="form-grid coffee-detail-grid"/);
});

test('official URL cannot rebind an older Coffee ID for an unknown harvest through verification',()=>{
 const sql=read('supabase/migrations/20261016154252_dic_url_first_and_autofill_preview.sql');
 const promoted=sql.slice(sql.lastIndexOf('create or replace function private.dic_promote_pending_coffee'));
 assert.match(promoted,/select count\(\*\),min\(c\.id::text\)::uuid into same_url_count,same_url/);
 assert.match(promoted,/declared_release is not null/);
 assert.match(promoted,/same_url_count=1 and same_url is not null/);
 assert.match(promoted,/private\.dic_coffee_key\(c\.process\)=private\.dic_coffee_key\(raw->>'process'\)/);
 assert.match(promoted,/private\.dic_coffee_key\(c\.origin\)=private\.dic_coffee_key\(raw->>'origin'\)/);
 assert.match(promoted,/current_setting\('request\.jwt\.claim\.role',true\) is distinct from 'service_role'/);
 assert.match(promoted,/not private\.is_admin\(\)/);
});


test('published New Coffee preview click immediately populates blanks before Add Coffee',()=>{
 const main=read('site/cloud/main.js');
 const at=main.indexOf("if(a==='preview-coffee-url'||a==='preview-coffee-url-refresh')");
 const end=main.indexOf("if(a==='check-pending-match')",at);
 assert.ok(at>0&&end>at);
 const handler=main.slice(at,end);
 assert.match(handler,/applyCoffeeUrlFields\(form,found\)/);
 assert.match(handler,/coffeeUrlPreviewMarkup\(found\)/);
  assert.doesNotMatch(main,/if\(a==='apply-coffee-url'\)/);
 const preview=coffeeUrlPreviewMarkup({ok:true,source:'unverified_public_page',
  fields:{name:'Wuri',roaster:'Sweet Bloom'}});
 assert.match(preview,/Unverified Page/);
 assert.match(preview,/Review or correct them, then click Add Coffee/);
 assert.doesNotMatch(preview,/data-action="apply-coffee-url"/);
});
test('client makes exactly one authenticated public-preview request per click with no double quota',()=>{
 const client=read('site/cloud/client.js');
 const begin=client.indexOf('async previewCoffeeUrl(source_url,');
 const end=client.indexOf('async verifyCoffeeSource(',begin);
 const preview=client.slice(begin,end);
 assert.match(client,/previewPath='\/api\/coffee-preview'/);
 assert.match(preview,/previewFetch\(previewPath/);
 assert.match(preview,/getSession\(\)/);
 assert.match(preview,/dic_find_coffee_matches/);
 assert.doesNotMatch(preview,/sdk\.functions\.invoke\('dic-preview-coffee'/);
 assert.doesNotMatch(preview,/SUPABASE_SERVICE_ROLE_KEY/);
});
test('catalog preview provides an explicit current-page check while ordinary previews need no extra lookup',()=>{
 const saved=coffeeUrlPreviewMarkup({ok:true,source:'approved_catalog',fields:{name:'Coffee',roaster:'Roaster'}});
 assert.match(saved,/data-action="preview-coffee-url-refresh"/);assert.match(saved,/Check Current Roaster Page/);
 assert.match(saved,/usual URL lookup limit/);
 const fresh=coffeeUrlPreviewMarkup({ok:true,source:'unverified_public_page',fields:{name:'Coffee',roaster:'Roaster'}});
 assert.doesNotMatch(fresh,/data-action="preview-coffee-url-refresh"/);
});
test('client sends the explicit refresh flag only for that action and uses one preview request',async()=>{
 const requests=[];
 const sdk={auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
  getSession:async()=>({data:{session:{access_token:'fixture.nonfunctional'}}})},rpc:async()=>({data:{classification:'new'}})};
 const client=createCloudClient(sdk,{assertSecure(){},previewFetch:async(url,options)=>{
  requests.push({url,body:JSON.parse(options.body)});return {ok:true,json:async()=>({ok:true,fields:{name:'Coffee'}})};
 }});
 await client.previewCoffeeUrl(link);
 await client.previewCoffeeUrl(link,{refreshSource:true});
 await client.previewCoffeeUrl(link,{refreshSource:'true'});
 assert.equal(requests.length,3);
 assert.deepEqual(requests.map(x=>x.body),[{source_url:link},{source_url:link,refresh_source:true},{source_url:link}]);
 assert.ok(requests.every(x=>x.url==='/api/coffee-preview'));
});
