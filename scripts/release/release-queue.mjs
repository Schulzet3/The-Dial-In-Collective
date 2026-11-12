// Read-only source-to-release queue gate. Source readiness is not a production grant.
// Scope paths must cover the real diff against the most recently published app source.
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const QUEUE_STATES=Object.freeze(['IN_PROGRESS','TESTING','BLOCKED','READY','DEPLOYED']);
const SHA=/^[a-f0-9]{40}$/;
const SCOPE=/^[A-Za-z0-9_.\/-]+$/;
const APP_PREFIX=['site/','src/server/','netlify/functions/','supabase/migrations/','supabase/functions/'];
const APP_FILES=new Set(['build_cloud.mjs','netlify.toml','supabase/config.toml','package.json','package-lock.json',
 'scripts/netlify/should-ignore-build.mjs','scripts/audit/approval-coverage.mjs',
 'scripts/release/one-use-claim.mjs','scripts/pwa/service-worker.template.txt',
 'scripts/pwa/member-approval-worker.template.txt']);
export function deployableChangedPaths(paths){
 if(!Array.isArray(paths))throw Error('Missing Git diff paths');
 return [...new Set(paths.filter(p=>typeof p==='string'&&
  (APP_PREFIX.some(prefix=>p.startsWith(prefix))||APP_FILES.has(p))))].sort();
}
export function queueSchemaErrors(queue){
 const errors=[];
 if(!queue||queue.schema_version!==1||queue.authority!=='OPS-AUTONOMOUS-BUILD-TEST-QUEUE-20261022')return ['Unsupported queue schema/owner authority'];
 const base=queue.published_base;
 if(!SHA.test(base?.tested_source_sha||'')||!SHA.test(base?.release_sha||'')||
  typeof base?.netlify_deploy_id!=='string'||!base.netlify_deploy_id)
  errors.push('Published baseline requires tested app SHA, release SHA and Netlify deploy receipt');
 if(!Array.isArray(queue.items)||!Array.isArray(queue.history))
  return [...errors,'Queue items/history must be arrays'];
 const seen=new Set();
 for(const item of queue.items){
  if(!item||typeof item!=='object'){errors.push('Malformed item');continue;}
  if(!/^DIC-Q-[1-9][0-9]*(?:-[a-z0-9-]+)?$/.test(item.id||'')||seen.has(item.id))
   errors.push('Duplicate or invalid release-queue item ID');
  seen.add(item.id);
  if(!QUEUE_STATES.includes(item.state))errors.push(item.id+' invalid queue state');
  if(!Number.isSafeInteger(item.issue)||item.issue<1)errors.push(item.id+' missing GitHub issue');
  if(typeof item.title!=='string'||!item.title.trim()||typeof item.owner_source!=='string'||!item.owner_source.trim())
   errors.push(item.id+' title/owner instruction source missing');
  if(!(item.merged_source_sha===null||SHA.test(item.merged_source_sha||'')))
   errors.push(item.id+' invalid merged source SHA');
  if(!Array.isArray(item.scope_paths)||item.scope_paths.some(p=>typeof p!=='string'||!SCOPE.test(p)||p.includes('..')||p.startsWith('/')||!deployableChangedPaths([p]).length))
   errors.push(item.id+' scope paths must be exact deployable files');
  if(!Array.isArray(item.tests)||!Array.isArray(item.ci_runs)||!Array.isArray(item.blockers))
   errors.push(item.id+' tests/CI/blockers must be arrays');
  if(item.state==='READY'){
   if(!SHA.test(item.merged_source_sha||'')||!item.scope_paths?.length||!item.tests?.length||
      !item.ci_runs?.length||item.blockers?.length)
    errors.push(item.id+' READY requires merged exact SHA, scoped files, passing tests, CI receipts and zero blockers');
   if(item.ci_runs?.some(x=>!Number.isSafeInteger(x)||x<=0)||
      item.tests?.some(x=>typeof x!=='string'||!x.trim()))
    errors.push(item.id+' invalid test/CI evidence');
  }
  if(item.state==='BLOCKED'&&!item.blockers?.length)errors.push(item.id+' blocked item needs a reason');
 }
 return errors;
}
export function assessReleaseQueue(queue,{publishedSourceSha,candidateSha,changedPaths,isAncestor}={}){
 const errors=queueSchemaErrors(queue),ready=[];
 if(!SHA.test(publishedSourceSha||'')||!SHA.test(candidateSha||'')||
  typeof isAncestor!=='function')errors.push('Exact source refs or ancestry verification unavailable');
 if(queue?.published_base?.tested_source_sha!==publishedSourceSha)
  errors.push('Queue published baseline differs from actual consumed production source');
 // A candidate must extend the exact published source; matching changed paths
 // or a READY item alone cannot certify a disconnected/replaced source history.
 if(SHA.test(publishedSourceSha||'')&&SHA.test(candidateSha||'')&&typeof isAncestor==='function'){
  try{
   if(isAncestor(publishedSourceSha,candidateSha)!==true)
    errors.push('Candidate source does not descend from published baseline');
  }catch{errors.push('Cannot verify candidate ancestry from published baseline');}
 }
 const diff=deployableChangedPaths(changedPaths||[]);
 for(const item of queue?.items||[]){
  // A DEPLOYED label is not proof that a post-baseline commit was published.
  // Fail closed if an allegedly delivered item first enters this candidate.
  // This also catches premature queue reconciliation before a real release.
  const merged=item?.merged_source_sha;
  if(item?.state==='DEPLOYED'){
   if(SHA.test(merged||'')){
    try{
     if(isAncestor(publishedSourceSha,merged)===true&&merged!==publishedSourceSha&&
        isAncestor(merged,candidateSha)===true)
      errors.push(item.id+' DEPLOYED-labelled merged work is new since published baseline; release receipt/source isolation required');
    }catch{errors.push(item.id+' unable to verify DEPLOYED commit ancestry');}
   }
   continue;
  }
  if(!SHA.test(merged||''))continue; // Unmerged work stays tracked but cannot enter release.
  let isIncluded=false,isNew=false;
  try{
   isIncluded=isAncestor(merged,candidateSha)===true;
   isNew=isAncestor(publishedSourceSha,merged)===true&&merged!==publishedSourceSha;
  }catch{errors.push(item.id+' unable to verify git ancestry');continue;}
  if(!isIncluded||!isNew){if(item.state==='READY')errors.push(item.id+' READY commit not in unpublished candidate ancestry');continue;}
  if(item.state!=='READY'){
   errors.push(item.id+' unready MERGED work is present in release candidate ('+item.state+')');
   continue;
  }
  ready.push(item);
 }
 if(!diff.length)errors.push('No new deployable application changes since published source');
 for(const path of diff)
  if(!ready.some(x=>x.scope_paths.includes(path)))
   errors.push('Unqueued or not-ready deployable file: '+path);
 for(const item of ready)
  if(!item.scope_paths.some(p=>diff.includes(p)))
   errors.push(item.id+' READY item has no unpublished deployable changes (possibly already released)');
 return {ready:errors.length===0,errors,deployable_paths:diff,ready_items:ready.map(x=>({id:x.id,issue:x.issue,title:x.title,merged_source_sha:x.merged_source_sha,scope_paths:x.scope_paths})),other_items:(queue?.items||[]).filter(x=>x.state!=='READY'&&x.state!=='DEPLOYED').map(x=>({id:x.id,state:x.state,merged_source_sha:x.merged_source_sha,blockers:x.blockers}))};
}
// SQL-only operations already verified and applied directly in Supabase still
// appear in the Netlify-base diff because the website was not republished.
// Count those exact source bytes as covered, without requeuing or replaying
// the migration. A stale/forged receipt or changed SQL file NEVER qualifies.
export function assessIntakeCoverage(queue,changedPaths,{currentBlobSha=()=>null}={}){
 const errors=queueSchemaErrors(queue);
 const paths=deployableChangedPaths(changedPaths);
 for(const path of paths){
  const covered=queue?.items?.some(item=>{
   if(!item?.scope_paths?.includes(path))return false;
   if(item.state!=='DEPLOYED')return true;
   return path.startsWith('supabase/migrations/')&&
    item.delivered_provider==='Supabase production only'&&
    typeof item.delivered_release_id==='string'&&item.delivered_release_id.length>8&&
    /^\d{14}$/.test(String(item.delivered_sql_migration_version||''))&&
    SHA.test(item.delivered_sql_source_blob_sha||'')&&
    currentBlobSha(path)===item.delivered_sql_source_blob_sha;
  });
  if(!covered)errors.push('Untracked app change; add an IN_PROGRESS/TESTING/READY queue item: '+path);
 }
 return {tracked:errors.length===0,errors,deployable_paths:paths};
}
export function assertApprovedReadyBatch(grant,assessment){
 if(!assessment?.ready)throw Error('Release queue not certified READY');
 const approved=grant?.approved_ready_item_ids;
 if(!Array.isArray(approved)||!approved.length||approved.some(id=>typeof id!=='string')||
    new Set(approved).size!==approved.length)
  throw Error('Owner release grant must name unique READY queue item IDs');
 const actual=assessment.ready_items.map(item=>item.id);
 if(approved.length!==actual.length||approved.slice().sort().join('|')!==actual.slice().sort().join('|'))
  throw Error('Owner-approved READY item IDs differ from actual candidate source inventory');
 return true;
}
export function formatQueueReport(result){
 return ['## Deployment queue (source-only assessment)','**Batch source ready:** '+(result.ready?'YES':'NO'),
  '**Queued ready changes:** '+result.ready_items.length,
  ...result.ready_items.map(x=>'- '+x.id+' (#'+x.issue+') '+x.title),
  '**Changed deployable paths:** '+result.deployable_paths.length,
  ...result.errors.map(e=>'- HOLD: '+e),
  '**Unfinished tracked items:** '+result.other_items.length,
  ...result.other_items.map(x=>'- '+x.id+' '+x.state+' ('+x.blockers.join('; ')+')'),
  'This is NOT an owner release approval or evidence of hosted publication.'].join('\n')+'\n';
}
export function evaluateLocalQueue(){
 const git=args=>execFileSync('git',args,{encoding:'utf8',timeout:15000,maxBuffer:2e6}).trim();
 const queue=JSON.parse(readFileSync(new URL('../../docs/RELEASE_QUEUE.json',import.meta.url),'utf8'));
 const head=git(['rev-parse','HEAD']),base=queue.published_base?.tested_source_sha;
 const changes=git(['diff','--name-only','--no-renames',base+'..'+head]).split(/\r?\n/).filter(Boolean);
 const ancestor=(a,b)=>{
  try{execFileSync('git',['merge-base','--is-ancestor',a,b],{stdio:'ignore',timeout:15000});return true;}
  catch(error){
   // Git status 1 means a proven non-ancestor. A missing object/repository or
   // other git failure must not be silently treated as evidence of non-inclusion.
   if(error?.status===1)return false;
   throw Error('Git ancestry verification unavailable (exit '+String(error?.status)+')');
  }
 };
 return assessReleaseQueue(queue,{publishedSourceSha:base,candidateSha:head,changedPaths:changes,isAncestor:ancestor});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const flag=process.argv[2]||'--status';
  if(!['--status','--validate','--strict','--enforce-intake'].includes(flag)||process.argv.length>3)throw Error('Usage: release-queue.mjs [--status|--validate|--strict|--enforce-intake]');
  const queue=JSON.parse(readFileSync(new URL('../../docs/RELEASE_QUEUE.json',import.meta.url),'utf8'));
  const errors=queueSchemaErrors(queue);
  if(errors.length)throw Error(errors.join('; '));
  if(flag==='--validate')console.log('[DIC queue schema] PASS');
  else if(flag==='--enforce-intake'){
   const result=evaluateLocalQueue(),tracked=assessIntakeCoverage(queue,result.deployable_paths,{
    currentBlobSha:path=>{try{return execFileSync('git',['hash-object','--',path],{encoding:'utf8',timeout:15000}).trim();}
      catch{return null;}}
   });
   if(!tracked.tracked)throw Error(tracked.errors.join('; '));
   console.log('[DIC queue intake] PASS '+tracked.deployable_paths.length+' tracked deployable paths');
  }else{
   const result=evaluateLocalQueue();console.log(formatQueueReport(result));
   if(flag==='--strict'&&!result.ready)process.exitCode=2;
  }
 }catch(e){console.error('[DIC queue] HOLD: '+e.message);process.exitCode=2;}
}