// Netlify production credit guard. Use only through the Bash adapter in
// netlify.toml: exact stdout DIC_BUILD_ALLOWED plus exit 42 is its allow signal.
// Every denial/interpreter failure maps to Netlify exit 0 (skip), and only the
// explicit allow maps to Netlify exit 1. Runs before dependencies on Node 18.
// Build hooks can bypass this guard.
// Release intent and a coherent last known credit ledger are always required.
// Owner explicitly monitors ongoing credits for the present unexpired grant;
// the stale-snapshot rule remains enforced for non-owner-managed mode.
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {checkRepository,readTracked} from '../audit/approval-coverage.mjs';
import {assertProductionClaim} from '../release/one-use-claim.mjs';

export function decide({context,branch,subject,ledger,today}){
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
  if(!ledger||ledger.provider!=='Netlify'||!Array.isArray(ledger.snapshots)||!ledger.snapshots.length)
    return {ignore:true,reason:'Netlify credit ledger unavailable'};
  const snapshot=ledger.snapshots.at(-1);
  const allowance=ledger.monthly_included_credits, cost=ledger.production_deploy_credits_each;
  const used=snapshot?.observed_total_used_credits, remaining=snapshot?.observed_remaining_credits;
  const maximumAge=ledger.release_policy?.maximum_snapshot_age_days;
  if(![allowance,cost,used,remaining,maximumAge].every(Number.isFinite)||allowance<=0||cost<=0||
     used<0||remaining<0||maximumAge<0||Math.abs(remaining-Math.max(0,allowance-used))>0.11)
    return {ignore:true,reason:'Credit snapshot missing or internally inconsistent'};
  if(remaining<cost)
    return {ignore:true,reason:'Insufficient verified Netlify credits for production release'};
  const ownerManaged=ledger.release_policy?.credit_monitoring_mode==='owner_managed';
  if(!ownerManaged&&ledger.release_policy?.post_release_billing_refresh_needed===true)
    return {ignore:true,reason:'Post-release Netlify credit refresh required before another production deploy'};
  const date=snapshot?.observed_date, d=typeof date==='string'?Date.parse(date+'T00:00:00Z'):NaN;
  const now=typeof today==='string'?Date.parse(today+'T00:00:00Z'):NaN;
  if(!Number.isFinite(d)||!Number.isFinite(now)||(now-d)/86400000<0)
    return {ignore:true,reason:'Netlify usage snapshot is dated incorrectly or in the future'};
  if(ownerManaged){
    if(ledger.release_policy?.explicit_publish_approval_per_release!==true)
      return {ignore:true,reason:'Owner approval is required for every production release'};
    // The screenshot proves this specific grant existed, not its balance after
    // grant expiration. Do not substitute unused operational credits.
    const end=snapshot?.plan_credits_expires;
    const expires=typeof end==='string'?Date.parse(end+'T00:00:00Z'):NaN;
    if(!Number.isFinite(expires)||now>expires)
      return {ignore:true,reason:'Known Personal credit grant expired: reconfirm plan availability'};
    // Owner takes responsibility for subsequent usage; still deny known low
    // credit, tampered totals, wrong branch or absent explicit release marker.
    return {ignore:false,reason:'Marked owner-approved release; owner-managed credit balance, grant valid'};
  }
  if((now-d)/86400000>maximumAge)
    return {ignore:true,reason:'Netlify usage snapshot is stale or has an invalid date'};
  return {ignore:false,reason:'Planned release: verified credits available and fresh'};
}

function run(){
  let ledger=null, subject='';
  try{
    ledger=JSON.parse(readFileSync(new URL('../../docs/NETLIFY_CREDIT_LEDGER.json',import.meta.url),'utf8'));
  }catch{ /* No usable snapshot: fail closed for production. */ }
  try{
    subject=execFileSync('git',['log','-1','--format=%s'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
  }catch{ /* Missing commit provenance: no production release. */ }
  let decision=decide({
    context:process.env.CONTEXT||'',
    branch:process.env.BRANCH||'',
    subject,ledger,today:new Date().toISOString().slice(0,10)
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
  console.error('[DIC credit gate] '+(decision.ignore?'Skip build':'Allow build')+': '+decision.reason);
  if(!decision.ignore)console.log('DIC_BUILD_ALLOWED');
  process.exitCode=decision.ignore?0:42;
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]) run();
