// NONPRODUCTION ONLY: 900 KB vs 2 MB extractor and alternative parsing study.
// Does not persist page HTML, send credentials, invoke Supabase or modify source.
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {extractPublicCoffeeFacts as baseParse} from '../../src/server/coffee-page-metadata.mjs';
import {extractEcwidProduct} from '../../src/server/coffee-ecwid-snapshot.mjs';
import {extractShopifyProduct} from '../../src/server/coffee-shopify-ajax.mjs';
import {extractWooProduct} from '../../src/server/coffee-woocommerce-store.mjs';

const BASE=900_000,STUDY=2_000_000;
const server=fileURLToPath(new URL('../../src/server/',import.meta.url));
const temp=mkdtempSync(join(tmpdir(),'dic-readonly-size-'));
const modules=readdirSync(server).filter(s=>s.endsWith('.mjs'));
const digest=body=>createHash('sha256').update(body).digest('hex');
const before=new Map(modules.map(s=>[s,digest(readFileSync(join(server,s)))]));
function replaceOne(text,from,to,label){
 assert.equal(text.split(from).length-1,1,'Isolated source compatibility changed: '+label);
 return text.replace(from,to);
}
function prepare(name){
 const path=join(temp,name);mkdirSync(path);
 for(const file of modules){
  let source=readFileSync(join(server,file),'utf8');
  if(file==='coffee-url-guard.mjs'){
   source=replaceOne(source,'export const MAX_HTML_BYTES=900_000;',
    'export const MAX_HTML_BYTES=2_000_000;','guard size');
   source=replaceOne(source,
    'finish({ok:true,...(responseType!==\'html\'?{json:body.toString(\'utf8\')}:{html:body.toString(\'utf8\')}),source_url:url.toString()});',
    'finish({ok:true,...(responseType!==\'html\'?{json:body.toString(\'utf8\')}:{html:body.toString(\'utf8\')}),wire_bytes:total,decoded_bytes:body.length,source_url:url.toString()});',
    'benchmark-only transfer metrics');
   if(name==='compressed')source=replaceOne(source,
    "'Accept-Encoding':'identity'","'Accept-Encoding':'gzip, br'",'compression');
  }
  if(file==='coffee-page-metadata.mjs'||file==='coffee-product-scope.mjs')
   source=replaceOne(source,'html.length>1_000_000','html.length>2_000_000','parser cap');
  writeFileSync(join(path,file),source);
 }
 return path;
}
const cases=[
 ['Picky Chemist Gesha','https://en.thepickychemist.com/product-page/ethiopia-gesha-village-lot-26-136-oma-honey'],
 ['Mango Tree Blend','https://www.mangotreecoffee.org/shop/Mango-Tree-Blend-p734210068'],
 ['PERC Kenya Mara','https://perccoffee.com/products/kenya-mara-estate'],
 ['Queen City Banko','https://queencitycollectivecoffee.com/products/banko-gotiti-washed-ethiopia'],
 ['Corvus Echo Gesha','https://www.corvuscoffee.com/products/echo-gesha'],
 ['SEY Yaye Arbegona','https://www.seycoffee.com/collections/coffee/products/2026-yaye-arbegona-ethiopia'],
 ['Onyx Mullugeta','https://onyxcoffeelab.com/products/ethiopia-mullugeta-muntasha-natural-26?variant=43228176810082'],
 ['Sweet Bloom Wuri','https://sweetbloomcoffee.com/products/wuri'],
 ['Heart Phono','https://www.heartroasters.com/products/phono'],
 ['Little Wolf Tegu','https://littlewolf.coffee/products/tegu'],
 ['Black White Los Altos','https://www.blackwhiteroasters.com/products/r-los-altos-washed'],
 ['Proud Mary Ovidio','https://proudmarycoffee.com/collections/wild/products/honduras-ovidio-gomez-catuai-natural'],
 ['Park City Ethiopia','https://pcroaster.com/product/ethiopia-single-origin/'],
 ['Corvus Dead Reckoning','https://www.corvuscoffee.com/products/dead-reckoning-blend'],
 ['Tim Wendelboe Gachatha','https://timwendelboe.no/products/gachatha'],
 ['PERC Franky Hoyos','https://perccoffee.com/products/colombia-franky-hoyos-adv-washed?variant=53562522829114'],
 ['Sweet Bloom Uraga','https://sweetbloomcoffee.com/products/uraga'],
 ['SEY Chorso Bule','https://www.seycoffee.com/collections/coffee/products/2026-chorso-bule-highest-elevation-project-ethiopia'],
 ['Queen City Natural','https://queencitycollectivecoffee.com/products/banko-gotiti-natural-ethiopia'],
 ['Queen City homepage negative control','https://queencitycollectivecoffee.com/']
];
const median=a=>a.length?a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)]:null;
const round=n=>Number.isFinite(n)?Math.round(n*100)/100:null;
const fields=x=>Object.keys(x?.fields||{}).sort();
const same=(a,b)=>!!a?.ok&&!!b?.ok&&JSON.stringify(fields(a))===JSON.stringify(fields(b))&&
 fields(a).every(key=>String(a.fields[key])===String(b.fields[key]));
function parseTrial(fn,html,url,repeats=3){
 const ms=[],cpu=[],heap=[];let parsed;
 for(let i=0;i<repeats;i++){
  if(global.gc)global.gc();
  const start=performance.now(),startCpu=process.cpuUsage(),startHeap=process.memoryUsage().heapUsed;
  try{parsed=fn(html,{source_url:url});}
  catch(err){return {ok:false,reason:'exception_'+String(err?.name||'Error'),fields:[]};}
  ms.push(performance.now()-start);
  const elapsedCpu=process.cpuUsage(startCpu);
  cpu.push((elapsedCpu.user+elapsedCpu.system)/1000);
  heap.push(Math.max(0,process.memoryUsage().heapUsed-startHeap));
 }
 return {ok:parsed?.ok===true,reason:parsed?.ok?'parsed':parsed?.reason||'invalid_source',
  fields:fields(parsed),median_ms:round(median(ms)),median_cpu_ms:round(median(cpu)),
  heap_delta_bytes:median(heap),data:parsed};
}
function stripNonProductScripts(html){
 return html.replace(/<script\b([^>]{0,1800})>[\s\S]*?<\/script\s*>/gi,
  (full,attrs)=>/type\s*=\s*["']application\/ld\+json["']/i.test(attrs)?full:' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi,' ')
  .replace(/<!--[\s\S]*?-->/g,' ');
}
const results=[],compressedRuns=[],platformRuns=[];
try{
 const dir=prepare('expanded'),gzipDir=prepare('compressed');
 const guard=await import(pathToFileURL(join(dir,'coffee-url-guard.mjs')).href);
 const parser=await import(pathToFileURL(join(dir,'coffee-page-metadata.mjs')).href);
 const zipped=await import(pathToFileURL(join(gzipDir,'coffee-url-guard.mjs')).href);
 assert.equal(guard.MAX_HTML_BYTES,STUDY);
 for(const [name,url] of cases){
  const start=performance.now();
  const fetched=await guard.fetchPublicCoffeeHtml(url);
  const fetch_ms=round(performance.now()-start);
  if(!fetched.ok){
   const entry={name,fetch_status:fetched.reason,fetch_ms};
   results.push(entry);console.log('[DIC 2MB SAMPLE] '+JSON.stringify(entry));continue;
  }
  const html=fetched.html,bytes=Buffer.byteLength(html);
  const small=bytes>BASE?{ok:false,reason:'page_too_large',fields:[]}:parseTrial(baseParse,html,url);
  const large=parseTrial(parser.extractPublicCoffeeFacts,html,url);
  const first=Buffer.from(html).subarray(0,262144).toString('utf8');
  const early=parseTrial(parser.extractPublicCoffeeFacts,first,url,1);
  const stripped=stripNonProductScripts(html),stripBytes=Buffer.byteLength(stripped);
  const compact=stripBytes<=BASE?parseTrial(baseParse,stripped,url,3):
   {ok:false,reason:'still_over_900kb',fields:[]};
  const entry={name,source_bytes:bytes,wire_bytes:fetched.wire_bytes,
   fetch_ms,at_900kb:{ok:small.ok,reason:small.reason,fields:small.fields,
    median_ms:small.median_ms,median_cpu_ms:small.median_cpu_ms,heap_delta_bytes:small.heap_delta_bytes},
   at_2mb:{ok:large.ok,reason:large.reason,fields:large.fields,
    median_ms:large.median_ms,median_cpu_ms:large.median_cpu_ms,heap_delta_bytes:large.heap_delta_bytes},
   head_256kb:{ok:early.ok,complete:same(large.data,early.data),fields:early.fields,median_ms:early.median_ms},
   strip_scripts:{bytes:stripBytes,under_900kb:stripBytes<=BASE,
    ok:compact.ok,complete:same(large.data,compact.data),fields:compact.fields,
    median_ms:compact.median_ms,median_cpu_ms:compact.median_cpu_ms,heap_delta_bytes:compact.heap_delta_bytes}};
  results.push(entry);console.log('[DIC 2MB SAMPLE] '+JSON.stringify(entry));
  if(name.includes('homepage negative control')&&large.ok)
   throw Error('False product match on homepage');
  if(['Picky Chemist Gesha','Mango Tree Blend','PERC Kenya Mara','Queen City Banko','Corvus Echo Gesha','SEY Yaye Arbegona','Onyx Mullugeta','Sweet Bloom Wuri','Heart Phono'].includes(name)){
   const t=performance.now(),compressed=await zipped.fetchPublicCoffeeHtml(url);
   compressedRuns.push({name,status:compressed.ok?'ok':compressed.reason,
    fetch_ms:round(performance.now()-t),wire_bytes:compressed.wire_bytes??null,
    decoded_bytes:compressed.decoded_bytes??null,
    exact_same_html:compressed.ok?digest(compressed.html)===digest(html):null,
    same_extracted_fields:compressed.ok?same(large.data,
     parseTrial(parser.extractPublicCoffeeFacts,compressed.html,url,1).data):null,
    wire_saving_percent:compressed.ok?round(100*(1-compressed.wire_bytes/bytes)):null});
  }
 }
 for(const [name,url,fn] of [
  ['Mango Tree Ecwid static','https://www.mangotreecoffee.org/shop/Mango-Tree-Blend-p734210068',extractEcwidProduct],
  ['PERC Shopify Ajax','https://perccoffee.com/products/kenya-mara-estate',extractShopifyProduct],
  ['Sweet Bloom Shopify Ajax','https://sweetbloomcoffee.com/products/wuri',extractShopifyProduct],
  ['Park City Woo Store API','https://pcroaster.com/product/ethiopia-single-origin/',extractWooProduct]
 ]){
  const t=performance.now();let result=null,status='no_matching_product';
  try{result=await fn(url);if(result?.ok)status='parsed';}
  catch(err){status='exception_'+String(err?.name||'Error');}
  const row={name,status,elapsed_ms:round(performance.now()-t),fields:fields(result)};
  platformRuns.push(row);console.log('[DIC 2MB PLATFORM OPTION] '+JSON.stringify(row));
 }
 for(const [file,hash] of before)
  assert.equal(digest(readFileSync(join(server,file))),hash,'Tracked source mutated: '+file);
 const read=results.filter(x=>x.source_bytes!=null),above=read.filter(x=>x.source_bytes>BASE);
 const summary={targets:cases.length,readable:read.length,unavailable:cases.length-read.length,
  pages_over_900kb:above.length,new_parseable_at_2mb:above.filter(x=>x.at_2mb.ok).length,
  parsed_at_900kb:read.filter(x=>x.at_900kb.ok).length,
  parsed_at_2mb:read.filter(x=>x.at_2mb.ok).length,
  field_key_differences_under_900kb:read.filter(x=>x.at_900kb.ok&&x.at_2mb.ok&&
   JSON.stringify(x.at_900kb.fields)!==JSON.stringify(x.at_2mb.fields)).map(x=>x.name),
  head_256kb_exact_fields:read.filter(x=>x.head_256kb.complete).length,
  script_stripping_exact_fields:read.filter(x=>x.strip_scripts.complete).length,
  median_full_parse_ms:round(median(read.filter(x=>x.at_2mb.ok).map(x=>x.at_2mb.median_ms))),
  median_stripped_parse_ms:round(median(read.filter(x=>x.strip_scripts.complete).map(x=>x.strip_scripts.median_ms))),
  oversized_shrunk_below_900kb:above.filter(x=>x.strip_scripts.under_900kb).length,
  compression:compressedRuns,platform_endpoints:platformRuns,
  security_changed:false,production_source_unchanged:true};
 console.log('[DIC 2MB STUDY SUMMARY] '+JSON.stringify(summary));
}finally{rmSync(temp,{recursive:true,force:true});}
