// Durable cross-run fallback claim for encrypted offsite backup.
// A GitHub ref creation is atomic; a concurrent/uncertain caller must NOT dispatch.
// A failed dispatch leaves the claim for manual reconciliation, never auto-retries.
import {createHash} from 'node:crypto';
const REPO='Schulzet3/The-Dial-In-Collective';
const API='https://api.github.com/repos/'+REPO;
const SHA=/^[a-f0-9]{40}$/;
export function backupClaimRef(freshnessKey){
 if(typeof freshnessKey!=='string'||!/^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(freshnessKey)||
  !Number.isFinite(Date.parse(freshnessKey)))
  throw Error('Current observed database-write UTC timestamp required for durable backup claim');
 const key=createHash('sha256').update('dic-release-backup-v1:'+new Date(freshnessKey).toISOString()).digest('hex');
 return 'refs/heads/dic-backup-claims/'+key.slice(0,40);
}
export async function requestEncryptedBackup({token,freshnessKey,fetcher=fetch}={}){
 if(!token)throw Error('GitHub Actions token required for encrypted backup fallback');
 const claimRef=backupClaimRef(freshnessKey);
 const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
  'X-GitHub-Api-Version':'2022-11-28'};
 const get=async path=>{
  const r=await fetcher(API+path,{method:'GET',headers});
  if(!r.ok)throw Error('Cannot inspect backup claim/runs; refusing duplicate dispatch');
  return r.json();
 };
 const runs=await get('/actions/workflows/nightly-backup.yml/runs?branch=main&per_page=20');
 if(!Array.isArray(runs.workflow_runs))throw Error('Malformed backup runs; refusing dispatch');
 const active=runs.workflow_runs.find(r=>['workflow_dispatch','schedule'].includes(r.event)&&
  ['queued','in_progress','waiting','requested','pending'].includes(r.status)&&
  Number.isFinite(Date.parse(r.created_at))&&
  Date.now()-Date.parse(r.created_at)<60*60*1000);
 if(active)return {status:'BACKUP_ALREADY_RUNNING_NOT_VERIFIED',run_id:active.id,
  workflow:'nightly-backup.yml'};
 const main=await get('/git/ref/heads/main');
 const mainSha=main?.object?.sha;
 if(!SHA.test(mainSha||''))throw Error('Cannot pin main backup workflow source');
 const created=await fetcher(API+'/git/refs',{method:'POST',headers:{
  ...headers,'Content-Type':'application/json'},
  body:JSON.stringify({ref:claimRef,sha:mainSha})});
 if(created.status===422){
  const existing=await get('/git/ref/'+claimRef.replace(/^refs\//,''));
  if(existing?.ref!==claimRef||!SHA.test(existing?.object?.sha||''))
   throw Error('Backup claim conflict cannot be independently verified');
  return {status:'BACKUP_ALREADY_CLAIMED_NOT_VERIFIED',claim_ref:claimRef,
   workflow:'nightly-backup.yml'};
 }
 if(created.status!==201)throw Error('Durable backup claim failed; no dispatch');
 const claim=await created.json();
 if(claim?.ref!==claimRef||claim?.object?.sha!==mainSha)
  throw Error('Durable backup claim readback mismatch; do not dispatch');
 // A main change after claim would dispatch different backup code; HOLD instead.
 const currentMain=await get('/git/ref/heads/main');
 if(currentMain?.object?.sha!==mainSha)
  throw Error('Main backup source changed after durable claim; manual reconciliation required');
 // Dispatch exactly once AFTER a durable atomic claim. Any failure is HOLD.
 const response=await fetcher(API+'/actions/workflows/nightly-backup.yml/dispatches',{
  method:'POST',headers:{...headers,'Content-Type':'application/json'},
  body:JSON.stringify({ref:'main'})});
 if(response.status!==204)throw Error('Backup claim exists but dispatch unconfirmed; manual reconciliation required');
 return {status:'BACKUP_REQUESTED_NOT_VERIFIED',workflow:'nightly-backup.yml',
  branch:'main',claim_ref:claimRef,claimed_main_sha:mainSha};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 requestEncryptedBackup({token:process.env.GITHUB_TOKEN,
  freshnessKey:process.env.DIC_LATEST_DATA_WRITE_UTC})
 .then(r=>console.log(JSON.stringify(r)))
 .catch(e=>{console.error(e.message);process.exitCode=1;});
}
