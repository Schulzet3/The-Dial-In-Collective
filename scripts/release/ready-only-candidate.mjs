// One-publisher READY-only source staging policy. This module does not deploy,
// write a repository ref, call a provider, or execute tests. Fail closed when
// a selected READY path overlaps unfinished source (including same-file edits).
import {deployableChangedPaths,queueSchemaErrors} from './release-queue.mjs';
const SHA=/^[a-f0-9]{40}$/;
const ITEM=/^DIC-Q-[1-9][0-9]*(?:-[a-z0-9-]+)?$/;
const sorted=items=>[...items].sort();
const equal=(a,b)=>JSON.stringify(sorted(a))===JSON.stringify(sorted(b));
export const CANDIDATE_RECEIPT_PATH='docs/RELEASE_CANDIDATE.json';
export const CANDIDATE_JOURNAL_PATH='docs/ACTIVE_WORK_2026-10-20_APPROVAL_TO_RELEASE_INTEGRITY.md';
export const CANDIDATE_KIND='DIC-READY-ONLY-SOURCE-1';
// Production publication must never edit/create GitHub Actions workflows.
// The Actions GITHUB_TOKEN publisher has no workflows scope. Keep all CI
// workflow evolution on main/development and restore exact published bytes
// in the isolated source, without weakening READY feature/test gating.
export const workflowChangedPaths=paths=>sorted([...new Set((Array.isArray(paths)?paths:[])
 .filter(p=>typeof p==='string'&&/^\.github\/workflows\/[A-Za-z0-9_./-]+\.ya?ml$/.test(p)))]);

export function planReadyOnlyCandidate(queue,{publishedSourceSha,developmentSourceSha,
 selectedIds,developmentChangedPaths,pinnedReadyPaths=[],isAncestor}={}){
 const errors=queueSchemaErrors(queue);
 if(!SHA.test(publishedSourceSha||'')||!SHA.test(developmentSourceSha||'')||
    typeof isAncestor!=='function')errors.push('Missing source anchors/ancestry');
 if(queue?.published_base?.tested_source_sha!==publishedSourceSha)
  errors.push('Queue baseline does not match last published tested source');
 if(!Array.isArray(selectedIds)||selectedIds.length===0||selectedIds.some(x=>!ITEM.test(x))||
    new Set(selectedIds).size!==selectedIds.length)
  errors.push('Nonempty unique READY item IDs required');
 const wanted=new Set(Array.isArray(selectedIds)?selectedIds:[]);
 const selected=(queue?.items||[]).filter(i=>wanted.has(i.id));
 if(selected.length!==wanted.size)errors.push('Unknown selected READY item ID');
 if(selected.some(i=>i.state!=='READY'))errors.push('Selected item is not READY');
 if(typeof isAncestor==='function'&&SHA.test(publishedSourceSha||'')&&SHA.test(developmentSourceSha||'')){
  try{if(isAncestor(publishedSourceSha,developmentSourceSha)!==true)
    errors.push('Development does not descend from published source');}
  catch{errors.push('Cannot verify published-to-development ancestry');}
 }
 for(const item of selected){
  try{
   if(!SHA.test(item.merged_source_sha||'')||
      // A selected READY merge may predate an isolated published candidate:
      // the candidate deliberately restored this item's code to older bytes.
      // Its current source must still descend from the READY merge, and the
      // actual deployable byte diff and exact READY blob are checked below.
      item.merged_source_sha===publishedSourceSha||
      isAncestor(item.merged_source_sha,developmentSourceSha)!==true)
    errors.push(item.id+' READY merge is absent from current development ancestry');
  }catch{errors.push(item.id+' READY ancestry unavailable');}
 }
 const changed=deployableChangedPaths(developmentChangedPaths||[]);
 if(!Array.isArray(pinnedReadyPaths)||pinnedReadyPaths.some(x=>typeof x!=='string')||
    new Set(pinnedReadyPaths).size!==pinnedReadyPaths.length)
   errors.push('Invalid or duplicate pinned READY overlap paths');
 const wantedPins=new Set(Array.isArray(pinnedReadyPaths)?pinnedReadyPaths:[]);
 const included=[],restored=[],pinned=[];
 for(const path of changed){
  const owners=(queue?.items||[]).filter(i=>i.scope_paths?.includes(path));
  const chosen=owners.filter(i=>wanted.has(i.id)&&i.state==='READY');
  const competing=owners.filter(i=>!wanted.has(i.id)&&i.state!=='DEPLOYED');
  const deployed=owners.filter(i=>i.state==='DEPLOYED');
  if(!owners.length||(!chosen.length&&!competing.length))
   errors.push('Untracked or DEPLOYED-only unpublished deployable source: '+path);
  else if(chosen.length&&competing.length){
   // Mixed READY/unready source is publishable ONLY when explicitly pinned to
   // exact selected READY merged blob, independently verified below.
   if(!wantedPins.has(path))errors.push('READY/unready or unselected overlap cannot be isolated: '+path);
   else{included.push(path);pinned.push(path);}
  }
  else if(chosen.length){
   if(deployed.some(i=>SHA.test(i.merged_source_sha||'')&&i.merged_source_sha!==publishedSourceSha)){
    // A historic DEPLOYED label can be inaccurate: fail closed if its merged
    // source is newer than baseline and present in the development lineage.
    try{if(deployed.some(i=>SHA.test(i.merged_source_sha||'')&&
      isAncestor(publishedSourceSha,i.merged_source_sha)===true&&
      i.merged_source_sha!==publishedSourceSha&&
      isAncestor(i.merged_source_sha,developmentSourceSha)===true))
       errors.push('New DEPLOYED-labelled source overlaps READY path: '+path);
    }catch{errors.push('Cannot verify DEPLOYED ancestry for '+path);}
   }
   included.push(path);
  }else restored.push(path);
 }
 for(const path of wantedPins)if(!pinned.includes(path))
  errors.push('Pinned READY path is not an actual READY/unready overlap: '+path);
 if(!included.length)errors.push('No selected READY deployable change to release');
 for(const item of selected)if(!item.scope_paths?.some(p=>included.includes(p)))
  errors.push(item.id+' does not deliver an isolated deployable change');
 return {ready:errors.length===0,errors,published_source_sha:publishedSourceSha,
  development_source_sha:developmentSourceSha,selected_ids:sorted(selectedIds||[]),
  included_paths:sorted(included),restored_paths:sorted(restored),
  original_changed_paths:changed,pinned_ready_paths:sorted(pinned),
  ready_items:selected.map(i=>({id:i.id,issue:i.issue,title:i.title,
   merged_source_sha:i.merged_source_sha,scope_paths:i.scope_paths})),
  other_items:(queue?.items||[]).filter(i=>i.state!=='READY'&&i.state!=='DEPLOYED')
   .map(i=>({id:i.id,state:i.state,merged_source_sha:i.merged_source_sha,blockers:i.blockers}))};
}
export function validateReadyOnlyCandidate(queue,{manifest,publishedSourceSha,developmentHead,
 candidateSha,actualParents,developmentChangedPaths,candidateChangedPaths,
 stagedCommitChangedPaths,developmentDriftPaths,queueContentMatches,liveQueue,sourceObjectAt,
 candidateBranch,isAncestor}={}){
 const reject=reason=>{throw Error('Isolated READY candidate HOLD: '+reason);};
 if(!manifest||manifest.schema_version!==1||manifest.kind!==CANDIDATE_KIND||
  !SHA.test(candidateSha||'')||!SHA.test(developmentHead||'')||
  manifest.published_source_sha!==publishedSourceSha||
  !SHA.test(manifest.development_source_sha||'')||
  typeof candidateBranch!=='string'||!/^\brelease-candidates\/[a-z0-9][a-z0-9-]{2,80}$/.test(candidateBranch)||
  manifest.candidate_branch!==candidateBranch)
  reject('Missing or mismatched immutable candidate source/ref identity');
 if(!Array.isArray(actualParents)||actualParents.length!==2||
  actualParents[0]!==candidateSha||actualParents[1]!==manifest.development_source_sha)
  reject('Candidate must be ONE direct nonmerge child of the verified development source');
 if(typeof isAncestor!=='function'||typeof sourceObjectAt!=='function')
  reject('Git ancestry or tree readback is unavailable');
 try{if(isAncestor(manifest.development_source_sha,developmentHead)!==true)
  reject('Candidate staging source no longer in development ancestry');}
 catch(e){reject('Cannot verify development ancestry: '+e.message);}
 // The staged candidate is an immutable, CI-tested source tree. Newer
 // development work may advance independently, but NEVER enter this tree.
 // Validate current READY inventory and each selected item, while allowing
 // solely tracked UNREADY runtime edits after the frozen staging anchor.
 if(queueContentMatches!==true)
  reject('Candidate queue differs from its immutable staging-source queue');
 if(liveQueue!==undefined){
  const liveErrors=queueSchemaErrors(liveQueue);
  if(liveErrors.length)reject('Latest development queue invalid: '+liveErrors.join('; ').slice(0,400));
  if(JSON.stringify(liveQueue.published_base)!==JSON.stringify(queue.published_base))
   reject('Published baseline changed since candidate staging');
  const liveReady=liveQueue.items.filter(i=>i.state==='READY');
  const selectedSet=new Set(manifest.selected_ready_item_ids);
  if(manifest.selected_ready_item_ids.some(id=>!liveReady.some(i=>i.id===id)))
   reject('Selected READY item is no longer READY on development');
  // New READY records after this owner-approved immutable candidate must NOT
  // be silently added to this one-use grant or source. They can coexist only
  // when their exact merge happened after this candidate staging anchor.
  for(const item of liveReady.filter(i=>!selectedSet.has(i.id))){
   // A separately unfinished item may be certified READY while this approved
   // candidate is tested. If its app bytes were already in the staging
   // ancestry, allow it ONLY when it was tracked as unready in the frozen
   // staging queue and EVERY scoped deployable file was restored to the
   // published Git object in this candidate. Never include an added READY
   // feature merely because its status changed after staging.
   const original=queue.items.find(i=>i.id===item.id);
   const previouslyUnready=original&&['IN_PROGRESS','TESTING','BLOCKED'].includes(original.state);
   // An independently READY item may already exist at staging but is NOT in
   // this owner's selected batch. Never require it to be published, and never
   // let its source in unless the ENTIRE scoped file set is restored to the
   // published blobs. Reject any mutation of its frozen READY receipt.
   const frozenUnselectedReady=original?.state==='READY'&&JSON.stringify(original)===JSON.stringify(item);
   const scoped=Array.isArray(item.scope_paths)?item.scope_paths:[];
   let fullyExcluded=false;
   if((previouslyUnready||frozenUnselectedReady)&&scoped.length>0&&equal(scoped,original.scope_paths||[])){
    try{
     fullyExcluded=scoped.every(path=>
      manifest.restored_to_published_paths?.includes(path)&&
      sourceObjectAt(candidateSha,path)===sourceObjectAt(publishedSourceSha,path)&&
      sourceObjectAt(manifest.development_source_sha,path)!==sourceObjectAt(publishedSourceSha,path));
    }catch(e){reject('Cannot verify newly READY excluded source blobs: '+e.message);}
   }
   if(fullyExcluded)continue;
   try{
    if(!SHA.test(item.merged_source_sha||'')||
       item.merged_source_sha===manifest.development_source_sha||
       isAncestor(manifest.development_source_sha,item.merged_source_sha)!==true||
       isAncestor(item.merged_source_sha,developmentHead)!==true)
     reject('Additional READY source not proven post-staging: '+item.id);
   }catch(e){reject('Cannot certify additional READY source chronology: '+e.message);}
  }
  for(const id of manifest.selected_ready_item_ids){
   const original=queue.items.find(i=>i.id===id);
   const current=liveQueue.items.find(i=>i.id===id);
   if(!original||!current||JSON.stringify(original)!==JSON.stringify(current))
    reject('Selected READY record changed since candidate staging: '+id);
  }
 }
 const runtimeDrift=deployableChangedPaths(developmentDriftPaths||[]);
 if(runtimeDrift.length){
  if(!liveQueue)reject('Development app code changed without verifiable current queue');
  for(const path of runtimeDrift){
   if(!liveQueue.items.some(i=>i.scope_paths?.includes(path)&&(
       ['IN_PROGRESS','TESTING','BLOCKED'].includes(i.state)||
       (i.state==='READY'&&!manifest.selected_ready_item_ids.includes(i.id)&&
        SHA.test(i.merged_source_sha||'')&&
        isAncestor(manifest.development_source_sha,i.merged_source_sha)===true))))
    reject('Newer development app changes lack an excluded post-staging owner: '+path);
  }
  // Every staged READY path is still checked below against its exact READY
  // merged blob; no late overlapping or other unready edit can be published.
 }
 const plan=planReadyOnlyCandidate(queue,{
  publishedSourceSha,developmentSourceSha:manifest.development_source_sha,
  selectedIds:manifest.selected_ready_item_ids,
  pinnedReadyPaths:manifest.pinned_to_ready_paths||[],developmentChangedPaths,isAncestor});
 if(!plan.ready)reject(plan.errors.join('; '));
 if(!Array.isArray(manifest.restored_to_published_paths)||
    !equal(manifest.restored_to_published_paths,plan.restored_paths))
  reject('Restoration manifest differs from actual unready source inventory');
 if(!equal(deployableChangedPaths(candidateChangedPaths||[]),plan.included_paths))
  reject('Candidate app diff includes more or fewer than exact selected READY paths');
 if(!Array.isArray(manifest.pinned_to_ready_paths||[])||
    !equal(manifest.pinned_to_ready_paths||[],plan.pinned_ready_paths))
  reject('Pinned READY manifest differs from actual mixed-source paths');
 const workflowChanges=workflowChangedPaths(developmentChangedPaths||[]);
 const frozenWorkflows=manifest.restored_unpublished_workflow_paths||[];
 if(!Array.isArray(frozenWorkflows)||!equal(frozenWorkflows,workflowChanges))
  reject('Production candidate must restore every changed GitHub Actions workflow to exact published source');
 if(workflowChangedPaths(candidateChangedPaths||[]).length)
  reject('Production candidate must not modify/create GitHub Actions workflows');
 for(const path of frozenWorkflows)
  if(sourceObjectAt(candidateSha,path)!==sourceObjectAt(publishedSourceSha,path))
   reject('GitHub Actions workflow was not exactly restored to published bytes: '+path);
 const excludedTests=manifest.excluded_unready_test_paths||[];
 if(!Array.isArray(excludedTests)||new Set(excludedTests).size!==excludedTests.length)
  reject('Invalid or duplicate excluded unfinished test paths');
 for(const path of excludedTests){
  const m=typeof path==='string'?/^tests\/(?:coffee-)?issue([1-9][0-9]*)-[a-z0-9-]+\.test\.mjs$/.exec(path):null;
  if(!m)reject('Only issue-scoped unpublished test files can be excluded');
  const issue=Number(m[1]);
  const unfinishedMixed=queue.items.some(i=>i.issue===issue&&
   ['IN_PROGRESS','TESTING','BLOCKED'].includes(i.state)&&
   i.scope_paths?.some(p=>plan.pinned_ready_paths.includes(p)));
  // A separately verified READY item NOT selected for this owner release
  // may carry NEW tests of code deliberately restored to published bytes.
  // Exclude ONLY its original CI-tested test blob, never a selected test or
  // a changed/unattributed test. Require every owned runtime file restored.
  const frozenOtherReady=queue.items.some(i=>i.issue===issue&&i.state==='READY'&&
   !manifest.selected_ready_item_ids.includes(i.id)&&
   i.scope_paths?.length>0&&i.scope_paths.every(p=>plan.restored_paths.includes(p))&&
   liveQueue?.items.some(now=>now.id===i.id&&JSON.stringify(now)===JSON.stringify(i))&&
   SHA.test(i.merged_source_sha||'')&&
   sourceObjectAt(i.merged_source_sha,path)!==null&&
   sourceObjectAt(i.merged_source_sha,path)===sourceObjectAt(manifest.development_source_sha,path));
  if(!unfinishedMixed&&!frozenOtherReady)
   reject('Excluded test does not belong to a frozen unselected READY or unfinished mixed-source item');
  if(sourceObjectAt(publishedSourceSha,path)!==null||
     sourceObjectAt(manifest.development_source_sha,path)===null||
     sourceObjectAt(candidateSha,path)!==null)
   reject('Excluded test must be newly introduced and absent from isolated candidate');
  // Later, independently READY commits inherit older unfinished issue tests
  // in their Git trees. Mere historical presence does not make an inherited
  // test part of the selected READY change. Prove its exact blob was UNCHANGED
  // relative to each READY merge's real first parent before permitting omission.
  // A test introduced/modified by any selected READY commit is never excluded.
  for(const item of plan.ready_items){
   let selectedBlob,parentBlob;
   try{
    selectedBlob=sourceObjectAt(item.merged_source_sha,path);
    if(selectedBlob!==null)
     parentBlob=sourceObjectAt(item.merged_source_sha+'^',path);
   }catch{
    reject('Cannot independently verify selected READY test provenance: '+path);
   }
   if(selectedBlob!==null&&selectedBlob!==parentBlob)
    reject('Cannot exclude a test introduced or modified by an approved READY merge: '+path);
  }
 }
 const allowed=[...plan.restored_paths,...plan.pinned_ready_paths,...excludedTests,...frozenWorkflows,CANDIDATE_RECEIPT_PATH,CANDIDATE_JOURNAL_PATH];
 if(!equal(stagedCommitChangedPaths||[],allowed))
  reject('Candidate staging commit changes unrelated paths or lacks same-commit journal');
 for(const path of plan.restored_paths)
  if(sourceObjectAt(candidateSha,path)!==sourceObjectAt(publishedSourceSha,path))
   reject('Unready file was not exactly restored to published bytes: '+path);
 for(const path of plan.included_paths){
  const candidateBlob=sourceObjectAt(candidateSha,path);
  const isPinned=plan.pinned_ready_paths.includes(path);
  if(isPinned){
   if(candidateBlob===sourceObjectAt(manifest.development_source_sha,path))
    reject('Pinned mixed-source READY file was not actually isolated: '+path);
  }else if(candidateBlob!==sourceObjectAt(manifest.development_source_sha,path))
   reject('Selected READY file was changed during isolation: '+path);
  // A later, UNTRACKED commit touching an already READY path must not be
  // laundered into the release merely because the same path has a READY owner.
  // Require the final blob to equal the exact Git blob from at least one
  // selected READY merged commit that owns this file.
  const readyOwners=plan.ready_items.filter(i=>i.scope_paths.includes(path));
  if(!readyOwners.some(i=>sourceObjectAt(i.merged_source_sha,path)===candidateBlob))
   reject('Selected file includes edits after its verified READY merge: '+path);
 }
 return {ready:true,errors:[],deployable_paths:plan.included_paths,
  ready_items:plan.ready_items,other_items:plan.other_items,
  excluded_paths:plan.restored_paths,pinned_ready_paths:plan.pinned_ready_paths,excluded_unready_test_paths:excludedTests,
  development_source_sha:manifest.development_source_sha,
  candidate_source_sha:candidateSha};
}
