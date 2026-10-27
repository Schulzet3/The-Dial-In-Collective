#!/usr/bin/env node
/** Replay captured public bytes through the real authenticated preview handler.
 * Authentication and quota responses are isolated nonfunctional fixtures.
 * There is no live Supabase, member operation, API key, or outbound request.
 * This tests parser/orchestration and byte bounds, not production networking.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';

const [root,output,sourceRepo=path.resolve(import.meta.dirname,'../..'),...caseIds]=process.argv.slice(2);
if(!root||!output)throw new Error('Usage: coffee-corpus-replay.mjs CORPUS OUTPUT [SOURCE_REPO] [CASE_ID ...]');
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
// This later attestation was derived from the preserved original archive. It
// binds packet URL/status metadata without pretending it was in the oracle lock.
const PACKET_ATTESTATION_SHA256='0767e52af1a5483ef31beba01d9fa70666a17de10634bb9cb1cc933a6b105556';
const freezeBytes=await fs.readFile(path.join(root,'oracle-freeze.json')),freeze=JSON.parse(freezeBytes);
const frozenFiles=[],oracle=[];let frozenCaptures;
for(const record of freeze.files){
 const location=record.kind==='source_oracle'?path.resolve(import.meta.dirname,'../../docs/audits',path.basename(record.path)):
  path.join(root,path.basename(record.path));
 const bytes=await fs.readFile(location);
 if(sha(bytes)!==record.sha256)throw new Error('Changed frozen oracle: '+record.path);
 frozenFiles.push({location,sha256:record.sha256});
 if(record.kind==='source_oracle')oracle.push(...JSON.parse(bytes));
 if(record.kind==='source_hash_index'){
  if(frozenCaptures)throw new Error('Duplicate frozen capture index');
  frozenCaptures=JSON.parse(bytes);
 }
}
const expectedCases=new Map(oracle.map(row=>[row.case_id,row]));
if(!oracle.length||expectedCases.size!==oracle.length||!Array.isArray(frozenCaptures))throw new Error('Invalid frozen case/capture index');
const captureIndex=new Map(),capturesPerCase=new Map();
for(const row of frozenCaptures){
 const key=row.case_id+'\0'+row.file;
 if(!expectedCases.has(row.case_id)||captureIndex.has(key)||typeof row.file!=='string'||path.basename(row.file)!==row.file)
  throw new Error('Invalid or duplicate frozen capture identity');
 captureIndex.set(key,row);capturesPerCase.set(row.case_id,(capturesPerCase.get(row.case_id)||0)+1);
}
const attestationBytes=await fs.readFile(path.join(root,'original-archive-packet-attestation.json'));
if(sha(attestationBytes)!==PACKET_ATTESTATION_SHA256)throw new Error('Original archive packet attestation changed');
const attestation=JSON.parse(attestationBytes),packetIndex=new Map();
for(const row of attestation.packets){
 const id=row.id||row.case_id;if(!expectedCases.has(id))continue;
 if(packetIndex.has(id)||row.path!=='extractor-600/cases/'+id+'/source-packet.json')throw new Error('Invalid archive packet identity');
 packetIndex.set(id,row);
}
if(packetIndex.size!==expectedCases.size||attestation.attestation_created_after_oracle_freeze!==true)
 throw new Error('Incomplete original archive packet attestation');
async function sourceManifest(){
 const rows=[];
 const visit=async(relative)=>{
  const absolute=path.join(sourceRepo,relative),stat=await fs.stat(absolute);
  if(stat.isDirectory()){
   for(const name of (await fs.readdir(absolute)).sort())await visit(path.join(relative,name));
  }else if(stat.isFile()){
   const bytes=await fs.readFile(absolute);rows.push({path:relative.replaceAll('\\','/'),bytes:bytes.length,sha256:sha(bytes)});
  }
 };
 for(const dir of ['src','netlify/functions','supabase/functions/_shared','package.json'])await visit(dir);
 return rows.sort((a,b)=>a.path.localeCompare(b.path));
}
const sourceFiles=await sourceManifest(),sourceFingerprint=sha(JSON.stringify(sourceFiles));
const manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8'));
const selected=new Set(manifest.roasters.flatMap(row=>row.selected_urls)),requestedCases=new Set(caseIds);
const totalSelected=selected.size;
const selectedOwners=new Map(manifest.roasters.flatMap(row=>row.selected_urls.map(url=>[url,row.id])));
if(totalSelected!==oracle.length||oracle.some(row=>selectedOwners.get(row.source_url)!==row.roaster_id))
 throw new Error('Frozen selection and oracle identities differ');
if(requestedCases.size!==caseIds.length)throw new Error('Duplicate requested case ID');
if(caseIds.some(id=>!expectedCases.has(id)))throw new Error('Requested case is not in the frozen oracle');
const {createPreviewHandler}=await import(pathToFileURL(path.join(sourceRepo,'netlify/functions/coffee-url-preview.mjs')));
const normalize=url=>{const u=new URL(url);u.hash='';return u.href;};
const records=[];
for(const folder of [...expectedCases.keys()].sort()){
 if(requestedCases.size&&!requestedCases.has(folder))continue;
 const dir=path.join(root,'cases',folder);
 const packetBytes=await fs.readFile(path.join(dir,'source-packet.json')),packet=JSON.parse(packetBytes),expected=expectedCases.get(folder);
 if(packet.id!==folder||packet.source_url!==expected.source_url||packet.roaster_id!==expected.roaster_id)
  throw new Error('Frozen packet identity mismatch: '+folder);
 const calls=[],fixtureCalls=[];const captureByUrl=new Map();
 const seenFiles=new Set(),seenLabels=new Set(),verifiedBytes=new Map();
 for(const req of packet.requests){
  const original=captureIndex.get(folder+'\0'+req.file);
  if(seenFiles.has(req.file)||seenLabels.has(req.label))throw new Error('Duplicate capture record: '+folder);
  if(!original||req.sha256!==original.sha256||req.bytes!==original.bytes||req.status!==original.status)
   throw new Error('Capture differs from frozen source: '+folder+' '+req.file);
  seenFiles.add(req.file);seenLabels.add(req.label);
  const bytes=await fs.readFile(path.join(dir,original.file));
  if(bytes.length!==original.bytes||sha(bytes)!==original.sha256)throw new Error('Frozen source capture changed: '+folder+' '+original.file);
  verifiedBytes.set(req.file,bytes);
  for(const url of [req.url,req.final_url].filter(Boolean)){
   const normalized=normalize(url),previous=captureByUrl.get(normalized);
   if(previous&&previous!==req)throw new Error('Duplicate capture URL: '+folder);
   captureByUrl.set(normalized,req);
  }
 }
 if(seenFiles.size!==capturesPerCase.get(folder))throw new Error('Missing frozen source capture: '+folder);
 const originalPacket=packetIndex.get(folder);
 if(packetBytes.length!==originalPacket.bytes||sha(packetBytes)!==originalPacket.sha256)
  throw new Error('Original archive packet changed: '+folder);
 const captured=async(url,limit,kind)=>{
  const event={kind,url,limit};calls.push(event);
  const req=captureByUrl.get(normalize(url));
  if(!req?.file||req.status!==200){event.result='uncaptured_or_unavailable';return {ok:false,reason:'source_unavailable'};}
  const bytes=verifiedBytes.get(req.file);
  event.bytes=bytes.length;event.source_hash=req.sha256;
  if(bytes.length>limit){event.result='page_too_large';return {ok:false,reason:'page_too_large',source_url:req.final_url};}
  event.result='ok';
  return {ok:true,[kind==='json'?'json':'html']:bytes.toString('utf8'),source_url:req.final_url};
 };
 const apiFetch=async(url,_options={})=>{
  const method=url.split('/').at(-1);fixtureCalls.push(method);
  const data=method==='user'?{id:'isolated-benchmark-fixture'}:
   method==='dic_session_status'?{admitted:true,emailVerified:true}:
   method==='dic_preview_cached_verified'?null:
   method==='dic_preview_preflight'?{allowed:true,ticket:'00000000-0000-4000-8000-000000000600'}:
   method==='dic_preview_complete'?{charged:true}:null;
  if(data===null&&method!=='dic_preview_cached_verified')throw new Error('Unexpected fixture endpoint '+method);
  return {ok:true,json:async()=>data};
 };
 const handler=createPreviewHandler({apiFetch,
  env:key=>({SUPABASE_URL:'https://isolated-fixture.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_nonfunctional_fixture'}[key]),
  readHtml:url=>captured(url,900000,'html'),readLargeHtml:url=>captured(url,2000000,'large_html'),
  readJson:url=>captured(url,900000,'json')
 });
 const start=performance.now();
 const response=await handler(new Request('https://app.dialincollective.com/api/coffee-preview',{
  method:'POST',headers:{'Content-Type':'application/json',Origin:'https://app.dialincollective.com',Authorization:'Bearer isolated.fixture'},body:JSON.stringify({source_url:packet.source_url})
 }));
 records.push({case_id:packet.id,roaster_id:packet.roaster_id,source_url:packet.source_url,
  elapsed_ms:Math.round((performance.now()-start)*100)/100,status:response.status,output:await response.json(),calls,fixture_calls:fixtureCalls});
 if(records.length%25===0)process.stderr.write(JSON.stringify({completed:records.length,total:requestedCases.size||totalSelected})+'\n');
}
const expectedCount=requestedCases.size||totalSelected;
if(records.length!==expectedCount)throw new Error('Missing selected captures '+records.length+'/'+expectedCount);
if(sha(JSON.stringify(await sourceManifest()))!==sourceFingerprint)
 throw new Error('Application source changed during replay; use an immutable candidate snapshot and rerun.');
for(const file of frozenFiles)if(sha(await fs.readFile(file.location))!==file.sha256)throw new Error('Frozen evidence changed during replay');
if(sha(await fs.readFile(path.join(root,'oracle-freeze.json')))!==sha(freezeBytes))throw new Error('Oracle freeze changed during replay');
await fs.writeFile(output,JSON.stringify({created_at:new Date().toISOString(),type:'cached_source_real_handler_replay',production_network_test:false,
 no_real_api_keys:true,manifest_total:totalSelected,selected_cases_only:requestedCases.size>0,node_version:process.version,source_tree_sha256:sourceFingerprint,source_files:sourceFiles,
 harness_sha256:sha(await fs.readFile(import.meta.filename)),
 oracle_freeze_sha256:sha(freezeBytes),packet_archive_attestation_sha256:sha(attestationBytes),source_archive_sha256:attestation.source_archive_sha256,
 packet_attestation_created_after_oracle_freeze:true,source_repo:sourceRepo,case_count:records.length,records},null,2));
console.log(JSON.stringify({completed:records.length,output}));
