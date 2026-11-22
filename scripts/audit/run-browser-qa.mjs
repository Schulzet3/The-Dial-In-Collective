// #3667: parallelize independent visual fixture assertions and browser acceptance.
// All applicable scripts are still executed once; any failure fails the job.
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const ROOT=fileURLToPath(new URL('../..',import.meta.url));
const VISUAL='tests/browser/visual_review.py';
export function browserQAPlan(mode){
 const scripts=['tests/browser/built_app_qa.py'];
 if(!['visual','ui','high'].includes(mode))throw Error('Unexpected browser QA mode: '+mode);
 if(mode==='ui'||mode==='high')scripts.push('tests/browser/cloud_owner_qa.py');
 if(mode==='high')scripts.push('tests/browser/admin_invitation_qa.py');
 if(mode==='ui'||mode==='high')scripts.push('tests/browser/pwa_offline_qa.py');
 if(mode==='high')scripts.push('tests/browser/issue26_accessibility_qa.py',
  'tests/browser/admin_records_qa.py');
 return scripts;
}
// All browser fixtures use independent Playwright contexts and isolated local
// servers/artifact filenames. Limit subprocesses to visual + two serial lanes:
// faster than six serial browser starts without uncontrolled Chromium fanout.
const OFFLINE_ADMIN_LANE=new Set([
 'tests/browser/pwa_offline_qa.py',
 'tests/browser/issue26_accessibility_qa.py',
 'tests/browser/admin_records_qa.py'
]);
export function browserQALanes(mode){
 const scripts=browserQAPlan(mode);
 return [scripts.filter(p=>!OFFLINE_ADMIN_LANE.has(p)),
  scripts.filter(p=>OFFLINE_ADMIN_LANE.has(p))].filter(lane=>lane.length>0);
}
function runOne(python,path,runner=spawn){
 return new Promise(resolve=>{
  const child=runner(python,[path],{cwd:ROOT,stdio:'inherit',env:process.env});
  let finished=false;
  const done=(status)=>{if(!finished){finished=true;resolve({path,status});}};
  child.once('error',error=>{console.error('[DIC browser QA] '+path+': '+error.message);done(1);});
  child.once('close',(code,signal)=>done(signal||code!==0?1:0));
 });
}
export async function runBrowserQA(mode,{python='python',runner=spawn}={}){
 const lanes=browserQALanes(mode);
 // Preserve sequential execution within each lane; visual and the two
 // bounded fixture lanes run concurrently, never against live providers.
 const runLane=async(paths)=>{
  const records=[];
  for(const path of paths)records.push(await runOne(python,path,runner));
  return records;
 };
 const [visualResult,...laneResults]=await Promise.all([
  runOne(python,VISUAL,runner),...lanes.map(runLane)
 ]);
 const all=[visualResult,...laneResults.flat()];
 for(const entry of all)console.log('[DIC browser QA] '+entry.path+' '+(entry.status===0?'PASS':'FAIL'));
 if(all.some(entry=>entry.status!==0))throw Error('Browser acceptance failed; no omitted script treated as PASS');
 return {executed:all.length,passed:all.length};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{await runBrowserQA(process.env.DIC_BROWSER_MODE);}
 catch(error){console.error('[DIC browser QA] '+error.message);process.exitCode=1;}
}
