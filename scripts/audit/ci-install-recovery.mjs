// Fast, bounded recovery for the EXISTING npm install step; never retries
// application tests, deployments, Git writes, publication or failed approvals.
import {spawnSync} from 'node:child_process';
import {appendFileSync} from 'node:fs';
import {setTimeout as sleep} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

export const LOCKED_INSTALL_ARGS=Object.freeze(['ci','--ignore-scripts','--no-audit','--no-fund']);
const PERMANENT=/\b(?:ERESOLVE|EUSAGE|EBADENGINE|EINTEGRITY|E401|E403|E404|EACCES|EPERM|ENOENT|ERR_INVALID_ARG)\b/i;
const TRANSIENT=/\b(?:EAI_AGAIN|ECONNRESET|ETIMEDOUT|ECONNABORTED|ENETUNREACH|EHOSTUNREACH|ERR_SOCKET_TIMEOUT)\b|\bHTTP\s*(?:429|502|503|504)\b|\b(?:429|502|503|504)\s+(?:Too Many Requests|Bad Gateway|Service Unavailable|Gateway Timeout)\b/i;

export function classifyInstallFailure({exitCode,log}={}){
 if(exitCode===0)return 'SUCCESS';
 if(!Number.isInteger(exitCode)||typeof log!=='string')return 'UNKNOWN';
 if(PERMANENT.test(log))return 'PERMANENT_SOURCE_OR_ACCESS';
 return TRANSIENT.test(log)?'TRANSIENT_TRANSPORT':'NON_TRANSIENT_FAILURE';
}
// Only emit codes, NEVER raw npm logs which may contain an auth token or URL.
export function safeFailureHint(log){
 const s=typeof log==='string'?log:'';
 const code=s.match(/\b(?:ERESOLVE|EUSAGE|EBADENGINE|EINTEGRITY|E401|E403|E404|EACCES|EPERM|ENOENT|EAI_AGAIN|ECONNRESET|ETIMEDOUT|ECONNABORTED|ENETUNREACH|EHOSTUNREACH|ERR_SOCKET_TIMEOUT)\b/i);
 if(code)return code[0].toUpperCase();
 const http=s.match(/\bHTTP\s*(429|502|503|504)\b/i);
 return http?'HTTP_'+http[1]:'NO_CLASSIFIABLE_CODE';
}
export async function installWithBoundedRecovery({run=spawnSync,pause=sleep,report=console.log}={}){
 for(let attempt=1;attempt<=2;attempt++){
  const result=run('npm',[...LOCKED_INSTALL_ARGS],{
   encoding:'utf8',timeout:240000,maxBuffer:4*1024*1024
  });
  const output=String(result?.stderr||'')+'\n'+String(result?.stdout||'');
  const kind=classifyInstallFailure({exitCode:result?.status,log:output});
  if(result?.status===0){
   report('[DIC CI install] PASS attempts='+attempt+' (no duplicate tests or builds)');
   return {ok:true,attempts:attempt,kind:'SUCCESS'};
  }
  const hint=safeFailureHint(output);
  report('[DIC CI install] '+kind+' attempts='+attempt+' hint='+hint);
  if(kind!=='TRANSIENT_TRANSPORT'||attempt===2)
   return {ok:false,attempts:attempt,kind,hint};
  report('[DIC CI install] Retry one identical locked install after a transient transport error');
  await pause(1000);
 }
 throw Error('unreachable bounded install retry');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==2){
  console.error('Usage: node scripts/audit/ci-install-recovery.mjs');
  process.exitCode=2;
 }else installWithBoundedRecovery().then(result=>{
  const receipt='DIC locked npm install: '+(result.ok?'PASS':'FAIL')+
   '; attempts='+result.attempts+'; class='+result.kind+
   '; hint='+(result.hint||'NONE')+
   '. Only transient package transport gets one retry; source/test/approval failures never retry.';
  if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,receipt+'\n');
  if(!result.ok){console.error(receipt);process.exitCode=1;}
 }).catch(e=>{console.error('DIC install guard unavailable: '+String(e?.message||e));process.exitCode=2;});
}
