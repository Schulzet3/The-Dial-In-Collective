// Offline, append-only CI timing. No network, release action, environment dump or secrets.
import {spawnSync} from 'node:child_process';
import {appendFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

export function parseStageArgs(args){
 const separator=args.indexOf('--');
 if(separator!==4||args[0]!=='--name'||args[2]!=='--out')
  throw new Error('Expected --name STAGE --out qa_artifacts/ci-metrics/JOB.jsonl -- COMMAND [ARGS]');
 const name=args[1],out=args[3],command=args.slice(separator+1);
 if(!/^[a-z][a-z0-9_-]{0,49}$/.test(name))
  throw new Error('Invalid stage label');
 if(!/^qa_artifacts\/ci-metrics\/[a-z][a-z0-9_-]*\.jsonl$/.test(out))
  throw new Error('Timing output must stay under qa_artifacts/ci-metrics/');
 if(!command.length||!/^[a-z0-9_./-]+$/i.test(command[0]))
  throw new Error('Command required');
 return {name,out,command};
}
export function runMeasuredStage({name,out,command}){
 const started_at_utc=new Date().toISOString(),start=performance.now();
 const result=spawnSync(command[0],command.slice(1),{stdio:'inherit',shell:false,timeout:15*60*1000});
 const duration_ms=Math.round(performance.now()-start);
 const exit_code=Number.isInteger(result.status)?result.status:1;
 const receipt={schema_version:1,stage:name,started_at_utc,
  duration_ms,exit_code,outcome:exit_code===0?'PASS':'FAIL',
  failure_class:result.error?.code|| (result.signal?'SIGNAL':null)};
 mkdirSync(dirname(out),{recursive:true});
 appendFileSync(out,JSON.stringify(receipt)+'\n',{encoding:'utf8'});
 console.log('[DIC CI stage] '+JSON.stringify(receipt));
 return receipt;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const stage=parseStageArgs(process.argv.slice(2));process.exitCode=runMeasuredStage(stage).exit_code;}
 catch(error){console.error('[DIC CI stage] '+String(error.message));process.exitCode=2;}
}
