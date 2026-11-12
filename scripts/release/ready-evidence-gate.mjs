// Live, read-only READY gate. Reuses recorded GitHub CI; never runs a build,
// stages a candidate, grants publication or changes release/provider data.
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {assessReadyEvidence,preflightReadyBatch,PRODUCTION_CHECKS} from './release-reliability.mjs';
import {deployableChangedPaths,queueSchemaErrors} from './release-queue.mjs';
const SHA=/^[a-f0-9]{40}$/;
const REPO='Schulzet3/The-Dial-In-Collective';
const RUN_URL=/^https:\/\/github\.com\/Schulzet3\/The-Dial-In-Collective\/actions\/runs\/([1-9][0-9]*)\/job\/([1-9][0-9]*)$/;
const sorted=xs=>[...new Set(xs)].sort();
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
export async function verifyReadyItems({queue,items,loadRun,loadChecks,sourceObjectAt,
 mergeChangedPaths,currentSourceSha,publishedSourceSha,candidateSha,candidateChangedPaths,
 allowedPinnedPaths=[]}={}){
 const errors=queueSchemaErrors(queue),verified=[],checksByItem={},ciSourceByItem={};
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
   const testPaths=sorted(changed.filter(p=>typeof p==='string'&&p.startsWith('tests/')));
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
   const sources=sorted(runs.map(x=>x.head_sha));
   sources.sort((a,b)=>a===item.merged_source_sha?-1:b===item.merged_source_sha?1:0);
   let chosen=null,failures=[];
   for(const sha of sources){
    const recorded=exactRecordedChecks(await checks(sha),sha,item.ci_runs);
    const audit=assessReadyEvidence(item,{mergedSha:item.merged_source_sha,
      ciSourceSha:sha,checks:recorded,changedPaths:actualPaths,
      sourceObjectAt,testPaths:provenancePaths});
    if(audit.ready){chosen={sha,recorded,risk:audit.risk};break;}
    failures=audit.failures;
   }
   if(!chosen)throw Error('no single cited, successful five-check source with identical merged code/tests: '+failures.join('; '));
   if(currentSourceSha){
    if(!SHA.test(currentSourceSha))throw Error('current development SHA not verified');
    for(const path of item.scope_paths||[]){
     const mergedBlob=sourceObjectAt(item.merged_source_sha,path);
     if(!mergedBlob||sourceObjectAt(currentSourceSha,path)!==mergedBlob)
      throw Error('current development source differs from READY merge: '+path);
    }
   }
   checksByItem[item.id]=chosen.recorded;
   ciSourceByItem[item.id]=chosen.sha;
   verified.push({id:item.id,merged_sha:item.merged_source_sha,
    ci_source_sha:chosen.sha,risk_tier:chosen.risk.tier,checks:PRODUCTION_CHECKS});
  }catch(e){errors.push(prefix+String(e.message||e));}
 }
 if(candidateChangedPaths!==undefined){
  const batch=preflightReadyBatch(queue,items,{publishedSourceSha,candidateSha,
   changedPaths:candidateChangedPaths,checksByItem,ciSourceByItem,sourceObjectAt,
   allowedPinnedPaths});
  errors.push(...batch.errors);
 }
 return {ready:errors.length===0,errors,verified};
}
export async function githubReleaseReaders(token,{request=globalThis.fetch}={}){
 if(typeof token!=='string'||!token)throw Error('Read-only GitHub CI token unavailable');
 const get=async path=>{
  const response=await request('https://api.github.com/repos/'+REPO+path,{
   headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28'}});
  if(!response?.ok)throw Error('Read-only GitHub CI '+path.split('?')[0]+' HTTP '+String(response?.status));
  return response.json();
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
  console.log('[READY evidence] VERIFIED '+report.verified.length+
   ' queue items; cited exact CI, code/test Git parity, source scope and current blobs. No candidate staged.');
 })().catch(e=>{console.error('[READY evidence] HOLD: '+String(e.message));process.exitCode=2;});
}
