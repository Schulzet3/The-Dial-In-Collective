// Pure, nonpublishing enforcement helpers: source-bound READY receipts,
// published-to-candidate risk and canonical GitHub push-run observation.
import {deployableChangedPaths,queueSchemaErrors} from './release-queue.mjs';
const SHA=/^[a-f0-9]{40}$/;
export const PRODUCTION_CHECKS=Object.freeze(['approval','validate','cloud-tests','mobile-browser-qa','sql']);
const RUN_NAME='DIC chat-approved single-use production request';
const RUN_PATH='.github/workflows/dic-chat-approved-release.yml';
const unique=xs=>[...new Set(xs)].sort();
export function classifyReleaseRisk(paths){
 if(!Array.isArray(paths))throw Error('Published-to-candidate changed-path inventory missing');
 const p=unique(paths.filter(x=>typeof x==='string'&&
  (deployableChangedPaths([x]).length||x.startsWith('.github/workflows/')||
   x.startsWith('scripts/release/')||x.startsWith('tests/'))));
 if(!p.length)return {tier:'documentation',checks:['approval'],builds:0,not_applicable:['validate','cloud-tests','mobile-browser-qa','sql']};
 const high=p.some(x=>/^(supabase\/|netlify\/functions\/|\.github\/|scripts\/release\/|scripts\/netlify\/|site\/admin\/|site\/auth\/)/.test(x)||
  /(?:auth|security|permission|rls|migration|package(?:-lock)?\.json)/i.test(x))||p.length>12;
 const medium=!high&&p.some(x=>/^(site\/lib\/|src\/server\/|site\/coffee\/)/.test(x)||/(?:shot|grinder|recommend|offline|coffee|engine)/i.test(x));
 const tier=high?'high':medium?'medium':'low';
 const na=high?[]:medium?['sql']:['sql','cloud-tests'];
 return {tier,checks:[...PRODUCTION_CHECKS],builds:1,not_applicable:na};
}
function referencedTestPaths(item){
 return unique((item?.tests||[]).flatMap(x=>typeof x==='string'?
  (x.match(/tests\/[A-Za-z0-9_.\/-]+\.test\.mjs/g)||[]):[]));
}
export function assessReadyEvidence(item,{mergedSha,ciSourceSha,checks=[],changedPaths=[],
 dependenciesReady=true,sourceObjectAt,testPaths}={}){
 const errors=[];
 if(item?.state!=='READY')errors.push('item not marked READY');
 if(!SHA.test(item?.merged_source_sha||'')||item.merged_source_sha!==mergedSha)
  errors.push('merged source SHA not verified');
 if(!item?.scope_paths?.length||!item?.tests?.length||!item?.ci_runs?.length||
    item.ci_runs.some(x=>!Number.isSafeInteger(x)||x<=0))
  errors.push('missing or malformed READY scope/test/CI evidence');
 if(item?.blockers?.length)errors.push('unresolved blockers');
 if(!dependenciesReady)errors.push('unverified cross-item dependency');
 const actual=deployableChangedPaths(changedPaths);
 if(!actual.length)errors.push('READY item has no changed deployable file');
 if(actual.some(p=>!item?.scope_paths?.includes(p)))errors.push('changed file outside READY ownership');
 const risk=classifyReleaseRisk(actual);
 const tested=ciSourceSha??mergedSha;
 if(!SHA.test(tested||''))errors.push('tested source SHA absent');
 const byName=new Map(checks.map(x=>[x?.name,x]));
 for(const name of PRODUCTION_CHECKS){
  const x=byName.get(name);
  if(!x||x.sha!==tested||x.conclusion!=='success'||x.status==='skipped'||x.status==='pending')
   errors.push('missing successful exact-source CI status: '+name);
 }
 if(SHA.test(tested||'')&&tested!==mergedSha){
  const checked=unique([...(item?.scope_paths||[]),...(testPaths||referencedTestPaths(item))]);
  if(typeof sourceObjectAt!=='function'||!(testPaths||referencedTestPaths(item)).length)
   errors.push('tested head parity missing verified code/test blob evidence');
  else for(const path of checked){
   let a,b;
   try{a=sourceObjectAt(tested,path);b=sourceObjectAt(mergedSha,path);}
   catch{errors.push('unreadable tested head or merged blob: '+path);continue;}
   if(typeof a!=='string'||!a||a!==b)
    errors.push('tested head differs from merged code/test blob: '+path);
  }
 }
 return {ready:errors.length===0,risk,failures:errors,certified_source_sha:tested};
}
export function validateReleaseTriggerReceipt({requestCommitSha,mainHeadSha,workflowRuns,
 elapsedSeconds,consumed=false}={}){
 if(!SHA.test(requestCommitSha||'')||!SHA.test(mainHeadSha||''))
  return {status:'BLOCKED',reason:'missing verified main/request SHA'};
 if(consumed)return {status:'CLAIMED_NETLIFY_UNVERIFIED',reason:'verify release ref and Netlify separately'};
 if(mainHeadSha!==requestCommitSha)
  return {status:'BLOCKED',reason:'request no longer main HEAD; inspect live refs before retry'};
 if(!Array.isArray(workflowRuns))
  return {status:'UNKNOWN',reason:'GitHub Actions readback unavailable; do not retry blindly'};
 const runs=workflowRuns.filter(x=>x?.head_sha===requestCommitSha&&
  x.name===RUN_NAME&&x.path===RUN_PATH&&x.event==='push');
 if(runs.length>1)return {status:'BLOCKED',reason:'duplicate controller runs; inspect claim before action'};
 if(!runs.length)return !Number.isFinite(elapsedSeconds)||elapsedSeconds<90?
  {status:'WAIT',reason:'GitHub event may not have appeared yet'}:
  {status:'BLOCKED',reason:'NO_CONTROLLER_RUN: inspect repository Actions runs?head_sha before any new grant'};
 const run=runs[0];
 if(!Number.isSafeInteger(run.id)||run.id<1)
  return {status:'UNKNOWN',reason:'controller run ID unavailable'};
 if(run.status==='completed')return run.conclusion==='success'?
  {status:'CONTROLLER_COMPLETED_NETLIFY_UNVERIFIED',runId:run.id,reason:'verify release claim and provider'}:
  {status:'BLOCKED',runId:run.id,reason:'controller '+String(run.conclusion||'failed')+'; inspect actual job'};
 if(['queued','pending','waiting','in_progress','requested'].includes(run.status))
  return {status:'RUNNING',runId:run.id,reason:'no retry while controller unfinished'};
 return {status:'UNKNOWN',runId:run.id,reason:'unexpected controller status'};
}
export function preflightReadyBatch(queue,items,{publishedSourceSha,candidateSha,
 changedPaths,checksByItem={},ciSourceByItem={},sourceObjectAt,dependenciesReadyByItem={},
 allowedPinnedPaths=[],testPathsByItem={}}={}){
 const errors=queueSchemaErrors(queue);
 if(!SHA.test(publishedSourceSha||'')||queue?.published_base?.tested_source_sha!==publishedSourceSha)
  errors.push('published source mismatch');
 if(!SHA.test(candidateSha||'')||candidateSha===publishedSourceSha)
  errors.push('candidate source missing or unchanged');
 if(!Array.isArray(items)||!items.length)errors.push('selected READY items missing');
 if(!Array.isArray(changedPaths))errors.push('candidate changed-path diff missing');
 const owned=new Map(),current=deployableChangedPaths(changedPaths||[]);
 const allowed=new Set(allowedPinnedPaths);
 for(const item of items||[]){
  const queueItem=queue?.items?.find(x=>x.id===item.id);
  if(!queueItem||JSON.stringify(queueItem)!==JSON.stringify(item))
   errors.push(item.id+': READY record changed or missing from queue');
  const changed=(item.scope_paths||[]).filter(p=>current.includes(p));
  const checked=checksByItem[item.id]||[];
  const receipt=assessReadyEvidence(item,{mergedSha:item.merged_source_sha,
   ciSourceSha:ciSourceByItem[item.id],checks:checked,changedPaths:changed,
   sourceObjectAt,testPaths:testPathsByItem[item.id],
    dependenciesReady:dependenciesReadyByItem[item.id]!==false});
  errors.push(...receipt.failures.map(x=>item.id+': '+x));
  for(const path of changed){
   if(owned.has(path)&&!allowed.has(path))
    errors.push('unreviewed same-file READY overlap: '+path+' ('+owned.get(path)+', '+item.id+')');
   owned.set(path,item.id);
  }
 }
 for(const path of current)
  if(!owned.has(path))errors.push('unowned or unfinished candidate path: '+path);
 for(const path of allowed)if(!current.includes(path))
  errors.push('pinned overlap not in candidate diff: '+path);
 return {ready:errors.length===0,errors,deployable_paths:current};
}
