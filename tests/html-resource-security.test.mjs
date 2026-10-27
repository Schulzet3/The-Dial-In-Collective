import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {rawElements,removeElements,removeComments} from '../supabase/functions/_shared/html-scan.mjs';
test('raw scanner advances monotonically and handles case, whitespace and unclosed elements',()=>{
 const html='A<SCRIPT type="application/json">{"a":1}</ScRiPt >B<style>x</style>C<script>unterminated';
 const blocks=[...rawElements(html,['script','style'])];assert.equal(blocks.length,3);
 assert.equal(blocks[0].body,'{"a":1}');assert.equal(blocks[2].closed,false);
 assert.equal(removeElements(html,['script','style']),'A B C ');
 assert.equal(removeComments('a<!--bad<!--bad'),'a ');
});
test('HTML resource probes finish in an isolated process, including nested tags and structured malicious descriptions',()=>{
 const code=`import {extractPublicCoffeeFacts as extract} from './src/server/coffee-page-metadata.mjs';
 import {compactCoffeeProductHtml} from './src/server/coffee-product-prep.mjs';
 import {extractOfficialEvidence} from './supabase/functions/dic-verify-coffee/evidence.mjs';
 import {extractProductPreview} from './supabase/functions/dic-preview-coffee/preview.mjs';
 const samples=[('<meta '+'a'.repeat(1400)+'>').repeat(1200),'<'.repeat(200000),'<script>'.repeat(10000),'<style>'.repeat(10000),'<nav>'.repeat(10000),'<!--'.repeat(20000),'<div '+'a'.repeat(100000)+'>','<script type="application/ld+json">'+JSON.stringify({'@type':'Product',name:'Audit Coffee',description:'<'.repeat(200000)})+'</script>'];
 const timings=[];
 for(const sample of samples){const start=performance.now(),html='<h1>Audit Coffee</h1>'+sample;
  extract(compactCoffeeProductHtml(html)||html,{source_url:'https://example.invalid/products/audit'});
  extractOfficialEvidence(html,{name:'Audit Coffee',source_url:'https://example.invalid/products/audit'});
  extractProductPreview(html,{source_url:'https://example.invalid/products/audit',roaster:'Audit'});
  timings.push(Math.round(performance.now()-start));
 }console.log(JSON.stringify(timings));`;
 const result=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd:new URL('..',import.meta.url),timeout:18000,encoding:'utf8'});
 assert.equal(result.error,undefined,result.error?.message);assert.equal(result.status,0,result.stderr);
 assert.equal(JSON.parse(result.stdout).length,8);
});

test("Unicode before tags cannot shift evidence offsets",()=>{
 const html="\u0130\u0130<SCRIPT>preserved</SCRIPT>tail";
 const [block]=rawElements(html);assert.equal(block.start,2);assert.equal(block.body,"preserved");
 assert.equal(removeElements(html,["script"]),"\u0130\u0130 tail");
});

test('repeated quoted HTML attributes have bounded work across product layouts',()=>{
 const code=`import {extractPublicCoffeeFacts as extract} from './src/server/coffee-page-metadata.mjs';
 const samples=[['<div '+('class="a-stat" ').repeat(15000)+'>','https://www.seycoffee.com/products/audit'],['<p '+('class="meta-title" ').repeat(10000)+'>','https://example.invalid/products/audit'],['<div '+('class="meta-info" ').repeat(10000)+'>','https://example.invalid/products/audit'],['<div class="'+('a-stat ').repeat(40000)+'">','https://www.seycoffee.com/products/audit']];
 for(const [sample,source_url] of samples)extract('<h1>Audit Coffee</h1>'+sample,{source_url});console.log('bounded');`;
 const result=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd:new URL('..',import.meta.url),timeout:4000,encoding:'utf8'});
 assert.equal(result.error,undefined,result.error?.message);assert.equal(result.status,0,result.stderr);assert.equal(result.stdout.trim(),'bounded');
});
