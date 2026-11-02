import test from 'node:test';
import assert from 'node:assert/strict';
import {chmodSync,mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {decide} from '../scripts/netlify/should-ignore-build.mjs';

const release={context:'production',branch:'release/production',
 subject:'Release DIC: DIC-20261020-ONE123 [dic-publish]'};
test('strict release marker on dedicated branch authorizes build without any credit evidence',()=>{
 assert.equal(decide(release).ignore,false);
 for(const ledger of [null,undefined,{},{
  provider:'Netlify',snapshots:[{observed_remaining_credits:0,observed_date:'1970-01-01'}],
  release_policy:{maximum_snapshot_age_days:0,post_release_billing_refresh_needed:true}
 }])assert.equal(decide({...release,ledger,today:'2099-01-01'}).ignore,false);
});
test('immutable release-claim skip marker suppresses Git-connected rebuild despite release subject',()=>{
 const claim={...release,commitMessage:release.subject+'\n\n[skip netlify]\n'};
 assert.equal(decide(claim).ignore,true);
 assert.match(decide(claim).reason,/suppress Git-connected rebuild/);
 assert.equal(decide({...claim,commitMessage:release.subject+'\n\n[SKIP NETLIFY]\n'}).ignore,true);
 assert.equal(decide({...claim,commitMessage:release.subject+'\n\n[skip netlify-extra]'}).ignore,false);
 const source=readFileSync(new URL('../scripts/netlify/should-ignore-build.mjs',import.meta.url),'utf8');
 assert.match(source,/--format=%B/,'must inspect entire Git commit message, not just subject');
 assert.match(source,/subject,commitMessage/,'full commit message must reach the decision gate');
});
test('unmarked commits and non-release branches cannot build, independent of credits',()=>{
 for(const branch of ['main','development/backend-foundation','work/preview']){
  assert.equal(decide({...release,branch}).ignore,true);
 }
 for(const subject of ['docs: update [skip netlify]','Release DIC: old invalid [dic-publish]','']){
  assert.equal(decide({...release,subject}).ignore,true);
 }
 for(const context of ['deploy-preview','branch-deploy','']){
  assert.equal(decide({...release,context}).ignore,true);
 }
});
test('Netlify ignore build adapter requires exact owner release allow token and status',()=>{
 const toml=readFileSync(new URL('../netlify.toml',import.meta.url),'utf8');
 const src=readFileSync(new URL('../scripts/netlify/should-ignore-build.mjs',import.meta.url),'utf8');
 assert.match(toml,/node \.\/scripts\/netlify\/should-ignore-build\.mjs/);
 assert.match(toml,/DIC_IGNORE_STATUS/);
 assert.match(toml,/command\s*=\s*"npm run build:cloud"/);
 assert.doesNotMatch(toml,/command\s*=\s*"npm test &&/);
 assert.match(src,/assertProductionClaim/);
 assert.match(src,/checkRepository\(\)/);
 assert.doesNotMatch(src,/NETLIFY_CREDIT_LEDGER\.json|estimated_credits_limit|remaining<cost/);
});
test('actual Netlify Bash adapter permits only the explicit allow token and sentinel exit',()=>{
 const toml=readFileSync(new URL('../netlify.toml',import.meta.url),'utf8');
 const command=JSON.parse(toml.match(/^\s*ignore\s*=\s*(".*")\s*$/m)[1]);
 const temp=mkdtempSync(join(tmpdir(),'dic-ignore-adapter-'));
 try{
  const bin=join(temp,'bin');mkdirSync(bin);
  writeFileSync(join(bin,'node'),`#!/bin/sh
printf '%s' "$DIC_FAKE_STDOUT"
exit "$DIC_FAKE_EXIT"
`);
  chmodSync(join(bin,'node'),0o700);
  const cases=[
   {status:42,stdout:'DIC_BUILD_ALLOWED\n',expected:1},
   {status:0,stdout:'',expected:0},
   {status:1,stdout:'',expected:0},
   {status:1,stdout:'DIC_BUILD_ALLOWED',expected:0},
   {status:42,stdout:'',expected:0},
   {status:42,stdout:'DIC_BUILD_ALLOWED\nunexpected output',expected:0},
   {status:127,stdout:'',expected:0},
   {status:137,stdout:'',expected:0}
  ];
  for(const scenario of cases){
   const result=spawnSync('/bin/bash',['-e','-c',command],{cwd:temp,encoding:'utf8',
    env:{PATH:bin,DIC_FAKE_STDOUT:scenario.stdout,DIC_FAKE_EXIT:String(scenario.status)}});
   assert.ifError(result.error);
   assert.equal(result.status,scenario.expected,JSON.stringify(scenario));
  }
  rmSync(join(bin,'node'));
  const missing=spawnSync('/bin/bash',['-e','-c',command],{cwd:temp,encoding:'utf8',env:{PATH:bin}});
  assert.ifError(missing.error);
  assert.equal(missing.status,0,'missing Node must cancel a build');
 }finally{rmSync(temp,{recursive:true,force:true});}
});


test('historical Netlify billing screenshots remain intact but cannot block publication',()=>{
 const ledger=JSON.parse(readFileSync(new URL('../docs/NETLIFY_CREDIT_LEDGER.json',import.meta.url),'utf8'));
 const old=ledger.snapshots.find(x=>x.observed_date==='2026-10-14');
 assert.equal(old.observed_total_used_credits,330.2);
 assert.equal(old.observed_remaining_credits,0);
 assert.equal(ledger.release_policy.credit_monitoring_mode,'owner_only_no_gates');
 assert.equal(decide({...release,ledger}).ignore,false);
});
