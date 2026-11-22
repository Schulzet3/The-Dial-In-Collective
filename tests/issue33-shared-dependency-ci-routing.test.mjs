import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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
