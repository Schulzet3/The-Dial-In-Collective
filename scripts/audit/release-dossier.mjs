// Source-only read-only release packet; NEVER generates an authorization or publishes.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const SHA=/^[a-f0-9]{40}$/;
const REQUIRED=['DIC cloud app build and tests','DIC cloud UX regression checks','DIC private visual review','DIC approval, implementation and continuity contract'];
const iso=s=>typeof s==='string'&&Number.isFinite(Date.parse(s))?Date.parse(s):NaN;
export function createReleaseDossier(input){
 if(!input||typeof input!=='object'||!SHA.test(input.source_sha||''))throw Error('Exact tested SHA required');
 const checks=Array.isArray(input.checks)?input.checks:[];
 const results=Object.fromEntries(REQUIRED.map(name=>{
  const matches=checks.filter(c=>c&&c.name===name&&c.head_sha===input.source_sha).sort((a,b)=>(b.run_id||0)-(a.run_id||0));
  const top=matches[0];
  return [name,top?.status==='completed'&&top?.conclusion==='success'?'PASS':'UNVERIFIED'];
 }));
 const gateErrors=Object.entries(results).filter(([,v])=>v!=='PASS').map(([k])=>'Missing current passing '+k);
 if(input.sql_changed&&!(input.isolated_sql?.head_sha===input.source_sha&&input.isolated_sql?.conclusion==='success'))
  gateErrors.push('Missing exact-source isolated SQL verification');
 if(!SHA.test(input.current_release_sha||''))gateErrors.push('Current published release SHA unavailable');
 if(!input.backup||!Number.isSafeInteger(input.backup.artifact_id)||!input.backup.verified_offsite)
  gateErrors.push('Fresh encrypted backup and independently verified offsite custody unavailable');
 const start=iso(input.backup?.snapshot_started_at_utc),write=iso(input.backup?.latest_observed_data_write_at_utc);
 if(!Number.isFinite(start)||!Number.isFinite(write)||start<write)gateErrors.push('Backup does not cover latest observed data write');
 if(!(Number.isFinite(input.credit?.observed_remaining)&&Number.isFinite(iso(input.credit?.observed_at_utc))&&input.credit.observed_remaining>=15))
  gateErrors.push('Fresh verified Netlify credit evidence unavailable');
 if(!input.owner_approval||input.owner_approval.status!=='UNCONSUMED'||input.owner_approval.tested_source_sha!==input.source_sha||!input.owner_approval.unique_release_id)
  gateErrors.push('Missing unique explicit owner approval bound to tested SHA');
 return {
  schema_version:1,mode:'READ_ONLY_PREVIEW',source_sha:input.source_sha,
  release_sha:SHA.test(input.current_release_sha||'')?input.current_release_sha:null,
  check_summary:results,gate_errors:gateErrors,
  review_state:gateErrors.length?'BLOCKED':'PREPARED_FOR_INDEPENDENT_RELEASE_CONTROLLER_CHECK',
  disclaimer:'Not a deploy grant. Live provider, exact fresh SHA, credits, expiry, single-use and per-release owner consent MUST be rechecked by release controller.'
 };
}
export function stageDurations(stages){
 const required=['requested_at','tested_at','approved_at','published_at','verified_at'];
 if(!stages||typeof stages!=='object'||required.some(k=>!Number.isFinite(iso(stages[k]))))throw Error('Complete valid stage timestamps required');
 const times=required.map(k=>iso(stages[k]));
 if(times.some((t,i)=>i>0&&t<times[i-1]))throw Error('Stage timestamps out of order');
 return {schema_version:1,request_to_test_minutes:(times[1]-times[0])/60000,approval_wait_minutes:(times[2]-times[1])/60000,approval_to_publish_minutes:(times[3]-times[2])/60000,publish_to_verify_minutes:(times[4]-times[3])/60000,full_elapsed_minutes:(times[4]-times[0])/60000,processing_excluding_approval_wait_minutes:((times[4]-times[0])-(times[2]-times[1]))/60000};
}
function main(){
 const arg=process.argv.find(x=>x.startsWith('--input='));
 if(!arg)throw Error('Provide --input=verified-evidence.json (no credentials, only provenance)');
 const value=JSON.parse(readFileSync(arg.slice(8),'utf8'));
 console.log(JSON.stringify(createReleaseDossier(value),null,2));
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname))main();
