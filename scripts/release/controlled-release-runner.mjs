// Controlled GitHub Actions release runner (private, inert until manual cutover).
// Intended to execute ONLY from GitHub's protected default 'main' branch.
// Does NOT create Netlify deploys; one NON-FORCE push to release/production
// is the single atomic claim. Never retry a failed push automatically.
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {planSingleUseClaim,assertReadyForRelease,RELEASE_BRANCH} from './one-use-claim.mjs';
const REPO='Schulzet3/The-Dial-In-Collective';
const SHA=/^[a-f0-9]{40}$/;
// The protected release ref must first be seeded at the independently
// verified current published source, with NO unapproved build. These two
// pinned hashes prevent stale/legacy build guards or silent claim history loss.
export const RELEASE_GENESIS_SHA='e7e16e5e13b35a6f4b6aa81db5b09b93b1aefc60';
export const MINIMUM_GUARDED_SOURCE_SHA='994a4d9f91e2475a96df42a46564c06e29f1c8d7';
export function initialLedgerOnMissing({releaseHead,readLedger}){
 try{return readLedger();}
 catch{
  if(releaseHead!==RELEASE_GENESIS_SHA)
   throw new Error('Consumption ledger missing from NON-GENESIS release: no replay recovery permitted');
  return JSON.stringify({schema_version:1,consumed:[]});
 }
}
const git=(args,{input,env}={})=>execFileSync('git',args,{encoding:'utf8',input,
 stdio:['pipe','pipe','pipe'],env:env||process.env}).trim();
const json=(s,label)=>{try{return JSON.parse(s);}catch{throw Error(label+' is not valid JSON');}};
function sourceGrant(data,id){
 if(data?.schema_version!==1||!Array.isArray(data.grants))throw Error('No source-of-truth owner approval list');
 const grants=data.grants.filter(g=>g.id===id);
 if(grants.length!==1)throw Error('Owner grant absent or duplicate ID: '+id);
 return grants[0];
}
async function ciForSha(sha,token){
 const url='https://api.github.com/repos/'+REPO+'/commits/'+sha+'/check-runs?per_page=100';
 const response=await fetch(url,{headers:{Authorization:'Bearer '+token,
  Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}});
 if(!response.ok)throw Error('Cannot independently verify exact-source GitHub CI: HTTP '+response.status);
 const data=await response.json();
 if(data.total_count>100)throw Error('Too many check runs; require explicit pagination review');
 const scores={};
 for(const check of data.check_runs||[]){
  if(check.head_sha!==sha)continue;
  const prior=scores[check.name];
  if(!prior||String(check.completed_at||'')>String(prior.completed_at||''))
   scores[check.name]={conclusion:check.conclusion,completed_at:check.completed_at};
 }
 return Object.fromEntries(Object.entries(scores).map(([key,value])=>[key,value.conclusion]));
}
const setBlob=(path,content,env)=>{
 const sha=git(['hash-object','-w','--stdin'],{input:content,env});
 if(!SHA.test(sha))throw Error('Unable to store release record');
 git(['update-index','--add','--cacheinfo','100644,'+sha+','+path],{env});
};
export async function executeSingleUseRelease(settings=process.env){
 if(settings.GITHUB_ACTIONS!=='true'||settings.GITHUB_REF!=='refs/heads/main'||
  settings.GITHUB_EVENT_NAME!=='workflow_dispatch'||settings.GITHUB_REPOSITORY!==REPO)
  throw Error('Release is only valid in dispatched, controlled main-branch GitHub Actions');
 if(settings.DIC_PRIVATE_BRANCH_PROTECTION_VERIFIED!=='YES'||
  settings.DIC_NETLIFY_PRODUCTION_BRANCH_VERIFIED!==RELEASE_BRANCH||
  settings.DIC_RELEASE_CONTROLLER_VERIFIED!=='YES')
  throw Error('Hosted branch protection/Netlify cutover/controller not independently enabled');
 const id=settings.INPUT_RELEASE_ID||'',sha=settings.INPUT_TESTED_SOURCE_SHA||'';
 if(!SHA.test(sha)||!/^DIC-[0-9]{8}-[A-Z0-9][A-Z0-9_-]{5,63}$/.test(id))
  throw Error('Missing exact release ID or 40-character source SHA');
 const token=settings.GITHUB_TOKEN;
 if(!token)throw Error('GitHub Actions write token missing');
 // Read the current remote refs. No force, no rebases, no automatic retries.
 git(['fetch','--no-tags','origin',
  '+refs/heads/development/backend-foundation:refs/remotes/origin/development/backend-foundation',
  '+refs/heads/'+RELEASE_BRANCH+':refs/remotes/origin/'+RELEASE_BRANCH]);
 const developmentHead=git(['rev-parse','refs/remotes/origin/development/backend-foundation']);
 const releaseHead=git(['rev-parse','refs/remotes/origin/'+RELEASE_BRANCH]);
 if(!SHA.test(developmentHead)||!SHA.test(releaseHead))throw Error('Exact remote branches unavailable');
 git(['merge-base','--is-ancestor',sha,developmentHead]);
 // Exclude historically green application SHAs which still had the old
 // development-branch publication guard. Never silently deploy an old build.
 git(['merge-base','--is-ancestor',MINIMUM_GUARDED_SOURCE_SHA,sha]);
 const checkedGuard=git(['show',sha+':scripts/netlify/should-ignore-build.mjs']);
 if(!checkedGuard.includes("branch!=='release/production'")||
    !checkedGuard.includes('assertProductionClaim'))
  throw new Error('Tested source lacks protected dedicated-release build gate');
 const approvals=json(git(['show',developmentHead+':docs/RELEASE_AUTHORIZATIONS.json']),'Owner grants');
 const grant=sourceGrant(approvals,id);
 const statuses=await ciForSha(sha,token);
 assertReadyForRelease({requiredChecks:statuses,flags:{
  githubPrivateBranchProtectionVerified:true,
  netlifyProductionBranchVerified:true,defaultBranchRunnerVerified:true}});
 const oldRaw=initialLedgerOnMissing({releaseHead,
  readLedger:()=>git(['show',releaseHead+':docs/RELEASE_CONSUMPTION.json'])});
 const ledger=json(oldRaw,'Release ledger');
 const nowIso=new Date().toISOString();
 const planned=planSingleUseClaim({grant,releaseId:id,sourceSha:sha,nowIso,
  ledger,currentPublishedSourceSha:ledger.consumed.at(-1)?.tested_source_sha||releaseHead});
 const tmp=mkdtempSync(join(tmpdir(),'dic-release-index-'));
 try{
  const env={...process.env,GIT_INDEX_FILE:join(tmp,'index'),
   GIT_AUTHOR_NAME:'DIC single-use release controller',GIT_AUTHOR_EMAIL:'release-controller@users.noreply.github.com',
   GIT_COMMITTER_NAME:'DIC single-use release controller',GIT_COMMITTER_EMAIL:'release-controller@users.noreply.github.com'};
  git(['read-tree',sha],{env});
  setBlob('docs/RELEASE_CONSUMPTION.json',JSON.stringify(planned,null,2)+'\n',env);
  setBlob('docs/RELEASE_AUTHORIZATIONS.json',JSON.stringify(approvals,null,2)+'\n',env);
  const tree=git(['write-tree'],{env});
  const subject='Release DIC: '+id+' [dic-publish]';
  const commit=git(['commit-tree',tree,'-p',releaseHead,'-m',subject],{env});
  if(!SHA.test(commit))throw Error('No immutable Git release commit');
  // Git's remote update is a fast-forward compare-and-swap of this specific
  // parent. A competing concurrent commit diverges and loses the push.
  // NEVER add --force or retry the push after a rejection.
  git(['push','--porcelain','origin',commit+':refs/heads/'+RELEASE_BRANCH],{env});
  const actual=git(['ls-remote','origin','refs/heads/'+RELEASE_BRANCH]).split(/\s+/)[0];
  if(actual!==commit)throw Error('Release ref readback does not match pushed commit');
  // No Netlify claim until independently verified READY/current by provider.
  return {id,releaseCommit:commit,testedSourceSha:sha,status:'GITHUB_REF_UPDATED_NETLIFY_UNVERIFIED'};
 }finally{rmSync(tmp,{recursive:true,force:true});}
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 executeSingleUseRelease().then(result=>console.log('[DIC single-use release] '+JSON.stringify(result)))
  .catch(error=>{console.error('[DIC single-use release] DENIED: '+String(error.message));
   process.exitCode=1;});
}
