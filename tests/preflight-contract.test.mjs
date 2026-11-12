import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditPreflightContract,CONTRACT_PATHS} from '../scripts/audit/preflight-contract.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const snapshot=Object.fromEntries(CONTRACT_PATHS.map(path=>[path,read(path)]));
const change=(path,fn)=>auditPreflightContract(p=>p===path?fn(snapshot[p]):snapshot[p]);
test('single live preflight route is intact without added build or publisher',()=>{
 assert.deepEqual(auditPreflightContract(),[]);
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
});
test('instructions over 8000 chars or missing live source fail closed',()=>{
 assert.match(change('docs/CHATGPT_PROJECT_INSTRUCTIONS_TO_PASTE_2026-10-20.md',s=>s+'X'.repeat(200)).join(' '),/exceed 8000/);
 assert.match(auditPreflightContract(p=>{if(p==='docs/ai/PREFLIGHT.md')throw Error('unavailable');return snapshot[p];}).join(' '),/cannot read authoritative source/);
});
test('removing approval job enforcement is detected',()=>{
 assert.match(change('.github/workflows/approval-continuity.yml',s=>s.replace('run: node scripts/audit/preflight-contract.mjs','run: true')).join(' '),/workflow lacks preflight/);
});
