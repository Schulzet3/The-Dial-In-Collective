// #3347: A READY label requires a previously frozen, CI-passed combined source.
// Read-only and fail-closed. No candidate staging, production grant or provider write.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {exactRecordedChecks,githubReleaseReaders} from './ready-evidence-gate.mjs';
import {PRODUCTION_CHECKS} from './release-reliability.mjs';
import {queueSchemaErrors} from './release-queue.mjs';

const REPO='Schulzet3/The-Dial-In-Collective';
const SHA=/^[a-f0-9]{40}$/;
const BRANCH=/^release-candidates\/[a-z0-9][a-z0-9-]{2,80}$/;
export const READY_CERT_KIND='DIC-PREVALIDATED-READY-BATCH-1';
const sorted=a=>[...a].sort();

function canonical(value){
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.keys(value).sort()
  .map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';
 return JSON.stringify(value);
}
export function readySelectionFingerprint(queue){
 if(queueSchemaErrors(queue).length)throw Error('Invalid READY queue schema');
 const selected=queue.items.filter(x=>x.state==='READY').sort((a,b)=>a.id.localeCompare(b.id));
 return createHash('sha256').update(canonical({
  published_base:queue.published_base,selected_ready_records:selected
 })).digest('hex');
}
export async function verifyReadyPromotion({queue,certificate,developmentSha,
 loadCandidateRef,loadCommit,loadCandidateFile,loadRun,loadChecks,isAncestor}={}){
 const fail=message=>({ready:false,status:'HOLD',errors:[String(message)]});
 const errors=queueSchemaErrors(queue);
 if(errors.length)return fail('Invalid queue: '+errors.slice(0,4).join('; '));
 const selected=queue.items.filter(x=>x.state==='READY').sort((a,b)=>a.id.localeCompare(b.id));
 if(!selected.length)return {ready:true,status:'NO_READY_ITEMS',count:0,errors:[]};
 try{
  if(!certificate||certificate.schema_version!==1||certificate.kind!==READY_CERT_KIND||
     !BRANCH.test(certificate.candidate_branch||'')||
     !SHA.test(certificate.candidate_sha||'')||
     !/^[a-f0-9]{64}$/.test(certificate.ready_selection_sha256||'')||
     !Array.isArray(certificate.run_ids)||certificate.run_ids.length<1||
     certificate.run_ids.length>5||new Set(certificate.run_ids).size!==certificate.run_ids.length||
     certificate.run_ids.some(id=>!Number.isSafeInteger(id)||id<=0)||
     typeof loadCandidateRef!=='function'||typeof loadCommit!=='function'||
     typeof loadCandidateFile!=='function'||typeof loadRun!=='function'||
     typeof loadChecks!=='function'||typeof isAncestor!=='function'||
     !SHA.test(developmentSha||''))
   throw Error('Missing complete, source-bound frozen READY batch certificate');
  const fingerprint=readySelectionFingerprint(queue);
  if(certificate.ready_selection_sha256!==fingerprint)
   throw Error('READY selection or published base changed since certification');
  const expectedIds=selected.map(x=>x.id);
  const ref=await loadCandidateRef(certificate.candidate_branch);
  if(ref?.ref!=='refs/heads/'+certificate.candidate_branch||
     ref?.object?.sha!==certificate.candidate_sha)
   throw Error('Frozen candidate Git ref is absent or moved');
  const commit=await loadCommit(certificate.candidate_sha);
  const manifest=await loadCandidateFile(certificate.candidate_sha,'docs/RELEASE_CANDIDATE.json');
  const frozenQueue=await loadCandidateFile(certificate.candidate_sha,'docs/RELEASE_QUEUE.json');
  if(!manifest||manifest.schema_version!==1||manifest.kind!=='DIC-READY-ONLY-SOURCE-1'||
     manifest.candidate_branch!==certificate.candidate_branch||
     manifest.published_source_sha!==queue.published_base.tested_source_sha||
     manifest.publication_authorized!==false||
     !SHA.test(manifest.development_source_sha||'')||
     !Array.isArray(commit?.parents)||commit.parents.length!==1||
     commit.parents[0].sha!==manifest.development_source_sha)
   throw Error('Frozen candidate manifest, published base or one-parent Git provenance mismatch');
  if(isAncestor(manifest.development_source_sha,developmentSha)!==true)
   throw Error('Certified source is not an ancestor of the current queue commit');
  if(!Array.isArray(manifest.selected_ready_item_ids)||
     canonical(sorted(manifest.selected_ready_item_ids))!==canonical(expectedIds))
   throw Error('Certified candidate READY item IDs differ from current queue');
  if(readySelectionFingerprint(frozenQueue)!==fingerprint)
   throw Error('Frozen candidate READY records or published base differ from current queue');
  if(!Array.isArray(manifest.risk_classification?.checks)||
     canonical(sorted(manifest.risk_classification.checks))!==canonical(sorted(PRODUCTION_CHECKS))||
     manifest.risk_classification.builds!==1)
   throw Error('Frozen candidate omitted required five checks or single-build contract');
  const runs=await Promise.all(certificate.run_ids.map(id=>loadRun(id)));
  for(let i=0;i<runs.length;i++){
   const run=runs[i],id=certificate.run_ids[i];
   if(run?.id!==id||run.head_sha!==certificate.candidate_sha||
      run.head_branch!==certificate.candidate_branch||run.event!=='push'||
      run.status!=='completed'||run.conclusion!=='success')
    throw Error('Certified GitHub Actions run '+id+' is not a successful exact-candidate push');
  }
  const checks=exactRecordedChecks(await loadChecks(certificate.candidate_sha),
   certificate.candidate_sha,certificate.run_ids);
  if(checks.length!==PRODUCTION_CHECKS.length||checks.some(check=>
     check.status!=='completed'||check.conclusion!=='success'||check.recorded!==true))
   throw Error('One or more of the five exact-candidate CI jobs are missing, stale, failed or skipped');
  const used=sorted(new Set(checks.map(check=>check.recorded_run_id)));
  if(canonical(used)!==canonical(sorted(certificate.run_ids)))
   throw Error('Certificate includes a GitHub run not used by five successful CI jobs');
  return {ready:true,status:'BATCH_RELEASE_READY',candidate_sha:certificate.candidate_sha,
   count:selected.length,checks:PRODUCTION_CHECKS,errors:[]};
 }catch(e){return fail(e?.message||e);}
}
export function githubReadyPromotionReaders(token,{request=globalThis.fetch}={}){
 if(!token)throw Error('Read-only GitHub token required for READY certification');
 const get=async path=>{
  for(let attempt=0;attempt<3;attempt++){
   let response;
   try{
    response=await request('https://api.github.com/repos/'+REPO+path,{
     headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
      'X-GitHub-Api-Version':'2022-11-28'},signal:AbortSignal.timeout(18000)});
   }catch(e){
    if(attempt<2&&['TypeError','AbortError','TimeoutError'].includes(e?.name))continue;
    throw Error('GitHub READY certification read failed: '+String(e?.message||e).slice(0,120));
   }
   if(!response?.ok){
    if(attempt<2&&[429,500,502,503,504].includes(response.status))continue;
    throw Error('GitHub READY certification read HTTP '+response?.status);
   }
   try{return await response.json();}
   catch{if(attempt===2)throw Error('Invalid GitHub READY read JSON');}
  }
  throw Error('READY certification GitHub read exhausted');
 };
 const loadCandidateFile=async(sha,path)=>{
  if(!SHA.test(sha)||!['docs/RELEASE_QUEUE.json','docs/RELEASE_CANDIDATE.json'].includes(path))
   throw Error('Unsafe candidate Git blob lookup');
  const meta=await get('/contents/'+path+'?ref='+sha);
  if(!SHA.test(meta?.sha||''))throw Error('Candidate file Git blob unavailable');
  // The queue is >1 MB: Contents API metadata has encoding=none.
  // Git Blobs API returns the complete immutable object, never a truncated file.
  const blob=await get('/git/blobs/'+meta.sha);
  if(blob?.sha!==meta.sha||blob.encoding!=='base64'||typeof blob.content!=='string')
   throw Error('Candidate blob content or SHA missing');
  const bytes=Buffer.from(blob.content.replace(/\s/g,''),'base64');
  const digest=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  if(digest!==meta.sha||bytes.length!==blob.size)
   throw Error('Candidate file bytes differ from immutable Git blob');
  return JSON.parse(bytes.toString('utf8'));
 };
 return {
  loadCandidateRef:branch=>get('/git/ref/heads/'+branch),
  loadCommit:sha=>get('/git/commits/'+sha),
  loadCandidateFile
 };
}
export function gitReadyAncestry({run=execFileSync}={}){
 return (source,target)=>{
  if(!SHA.test(source||'')||!SHA.test(target||''))throw Error('Unverified Git ancestry SHA');
  try{run('git',['merge-base','--is-ancestor',source,target],
   {stdio:'ignore',timeout:30000});return true;}
  catch(e){if(e.status===1)return false;throw Error('Git ancestry unavailable');}
 };
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 (async()=>{
  if(process.argv.length!==2)throw Error('Usage: ready-promotion-gate.mjs');
  if((process.env.GITHUB_REF||'').startsWith('refs/heads/release-candidates/')){
   console.log('[READY promotion] NOT_APPLICABLE to frozen candidate');return;
  }
  const queue=JSON.parse(readFileSync(new URL('../../docs/RELEASE_QUEUE.json',import.meta.url),'utf8'));
  if(!queue.items?.some(x=>x.state==='READY')){
   if(queueSchemaErrors(queue).length)throw Error('Invalid READY queue');
   console.log('[READY promotion] NO_READY_ITEMS; certification is not applicable');return;
  }
  const certificate=JSON.parse(readFileSync(
   new URL('../../docs/READY_BATCH_CERTIFICATION.json',import.meta.url),'utf8'));
  const readers=githubReadyPromotionReaders(process.env.GITHUB_TOKEN);
  const runReaders=await githubReleaseReaders(process.env.GITHUB_TOKEN);
  const developmentSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const result=await verifyReadyPromotion({queue,certificate,developmentSha,
   ...readers,...runReaders,isAncestor:gitReadyAncestry()});
  if(!result.ready)throw Error(result.errors.join(' | '));
  console.log('[READY promotion] BATCH_RELEASE_READY '+result.count+
   ' exact READY IDs, candidate '+result.candidate_sha+', five named SUCCESS jobs');
 })().catch(e=>{console.error('[READY promotion] HOLD: '+String(e.message));process.exitCode=2;});
}
