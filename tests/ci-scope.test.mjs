import test from 'node:test';
import assert from 'node:assert/strict';
import {docsOnlyPaths,classifyChanges} from '../scripts/audit/ci-scope.mjs';
const A='a'.repeat(40),B='b'.repeat(40);
test('only Markdown documentation changes skip expensive CI',()=>{
 assert.equal(docsOnlyPaths(['docs/CURRENT_STATUS.md','docs/review/note.md']),true);
 assert.equal(docsOnlyPaths(['README.md']),true);
 for(const changed of [
  [],['docs/APPROVAL_COVERAGE_MATRIX.json'],['docs/CURRENT_STATUS.md','site/cloud/main.js'],
  ['AGENTS.md'],['.github/workflows/cloud-beta-ci.yml'],['supabase/migrations/new.sql'],
  ['docs/CURRENT_STATUS.md','scripts/release/controlled-release-runner.mjs'],
  ['docs/../site/main.md'],['docs/CURRENT_STATUS.md','package-lock.json']
 ])assert.equal(docsOnlyPaths(changed),false,JSON.stringify(changed));
});
test('Git diff classifier supports PR and push and fails closed on missing refs/errors',()=>{
 const run=(paths)=>((name,args)=>{assert.equal(name,'git');assert.equal(args[0],'diff');return paths.join('\n')+'\n';});
 assert.equal(classifyChanges({base:A,head:B,event:'push',git:run(['docs/CURRENT_STATUS.md'])}).docs_only,true);
 assert.equal(classifyChanges({base:A,head:B,event:'pull_request',git:run(['tests/ci-scope.test.mjs'])}).docs_only,false);
 assert.equal(classifyChanges({base:'0'.repeat(40),head:B,git:run(['docs/readme.md'])}).docs_only,false);
 assert.equal(classifyChanges({base:A,head:B,git:()=>{throw Error('diff failed');}}).docs_only,false);
});

import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
test('CLI emits a GitHub output value when run with a relative script path',()=>{
 const root=mkdtempSync(join(tmpdir(),'dic-ci-'));
 try{
  const path=join(root,'output');
  const result=spawnSync(process.execPath,['scripts/audit/ci-scope.mjs'],{
   encoding:'utf8',env:{...process.env,GITHUB_OUTPUT:path,DIC_CI_BASE:'0'.repeat(40),DIC_CI_HEAD:'1'.repeat(40)},timeout:5000
  });
  assert.equal(result.status,0,result.stderr);
  assert.equal(readFileSync(path,'utf8').trim(),'docs_only=false');
 }finally{rmSync(root,{recursive:true,force:true});}
});
