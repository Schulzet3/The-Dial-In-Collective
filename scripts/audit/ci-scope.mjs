// Fast, fail-closed changed-path classifier. Never treat code, CI config, JSON,
// SQL, scripts, or unknown Git history as documentation-only.
import {execFileSync} from 'node:child_process';
import {appendFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const SHA=/^[a-f0-9]{40}$/;
export function docsOnlyPaths(paths){
 return Array.isArray(paths)&&paths.length>0&&paths.every(path=>
  typeof path==='string'&&(path==='README.md'||/^docs\/[A-Za-z0-9_./-]+\.md$/.test(path))&&
  !path.split('/').includes('..'));
}
export function classifyChanges({base,head,event,git=execFileSync}={}){
 if(!SHA.test(base||'')||!SHA.test(head||'')||base==='0'.repeat(40))
  return {docs_only:false,reason:'UNKNOWN_OR_INITIAL_COMMIT',paths:[]};
 try{
  const range=event==='pull_request'?base+'...'+head:base+'..'+head;
  const text=git('git',['diff','--name-only',range],{encoding:'utf8',timeout:15000,maxBuffer:1048576});
  const paths=String(text).split(/\r?\n/).filter(Boolean);
  return {docs_only:docsOnlyPaths(paths),reason:docsOnlyPaths(paths)?'DOCUMENTATION_ONLY':'SOURCE_OR_UNKNOWN',paths};
 }catch{return {docs_only:false,reason:'GIT_DIFF_UNAVAILABLE',paths:[]};}
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const out=classifyChanges({base:process.env.DIC_CI_BASE,head:process.env.DIC_CI_HEAD,event:process.env.DIC_CI_EVENT});
 if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,'docs_only='+out.docs_only+'\n');
 console.log('[DIC CI scope] '+JSON.stringify({docs_only:out.docs_only,reason:out.reason,count:out.paths.length}));
}
