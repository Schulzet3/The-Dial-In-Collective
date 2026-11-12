// Pure release reliability checks. No provider writes, grant creation or deployment.
import {deployableChangedPaths,queueSchemaErrors} from './release-queue.mjs';
const SHA=/^[a-f0-9]{40}$/;
export function classifyReleaseRisk(paths){
 const p=deployableChangedPaths(paths);
 if(!p.length)return {tier:'documentation',checks:['approval','source'],builds:0};
 if(p.some(x=>/^(supabase\/|netlify\/functions\/|\.github\/|scripts\/release\/|scripts\/netlify\/|site\/admin\/|site\/auth\/)/.test(x)||
  /(?:auth|security|permission|rls|migration|package(?:-lock)?\.json)/i.test(x))||
  p.length>12)return {tier:'high',checks:['approval','security','sql','cloud-browser','build-test'],builds:1};
 if(p.some(x=>/^(site\/lib\/|src\/server\/|site\/coffee\/)/.test(x)||
  /(?:shot|grinder|recommend|offline|coffee|engine)/i.test(x)))
  return {tier:'medium',checks:['approval','security','sql','cloud-browser','build-test'],builds:1};
 return {tier:'low',checks:['approval','cloud-browser','build-test'],builds:1};
}
export function assessReadyEvidence(item,{mergedSha,checks=[],changedPaths=[],dependenciesReady=true}={}){
 const failures=[];
 if(item?.state!=='READY')failures.push('item not marked READY');
 if(!SHA.test(item?.merged_source_sha||'')||item.merged_source_sha!==mergedSha)
  failures.push('merged source SHA not verified');
 if(!item?.scope_paths?.length||!item?.tests?.length||!item?.ci_runs?.length)
  failures.push('missing scope, test or CI receipts');
 if(item?.blockers?.length)failures.push('unresolved blockers');
 if(!dependenciesReady)failures.push('unverified cross-item dependency');
 const actual=deployableChangedPaths(changedPaths);
 if(actual.some(p=>!item?.scope_paths?.includes(p)))failures.push('changed deployable file outside READY ownership');
 const risk=classifyReleaseRisk(actual);
 const byName=new Map(checks.map(c=>[c.name,c]));
 for(const name of risk.checks){
  const check=byName.get(name);
  if(!check||check.sha!==mergedSha||check.conclusion!=='success')
   failures.push('missing successful exact-merged-source check: '+name);
 }
 return {ready:failures.length===0,risk,failures};
}
export function validateReleaseTriggerReceipt({requestCommitSha,mainHeadSha,workflowRuns,elapsedSeconds,consumed=false}={}){
 if(!SHA.test(requestCommitSha||'')||!SHA.test(mainHeadSha||''))
  return {status:'BLOCKED',reason:'missing verified main/request SHA'};
 if(consumed)return {status:'CLAIMED',reason:'verify production ref and Netlify separately'};
 if(mainHeadSha!==requestCommitSha)
  return {status:'BLOCKED',reason:'request no longer main HEAD; inspect live refs before any retry'};
 if(!Array.isArray(workflowRuns))
  return {status:'UNKNOWN',reason:'GitHub Actions readback unavailable; do not retry blindly'};
 const runs=workflowRuns.filter(x=>x.head_sha===requestCommitSha&&
  x.name==='DIC chat-approved single-use production request');
 if(runs.length>1)return {status:'BLOCKED',reason:'duplicate release-controller runs; inspect claim before further action'};
 if(runs.length===1)return {status:'OBSERVED',reason:'controller event delivered; inspect run conclusion and claim'};
 if(!Number.isFinite(elapsedSeconds)||elapsedSeconds<90)
  return {status:'WAIT',reason:'GitHub event may not have appeared yet'};
 return {status:'BLOCKED',reason:'NO_CONTROLLER_RUN: GitHub did not report a release workflow for the request SHA; inspect push event token/trigger before new grant'};
}
export function preflightReadyBatch(queue,items,{publishedSourceSha,candidateSha,changedPaths,checksByItem={}}={}){
 const errors=queueSchemaErrors(queue);
 if(!SHA.test(publishedSourceSha||'')||queue?.published_base?.tested_source_sha!==publishedSourceSha)
  errors.push('published source mismatch');
 if(!SHA.test(candidateSha||''))errors.push('candidate source missing');
 const owned=new Map();
 for(const item of items||[]){
  const changed=(item.scope_paths||[]).filter(p=>deployableChangedPaths(changedPaths||[]).includes(p));
  const result=assessReadyEvidence(item,{mergedSha:item.merged_source_sha,checks:checksByItem[item.id]||[],changedPaths:changed});
  errors.push(...result.failures.map(x=>item.id+': '+x));
  for(const path of changed){
   if(owned.has(path))errors.push('same-file READY overlap: '+path+' ('+owned.get(path)+', '+item.id+')');
   owned.set(path,item.id);
  }
 }
 for(const path of deployableChangedPaths(changedPaths||[]))
  if(!owned.has(path))errors.push('unowned or unfinished candidate path: '+path);
 return {ready:errors.length===0,errors};
}
