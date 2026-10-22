// Evaluate independently supplied provider snapshots. Never triggers a release.
const sha=/^[a-f0-9]{40}$/;
export function verifyPublishedRelease(x){
 if(!sha.test(x?.expected_release_sha||'')||!sha.test(x?.tested_source_sha||''))throw Error('Both exact source and release SHA required');
 const errors=[];
 if(x.github_release_head!==x.expected_release_sha)errors.push('Release branch mismatch');
 if(x.netlify?.state!=='ready'||x.netlify?.current!==true||x.netlify?.commit_ref!==x.expected_release_sha)errors.push('Current READY deploy mismatch');
 if(x.claim?.source_sha!==x.tested_source_sha||x.claim?.release_sha!==x.expected_release_sha||x.claim?.consumed_once!==true)errors.push('One-use provenance mismatch');
 if(!Array.isArray(x.expected_migrations)||!Array.isArray(x.actual_migrations)||JSON.stringify(x.expected_migrations)!==JSON.stringify(x.actual_migrations))errors.push('Migration readback mismatch');
 if(x.data_integrity?.independent!==true||x.data_integrity?.result!=='PASS')errors.push('Independent data check missing');
 return {schema_version:1,scope:'READ_ONLY_PROVIDER_READBACK',source_sha:x.tested_source_sha,release_sha:x.expected_release_sha,status:errors.length?'UNVERIFIED':'PROVIDER_SOURCE_VERIFIED',errors,device_acceptance:'SEPARATE_OWNER_EVIDENCE_REQUIRED'};
}
export function summarizeFailedChecks(run){
 if(!Number.isSafeInteger(run?.run_id)||!Array.isArray(run?.jobs))throw Error('Sanitized job metadata required');
 return {run_id:run.run_id,failed:run.jobs.filter(j=>j?.conclusion==='failure').map(j=>({job:String(j.name||'unknown').slice(0,80),steps:(j.steps||[]).filter(s=>s.conclusion==='failure').map(s=>String(s.name||'unnamed').slice(0,80))})),note:'Targeted diagnosis only. Full required exact-SHA tests and owner authorization remain necessary. Do not automatically retry a consumed release.'};
}
export function recoveryIndex(x){
 if(!Number.isFinite(Date.parse(x?.checked_at_utc||'')))throw Error('Verified timestamp required');
 for(const k of ['development','main','release','published'])if(!sha.test(x[k]||''))throw Error('Exact '+k+' SHA required');
 if(typeof x.next_action!=='string'||x.next_action.trim().length<5||x.next_action.length>500)throw Error('Bounded next action required');
 return {schema_version:1,scope:'NON_AUTHORITATIVE_RECOVERY_INDEX',checked_at_utc:x.checked_at_utc,development_sha:x.development,main_sha:x.main,release_sha:x.release,published_sha:x.published,next_action:x.next_action,authoritative_sources:['AGENTS.md','docs/ACTIVE_WORK_2026-10-20_APPROVAL_TO_RELEASE_INTEGRITY.md','docs/CURRENT_STATUS.md','docs/MASTER_SPECIFICATION.md','docs/DECISION_LEDGER.json'],disclaimer:'This small index never replaces full GitHub journal, live provider evidence or owner release approval.'};
}
