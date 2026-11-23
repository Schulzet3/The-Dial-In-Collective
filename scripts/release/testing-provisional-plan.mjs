// #3889 Phase 2a: immutable nonpublishing TESTING-source isolation plan.
// A plan is NEVER a frozen candidate, five-check pass or READY certification.
import {createHash} from 'node:crypto';
export const PROVISIONAL_KIND='DIC-TESTING-SOURCE-PLAN-3889-V1';
const SHA=/^[0-9a-f]{40}$/,FINGERPRINT=/^[0-9a-f]{64}$/;
const SAFE=/^[A-Za-z0-9_.\/-]+$/;
const OWNED=/^(?:site\/|src\/|supabase\/migrations\/|supabase\/functions\/|netlify\/functions\/|package\.json$)/;
const REVIEWED=/^(?:site\/|src\/|supabase\/|netlify\/|scripts\/|tests\/|\.github\/workflows\/|package(?:-lock)?\.json$)/;
const SUPPORT=/^(?:tests\/|supabase\/tests\/|scripts\/audit\/)/;
const sorted=values=>[...new Set(values)].sort();
function safePaths(paths){
 return Array.isArray(paths)&&paths.every(p=>typeof p==='string'&&SAFE.test(p)&&
  !p.startsWith('/')&&!p.includes('..')&&!p.includes('//'))&&
  new Set(paths).size===paths.length;
}
export function planProvisionalTestingCandidate({inventory,baselineQueue,liveQueue,
 selectedId,developmentChangedPaths,firstParentChangedPaths,sourceObjectAt}={}){
 const hold=why=>{throw Error('TESTING provisional HOLD: '+why);};
 if(inventory?.kind!=='DIC-TESTING-COHORT-SOURCE-INVENTORY-1'||
  inventory.baseline_dev_sha!=='d9fc859d81a23e10ee2cd0e1a37013b93a4980e5'||
  inventory.baseline_queue_blob!=='46304f47eb0e78fac8c7845155af86080900b3c4'||
  inventory.cohort_count!==63||inventory.certified_ready_count!==0||
  inventory.publication_authorized!==false||!FINGERPRINT.test(inventory.fingerprint||'')||
  !SHA.test(inventory.development_sha||'')||!SHA.test(inventory.published_source_sha||'')||
  !Array.isArray(inventory.items)||inventory.items.length!==63)
  hold('verified immutable 63-ID source inventory required');
 if(!Array.isArray(baselineQueue?.items)||!Array.isArray(liveQueue?.items)||
  baselineQueue.items.filter(i=>i.state==='TESTING').length!==63||
  liveQueue.published_base?.tested_source_sha!==inventory.published_source_sha||
  !safePaths(developmentChangedPaths)||typeof firstParentChangedPaths!=='function'||
  typeof sourceObjectAt!=='function')hold('exact queue, source diff or Git readers unavailable');
 if(typeof selectedId!=='string'||!/^DIC-Q-[0-9]+-[a-z0-9-]+$/.test(selectedId))
  hold('one exact baseline TESTING item ID is required');
 const original=baselineQueue.items.find(i=>i.id===selectedId);
 const live=liveQueue.items.find(i=>i.id===selectedId);
 const source=inventory.items.find(i=>i.id===selectedId);
 if(!original||original.state!=='TESTING'||!live||live.state!=='TESTING'||
  source?.live_state!=='TESTING'||source.status!=='SOURCE_ONLY_PROVISIONAL'||
  source.reason!=='NEEDS_FROZEN_CANDIDATE_AND_FIVE_EXACT_CI_CHECKS')
  hold('selected source not independently eligible in Phase 1: '+(source?.reason||'missing'));
 if(!SHA.test(live.merged_source_sha||'')||live.merged_source_sha!==original.merged_source_sha||
  !safePaths(original.scope_paths)||!original.scope_paths.length||
  !original.scope_paths.every(p=>OWNED.test(p))||
  JSON.stringify(sorted(original.scope_paths))!==JSON.stringify(sorted(live.scope_paths||[])))
  hold('frozen merged SHA/owned paths differ from immutable baseline');
 let first;
 try{first=firstParentChangedPaths(live.merged_source_sha);}catch{hold('missing exact first-parent merge diff');}
 if(!safePaths(first)||!first.length)hold('invalid first-parent source diff');
 const deployable=first.filter(p=>OWNED.test(p));
 if(deployable.some(p=>!live.scope_paths.includes(p)))
  hold('first-parent deployable change missing from declared scope');
 if(!live.scope_paths.some(p=>deployable.includes(p)))
  hold('no first-parent deployable feature');
 const support=first.filter(p=>SUPPORT.test(p));
 if(live.scope_paths.includes('package.json')&&
  first.some(p=>/^(?:scripts\/|tests\/|\.github\/workflows\/)/.test(p)))
  hold('package test runner/workflow ownership requires domain reconciliation');
 const kept=sorted([...live.scope_paths,...support]);
 const allChanged=new Set(developmentChangedPaths),selectedBlobs=[];
 for(const path of kept){
  if(!allChanged.has(path))hold('selected path unchanged from published source: '+path);
  let mergeObject,devObject,publishedObject;
  try{
   mergeObject=sourceObjectAt(live.merged_source_sha,path);
   devObject=sourceObjectAt(inventory.development_sha,path);
   publishedObject=sourceObjectAt(inventory.published_source_sha,path);
  }catch{hold('missing source blob proof: '+path);}
  if(!/^100(?:644|755):[a-f0-9]{40}$/.test(mergeObject||'')||
    mergeObject!==devObject||mergeObject===publishedObject)
   hold('selected merge blob not current and unpublished: '+path);
  selectedBlobs.push({path,source_sha:mergeObject});
 }
 const restored=sorted(developmentChangedPaths.filter(p=>REVIEWED.test(p)&&!kept.includes(p)));
 const unsupported=sorted(developmentChangedPaths.filter(p=>
   !REVIEWED.test(p)&&!/^docs\//.test(p)&&!/^\.github\/(?:ISSUE_TEMPLATE\/|PULL_REQUEST_TEMPLATE\/)/.test(p)&&
   !/^(?:README\.md|AGENTS\.md|LICENSE|\.gitignore)$/.test(p)));
 if(unsupported.length)hold('unknown changed-source families: '+unsupported.slice(0,5).join(', '));
 const identity={kind:PROVISIONAL_KIND,baseline_sha:inventory.baseline_dev_sha,
  baseline_blob:inventory.baseline_queue_blob,development_sha:inventory.development_sha,
  published_sha:inventory.published_source_sha,selected_testing_item_id:selectedId,
  merged_source_sha:live.merged_source_sha,selected_blobs:selectedBlobs,
  restored_to_published_paths:restored};
 const fingerprint=createHash('sha256').update(JSON.stringify(identity)).digest('hex');
 return {...identity,fingerprint,candidate_branch:'release-candidates/testing3889-'+fingerprint.slice(0,20),
  retained_first_parent_test_support_paths:support,
  publication_authorized:false,selected_ready_item_ids:[],certified_ready_count:0,
  candidate_sha:null,applicable_candidate_ci:[],status:'PROVISIONAL_SOURCE_PLAN_ONLY'};
}
