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

test('N508-075 R367 recent selected original603 adversarial cases run offline on shared-source changes',()=>{
  const recent=['r357-original490','r358-original501','r359-original508','r360-original509',
    'r361-original15','r362-original22','r364-original30','r365-original37','r366-original38','r368-original39'];
  for(const id of recent){
    const file='tests/coffee-issue33-'+id+'.test.mjs';
    assert.equal(yaml.split("- '"+file+"'").length-1,2,file+' must trigger on PR and push');
    assert.ok(yaml.includes('            '+file),file+' must be executed by offline Node job');
    const contents=readFileSync(new URL('../'+file,import.meta.url),'utf8');
    for(const shared of ['extractPublicCoffeeFacts','requiredFocusedSourceFailures',
      'coffeeUrlPreviewMarkup','coffeeSourceReviewSnapshot'])
      assert.ok(contents.includes(shared),id+' actual shared-parser or UI contract '+shared);
    assert.doesNotMatch(contents,/\bfetch\s*\(|\bhttps?\.request\s*\(|DIC_ISSUE33_FOCUSED_PUBLIC_NUMBERS/,
      id+' synthetic regression may not make a real source request');
  }
  assert.equal(yaml.split('node --test').length-1,1,'single bounded offline invocation');
  assert.doesNotMatch(yaml,/DIC_ISSUE33_FOCUSED_PUBLIC_NUMBERS|focused-source-review\.mjs|workflow_dispatch:|schedule:/);
});

test('N508-075 R372 historically skipped selected #558/#241 synthetic contracts run on shared changes',()=>{
 const legacy=['r112-558','r335-novo-241'];
 for(const id of legacy){
  const file='tests/coffee-issue33-'+id+'.test.mjs';
  assert.equal(yaml.split("- '"+file+"'").length-1,2,'must trigger PR and push: '+file);
  assert.ok(yaml.includes('            '+file),'must run offline in the single shared job: '+file);
  const body=readFileSync(new URL('../'+file,import.meta.url),'utf8');
  assert.doesNotMatch(body,/\bfetch\s*\(|\bhttps?\.request\s*\(/,'synthetic tests must not fetch HTTP: '+file);
 }
 const guard=readFileSync(new URL('../scripts/audit/issue33-r335-novo-241-transport.mjs',import.meta.url),'utf8');
 assert.match(guard,/if\(process\.env\.DIC_R335_RUN==='1'\)await diagnose\(\)/,'live Novo diagnostic must stay opt-in');
 const selected=readFileSync(new URL('../tests/coffee-issue33-r112-558.test.mjs',import.meta.url),'utf8');
 assert.match(selected,/extractPublicCoffeeFacts/,'original #558 uses real parser with no HTTP');
 const novo=readFileSync(new URL('../tests/coffee-issue33-r335-novo-241.test.mjs',import.meta.url),'utf8');
 assert.match(novo,/isCoffeeSourceAccessChallenge/,'original #241 challenge guard exercised');
 assert.equal(yaml.split('node --test').length-1,1,'no duplicated live HTTP jobs');
 assert.doesNotMatch(yaml,/DIC_ISSUE33_FOCUSED_PUBLIC_NUMBERS|focused-source-review\.mjs|workflow_dispatch:|schedule:/);
});
