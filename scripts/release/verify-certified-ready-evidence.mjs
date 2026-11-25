// Nonpublishing audit of the exact already-certified frozen candidate.
// Executes the same source isolation and live CI evidence gates as the
// publisher, but imports no grant, request, provider or release-write path.
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {validateReadyOnlyCandidate,reviewedProspectivePromotionQueueParity,
 assertCandidateRelativeImports,assertCandidateStaticNamedExports} from './ready-only-candidate.mjs';
import {proposeDisjointProspectiveReadyBatch,BASELINE_QUEUE_BLOB} from './prospective-ready-source.mjs';
import {verifyReadyItems,githubReleaseReaders,certifiedFrozenCandidateRuns,localReadyGitReaders} from './ready-evidence-gate.mjs';
const SHA=/^[a-f0-9]{40}$/;
const AUDIT_PATH='docs/workstreams/issue-3889-prospective-publisher-audit.json';
const INPUT_KEYS=['schema_version','kind','development_sha','preflight_blob','candidate_sha','candidate_branch','candidate_queue_blob','run_ids','publication_authorized'].sort();
export function validateProspectivePublisherAuditInput(input,developmentSha){
 if(!input||JSON.stringify(Object.keys(input).sort())!==JSON.stringify(INPUT_KEYS)||
    input.schema_version!==1||input.kind!=='DIC-NONPUBLISHING-PROSPECTIVE-PUBLISHER-AUDIT-3889'||
    input.publication_authorized!==false||!SHA.test(developmentSha||'')||input.development_sha!==developmentSha||
    ![input.preflight_blob,input.candidate_sha,input.candidate_queue_blob].every(x=>typeof x==='string'&&SHA.test(x))||
    !/^release-candidates\/prospectbatch3889-[a-f0-9]{20}$/.test(input.candidate_branch||'')||
    !Array.isArray(input.run_ids)||input.run_ids.length<1||input.run_ids.length>5||
    new Set(input.run_ids).size!==input.run_ids.length||
    input.run_ids.some(x=>!Number.isSafeInteger(x)||x<=0))
  throw Error('Invalid or stale exact prospective publisher audit input');
 return true;
}
export async function verifyCertifiedReadyEvidence({developmentSha,token,repoDir=process.cwd(),prospectiveCandidate=null}={}){
 if(!SHA.test(developmentSha||''))throw Error('Exact live development SHA required');
 const git=args=>execFileSync('git',args,{cwd:repoDir,encoding:'utf8',timeout:45000,maxBuffer:8*1024*1024,stdio:['ignore','pipe','pipe']});
 const ref=path=>git(['rev-parse','--verify',path]).trim();
 const raw=(sha,path)=>git(['show',sha+':'+path]);
 const json=(sha,path)=>JSON.parse(raw(sha,path));
 const paths=(a,b)=>git(['diff','--name-only','--no-renames',a,b]).split(/\r?\n/).filter(Boolean);
 const readParents=sha=>git(['rev-list','--parents','-n','1',sha]).trim().split(/\s+/).slice(1);
 const isAncestor=(a,b)=>{try{git(['merge-base','--is-ancestor',a,b]);return true;}catch(e){if(e.status===1)return false;throw e;}};
 const {sourceObjectAt,mergeChangedPaths}=localReadyGitReaders({run:(cmd,args,options)=>execFileSync(cmd,args,{...options,cwd:repoDir})});
 const actualQueueRaw=raw(developmentSha,'docs/RELEASE_QUEUE.json'),actualQueue=JSON.parse(actualQueueRaw);
 const prospective=prospectiveCandidate!==null;
 if(prospective)validateProspectivePublisherAuditInput(prospectiveCandidate,developmentSha);
 else if(!actualQueue.items.some(i=>i.state==='READY'))return {status:'NO_READY_ITEMS',count:0};
 if(ref('refs/remotes/origin/development/backend-foundation')!==developmentSha)
  throw Error('Fetched development ref differs from audited source');
 const cert=prospective?null:json(developmentSha,'docs/READY_BATCH_CERTIFICATION.json');
 const sha=prospective?prospectiveCandidate.candidate_sha:cert.candidate_sha;
 const branch=prospective?prospectiveCandidate.candidate_branch:cert.candidate_branch;
 if(!SHA.test(sha||'')||!/^release-candidates\/[a-z0-9][a-z0-9-]{2,80}$/.test(branch||'')||
    ref('refs/remotes/origin/'+branch)!==sha)throw Error('Frozen candidate remote ref moved or invalid');
 const candidateRaw=raw(sha,'docs/RELEASE_QUEUE.json'),candidateQueue=JSON.parse(candidateRaw);
 const queueRaw=prospective?candidateRaw:actualQueueRaw,queue=prospective?candidateQueue:actualQueue;
 const items=queue.items.filter(i=>i.state==='READY');
 const runs=prospective?[...prospectiveCandidate.run_ids]:
  certifiedFrozenCandidateRuns({queue,certificate:cert,candidateSha:sha,candidateBranch:branch});
 if(prospective&&(sourceObjectAt(developmentSha,'docs/ai/PREFLIGHT.md')!=='100644:'+prospectiveCandidate.preflight_blob||
   sourceObjectAt(sha,'docs/RELEASE_QUEUE.json')!=='100644:'+prospectiveCandidate.candidate_queue_blob||
   JSON.stringify(queue.published_base)!==JSON.stringify(actualQueue.published_base)))
  throw Error('Prospective audit exact preflight, queue or published anchor mismatch');
 const pub=queue.published_base.tested_source_sha,release=queue.published_base.release_sha;
 if(!SHA.test(pub||'')||!SHA.test(release||'')||ref('refs/remotes/origin/release/production')!==release||
  json(release,'docs/RELEASE_CONSUMPTION.json').consumed.at(-1)?.tested_source_sha!==pub)
  throw Error('Actual published release/source anchor mismatch');
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
 // The virtual promoted queue is used ONLY for a read-only prospective
 // publisher audit. The actual live parent stays TESTING; prove its bytes
 // and the independently replayed selected plan before using virtual parity.
 if(prospective&&(!plan||anchor!==developmentSha||originalRaw!==actualQueueRaw||
    candidateRaw!==JSON.stringify(plan.queue,null,2)+'\n'||
    !manifest.prospective_ready_batch_preview?.added_ids?.length||
    manifest.publication_authorized!==false))
  throw Error('Prospective publisher audit requires exact live TESTING parent and independently replayed candidate');
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
 return {status:prospective?'READ_ONLY_PROSPECTIVE_PUBLISHER_EVIDENCE_SUCCESS':'READ_ONLY_CERTIFIED_READY_EVIDENCE_SUCCESS',count:report.verified.length,
  candidate_sha:sha,development_sha:developmentSha,published_source_sha:pub,
  candidate_branch:branch,run_ids:runs,verified_ids:report.verified.map(x=>x.id).sort()};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==3&&(process.argv.length!==4||process.argv[3]!==AUDIT_PATH))
   throw Error('Usage: verify-certified-ready-evidence.mjs <development SHA> [exact prospective audit path]');
  const prospectiveCandidate=process.argv.length===4?JSON.parse(readFileSync(AUDIT_PATH,'utf8')):null;
  console.log('[DIC nonpublishing publisher parity] '+JSON.stringify(await verifyCertifiedReadyEvidence({
   developmentSha:process.argv[2],token:process.env.GITHUB_TOKEN,prospectiveCandidate})));
 }catch(e){console.error('[DIC nonpublishing publisher parity] HOLD: '+String(e.message||e).slice(0,6500));process.exitCode=2;}
}
