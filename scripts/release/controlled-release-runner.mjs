// Controlled GitHub Actions release runner (private, inert until hosted cutover).
// Serialized main OPS Actions: explicit manual fallback OR verified narrow chat request.
// GitHub private Free checks are advisory, not enforced. Use exact approved
// grant, live five-check API readback and atomic non-force one-use claim.
// Does NOT create Netlify deploys; one NON-FORCE push to release/production
// is the single atomic claim. Never retry a failed push automatically.
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync,appendFileSync} from 'node:fs';
import {retrieveVerifiedReleaseBundle} from './retrieve-certified-release-bundle.mjs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {planSingleUseClaim,assertReadyForRelease,validateReleaseGrant,RELEASE_BRANCH} from './one-use-claim.mjs';
import {validateChatReleaseRequest,validateManualReleaseRequest,assertChatPushEnvelope,CHAT_REQUEST_PATH,OPS_JOURNAL_PATH} from './chat-release-request.mjs';
import {classifyMigrationDiff,releaseReadinessMarkdown} from './migration-risk.mjs';
import {assessReleaseQueue,formatQueueReport,assertApprovedReadyBatch} from './release-queue.mjs';
const REPO='Schulzet3/The-Dial-In-Collective';
const SHA=/^[a-f0-9]{40}$/;
// The protected release ref must first be seeded at the independently
// verified current published source, with NO unapproved build. These two
// pinned hashes prevent stale/legacy build guards or silent claim history loss.
export const RELEASE_GENESIS_SHA='e7e16e5e13b35a6f4b6aa81db5b09b93b1aefc60';
export const MINIMUM_GUARDED_SOURCE_SHA='994a4d9f91e2475a96df42a46564c06e29f1c8d7';
// The future Git claim must NOT itself trigger a second Git-connected build.
// Preserve the exact [dic-publish] subject for claim validation, and place
// [skip netlify] in the commit BODY. The tested source's own Netlify guard
// independently checks the full message if Netlify does not honor the marker.
export function immutableReleaseClaimMessage({id,sourceSha}={}){
 if(!/^DIC-[0-9]{8}-[A-Z0-9][A-Z0-9_-]{5,63}$/.test(id||'')||!SHA.test(sourceSha||''))
  throw Error('Invalid immutable release claim identity');
 return {subject:'Release DIC: '+id+' [dic-publish]',
  body:'[skip netlify]\\n\\nImmutable Netlify digest/function publication only; do not rebuild from Git.\\nTested source: '+sourceSha};
}

export function initialLedgerOnMissing({releaseHead,readLedger}){
 try{return readLedger();}
 catch{
  if(releaseHead!==RELEASE_GENESIS_SHA)
   throw new Error('Consumption ledger missing from NON-GENESIS release: no replay recovery permitted');
  return JSON.stringify({schema_version:1,consumed:[]});
 }
}
// git push --porcelain writes per-ref rejection reasons to stdout. Retain
// both channels, but never print command arguments, credentials or raw URLs.
export function redactTransportText(value,secrets=[]){
 const normalize=value=>String(value||'').replace(/\u001b\[[0-9;]*[A-Za-z]/g,'')
  .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g,'');
 let text=normalize(value);
 // Normalize before matching: embedded terminal escapes must not turn a
 // missed credential into readable plaintext after the redaction pass.
 for(const secret of secrets.filter(s=>typeof s==='string'&&s.length>0).sort((a,b)=>b.length-a.length)){
  for(const encoded of [secret,encodeURIComponent(secret),Buffer.from('x-access-token:'+secret).toString('base64')].map(normalize))
   if(encoded)text=text.split(encoded).join('[REDACTED]');
 }
 return text.replace(/\b(?:https?|ssh):\/\/[^\s'"<>]+/gi,'[REDACTED_URL]')
  .replace(/\b(?:authorization\s*:\s*)?(?:bearer|basic)\s+[^\s'"<>]+/gi,'[REDACTED_AUTH]')
  .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)\b/g,'[REDACTED_TOKEN]')
  .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,'[REDACTED_JWT]')
  .trim().slice(0,1600);
}
export function gitFailureDiagnostic(error,{operation='command',secrets=[]}={}){
 const stdout=redactTransportText(error?.stdout,secrets),stderr=redactTransportText(error?.stderr,secrets);
 const detail=stdout+'\n'+stderr;
 const category=/without.*workflows?.*permission|refusing to allow.*workflow/i.test(detail)?'WORKFLOW_PERMISSION_DENIED':
  /non-fast-forward|fetch first|stale info|cannot lock ref/i.test(detail)?'REF_CONFLICT':
  /authentication failed|permission.*denied|HTTP 403|returned error: 403/i.test(detail)?'AUTHORIZATION_DENIED':
  /timed out|ETIMEDOUT/.test(String(error?.code||''))?'TRANSPORT_TIMEOUT':'GIT_COMMAND_FAILED';
 return {operation:/^[a-z-]+$/.test(operation)?operation:'command',
  exit_code:Number.isInteger(error?.status)?error.status:null,category,stdout,stderr};
}
const git=(args,{input,env,trim=true}={})=>{
 const environment=env||process.env;
 try{const output=execFileSync('git',args,{encoding:'utf8',input,
  stdio:['pipe','pipe','pipe'],env:environment,timeout:60_000,maxBuffer:4*1024*1024});
  return trim?output.trim():output;}
 catch(error){
  const secrets=Object.entries(environment).filter(([key])=>/TOKEN|SECRET|PASSWORD|AUTH|CREDENTIAL|DB_URL|PRIVATE_KEY/i.test(key)).map(([,value])=>value);
  throw Error('Git operation failed: '+JSON.stringify(gitFailureDiagnostic(error,{operation:args[0],secrets})));
 }
};
const json=(s,label)=>{try{return JSON.parse(s);}catch{throw Error(label+' is not valid JSON');}};
function sourceGrant(data,id){
 if(data?.schema_version!==1||!Array.isArray(data.grants))throw Error('No source-of-truth owner approval list');
 const grants=data.grants.filter(g=>g.id===id);
 if(grants.length!==1)throw Error('Owner grant absent or duplicate ID: '+id);
 return grants[0];
}
export function selectLatestCiConclusions(checkRuns,sha){
 const scores=new Map();
 for(const check of checkRuns||[]){
  if(check.head_sha!==sha||check.app?.slug!=='github-actions')continue;
  if(!Number.isSafeInteger(check.id)||check.id<=0)throw Error('Invalid GitHub check-run identity');
  const prior=scores.get(check.name);
  // A newer queued/in-progress run must override an older completed PASS.
  // completed_at cannot order attempts because it is null while running.
  if(!prior||check.id>prior.id)scores.set(check.name,check);
 }
 return Object.fromEntries([...scores].map(([name,check])=>[
  name,check.status==='completed'?check.conclusion:'pending'
 ]));
}
// Only Git exit 1 establishes a non-ancestor. Other errors fail the release shut.
export function verifiedGitAncestry(a,b,{run=execFileSync}={}){
 try{run('git',['merge-base','--is-ancestor',a,b],{stdio:'ignore',timeout:15000});return true;}
 catch(error){
  if(error?.status===1)return false;
  throw Error('Git ancestry verification unavailable; cannot certify release isolation');
 }
}
export function assertCurrentReleaseRefs({developmentHead,releaseHead,actualDevelopmentHead,actualReleaseHead}){
 if(!SHA.test(actualDevelopmentHead||'')||!SHA.test(actualReleaseHead||'')||
   actualDevelopmentHead!==developmentHead||actualReleaseHead!==releaseHead)
  throw Error('Development approval or release HEAD changed during preflight; recover before a new request');
 return true;
}
async function ciForSha(sha,token){
 const url='https://api.github.com/repos/'+REPO+'/commits/'+sha+'/check-runs?per_page=100';
 const response=await fetch(url,{headers:{Authorization:'Bearer '+token,
  Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}});
 if(!response.ok)throw Error('Cannot independently verify exact-source GitHub CI: HTTP '+response.status);
 const data=await response.json();
 if(data.total_count>100)throw Error('Too many check runs; require explicit pagination review');
 if(!Array.isArray(data.check_runs))throw Error('GitHub CI response lacks check runs');
 return selectLatestCiConclusions(data.check_runs,sha);
}
const setBlob=(path,content,env)=>{
 const sha=git(['hash-object','-w','--stdin'],{input:content,env});
 if(!SHA.test(sha))throw Error('Unable to store release record');
 git(['update-index','--add','--cacheinfo','100644,'+sha+','+path],{env});
};
export async function executeSingleUseRelease(settings=process.env){
 const chatPush=settings.GITHUB_EVENT_NAME==='push';
 if(settings.GITHUB_ACTIONS!=='true'||settings.GITHUB_REF!=='refs/heads/main'||
  !['workflow_dispatch','push'].includes(settings.GITHUB_EVENT_NAME)||
  settings.GITHUB_REPOSITORY!==REPO)
  throw Error('Release is only valid in controlled main-branch GitHub Actions');
 // On push, never trust INPUT_* environment variables or simply having a file.
 // Require the *exact* event commit to create/update only a request and journal.
 let chatRequest;
 let validatePushEnvelope;

 if(chatPush){
  if(!SHA.test(settings.GITHUB_SHA||'')||
     git(['rev-parse','HEAD'])!==settings.GITHUB_SHA)
   throw Error('Chat release request commit SHA does not match checked-out HEAD');
  const parents=git(['rev-list','--parents','-n','1','HEAD']).split(/\s+/);
  if(parents.length!==2)throw Error('Chat release requests require one parent');
  if(!SHA.test(settings.DIC_PUSH_BEFORE_SHA||'')||
     settings.DIC_PUSH_BEFORE_SHA!==parents[1])
   throw Error('Chat release multi-commit or stale before-SHA event refused');
  const changedPaths=git(['diff-tree','--no-commit-id','--name-only','-r','HEAD'])
   .split(/\r?\n/).filter(Boolean);
  const request=json(git(['show','HEAD:'+CHAT_REQUEST_PATH]),'Chat release request');
  const commitSubject=git(['log','-1','--format=%s','HEAD']);
  validateChatReleaseRequest({request,changedPaths,commitSubject,
   eventBeforeSha:settings.DIC_PUSH_BEFORE_SHA,commitParentSha:parents[1],
   eventHeadSha:settings.GITHUB_SHA,checkedOutHeadSha:git(['rev-parse','HEAD']),
   nowIso:new Date().toISOString()});
  chatRequest=request;
  validatePushEnvelope=()=>assertChatPushEnvelope({
   eventForced:settings.DIC_PUSH_FORCED,eventAfterSha:settings.DIC_PUSH_AFTER_SHA,
   eventHeadSha:settings.GITHUB_SHA,
   remoteMainSha:git(['ls-remote','origin','refs/heads/main']).split(/\s+/)[0],
   request,previousJournal:git(['show',parents[1]+':'+OPS_JOURNAL_PATH],{trim:false}),
   currentJournal:git(['show','HEAD:'+OPS_JOURNAL_PATH],{trim:false})
  });
  validatePushEnvelope();
 }
 const enforcedProtection=settings.DIC_PRIVATE_BRANCH_PROTECTION_VERIFIED==='YES';
 const privateFreeMode=settings.DIC_PRIVATE_FREE_COMPENSATING_MODE==='YES';
 if((!enforcedProtection&&!privateFreeMode)||
  settings.DIC_NETLIFY_PRODUCTION_BRANCH_VERIFIED!==RELEASE_BRANCH||
  settings.DIC_RELEASE_CONTROLLER_VERIFIED!=='YES')
  throw Error('Hosted Netlify cutover and private Free controller not independently enabled');
 const id=chatPush?chatRequest.release_id:(settings.INPUT_RELEASE_ID||'');
 const sha=chatPush?chatRequest.tested_source_sha:(settings.INPUT_TESTED_SOURCE_SHA||'');
 if(!SHA.test(sha)||!/^DIC-[0-9]{8}-[A-Z0-9][A-Z0-9_-]{5,63}$/.test(id))
  throw Error('Missing exact release ID or 40-character source SHA');
 let manualRequest;
 if(!chatPush){
  const raw=settings.INPUT_RELEASE_EVIDENCE_JSON;
  if(typeof raw!=='string'||!raw.trim()||raw.length>32_768)
   throw Error('Manual release requires explicit, bounded schema-v4 recovery evidence JSON');
  manualRequest=json(raw,'Manual release evidence');
 }
 const token=settings.GITHUB_TOKEN;
 if(!token)throw Error('GitHub Actions write token missing');
 // Read the current remote refs. No force, no rebases, no automatic retries.
 git(['fetch','--no-tags','origin',
  '+refs/heads/development/backend-foundation:refs/remotes/origin/development/backend-foundation',
  '+refs/heads/'+RELEASE_BRANCH+':refs/remotes/origin/'+RELEASE_BRANCH]);
 const developmentHead=git(['rev-parse','refs/remotes/origin/development/backend-foundation']);
 const releaseHead=git(['rev-parse','refs/remotes/origin/'+RELEASE_BRANCH]);
 if(!SHA.test(developmentHead)||!SHA.test(releaseHead))throw Error('Exact remote branches unavailable');
 const recheckRemoteRefs=()=>{
  const refs=new Map(git(['ls-remote','origin','refs/heads/development/backend-foundation',
   'refs/heads/'+RELEASE_BRANCH]).split(/\r?\n/).filter(Boolean).map(line=>{
    const [value,ref]=line.split(/\s+/);return [ref,value];
   }));
  assertCurrentReleaseRefs({developmentHead,releaseHead,
   actualDevelopmentHead:refs.get('refs/heads/development/backend-foundation'),
   actualReleaseHead:refs.get('refs/heads/'+RELEASE_BRANCH)});
 };
 git(['merge-base','--is-ancestor',sha,developmentHead]);
 // Exclude historically green application SHAs which still had the old
 // development-branch publication guard. Never silently deploy an old build.
 git(['merge-base','--is-ancestor',MINIMUM_GUARDED_SOURCE_SHA,sha]);
 const checkedGuard=git(['show',sha+':scripts/netlify/should-ignore-build.mjs']);
 if(!checkedGuard.includes("branch!=='release/production'")||
    !checkedGuard.includes('assertProductionClaim'))
  throw new Error('Tested source lacks protected dedicated-release build gate');
 if(!checkedGuard.includes('Immutable release claim: suppress Git-connected rebuild')||
    !checkedGuard.includes('--format=%B'))
  throw new Error('Tested source lacks independent immutable claim Git-CD suppression');
 const approvals=json(git(['show',developmentHead+':docs/RELEASE_AUTHORIZATIONS.json']),'Owner grants');
 const grant=sourceGrant(approvals,id);
 if(!enforcedProtection&&(!privateFreeMode||
    grant.owner_private_free_compensating_controls!==true))
  throw Error('Owner-signed private Free residual-control acceptance missing');
 const validateRequest=()=>chatPush?validateChatReleaseRequest({
  request:chatRequest,
  changedPaths:git(['diff-tree','--no-commit-id','--name-only','-r','HEAD'])
   .split(/\r?\n/).filter(Boolean),
  commitSubject:git(['log','-1','--format=%s','HEAD']),
  expectedDevelopmentHead:developmentHead,expectedReleaseHead:releaseHead,
  ownerApprovalSource:grant.approval_source,
  eventBeforeSha:settings.DIC_PUSH_BEFORE_SHA,
  commitParentSha:git(['rev-list','--parents','-n','1','HEAD']).split(/\s+/)[1],
  eventHeadSha:settings.GITHUB_SHA,checkedOutHeadSha:git(['rev-parse','HEAD']),
  nowIso:new Date().toISOString()
 }):validateManualReleaseRequest({
  request:manualRequest,inputReleaseId:id,inputTestedSourceSha:sha,
  expectedDevelopmentHead:developmentHead,expectedReleaseHead:releaseHead,
  ownerApprovalSource:grant.approval_source,
  expectedMainHead:git(['ls-remote','origin','refs/heads/main']).split(/\s+/)[0],
  checkedOutHeadSha:git(['rev-parse','HEAD']),workflowHeadSha:settings.GITHUB_SHA,
  nowIso:new Date().toISOString()
 });
 validateRequest();
 const requestEvidence=chatPush?chatRequest:manualRequest;
 const migrationDiff=git(['diff','--name-status',releaseHead,sha,'--','supabase/migrations']);
 const migrationRisk=classifyMigrationDiff(migrationDiff,path=>git(['show',sha+':'+path]));
 if(requestEvidence.database_change_risk!==migrationRisk.risk)
  throw Error('Database risk declaration differs from source-to-published SQL migration diff');
 const statuses=await ciForSha(sha,token);
 assertReadyForRelease({requiredChecks:statuses,flags:{
  githubPrivateBranchProtectionVerified:enforcedProtection,
  githubPrivateFreeCompensatingControlsVerified:privateFreeMode&&
    grant.owner_private_free_compensating_controls===true,
  netlifyProductionBranchVerified:true,defaultBranchRunnerVerified:true}});
 if(settings.GITHUB_STEP_SUMMARY){
  appendFileSync(settings.GITHUB_STEP_SUMMARY,releaseReadinessMarkdown({id,sha,releaseHead,ci:statuses,migrationRisk,request:requestEvidence}));
 }
 const oldRaw=initialLedgerOnMissing({releaseHead,
  readLedger:()=>git(['show',releaseHead+':docs/RELEASE_CONSUMPTION.json'])});
 const ledger=json(oldRaw,'Release ledger');
 // A tested SHA is not automatically a release: every changed app path must
 // belong to a READY queued item, and any merged unfinished work blocks.
 const lastPublishedTestedSha=ledger.consumed.at(-1)?.tested_source_sha||releaseHead;
 const queuedSource=json(git(['show',sha+':docs/RELEASE_QUEUE.json']),'Durable release queue');
 const changedSourcePaths=git(['diff','--name-only','--no-renames',lastPublishedTestedSha,sha])
  .split(/\r?\n/).filter(Boolean);
 const queueGate=assessReleaseQueue(queuedSource,{
  publishedSourceSha:lastPublishedTestedSha,candidateSha:sha,changedPaths:changedSourcePaths,
  isAncestor:(a,b)=>verifiedGitAncestry(a,b)
 });
 if(settings.GITHUB_STEP_SUMMARY)appendFileSync(settings.GITHUB_STEP_SUMMARY,formatQueueReport(queueGate));
 if(!queueGate.ready)throw Error('Release queue HOLD: '+queueGate.errors.join('; ').slice(0,1200));
 assertApprovedReadyBatch(grant,queueGate);
 // A Git SHA cannot certify deployable bytes. The automatic bridge fetches
 // the exact successful CI run and verifies static ZIP + function ZIP + v4
 // certificate before ANY grant claim or provider mutation.
 if(!(chatPush&&chatRequest.mode==='validate_only')){
  const bundle=await retrieveVerifiedReleaseBundle({token,sourceSha:sha});
  const certified=bundle.receipt.ready_item_ids.slice().sort();
  const approved=queueGate.ready_items.map(x=>x.id).sort();
  if(JSON.stringify(certified)!==JSON.stringify(approved))
   throw Error('Immutable artifact READY scope differs from approved source batch');
  if(bundle.manifest.functions['coffee-url-preview']!==bundle.receipt.immutable_function_sha256)
   throw Error('Certified Netlify Function digest differs from manifest');
  if(settings.GITHUB_STEP_SUMMARY)appendFileSync(settings.GITHUB_STEP_SUMMARY,
   '\n## Exact-source immutable artifact readback\n- Source: '+sha+
   '\n- CI run: '+bundle.run_id+
   '\n- Static files: '+Object.keys(bundle.files).length+
   '\n- Function: coffee-url-preview (SHA-256 verified)\n'+
   '- Status: verified bytes; **NOT published**, owner grant unconsumed.\n');
  // The existing Git-connected production publication is preserved until
  // backup verification and one atomic digest+function provider transaction
  // can be proven. Never use a Git push as a second rebuild publisher.
  throw Error('Immutable deployment HOLD: verified artifact retrieved, but provider transaction and independent offsite backup verification are not activated; no Git push');
 }
 const nowIso=new Date().toISOString();
 const planned=planSingleUseClaim({grant,releaseId:id,sourceSha:sha,nowIso,
  ledger,currentPublishedSourceSha:ledger.consumed.at(-1)?.tested_source_sha||releaseHead});
 // A live end-to-end, guard-checked request preflight without any Git/Netlify
 // write, provider activity or grant consumption. A later publish request must be a NEW
 // exact two-file owner-authorized commit and re-checks ALL fresh evidence.
 recheckRemoteRefs();
 validateRequest();
 if(chatPush)validatePushEnvelope();
 if(chatPush&&chatRequest.mode==='validate_only')
  return {id,testedSourceSha:sha,status:'INERT_CHAT_RELEASE_PREFLIGHT_PASS_NO_GIT_PUSH'};
 const tmp=mkdtempSync(join(tmpdir(),'dic-release-index-'));
 try{
  const env={...process.env,GIT_INDEX_FILE:join(tmp,'index'),
   GIT_AUTHOR_NAME:'DIC single-use release controller',GIT_AUTHOR_EMAIL:'release-controller@users.noreply.github.com',
   GIT_COMMITTER_NAME:'DIC single-use release controller',GIT_COMMITTER_EMAIL:'release-controller@users.noreply.github.com'};
  git(['read-tree',sha],{env});
  setBlob('docs/RELEASE_CONSUMPTION.json',JSON.stringify(planned,null,2)+'\n',env);
  setBlob('docs/RELEASE_AUTHORIZATIONS.json',JSON.stringify(approvals,null,2)+'\n',env);
  // Preserve the latest canonical development journal in the release tree,
  // append the contemporaneous *GitHub claim*, and do not claim Netlify READY.
  const claimReceipt={schema_version:1,release_id:id,tested_source_sha:sha,
   previous_release_head_sha:releaseHead,claimed_at_utc:nowIso,
   status:'GITHUB_CLAIM_PENDING_NETLIFY_PROVIDER_READBACK',
   granted_single_publication:true,
   approved_ready_queue_items:queueGate.ready_items};
  const journalPath='docs/ACTIVE_WORK_2026-10-20_APPROVAL_TO_RELEASE_INTEGRITY.md';
  const latestJournal=git(['show',developmentHead+':'+journalPath]);
  const newJournal=latestJournal.trimEnd()+'\n\n## Release controller claim — '+nowIso+
   '\n- Approved release '+id+' from tested application SHA '+sha+
   ' claimed exactly once against previous release ref '+releaseHead+
   '. Five GitHub CI checks passed and one-use authorization ledger was written.\n'+
   '- **Not yet a Netlify publication receipt:** independently check READY/current deployed SHA before marking Deployed.\n';
  setBlob(journalPath,newJournal,env);
  setBlob('docs/RELEASE_CLAIM_RECEIPT.json',JSON.stringify(claimReceipt,null,2)+'\n',env);
  const tree=git(['write-tree'],{env});
  const {subject,body}=immutableReleaseClaimMessage({id,sourceSha:sha});
  const commit=git(['commit-tree',tree,'-p',releaseHead,'-m',subject,'-m',body],{env});
  if(!SHA.test(commit))throw Error('No immutable Git release commit');
  // Capture a recoverable candidate without claiming the ref was accepted.
  console.log('[DIC immutable claim prepared] '+JSON.stringify({release_id:id,
   release_commit:commit,tested_source_sha:sha,previous_release_head:releaseHead,
   status:'PREPARED_NOT_PUSHED_NETLIFY_UNVERIFIED'}));
  recheckRemoteRefs();
  validateReleaseGrant(grant,{releaseId:id,sourceSha:sha,nowIso:new Date().toISOString()});
  validateRequest();
  if(chatPush)validatePushEnvelope();
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
