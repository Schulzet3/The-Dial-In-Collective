// Read-only first-parent Git evidence for the existing approval continuity job.
// An authenticated ChatGPT retrieval cannot be proved by source control.
export const PRE_FLIGHT_MARKER='DIC_PREFLIGHT_VERIFIED';
const guardPath='scripts/audit/preflight-receipt.mjs';
const sourcePath='docs/ai/PREFLIGHT.md';
const central='docs/ACTIVE_WORK_2026-10-20_APPROVAL_TO_RELEASE_INTEGRITY.md';
const scoped=/^docs\/workstreams\/(?:issue-[1-9][0-9]*|ops-[a-z0-9-]+(?:-N[1-9][0-9]*)?|release-[0-9]{8}|release-ready-batch|release-queue-prep-20261102)\.md$/;
const source=/^(site\/|src\/|netlify\/functions\/|supabase\/|scripts\/|tests\/|\.github\/(?:workflows|actions)\/|build_cloud\.mjs$|eslint\.config\.mjs$|netlify\.toml$|package(?:-lock)?\.json$)/;
const receipt=/^DIC_PREFLIGHT_VERIFIED development_sha=([a-f0-9]{40}) preflight_blob_sha=([a-f0-9]{40})$/;
export function auditPreflightReceipt({sha,parent,paths,run}){
 const errors=[],changed=Array.isArray(paths)?paths:[];
 if(!changed.some(p=>source.test(p)))return {status:'NOT_APPLICABLE_DOCS',validated:0,errors};
 if(!parent)return {status:'NOT_APPLICABLE_ROOT',validated:0,errors};
 // The rollout is not retroactive to historic feature commits. A current
 // development merge delta is enforced because its first parent has the guard.
 try{run(['cat-file','-e',parent+':'+guardPath]);}
 catch{return {status:'NOT_APPLICABLE_BEFORE_ROLLOUT',validated:0,errors};}
 const journals=changed.filter(p=>p===central||scoped.test(p));
 if(!journals.length)return {status:'FAILED',validated:0,errors:['source change lacks a recognized same-commit journal']};
 let found=0,validated=0;
 for(const journal of journals){
  let diff='';
  try{diff=run(['diff','--no-ext-diff','--no-color','--unified=0',parent,sha,'--',journal]);}
  catch(error){errors.push('cannot inspect newly added journal lines: '+String(error.message));continue;}
  for(const line of diff.split(/\r?\n/)){
   if(!line.startsWith('+')||line.startsWith('+++'))continue;
   const text=line.slice(1).trim();
   if(!text.startsWith(PRE_FLIGHT_MARKER))continue;
   found++;
   const m=receipt.exec(text);
   if(!m){errors.push('malformed DIC_PREFLIGHT_VERIFIED row: expected exact SHA and blob');continue;}
   const [,devSha,blobSha]=m;
   if(devSha===sha||/^0{40}$/.test(devSha)||/^0{40}$/.test(blobSha)){
    errors.push('invalid self-referencing or zero preflight source');continue;
   }
   try{
    const actual=run(['rev-parse','--verify',devSha+':'+sourcePath]);
    if(actual!==blobSha){errors.push('preflight blob differs from independent Git object');continue;}
    const contents=run(['show',devSha+':'+sourcePath]);
    if(!contents.startsWith('# Mandatory starting point for EVERY DIC task')){
     errors.push('preflight source lacks active mandatory contract');continue;
    }
   }catch(error){errors.push('preflight Git source/blob unavailable: '+String(error.message));continue;}
   // Require cited development SHA in the first-parent source history or the
   // live fetched development ref, never a fabricated/unrelated Git object.
   let connected=false;
   for(const ref of [sha,'refs/remotes/origin/development/backend-foundation']){
    try{run(['merge-base','--is-ancestor',devSha,ref]);connected=true;break;}catch{}
   }
   if(!connected){errors.push('cited preflight SHA is not in verified development/code ancestry');continue;}
   validated++;
  }
 }
 if(!found)errors.push('missing NEW DIC_PREFLIGHT_VERIFIED line in same-commit journal');
 return {status:errors.length?'FAILED':'VERIFIED',validated,errors};
}
