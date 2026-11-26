// Build a READY-only candidate locally; no Netlify/provider or production write.
// --push publishes the candidate REF for CI only (not an app deployment).
// Reuse only immutable Git SHA:path and ancestry proofs within ONE staging call.
// Cache misses are exact absent blobs; failures remain failures, never cached.
export function memoizeImmutableGitRead(reader){
 if(typeof reader!=='function')throw Error('Immutable Git reader unavailable');
 const values=new Map();
 return (...args)=>{
  const key=JSON.stringify(args);
  if(values.has(key))return values.get(key);
  const result=reader(...args); // Never memoize errors or transport failures.
  values.set(key,result); // Includes a proved missing blob (null/false).
  return result;
 };
}
// One exact immutable tree inventory per commit replaces thousands of repeated
// ls-tree subprocesses. Directory/symlink modes remain errors when requested;
// absent entries are proved by the complete NUL-delimited tree, never guessed.
export function createImmutableGitObjectReader(readTree){
 if(typeof readTree!=='function')throw Error('Immutable Git tree reader unavailable');
 const trees=new Map(),paths=new Map(),objects=new Map();
 const intern=(pool,value)=>{if(!pool.has(value))pool.set(value,value);return pool.get(value);};
 return (ref,path)=>{
  if(!/^[a-f0-9]{40}$/.test(ref||''))throw Error('Git tree cache requires an exact immutable commit SHA');
  if(typeof path!=='string'||!path||/[\\\u0000\r\n]/.test(path)||
   path.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('Unsafe immutable tree path');
  if(!trees.has(ref)){
   const raw=readTree(ref);
   if(typeof raw!=='string'||(raw&&!raw.endsWith('\0')))throw Error('Incomplete exact Git tree inventory');
   const entries=new Map();
   for(const line of raw.split('\0').filter(Boolean)){
    const match=/^([0-7]{6}) (blob|tree|commit) ([a-f0-9]{40})\t([^\0]+)$/.exec(line);
    if(!match||entries.has(match[4]))throw Error('Malformed or duplicate exact Git tree entry');
    entries.set(intern(paths,match[4]),intern(objects,match[1]+':'+match[2]+':'+match[3]));
   }
   trees.set(ref,entries); // Do not memoize a failed or partial inventory.
  }
  const entry=trees.get(ref).get(path);
  if(entry===undefined)return null;
  const regular=/^(100644|100755):blob:([a-f0-9]{40})$/.exec(entry);
  if(!regular)throw Error('Unexpected source object or unsafe mode: '+path);
  return regular[1]+':'+regular[2];
 };
}
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {CANDIDATE_KIND,CANDIDATE_JOURNAL_PATH,CANDIDATE_RECEIPT_PATH,
 planReadyOnlyCandidate,validateReadyOnlyCandidate,workflowChangedPaths,
 discoverReviewedBatchQaRestoration,discoverReviewedWorkflowTestExclusions,discoverExcludedUnreadyTests,discoverCompatibleAuditSupport,discoverReviewedRestoredSqlTests,discoverReviewedRestoredR232CoffeeTests,discoverReviewedRestoredUnreadyAdminTests,discoverReviewedRestoredStartupTests,REVIEWED_COMPATIBLE_AUDIT_SUPPORT,
 assertCandidateRelativeImports,assertCandidateStaticNamedExports} from './ready-only-candidate.mjs';
import {classifyReleaseRisk} from './release-reliability.mjs';
import {proposeProspectiveReadyQueue,proposeDisjointProspectiveReadyBatch,BASELINE_QUEUE_BLOB} from './prospective-ready-source.mjs';
import {reviewedMemberBrokerPlannedObject} from './reviewed-member-broker-source.mjs';
const SHA=/^[a-f0-9]{40}$/;
const BRANCH=/^release-candidates\/[a-z0-9][a-z0-9-]{2,80}$/;
const ZERO='0'.repeat(40);
export function stageReadyOnlyCandidate({repoDir=process.cwd(),developmentSourceSha,
 selectedIds,branch,pinnedReadyPaths=[],createLocalRef=true,
 prospectiveReadyItemId=null,prospectiveReadyItemIds=null}={}){
 if(!SHA.test(developmentSourceSha||'')||!BRANCH.test(branch||''))
  throw Error('Candidate staging requires an exact development commit and safe release-candidates/<slug> branch');
 const git=(args,{env=process.env,input,trim=true}={})=>{
  const s=execFileSync('git',args,{cwd:repoDir,env,input,encoding:'utf8',
   timeout:20000,maxBuffer:4_000_000,stdio:['pipe','pipe','pipe']});
  return trim?s.trim():s;
 };
 const queueRaw=git(['show',developmentSourceSha+':docs/RELEASE_QUEUE.json'],{trim:false});
 let queue=JSON.parse(queueRaw),prospective=null,batch=null,stagedQueueRaw=queueRaw;
 if(prospectiveReadyItemId!==null&&prospectiveReadyItemIds!==null)
  throw Error('Select only one prospective preparation mode');
 const publishedSourceSha=queue.published_base?.tested_source_sha;
 if(!SHA.test(publishedSourceSha||''))throw Error('Invalid actual published source in queue');
 const ancestor=memoizeImmutableGitRead((a,b)=>{
  try{execFileSync('git',['merge-base','--is-ancestor',a,b],{cwd:repoDir,stdio:'ignore',timeout:15000});return true;}
  catch(e){if(e.status===1)return false;throw Error('Missing Git ancestry evidence');}
 });
 const changed=(a,b)=>git(['diff','--name-only','--no-renames',a,b]).split(/\r?\n/).filter(Boolean);
 const treeObject=createImmutableGitObjectReader(ref=>git(['ls-tree','-r','-t','-z','--full-tree',ref],{trim:false}));
 const exactImmutableRef=memoizeImmutableGitRead(ref=>{
  if(SHA.test(ref||''))return ref;
  // Only parent expressions rooted in a full immutable SHA may be resolved.
  // Never cache HEAD, branch names, tags or arbitrary caller-supplied revspecs.
  if(!/^[a-f0-9]{40}\^(?:[1-9][0-9]*)?$/.test(ref||''))throw Error('Mutable source ref cannot enter exact Git tree cache');
  const resolved=git(['rev-parse','--verify',ref+'^{commit}']);
  if(!SHA.test(resolved))throw Error('Missing exact historical parent commit');
  return resolved;
 });
 const sourceObjectAt=memoizeImmutableGitRead((ref,path)=>treeObject(exactImmutableRef(ref),path));
 const lastReviewedReadyObject=(owners,path)=>{
  if(!owners.length)throw Error('No selected READY owner for '+path);
  const componentObjects=owners.map(row=>reviewedMemberBrokerPlannedObject({row,path,plan:batch,sourceObjectAt})).filter(Boolean);
  if(componentObjects.length){
   if(owners.length!==1||componentObjects.length!==1)throw Error('Member component overlaps another selected owner');
   return componentObjects[0];
  }
  // A co-selected same-file dependency is valid ONLY with one exact
  // chronologically latest reviewed merge. Never use queue entry order.
  const tips=owners.filter(tip=>owners.every(owner=>
   owner===tip||ancestor(owner.merged_source_sha,tip.merged_source_sha)===true));
  if(tips.length!==1)throw Error('Selected READY same-file merge ancestry is ambiguous: '+path);
  const object=sourceObjectAt(tips[0].merged_source_sha,path);
  if(!object)throw Error('Last selected READY merge lacks file: '+path);
  return object;
 };
 if(prospectiveReadyItemId!==null){
  if(selectedIds?.length!==1||selectedIds[0]!==prospectiveReadyItemId||
     !/^release-candidates\/prospect3889-[a-f0-9]{20}$/.test(branch))
   throw Error('Prospective READY preview requires sole selected ID and immutable nonpublishing prospect3889 branch');
  const baseline=JSON.parse(git(['cat-file','blob',BASELINE_QUEUE_BLOB],{trim:false}));
  prospective=proposeProspectiveReadyQueue({baselineQueue:baseline,liveQueue:queue,
   selectedId:prospectiveReadyItemId,developmentSourceSha,
   firstParentChangedPaths:sha=>changed(sha+'^',sha),isAncestor:ancestor,sourceObjectAt});
  queue=prospective.queue;
  stagedQueueRaw=JSON.stringify(queue,null,2)+'\n';
 }
 if(prospectiveReadyItemIds!==null){
  if(createLocalRef||!/^release-candidates\/prospectbatch3889-[a-f0-9]{20}$/.test(branch))
   throw Error('Prospective batch preparation is local receipt-only; no ref creation');
  const baselineQueue=JSON.parse(git(['cat-file','blob',BASELINE_QUEUE_BLOB],{trim:false}));
  batch=proposeDisjointProspectiveReadyBatch({baselineQueue,liveQueue:queue,
   selectedIds:prospectiveReadyItemIds,developmentSourceSha,
   firstParentChangedPaths:sha=>changed(sha+'^',sha),isAncestor:ancestor,sourceObjectAt,
   readParents:sha=>git(['rev-list','--parents','-n','1',sha]).trim().split(/\s+/).slice(1),
   sourceTextAt:(ref,path)=>git(['show',ref+':'+path],{trim:false}),
   firstParentPatch:(sha,path)=>git(['diff','--no-color','--no-ext-diff','--no-textconv','--no-renames',
    '--full-index','--no-indent-heuristic','--diff-algorithm=myers','--unified=3','--src-prefix=a/','--dst-prefix=b/',sha+'^',sha,'--',path],{trim:false})});
  const all=batch.queue.items.filter(i=>i.state==='READY').map(i=>i.id).sort();
  if(!Array.isArray(selectedIds)||JSON.stringify([...selectedIds].sort())!==JSON.stringify(all))
   throw Error('Prospective batch must retain every current READY and select exactly the planned additions');
  queue=batch.queue;stagedQueueRaw=JSON.stringify(queue,null,2)+'\n';
 }
 const coffee=batch?.coffeeSourceProof||null;
 const batchQaPaths=batch?discoverReviewedBatchQaRestoration({queue,selectedIds,
  publishedSourceSha,developmentSourceSha,sourceObjectAt,prospectiveBatchPlan:batch}):[];
 const developmentPaths=changed(publishedSourceSha,developmentSourceSha);
 const unpublishedWorkflows=workflowChangedPaths(developmentPaths);
 const workflowOnlyTests=discoverReviewedWorkflowTestExclusions({
  publishedSourceSha,developmentSourceSha,restoredWorkflows:unpublishedWorkflows,sourceObjectAt,selectedIds,coffeeSourceProof:coffee
 });
 const plan=planReadyOnlyCandidate(queue,{publishedSourceSha,developmentSourceSha,
  selectedIds,pinnedReadyPaths,developmentChangedPaths:developmentPaths,isAncestor:ancestor,sourceObjectAt,
  coffeeSourceProof:coffee});
 if(!plan.ready)throw Error('READY-only staging HOLD: '+plan.errors.join('; '));
 const compatibleAuditSupport=discoverCompatibleAuditSupport({queue,
  restoredPaths:plan.restored_paths,pinnedReadyPaths:plan.pinned_ready_paths,
  publishedSourceSha,developmentSourceSha,sourceObjectAt,
  selectedReadyItems:plan.ready_items});
 const unpublishedTests=discoverExcludedUnreadyTests({queue,selectedIds:plan.selected_ids,
  restoredPaths:plan.restored_paths,pinnedReadyPaths:plan.pinned_ready_paths,
  publishedSourceSha,developmentSourceSha,changedPaths:developmentPaths,sourceObjectAt,
  compatibleAuditSupportPaths:compatibleAuditSupport});
 const restoredSqlTests=discoverReviewedRestoredSqlTests({
  queue,restoredPaths:plan.restored_paths,publishedSourceSha,
  developmentSourceSha,sourceObjectAt,selectedReadyItems:plan.ready_items
 });
 const restoredR232Tests=discoverReviewedRestoredR232CoffeeTests({
  queue,restoredPaths:plan.restored_paths,publishedSourceSha,
  developmentSourceSha,sourceObjectAt,selectedReadyItems:plan.ready_items});
 const restoredAdminTests=discoverReviewedRestoredUnreadyAdminTests({
  queue,restoredPaths:plan.restored_paths,publishedSourceSha,
  developmentSourceSha,sourceObjectAt,selectedReadyItems:plan.ready_items
 });
 const restoredStartupTests=discoverReviewedRestoredStartupTests({queue,
   pinnedReadyPaths:plan.pinned_ready_paths,publishedSourceSha,
   developmentSourceSha,sourceObjectAt,selectedReadyItems:plan.ready_items});
  const restoredTests=[...restoredSqlTests,...restoredR232Tests,...restoredAdminTests,
   ...restoredStartupTests].sort();
 // A later untracked same-file edit must not be smuggled under a READY scope.
 for(const path of plan.included_paths){
  if(coffee?.runtimeObjects[path])continue; // exact selected-only reconstruction has its own verified objects
  const owners=plan.ready_items.filter(i=>i.scope_paths.includes(path));
  const selectedObject=lastReviewedReadyObject(owners,path);
  if(plan.pinned_ready_paths.includes(path)){
   if(selectedObject===sourceObjectAt(developmentSourceSha,path))
    throw Error('READY-only staging HOLD: cannot pin a different approved READY blob: '+path);
  }else if(selectedObject!==sourceObjectAt(developmentSourceSha,path))
   throw Error('READY-only staging HOLD: unapproved same-file content after READY merge: '+path);
 }
 const temp=mkdtempSync(join(tmpdir(),'dic-ready-stage-'));
 try{
  const env={...process.env,GIT_INDEX_FILE:join(temp,'index'),
   GIT_AUTHOR_NAME:'DIC READY candidate staging',GIT_AUTHOR_EMAIL:'ready-candidate@users.noreply.github.com',
   GIT_COMMITTER_NAME:'DIC READY candidate staging',GIT_COMMITTER_EMAIL:'ready-candidate@users.noreply.github.com'};
  git(['read-tree',developmentSourceSha],{env});
  if(prospective||batch){
   const blob=git(['hash-object','-w','--stdin'],{env,input:stagedQueueRaw});
   if(!SHA.test(blob))throw Error('Prospective READY queue blob could not be frozen');
   git(['update-index','--add','--cacheinfo','100644',blob,'docs/RELEASE_QUEUE.json'],{env});
  }
  for(const path of [...plan.restored_paths,...unpublishedWorkflows,...batchQaPaths]){

   const object=sourceObjectAt(publishedSourceSha,path);
   if(object){const [mode,sha]=object.split(':');
    git(['update-index','--add','--cacheinfo',mode,sha,path],{env});}
   else git(['update-index','--force-remove','--',path],{env});
  }
  for(const path of plan.pinned_ready_paths){
   if(coffee?.runtimeObjects[path])continue;
   const owners=plan.ready_items.filter(i=>i.scope_paths.includes(path));
   const object=lastReviewedReadyObject(owners,path);
   const [mode,sha]=object.split(':');
   git(['update-index','--add','--cacheinfo',mode,sha,path],{env});
  }
  for(const path of [...workflowOnlyTests,...unpublishedTests])
   git(['update-index','--force-remove','--',path],{env});
  for(const path of compatibleAuditSupport)
   git(['update-index','--add','--cacheinfo','100644',
     REVIEWED_COMPATIBLE_AUDIT_SUPPORT.historicalBlobSha,path],{env});
  for(const path of restoredTests){
   const object=sourceObjectAt(publishedSourceSha,path);
   if(object){
    const [mode,sha]=object.split(':');
    git(['update-index','--add','--cacheinfo',mode,sha,path],{env});
   }else git(['update-index','--force-remove','--',path],{env});
  }
  if(coffee)for(const [path,object] of Object.entries(coffee.objects)){
   if(object===null){git(['update-index','--force-remove','--',path],{env});continue;}
   const hash=git(['hash-object','-w','--stdin'],{env,input:coffee.texts[path]});
   if(object!=='100644:'+hash)throw Error('Selected coffee reconstructed text/blob changed '+path);
   git(['update-index','--add','--cacheinfo','100644',hash,path],{env});
  }
  const manifest={schema_version:1,kind:CANDIDATE_KIND,candidate_branch:branch,
   development_source_sha:developmentSourceSha,published_source_sha:publishedSourceSha,
   selected_ready_item_ids:plan.selected_ids,risk_classification:classifyReleaseRisk(plan.included_paths),
   restored_to_published_paths:plan.restored_paths,
   pinned_to_ready_paths:plan.pinned_ready_paths,
   restored_compatible_audit_support_paths:compatibleAuditSupport,
   restored_unpublished_workflow_paths:unpublishedWorkflows,
   excluded_unpublished_workflow_test_paths:workflowOnlyTests,
   excluded_unready_test_paths:unpublishedTests,
   restored_to_published_unready_test_paths:restoredTests,
   publication_authorized:false,
   ...(coffee?{reviewed_coffee_source_component:coffee.receipt}:{}),
   ...(batchQaPaths.length?{restored_reviewed_batch_qa_paths:batchQaPaths}:{}),
   ...(prospective?{prospective_ready_preview:{status:prospective.status,
    selected_id:prospective.selected_id,baseline_queue_blob:BASELINE_QUEUE_BLOB,
    identity_sha256:prospective.identity_sha256}}:{}),
   ...(batch?{prospective_ready_batch_preview:{status:batch.status,
    baseline_queue_blob:BASELINE_QUEUE_BLOB,added_ids:batch.added_ids,
    retained_ready_ids:batch.retained_ready_ids,identity_sha256:batch.identity_sha256,
    ...(batch.additional_source_components?{additional_source_components:batch.additional_source_components}:{}),
    ...(batch.member_receipt_reconciliation?{member_receipt_reconciliation:batch.member_receipt_reconciliation}:{}),
    publication_authorized:false,ready_certified:false}}:{})};
  // New candidate Git commits change code/workflows, so carry a fresh
  // exact-parent journal receipt validated by approval continuity.
  let preflightBlob,preflightText;
  try{
   preflightBlob=git(['rev-parse','--verify',developmentSourceSha+':docs/ai/PREFLIGHT.md']);
   preflightText=git(['show',developmentSourceSha+':docs/ai/PREFLIGHT.md'],{trim:false});
  }catch{throw Error('Candidate staging HOLD: source preflight object missing from exact development parent');}
  if(!SHA.test(preflightBlob)||!preflightText.startsWith('# Mandatory starting point for EVERY DIC task'))
   throw Error('Candidate staging HOLD: invalid exact development preflight source/blob');
  const originalJournal=git(['show',developmentSourceSha+':'+CANDIDATE_JOURNAL_PATH],{trim:false});
  const journal=originalJournal.trimEnd()+'\n\n'+
   'DIC_PREFLIGHT_VERIFIED development_sha='+developmentSourceSha+
   ' preflight_blob_sha='+preflightBlob+
   '\n\n## READY-only source candidate (not published)\n'+
   '- Development parent: '+developmentSourceSha+'\n'+
   '- Published baseline: '+publishedSourceSha+'\n'+
   '- Selected READY IDs: '+plan.selected_ids.join(', ')+'\n'+
   (prospective||batch?'- PROSPECTIVE ONLY: development queue additions are still TESTING; no READY claim, certificate, production grant or Publish.\n':'')+
   '- Restored reviewed nonshipped batch QA paths: '+(batchQaPaths.join(', ')||'(none)')+'\n'+
   '- Restored unfinished paths: '+(plan.restored_paths.join(', ')||'(none)')+'\n'+
   '- Pinned READY mixed-source paths: '+(plan.pinned_ready_paths.join(', ')||'(none)')+'\n'+
   '- Restored previously reviewed compatible audit helper: '+(compatibleAuditSupport.join(', ')||'(none)')+'\n'+
   '- Restored development-only GitHub workflows to published bytes: '+(unpublishedWorkflows.join(', ')||'(none)')+'\n'+
   '- Omitted exact reviewed workflow-only, unpublished tests: '+(workflowOnlyTests.join(', ')||'(none)')+'\n'+
   '- Omitted source-bound unready issue tests: '+(unpublishedTests.join(', ')||'(none)')+'\n'+
   '- Restored full last-published regressions for unfinished SQL/coffee source: '+(restoredTests.join(', ')||'(none)')+'\n'+
   '- Exact candidate CI and separate owner publication authorization required. No production claim.\n';
  for(const [path,content] of [[CANDIDATE_RECEIPT_PATH,JSON.stringify(manifest,null,2)+'\n'],
   [CANDIDATE_JOURNAL_PATH,journal]]){
   const blob=git(['hash-object','-w','--stdin'],{env,input:content});
   if(!SHA.test(blob))throw Error('Unable to stage source manifest/journal');
   git(['update-index','--add','--cacheinfo','100644',blob,path],{env});
  }
  const tree=git(['write-tree'],{env});
  const commit=git(['commit-tree',tree,'-p',developmentSourceSha,'-m',
   'Stage exact READY-only source: '+branch+' [skip netlify]'],{env});
  if(!SHA.test(commit))throw Error('No candidate Git commit');
  validateReadyOnlyCandidate(queue,{manifest,publishedSourceSha,developmentHead:developmentSourceSha,
   candidateSha:commit,candidateBranch:branch,
   actualParents:git(['rev-list','--parents','-n','1',commit]).split(/\s+/),
   developmentChangedPaths:changed(publishedSourceSha,developmentSourceSha),
   candidateChangedPaths:changed(publishedSourceSha,commit),
   stagedCommitChangedPaths:changed(developmentSourceSha,commit),
   developmentDriftPaths:[],liveQueue:queue,queueContentMatches:stagedQueueRaw===
    git(['show',commit+':docs/RELEASE_QUEUE.json'],{trim:false}),
   sourceObjectAt,isAncestor:ancestor,prospectiveBatchPlan:batch});
  assertCandidateRelativeImports(plan.included_paths,{
   readSource:path=>git(['show',commit+':'+path]),
   hasPath:path=>sourceObjectAt(commit,path)!==null
  });
  assertCandidateStaticNamedExports(plan.included_paths,{
   readSource:path=>git(['show',commit+':'+path]),
   hasPath:path=>sourceObjectAt(commit,path)!==null
  });
  if(createLocalRef)
   git(['update-ref','refs/heads/'+branch,commit,ZERO]);
  return {candidate_sha:commit,branch,manifest,plan,
   prospective_status:prospective?.status||batch?.status||null};
 }finally{rmSync(temp,{recursive:true,force:true});}
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 try{
  const [developmentSourceSha,branch,ids,...flags]=process.argv.slice(2);
  const push=flags.includes('--push');
  const pins=flags.filter(x=>x.startsWith('--pin=')).map(x=>x.slice(6));
  const proposals=flags.filter(x=>x.startsWith('--prospective='));
  if(!ids||flags.some(x=>x!=='--push'&&!x.startsWith('--pin=')&&!x.startsWith('--prospective='))||
     proposals.length>1||
     flags.filter(x=>x==='--push').length>1||
     pins.some(x=>!x||x.includes(',')||!x.includes('/')))
   throw Error('Usage: node stage-ready-only-candidate.mjs <dev SHA> <release-candidates/name> <READY ID[,ID]> [--pin=path] [--push]');
  const result=stageReadyOnlyCandidate({developmentSourceSha,branch,
    selectedIds:ids.split(','),pinnedReadyPaths:pins,
   prospectiveReadyItemId:proposals[0]?.slice('--prospective='.length)||null});
  if(push){
   execFileSync('git',['push','--porcelain','origin',result.candidate_sha+':refs/heads/'+branch],
    {encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']});
   const remote=execFileSync('git',['ls-remote','origin','refs/heads/'+branch],
    {encoding:'utf8',timeout:15000}).trim().split(/\s+/)[0];
   if(remote!==result.candidate_sha)throw Error('Candidate remote ref does not match exact staged SHA');
  }
  console.log('[DIC candidate source] '+JSON.stringify({status:push?'CI_PENDING':'STAGED_LOCAL_ONLY',
   candidate_sha:result.candidate_sha,branch:result.branch,
   selected_ready_ids:result.manifest.selected_ready_item_ids,
   prospective_status:result.prospective_status,
   excluded_paths:result.plan.restored_paths}));
 }catch(e){console.error('[DIC candidate HOLD] '+e.message);process.exitCode=2;}
}
