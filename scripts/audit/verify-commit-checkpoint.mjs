// A fast, network-free, fail-closed GitHub source-of-truth checkpoint check.
// Intended for CI push/PR checks; not a cryptographic or atomic deployment lock.
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {auditPreflightReceipt} from './preflight-receipt.mjs';

const work='docs/ACTIVE_WORK_2026-10-20_APPROVAL_TO_RELEASE_INTEGRITY.md';
// Explicit scoped READY and 2026-11-02 queue-preparation journals; arbitrary release names remain excluded.
const scopedWork=/^docs\/workstreams\/(?:issue-[1-9][0-9]*|ops-[a-z0-9-]+(?:-N[1-9][0-9]*)?|release-[0-9]{8}|release-ready-batch|release-queue-prep-20261102)\.md$/;
// Exact one-use historical GitHub-generated merge receipt for PR #122 only.
// This commit has the identical tested PR-head tree, a scoped same-commit
// work journal, and no publication; GitHub auto-generated its title without
// the [skip netlify] marker. Never authorize another unmarked merge by pattern.
const REVIEWED_GITHUB_MERGE_SHA='644870aee66ad5c5f0bcdab0d4eeb66283cdd5fb';
const REVIEWED_GITHUB_MERGE_SUBJECT='Merge pull request #122 from Schulzet3/work/issue33-presentation-triage-20261026';
export function auditLatestCommit({paths,subject,message=subject,sha}){
 const errors=[],items=[...new Set(paths.map(s=>s.trim()).filter(Boolean))];
 const marker=/^Release DIC: .+ \[dic-publish\]$/.test(subject||'');
 // Netlify recognizes [skip netlify] anywhere in the complete Git message.
 // GitHub's merge-commit subject can omit the marker while its body retains it;
 // check the actual commit message, not PR metadata or a caller-supplied title.
 const skip=/(?:^|\s)\[skip netlify\](?=\s|$)/i.test(message||'');
 if(!marker&&!skip&&
    !(sha===REVIEWED_GITHUB_MERGE_SHA&&subject===REVIEWED_GITHUB_MERGE_SUBJECT))
  errors.push('Unmarked commit: use [skip netlify] for nonrelease work; [dic-publish] requires its own owner-approved release');
 const code=items.filter(p=>/^(site\/|src\/|netlify\/functions\/|supabase\/|scripts\/|tests\/|\.github\/(?:workflows|actions)\/|build_cloud\.mjs$|eslint\.config\.mjs$|netlify\.toml$|package(?:-lock)?\.json$)/.test(p));
 if(code.length&&!items.includes(work)&&!items.some(p=>scopedWork.test(p)))
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
   // PR heads can legitimately fork from an older development SHA while
   // the base advances concurrently. Audit only PR-exclusive commits even
   // when the current base is not their ancestor; a real common ancestor is
   // still mandatory. Pushes retain strict before->after ancestry.
   if(process.env.DIC_EVENT_NAME==='pull_request'){
    const bases=run(['merge-base','--all',base,head]).split(/\r?\n/).filter(Boolean);
    if(bases.length!==1||!isSha(bases[0]))throw Error('PR source lacks one verified common ancestor');
   }else run(['merge-base','--is-ancestor',base,head]);
   const all=run(['rev-list','--reverse',base+'..'+head]).split(/\r?\n/).filter(Boolean);
   if(!all.length||all.length>400)throw Error('Git commit range missing or exceeds bounded 400-commit audit');
   hashes.push(...all);
  }else hashes.push(head);
 }catch(error){throw Error('Git commit range unavailable; fail closed rather than skip missing approvals: '+String(error.message));}
 const entries=[];
 for(const hash of hashes){
  try{
   // Default diff-tree omits merge commits. Inspect the first-parent delta
   // so code introduced only while resolving a merge cannot evade the log.
   const parent=run(['log','-1','--format=%P',hash]).split(/\s+/)[0];
   const diff=parent?['diff-tree','--no-commit-id','--name-only','-r',parent,hash]:
    ['diff-tree','--root','--no-commit-id','--name-only','-r',hash];
   entries.push({sha:hash,subject:run(['log','-1','--format=%s',hash]),
    message:run(['log','-1','--format=%B',hash]),
    paths:run(diff).split(/\r?\n/).filter(Boolean)});
  }catch(error){throw Error('Cannot inspect commit '+hash+': '+String(error.message));}
 }
 const errors=auditCommitRange(entries);
 let verifiedReceipts=0;
 for(const entry of entries){
  const parent=run(['log','-1','--format=%P',entry.sha]).split(/\s+/)[0];
  const evidence=auditPreflightReceipt({sha:entry.sha,parent,paths:entry.paths,run});
  verifiedReceipts+=evidence.validated;
  for(const error of evidence.errors)errors.push(entry.sha+': Preflight: '+error);
 }
 if(errors.length)throw Error('Continuity checkpoint failed:\n'+errors.map(s=>' - '+s).join('\n'));
 return {commitCount:entries.length,lastCommit:entries.at(-1)?.sha,checkedPaths:entries.reduce((n,e)=>n+e.paths.length,0),verifiedPreflightReceipts:verifiedReceipts};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log('[DIC same-commit continuity] PASS '+JSON.stringify(verifyLatestCommit()));}
 catch(error){console.error(error.message);process.exitCode=1;}
}
