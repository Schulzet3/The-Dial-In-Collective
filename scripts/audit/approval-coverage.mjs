// Static source/decision audit: no credentials, network, timers or client data.
// The current owner ledger inventory must be deliberately updated whenever
// a NEW owner-approved decision lands. A source test is NOT mobile acceptance.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const root=resolve(fileURLToPath(new URL('../..',import.meta.url)));
export const readTracked=(path)=>{
 if(!/^[a-zA-Z0-9_./-]+$/.test(path)||path.startsWith('/')||
    path.split('/').includes('..'))throw Error('Invalid tracked path: '+path);
 return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
};
export function auditApprovalCoverage({matrix,ledger,credits,source=readTracked}){
 const errors=[];
 const record=(id,message)=>errors.push(id+': '+message);
 if(matrix.schema_version!==1)record('manifest','unsupported schema');
 const expected=Object.keys(ledger).filter(key=>key.startsWith('current_owner_')).sort();
 const actual=matrix.owner_decision_key_inventory||[];
 if(new Set(actual).size!==actual.length||JSON.stringify(actual)!==JSON.stringify(expected))
  record('inventory','owner decision keys changed; reclassify the new or removed approval in the matrix BEFORE build');
 const release=credits?.release_policy?.last_published_release;
 if(!release||release.deploy_id!==matrix.production?.netlify_deploy_id||
  release.published_commit_sha!==matrix.production?.exact_source_sha)
  record('release_receipt','published Git SHA or Netlify receipt differs between coverage matrix and credit ledger');
 const ids=new Set();
 for(const item of matrix.contracts||[]){
  if(!item.id||ids.has(item.id))record('contract','missing/duplicate contract id: '+item.id);
  ids.add(item.id);
  if(!Object.hasOwn(ledger,item.decision_key))
   record(item.id,'missing owner decision key '+item.decision_key);
  if(!item.scope||!item.implementation||!item.device_acceptance)
   record(item.id,'scope/implementation/device acceptance must be explicit');
  if(!Array.isArray(item.assertions)||!item.assertions.length)
   record(item.id,'no code/test coverage assertions');
  for(const check of item.assertions||[]){
   if(!check.path||!(check.contains||check.absent)){
    record(item.id,'invalid source assertion');continue;
   }
   let text='';
   try{text=source(check.path);}
   catch(err){record(item.id,'cannot read '+check.path+': '+String(err.message));continue;}
   if(check.within){
    if(!Array.isArray(check.within)||check.within.length!==2){
     record(item.id,'invalid scoped assertion');continue;
    }
    const start=text.indexOf(check.within[0]),end=text.indexOf(check.within[1],start+1);
    if(start<0||end<=start){record(item.id,'missing screen boundary in '+check.path);continue;}
    text=text.slice(start,end);
   }
   if(check.contains&&!text.includes(check.contains))
    record(item.id,check.path+' missing approved source/test marker '+check.contains.slice(0,95));
   if(check.absent&&text.includes(check.absent))
    record(item.id,check.path+' includes explicitly rejected/superseded behavior '+check.absent);
  }
 }
 const grinder=matrix.contracts?.find(item=>item.id==='grinder_range_new_setup');
 if(!grinder||grinder.scope.indexOf('New Setup only')<0)
  record('grinder','scope must remain explicit; do not infer Settings editor approval');
 const missing=matrix.active_gap_flags||[];
 for(const id of ['existing_setup_settings_not_new_setup','real_cross_account_api_acceptance','multi_worker_release_guard','all_chat_transcript_coverage'])
  if(!missing.some(g=>g.id===id&&g.status))record('open_gaps','missing risk '+id);
 return errors;
}
export function assertApprovedCoverage(options){
 const errors=auditApprovalCoverage(options);
 if(errors.length)throw Error('Approved-requirement coverage FAILED:\\n'+errors.map(e=>' - '+e).join('\\n'));
 return true;
}
export function checkRepository(){
 const matrix=JSON.parse(readTracked('docs/APPROVAL_COVERAGE_MATRIX.json'));
 const ledger=JSON.parse(readTracked('docs/DECISION_LEDGER.json'));
 const credits=JSON.parse(readTracked('docs/NETLIFY_CREDIT_LEDGER.json'));
 assertApprovedCoverage({matrix,ledger,credits});
 return {ownerDecisions:matrix.owner_decision_key_inventory.length,uiContracts:matrix.contracts.length,trackedGaps:matrix.active_gap_flags.length,publishedSource:matrix.production.exact_source_sha};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log('[DIC approval coverage] PASS '+JSON.stringify(checkRepository()));}
 catch(error){console.error(error.message);process.exitCode=1;}
}
