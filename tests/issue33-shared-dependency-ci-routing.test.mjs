import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname,relative,sep} from 'node:path';
const yaml=readFileSync('.github/workflows/issue33-r412-original126-127.yml','utf8');
const pr=yaml.split('  pull_request:')[1].split('  push:')[0];
const push=yaml.split('  push:')[1].split('permissions:')[0];
const paths=block=>block.split('\n').map(x=>x.trim()).filter(x=>x.startsWith("- '")).map(x=>x.slice(3,-1));
const groups=[paths(pr),paths(push)];
const covered=(group,file)=>group.some(glob=>{
 const at=glob.indexOf('*');
 return at<0?glob===file:file.startsWith(glob.slice(0,at))&&file.endsWith(glob.slice(at+1));
});
test('shared parser, product and UI dependencies rerun one representative selected-source job on both events',()=>{
 for(const group of groups)for(const file of [
  'src/server/coffee-page-metadata.mjs','src/server/coffee-product-scope.mjs',
  'src/server/coffee-url-guard.mjs','src/server/roast-level-evidence.mjs',
  'src/server/agtron-roast.mjs',
  'site/cloud/coffee-url-autofill.js','site/lib/ui.js',
  'supabase/functions/_shared/html-scan.mjs',
  'supabase/functions/_shared/coffee-release-label.mjs',
  'scripts/audit/issue33-original603-focused-source-review.mjs',
  'scripts/audit/issue33-focused-source-acceptance.mjs',
  'scripts/audit/issue33-selected-product-heading.mjs'
 ])assert.ok(covered(group,file),'missing '+file);
});
test('unrelated application, release, SQL and other merchant cases do not fan out',()=>{
 for(const group of groups)for(const file of [
  'docs/README.md','site/cloud/main.js','docs/RELEASE_REQUEST.json',
  'supabase/migrations/20261122_unrelated.sql',
  'scripts/audit/issue33-r411-foster-original124-125-check.mjs'
 ])assert.ok(!covered(group,file),'unexpected '+file);
});
test('one hard-gated two-coffee official source, parser and unsaved UI job remains',()=>{
 assert.equal((yaml.match(/runs-on: ubuntu-24\.04/g)||[]).length,1);
 assert.ok(yaml.includes("DIC_ISSUE33_FOCUSED_PUBLIC_NUMBERS: '126,127'"));
 assert.ok(yaml.includes('Strict own selected identities source HTML SHA'));
 assert.ok(yaml.includes('coffee-issue33-r408-producer-farm-caption.test.mjs'));
});

// This module is a direct current coffee parser import, but its path is neither
// src/server/coffee-*.mjs nor src/server/roast-*.mjs; missing it leaves a hole.
test('direct parser Agtron import is covered on PR and merged pushes without broad fanout',()=>{
 const parser=readFileSync('src/server/coffee-page-metadata.mjs','utf8');
 assert.match(parser,/from ['"]\.\/agtron-roast\.mjs['"]/);
 assert.match(parser,/\binterpretAgtron\(/);
 for(const group of groups)assert.ok(covered(group,'src/server/agtron-roast.mjs'));
 for(const group of groups)assert.ok(!covered(group,'src/server/unrelated-roaster-sandbox.mjs'));
});

test('transitive selected Add Coffee UI constants dependency triggers guarded source evidence on both events',()=>{
 const renderer=readFileSync('site/cloud/coffee-url-autofill.js','utf8');
 const ui=readFileSync('site/lib/ui.js','utf8');
 assert.ok(renderer.includes("from '../lib/ui.js'"),'actual selected renderer must import UI');
 assert.ok(ui.includes("from './constants.js'"),'actual UI must import constants');
 for(const group of groups){
  assert.ok(covered(group,'site/lib/constants.js'),'missing transitive UI constants');
  assert.ok(!covered(group,'site/lib/noncoffee-demo.js'),'unrelated UI library must not fan out');
 }
});

test('central official-source path closure includes current recursively imported source modules',()=>{
 const entries=[
  'scripts/audit/issue33-original603-focused-source-review.mjs',
  'scripts/audit/issue33-r412-original126-127-check.mjs',
  'scripts/audit/issue33-shopify-pagefly-h3.mjs',
  'src/server/coffee-page-metadata.mjs',
  'site/cloud/coffee-url-autofill.js'
 ];
 const root=resolve('.'),todo=[...entries],seen=new Set();
 while(todo.length){
  const file=todo.pop();
  if(seen.has(file))continue;
  assert.ok(file.match(/\.(?:js|mjs)$/),'unexpected source module '+file);
  assert.ok(existsSync(file),'missing imported source '+file);
  assert.ok(groups.every(group=>covered(group,file)),
   'unrouted exact selected source dependency '+file);
  seen.add(file);
  const source=readFileSync(file,'utf8');
  for(const match of source.matchAll(/\b(?:from\s+|import\s*\(\s*)['"](\.[^'"]+\.(?:js|mjs))['"]/g)){
   const absolute=resolve(dirname(file),match[1]);
   const next=relative(root,absolute).split(sep).join('/');
   assert.ok(next&&!next.startsWith('../')&&!next.startsWith('/'),
    'selected-source import escapes repository: '+file);
   if(!seen.has(next))todo.push(next);
  }
  assert.ok(seen.size<=250,'unexpected selected-source closure growth');
 }
 assert.ok(seen.size>=35,'selected-source closure unexpectedly narrowed');
});
test('metadata-only Issue33 journal edits do not trigger first-party HTTPS on PR or push',()=>{
 for(const group of groups)for(const file of [
  'docs/workstreams/ops-issue33-r412-original126-127-20261122.md',
  'docs/workstreams/ops-issue33-r428-source-closure-20261123.md',
  'docs/CURRENT_STATUS.md','docs/RELEASE_QUEUE.json'
 ])assert.ok(!covered(group,file),'docs-only live merchant HTTP fanout: '+file);
});
