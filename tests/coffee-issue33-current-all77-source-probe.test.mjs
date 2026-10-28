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

test('immutable all77 public receipt records each original URL once, including 15 conflicts and 2 bounded-size exceptions',()=>{
 const doc=JSON.parse(readFileSync(new URL('../docs/audits/issue33-direct-current-all77-source-probe-20261028.json',import.meta.url),'utf8'));
 assert.equal(doc.summary.attempted,77);
 assert.equal(doc.summary.statuses.PARSED,75);
 assert.equal(doc.summary.statuses.UNAVAILABLE,2);
 assert.equal(doc.summary.conflict_case_count,15);
 assert.deepEqual(doc.summary.oversized_case_numbers,[50,67]);
 assert.deepEqual(doc.records.map(x=>x.number),Array.from({length:77},(_,i)=>i+1));
 for(const item of doc.records){
  assert.equal(item.original_url,rows[item.number-1].original_product_url);
  if(item.source_status==='PARSED')assert.match(item.html_sha256,/^[a-f0-9]{64}$/);
 }
});
test('only preexisting guarded 2MB product path is used for two known oversized URL retries',()=>{
 const src=readFileSync(new URL('../scripts/audit/issue33-oversized-source-probe.mjs',import.meta.url),'utf8');
 const workflow=readFileSync(new URL('../.github/workflows/roaster-source-probe.yml',import.meta.url),'utf8');
 assert.match(src,/const ids=\[50,67\]/);
 assert.match(src,/maxBytes:MAX_PRODUCT_RETRY_BYTES/);
 assert.match(src,/MAX_PRODUCT_RETRY_BYTES!==2_000_000/);
 assert.match(workflow,/issue33-oversized-products:[\s\S]*?\[dic-issue33-oversize-probe\]/);
});

test('source-bound verified 2MB retries retain selected public facts and mark no false individual approval',()=>{
 const d=JSON.parse(readFileSync(new URL('../docs/audits/issue33-direct-oversized-source-retry-20261028.json',import.meta.url),'utf8'));
 assert.equal(d.source_run,40640135160);
 assert.deepEqual(d.rows.map(x=>x.number),[50,67]);
 for(const rec of d.rows){
  assert.equal(rec.max_bytes,2000000);
  assert.equal(rec.source_status,'PARSED');
  assert.match(rec.source_sha256,/^[a-f0-9]{64}$/);
  const original=rows[rec.number-1];
  assert.equal(rec.requested_url,original.original_product_url);
  assert.equal(original.latest_direct_public_probe.retry.individual_acceptance,false);
  assert.equal(original.latest_direct_public_probe.source_status,'PARSED_AFTER_GUARDED_2MB_RETRY');
 }
 assert.equal(d.rows[0].fields.process,'Honey');
 assert.match(d.rows[0].fields.origin,/GUATEMALA/i);
 assert.equal(d.rows[1].fields.process,'Other/Unknown');
 assert.equal(d.rows[1].fields.producer,undefined);
});
