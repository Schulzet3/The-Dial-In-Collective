// #3889 nonpublishing, read-only native PUSH CI and complete Git tree proof.
// This cannot promote a queue item, grant Publish, change a ref or deploy.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const REPO='Schulzet3/The-Dial-In-Collective';
const SHA=/^[a-f0-9]{40}$/;
const FP=/^[a-f0-9]{64}$/;
const KIND='DIC-TESTING-FROZEN-NONPUBLISHING-3889-V1';
export const WORKFLOWS=Object.freeze([
 {id:391058882,name:'DIC approval, implementation and continuity contract',jobs:['approval']},
 {id:383832744,name:'DIC cloud app build and tests',jobs:['validate']},
 {id:384754124,name:'DIC cloud UX regression checks',jobs:['cloud-tests','mobile-browser-qa']},
 {id:386844035,name:'DIC isolated SQL release regression',jobs:['sql']}
]);
const reviewPath=p=>/^(?:site\/|src\/|supabase\/|netlify\/|scripts\/|tests\/|\.github\/workflows\/|package(?:-lock)?\.json$|build_cloud\.mjs$|netlify\.toml$)/.test(p);
const uniq=x=>new Set(x).size===x.length;
const hold=s=>{throw Error('TESTING exact-source HOLD: '+s);};
function requireSha(value,label){if(!SHA.test(value||''))hold('missing exact '+label);}
function complete(data,key,label){
 if(!Number.isSafeInteger(data?.total_count)||data.total_count>100||
   !Array.isArray(data[key])||data[key].length!==data.total_count)
  hold('incomplete or truncated '+label+' (no page-1-only evidence)');
 return data[key];
}
function treeMap(t,label){
 if(t?.truncated!==false||!SHA.test(t?.sha||'')||!Array.isArray(t.tree)||!t.tree.length)
  hold('truncated or missing '+label+' Git tree');
 const m=new Map();
 for(const e of t.tree){
  if(e.type==='tree')continue;
  if(typeof e.path!=='string'||e.path.startsWith('/')||e.path.includes('..')||
      m.has(e.path)||(reviewPath(e.path)&&!/^[A-Za-z0-9_.\/-]+$/.test(e.path)))
   hold('unsafe/duplicate '+label+' tree path');
  if(e.type!=='blob'||!['100644','100755'].includes(e.mode)||!SHA.test(e.sha))
   if(reviewPath(e.path))hold('nonregular source path in '+label+': '+e.path);
  m.set(e.path,e.mode+':'+e.sha);
 }
 return m;
}
function equal(a,b,path){return (a.get(path)||null)===(b.get(path)||null);}
const keys=xs=>[...new Set(xs)].sort();
function same(a,b){return JSON.stringify(keys(a))===JSON.stringify(keys(b));}
export function verifyFrozenTestingEvidence({request,branch,commit,manifest,queue,trees,
 runList,jobLists,mergeTree}={}){
 if(request?.schema_version!==1||request?.kind!=='DIC-TESTING-FROZEN-EVIDENCE-3889-V1')
  hold('unrecognized read-only request');
 for(const [k,v] of Object.entries({
  candidate_sha:request.candidate_sha,development_sha:request.development_sha,
  published_sha:request.published_sha,tree_sha:request.tree_sha,
  baseline_dev_sha:request.baseline_dev_sha,baseline_queue_blob:request.baseline_queue_blob,
  manifest_blob:request.manifest_blob
 }))requireSha(v,k);
 if(!/^release-candidates\/testing3889-[0-9a-f]{20}$/.test(request.candidate_branch||'')||
    !/^DIC-Q-[a-z0-9-]+$/.test(request.selected_id||'')||
    branch?.ref!=='refs/heads/'+request.candidate_branch||
    branch?.object?.sha!==request.candidate_sha)
  hold('candidate ref missing, moved or wrong source');
 if(commit?.sha!==request.candidate_sha||commit?.tree?.sha!==request.tree_sha||
   commit.parents?.length!==1||commit.parents[0]?.sha!==request.development_sha)
  hold('candidate SHA/tree/one-parent ancestry invalid');
 const c=treeMap(trees?.candidate,'candidate'),d=treeMap(trees?.development,'development'),
  p=treeMap(trees?.published,'published');
 if(trees.candidate.sha!==request.tree_sha)hold('candidate tree not bound to HEAD');
 if(manifest?.schema_version!==1||manifest.kind!==KIND||
    manifest.candidate_branch!==request.candidate_branch||
    manifest.development_source_sha!==request.development_sha||
    manifest.published_source_sha!==request.published_sha||
    manifest.baseline_dev_sha!==request.baseline_dev_sha||
    manifest.baseline_queue_blob!==request.baseline_queue_blob||
    manifest.selected_testing_item_id!==request.selected_id||
    !FP.test(manifest.plan_fingerprint||'')||
    manifest.candidate_branch!=='release-candidates/testing3889-'+manifest.plan_fingerprint.slice(0,20)||
    manifest.certified_ready_count!==0||manifest.publication_authorized!==false||
    manifest.selected_ready_item_ids?.length!==0||
    !['FROZEN_SOURCE_WITH_QA_COMPATIBILITY_CI_NOT_RUN','FROZEN_SOURCE_ONLY_CI_NOT_RUN'].includes(manifest.status))
  hold('manifest could be publisher-shaped, stale or unbound');
 if(c.get('docs/TESTING_3889_CANDIDATE.json')!=='100644:'+request.manifest_blob||
    c.has('docs/RELEASE_CANDIDATE.json')||c.has('docs/RELEASE_REQUEST.json')||
    !equal(c,d,'docs/RELEASE_QUEUE.json')||
    !equal(c,d,'docs/ai/PREFLIGHT.md')||
    d.get('docs/RELEASE_QUEUE.json')!== '100644:'+request.baseline_queue_blob)
  hold('candidate queue/governance or no-publisher boundary mismatches');
 const selected=manifest.selected_blobs;
 if(!Array.isArray(selected)||!selected.length||
    !same(selected.map(x=>x.path),[request.selected_path])||
    !uniq(selected.map(x=>x.path)))
  hold('selected source ownership incomplete');
 if(!Array.isArray(queue?.items))hold('original queue data unavailable');
 const item=queue.items.find(x=>x.id===request.selected_id);
 if(!item||item.state!=='TESTING'||item.merged_source_sha!==manifest.merged_source_sha||
   !Array.isArray(item.scope_paths)||!selected.every(x=>item.scope_paths.includes(x.path)))
  hold('selected queue owner not TESTING or lacks merged scoped source');
 const selectedPaths=selected.map(x=>x.path);
 const merged=treeMap(mergeTree,'selected merge');
 for(const {path,source_sha} of selected){
  if(!reviewPath(path)||!/^100(?:644|755):[a-f0-9]{40}$/.test(source_sha||'')||
     c.get(path)!==source_sha||d.get(path)!==source_sha||merged.get(path)!==source_sha||
     p.get(path)===source_sha)
   hold('selected path source/merge/published parity: '+path);
 }
 const qa=manifest.qa_compatibility_blobs||[];
 if(!Array.isArray(qa)||qa.length>6||!uniq(qa.map(x=>x.path))||
    (qa.length?manifest.qa_compatibility_source_sha!==request.development_sha:
    manifest.qa_compatibility_source_sha!=null))
  hold('unreviewed QA support identity');
 const qaPaths=qa.map(x=>x.path);
 for(const {path,source_sha} of qa){
  if(!/^(?:tests\/|scripts\/audit\/)/.test(path)||!/^100(?:644|755):[a-f0-9]{40}$/.test(source_sha||'')||
   selectedPaths.includes(path)||c.get(path)!==source_sha||d.get(path)!==source_sha||
   p.get(path)===source_sha)
   hold('QA support lacks merged-source identity: '+path);
 }
 const restored=manifest.restored_to_published_paths;
 if(!Array.isArray(restored)||!restored.length||!uniq(restored)||restored.some(x=>!reviewPath(x)))
  hold('restored source inventory missing');
 const all=keys([...c.keys(),...d.keys(),...p.keys()].filter(reviewPath));
 const devDrift=all.filter(path=>!equal(d,p,path));
 if(!same(devDrift,[...selectedPaths,...qaPaths,...restored]))
  hold('development-to-published diff has missing/extra source scope');
 for(const path of all){
  if(selectedPaths.includes(path)||qaPaths.includes(path))continue;
  if(!equal(c,p,path))hold('unselected executable differs from published baseline: '+path);
 }
 for(const path of restored)if(equal(d,p,path)||!equal(c,p,path))
  hold('restoration not a real and exact published object: '+path);
 if(!Array.isArray(runList?.workflow_runs))hold('native PUSH run list unavailable');
 const runs=complete(runList,'workflow_runs','exact-SHA PUSH workflow inventory');
 const outcomes=[];
 for(const wf of WORKFLOWS){
  const candidates=runs.filter(r=>r.workflow_id===wf.id&&r.name===wf.name&&
   r.head_sha===request.candidate_sha&&r.head_branch===request.candidate_branch&&
   r.event==='push').sort((a,b)=>b.id-a.id);
  const r=candidates[0];
  if(!r||r.status!=='completed'||r.conclusion!=='success')
   hold('missing/pending/failed exact-SHA PUSH workflow: '+wf.name);
  const jdata=jobLists?.[r.id],jobs=complete(jdata,'jobs','native jobs for '+wf.name);
  for(const name of wf.jobs){
   const rows=jobs.filter(j=>j.name===name).sort((a,b)=>b.id-a.id);
   const job=rows[0];
   if(!job||job.status!=='completed'||job.conclusion!=='success'||
     (job.head_sha&&job.head_sha!==request.candidate_sha))
    hold('missing/pending/failed/NA native job: '+name);
   outcomes.push({job:name,run_id:r.id,job_id:job.id,sha:request.candidate_sha,status:'SUCCESS'});
  }
 }
 if(outcomes.length!==5||!uniq(outcomes.map(x=>x.job)))
  hold('five distinct native job successes absent');
 return {status:'FIVE_PUSH_JOBS_AND_SOURCE_VERIFIED_TESTING_ONLY_NOT_READY',
  candidate_sha:request.candidate_sha,tree_sha:request.tree_sha,
  development_sha:request.development_sha,published_sha:request.published_sha,
  selected_item_id:request.selected_id,selected_paths:selectedPaths,
  restored_paths:restored.length,reviewed_qa_paths:qaPaths.length,
  checks:outcomes,publication_authorized:false,ready_promoted:false};
}
function decoded(blob,expected){
 if(blob?.sha!==expected||blob.encoding!=='base64'||typeof blob.content!=='string')
  hold('Git blob identity or encoding missing');
 return Buffer.from(blob.content.replace(/\s/g,''),'base64').toString('utf8');
}
export async function readLiveTestingEvidence(request,{
 token,fetcher=globalThis.fetch}={}){
 if(!token||typeof fetcher!=='function')hold('authenticated GitHub read unavailable');
 const root='https://api.github.com/repos/'+REPO+'/';
 async function get(path){
  let res;
  try{res=await fetcher(root+path,{method:'GET',headers:{
   Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
   'X-GitHub-Api-Version':'2022-11-28'},signal:AbortSignal.timeout(20000)});}
  catch{hold('GitHub evidence transport unavailable: '+path.split('?')[0]);}
  if(!res?.ok)hold('GitHub evidence HTTP '+res?.status+': '+path.split('?')[0]);
  try{return await res.json();}catch{hold('unreadable GitHub evidence: '+path);}
 }
 const branch=await get('git/ref/heads/'+request.candidate_branch);
 const commit=await get('git/commits/'+request.candidate_sha);
 const dev=await get('git/commits/'+request.development_sha);
 const pub=await get('git/commits/'+request.published_sha);
 const manifestBlob=await get('git/blobs/'+request.manifest_blob);
 const manifest=JSON.parse(decoded(manifestBlob,request.manifest_blob));
 const queueBlob=await get('git/blobs/'+request.baseline_queue_blob);
 const queue=JSON.parse(decoded(queueBlob,request.baseline_queue_blob));
 const merge=await get('git/commits/'+manifest.merged_source_sha);
 const trees={
  candidate:await get('git/trees/'+commit.tree.sha+'?recursive=1'),
  development:await get('git/trees/'+dev.tree.sha+'?recursive=1'),
  published:await get('git/trees/'+pub.tree.sha+'?recursive=1')
 };
 const mergeTree=await get('git/trees/'+merge.tree.sha+'?recursive=1');
 const runList=await get('actions/runs?head_sha='+request.candidate_sha+'&event=push&per_page=100');
 const ids=(runList?.workflow_runs||[]).filter(x=>WORKFLOWS.some(w=>w.id===x.workflow_id&&w.name===x.name)).map(x=>x.id);
 const jobLists={};
 for(const id of ids)if(Number.isSafeInteger(id)&&id>0)
  jobLists[id]=await get('actions/runs/'+id+'/jobs?per_page=100');
 return verifyFrozenTestingEvidence({request,branch,commit,manifest,queue,
  trees,mergeTree,runList,jobLists});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 (async()=>{
  if(process.argv.length!==3)hold('usage: verify-testing-frozen-evidence.mjs <request JSON>');
  const request=JSON.parse(readFileSync(process.argv[2],'utf8'));
  if(process.env.GITHUB_EVENT_NAME==='workflow_run'&&
     process.env.DIC_COMPLETED_SOURCE_SHA!==request.candidate_sha){
   console.log('[DIC TESTING FROZEN EVIDENCE] NOT_APPLICABLE: unrelated completed SHA');return;
  }
  const result=await readLiveTestingEvidence(request,{token:process.env.GITHUB_TOKEN});
  console.log('[DIC TESTING FROZEN EVIDENCE] '+JSON.stringify(result));
 })().catch(e=>{
  console.error('[DIC TESTING FROZEN EVIDENCE] '+String(e.message||e));
  process.exitCode=2;
 });
}
