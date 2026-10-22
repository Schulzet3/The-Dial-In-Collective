// Local, read-only SOURCE dossier. Deliberately cannot authorize a production release.
// It never fetches provider data, changes Git refs or reads tokens/member records.
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readTracked,checkRepository} from './approval-coverage.mjs';
import {planSingleUseClaim} from '../release/one-use-claim.mjs';

const SHA=/^[a-f0-9]{40}$/;
export const REQUIRED_CHECKS=Object.freeze(['approval','validate','cloud-tests','mobile-browser-qa','sql']);
export function buildSourceDossier({sourceSha,matrix,grants,consumption,nowIso=new Date().toISOString()}){
 if(!SHA.test(sourceSha||''))throw new Error('Expected exact 40-character Git HEAD SHA');
 // Source receipt consistency must never depend on credit ledger freshness.
 const current=matrix?.production||{};
 const receipt=current.pending_release||{};
 if(!SHA.test(current.exact_source_sha||'')||!current.netlify_deploy_id||
    !SHA.test(current.tested_application_source_sha||'')||
    receipt.actual_production_git_sha!==current.exact_source_sha||
    receipt.netlify_deploy_id!==current.netlify_deploy_id)
  throw new Error('Release receipt mismatch; stop source dossier generation');
 const candidates=(grants?.grants||[]).filter(grant=>{
  try{
   // Reuse the controller's pure validation; never persist or consume its plan.
   planSingleUseClaim({grant,releaseId:grant?.id,sourceSha,nowIso,ledger:consumption,
    currentPublishedSourceSha:consumption?.consumed?.at(-1)?.tested_source_sha||current.tested_application_source_sha});
   return true;
  }catch{return false;}
 });
 const uniqueUnconsumed=candidates.length===1?candidates[0].id:null;
 const pending=[
  'Independent GitHub Actions exact-SHA five-check readback not performed by this local process',
  'Fresh provider production branch and Netlify READY/current readback not performed by this local process',
  'Current backup coverage and exact restore are not independently verified by this process',
  'Actual signed-in owner/member device acceptance remains separate'
 ];
 if(!uniqueUnconsumed)pending.unshift('No unique unconsumed owner-approved one-use grant for this exact source SHA');
 return {
  schema_version:1,report_kind:'READ_ONLY_SOURCE_DOSSIER',source_sha:sourceSha,
  current_recorded_production:{
   release_id:receipt.id,git_sha:current.exact_source_sha,
   netlify_deploy_id:current.netlify_deploy_id,reported_state:'HISTORICAL_RECORDED_RECEIPT',
   provider_live_read_this_run:false
  },
  required_checks:[...REQUIRED_CHECKS],
  source_contracts_read:true,available_exact_source_grant_id:uniqueUnconsumed,
  pending_live_evidence:pending,
  next_action:'Read exact source CI and recovery/provider evidence; an owner publish command is the single release approval. Only the serialized one-use controller may publish.',
  release_ready:false,release_disposition:'HOLD_EXTERNAL_PREFLIGHT',
  private_github_free_checks_enforced:false,
  note:'This dossier is not owner consent, an approved release request, current provider evidence, or permission to publish.'
 };
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const flag=process.argv.slice(2);if(flag.length&&! (flag.length===1&&flag[0]==='--strict'))
   throw new Error('Usage: node scripts/audit/source-release-dossier.mjs [--strict]');
  checkRepository();
  const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',timeout:5000}).trim();
  const data=p=>JSON.parse(readTracked(p));
  const dossier=buildSourceDossier({
   sourceSha:sha,matrix:data('docs/APPROVAL_COVERAGE_MATRIX.json'),
   grants:data('docs/RELEASE_AUTHORIZATIONS.json'),
   consumption:data('docs/RELEASE_CONSUMPTION.json')
  });
  console.log(JSON.stringify(dossier,null,2));
  if(flag[0]==='--strict')process.exitCode=2; // Missing external proof always blocks.
 }catch(error){console.error('DIC source dossier HOLD: '+String(error.message));process.exitCode=2;}
}
