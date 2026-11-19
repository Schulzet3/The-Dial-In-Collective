// Owner-authorized nonpublishing READY pre-certification (#3347).
// Hosted receipt mode only builds/verifies ephemeral local Git candidate bytes.
// No GitHub Actions token branch writes: GitHub rejects workflow changes and
// GITHUB_TOKEN push does NOT trigger downstream candidate CI. An authorized
// GitHub connector reconstructs a tree with identical Git mode/blob objects.
// It never stages a production ref, creates a grant or contacts Netlify.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {stageReadyOnlyCandidate} from './stage-ready-only-candidate.mjs';
import {deployableChangedPaths,queueSchemaErrors} from './release-queue.mjs';
import {CANDIDATE_RECEIPT_PATH,CANDIDATE_JOURNAL_PATH} from './ready-only-candidate.mjs';
const SHA=/^[a-f0-9]{40}$/;
const REPO='Schulzet3/The-Dial-In-Collective';
const sorted=xs=>[...new Set(xs)].sort();
export function selectedReadyItems(queue){
 const failures=queueSchemaErrors(queue);
 if(failures.length)throw Error('READY queue schema HOLD: '+failures.slice(0,5).join('; '));
 return (queue.items||[]).filter(x=>x.state==='READY').sort((a,b)=>a.id.localeCompare(b.id));
}
export function requiredReadyPins(queue,ids,developmentChangedPaths){
 if(!Array.isArray(developmentChangedPaths)||!Array.isArray(ids)||
    ids.some(x=>typeof x!=='string')||new Set(ids).size!==ids.length)
  throw Error('READY pin source/selection unavailable');
 const selected=new Set(ids);
 const ready=selectedReadyItems(queue);
 if(ids.some(id=>!ready.some(item=>item.id===id)))
  throw Error('Selected READY item not source-certified in current queue');
 return deployableChangedPaths(developmentChangedPaths).filter(path=>{
  const owners=(queue.items||[]).filter(item=>item.scope_paths?.includes(path));
  return owners.some(item=>selected.has(item.id)&&item.state==='READY')&&
   owners.some(item=>!selected.has(item.id)&&item.state!=='DEPLOYED');
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
// Strict, reproducible no-write source receipt. Every changed blob and deletion
// comes from the staging Git tree, not a guessed README or queue label.
// Connector finalization must independently reconstruct and compare tree SHA.
export function candidateTreeReceipt({repoDir=process.cwd(),developmentSourceSha,staged}={}){
 if(!SHA.test(developmentSourceSha||'')||!SHA.test(staged?.candidate_sha||'')||
   typeof staged?.manifest!=='object')throw Error('No verified staged source receipt');
 const git=(args,{trim=true}={})=>{
  const value=execFileSync('git',args,{cwd:repoDir,encoding:'utf8',
   timeout:45000,maxBuffer:12*1024*1024,stdio:['ignore','pipe','pipe']});
  return trim?value.trim():value;
 };
 const paths=git(['diff','--name-only','--no-renames',developmentSourceSha,
  staged.candidate_sha]).split(/\r?\n/).filter(Boolean);
 if(!paths.includes(CANDIDATE_RECEIPT_PATH)||
    !paths.includes(CANDIDATE_JOURNAL_PATH)||new Set(paths).size!==paths.length)
  throw Error('Candidate source receipt and journal not staged');
 const delta_entries=paths.map(path=>{
  if(!/^[A-Za-z0-9_.\/-]+$/.test(path)||path.includes('..'))
   throw Error('Invalid candidate source diff path');
  const matches=git(['ls-tree','-z',staged.candidate_sha,'--',path],{trim:false})
   .split('\0').filter(Boolean);
  if(!matches.length)return {path,mode:null,sha:null};
  if(matches.length!==1)throw Error('Ambiguous candidate source diff path');
  const entry=/^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/.exec(matches[0]);
  if(!entry||entry[3]!==path)throw Error('Unverifiable candidate source blob');
  return {path,mode:entry[1],sha:entry[2]};
 });
 const manifest=JSON.parse(git(['show',staged.candidate_sha+':'+CANDIDATE_RECEIPT_PATH]));
 if(JSON.stringify(manifest)!==JSON.stringify(staged.manifest))
  throw Error('Manifest differs from staged source');
 const journalFrom=git(['show',developmentSourceSha+':'+CANDIDATE_JOURNAL_PATH],{trim:false});
 const journalTo=git(['show',staged.candidate_sha+':'+CANDIDATE_JOURNAL_PATH],{trim:false});
 const prefix=journalFrom.trimEnd();
 if(!journalTo.startsWith(prefix))throw Error('Candidate journal is not derived from source');
 const journal_append=journalTo.slice(prefix.length);
 if(!journal_append.startsWith('\n\n## READY-only source candidate'))
  throw Error('Unexpected source-bound candidate journal appendix');
 const tree_sha=git(['rev-parse',staged.candidate_sha+'^{tree}']);
 if(!SHA.test(tree_sha))throw Error('Candidate Git tree SHA not available');
 return {status:'LOCAL_TREE_RECEIPT_NO_REMOTE_CANDIDATE',
  development_source_sha:developmentSourceSha,
  published_source_sha:manifest.published_source_sha,
  candidate_branch:manifest.candidate_branch,
  expected_tree_sha:tree_sha,
  candidate_local_sha:staged.candidate_sha,
  manifest,delta_entries,journal_append};
}

export function prevalidateReadySource({
 repoDir=process.cwd(),developmentSourceSha,push=false,receipt=false,expectedHostedEnv=process.env
}={}){
 if(!SHA.test(developmentSourceSha||''))throw Error('Exact development source SHA required');
 if(push)throw Error('Actions ref push prohibited; use --receipt then trusted GitHub connector');
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
 const pins=requiredReadyPins(queue,ids,changePaths);
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
 if(receipt)return candidateTreeReceipt({repoDir,developmentSourceSha,staged});
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
  if(!SHA.test(source||'')||!['--dry-run','--receipt'].includes(mode)||
     process.argv.length!==4)
   throw Error('Usage: precertify-ready-source.mjs <dev SHA> --dry-run|--receipt');
  const outcome=prevalidateReadySource({developmentSourceSha:source,receipt:mode==='--receipt'});
  console.log('[DIC READY pre-certification] '+JSON.stringify(outcome));
 }catch(e){console.error('[DIC READY pre-certification] HOLD: '+e.message);process.exitCode=2;}
}
