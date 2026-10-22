// Local, read-only SOURCE dossier. Deliberately cannot authorize a production release.
// It never fetches provider data, changes Git refs or reads tokens/member records.
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readTracked,checkRepository} from './approval-coverage.mjs';

const SHA=/^[a-f0-9]{40}$/;
export const REQUIRED_CHECKS=Object.freeze(['approval','validate','cloud-tests','mobile-browser-qa','sql']);
export function buildSourceDossier({sourceSha,matrix,credits,grants,consumption}){
 if(!SHA.test(sourceSha||''))throw new Error('Expected exact 40-character Git HEAD SHA');
 const current=credits?.release_policy?.last_published_release;
 if(!current||matrix?.production?.exact_source_sha!==current.published_commit_sha||
  matrix?.production?.netlify_deploy_id!==current.deploy_id)
  throw new Error('Release receipt mismatch; stop source dossier generation');
 const spent=new Set((consumption?.consumed||[]).map(x=>x.id));
 const candidates=(grants?.grants||[]).filter(g=>g.tested_source_sha===sourceSha&&
   g.owner_approved===true&&g.max_publications===1&&!spent.has(g.id));
 const uniqueUnconsumed=candidates.length===1?candidates[0].id:null;
 const pending=[
  'Independent GitHub Actions exact-SHA five-check readback not performed by this local process',
  'Fresh provider production branch and Netlify READY/current readback not performed by this local process',
  'Current backup coverage and exact restore are not independently verified by this process',
  'Current applicable credit balance/actual release cost not checked by this process',
  'Actual signed-in owner/member device acceptance remains separate'
 ];
 if(!uniqueUnconsumed)pending.unshift('No unique unconsumed owner-approved one-use grant for this exact source SHA');
 return {
  schema_version:1,report_kind:'READ_ONLY_SOURCE_DOSSIER',source_sha:sourceSha,
  current_recorded_production:{
   release_id:current.release_id,git_sha:current.published_commit_sha,
   netlify_deploy_id:current.deploy_id,reported_state:current.netlify_status,
   provider_live_read_this_run:false
  },
  required_checks:[...REQUIRED_CHECKS],
  source_contracts_read:true,available_exact_source_grant_id:uniqueUnconsumed,
  pending_live_evidence:pending,
  next_action:'Read exact source CI and recovery/credit/provider evidence; obtain a fresh explicit release instruction when needed. Only the pre-existing serialized single-use controller may publish.',
  release_ready:false,release_disposition:'HOLD_EXTERNAL_PREFLIGHT',
  private_github_free_checks_enforced:false,
  note:'This dossier is not owner consent, an approved release request, current provider evidence, or permission to spend credits.'
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
   credits:data('docs/NETLIFY_CREDIT_LEDGER.json'),
   grants:data('docs/RELEASE_AUTHORIZATIONS.json'),
   consumption:data('docs/RELEASE_CONSUMPTION.json')
  });
  console.log(JSON.stringify(dossier,null,2));
  if(flag[0]==='--strict')process.exitCode=2; // Missing external proof always blocks.
 }catch(error){console.error('DIC source dossier HOLD: '+String(error.message));process.exitCode=2;}
}
