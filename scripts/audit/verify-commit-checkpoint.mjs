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
export function verifyLatestCommit(){
 let subject='',out='';
 try{
  subject=execFileSync('git',['log','-1','--format=%s'],{encoding:'utf8'}).trim();
  out=execFileSync('git',['show','--pretty=format:','--name-only','HEAD'],{encoding:'utf8'});
 }catch(error){throw Error('Git commit metadata unavailable; cannot validate required continuity: '+String(error.message));}
 const paths=out.split(/\r?\n/).filter(Boolean);
 const errors=auditLatestCommit({subject,paths});
 if(errors.length)throw Error('Continuity checkpoint failed:\n'+errors.map(s=>' - '+s).join('\n'));
 return {subject,pathCount:paths.length,checkpointRequired:paths.some(p=>/^(site\/|scripts\/|tests\/)/.test(p))};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log('[DIC same-commit continuity] PASS '+JSON.stringify(verifyLatestCommit()));}
 catch(error){console.error(error.message);process.exitCode=1;}
}
