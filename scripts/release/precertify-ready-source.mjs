// Owner-authorized nonpublishing READY pre-certification (#3347).
// Dry-run stages only disposable local Git objects. The Actions token cannot
// change workflow files or trigger downstream push CI. Hosted --push writes a
// workflow-neutral TRANSPORT ref only; a separate authorized connector actor
// must restore exact published workflow objects and start candidate CI.
// It never stages a production ref, creates a grant or contacts Netlify.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {stageReadyOnlyCandidate} from './stage-ready-only-candidate.mjs';
import {deployableChangedPaths,queueSchemaErrors} from './release-queue.mjs';
const SHA=/^[a-f0-9]{40}$/;
const REPO='Schulzet3/The-Dial-In-Collective';
const sorted=xs=>[...new Set(xs)].sort();
export function selectedReadyItems(queue){
 const failures=queueSchemaErrors(queue);
 if(failures.length)throw Error('READY queue schema HOLD: '+failures.slice(0,5).join('; '));
 return (queue.items||[]).filter(x=>x.state==='READY').sort((a,b)=>a.id.localeCompare(b.id));
}
export function requiredReadyPins(queue,ids,developmentChangedPaths,{
 developmentSourceSha,sourceObjectAt,isAncestor}={}){
 if(!Array.isArray(developmentChangedPaths)||!Array.isArray(ids)||
    ids.some(x=>typeof x!=='string')||new Set(ids).size!==ids.length)
  throw Error('READY pin source/selection unavailable');
 const selected=new Set(ids);
 const ready=selectedReadyItems(queue);
 if(ids.some(id=>!ready.some(item=>item.id===id)))
  throw Error('Selected READY item not source-certified in current queue');
 return deployableChangedPaths(developmentChangedPaths).filter(path=>{
  const owners=(queue.items||[]).filter(item=>item.scope_paths?.includes(path));
  const chosen=owners.filter(i=>selected.has(i.id)&&i.state==='READY');
  const competing=owners.filter(i=>!selected.has(i.id)&&i.state!=='DEPLOYED');
  if(!chosen.length||!competing.length)return false;
  // Exact-byte parity is the ONLY safe reason to skip a never-merged issue's
  // stale shared-file queue label. Otherwise require the real READY pin.
  if(SHA.test(developmentSourceSha||'')&&typeof sourceObjectAt==='function'&&
     typeof isAncestor==='function'&&
     competing.every(i=>i.state!=='READY'&&!SHA.test(i.merged_source_sha||''))){
   try{
    const tips=chosen.filter(tip=>chosen.every(owner=>owner===tip||
     isAncestor(owner.merged_source_sha,tip.merged_source_sha)===true));
    if(tips.length===1){
     const frozen=sourceObjectAt(tips[0].merged_source_sha,path);
     if(frozen&&frozen===sourceObjectAt(developmentSourceSha,path))return false;
    }
   }catch{throw Error('Precert READY source ancestry/parity unavailable: '+path);}
  }
  return true; // actual mixed source, unknown proof or merged competitor: pin/HOLD
 });
}
export function frozenReadyBranch(queue,items){
 if(!items.length)throw Error('Cannot freeze an empty READY batch');
 const identity=JSON.stringify({
  stage_contract:'READY3347-SAME-COMMIT-PREFLIGHT-V2',
  base:queue.published_base?.tested_source_sha,
  selected:items.map(i=>[i.id,i.merged_source_sha,sorted(i.scope_paths||[]),
   sorted(i.ci_runs||[])])
 });
 const hash=createHash('sha256').update(identity).digest('hex').slice(0,20);
 return 'release-candidates/ready3347-'+hash;
}
// Transport is a Git object transfer ONLY. The final candidate is never
// published from this transport SHA; its exact reviewed workflows are restored
// by a different write-authorized actor before the five official CI jobs.
export function neutralWorkflowTransportCommit({repoDir=process.cwd(),developmentSourceSha,
 candidateSha,workflowPaths=[]}={}){
 if(!SHA.test(developmentSourceSha||'')||!SHA.test(candidateSha||'')||
    !Array.isArray(workflowPaths)||workflowPaths.some(path=>
     typeof path!=='string'||!/^\.github\/workflows\/[A-Za-z0-9_.\/-]+\.ya?ml$/.test(path))||
    new Set(workflowPaths).size!==workflowPaths.length)
  throw Error('Unsafe transport Git refs or workflow inventory');
 const tmp=mkdtempSync(join(tmpdir(),'dic-ready-transport-'));
 try{
  const env={...process.env,GIT_INDEX_FILE:join(tmp,'index'),
   GIT_AUTHOR_NAME:'DIC READY transport',GIT_AUTHOR_EMAIL:'ready-transport@users.noreply.github.com',
   GIT_COMMITTER_NAME:'DIC READY transport',GIT_COMMITTER_EMAIL:'ready-transport@users.noreply.github.com'};
  const git=(args,{trim=true}={})=>{
   const value=execFileSync('git',args,{cwd:repoDir,env,encoding:'utf8',
    timeout:45000,maxBuffer:8*1024*1024});return trim?value.trim():value;
  };
  git(['read-tree',candidateSha]);
  for(const path of workflowPaths){
   const entries=git(['ls-tree','-z',developmentSourceSha,'--',path],{trim:false})
    .split('\0').filter(Boolean);
   if(entries.length>1)throw Error('Ambiguous workflow transport tree entry');
   if(!entries.length){git(['update-index','--force-remove','--',path]);continue;}
   const m=/^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/.exec(entries[0]);
   if(!m||m[3]!==path)throw Error('Unsafe development workflow blob');
   git(['update-index','--add','--cacheinfo',m[1],m[2],path]);
  }
  const tree=git(['write-tree']);
  const commit=git(['commit-tree',tree,'-p',developmentSourceSha,'-m',
   'Transport exact READY source for connector workflow restoration [skip netlify]']);
  if(!SHA.test(commit))throw Error('Unable to create reviewed transport commit');
  return {transport_sha:commit,transport_tree_sha:tree};
 }finally{rmSync(tmp,{recursive:true,force:true});}
}
export function prevalidateReadySource({
 repoDir=process.cwd(),developmentSourceSha,push=false,expectedHostedEnv=process.env
}={}){
 if(!SHA.test(developmentSourceSha||''))throw Error('Exact development source SHA required');
 const git=(args,{trim=true}={})=>{
  const value=execFileSync('git',args,{cwd:repoDir,encoding:'utf8',
   timeout:45000,maxBuffer:8*1024*1024,stdio:['ignore','pipe','pipe']});
  return trim?value.trim():value;
 };
 const raw=git(['show',developmentSourceSha+':docs/RELEASE_QUEUE.json']);
 const queue=JSON.parse(raw);
 const items=selectedReadyItems(queue);
 if(!items.length)return {status:'NO_READY_ITEMS',count:0};
 const branch=frozenReadyBranch(queue,items);
 const ids=items.map(i=>i.id);
 const published=queue.published_base.tested_source_sha;
 if(!SHA.test(published))throw Error('Missing published tested source');
 const changePaths=git(['diff','--name-only','--no-renames',published,developmentSourceSha])
  .split(/\r?\n/).filter(Boolean);
 const sourceObjectAt=(ref,path)=>{
  const rows=git(['ls-tree','-z',ref,'--',path],{trim:false}).split('\0').filter(Boolean);
  if(!rows.length)return null;
  if(rows.length!==1)throw Error('Ambiguous READY source object: '+path);
  const m=/^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/.exec(rows[0]);
  if(!m||m[3]!==path)throw Error('Unexpected READY source object: '+path);
  return m[1]+':'+m[2];
 };
 const isAncestor=(a,b)=>{
  if(!SHA.test(a||'')||!SHA.test(b||''))throw Error('Unverified READY merge ancestry');
  try{git(['merge-base','--is-ancestor',a,b]);return true;}
  catch(e){if(e.status===1)return false;throw Error('Git merge ancestry unavailable');}
 };
 const pins=requiredReadyPins(queue,ids,changePaths,{
  developmentSourceSha,sourceObjectAt,isAncestor});
 const transportBranch=branch.replace('release-candidates/','ready-transports/');
 const remoteRef='refs/heads/'+transportBranch;
 if(push){
  if(expectedHostedEnv.GITHUB_ACTIONS!=='true'||
     expectedHostedEnv.GITHUB_REF!=='refs/heads/main'||
     expectedHostedEnv.GITHUB_REPOSITORY!==REPO||
     expectedHostedEnv.DIC_READY_PRECERTIFICATION!=='YES')
   throw Error('READY candidate push is only authorized in guarded main CI');
  const remote=git(['ls-remote','--heads','origin',remoteRef]).split(/\s+/)[0];
  if(SHA.test(remote||''))return {status:'EXISTING_TRANSPORT_NOT_CANDIDATE_CI',
   branch,transport_branch:transportBranch,transport_sha:remote,count:ids.length,pins};
  if(remote)throw Error('Unexpected existing candidate ref');
  const live=git(['ls-remote','--heads','origin','refs/heads/development/backend-foundation'])
   .split(/\s+/)[0];
  if(live!==developmentSourceSha)
   throw Error('Development moved since pre-certification; no candidate push');
 }
 const staged=stageReadyOnlyCandidate({repoDir,developmentSourceSha,
  selectedIds:ids,pinnedReadyPaths:pins,branch,createLocalRef:false});
 const transport=push?neutralWorkflowTransportCommit({repoDir,developmentSourceSha,
  candidateSha:staged.candidate_sha,
  workflowPaths:staged.manifest.restored_unpublished_workflow_paths}):null;
 if(push){
  const before=git(['ls-remote','--heads','origin','refs/heads/development/backend-foundation'])
   .split(/\s+/)[0];
  if(before!==developmentSourceSha)throw Error('Development changed before candidate push');
  try{git(['push','--porcelain','origin',transport.transport_sha+':'+remoteRef]);}
  catch(e){
   const detail=(String(e.stdout||'')+' '+String(e.stderr||''))
    .replace(/https?:\/\/[^\s]+/gi,'[REDACTED_REMOTE]')
    .replace(/(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)/g,'[REDACTED_TOKEN]')
    .replace(/(?:bearer|basic)\s+[^\s]+/gi,'[REDACTED_AUTH]')
    .replace(/[\x00-\x1f]/g,' ').slice(-1200);
   throw Error('Transport-only ref push rejected: '+detail);
  }
  const after=git(['ls-remote','--heads','origin',remoteRef]).split(/\s+/)[0];
  if(after!==transport.transport_sha)throw Error('Transport-only ref readback mismatch');
 }
 return {status:push?'TRANSPORT_READY_AWAITING_CONNECTOR':'LOCAL_SOURCE_PREFLIGHT_PASS',
  branch,candidate_sha:staged.candidate_sha,
  transport_branch:push?transportBranch:null,transport_sha:transport?.transport_sha||null,
  count:ids.length,
  pins,restored:staged.plan.restored_paths,
  published_source_sha:published,development_source_sha:developmentSourceSha};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const [source,mode]=process.argv.slice(2);
  if(!SHA.test(source||'')||!['--dry-run','--push'].includes(mode)||
     process.argv.length!==4)
   throw Error('Usage: precertify-ready-source.mjs <dev SHA> --dry-run|--push');
  const outcome=prevalidateReadySource({developmentSourceSha:source,push:mode==='--push'});
  console.log('[DIC READY pre-certification] '+JSON.stringify(outcome));
 }catch(e){console.error('[DIC READY pre-certification] HOLD: '+e.message);process.exitCode=2;}
}
