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
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {CANDIDATE_KIND,CANDIDATE_JOURNAL_PATH,CANDIDATE_RECEIPT_PATH,
 planReadyOnlyCandidate,validateReadyOnlyCandidate,workflowChangedPaths,
 discoverReviewedWorkflowTestExclusions,discoverExcludedUnreadyTests,discoverCompatibleAuditSupport,discoverReviewedRestoredSqlTests,discoverReviewedRestoredR232CoffeeTests,discoverReviewedRestoredUnreadyAdminTests,discoverReviewedRestoredStartupTests,REVIEWED_COMPATIBLE_AUDIT_SUPPORT,
 assertCandidateRelativeImports,assertCandidateStaticNamedExports} from './ready-only-candidate.mjs';
import {classifyReleaseRisk} from './release-reliability.mjs';
const SHA=/^[a-f0-9]{40}$/;
const BRANCH=/^release-candidates\/[a-z0-9][a-z0-9-]{2,80}$/;
const ZERO='0'.repeat(40);
export function stageReadyOnlyCandidate({repoDir=process.cwd(),developmentSourceSha,
 selectedIds,branch,pinnedReadyPaths=[],createLocalRef=true}={}){
 if(!SHA.test(developmentSourceSha||'')||!BRANCH.test(branch||''))
  throw Error('Candidate staging requires an exact development commit and safe release-candidates/<slug> branch');
 const git=(args,{env=process.env,input,trim=true}={})=>{
  const s=execFileSync('git',args,{cwd:repoDir,env,input,encoding:'utf8',
   timeout:20000,maxBuffer:4_000_000,stdio:['pipe','pipe','pipe']});
  return trim?s.trim():s;
 };
 const queueRaw=git(['show',developmentSourceSha+':docs/RELEASE_QUEUE.json'],{trim:false});
 const queue=JSON.parse(queueRaw);
 const publishedSourceSha=queue.published_base?.tested_source_sha;
 if(!SHA.test(publishedSourceSha||''))throw Error('Invalid actual published source in queue');
 const ancestor=memoizeImmutableGitRead((a,b)=>{
  try{execFileSync('git',['merge-base','--is-ancestor',a,b],{cwd:repoDir,stdio:'ignore',timeout:15000});return true;}
  catch(e){if(e.status===1)return false;throw Error('Missing Git ancestry evidence');}
 });
 const changed=(a,b)=>git(['diff','--name-only','--no-renames',a,b]).split(/\r?\n/).filter(Boolean);
 const sourceObjectAt=memoizeImmutableGitRead((ref,path)=>{
  const lines=git(['ls-tree','-z',ref,'--',path],{trim:false}).split('\0').filter(Boolean);
  if(!lines.length)return null;
  if(lines.length!==1)throw Error('Ambiguous source entry: '+path);
  const m=/^(100644|100755) blob ([0-9a-f]{40})\t(.+)$/.exec(lines[0]);
  if(!m||m[3]!==path)throw Error('Unexpected source object or unsafe mode: '+path);
  return m[1]+':'+m[2];
 });
 const lastReviewedReadyObject=(owners,path)=>{
  if(!owners.length)throw Error('No selected READY owner for '+path);
  // A co-selected same-file dependency is valid ONLY with one exact
  // chronologically latest reviewed merge. Never use queue entry order.
  const tips=owners.filter(tip=>owners.every(owner=>
   owner===tip||ancestor(owner.merged_source_sha,tip.merged_source_sha)===true));
  if(tips.length!==1)throw Error('Selected READY same-file merge ancestry is ambiguous: '+path);
  const object=sourceObjectAt(tips[0].merged_source_sha,path);
  if(!object)throw Error('Last selected READY merge lacks file: '+path);
  return object;
 };
 const developmentPaths=changed(publishedSourceSha,developmentSourceSha);
 const unpublishedWorkflows=workflowChangedPaths(developmentPaths);
 const workflowOnlyTests=discoverReviewedWorkflowTestExclusions({
  publishedSourceSha,developmentSourceSha,restoredWorkflows:unpublishedWorkflows,sourceObjectAt
 });
 const plan=planReadyOnlyCandidate(queue,{publishedSourceSha,developmentSourceSha,
  selectedIds,pinnedReadyPaths,developmentChangedPaths:developmentPaths,isAncestor:ancestor,sourceObjectAt});
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
  for(const path of [...plan.restored_paths,...unpublishedWorkflows]){

   const object=sourceObjectAt(publishedSourceSha,path);
   if(object){const [mode,sha]=object.split(':');
    git(['update-index','--add','--cacheinfo',mode,sha,path],{env});}
   else git(['update-index','--force-remove','--',path],{env});
  }
  for(const path of plan.pinned_ready_paths){
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
   publication_authorized:false};
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
   developmentDriftPaths:[],liveQueue:queue,queueContentMatches:queueRaw===
    git(['show',commit+':docs/RELEASE_QUEUE.json'],{trim:false}),
   sourceObjectAt,isAncestor:ancestor});
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
  return {candidate_sha:commit,branch,manifest,plan};
 }finally{rmSync(temp,{recursive:true,force:true});}
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 try{
  const [developmentSourceSha,branch,ids,...flags]=process.argv.slice(2);
  const push=flags.includes('--push');
  const pins=flags.filter(x=>x.startsWith('--pin=')).map(x=>x.slice(6));
  if(!ids||flags.some(x=>x!=='--push'&&!x.startsWith('--pin='))||
     flags.filter(x=>x==='--push').length>1||
     pins.some(x=>!x||x.includes(',')||!x.includes('/')))
   throw Error('Usage: node stage-ready-only-candidate.mjs <dev SHA> <release-candidates/name> <READY ID[,ID]> [--pin=path] [--push]');
  const result=stageReadyOnlyCandidate({developmentSourceSha,branch,
    selectedIds:ids.split(','),pinnedReadyPaths:pins});
  if(push){
   execFileSync('git',['push','--porcelain','origin',result.candidate_sha+':refs/heads/'+branch],
    {encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']});
   const remote=execFileSync('git',['ls-remote','origin','refs/heads/'+branch],
    {encoding:'utf8',timeout:15000}).trim().split(/\s+/)[0];
   if(remote!==result.candidate_sha)throw Error('Candidate remote ref does not match exact staged SHA');
  }
  console.log('[DIC candidate source] '+JSON.stringify({status:push?'CI_PENDING':'STAGED_LOCAL_ONLY',
   candidate_sha:result.candidate_sha,branch:result.branch,
   selected_ready_ids:result.manifest.selected_ready_item_ids,excluded_paths:result.plan.restored_paths}));
 }catch(e){console.error('[DIC candidate HOLD] '+e.message);process.exitCode=2;}
}
