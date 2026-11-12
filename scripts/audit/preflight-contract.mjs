// Zero-network, credential-free check for DIC's single task entrypoint.
// Static documentation integrity is NOT proof that ChatGPT fetched live GitHub.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export const CONTRACT_PATHS=Object.freeze([
 'docs/ai/PREFLIGHT.md','AGENTS.md','docs/ai/CONTEXT_ENTRYPOINT.md',
 'docs/README.md','docs/workstreams/README.md',
 'docs/CHATGPT_PROJECT_INSTRUCTIONS_TO_PASTE_2026-10-20.md',
 '.github/workflows/approval-continuity.yml'
]);
const file=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
export function auditPreflightContract(read=file){
 const errors=[],docs={};
 for(const path of CONTRACT_PATHS){
  try{docs[path]=read(path);if(typeof docs[path]!=='string'||!docs[path].trim())throw Error('empty/nontext');}
  catch(error){errors.push(path+': cannot read authoritative source ('+error.message+')');docs[path]='';}
 }
 const p=docs['docs/ai/PREFLIGHT.md'];
 for(const phrase of [
  '# Mandatory starting point for EVERY DIC task',
  'This is the first **document** to retrieve for every DIC request',
  'development/backend-foundation','**Fail closed:**','PREFLIGHT_UNAVAILABLE',
  'CONTEXT_ENTRYPOINT.md','SAME-COMMIT','Mandatory evidence report',
  'GitHub does not automatically update ChatGPT Project Settings'
 ])if(!p.includes(phrase))errors.push('PREFLIGHT.md: missing mandatory contract '+phrase);
 if(!docs['AGENTS.md'].slice(0,550).includes('# START HERE — mandatory DIC preflight')||
    !docs['AGENTS.md'].slice(0,550).includes('[docs/ai/PREFLIGHT.md](docs/ai/PREFLIGHT.md)'))
  errors.push('AGENTS.md: must put live PREFLIGHT.md first');
 const nav=docs['docs/ai/CONTEXT_ENTRYPOINT.md'];
 if(!nav.slice(0,500).includes('topic map AFTER mandatory PREFLIGHT.md')||
    !nav.slice(0,500).includes('[PREFLIGHT.md](PREFLIGHT.md) FIRST'))
  errors.push('CONTEXT_ENTRYPOINT.md: must be secondary');
 const index=docs['docs/README.md'];
 if(!index.slice(0,700).includes('Mandatory FIRST document')||
    !index.slice(0,700).includes('[PREFLIGHT.md](ai/PREFLIGHT.md)'))
  errors.push('docs/README.md: wrong first document');
 if(!docs['docs/workstreams/README.md'].includes('After the mandatory [PREFLIGHT](../ai/PREFLIGHT.md)'))
  errors.push('workstream journals must route through preflight');
 const instructions=docs['docs/CHATGPT_PROJECT_INSTRUCTIONS_TO_PASTE_2026-10-20.md'];
 if(instructions.length>8000)errors.push('Project Instructions exceed 8000 characters');
 if(!instructions.includes('**Mandatory preflight (EVERY DIC task).**')||
    !instructions.includes('docs/ai/PREFLIGHT.md')||
    !instructions.includes('FAIL CLOSED: no GitHub/provider writes'))
  errors.push('Project Instructions must use live fail-closed preflight');
 if(!docs['.github/workflows/approval-continuity.yml'].includes('run: node scripts/audit/preflight-contract.mjs'))
  errors.push('mandatory approval workflow lacks preflight contract');
 return errors;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const errors=auditPreflightContract();
 if(errors.length){console.error('[DIC preflight] BLOCKED\n'+errors.map(e=>' - '+e).join('\n'));process.exitCode=1;}
 else console.log('[DIC preflight] PASS (document contract only, session retrieval not provable)');
}
