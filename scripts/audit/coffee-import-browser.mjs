#!/usr/bin/env node
/** Real browser interaction with local fixtures; no network, keys or members. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const [executablePath,output]=process.argv.slice(2);
if(!output)throw new Error('Usage: coffee-import-browser.mjs CHROMIUM RECEIPT');
const root=path.resolve(import.meta.dirname,'../..'),site=path.join(root,'site');
const read=file=>fs.readFile(path.join(root,file),'utf8');
const imports=text=>text.replace(/import \* as (\w+) from ['"](.+?)['"];?/g,(_whole,name,file)=>`const ${name}=Modules.${path.basename(file,'.js').replaceAll('-','_')};`)
 .replace(/import\s*\{([^}]+)\}\s*from\s*['"](.+?)['"];?/g,(_whole,names,file)=>`const {${names}}=Modules.${path.basename(file,'.js').replaceAll('-','_')};`);
let bundle='(()=>{const Modules={};\n';
const libraryModules=['constants','model','community-evidence','engine','ui'];
for(const name of [...libraryModules,'appearance','client','cache','outbox','mapping','confirmation','shot_card','community','coffee-match-ui','coffee-url-autofill','dose-advisory']){
 const folder=libraryModules.includes(name)?'lib':'cloud';
 const source=await fs.readFile(path.join(site,folder,name+'.js'),'utf8');
 const exports=[...source.matchAll(/export\s+(?:async\s+)?(?:function|const|class|let)\s+(\w+)/g)].map(match=>match[1]);
 bundle+=`Modules.${name.replaceAll('-','_')}=(()=>{${imports(source).replace(/\bexport\s+/g,'')}\nreturn {${exports.join(',')}};})();\n`;
}
let main=await read('site/cloud/main.js');
main=main.replace("import {CLOUD_CONFIG} from './config.js';",'const CLOUD_CONFIG={enabled:false};').replace('startCloudApp();','').replace('export {CloudApp};','');
bundle+=imports(main).replace(/\bexport\s+/g,'')+'\nwindow.__CloudApp=CloudApp;window.__Modules=Modules;})();';
const fixture=(await read('tests/cloud-fixtures/raw.js')).replaceAll('export ','');
const css=(await read('site/styles.css')).split('\n').slice(1).join('\n')+'\n'+await read('site/visual.css');
const browser=await chromium.launch({executablePath,headless:true,args:['--disable-dev-shm-usage','--disable-background-networking']});
const checks=[],errors=[];
try{
 for(const width of [320,390,1280]){
  const context=await browser.newContext({viewport:{width,height:900},acceptDownloads:true});
  await context.route('**/*',route=>route.abort());
  const page=await context.newPage();page.on('pageerror',error=>errors.push(String(error)));
  await page.setContent('<!doctype html><html><head><style>'+css+'</style></head><body><div id="app"></div><dialog id="sheet" aria-labelledby="sheet-title"></dialog><div id="toasts" role="status"></div></body></html>');
  await page.addScriptTag({content:bundle});
  assert.deepEqual(errors,[],'Browser module bundle must load before exercising import');
  assert.equal(await page.evaluate(()=>typeof window.__CloudApp),'function','CloudApp must be available in the browser fixture');
  await page.addScriptTag({content:fixture+`
   if(!crypto.randomUUID){let sequence=0;crypto.randomUUID=()=> '11111111-1111-4111-8111-'+String(++sequence).padStart(12,'0');}
   window.__raw=rawFixture();window.__writes=[];
   window.__preview={ok:true,source_url:'https://roaster.example.com/products/coffee',source:'official_roaster_product_metadata',
    fields:{name:'Arbey Cordoba',roaster:'Sweet Bloom',variety:'Bourbon Ají',origin:'Colombia',process:'Washed'},
    source_facts:[{label:'Water activity',value:'0.51 Aw',source_type:'html',source_url:'https://roaster.example.com/products/coffee',
      supporting_sources:[{source_url:'https://roaster.example.com/products/coffee.js',source_type:'product_json',private_member_id:'must-not-export'}]},
     {label:'Purchase options',value:'[{"name":"Size","values":["250g"]}]',source_type:'product_json',source_path:'/options',format:'json',part:0},
     {label:'Purchase variant',value:'{"price":2500,"available":true}',source_type:'html',source_url:'https://roaster.example.com/products/coffee',
      source_locator:'form[data-product_variations][data-product_id="42"]',source_path:'/0',format:'projection',part:0},
     {label:'Purchase image',value:'{"src":"https://roaster.example.com/coffee.jpg"}',source_type:'html',source_url:'https://roaster.example.com/products/coffee',
      source_locator:'form[data-product_variations][data-product_id="42"]',source_path:'/0/image',format:'json',part:0},
     {label:'Repeated purchase image',value:'{"source_path":"/0/image"}',source_type:'html',source_url:'https://roaster.example.com/products/coffee',
      source_locator:'form[data-product_variations][data-product_id="42"]',source_path:'/1/image',format:'reference',part:0},
     {label:'Grouped purchase image',value:'{"source_path":"/0/image","destinations":["/2/image","/3/image"]}',source_type:'html',source_url:'https://roaster.example.com/products/coffee',
      source_locator:'form[data-product_variations][data-product_id="42"]',source_path:'/2/image',format:'reference',part:0}],
    match:{classification:'exact_verified',private_member_id:'must-not-export'},auth_token:'must-not-export'};
   for(let index=window.__preview.source_facts.length;index<384;index++)window.__preview.source_facts.push({
    label:'Expanded source fact '+index,value:'Capacity marker '+index+': '+ 'Published source context. '.repeat(12),
    source_type:'html',source_url:'https://roaster.example.com/products/coffee'});
   window.__previewRequests=[];
   window.__app=new window.__CloudApp({previewCoffeeUrl:async(source,options)=>{window.__previewRequests.push({source,options});return window.__preview;}},{});
   window.__app.identity={id:OWNER};window.__app.status={admitted:true};window.__app.raw=window.__raw;
   window.__app.state=window.__Modules.mapping.hydrate(window.__raw);window.__app.render=()=>{};
   document.addEventListener('click',ev=>window.__app.click(ev));document.addEventListener('input',ev=>window.__app.input(ev));
   window.__app.showAdd();
  `});
  await page.locator('[name=name]').fill('My existing name');
  await page.locator('[name=source_url]').fill('https://roaster.example.com/products/coffee');
  await page.getByRole('button',{name:'Autofill From URL',exact:true}).click();
  await page.getByRole('button',{name:'Download Source Review',exact:true}).waitFor();
  assert.equal(await page.locator('[name=name]').inputValue(),'My existing name');
  assert.equal(await page.locator('[name=variety]').inputValue(),'Bourbon Ají');
  assert.equal(await page.locator('[name=process]').inputValue(),'Washed');
  await page.getByText('Published source information (379)',{exact:true}).click();
  assert.equal(await page.getByText('0.51 Aw',{exact:true}).isVisible(),true);
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Download Source Review',exact:true}).click();
  const download=await downloadPromise;
  const json=JSON.parse(await fs.readFile(await download.path(),'utf8'));
  assert.equal(json.published_source_information.length,384);
  assert.match(json.published_source_information.at(-1).value,/^Capacity marker 383:/);
  assert.equal(json.source_information_truncated,false);
  assert.equal(json.field_suggestions.variety,'Bourbon Ají');
  assert.equal(json.field_suggestions.name,'Arbey Cordoba');
  assert.equal(JSON.parse(json.published_source_information[1].value)[0].values[0],'250g');
  assert.deepEqual(json.published_source_information[0].supporting_sources,[{source_url:'https://roaster.example.com/products/coffee.js',source_type:'product_json'}]);
  const projection=json.published_source_information[2],reference=json.published_source_information[4];
  assert.equal(projection.format,'projection');assert.equal(projection.source_path,'/0');
  assert.equal(projection.source_locator,'form[data-product_variations][data-product_id="42"]');
  assert.deepEqual(JSON.parse(projection.value),{price:2500,available:true});
  assert.equal(reference.format,'reference');assert.equal(reference.source_path,'/1/image');
  assert.equal(reference.source_url,projection.source_url);assert.equal(reference.source_locator,projection.source_locator);
  assert.deepEqual(JSON.parse(reference.value),{source_path:'/0/image'});
  const grouped=json.published_source_information[5];
  assert.equal(grouped.format,'reference');assert.equal(grouped.source_path,'/2/image');
  assert.equal(grouped.source_url,projection.source_url);assert.equal(grouped.source_locator,projection.source_locator);
  assert.deepEqual(JSON.parse(grouped.value),{source_path:'/0/image',destinations:['/2/image','/3/image']});
  assert.doesNotMatch(await page.locator('body').innerText(),/Repeated purchase image|Grouped purchase image|source_path|destinations|data-product_variations/);
  assert.doesNotMatch(JSON.stringify(json),/must-not-export|private_member_id|auth_token/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
  await page.locator('[name=source_url]').fill('https://roaster.example.com/products/other');
  assert.equal(await page.getByRole('button',{name:'Download Source Review',exact:true}).count(),0);
  assert.equal(await page.evaluate(()=>window.__app.coffeeUrlSourceReview),null);
  await page.evaluate(()=>{window.__preview={...window.__preview,source:'approved_catalog'};});
  await page.locator('[name=source_url]').fill('https://roaster.example.com/products/coffee');
  await page.getByRole('button',{name:'Autofill From URL',exact:true}).click();
  await page.getByRole('button',{name:'Check Current Roaster Page',exact:true}).waitFor();
  await page.evaluate(()=>{window.__preview={...window.__preview,source:'unverified_public_page'};});
  await page.getByRole('button',{name:'Check Current Roaster Page',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>window.__previewRequests.map(x=>x.options.refreshSource)),[false,false,true]);
  assert.equal(await page.locator('[name=name]').inputValue(),'My existing name');
  assert.equal(await page.getByRole('button',{name:'Check Current Roaster Page',exact:true}).count(),0);
  await page.evaluate(async()=>{
   const app=window.__app,raw=window.__raw;
   raw.library[0].coffee_id='canonical';raw.coffees=[{id:'canonical',name:'Arbey Cordoba',roaster:'Sweet Bloom',origin:'Colombia',revision:7}];
   app.mutate=async(action,payload)=>{window.__writes.push({action,payload});app.state=window.__Modules.mapping.hydrate(raw);};
   await app.finishCoffeeAdd({name:'Arbey Cordoba',roaster:'Sweet Bloom',variety:'Bourbon Ají',source_url:'https://roaster.example.com/products/coffee'}, {classification:'exact_verified'},'canonical');
  });
  assert.equal(await page.locator('#edit-coffee [name=variety]').inputValue(),'Bourbon Ají');
  assert.equal(await page.getByRole('button',{name:'Submit Correction For Review',exact:true}).isVisible(),true);
  assert.deepEqual(await page.evaluate(()=>window.__writes.map(x=>x.action)),['add_verified_coffee']);
  assert.equal(await page.evaluate(()=>window.__raw.coffees[0].variety),undefined);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
  await page.evaluate(async()=>{
   const app=window.__app;window.__writes=[];
   app.mutate=async(action,payload)=>{window.__writes.push({action,payload});
    return {ok:true,status:'verified',coffee_id:'canonical',library_entry_id:'acknowledged-not-cached',reused:true};};
   await app.finishCoffeeAdd({name:'Arbey Cordoba',roaster:'Sweet Bloom',variety:'Bourbon Ají'}, {classification:'new'});
   app.sync=async()=>{window.__raw.library[0].id='acknowledged-not-cached';app.state=window.__Modules.mapping.hydrate(window.__raw);};
  });
  assert.equal(await page.getByRole('heading',{name:'Coffee Saved · Review Waiting',exact:true}).isVisible(),true);
  assert.equal(await page.locator('#pending-coffee-review').getByText('Bourbon Ají',{exact:true}).isVisible(),true);
  assert.doesNotMatch(await page.evaluate(()=>window.__app.notice),/privately/);
  await page.getByRole('button',{name:'Refresh Saved Coffee',exact:true}).click();
  assert.equal(await page.locator('#edit-coffee [name=variety]').inputValue(),'Bourbon Ají');
  assert.deepEqual(await page.evaluate(()=>window.__writes.map(x=>x.action)),['submit_coffee']);
  assert.equal(await page.evaluate(()=>window.__app.pendingCoffeeReview),null);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
  checks.push({viewport:width,blank_only_autofill:true,public_source_download:true,structured_json_preserved:true,
   expanded_evidence_count:json.published_source_information.length,expanded_last_record_preserved:true,
   structured_projection_reference_namespace_preserved:true,supporting_provenance_preserved:true,raw_structures_not_rendered:true,typed_form_data_not_exported:true,
   export_excludes_private_fields:true,stale_url_clears_preview:true,canonical_reuse_opens_explicit_correction:true,
   no_automatic_correction_write:true,explicit_current_page_refresh:true,acknowledged_save_survives_stale_refresh:true,refresh_does_not_resubmit:true,no_horizontal_overflow:true});
  await context.close();
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile(output,JSON.stringify({created_at:new Date().toISOString(),browser:await browser.version(),
  node:process.version,browser_bundle_sha256:createHash('sha256').update(bundle).digest('hex'),
  fixture_sha256:createHash('sha256').update(fixture).digest('hex'),styles_sha256:createHash('sha256').update(css).digest('hex'),
  harness_sha256:createHash('sha256').update(await fs.readFile(import.meta.filename)).digest('hex'),
  local_fixtures_only:true,no_network:true,no_api_keys:true,checks,page_errors:errors},null,2)+'\n');
 console.log(JSON.stringify({passed:checks.length,output}));
}finally{await browser.close();}
