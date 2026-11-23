// #3889 Phase 1, strictly read-only: prove the 2026-11-23 TESTING cohort's
// original source provenance before any separately authorized frozen candidate.
// This is NOT a release candidate, source certification, or READY permission.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const BASELINE_DEV_SHA='d9fc859d81a23e10ee2cd0e1a37013b93a4980e5';
export const BASELINE_QUEUE_BLOB='46304f47eb0e78fac8c7845155af86080900b3c4';
const SHA=/^[0-9a-f]{40}$/;
const ITEM=/^DIC-Q-[1-9][0-9]*(?:-[a-z0-9-]+)?$/;
const DEPLOYABLE=/^(?:site\/|src\/|supabase\/migrations\/|supabase\/functions\/|netlify\/functions\/|package\.json$)/;
const VALID_STATES=new Set(['IN_PROGRESS','TESTING','BLOCKED','READY','DEPLOYED']);
const sorted=arr=>[...new Set(arr)].sort();
function validQueue(q){
 return q&&q.schema_version===1&&Array.isArray(q.items)&&
  SHA.test(q.published_base?.tested_source_sha||'')&&
  q.items.every(i=>ITEM.test(i.id||'')&&VALID_STATES.has(i.state)&&
   Array.isArray(i.scope_paths)&&i.scope_paths.every(p=>typeof p==='string'))&&
  new Set(q.items.map(i=>i.id)).size===q.items.length;
}
export function analyzeTestingBaseline({baselineQueue,liveQueue,developmentSha,
 sourceObjectAt,isAncestor,firstParentChangedPaths}={}){
 if(!validQueue(baselineQueue)||!validQueue(liveQueue)||!SHA.test(developmentSha||'')||
    typeof sourceObjectAt!=='function'||typeof isAncestor!=='function'||
    typeof firstParentChangedPaths!=='function')
  throw Error('BLOCKED: immutable baseline, live queue or Git proof reader unavailable');
 const baselineItems=baselineQueue.items.filter(i=>i.state==='TESTING');
 if(baselineItems.length!==63||baselineItems.filter(i=>SHA.test(i.merged_source_sha||'')).length!==42||
    baselineItems.filter(i=>!SHA.test(i.merged_source_sha||'')).length!==21)
  throw Error('BLOCKED: pinned 63/42/21 baseline does not match asserted source');
 const byId=new Map(liveQueue.items.map(i=>[i.id,i]));
 const published=liveQueue.published_base.tested_source_sha;
 const results=[];
 for(const frozen of baselineItems){
  const item=byId.get(frozen.id);
  const paths=sorted(frozen.scope_paths||[]);
  let status='HOLD',reason='';
  const sha=item?.merged_source_sha;
  let selectedObjects=[],untrackedMergedPaths=[];
  if(!item)reason='MISSING_LIVE_ID';
  else if(!['TESTING','READY','DEPLOYED'].includes(item.state))
   reason='LIVE_STATE_REQUIRES_RECONCILIATION';
  else if(item.state!=='TESTING')reason='READY_OR_DEPLOYED_REQUIRES_INDEPENDENT_CERTIFICATE';
  else if(!SHA.test(sha||''))reason='NO_RECORDED_MERGED_SOURCE';
  else if(!paths.length||!paths.every(p=>DEPLOYABLE.test(p)))reason='NONDEPLOYABLE_OR_MISSING_SCOPE';
  else if(JSON.stringify(sorted(item.scope_paths))!==JSON.stringify(paths))reason='CHANGED_SCOPE_REQUIRES_REVIEW';
  else {
   try{
    if(isAncestor(sha,developmentSha)!==true)reason='MERGE_NOT_IN_EXACT_DEVELOPMENT_ANCESTRY';
    else {
     const first=firstParentChangedPaths(sha);
     if(!Array.isArray(first)||first.some(p=>typeof p!=='string'))
      reason='FIRST_PARENT_DIFF_UNAVAILABLE';
     else if(!paths.some(p=>first.includes(p)))reason='NO_OWNED_FIRST_PARENT_DEPLOYABLE_CHANGE';
     else if((untrackedMergedPaths=sorted(first.filter(p=>DEPLOYABLE.test(p)&&!paths.includes(p)))).length)
      reason='MERGED_DEPLOYABLE_SCOPE_UNDECLARED';
     else {
      selectedObjects=paths.map(p=>({path:p,merged:sourceObjectAt(sha,p),
       live:sourceObjectAt(developmentSha,p),published:sourceObjectAt(published,p)}));
      if(selectedObjects.some(o=>o.merged===null||o.merged!==o.live))
       reason='SOURCE_CHANGED_AFTER_MERGE_OR_MISSING';
      else if(selectedObjects.some(o=>o.merged===o.published))
       reason='SOURCE_EQUALS_PUBLISHED_OR_SCOPE_PARTIALLY_UNCHANGED';
      else if(paths.some(p=>liveQueue.items.some(other=>other.id!==item.id&&
       other.state!=='DEPLOYED'&&other.scope_paths.includes(p))))
       reason='SHARED_UNREADY_SOURCE_REQUIRES_ISOLATION';
      else {status='SOURCE_ONLY_PROVISIONAL';reason='NEEDS_FROZEN_CANDIDATE_AND_FIVE_EXACT_CI_CHECKS';}
     }
    }
   }catch {reason='GIT_PROOF_UNAVAILABLE';}
  }
  results.push({id:frozen.id,issue:frozen.issue,live_state:item?.state||'MISSING',
   merged_source_sha:SHA.test(sha||'')?sha:null,baseline_recorded_merge:Boolean(SHA.test(frozen.merged_source_sha||'')),
   scope_paths:paths,untracked_merged_paths:untrackedMergedPaths,source_objects:selectedObjects,status,reason});
 }
 const counts=results.reduce((m,x)=>(m[x.reason]=(m[x.reason]||0)+1,m),{});
 const fingerprint=createHash('sha256').update(JSON.stringify({baseline_dev_sha:BASELINE_DEV_SHA,
  baseline_queue_blob:BASELINE_QUEUE_BLOB,development_sha:developmentSha,
  published_source_sha:published,results})).digest('hex');
 return {kind:'DIC-TESTING-COHORT-SOURCE-INVENTORY-1',publication_authorized:false,
  certified_ready_count:0,baseline_dev_sha:BASELINE_DEV_SHA,baseline_queue_blob:BASELINE_QUEUE_BLOB,
  development_sha:developmentSha,published_source_sha:published,
  baseline_testing_count:63,cohort_count:results.length,counts,fingerprint,items:results};
}

// A local Git checkout is used for READS only. Never create Git refs/commits,
// stage queue status, run tests, or contact a deployment/provider here.
export function inspectTestingBaseline({repoDir=process.cwd(),developmentSha}={}){
 if(!SHA.test(developmentSha||''))throw Error('Exact development SHA required');
 const git=(args)=>execFileSync('git',args,{cwd:repoDir,encoding:'utf8',
  timeout:45000,maxBuffer:12_000_000,stdio:['ignore','pipe','pipe']}).trim();
 const live=git(['ls-remote','--heads','origin','refs/heads/development/backend-foundation']).split(/\s+/)[0];
 if(live!==developmentSha)throw Error('BLOCKED: live development changed');
 const pinned=git(['rev-parse',BASELINE_DEV_SHA+':docs/RELEASE_QUEUE.json']);
 if(pinned!==BASELINE_QUEUE_BLOB)throw Error('BLOCKED: immutable baseline blob mismatch');
 const preflight=git(['rev-parse',developmentSha+':docs/ai/PREFLIGHT.md']);
 if(!SHA.test(preflight))throw Error('BLOCKED: source preflight Git object unavailable');
 const at=(ref,path)=>{
  if(!/^[A-Za-z0-9_.\/-]+$/.test(path)||path.includes('..'))
   throw Error('Unsafe source path');
  const lines=git(['ls-tree','-z',ref,'--',path]).split('\0').filter(Boolean);
  if(!lines.length)return null;
  if(lines.length!==1)throw Error('Ambiguous Git tree path');
  const match=/^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/.exec(lines[0]);
  if(!match||match[3]!==path)throw Error('Source is not a regular exact Git blob');
  return match[1]+':'+match[2];
 };
 const ancestor=(a,b)=>{try{git(['merge-base','--is-ancestor',a,b]);return true;}
  catch(e){if(e.status===1)return false;throw e;}};
 const baselineQueue=JSON.parse(git(['show',BASELINE_DEV_SHA+':docs/RELEASE_QUEUE.json']));
 const liveQueue=JSON.parse(git(['show',developmentSha+':docs/RELEASE_QUEUE.json']));
 const result=analyzeTestingBaseline({baselineQueue,liveQueue,developmentSha,
  sourceObjectAt:at,isAncestor:ancestor,
  firstParentChangedPaths:sha=>git(['diff','--name-only','--no-renames',sha+'^',sha]).split(/\r?\n/).filter(Boolean)});
 return {...result,preflight_blob_sha:preflight};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==3)throw Error('Usage: node testing-source-preflight.mjs <exact development SHA>');
  console.log(JSON.stringify(inspectTestingBaseline({developmentSha:process.argv[2]})));
 }catch(e){console.error('[DIC #3889 source inventory HOLD] '+e.message);process.exitCode=2;}
}
