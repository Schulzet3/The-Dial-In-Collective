import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {auditPreflightContract,CONTRACT_PATHS} from '../scripts/audit/preflight-contract.mjs';
const receiptPath=new URL('../docs/RELEASE_CANDIDATE.json',import.meta.url);
const candidateReceipt=existsSync(receiptPath)?JSON.parse(readFileSync(receiptPath,'utf8')):null;
const read=path=>{
 const local=readFileSync(new URL('../'+path,import.meta.url),'utf8');
 if(!candidateReceipt||path!=='.github/workflows/approval-continuity.yml')return local;
 // The verified source under test is the candidate's immutable development
 // parent. The publication candidate MUST preserve published workflow bytes.
 assert.equal(candidateReceipt.kind,'DIC-READY-ONLY-SOURCE-1');
 assert.match(candidateReceipt.development_source_sha,/^[a-f0-9]{40}$/);
 assert.match(candidateReceipt.published_source_sha,/^[a-f0-9]{40}$/);
 assert.ok(candidateReceipt.restored_unpublished_workflow_paths.includes(path));
 const at=sha=>execFileSync('git',['show',sha+':'+path],{encoding:'utf8',timeout:10000});
 assert.equal(local,at(candidateReceipt.published_source_sha),
  'candidate approval workflow must match published Git bytes');
 return at(candidateReceipt.development_source_sha);
};
const snapshot=Object.fromEntries(CONTRACT_PATHS.map(path=>[path,read(path)]));
const change=(path,fn)=>auditPreflightContract(p=>p===path?fn(snapshot[p]):snapshot[p]);
test('single live preflight route is intact without added build or publisher',()=>{
 assert.deepEqual(auditPreflightContract(read),[]);
 assert.match(read('docs/ai/PREFLIGHT.md'),/No preparation, staging, grant or production write/);
});
test('missing or weakened fail-closed authority is rejected',()=>{
 assert.match(change('docs/ai/PREFLIGHT.md',s=>s.replace('**Fail closed:**','**Optional:**')).join(' '),/missing mandatory contract/);
 assert.match(change('docs/ai/PREFLIGHT.md',s=>s.replace('PREFLIGHT_UNAVAILABLE','CONTINUE_ANYWAY')).join(' '),/PREFLIGHT_UNAVAILABLE/);
});
test('AGENTS and the topic map cannot silently become alternate first documents',()=>{
 assert.match(change('AGENTS.md',s=>s.replace('# START HERE — mandatory DIC preflight','Historical note')).join(' '),/AGENTS.md: must put/);
 assert.match(change('docs/ai/CONTEXT_ENTRYPOINT.md',s=>s.replace('topic map AFTER mandatory PREFLIGHT.md','primary entrypoint')).join(' '),/must be secondary/);
});
test('documentation index and Project Instructions fail on route drift',()=>{
 assert.match(change('docs/README.md',s=>s.replace('Mandatory FIRST document','Optional reference')).join(' '),/wrong first document/);
 assert.match(change('docs/CHATGPT_PROJECT_INSTRUCTIONS_TO_PASTE_2026-10-20.md',s=>s.replace('FAIL CLOSED: no GitHub/provider writes','continue from memory')).join(' '),/Project Instructions must/);
 assert.match(change('docs/CHATGPT_PROJECT_INSTRUCTIONS_TO_PASTE_2026-10-20.md',s=>s.replace('FIRST fetch live `development/backend-foundation` SHA','FIRST fetch live development SHA')).join(' '),/Project Instructions must/);
 assert.match(change('docs/CHATGPT_PROJECT_INSTRUCTIONS_TO_PASTE_2026-10-20.md',s=>s.replace('Branches: development/backend-foundation=app','Branches: development=app')).join(' '),/Project Instructions must/);
});
test('instructions over 8000 chars or missing live source fail closed',()=>{
 assert.match(change('docs/CHATGPT_PROJECT_INSTRUCTIONS_TO_PASTE_2026-10-20.md',s=>s+'X'.repeat(200)).join(' '),/exceed 8000/);
 assert.match(auditPreflightContract(p=>{if(p==='docs/ai/PREFLIGHT.md')throw Error('unavailable');return snapshot[p];}).join(' '),/cannot read authoritative source/);
});
test('removing approval job enforcement is detected',()=>{
 assert.match(change('.github/workflows/approval-continuity.yml',s=>s.replace('run: node scripts/audit/preflight-contract.mjs','run: true')).join(' '),/workflow lacks preflight/);
});

test('removing Git-object receipt audit from continuity is rejected',()=>{
 assert.match(change('scripts/audit/verify-commit-checkpoint.mjs',s=>s.replace('auditPreflightReceipt(','bypassReceipt(')).join(' '),/preflight Git receipt gate missing/);
 assert.match(change('docs/ai/PREFLIGHT.md',s=>s.replace('DIC_PREFLIGHT_VERIFIED','MISSING_EVIDENCE')).join(' '),/missing mandatory contract/);
});
