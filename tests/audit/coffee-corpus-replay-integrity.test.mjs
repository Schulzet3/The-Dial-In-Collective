import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';

const script=path.resolve(import.meta.dirname,'../../scripts/audit/coffee-corpus-replay.mjs');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
async function fixture(change=()=>{}){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'coffee-replay-integrity-'));
 try{
  const corpus=path.join(root,'corpus'),runner=path.join(root,'runner'),source=path.join(root,'source');
  await fs.mkdir(path.join(corpus,'cases','case'),{recursive:true});
  await fs.mkdir(path.join(runner,'scripts','audit'),{recursive:true});
  await fs.mkdir(path.join(runner,'docs','audits'),{recursive:true});
  for(const folder of ['src','netlify/functions','supabase/functions/_shared'])await fs.mkdir(path.join(source,folder),{recursive:true});
  const runScript=path.join(runner,'scripts','audit','coffee-corpus-replay.mjs');
  await fs.copyFile(script,runScript);
  await fs.writeFile(path.join(source,'package.json'),'{}');
  await fs.writeFile(path.join(source,'netlify/functions/coffee-url-preview.mjs'),
   `export function createPreviewHandler({readHtml}){return async request=>{const input=await request.json();const page=await readHtml(input.source_url);return Response.json({ok:page.ok,fields:{name:'Frozen Coffee'}});};}`);
  const sourceUrl='https://roaster.example/products/current';
  const bytes=Buffer.from('<h1>Frozen Coffee</h1>'),request={label:'page',url:sourceUrl,final_url:sourceUrl,status:200,bytes:bytes.length,file:'page.html',sha256:hash(bytes)};
  const packet={id:'case',roaster_id:'roaster',source_url:sourceUrl,requests:[request]};
  const oracle=[{case_id:'case',roaster_id:'roaster',source_url:sourceUrl}];
  const files=[
   {location:path.join(corpus,'manifest.json'),kind:'selection_manifest',value:{roasters:[{id:'roaster',selected_urls:[sourceUrl]}]}},
   {location:path.join(corpus,'frozen-source-hashes.json'),kind:'source_hash_index',value:[{case_id:'case',file:'page.html',sha256:request.sha256,bytes:bytes.length,status:200}]},
   {location:path.join(runner,'docs','audits','oracle.json'),kind:'source_oracle',value:oracle}
  ];
  const frozen=[];
  for(const item of files){const data=JSON.stringify(item.value);await fs.writeFile(item.location,data);frozen.push({path:item.location,kind:item.kind,sha256:hash(data)});}
  await fs.writeFile(path.join(corpus,'oracle-freeze.json'),JSON.stringify({files:frozen,case_count:1}));
  await fs.writeFile(path.join(corpus,'cases','case','page.html'),bytes);
  const originalPacket=JSON.stringify(packet);
  const attestation=JSON.stringify({source_archive_sha256:'a'.repeat(64),attestation_created_after_oracle_freeze:true,
   packets:[{id:'case',path:'extractor-600/cases/case/source-packet.json',bytes:Buffer.byteLength(originalPacket),sha256:hash(originalPacket)}]});
  await fs.writeFile(path.join(corpus,'original-archive-packet-attestation.json'),attestation);
  // This isolated synthetic corpus has its own explicitly trusted attestation.
  // The real benchmark's hardcoded receipt is never modified.
  await fs.writeFile(runScript,(await fs.readFile(runScript,'utf8')).replace(
   /const PACKET_ATTESTATION_SHA256='[a-f0-9]{64}'/,
   "const PACKET_ATTESTATION_SHA256='"+hash(attestation)+"'"));
  await change({packet,request,corpus,sourceUrl,bytes});
  await fs.writeFile(path.join(corpus,'cases','case','source-packet.json'),JSON.stringify(packet));
  const output=path.join(root,'output.json');
  const result=spawnSync(process.execPath,[runScript,corpus,output,source],{encoding:'utf8',timeout:10_000});
  const data=result.status===0?JSON.parse(await fs.readFile(output,'utf8')):null;
  return {status:result.status,stderr:result.stderr,data};
 }finally{await fs.rm(root,{recursive:true,force:true});}
}

test('original packet and immutable captured bytes replay normally',async()=>{
 const result=await fixture();assert.equal(result.status,0,result.stderr);assert.equal(result.data.records[0].output.ok,true);
});
test('changing both captured file and mutable packet hash cannot replace frozen source',async()=>{
 const result=await fixture(async({request,corpus})=>{
  const changed=Buffer.from('<h1>Different Coffee</h1>');request.sha256=hash(changed);request.bytes=changed.length;
  await fs.writeFile(path.join(corpus,'cases','case','page.html'),changed);
 });
 assert.notEqual(result.status,0);assert.match(result.stderr,/frozen.*(?:source|capture)|capture.*frozen/i);
});
test('packet case ID must match its frozen oracle and directory',async()=>{
 const result=await fixture(({packet})=>{packet.id='another-case';});
 assert.notEqual(result.status,0);assert.match(result.stderr,/packet.*identity|case.*identity/i);
});
test('packet roaster identity cannot be relabeled independently of the oracle',async()=>{
 const result=await fixture(({packet})=>{packet.roaster_id='another-roaster';});
 assert.notEqual(result.status,0);assert.match(result.stderr,/packet.*identity|roaster.*identity/i);
});
test('capture status must remain the originally frozen status',async()=>{
 const result=await fixture(({request})=>{request.status=404;});
 assert.notEqual(result.status,0);assert.match(result.stderr,/frozen.*(?:source|capture)|capture.*frozen/i);
});
test('an unindexed replacement file cannot masquerade as the original capture',async()=>{
 const result=await fixture(async({request,corpus,bytes})=>{
  request.file='new.html';await fs.writeFile(path.join(corpus,'cases','case','new.html'),bytes);
 });
 assert.notEqual(result.status,0);assert.match(result.stderr,/frozen.*(?:source|capture)|capture.*frozen/i);
});
test('duplicate request records cannot overwrite the capture URL map',async()=>{
 const result=await fixture(({packet,request})=>{packet.requests.push({...request});});
 assert.notEqual(result.status,0);assert.match(result.stderr,/duplicate.*capture|capture.*duplicate/i);
});
test('request URL metadata is bound to the separately attested original packet',async()=>{
 const result=await fixture(({request})=>{request.final_url='https://roaster.example/products/other';});
 assert.notEqual(result.status,0);assert.match(result.stderr,/original archive packet changed/i);
});
