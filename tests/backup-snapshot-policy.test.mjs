import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const drill=fileURLToPath(new URL('../scripts/backups/isolated-recovery-drill.sh',import.meta.url));
const compare=fileURLToPath(new URL('../scripts/backups/assert-recovery-inventory.sh',import.meta.url));

test('source collector failure removes both named containers before private output cleanup',()=>{
  const dir=mkdtempSync(join(tmpdir(),'dic-snapshot-cleanup-'));
  try{
    const bin=join(dir,'bin');mkdirSync(bin);
    const log=join(dir,'docker.jsonl');
    const output=join(dir,'dic-restore-drill-123456');
    writeFileSync(join(bin,'docker'),`#!/usr/bin/env node
const fs=require('node:fs');
const path=require('node:path');
const args=process.argv.slice(2);
const output=path.join(process.env.RUNNER_TEMP,'dic-restore-drill-'+process.env.GITHUB_RUN_ID);
if(args[0]==='run')fs.writeFileSync(path.join(output,'partial.dump'),'synthetic-private-output');
fs.appendFileSync(process.env.DIC_TEST_DOCKER_LOG,JSON.stringify({args,outputExists:fs.existsSync(output)})+'\\n');
process.exit(args[0]==='run'?37:0);
`,{mode:0o700});
    const result=spawnSync('bash',[drill],{encoding:'utf8',env:{...process.env,
      PATH:bin+':'+process.env.PATH,RUNNER_TEMP:dir,GITHUB_RUN_ID:'123456',
      SUPABASE_PROJECT_REF:'synthetic-project',SUPABASE_DB_URL:'synthetic-project-unused',
      DIC_TEST_DOCKER_LOG:log}});
    assert.ifError(result.error);
    assert.equal(result.status,37,'source failure must propagate');
    const calls=readFileSync(log,'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(calls.length,2);
    const source=calls[0].args;
    assert.equal(source[source.indexOf('--name')+1],'dic-recovery-source-123456');
    assert.deepEqual(calls[1].args,['rm','-f','dic-recovery-source-123456','dic-restore-123456']);
    assert.equal(calls[1].outputExists,true,'stop collector before deleting its mounted output');
    assert.equal(existsSync(output),false,'private output must be deleted after collector cleanup');
  }finally{rmSync(dir,{recursive:true,force:true});}
});

test('operational inventory mismatch fails without printing records or fingerprints',()=>{
  const dir=mkdtempSync(join(tmpdir(),'dic-snapshot-private-'));
  try{
    const expected=join(dir,'expected');const restored=join(dir,'restored');
    writeFileSync(expected,'synthetic-sensitive-fingerprint-A\n');
    writeFileSync(restored,'synthetic-sensitive-fingerprint-B\n');
    const result=spawnSync('sh',[compare,expected,restored,'row-fingerprints'],{encoding:'utf8'});
    assert.ifError(result.error);
    assert.equal(result.status,1);
    assert.match(result.stderr,/fingerprints disagree with the snapshot/);
    assert.doesNotMatch(result.stdout+result.stderr,/synthetic-sensitive-fingerprint/);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
