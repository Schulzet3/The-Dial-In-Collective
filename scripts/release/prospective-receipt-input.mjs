// Validate a pinned local tree-receipt input only. No publisher or provider effects.
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const SHA=/^[a-f0-9]{40}$/;
const ID=/^DIC-Q-[1-9][0-9]*-[a-z0-9-]+$/;
const KEYS=['schema_version','kind','development_sha','preflight_blob','queue_blob','published_source_sha','selected_testing_ids','publication_authorized'].sort();
export function prospectiveReceiptArg(plan,{developmentSha,readBlob,readQueue}={}){
 const hold=why=>{throw Error('PROSPECTIVE_RECEIPT_INPUT_HOLD: '+why);};
 if(!plan||JSON.stringify(Object.keys(plan).sort())!==JSON.stringify(KEYS)||
    plan.schema_version!==1||plan.kind!=='DIC-NONPUBLISHING-PROSPECTIVE-RECEIPT-3889'||
    plan.publication_authorized!==false||!SHA.test(developmentSha||'')||
    plan.development_sha!==developmentSha||
    ![plan.preflight_blob,plan.queue_blob,plan.published_source_sha].every(x=>typeof x==='string'&&SHA.test(x))||
    !Array.isArray(plan.selected_testing_ids)||!plan.selected_testing_ids.length||
    plan.selected_testing_ids.length>63||new Set(plan.selected_testing_ids).size!==plan.selected_testing_ids.length||
    !plan.selected_testing_ids.every(x=>typeof x==='string'&&ID.test(x))||
    typeof readBlob!=='function'||typeof readQueue!=='function')
  hold('invalid or stale exact nonpublishing input');
 if(readBlob(developmentSha,'docs/ai/PREFLIGHT.md')!==plan.preflight_blob||
    readBlob(developmentSha,'docs/RELEASE_QUEUE.json')!==plan.queue_blob)
  hold('exact source queue/preflight Git blob changed');
 const q=readQueue(developmentSha);
 if(q?.published_base?.tested_source_sha!==plan.published_source_sha||
    !Array.isArray(q.items)||!plan.selected_testing_ids.every(id=>q.items.filter(i=>i.id===id&&i.state==='TESTING').length===1))
  hold('published baseline or selected TESTING rows changed');
 return '--prospective-batch='+[...plan.selected_testing_ids].sort().join(',');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const [path,developmentSha]=process.argv.slice(2);
  if(process.argv.length!==4||path!=='docs/workstreams/issue-3889-prospective-input.json')
   throw Error('Exact scoped nonpublishing input path required');
  const git=args=>execFileSync('git',args,{encoding:'utf8',timeout:30000,maxBuffer:8*1024*1024}).trim();
  const plan=JSON.parse(readFileSync(path,'utf8'));
  console.log(prospectiveReceiptArg(plan,{developmentSha,
    readBlob:(sha,path)=>git(['rev-parse','--verify',sha+':'+path]),
    readQueue:sha=>JSON.parse(git(['show',sha+':docs/RELEASE_QUEUE.json']))}));
 }catch(e){console.error(e.message);process.exitCode=2;}
}
