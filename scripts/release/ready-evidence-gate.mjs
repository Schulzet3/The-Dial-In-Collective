// Live, read-only READY gate. Reuses recorded GitHub CI; never runs a build,
// stages a candidate, grants publication or changes release/provider data.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {assessReadyEvidence,preflightReadyBatch,PRODUCTION_CHECKS} from './release-reliability.mjs';
import {deployableChangedPaths,queueSchemaErrors} from './release-queue.mjs';
const SHA=/^[a-f0-9]{40}$/;
const REPO='Schulzet3/The-Dial-In-Collective';
const RUN_URL=/^https:\/\/github\.com\/Schulzet3\/The-Dial-In-Collective\/actions\/runs\/([1-9][0-9]*)\/job\/([1-9][0-9]*)$/;
const sorted=xs=>[...new Set(xs)].sort();
// A frozen READY certificate is source identity, not a waiver of any test.
// Verify its exact queue selection before using its immutable candidate push CI.
const canonical=value=>Array.isArray(value)?'['+value.map(canonical).join(',')+']':
 value&&typeof value==='object'?'{'+Object.keys(value).sort().map(k=>
 JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}':JSON.stringify(value);
export function certifiedFrozenCandidateRuns({queue,certificate,candidateSha,candidateBranch}={}){
 const selected=queue?.items?.filter(x=>x.state==='READY').sort((a,b)=>a.id.localeCompare(b.id))||[];
 if(queueSchemaErrors(queue).length||!selected.length||
    !SHA.test(candidateSha||'')||
    !/^release-candidates\/[a-z0-9][a-z0-9-]{2,80}$/.test(candidateBranch||'')||
    certificate?.schema_version!==1||certificate?.kind!=='DIC-PREVALIDATED-READY-BATCH-1'||
    certificate.candidate_sha!==candidateSha||certificate.candidate_branch!==candidateBranch||
    !Array.isArray(certificate.run_ids)||certificate.run_ids.length<1||certificate.run_ids.length>5||
    new Set(certificate.run_ids).size!==certificate.run_ids.length||
    certificate.run_ids.some(id=>!Number.isSafeInteger(id)||id<=0))
  throw Error('Incomplete or stale frozen READY candidate source-bound certificate');
 const selectionHash=createHash('sha256').update(canonical({
  published_base:queue.published_base,selected_ready_records:selected
 })).digest('hex');
 if(certificate.ready_selection_sha256!==selectionHash)
  throw Error('Frozen READY certificate selection or published baseline changed');
 return [...certificate.run_ids];
}
export function checkRunReceiptId(url){
 const m=typeof url==='string'?RUN_URL.exec(url):null;
 return m?Number(m[1]):null;
}
export function exactRecordedChecks(checkRuns,sourceSha,recordedRunIds){
 if(!SHA.test(sourceSha||'')||!Array.isArray(checkRuns))
  throw Error('Exact GitHub source/check readback unavailable');
 const ids=new Set(recordedRunIds);
 const byName=new Map();
 for(const check of checkRuns){
  if(check?.head_sha!==sourceSha||check?.app?.slug!=='github-actions'||
     !Number.isSafeInteger(check?.id)||check.id<=0)continue;
  const prior=byName.get(check.name);
  // A newer pending, skipped or failed job supersedes a recorded older PASS.
  if(!prior||check.id>prior.id)byName.set(check.name,check);
 }
 return PRODUCTION_CHECKS.map(name=>{
  const check=byName.get(name),receipt=checkRunReceiptId(check?.details_url);
  const sourced=ids.has(receipt);
  return {name,sha:sourceSha,status:check?.status||'missing',
   conclusion:sourced?check?.conclusion||null:null,
   recorded_run_id:receipt,recorded:sourced};
 });
}

/** Source-bound proof of ordered co-selected READY changes to one frozen file. */
export function reviewedSelectedReadyOverlaps(items,{
 candidateSha,candidateChangedPaths,sourceObjectAt,mergeChangedPaths,isAncestor
}={}){
 if(!Array.isArray(items)||!SHA.test(candidateSha||'')||!Array.isArray(candidateChangedPaths)||
    typeof sourceObjectAt!=='function'||typeof mergeChangedPaths!=='function')
  throw Error('Selected READY overlap source evidence unavailable');
 const changed=new Set(deployableChangedPaths(candidateChangedPaths)),owners=new Map();
 for(const item of items){
  if(item?.state!=='READY'||!SHA.test(item?.merged_source_sha||''))
   throw Error('Uncertified selected READY overlap owner');
  for(const path of item.scope_paths||[]){
   if(!changed.has(path))continue;
   if(!owners.has(path))owners.set(path,[]);
   owners.get(path).push(item);
  }
 }
 const reviewed=[];
 for(const [path,listed] of owners){
  if(listed.length<2)continue;
  if(typeof isAncestor!=='function')throw Error('Same-file READY ancestry unavailable: '+path);
  for(const item of listed){
   const files=mergeChangedPaths(item.merged_source_sha);
   if(!Array.isArray(files)||!files.includes(path)||
      !sourceObjectAt(item.merged_source_sha,path))
    throw Error('Same-file READY owner lacks first-parent source proof: '+path);
  }
  const tips=listed.filter(tip=>listed.every(owner=>
   owner===tip||isAncestor(owner.merged_source_sha,tip.merged_source_sha)===true));
  if(tips.length!==1)throw Error('Same-file READY owners lack one ordered Git tip: '+path);
  const candidate=sourceObjectAt(candidateSha,path);
  if(!candidate||candidate!==sourceObjectAt(tips[0].merged_source_sha,path))
   throw Error('Frozen candidate differs from last selected READY source: '+path);
  reviewed.push(path);
 }
 return reviewed.sort();
}

export async function verifyReadyItems({queue,items,loadRun,loadChecks,sourceObjectAt,
 mergeChangedPaths,currentSourceSha,publishedSourceSha,candidateSha,candidateChangedPaths,
 allowedPinnedPaths=[],isAncestor,frozenCandidateRunIds=[],frozenCandidateBranch}={}){
 const errors=queueSchemaErrors(queue),verified=[],checksByItem={},ciSourceByItem={},testPathsByItem={};
 if(!Array.isArray(items)||typeof loadRun!=='function'||typeof loadChecks!=='function'||
  typeof sourceObjectAt!=='function'||typeof mergeChangedPaths!=='function')
  return {ready:false,errors:[...errors,'READY gate requires GitHub CI and exact Git object readers'],verified};
 const runCache=new Map(),checkCache=new Map();
 const run=async id=>{
  if(!runCache.has(id))runCache.set(id,await loadRun(id));
  return runCache.get(id);
 };
 const checks=async sha=>{
  if(!checkCache.has(sha))checkCache.set(sha,await loadChecks(sha));
  return checkCache.get(sha);
 };
 for(const item of items){
  const prefix=String(item?.id||'<invalid>')+': ';
  try{
   if(item?.state!=='READY'||!SHA.test(item.merged_source_sha||'')||
      !Array.isArray(item.ci_runs)||!item.ci_runs.length||
      item.ci_runs.some(id=>!Number.isSafeInteger(id)||id<=0))
    throw Error('not a source-certified READY item');
   const changed=mergeChangedPaths(item.merged_source_sha);
   if(!Array.isArray(changed))throw Error('merged first-parent Git diff unavailable');
   const actualPaths=deployableChangedPaths(changed);
   // Every source and test changed by the merge is bound to the tested HEAD,
   // not just the filenames appearing in natural-language queue notes.
   const provenancePaths=sorted(changed.filter(p=>/^(tests\/|site\/|src\/server\/|netlify\/|supabase\/|scripts\/|\.github\/)/.test(p)||
     /^(build_cloud\.mjs|netlify\.toml|package(?:-lock)?\.json)$/.test(p)));
   const runs=await Promise.all(item.ci_runs.map(async id=>{
    const x=await run(id);
    if(x?.id!==id||!SHA.test(x.head_sha||'')||x.status!=='completed'||
       x.conclusion!=='success'||!['push','pull_request'].includes(x.event))
     throw Error('cited GitHub Actions run '+id+' is missing, failed, skipped or not source-bound');
    return x;
   }));
   // Frozen candidates are tested against their own exact five SUCCESS checks,
   // not against prior PR heads containing independently unready same-file code.
   // Preserve and verify every original cited item run as well.
   if(!Array.isArray(frozenCandidateRunIds))throw Error('Malformed frozen candidate receipt');
   let sources=sorted(runs.map(x=>x.head_sha)),receiptIds=item.ci_runs;
   if(frozenCandidateRunIds.length){
    if(!SHA.test(candidateSha||'')||
       !/^release-candidates\/[a-z0-9][a-z0-9-]{2,80}$/.test(frozenCandidateBranch||'')||
       frozenCandidateRunIds.length>5||
       new Set(frozenCandidateRunIds).size!==frozenCandidateRunIds.length||
       frozenCandidateRunIds.some(id=>!Number.isSafeInteger(id)||id<=0))
      throw Error('Invalid certified candidate CI receipt identity');
    const frozenRuns=await Promise.all(frozenCandidateRunIds.map(async id=>{
     const result=await run(id);
     if(result?.id!==id||result.head_sha!==candidateSha||
        result.head_branch!==frozenCandidateBranch||result.event!=='push'||
        result.status!=='completed'||result.conclusion!=='success')
      throw Error('Frozen candidate CI run is missing, stale, failed or not an exact push: '+id);
     return result;
    }));
    if(frozenRuns.length!==frozenCandidateRunIds.length)
     throw Error('Incomplete frozen candidate CI run list');
    sources=[candidateSha]; // No fallback to a stale legacy PR head.
    receiptIds=frozenCandidateRunIds;
   }else sources.sort((a,b)=>a===item.merged_source_sha?-1:b===item.merged_source_sha?1:0);
   let chosen=null,failures=[];
   for(const sha of sources){
    const recorded=exactRecordedChecks(await checks(sha),sha,receiptIds);
    const audit=assessReadyEvidence(item,{mergedSha:item.merged_source_sha,
      ciSourceSha:sha,checks:recorded,changedPaths:actualPaths,
      sourceObjectAt,testPaths:provenancePaths});
    if(audit.ready){chosen={sha,recorded,risk:audit.risk};break;}
    failures=audit.failures;
   }
   if(!chosen)throw Error('no single cited, successful five-check source with identical merged code/tests: '+failures.join('; '));
   // A later, separately unready change may legitimately share a READY file.
   // Preserve the frozen item's exact tested evidence, but report source drift;
   // only an owner-frozen candidate can isolate the selected merged blob.
   const sourceDriftPaths=[];
   if(currentSourceSha){
    if(!SHA.test(currentSourceSha))throw Error('current development SHA not verified');
    for(const path of item.scope_paths||[]){
     const mergedBlob=sourceObjectAt(item.merged_source_sha,path);
     if(!mergedBlob)throw Error('READY merge missing scoped source: '+path);
     if(sourceObjectAt(currentSourceSha,path)!==mergedBlob)sourceDriftPaths.push(path);
    }
   }
   checksByItem[item.id]=chosen.recorded;
   ciSourceByItem[item.id]=chosen.sha;
   testPathsByItem[item.id]=provenancePaths;
   verified.push({id:item.id,merged_sha:item.merged_source_sha,
    ci_source_sha:chosen.sha,risk_tier:chosen.risk.tier,checks:PRODUCTION_CHECKS,
    source_drift_paths:sourceDriftPaths});
  }catch(e){errors.push(prefix+String(e.message||e));}
 }
 if(candidateChangedPaths!==undefined&&errors.length===0){
  // Verify co-owned chronology only when every selected READY item has complete
  // exact recorded CI proof. A failed API read HOLDS without fake overlap errors.
  let coOwned=[];
  try{
   coOwned=reviewedSelectedReadyOverlaps(items,{
    candidateSha,candidateChangedPaths,sourceObjectAt,mergeChangedPaths,isAncestor
   });
  }catch(e){errors.push(String(e.message||e));}
  if(errors.length===0){
   const batch=preflightReadyBatch(queue,items,{publishedSourceSha,candidateSha,
    changedPaths:candidateChangedPaths,checksByItem,ciSourceByItem,sourceObjectAt,
    testPathsByItem,allowedPinnedPaths:[...new Set([...allowedPinnedPaths,...coOwned])]});
   errors.push(...batch.errors);
  }
 }
 return {ready:errors.length===0,errors,verified};
}
export async function githubReleaseReaders(token,{request=globalThis.fetch}={}){
 if(typeof token!=='string'||!token)throw Error('Read-only GitHub CI token unavailable');
 const get=async path=>{
  const endpoint=path.split('?')[0];
  // Retry only transient GitHub metadata reads. Never retry writes/tests;
  // every missing, stale, skipped or unrecorded status remains a HARD HOLD.
  for(let attempt=0;attempt<3;attempt++){
   let response;
   try{
    response=await request('https://api.github.com/repos/'+REPO+path,{
     headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
      'X-GitHub-Api-Version':'2022-11-28'},signal:AbortSignal.timeout(18000)});
   }catch(e){
    if(attempt<2&&['TypeError','AbortError','TimeoutError'].includes(e?.name))continue;
    throw Error('Read-only GitHub CI '+endpoint+' transport unavailable after '+
     (attempt+1)+' attempt(s): '+String(e?.message||e).slice(0,120));
   }
   if(!response?.ok){
    if(attempt<2&&[429,500,502,503,504].includes(response?.status))continue;
    throw Error('Read-only GitHub CI '+endpoint+' HTTP '+String(response?.status));
   }
   try{return await response.json();}
   catch{
    if(attempt<2)continue;
    throw Error('Read-only GitHub CI '+endpoint+' unreadable JSON after 3 attempts');
   }
  }
  throw Error('Read-only GitHub CI '+endpoint+' could not be read');
 };
 return {
  loadRun:async id=>get('/actions/runs/'+id),
  loadChecks:async sha=>{
   const j=await get('/commits/'+sha+'/check-runs?per_page=100');
   if(!Array.isArray(j.check_runs)||j.total_count>100)
    throw Error('GitHub check readback incomplete or unpaginated');
   return j.check_runs;
  }
 };
}
export function localReadyGitReaders({run=execFileSync}={}){
 const git=args=>run('git',args,{encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024}).trim();
 const sourceObjectAt=(sha,path)=>{
  if(!/^[a-f0-9]{40}(?:\^)?$/.test(sha||'')||
     !/^[A-Za-z0-9_.\/-]+$/.test(path||'')||path.includes('..'))
   throw Error('Unsafe exact Git object lookup');
  const result=run('git',['ls-tree','-z',sha,'--',path],
   {encoding:'utf8',timeout:30000,maxBuffer:4096}).split('\0').filter(Boolean);
  if(!result.length)return null;
  if(result.length!==1)throw Error('Ambiguous exact Git tree lookup');
  const match=/^([0-7]{6}) blob ([a-f0-9]{40})\t(.+)$/.exec(result[0]);
  if(!match||match[3]!==path)throw Error('Invalid Git path/blob receipt');
  return match[1]+':'+match[2];
 };
 return {sourceObjectAt,
  mergeChangedPaths:sha=>git(['diff','--name-only','--no-renames',sha+'^',sha])
   .split(/\r?\n/).filter(Boolean),
  currentSourceSha:()=>git(['rev-parse','HEAD'])};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 (async()=>{
  if(process.argv.length!==2)throw Error('Usage: ready-evidence-gate.mjs');
  // A frozen READY-only candidate deliberately excludes other READY items.
  // Its publisher independently checks the selected bundle against real source.
  if((process.env.GITHUB_REF||'').startsWith('refs/heads/release-candidates/')){
   console.log('[READY evidence] NOT_APPLICABLE on source-isolated candidate; controller owns selected batch');return;
  }
  const queue=JSON.parse(readFileSync(new URL('../../docs/RELEASE_QUEUE.json',import.meta.url),'utf8'));
  const items=(queue.items||[]).filter(x=>x.state==='READY');
  const readers=await githubReleaseReaders(process.env.GITHUB_TOKEN);
  const git=localReadyGitReaders();
  const report=await verifyReadyItems({queue,items,...readers,...git,
   currentSourceSha:git.currentSourceSha()});
  if(!report.ready)throw Error(report.errors.join(' | ').slice(0,4000));
  const drifted=report.verified.filter(x=>x.source_drift_paths.length);
  console.log('[READY evidence] VERIFIED '+report.verified.length+
   ' source-certified queue items; '+drifted.length+
   ' share newer development drift and REQUIRE owner-frozen candidate isolation. No build or staging.');
 })().catch(e=>{console.error('[READY evidence] HOLD: '+String(e.message));process.exitCode=2;});
}
