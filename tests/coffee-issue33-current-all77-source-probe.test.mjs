import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {safeCoffeeUrl} from '../src/server/coffee-url-guard.mjs';
const rows=JSON.parse(readFileSync(new URL('../docs/audits/extractor-issue33-independent-77-review-register.json',import.meta.url),'utf8')).records;
test('all77 diagnostic retains immutable owner numbering, distinct current URLs and guarded source endpoints',()=>{
 assert.equal(rows.length,77);
 assert.deepEqual(rows.map(x=>x.number),Array.from({length:77},(_,i)=>i+1));
 assert.equal(new Set(rows.map(x=>x.original_product_url)).size,77);
 for(const row of rows){
  assert.equal(new URL(row.original_product_url).protocol,'https:');
  assert.ok(safeCoffeeUrl(row.original_product_url),'invalid guarded original URL '+row.number);
 }
});
test('all77 direct probe remains explicit, isolated from production member/API writes and original source oracle',()=>{
 const src=readFileSync(new URL('../scripts/audit/issue33-current-all77-source-probe.mjs',import.meta.url),'utf8');
 const workflow=readFileSync(new URL('../.github/workflows/roaster-source-probe.yml',import.meta.url),'utf8');
 assert.match(workflow,/issue33-all77-direct-current:[\s\S]*?\[dic-issue33-77-probe\]/);
 assert.match(src,/fetchPublicCoffeeHtml\(row.original_product_url\)/);
 assert.match(src,/extractPublicCoffeeFacts\(response.html/);
 assert.match(src,/for\(let index=0;index<rows.length;index\+=4\)/);
 assert.doesNotMatch(src,/supabase\.co\/auth|service_role|createClient|execute_sql|apply_migration|fetch\(['"]https:\/\/api\.anthropic/);
});
