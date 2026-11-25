// Nonpublishing audit of the exact already-certified frozen candidate.
// Executes the same source isolation and live CI evidence gates as the
// publisher, but imports no grant, request, provider or release-write path.
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateReadyOnlyCandidate,reviewedProspectivePromotionQueueParity,
 assertCandidateRelativeImports,assertCandidateStaticNamedExports} from './ready-only-candidate.mjs';
import {proposeDisjointProspectiveReadyBatch,BASELINE_QUEUE_BLOB} from './prospective-ready-source.mjs';
import {verifyReadyItems,githubReleaseReaders,certifiedFrozenCandidateRuns,localReadyGitReaders} from './ready-evidence-gate.mjs';
const SHA=/^[a-f0-9]{40}$/;
export async function verifyCertifiedReadyEvidence({developmentSha,token,repoDir=process.cwd()}={}){
 if(!SHA.test(developmentSha||''))throw Error('Exact live development SHA required');
 const git=args=>execFileSync('git',args,{cwd:repoDir,encoding:'utf8',timeout:45000,maxBuffer:8*1024*1024,stdio:['ignore','pipe','pipe']});
 const ref=path=>git(['rev-parse','--verify',path]).trim();
 const raw=(sha,path)=>git(['show',sha+':'+path]);
 const json=(sha,path)=>JSON.parse(raw(sha,path));
 const paths=(a,b)=>git(['diff','--name-only','--no-renames',a,b]).split(/\r?\n/).filter(Boolean);
 const readParents=sha=>git(['rev-list','--parents','-n','1',sha]).trim().split(/\s+/).slice(1);
 const isAncestor=(a,b)=>{try{git(['merge-base','--is-ancestor',a,b]);return true;}catch(e){if(e.status===1)return false;throw e;}};
 const {sourceObjectAt,mergeChangedPaths}=localReadyGitReaders({run:(cmd,args,options)=>execFileSync(cmd,args,{...options,cwd:repoDir})});
 const queueRaw=raw(developmentSha,'docs/RELEASE_QUEUE.json'),queue=JSON.parse(queueRaw);
 const items=queue.items.filter(i=>i.state==='READY');
 if(!items.length)return {status:'NO_READY_ITEMS',count:0};
 if(ref('refs/remotes/origin/development/backend-foundation')!==developmentSha)
  throw Error('Fetched development ref differs from audited source');
 const cert=json(developmentSha,'docs/READY_BATCH_CERTIFICATION.json');
 const sha=cert.candidate_sha,branch=cert.candidate_branch;
 const runs=certifiedFrozenCandidateRuns({queue,certificate:cert,candidateSha:sha,candidateBranch:branch});
 if(ref('refs/remotes/origin/'+branch)!==sha)throw Error('Frozen candidate remote ref moved');
 const pub=queue.published_base.tested_source_sha,release=queue.published_base.release_sha;
 if(!SHA.test(pub||'')||!SHA.test(release||'')||ref('refs/remotes/origin/release/production')!==release||
  json(release,'docs/RELEASE_CONSUMPTION.json').consumed.at(-1)?.tested_source_sha!==pub)
  throw Error('Actual published release/source anchor mismatch');
 const candidateRaw=raw(sha,'docs/RELEASE_QUEUE.json'),candidateQueue=JSON.parse(candidateRaw);
 const manifest=json(sha,'docs/RELEASE_CANDIDATE.json'),anchor=manifest.development_source_sha;
 if(!SHA.test(anchor||''))throw Error('Missing immutable staging parent');
 const originalRaw=raw(anchor,'docs/RELEASE_QUEUE.json');
 const plan=manifest.prospective_ready_batch_preview!==undefined?
  proposeDisjointProspectiveReadyBatch({
   baselineQueue:JSON.parse(git(['cat-file','blob',BASELINE_QUEUE_BLOB])),
   liveQueue:JSON.parse(originalRaw),selectedIds:manifest.prospective_ready_batch_preview.added_ids,
   developmentSourceSha:anchor,firstParentChangedPaths:mergeChangedPaths,isAncestor,sourceObjectAt,readParents,
   sourceTextAt:raw,firstParentPatch:(commit,path)=>git(['diff','--no-color','--no-ext-diff','--no-textconv',
    '--no-renames','--full-index','--no-indent-heuristic','--diff-algorithm=myers','--unified=3',
    '--src-prefix=a/','--dst-prefix=b/',commit+'^',commit,'--',path])
  }):null;
 const changed=paths(pub,sha);
 const gate=validateReadyOnlyCandidate(candidateQueue,{
  manifest,publishedSourceSha:pub,developmentHead:developmentSha,candidateSha:sha,candidateBranch:branch,
  actualParents:[sha,...readParents(sha)],developmentChangedPaths:paths(pub,anchor),
  candidateChangedPaths:changed,stagedCommitChangedPaths:paths(anchor,sha),developmentDriftPaths:paths(anchor,developmentSha),
  queueContentMatches:reviewedProspectivePromotionQueueParity({manifest,originalQueue:originalRaw,
   candidateQueue:candidateRaw,liveQueue:queueRaw,prospectiveBatchPlan:plan}),
  liveQueue:queue,sourceObjectAt,isAncestor,prospectiveBatchPlan:plan
 });
 if(!gate.ready)throw Error('Exact candidate source isolation HOLD: '+gate.errors.join('; '));
 assertCandidateRelativeImports(gate.deployable_paths,{readSource:path=>raw(sha,path),hasPath:path=>sourceObjectAt(sha,path)!==null});
 assertCandidateStaticNamedExports(gate.deployable_paths,{readSource:path=>raw(sha,path),hasPath:path=>sourceObjectAt(sha,path)!==null});
 const selected=new Set(gate.ready_items.map(x=>x.id));
 const report=await verifyReadyItems({queue:candidateQueue,items:candidateQueue.items.filter(i=>selected.has(i.id)),
  ...(await githubReleaseReaders(token)),sourceObjectAt,mergeChangedPaths,currentSourceSha:developmentSha,
  publishedSourceSha:pub,candidateSha:sha,candidateChangedPaths:changed,allowedPinnedPaths:gate.pinned_ready_paths||[],
  frozenCandidateRunIds:runs,frozenCandidateBranch:branch,isAncestor,prospectiveBatchPlan:plan,repoDir});
 if(!report.ready||report.verified.length!==items.length)
  throw Error('Actual frozen publisher-compatible evidence HOLD: '+report.errors.join('; ').slice(0,6000));
 // Every result is read-only, NOT a publish request or grant.
 return {status:'READ_ONLY_CERTIFIED_READY_EVIDENCE_SUCCESS',count:report.verified.length,
  candidate_sha:sha,development_sha:developmentSha,published_source_sha:pub,
  candidate_branch:branch,run_ids:runs,verified_ids:report.verified.map(x=>x.id).sort()};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==3)throw Error('Usage: verify-certified-ready-evidence.mjs <development SHA>');
  console.log('[DIC nonpublishing publisher parity] '+JSON.stringify(await verifyCertifiedReadyEvidence({
   developmentSha:process.argv[2],token:process.env.GITHUB_TOKEN})));
 }catch(e){console.error('[DIC nonpublishing publisher parity] HOLD: '+String(e.message||e).slice(0,6500));process.exitCode=2;}
}
