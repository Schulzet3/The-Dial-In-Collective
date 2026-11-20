// Issue #33 R319 / #508 N508-075: source-path-aware CI without live re-fetch fanout.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const yaml=readFileSync(new URL('../.github/workflows/issue33-shared-parser-regressions.yml',import.meta.url),'utf8');
test('shared parser and Add Coffee changes trigger bounded offline selected-source CI on PR and push',()=>{
  for(const source of [
    'src/server/coffee-*.mjs',
    'src/server/roast-level-evidence.mjs',
    'site/cloud/coffee-url-autofill.js',
    'site/cloud/coffee-match-ui.js',
    'site/lib/ui.js',
    'site/lib/constants.js',
    'site/cloud/main.js',
    'supabase/functions/_shared/html-scan.mjs',
    'scripts/audit/issue33-*.mjs'
  ])assert.equal(yaml.split("- '"+source+"'").length-1,2,source+' must trigger PR and push');
  assert.match(yaml,/pull_request:[\s\S]*?branches: \[development\/backend-foundation\]/);
  assert.match(yaml,/push:[\s\S]*?branches: \[development\/backend-foundation\]/);
  for(const n of ['r315-original63','r316-original71','r317-original79-80','r318-original91-92','r330-original153','r332-original157','r345-original295','r346-original296','r347-original299','r352-selected-analogy-tastes','r351-original300','r353-original217'])
    assert.ok(yaml.includes('tests/coffee-issue33-'+n+'.test.mjs'),n+' test included');
});
test('dependency-aware trigger checks exact source and never triggers live HTTP or frozen603',()=>{
  assert.match(yaml,/git rev-parse HEAD/);
  assert.match(yaml,/DIC_EXPECTED_SHA/);
  assert.match(yaml,/persist-credentials: false/);
  assert.match(yaml,/node-version: '22'/);
  assert.doesNotMatch(yaml,/^\s*run:.*issue33-original603-focused-source-review/m);
  assert.doesNotMatch(yaml,/workflow_dispatch:|schedule:|netlify|secrets\./i);
});

test('actual Add Coffee UI import chain remains covered by narrow shared dependency triggers',()=>{
 const autofill=readFileSync(new URL('../site/cloud/coffee-url-autofill.js',import.meta.url),'utf8');
 const matching=readFileSync(new URL('../site/cloud/coffee-match-ui.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../site/lib/ui.js',import.meta.url),'utf8');
 assert.match(autofill,/from\s+['"]\.\.\/lib\/ui\.js['"]/);
 assert.match(matching,/from\s+['"]\.\.\/lib\/ui\.js['"]/);
 assert.match(ui,/from\s+['"]\.\/constants\.js['"]/);
 for(const source of ['site/lib/ui.js','site/lib/constants.js','site/cloud/coffee-match-ui.js'])
  assert.equal(yaml.split("- '"+source+"'").length-1,2,source+' must trigger both PR and push');
 assert.doesNotMatch(yaml,/issue33-original603-focused-source-review|DIC_ISSUE33_FOCUSED_PUBLIC_NUMBERS|workflow_dispatch:|schedule:/);
});

test('N508-075 latest selected source tests have both PR/push triggers and stay offline',()=>{
 for(const n of ['r345-original295','r346-original296','r347-original299','r352-selected-analogy-tastes','r351-original300','r353-original217']){
  const path='tests/coffee-issue33-'+n+'.test.mjs';
  assert.equal(yaml.split("- '"+path+"'").length-1,2,path+' must trigger on PR and push');
  assert.ok(yaml.includes('            '+path),path+' must actually run');
 }
 assert.equal(yaml.split('node --test').length-1,1,'one bounded Node test invocation');
 assert.doesNotMatch(yaml,/DIC_ISSUE33_FOCUSED_PUBLIC_NUMBERS|focused-source-review\.mjs|workflow_dispatch:|schedule:/);
});
