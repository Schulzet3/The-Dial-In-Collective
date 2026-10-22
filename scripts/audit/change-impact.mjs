// Fast feedback is advisory; never substitutes for complete exact-SHA release checks.
import {readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
const SHA=/^[a-f0-9]{40}$/;
export function planFastLane(changed){
 if(!Array.isArray(changed)||changed.some(p=>typeof p!=='string'||!p||p.includes('..')))throw Error('Invalid changed paths');
 const paths=[...new Set(changed)];
 if(!paths.length)return {mode:'full',reason:'no reliable diff evidence'};
 if(paths.every(p=>p.startsWith('docs/')||p==='README.md'))return {mode:'docs',reason:'only documentation'};
 if(paths.every(p=>p.startsWith('docs/')||p==='README.md'||p==='site/admin/records.js'||p==='site/admin/view.js'||p==='tests/admin-records.test.mjs'))
  return {mode:'targeted',files:['tests/admin-records.test.mjs'],reason:'admin view/records only'};
 return {mode:'full',reason:'unknown or sensitive changes require all Node cases'};
}
export function changedPaths(base,head){
 if(!SHA.test(base||'')||!SHA.test(head||''))return null;
 try{return execFileSync('git',['diff','--name-only',base,head],{encoding:'utf8',timeout:15000}).trim().split(/\r?\n/).filter(Boolean);}
 catch{return null;}
}
function main(){
 const paths=changedPaths(process.env.DIC_BASE_SHA,process.env.DIC_HEAD_SHA);
 const plan=planFastLane(paths||[]);
 console.log(JSON.stringify({mode:plan.mode,reason:plan.reason,count:paths?.length??null}));
 if(plan.mode==='docs')return;
 const files=plan.mode==='targeted'?plan.files:readdirSync('tests').filter(f=>f.endsWith('.test.mjs')).sort().map(f=>'tests/'+f);
 if(!files.length)throw Error('No test files found: fail closed');
 execFileSync(process.execPath,['--test',...files],{stdio:'inherit',timeout:180000});
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname))main();
