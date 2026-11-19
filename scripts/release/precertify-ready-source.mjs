// Owner-authorized nonpublishing READY pre-certification (#3347).
// Dry-run stages only disposable local Git objects; --push creates a new
// release-candidates/ ref for the EXISTING five source-bound CI jobs.
// It never stages a production ref, creates a grant or contacts Netlify.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
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
  base:queue.published_base?.tested_source_sha,
  selected:items.map(i=>[i.id,i.merged_source_sha,sorted(i.scope_paths||[]),
   sorted(i.ci_runs||[])])
 });
 const hash=createHash('sha256').update(identity).digest('hex').slice(0,20);
 return 'release-candidates/ready3347-'+hash;
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
 const remoteRef='refs/heads/'+branch;
 if(push){
  if(expectedHostedEnv.GITHUB_ACTIONS!=='true'||
     expectedHostedEnv.GITHUB_REF!=='refs/heads/main'||
     expectedHostedEnv.GITHUB_REPOSITORY!==REPO||
     expectedHostedEnv.DIC_READY_PRECERTIFICATION!=='YES')
   throw Error('READY candidate push is only authorized in guarded main CI');
  const remote=git(['ls-remote','--heads','origin',remoteRef]).split(/\s+/)[0];
  if(SHA.test(remote||''))return {status:'EXISTING_CANDIDATE_UNVERIFIED',
   branch,candidate_sha:remote,count:ids.length,pins};
  if(remote)throw Error('Unexpected existing candidate ref');
  const live=git(['ls-remote','--heads','origin','refs/heads/development/backend-foundation'])
   .split(/\s+/)[0];
  if(live!==developmentSourceSha)
   throw Error('Development moved since pre-certification; no candidate push');
 }
 const staged=stageReadyOnlyCandidate({repoDir,developmentSourceSha,
  selectedIds:ids,pinnedReadyPaths:pins,branch,createLocalRef:false});
 if(push){
  const before=git(['ls-remote','--heads','origin','refs/heads/development/backend-foundation'])
   .split(/\s+/)[0];
  if(before!==developmentSourceSha)throw Error('Development changed before candidate push');
  git(['push','--porcelain','origin',staged.candidate_sha+':'+remoteRef]);
  const after=git(['ls-remote','--heads','origin',remoteRef]).split(/\s+/)[0];
  if(after!==staged.candidate_sha)throw Error('Candidate Git ref readback mismatch');
 }
 return {status:push?'CANDIDATE_CI_PENDING':'LOCAL_SOURCE_PREFLIGHT_PASS',
  branch,candidate_sha:staged.candidate_sha,count:ids.length,
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
