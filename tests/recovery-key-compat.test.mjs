import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const derive=resolve(import.meta.dirname,'../scripts/backups/derive-recovery-recipient.sh');
const run=(file,extraEnv={})=>spawnSync('bash',[derive,file],{
  encoding:'utf8',env:{...process.env,...extraEnv}});

function temp(fn){
  const dir=mkdtempSync(join(tmpdir(),'dic-recipient-test-'));
  try{return fn(dir);}finally{rmSync(dir,{recursive:true,force:true});}
}
function makeMock(dir,cmd,body){
  const bin=join(dir,'bin');mkdirSync(bin,{recursive:true});
  writeFileSync(join(bin,cmd),'#!/usr/bin/env bash\n'+body+'\n',{mode:0o700});
  return bin;
}

test('empty or missing secret file fails without disclosing key material',()=>temp(dir=>{
  const f=join(dir,'empty');writeFileSync(f,'');
  const result=run(f);
  assert.equal(result.status,2);
  assert.match(result.stderr,/missing or empty/);
  assert.equal(result.stdout,'');
}));

test('native age identity derives a single public recipient without outputting private data',()=>temp(dir=>{
  const f=join(dir,'identity');writeFileSync(f,'private-secret-synthetic',{mode:0o600});
  const bin=makeMock(dir,'age-keygen','printf "age1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq\n"');
  const result=run(f,{PATH:bin+':'+process.env.PATH});
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/^age1[a-z0-9]{20,}\n$/);
  assert.doesNotMatch(result.stdout+result.stderr,/private-secret-synthetic/);
}));

test('SSH Ed25519 fallback trims public comment and declines unsupported RSA',()=>temp(dir=>{
  const f=join(dir,'identity');writeFileSync(f,'private-secret-synthetic',{mode:0o600});
  const bin=makeMock(dir,'age-keygen','exit 1');
  makeMock(dir,'ssh-keygen','printf "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFakeKey0123456789== comment\n"');
  const result=run(f,{PATH:bin+':'+process.env.PATH});
  assert.equal(result.status,0,result.stderr);
  assert.equal(result.stdout.trim(),'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFakeKey0123456789==');
  assert.doesNotMatch(result.stdout,/comment|private-secret-synthetic/);
  makeMock(dir,'ssh-keygen','printf "ssh-rsa AAAAC3NzaC1yc2EAAAADAQABAAAB\n"');
  const denied=run(f,{PATH:bin+':'+process.env.PATH});
  assert.equal(denied.status,2);
  assert.match(denied.stderr,/accepted age or SSH Ed25519/);
}));

test('real noninteractive OpenSSH Ed25519 private key derives same public recipient as .pub',t=>temp(dir=>{
  const command=spawnSync('ssh-keygen',['-h'],{encoding:'utf8'});
  if(command.error?.code==='ENOENT'){
    if(process.env.GITHUB_ACTIONS)assert.fail('GitHub runner must provide ssh-keygen');
    t.skip('ssh-keygen unavailable outside GitHub Actions');
    return;
  }
  const f=join(dir,'private_identity');
  const gen=spawnSync('ssh-keygen',['-q','-t','ed25519','-N','','-C','synthetic-ci-only','-f',f],{encoding:'utf8'});
  assert.equal(gen.status,0,gen.stderr);
  const expected=readFileSync(f+'.pub','utf8').trim().split(/\s+/).slice(0,2).join(' ');
  const result=run(f);
  assert.equal(result.status,0,result.stderr);
  assert.equal(result.stdout.trim(),expected);
  assert.equal(result.stderr,'');

  const encrypted=join(dir,'password_protected');
  const makeProtected=spawnSync('ssh-keygen',['-q','-t','ed25519','-N','synthetic-passphrase','-f',encrypted],{encoding:'utf8'});
  assert.equal(makeProtected.status,0,makeProtected.stderr);
  const blocked=run(encrypted);
  assert.equal(blocked.status,2);
  assert.match(blocked.stderr,/passphrase-protected/);
}));
