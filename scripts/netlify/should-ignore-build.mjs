// Netlify one-use approved-release guard. Use only through the Bash adapter in
// netlify.toml: exact stdout DIC_BUILD_ALLOWED plus exit 42 is its allow signal.
// Every denial/interpreter failure maps to Netlify exit 0 (skip), and only the
// explicit allow maps to Netlify exit 1. Runs before dependencies on Node 18.
// Build hooks can bypass this guard.
// Netlify credit availability is monitored solely by the owner.
// Never consult a billing ledger or insist on a minimum balance/expiry check.
import {execFileSync} from 'node:child_process';
import {checkRepository,readTracked} from '../audit/approval-coverage.mjs';
import {assertProductionClaim} from '../release/one-use-claim.mjs';

export function decide({context,branch,subject,commitMessage=''}){
  // A one-use Git claim may carry the release subject but MUST NOT start a
  // second Git-connected build when immutable Netlify publication is selected.
  // Check the entire commit message, not just the subject; the provider's
  // [skip netlify] handling is an additional safeguard, not our only gate.
  if(/(?:^|\s)\[skip netlify\](?=\s|$)/i.test(commitMessage))
    return {ignore:true,reason:'Immutable release claim: suppress Git-connected rebuild'};
  // Do not publish previews or production without a deliberate, separately
  // owner-approved release. Ordinary commits and docs pushes must be ignored.
  if(branch==='work/visual-refresh-20261015')
    return {ignore:true,reason:'Private visual review: no Netlify deployment authorized'};
  if(context==='deploy-preview'||context==='branch-deploy')
    return {ignore:true,reason:'Owner release hold: no unapproved Netlify preview or branch publication'};
  if(context!=='production')
    return {ignore:true,reason:'Unknown/unapproved Netlify context'};
  // Development is NEVER a production publish source. Only an atomic approved
  // update of the dedicated release ref may trigger a Netlify production build.
  if(branch!=='release/production')
    return {ignore:true,reason:'Not the dedicated atomic production release branch'};
  if(!/^Release DIC: DIC-[0-9]{8}-[A-Z0-9][A-Z0-9_-]{5,63} \[dic-publish\]$/.test(subject||''))
    return {ignore:true,reason:'No explicit, tested release marker'};
  // Balance, dated screenshots and plans are never a Netlify release gate.
  // The full on-disk grant and one-use claim are verified in run() below.
  return {ignore:false,reason:'Explicit approved release marker; owner manages Netlify credits'};
}

function run(){
  let subject='',commitMessage='';
  try{
    commitMessage=execFileSync('git',['log','-1','--format=%B'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
    subject=commitMessage.split(/\r?\n/,1)[0]||'';
  }catch{ /* Missing commit provenance: no production release. */ }
  let decision=decide({
    context:process.env.CONTEXT||'',
    branch:process.env.BRANCH||'',
    subject,commitMessage
  });
  if(!decision.ignore){
   try{
    // A commit marker alone is NOT the owner's new release authorization.
    // Fail closed when inventory/code/test anchors or release consent drift.
    checkRepository();
    const grants=JSON.parse(readTracked('docs/RELEASE_AUTHORIZATIONS.json'));
    const consumed=JSON.parse(readTracked('docs/RELEASE_CONSUMPTION.json'));
    if(grants.schema_version!==1||!Array.isArray(grants.grants))
     throw Error('No versioned owner grant file');
    const last=consumed.consumed?.at(-1);
    if(!last)throw Error('No consumed release claim');
    const approved=grants.grants.filter(x=>x.id===last.id);
    if(approved.length!==1)throw Error('Missing or duplicated owner grant');
    assertProductionClaim({ledger:consumed,grant:approved[0],commitSubject:subject,
     sourceSha:last.tested_source_sha,nowIso:new Date().toISOString()});
   }catch(error){
    decision={ignore:true,reason:'Approval or implementation coverage failed: '+String(error.message).slice(0,260)};
   }
  }
  console.error('[DIC one-use release gate] '+(decision.ignore?'Skip build':'Allow build')+': '+decision.reason);
  if(!decision.ignore)console.log('DIC_BUILD_ALLOWED');
  process.exitCode=decision.ignore?0:42;
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]) run();
