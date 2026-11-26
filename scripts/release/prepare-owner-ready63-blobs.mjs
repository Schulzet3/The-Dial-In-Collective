// Task-scoped metadata preparation ONLY. No ref, request, provider or deploy writes.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
export const PIN=Object.freeze({
 repo:'Schulzet3/The-Dial-In-Collective',
 branch:'work/owner-ready63-metadata-20261126',
 main:'8ef5bdd7eafec1587fc7c8a2a320a443215e96b8',
 development:'593dee41d328112bcc67791a477e3b1500e030c1',
 preflight:'c59d7d5097a2224fcd254d6a4133c2cf01ee3a0f',
 production:'5b256f1fc0717d3635f7148b934a1f91f8991685',
 published:'2d22d448160d428a977f06482323646b92818fcf',
 candidate:'d8639edb2b4ee240afe6cd507086588c2493f2a5',
 candidateBranch:'release-candidates/prospectbatch3889-ea1ae6ddf36867450dba',
 tree:'b4f1b2da764c4bff4a87aa582208487fe6261189',
 manifest:'c262699b420198d93a5f547405f6abdf821402b2',
 queue:'a816976d2c53e88724323d9c90370c7151bd3c84',
 certificate:'ca00fca952b10842a8aa020cb5e29d31fe7ca7a0',
 id:'DIC-20261126-READY63-01'
});
export const OWNER='Owner November 26, 2026 current chat: Run the mandatory DIC preflight and publish all items in the queue; followed by Do what you need to do and get this deployed. Do not duplicate any efforts just fix what you need to. ONE frozen READY63 batch only, excluding all six IN_PROGRESS items, no future publication or unrelated provider/member changes.';
export const RECEIPT='DIC_PREFLIGHT_VERIFIED development_sha='+PIN.development+' preflight_blob_sha='+PIN.preflight;
export function blobSha(text){const b=Buffer.from(text);return createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');}
export function appendGrant(raw,ids,nowIso){
 const old=JSON.parse(raw);assert.equal(old.schema_version,1);assert.ok(Array.isArray(old.grants));
 assert.equal(ids.length,63);assert.equal(new Set(ids).size,63);assert.ok(ids.every(id=>/^DIC-Q-[A-Za-z0-9-]+$/.test(id)));
 assert.ok(!old.grants.some(g=>g.id===PIN.id));assert.ok(Number.isFinite(Date.parse(nowIso)));
 const grant={id:PIN.id,tested_source_sha:PIN.candidate,owner_approved:true,status:'APPROVED',production_branch:'release/production',max_publications:1,
  approved_at_utc:nowIso,expires_at_utc:new Date(Date.parse(nowIso)+86400000).toISOString(),approval_source:OWNER,
  scope:'ONE exact frozen READY63 publication and its verified required SQL/Edge dependencies after recovery checks. Preserve Auth, private/offline data, shots, notes, Community and all excluded unfinished work. Existing single publisher only; no member edits, purchases, upgrades or future releases.',
  owner_private_free_compensating_controls:true,approved_ready_item_ids:ids.slice().sort()};
 const next={...old,grants:[...old.grants,grant]};assert.deepEqual(next.grants.slice(0,-1),old.grants);
 return {grant,text:JSON.stringify(next,null,2)+'\n'};
}
export function appendJournal(old){
 assert.equal(typeof old,'string');assert.ok(old.length>0);
 return old+'\n## '+PIN.id+' controller request [skip netlify]\n'+RECEIPT+'\n- Release ID: '+PIN.id+'\n- Tested source: '+PIN.candidate+'\n- Mode: publish\n- Owner scope: '+OWNER+'\n- Reuse the frozen READY63 candidate and five exact native CI receipts; no candidate rebuild. Required recovery, provider dependencies and exact live refs are independently verified before this proposed appendix is committed. This metadata preparation alone activates no grant, request or release and is NOT DEPLOYED evidence.\n';
}
export function assertApiOperation(method,path){
 const read=/^(git\/ref\/heads\/[A-Za-z0-9_./-]+|git\/blobs\/[a-f0-9]{40}|actions\/runs\/\d+(\/jobs\?per_page=100)?)$/;
 assert.ok((method==='GET'&&read.test(path))||(method==='POST'&&path==='git/blobs'),'Only metadata GET and unreachable blob creation allowed');
}
export async function main(){
 assert.equal(process.argv[2],'--prepare');assert.equal(process.env.GITHUB_ACTIONS,'true');
 assert.equal(process.env.GITHUB_EVENT_NAME,'push');assert.equal(process.env.GITHUB_REF,'refs/heads/'+PIN.branch);
 assert.equal(process.env.GITHUB_REPOSITORY,PIN.repo);assert.ok(process.env.GITHUB_TOKEN);
 const git=(...args)=>execFileSync('git',args,{encoding:'utf8',timeout:60000,maxBuffer:16000000});
 const show=(ref,path)=>git('show',ref+':'+path);const object=(ref,path)=>git('rev-parse',ref+':'+path).trim();
 const api=async(method,path,body)=>{
  assertApiOperation(method,path);
  const r=await fetch('https://api.github.com/repos/'+PIN.repo+'/'+path,{method,headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',Authorization:'Bearer '+process.env.GITHUB_TOKEN,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
  if(!r.ok)throw Error('GitHub metadata HTTP '+r.status+' at '+path);return r.json();
 };
 const refs=async()=>{for(const [name,sha] of [['main',PIN.main],['development/backend-foundation',PIN.development],['release/production',PIN.production],[PIN.candidateBranch,PIN.candidate]])assert.equal((await api('GET','git/ref/heads/'+name)).object.sha,sha,'Ref drift '+name);};
 await refs();
 for(const [ref,path,sha] of [[PIN.development,'docs/ai/PREFLIGHT.md',PIN.preflight],[PIN.development,'docs/RELEASE_QUEUE.json',PIN.queue],[PIN.candidate,'docs/RELEASE_QUEUE.json',PIN.queue],[PIN.development,'docs/READY_BATCH_CERTIFICATION.json',PIN.certificate],[PIN.candidate,'docs/RELEASE_CANDIDATE.json',PIN.manifest]])assert.equal(object(ref,path),sha,path);
 assert.equal(git('rev-parse',PIN.candidate+'^{tree}').trim(),PIN.tree);
 const queue=JSON.parse(show(PIN.candidate,'docs/RELEASE_QUEUE.json'));const ready=queue.items.filter(x=>x.state==='READY');assert.equal(ready.length,63);
 const certificate=JSON.parse(show(PIN.development,'docs/READY_BATCH_CERTIFICATION.json'));
 const {certifiedFrozenCandidateRuns}=await import('./ready-evidence-gate.mjs');
 assert.deepEqual(certifiedFrozenCandidateRuns({queue,certificate,candidateSha:PIN.candidate,candidateBranch:PIN.candidateBranch}),certificate.run_ids);
 const runs=[[45733854744,['approval']],[45733854753,['validate']],[45733854697,['cloud-tests','mobile-browser-qa']],[45733854801,['sql']],[45734361908,['precertify-source']]];
 const checked=[];
 for(const [id,names] of runs){
  const r=await api('GET','actions/runs/'+id);assert.equal(r.head_sha,id===45734361908?PIN.main:PIN.candidate);assert.equal(r.event,'push');assert.equal(r.status,'completed');assert.equal(r.conclusion,'success');
  const j=await api('GET','actions/runs/'+id+'/jobs?per_page=100');assert.ok(j.total_count<=100&&j.jobs.length===j.total_count);
  for(const name of names){const job=j.jobs.find(x=>x.name===name);assert.ok(job);assert.equal(job.status,'completed');assert.equal(job.conclusion,'success');checked.push({run:id,job:job.id,name,head_sha:r.head_sha,conclusion:job.conclusion,steps:job.steps.map(s=>({name:s.name,conclusion:s.conclusion}))});}
 }
 const ledger=JSON.parse(show(PIN.production,'docs/RELEASE_CONSUMPTION.json'));assert.equal(ledger.consumed.at(-1).tested_source_sha,PIN.published);
 assert.ok(!ledger.consumed.some(x=>x.id===PIN.id||x.tested_source_sha===PIN.candidate));
 const now=new Date().toISOString();const grantRaw=show(PIN.development,'docs/RELEASE_AUTHORIZATIONS.json');
 const generated=appendGrant(grantRaw,ready.map(x=>x.id),now);
 const {validateReleaseGrant}=await import('./one-use-claim.mjs');validateReleaseGrant(generated.grant,{releaseId:PIN.id,sourceSha:PIN.candidate,nowIso:now});
 const {assertApprovedReadyBatch}=await import('./release-queue.mjs');assertApprovedReadyBatch(generated.grant,{ready:true,ready_items:ready});
 const journalPath='docs/OPS_RELEASE_CONTROLLER_WORK_JOURNAL_2026-10-21.md';const oldJournal=show(PIN.main,journalPath);const newJournal=appendJournal(oldJournal);
 assert.ok(newJournal.startsWith(oldJournal));
 const {classifyMigrationDiff}=await import('./migration-risk.mjs');
 const migrationRisk=classifyMigrationDiff(git('diff','--name-status',PIN.production,PIN.candidate,'--','supabase/migrations'),p=>show(PIN.candidate,p));
 const out='qa_artifacts/owner-ready63';const inventory=[];
 const put=(path,text)=>{assert.ok(!path.split('/').some(x=>x==='..'||x===''));const full=out+'/'+path;mkdirSync(dirname(full),{recursive:true});writeFileSync(full,text);inventory.push({path,bytes:Buffer.byteLength(text),git_blob:blobSha(text),sha256:createHash('sha256').update(text).digest('hex')});};
 const docs=['AGENTS.md','docs/ai/PREFLIGHT.md','docs/MASTER_SPECIFICATION.md','docs/DECISION_LEDGER.json','docs/APPROVAL_COVERAGE_MATRIX.json','docs/CURRENT_STATUS.md','docs/RELEASE_QUEUE.json','docs/READY_BATCH_CERTIFICATION.json','docs/RELEASE_AUTHORIZATIONS.json'];
 for(const p of docs)put('development/'+p,show(PIN.development,p));
 put('main/'+journalPath,oldJournal);put('main/docs/RELEASE_REQUEST.json',show(PIN.main,'docs/RELEASE_REQUEST.json'));
 for(const p of ['docs/ACTIVE_WORK_2026-10-20_APPROVAL_TO_RELEASE_INTEGRITY.md','docs/ACTIVE_WORK_2026-10-21_OPS_AUTOMATION.md'])if(git('ls-tree',PIN.main,'--',p).trim())put('main/'+p,show(PIN.main,p));
 put('candidate/docs/RELEASE_CANDIDATE.json',show(PIN.candidate,'docs/RELEASE_CANDIDATE.json'));
 const changed=git('diff','--name-only','--no-renames',PIN.published,PIN.candidate).trim().split('\n').filter(Boolean);
 const sourcePaths=new Set([...ready.flatMap(x=>x.scope_paths),...changed.filter(p=>/^(supabase\/|netlify\/|scripts\/release\/)/.test(p))]);
 for(const p of [...sourcePaths].sort()){
  assert.ok(/^(site\/|supabase\/|netlify\/|scripts\/|tests\/|\.github\/)/.test(p));
  const ls=git('ls-tree',PIN.candidate,'--',p);if(!ls.trim())continue;assert.match(ls,/^100(?:644|755) blob /);
  put('candidate/'+p,show(PIN.candidate,p));
 }
 put('proposed/RELEASE_AUTHORIZATIONS.json',generated.text);put('proposed/OPS_JOURNAL.md',newJournal);
 await refs();
 const store=async text=>{const expected=blobSha(text);const result=await api('POST','git/blobs',{content:Buffer.from(text).toString('base64'),encoding:'base64'});assert.equal(result.sha,expected);const actual=await api('GET','git/blobs/'+expected);assert.equal(actual.encoding,'base64');assert.equal(Buffer.from(actual.content,'base64').toString('utf8'),text);return expected;};
 const grantBlob=await store(generated.text),journalBlob=await store(newJournal);await refs();
 const receipt={status:'UNREACHABLE_METADATA_BLOBS_ONLY_NO_REF_OR_PROVIDER_WRITE',pins:PIN,created_at_utc:now,owner_approval_source:OWNER,ready_ids:ready.map(x=>x.id).sort(),checked,changed_paths:changed,migration_risk:migrationRisk,grant_blob:grantBlob,grant_previous_blob:blobSha(grantRaw),journal_blob:journalBlob,journal_previous_blob:blobSha(oldJournal),inventory};
 put('receipt.json',JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify({status:receipt.status,grant_blob:grantBlob,journal_blob:journalBlob,migration_risk:migrationRisk,ready_count:63}));
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)main().catch(e=>{console.error('READY63 metadata HOLD: '+e.message);process.exitCode=1;});
