// Independent source-bound main event receipt; NO provider, grant, claim or retry.
import {execFileSync} from 'node:child_process';
import {validateReleaseTriggerReceipt} from './release-reliability.mjs';
const REPO='Schulzet3/The-Dial-In-Collective',SHA=/^[a-f0-9]{40}$/;
export function inspectControllerDelivery({requestSha,mainHeadSha,workflowRuns,elapsedSeconds}={}){
 const r=validateReleaseTriggerReceipt({requestCommitSha:requestSha,mainHeadSha,workflowRuns,elapsedSeconds});
 return {...r,observed:r.status==='RUNNING'||r.status==='CONTROLLER_COMPLETED_NETLIFY_UNVERIFIED'};
}
async function github(token,path,request=globalThis.fetch){
 if(!token)throw Error('Read-only Actions token required');
 const res=await request('https://api.github.com/repos/'+REPO+path,{
  headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
   'X-GitHub-Api-Version':'2022-11-28'}});
 if(!res?.ok)throw Error('Live GitHub '+path.split('?')[0]+' HTTP '+String(res?.status));
 return res.json();
}
export async function liveControllerIndex({token,sha,request=globalThis.fetch}={}){
 if(!SHA.test(sha||''))throw Error('Invalid source SHA');
 const j=await github(token,'/actions/runs?head_sha='+sha+'&per_page=100',request);
 if(!Array.isArray(j.workflow_runs)||j.total_count>100)
  throw Error('Incomplete/over-limit Actions index');
 return j.workflow_runs;
}
export async function liveMainSha({token,request=globalThis.fetch}={}){
 const j=await github(token,'/branches/main',request);
 if(!SHA.test(j?.commit?.sha||''))throw Error('Missing live main branch readback');
 return j.commit.sha;
}
export async function observeRequestEvent(env=process.env,{request=globalThis.fetch,
 sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
 if(env.GITHUB_EVENT_NAME!=='push'||env.GITHUB_REF!=='refs/heads/main')
  throw Error('Only main push events may be observed');
 const git=args=>execFileSync('git',args,{encoding:'utf8',timeout:15000}).trim();
 const changed=git(['diff-tree','--no-commit-id','--name-only','-r','HEAD']).split(/\r?\n/);
 if(!changed.includes('docs/RELEASE_REQUEST.json'))
  return {status:'NOT_APPLICABLE',observed:false};
 const sha=git(['rev-parse','HEAD']),parents=git(['rev-list','--parents','-n','1','HEAD']).split(/\s+/);
 if(sha!==env.GITHUB_SHA||parents.length!==2||parents[1]!==env.DIC_PUSH_BEFORE_SHA||
  env.DIC_PUSH_FORCED==='true'||changed.length!==2||
  !changed.includes('docs/OPS_RELEASE_CONTROLLER_WORK_JOURNAL_2026-10-21.md'))
  throw Error('Request event is not a single-parent nonforce two-file push');
 for(let n=0;n<=10;n++){
  const [mainHeadSha,workflowRuns]=await Promise.all([
   liveMainSha({token:env.GITHUB_TOKEN,request}),
   liveControllerIndex({token:env.GITHUB_TOKEN,sha,request})]);
  const result=inspectControllerDelivery({requestSha:sha,mainHeadSha,workflowRuns,elapsedSeconds:n*10});
  if(result.status==='WAIT'&&n<10){await sleep(10000);continue;}
  if(!result.observed)throw Error('Controller event HOLD: '+result.reason+'; NO REPLAY');
  console.log('[DIC event] '+JSON.stringify(result)+' NOT_A_NETLIFY_RECEIPT');
  return result;
 }
 throw Error('Controller not observed');
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1])
 observeRequestEvent().then(x=>console.log('[DIC observer] '+x.status))
 .catch(e=>{console.error('[DIC observer] HOLD: '+e.message);process.exitCode=2;});
