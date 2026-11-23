#!/usr/bin/env node
// #3889: exact first-parent introduction of THREE remaining TESTING SQL files.
// Read-only, no queue writes or assumed CI, no provider/DB access.
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export const SQL_PATHS=Object.freeze([
 ['DIC-Q-509-community-withdrawn-recheck-guard',
  'supabase/migrations/20261115065000_dic_community_withdrawn_recheck_guard.sql'],
 ['DIC-Q-509-pending-coffee-null-flags',
  'supabase/migrations/20261114135500_dic_promote_pending_coffee_null_flags.sql'],
 ['DIC-Q-509-member-approval-null-receipt-guard',
  'supabase/migrations/20261114195000_dic_member_approval_finish_null_receipts.sql']
]);
const SHA=/^[a-f0-9]{40}$/;
const ROOT='refs/remotes/origin/development/backend-foundation';
const fail=s=>{throw Error('Historical merged SQL provenance HOLD: '+s);};
export function verifyFirstParentSqlIntro({path,sourceSha,git}={}){
 if(typeof path!=='string'||!SQL_PATHS.some(([,p])=>p===path)||
    !SHA.test(sourceSha||'')||typeof git!=='function')
  fail('invalid exact SQL source/path');
 const log=git(['log','--first-parent','--diff-filter=A','--format=%H',sourceSha,'--',path]);
 if(typeof log!=='string')fail('first-parent log transport unavailable');
 const matches=log.trim().split(/\r?\n/).filter(Boolean);
 if(matches.length!==1||!SHA.test(matches[0]))
  fail('source introduction missing/ambiguous: '+path);
 const introduced=matches[0];
 const current=git(['rev-parse','--verify',sourceSha+':'+path]).trim();
 const original=git(['rev-parse','--verify',introduced+':'+path]).trim();
 if(!SHA.test(current)||current!==original)
  fail('current source blob drift after first introduction: '+path);
 const parent=git(['rev-parse','--verify',introduced+'^']).trim();
 if(!SHA.test(parent))fail('source introduction lacks verified first parent');
 const changed=git(['diff','--name-only','--no-renames','--diff-filter=A',parent,introduced,'--',path]);
 if(changed.trim()!==path)fail('first-parent change does not introduce source: '+path);
 return {path,introduced_sha:introduced,first_parent_sha:parent,blob_sha:current,
  source_sha:sourceSha,status:'EXACT_FIRST_PARENT_INTRODUCTION_SOURCE_VERIFIED_NO_READY'};
}
export function verifyRemainingThree({sourceSha,git}={}){
 if(!SHA.test(sourceSha||''))fail('exact source SHA absent');
 if(typeof git!=='function')fail('read-only Git reader unavailable');
 const head=git(['rev-parse','--verify',ROOT]).trim();
 if(head!==sourceSha)fail('live development moved during checkout');
 return SQL_PATHS.map(([id,path])=>({id,...verifyFirstParentSqlIntro({path,sourceSha,git})}));
}
function run(args){return execFileSync('git',args,{encoding:'utf8',timeout:30000,
 maxBuffer:4*1024*1024,stdio:['ignore','pipe','pipe']});}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==3||!SHA.test(process.argv[2]))fail('usage: verify-testing-three-sql-source.mjs <exact live development SHA>');
  console.log('[DIC #3889 SQL SOURCE] '+JSON.stringify(verifyRemainingThree({
   sourceSha:process.argv[2],git:run})));
 }catch(e){console.error('[DIC #3889 SQL SOURCE] '+String(e.message||e));
  process.exitCode=2;}
}
