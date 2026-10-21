// Inert remote Git acceptance, NOT a Netlify integration test.
// Two contenders built from the same valid release base cannot both
// fast-forward a real Git ref. No hosted repository or deployment is touched.
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,execFile} from 'node:child_process';
import {mkdtempSync,rmSync,writeFileSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {promisify} from 'node:util';
const exec=promisify(execFile);
const git=(dir,...args)=>execFileSync('git',['-C',dir,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const configure=path=>{git(path,'config','user.name','CI Release Race');git(path,'config','user.email','ci-release-race@example.invalid');};
test('two real non-force concurrent Git pushes to one release ref have exactly ONE winner',async()=>{
 const temp=mkdtempSync(join(tmpdir(),'dic-single-use-'));
 try{
  const remote=join(temp,'remote.git'),seed=join(temp,'seed');
  mkdirSync(remote);mkdirSync(seed);
  git(remote,'init','--bare','-q');
  git(seed,'init','-q');configure(seed);
  writeFileSync(join(seed,'README'),'Atomic release seed');
  git(seed,'add','README');git(seed,'commit','-q','-m','Inert base [skip netlify]');
  git(seed,'remote','add','origin',remote);
  git(seed,'push','-q','origin','HEAD:refs/heads/release/production');
  const dirs=['one','two'].map(x=>join(temp,x));
  for(const [index,dir] of dirs.entries()){
   git(temp,'clone','-q','--branch','release/production',remote,dir);
   configure(dir);
   git(dir,'commit','-q','--allow-empty','-m','Inert competing grant DIC-20261020-ONE123 contender '+index+' [skip netlify]');
  }
  assert.equal(new Set(dirs.map(dir=>git(dir,'rev-parse','HEAD'))).size,2,
   'race contenders must be distinct commits even within one Git timestamp second');
  const old=git(seed,'rev-parse','HEAD');
  const attempts=await Promise.all(dirs.map(async dir=>{
   try{await exec('git',['-C',dir,'push','origin','HEAD:refs/heads/release/production']);
    return {ok:true};}
   catch{return {ok:false};}
  }));
  assert.equal(attempts.filter(x=>x.ok).length,1,'only one competing ref update may succeed');
  assert.equal(attempts.filter(x=>!x.ok).length,1,'second competing claim must fail');
  const published=git(remote,'rev-parse','refs/heads/release/production');
  assert.notEqual(published,old);
  // Without --force GitHub and plain Git both disallow rewinding a ref to
  // an obsolete release base after the winning claim.
  let rewound=false;
  try{git(seed,'push','origin','HEAD:refs/heads/release/production');rewound=true;}
  catch{ /* expected rejection */ }
  assert.equal(rewound,false);
 }finally{rmSync(temp,{recursive:true,force:true});}
});
