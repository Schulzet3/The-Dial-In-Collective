// #3667: keep the full checked-in suite with bounded per-file parallelism.
// The 4-second malicious-HTML subprocess budget must run without runner contention.
import {readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../..',import.meta.url));
const ISOLATED='tests/html-resource-security.test.mjs';
export const FULL_SUITE_CONCURRENCY=4;

export function planFullSuite(root=ROOT){
 const find=(subdir,prefix)=>readdirSync(join(root,subdir),{withFileTypes:true})
  .filter(entry=>entry.isFile()&&entry.name.endsWith('.test.mjs'))
  .map(entry=>prefix+entry.name);
 const files=[...find('tests','tests/'),...find('tests/audit','tests/audit/')].sort();
 if(!files.length||!files.includes(ISOLATED))
  throw Error('Full suite requires the resource-security test and a nonempty corpus');
 const serial=files.filter(path=>path===ISOLATED);
 const parallel=files.filter(path=>path!==ISOLATED);
 if(!parallel.length||new Set(files).size!==files.length)
  throw Error('Full suite file coverage is invalid');
 return {parallel,serial};
}

// Three disjoint HIGH-risk shards run on existing validate/cloud-tests/approval runners.
// Preserve the legacy 2-way selector for diagnostic comparisons and previous refs.
// The unsharded npm test command still executes every file.
export function selectFullSuiteShard(plan,shard='all'){
 if(shard==='all')return plan;
 if(!/^(?:[01]\/2|[012]\/3)$/.test(shard))throw Error('Invalid full-suite shard selector');
 const [selected,lanes]=shard.split('/').map(Number);
 // Native HIGH #3761: validate 340/91.4s, cloud 339/55s, approval 135/32.7s.
 // After prior redistribution, actual 45036645973 remained validate 84s,
 // cloud 59s and approval 48s plus protected serial.
 // Shift 40 more of ~814 files (23 cloud, 17 approval); no omissions,
 // extra runner/build, duplicate tests or protected serial changes.
 const parallel=plan.parallel.filter((_,i)=>{
  if(lanes===3){
   const original=i%3;
   const slot=Math.floor(i/3);
   if(original===0){
    if(slot%6===0)return selected===2;
    if(slot%12===3||slot%8===4)return selected===1;
    return selected===0;
   }
   if(original===1)return selected===1;
   const quarter=slot%4;
   return (quarter===0?(slot%16===0?2:0):quarter===1?1:2)===selected;
  }
  return (i%2===0||i%12===1?0:1)===selected;
 });
 // Keep the time-budgeted HTML corpus isolated on the final runner
 // (cloud for legacy 2-way, approval for high-risk 3-way).
 // Four measured HIGH CI pairs show a recurring cloud Node tail: 89/90/89/89s
 // versus 65/96/66/65s validate. Keep the original even-index split and
 // move just every sixth odd-index file (i%12===1) to validate to balance
 // the critical path without duplicate tests or additional runners.
 // This balances the two required jobs without removing or duplicating files.
 const serial=selected===lanes-1?plan.serial:[];
 if(!parallel.length)throw Error('Full-suite shard is empty');
 return {parallel,serial};
}

function execute(files,concurrency,label){
 if(!files.length){
  console.log('[DIC full suite] '+label+' NOT_APPLICABLE: this shard has no selected test files');
  return 0; // Never invoke node --test with no file arguments (would discover all tests).
 }
 const start=performance.now();
 console.log('[DIC full suite] '+label+': '+files.length+' files; concurrency '+concurrency);
 const child=spawnSync(process.execPath,
  ['--test','--test-concurrency='+concurrency,...files],
  {cwd:ROOT,stdio:'inherit',timeout:18*60*1000});
 const seconds=((performance.now()-start)/1000).toFixed(1);
 console.log('[DIC full suite] '+label+' finished in '+seconds+'s, exit '+(child.status??'error'));
 if(child.error){
  console.error('[DIC full suite] '+label+' runner failed:',child.error.message);
  return 1;
 }
 return child.status===0?0:1;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 try{
  const shardArg=process.argv[2];
  if(process.argv.length>3||(shardArg&&!/^--shard=(?:[01]\/2|[012]\/3)$/.test(shardArg)))
   throw Error('Unexpected full-suite arguments');
  const plan=planFullSuite();
  const {parallel,serial}=selectFullSuiteShard(plan,shardArg?shardArg.slice('--shard='.length):'all');
  // Always run isolated security tests even if the general corpus fails.
  const main=execute(parallel,FULL_SUITE_CONCURRENCY,'general');
  const security=execute(serial,1,'time-critical-security');
  process.exitCode=main||security?1:0;
 }catch(err){
  console.error('[DIC full suite] coverage failure:',err?.message||err);
  process.exitCode=1;
 }
}
