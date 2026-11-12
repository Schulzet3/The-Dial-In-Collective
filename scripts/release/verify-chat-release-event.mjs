// Canonical, read-only GitHub push/controller event monitor; no publication.
import {execFileSync} from 'node:child_process';
import {appendFileSync} from 'node:fs';
import {validateReleaseTriggerReceipt} from './release-reliability.mjs';
const REPO='Schulzet3/The-Dial-In-Collective',SHA=/^[a-f0-9]{40}$/;
const REQUEST='docs/RELEASE_REQUEST.json';
const NAME='DIC chat-approved single-use production request';
const PATH='.github/workflows/dic-chat-approved-release.yml';
export function observeChatReleaseEvent({eventName,changedPaths,requestCommitSha,mainHeadSha,
 workflowRuns,expectedRunId,elapsedSeconds=0}={}){
 if(!['push','workflow_run'].includes(eventName)||
   eventName==='push'&&!changedPaths?.includes(REQUEST))
  return {status:'NOT_APPLICABLE',reason:'not a release request'};
 if(eventName==='workflow_run'&&(!Number.isSafeInteger(expectedRunId)||expectedRunId<=0))
  return {status:'BLOCKED',reason:'completed controller run ID unavailable'};
 const receipt=validateReleaseTriggerReceipt({requestCommitSha,mainHeadSha,workflowRuns,elapsedSeconds});
 if(eventName==='workflow_run'){
  const run=Array.isArray(workflowRuns)?workflowRuns.find(x=>x?.id===expectedRunId):null;
  if(!run||run.head_sha!==requestCommitSha||run.name!==NAME||run.path!==PATH||
      run.event!=='push'||run.status!=='completed')
   return {status:'BLOCKED',reason:'completed controller run does not match exact push'};
 }
 return receipt;
}
export async function observeMainChatReleaseEvent({eventName,changedPaths,requestCommitSha,
 expectedRunId,loadMainHead,loadRuns,sleep=ms=>new Promise(r=>setTimeout(r,ms)),
 attempts=5,pollMs=2500}={}){
 if(eventName==='push'&&!changedPaths?.includes(REQUEST))
  return {status:'NOT_APPLICABLE',reason:'no release request changed'};
 if(!SHA.test(requestCommitSha||'')||typeof loadMainHead!=='function'||
    typeof loadRuns!=='function')
  return {status:'BLOCKED',reason:'read-only GitHub event sources unavailable'};
 for(let i=0;i<attempts;i++){
  const [mainHeadSha,workflowRuns]=await Promise.all([loadMainHead(),loadRuns(requestCommitSha)]);
  const result=observeChatReleaseEvent({eventName,changedPaths,requestCommitSha,
   mainHeadSha,workflowRuns,expectedRunId,elapsedSeconds:(i+1)*pollMs/1000});
  if(result.status!=='WAIT')return result;
  if(i+1<attempts)await sleep(pollMs);
 }
 return {status:'BLOCKED',reason:'controller not observable after bounded readback; inspect runs?head_sha; never blindly replay'};
}
export function githubActionReceiptReaders(token,{request=globalThis.fetch}={}){
 if(!token)throw Error('GitHub read-only Actions token unavailable');
 const get=async path=>{
  const res=await request('https://api.github.com/repos/'+REPO+path,{
   headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28'}});
  if(!res?.ok)throw Error('Official Actions receipt HTTP '+String(res?.status));
  return res.json();
 };
 return {loadMainHead:async()=>{const j=await get('/branches/main');return j.commit?.sha;},
  loadRuns:async sha=>{
   if(!SHA.test(sha))throw Error('Invalid Actions exact source SHA');
   const j=await get('/actions/runs?head_sha='+sha+'&per_page=100');
   if(!Array.isArray(j.workflow_runs)||j.total_count>100)
    throw Error('Truncated or missing official controller run index');
   return j.workflow_runs;
  }};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 (async()=>{
  const eventName=process.env.GITHUB_EVENT_NAME;
  if(!['push','workflow_run'].includes(eventName))throw Error('Unsupported Actions event');
  const requestCommitSha=eventName==='workflow_run'?process.env.DIC_OBSERVED_REQUEST_SHA:process.env.GITHUB_SHA;
  let changedPaths=[];
  if(eventName==='push'){
   if(process.env.GITHUB_REF!=='refs/heads/main')throw Error('Not a main push');
   const git=args=>execFileSync('git',args,{encoding:'utf8',timeout:15000}).trim();
   if(git(['rev-parse','HEAD'])!==requestCommitSha)throw Error('Checked-out SHA differs from event');
   changedPaths=git(['diff-tree','--no-commit-id','--name-only','-r','HEAD'])
    .split(/\r?\n/).filter(Boolean);
  }
  const expectedRunId=eventName==='workflow_run'?Number(process.env.DIC_COMPLETED_CONTROLLER_RUN_ID):undefined;
  const result=await observeMainChatReleaseEvent({eventName,changedPaths,requestCommitSha,
   expectedRunId,...githubActionReceiptReaders(process.env.GITHUB_TOKEN)});
  const receipt={event:eventName,request_sha:requestCommitSha,...result};
  console.log('[DIC GitHub canonical push receipt] '+JSON.stringify(receipt));
  if(process.env.GITHUB_STEP_SUMMARY)
   appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    '## GitHub controller event receipt\n\n'+JSON.stringify(receipt)+'\n\nNo Netlify release is asserted.\n');
  if(!['NOT_APPLICABLE','RUNNING','CONTROLLER_COMPLETED_NETLIFY_UNVERIFIED'].includes(result.status))
   throw Error('Controller event HOLD: '+result.reason);
 })().catch(e=>{console.error('[DIC GitHub controller event] DENIED: '+String(e.message));process.exitCode=2;});
}
