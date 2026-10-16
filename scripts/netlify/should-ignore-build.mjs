// Netlify production credit guard. Netlify's "ignore" convention is inverted:
// exit 0 skips a build; exit 1 proceeds. Runs before dependency install on
// Node 18, so use built-in Node modules only. Build hooks can bypass this guard.
// Release intent + a recently verified Netlify credit balance are both required.
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

export function decide({context,branch,subject,ledger,today}){
  // Owner requested screenshots before any Netlify publication, including previews.
  if(branch==='work/visual-refresh-20261015')
    return {ignore:true,reason:'Private visual review: no Netlify deployment authorized'};
  if(context==='deploy-preview'||context==='branch-deploy')
    return {ignore:true,reason:'Owner release hold: no unapproved Netlify preview or branch publication'};
  if(context!=='production')
    return {ignore:true,reason:'Unknown/unapproved Netlify context'};
  if(branch!=='development/backend-foundation')
    return {ignore:true,reason:'Not the approved owner preview production branch'};
  if(!/^Release DIC: .+ \[dic-publish\]$/.test(subject||''))
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
  if(ledger.release_policy?.post_release_billing_refresh_needed===true)
    return {ignore:true,reason:'Post-release Netlify credit refresh required before another production deploy'};
  const date=snapshot?.observed_date, d=typeof date==='string'?Date.parse(date+'T00:00:00Z'):NaN;
  const now=typeof today==='string'?Date.parse(today+'T00:00:00Z'):NaN;
  if(!Number.isFinite(d)||!Number.isFinite(now)||(now-d)/86400000<0||
     (now-d)/86400000>maximumAge)
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
  const decision=decide({
    context:process.env.CONTEXT||'',
    branch:process.env.BRANCH||'',
    subject,ledger,today:new Date().toISOString().slice(0,10)
  });
  console.log('[DIC credit gate] '+(decision.ignore?'Skip build':'Allow build')+': '+decision.reason);
  process.exitCode=decision.ignore?0:1;
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]) run();
