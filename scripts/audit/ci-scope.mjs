// Fail-closed impact classifier for the existing required CI jobs.
// Published-to-candidate source diff, NOT the staging manifest, controls release CI.
import {execFileSync} from 'node:child_process';
import {readFileSync,appendFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const SHA=/^[a-f0-9]{40}$/;
const LEVEL={docs:0,low:1,medium:2,high:3};
const APP_PREFIX=['site/','src/server/','netlify/functions/','supabase/migrations/','supabase/functions/'];
const APP_FILES=new Set(['build_cloud.mjs','netlify.toml','package.json','package-lock.json',
 'scripts/netlify/should-ignore-build.mjs','scripts/audit/approval-coverage.mjs',
 'scripts/release/one-use-claim.mjs','scripts/pwa/service-worker.template.txt']);
const SAFE_META=new Set(['docs/RELEASE_QUEUE.json','docs/DECISION_LEDGER.json',
 'docs/APPROVAL_COVERAGE_MATRIX.json','docs/RELEASE_CANDIDATE.json']);
// Issue #267 source-bound audit receipts are governance records, not executable inputs.
// Keep explicit allowlist narrow: unknown JSON and all source/code paths remain HIGH.
const AUDIT_EVIDENCE_META=new Set([
 'docs/audits/issue267-review-restart-v2-20261101.json',
 'docs/audits/issue267-v2-strict-coverage-ledger-20261103.json',
 // Immutable #267 post-pin direct-review receipt index; no runtime consumer.
 'docs/audits/issue267-v2-post-pin-direct-coverage-ledger-20261105.json',
 // Only #504's immutable word-audit coverage record; never generalize JSON under docs/.
 'docs/audits/issue504-coverage-ledger.json'
]);
const AUDIT_EVIDENCE_RECEIPT=/^docs\/audits\/issue267-v2-strict-batches\/S2-[0-9]{3,6}\.json$/;
// #267 exact post-pin machine inventory and bounded D2 direct source receipts: evidence, not runtime inputs.
const POST_PIN_AUDIT_EVIDENCE_RECEIPT=/^docs\/audits\/issue267-v2-post-pin-direct-batches\/D2-[0-9]{3,6}\.json$/;
// Issue #267 disjoint pending D2 batch indexes: bounded governance JSON, never executable input.
const POST_PIN_PENDING_REVIEW_INDEX=/^docs\/audits\/issue267-v2-post-pin-direct-pending\/D2-[0-9]{3}-[0-9]{3}-20[0-9]{6}-hour(?:[0-9]|1[0-9]|2[0-3])\.json$/;
// Narrow owner-audit snapshots: original exact path or dated SHA-prefix-bound machine inventory.
const POST_PIN_AUDIT_TREE_INVENTORY=/^docs\/audits\/issue267-v2-post-pin-tree-drift-(?:20261105|20[0-9]{6}-[a-f0-9]{6,40})\.json$/;
// Date- and ordinal-scoped #267 post-S2 complete Git-tree evidence (never a source file).
// Exact JSON naming only; unknown/malformed JSON and mixed executable changes remain HIGH.
const POST_PIN_AUDIT_TREE_POST_S2=/^docs\/audits\/issue267-v2-post-pin-(?:tree-drift|drift-delta)-20[0-9]{6}-post-S2-[0-9]{3,6}\.json$/;
// #504's source-bound G1 receipts contain governance evidence, not app/test inputs.
const GITHUB_RECORDS_EVIDENCE_RECEIPT=/^docs\/audits\/issue504-review-G1-[0-9]{3,6}\.json$/;

export function deployableRiskPaths(paths){
 return Array.isArray(paths)?paths.filter(p=>typeof p==='string'&&
  (APP_PREFIX.some(pre=>p.startsWith(pre))||APP_FILES.has(p))):[];
}
export function docsOnlyPaths(paths){
 return Array.isArray(paths)&&paths.length>0&&paths.every(path=>
  typeof path==='string'&&(path==='README.md'||/^docs\/[A-Za-z0-9_./-]+\.md$/.test(path))&&
  !path.split('/').includes('..'));
}
function impactKind(path){
 if(!/^[A-Za-z0-9_.\/-]+$/.test(path)||path.includes('..')||path.startsWith('/'))return 'unknown';
 if(path==='README.md'||path==='AGENTS.md'||/^docs\/[A-Za-z0-9_.\/-]+\.md$/.test(path)||SAFE_META.has(path)||
  AUDIT_EVIDENCE_META.has(path)||AUDIT_EVIDENCE_RECEIPT.test(path)||
  POST_PIN_AUDIT_EVIDENCE_RECEIPT.test(path)||POST_PIN_PENDING_REVIEW_INDEX.test(path)||
   POST_PIN_AUDIT_TREE_INVENTORY.test(path)||POST_PIN_AUDIT_TREE_POST_S2.test(path)||
  GITHUB_RECORDS_EVIDENCE_RECEIPT.test(path))
  return 'docs';
 if(/^site\/.*\.css$/.test(path))return 'style';
 if(/^site\/lib\//.test(path))return 'shots';
 if(/^src\/server\/coffee[-/]/.test(path))return 'coffee';
 if(/^site\/cloud\/(?:main|auth|session|account|membership|permissions)[^/]*\.js$/.test(path)||
  /^site\/admin\//.test(path))return 'auth';
 if(/^site\/.*\.(?:js|html|json)$/.test(path))return 'ui';
 if(/^supabase\//.test(path))return 'sql';
 if(/^netlify\/functions\//.test(path))return 'auth';
 if(/^tests\/(?:grind|grinder|recommendation|shot-|recipe-|next-shot|offline|legacy-shot|fast-flow)/.test(path))
  return 'shots';
 if(/^tests\/(?:coffee-|preview-request-bounds|universal-coffee-preview)/.test(path))return 'coffee';
 if(/^tests\/(?:cloud|pwa-|community-ui|visual-|ui-|site-integrity|browser\/)/.test(path))return 'ui';
 if(/^tests\/(?:sql\/|admin-|auth|security|edge-|backup)/.test(path))return 'auth';
 if(/^\.github\/workflows\//.test(path)||/^scripts\/(?:audit|release|backups|netlify|pwa)\//.test(path)||
  /^tests\//.test(path)||['build_cloud.mjs','netlify.toml','package.json',
   'package-lock.json','eslint.config.mjs'].includes(path))return 'infrastructure';
 return 'unknown';
}
export function classifyImpactPaths(paths){
 if(!Array.isArray(paths)||!paths.length)paths=['[unknown]'];
 const kinds=new Set(paths.map(impactKind));
 const tier=[...kinds].reduce((v,k)=>{
  const t=k==='docs'?'docs':k==='style'?'low':
   ['shots','coffee','ui'].includes(k)?'medium':'high';
  return LEVEL[t]>LEVEL[v]?t:v;
 },'docs');
 const ui=['style','ui','auth','unknown','infrastructure'].some(k=>kinds.has(k));
 const sql=['sql','auth','unknown','infrastructure'].some(k=>kinds.has(k));
 const mixedMedium=['shots','coffee','ui'].filter(k=>kinds.has(k)).length>1;
 const finalTier=mixedMedium?'high':tier;
 return {
  tier:finalTier,docs_only:finalTier==='docs',
  node_mode:finalTier==='high'?'full':kinds.has('shots')?'shots':kinds.has('coffee')?'coffee':'none',
  cloud_mode:finalTier==='high'?'none':kinds.has('ui')?'targeted':'none',
  browser_mode:!ui?'none':finalTier==='low'?'visual':finalTier==='high'?'high':'ui',
  sql:sql||mixedMedium,lint:LEVEL[finalTier]>=LEVEL.medium,
  build_validate:finalTier!=='docs'&&!ui,build_browser:ui,
  provider_guard:kinds.has('infrastructure')||kinds.has('unknown'),kinds:[...kinds].sort(),paths
 };
}
export function classifyChanges({base,head,event,git=execFileSync}={}){
 const fail=reason=>({...classifyImpactPaths(['[unknown]']),reason,paths:[]});
 if(!SHA.test(base||'')||!SHA.test(head||'')||base==='0'.repeat(40))
  return fail('UNKNOWN_OR_INITIAL_COMMIT');
 try{
  const range=event==='pull_request'?base+'...'+head:base+'..'+head;
  const raw=String(git('git',['diff','--name-only','--no-renames',range],{
   encoding:'utf8',timeout:15000,maxBuffer:1048576}));
  const all=raw.split(/\r?\n/).filter(Boolean);
  const paths=event==='candidate'?deployableRiskPaths(all):all;
  const impact=classifyImpactPaths(paths);
  return {...impact,reason:event==='candidate'?'PUBLISHED_TO_CANDIDATE_RUNTIME':
   impact.docs_only?'NON_RUNTIME_ONLY':'SOURCE_SCOPED',paths,changed_total:all.length};
 }catch{return fail('GIT_DIFF_UNAVAILABLE');}
}
export function selectImpactSource({base,head,event,ref,queue}={}){
 if(typeof ref==='string'&&ref.startsWith('refs/heads/release-candidates/'))
  return {base:queue?.published_base?.tested_source_sha,head,event:'candidate'};
 return {base,head,event};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 let source;
 try{
  const q=JSON.parse(readFileSync(new URL('../../docs/RELEASE_QUEUE.json',import.meta.url),'utf8'));
  source=selectImpactSource({base:process.env.DIC_CI_BASE,head:process.env.DIC_CI_HEAD,
   event:process.env.DIC_CI_EVENT,ref:process.env.DIC_CI_REF,queue:q});
 }catch{source={base:null,head:null,event:'unknown'};}
 const impact=classifyChanges(source);
 if(process.env.GITHUB_OUTPUT){
  const keys=['docs_only','tier','node_mode','cloud_mode','browser_mode','sql','lint',
   'build_validate','build_browser','provider_guard'];
  appendFileSync(process.env.GITHUB_OUTPUT,keys.map(k=>k+'='+String(impact[k])).join('\n')+'\n');
 }
 const line='[DIC scoped CI] '+JSON.stringify({tier:impact.tier,reason:impact.reason,paths:impact.paths,
  node:impact.node_mode,cloud:impact.cloud_mode,browser:impact.browser_mode,sql:impact.sql,
  build:impact.build_browser?'browser':impact.build_validate?'validate':'not_applicable'});
 console.log(line);
 if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,
  '### Source-impact classification\n\n'+line+'\n\nNOT_APPLICABLE is not a test PASS. Unknown refs/paths fail closed.\n');
}
