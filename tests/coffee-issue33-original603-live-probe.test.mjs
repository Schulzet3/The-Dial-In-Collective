import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const base=new URL('../docs/audits/',import.meta.url);
const paths=[
 ['extractor-600-oracle-a.json','2cc77e02828d640f342ef73597b550e8892cfa354882977254d2b9697b960c64'],
 ['extractor-600-oracle-b.json','cd2ce6b8ff09bdaf4fedbeaad3b7556efe0c42607cc04229563a90a32ecef72b'],
 ['extractor-600-oracle-c.json','60c00a8f61f06af1858ebdae7ace408987cb79d80014552f03cb724afc71cbee'],
 ['extractor-600-oracle-root.json','088034be3484a543b3b36d76420b3567f8b3cd708ee266e2c45da9996c6f2e0e'],
 ['extractor-600-oracle-root-extra-c.json','7b9cb91e7e6f6426162af761557c8ebde9c91726509ed919939351c2014215b8']
];
const script=readFileSync(new URL('../scripts/audit/issue33-original603-live-source-probe.mjs',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../.github/workflows/issue33-603-public-source.yml',import.meta.url),'utf8');
test('original locked oracle hashes and all 603 distinct source identities remain unchanged',()=>{
 const rows=[];
 for(const [file,sha] of paths){
  const bytes=readFileSync(new URL(file,base));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),sha,file);
  rows.push(...JSON.parse(bytes));
 }
 assert.equal(rows.length,603);
 assert.equal(new Set(rows.map(x=>x.case_id)).size,603);
 assert.equal(new Set(rows.map(x=>x.source_url)).size,603);
 const groups=new Map();
 for(const row of rows){
  assert.match(row.source_url,/^https:\/\//);
  groups.set(row.roaster_id,(groups.get(row.roaster_id)||0)+1);
 }
 assert.equal(groups.size,201);
 assert.ok([...groups.values()].every(n=>n===3));
});
test('live source probe retains 201 x three distinct coffees and does not auto-certify',()=>{
 assert.match(script,/original\.length!==603\|\|groups\.size!==201/);
 assert.match(script,/a\.length!==3/);
 assert.match(script,/rows\.length!==201/);
 assert.match(script,/MAX_PRODUCT_RETRY_BYTES/);
 assert.match(script,/fetchPublicCoffeeHtml\(row\.source_url/);
 assert.match(script,/extractPublicCoffeeFacts\(response\.html/);
 assert.match(script,/coffeeUrlPreviewMarkup\(parsed\)/);
 assert.match(script,/source_sha256/);
 assert.match(script,/certified_603:false/);
 assert.match(script,/auth_requests:0/);
 assert.match(script,/database_writes:0/);
 assert.doesNotMatch(script,/createClient|service_role|SUPABASE_SERVICE|apply_migration|delete from|insert into|update public|deployToProduction/);
});
test('source-only runner keeps Node shebang at byte zero',()=>{
 assert.ok(script.startsWith('#!/usr/bin/env node\\n'), 'The executable hashbang must be the first line, never preceded by a CI trigger comment');
});
test('workflow runs three isolated no-secret public shards, private one-day evidence only, never deploys',()=>{
 assert.match(workflow,/shard:\s*\[0,\s*1,\s*2\]/);
 assert.match(workflow,/retention-days:\s*1/);
 assert.match(workflow,/permissions:\s*\n\s*contents:\s*read/);
 assert.match(workflow,/issue33-original603-live-source-probe\.mjs/);
 assert.doesNotMatch(workflow,/service_role|publish|netlify deploy|supabase functions deploy|GH_TOKEN/);
});
