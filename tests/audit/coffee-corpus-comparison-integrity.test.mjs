import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';

const audit=path.resolve(import.meta.dirname,'../../scripts/audit');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');

async function compare(change=()=>{}){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'coffee-compare-integrity-'));
 try{
  const scripts=path.join(root,'scripts','audit'),docs=path.join(root,'docs','audits'),corpus=path.join(root,'corpus');
  await Promise.all([scripts,docs,corpus].map(dir=>fs.mkdir(dir,{recursive:true})));
  for(const name of ['coffee-corpus-compare.mjs','coffee-corpus-normalize.mjs'])await fs.copyFile(path.join(audit,name),path.join(scripts,name));
  const identity={case_id:'current-coffee',roaster_id:'current-roaster',source_url:'https://roaster.example/products/current'};
  const evidence=[{capture_id:'page',locator:'h1',quote:'Current Coffee'}];
  const oracle=JSON.stringify([{...identity,canonical:{name:{value:'Current Coffee',evidence}},additional_facts:[]}]);
  await fs.writeFile(path.join(docs,'oracle.json'),oracle);
  const freeze=JSON.stringify({files:[{kind:'source_oracle',path:'oracle.json',sha256:hash(oracle)}]});
  await fs.writeFile(path.join(corpus,'oracle-freeze.json'),freeze);
  const replay={oracle_freeze_sha256:hash(freeze),source_tree_sha256:'a'.repeat(64),
   records:[{...identity,output:{ok:true,fields:{name:'Current Coffee'}}}]};
  change(replay.records[0]);
  const replayPath=path.join(root,'replay.json'),output=path.join(root,'comparison.json');
  await fs.writeFile(replayPath,JSON.stringify(replay));
  const result=spawnSync(process.execPath,[path.join(scripts,'coffee-corpus-compare.mjs'),corpus,replayPath,output],
   {encoding:'utf8',timeout:10_000});
  return {...result,data:result.status===0?JSON.parse(await fs.readFile(output,'utf8')):null};
 }finally{await fs.rm(root,{recursive:true,force:true});}
}

test('strict comparison scores the original frozen coffee identity',async()=>{
 const result=await compare();assert.equal(result.status,0,result.stderr);
 assert.equal(result.data.counts.exact_equivalent,1);
});

test('matching case ID and field values do not excuse a different replay roaster',async()=>{
 const result=await compare(record=>{record.roaster_id='different-roaster';});
 assert.notEqual(result.status,0);assert.match(result.stderr,/Replay case identity differs from frozen oracle/);
});

test('matching case ID and field values do not excuse a different product source URL',async()=>{
 const result=await compare(record=>{record.source_url='https://roaster.example/products/another';});
 assert.notEqual(result.status,0);assert.match(result.stderr,/Replay case identity differs from frozen oracle/);
});
