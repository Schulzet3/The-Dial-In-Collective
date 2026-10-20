// A fast, network-free, fail-closed GitHub source-of-truth checkpoint check.
// Intended for CI push/PR checks; not a cryptographic or atomic deployment lock.
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const work='docs/ACTIVE_WORK_2026-10-20_APPROVAL_TO_RELEASE_INTEGRITY.md';
export function auditLatestCommit({paths,subject}){
 const errors=[],items=[...new Set(paths.map(s=>s.trim()).filter(Boolean))];
 const marker=/^Release DIC: .+ \[dic-publish\]$/.test(subject||'');
 if(!marker&&!String(subject||'').includes('[skip netlify]'))
  errors.push('Unmarked commit: use [skip netlify] for nonrelease work; [dic-publish] requires its own owner-approved release');
 const code=items.filter(p=>/^(site\/|src\/server\/|netlify\/functions\/|supabase\/functions\/|scripts\/|tests\/|\.github\/workflows\/|build_cloud\.mjs$|netlify\.toml$|package(?:-lock)?\.json$)/.test(p));
 if(code.length&&!items.includes(work))
  errors.push('Code/CI change lacks SAME-COMMIT real-time GitHub work journal: '+code.slice(0,8).join(', '));
 if(marker&&code.length)
  errors.push('Release marker commit must only contain reviewed documentation/authorization, not last-second code');
 return errors;
}
// Audit *every* pushed commit, not only HEAD: an old unjournaled commit
// cannot be hidden by a later documentation-only commit in the same push.
export function auditCommitRange(commits){
 return commits.flatMap(c=>auditLatestCommit(c).map(error=>(c.sha||'unknown')+': '+error));
}
export function verifyLatestCommit(){
 const base=process.env.DIC_BASE_SHA?.trim(),head=process.env.DIC_HEAD_SHA?.trim()||'HEAD';
 const isSha=s=>/^[0-9a-f]{40}$/.test(s||'');
 const hashes=[];
 const run=(args)=>execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 try{
  // Pushes provide event.before, PRs provide base SHA; a fresh branch's all-zero
  // before has no ancestor to compare, so check HEAD and flag that limitation.
  if(isSha(base)&&!/^[0]+$/.test(base)){
   if(!isSha(head))throw Error('Missing exact Git head SHA');
   run(['merge-base','--is-ancestor',base,head]);
   const all=run(['rev-list','--reverse',base+'..'+head]).split(/\r?\n/).filter(Boolean);
   if(!all.length||all.length>400)throw Error('Git commit range missing or exceeds bounded 400-commit audit');
   hashes.push(...all);
  }else hashes.push(head);
 }catch(error){throw Error('Git commit range unavailable; fail closed rather than skip missing approvals: '+String(error.message));}
 const entries=[];
 for(const hash of hashes){
  try{
   entries.push({sha:hash,subject:run(['log','-1','--format=%s',hash]),
    paths:run(['diff-tree','--root','--no-commit-id','--name-only','-r',hash]).split(/\r?\n/).filter(Boolean)});
  }catch(error){throw Error('Cannot inspect commit '+hash+': '+String(error.message));}
 }
 const errors=auditCommitRange(entries);
 if(errors.length)throw Error('Continuity checkpoint failed:\n'+errors.map(s=>' - '+s).join('\n'));
 return {commitCount:entries.length,lastCommit:entries.at(-1)?.sha,checkedPaths:entries.reduce((n,e)=>n+e.paths.length,0)};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log('[DIC same-commit continuity] PASS '+JSON.stringify(verifyLatestCommit()));}
 catch(error){console.error(error.message);process.exitCode=1;}
}
