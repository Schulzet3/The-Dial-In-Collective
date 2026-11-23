// #3889 Phase 2b: freeze one source-isolated TESTING candidate locally.
// NO ref push, production publisher, release request, grant, provider write or READY claim.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,posix} from 'node:path';
import {fileURLToPath} from 'node:url';
import {BASELINE_DEV_SHA,BASELINE_QUEUE_BLOB,inspectTestingBaseline} from './testing-source-preflight.mjs';
import {PROVISIONAL_KIND,planProvisionalTestingCandidate} from './testing-provisional-plan.mjs';

export const FROZEN_TESTING_KIND='DIC-TESTING-FROZEN-NONPUBLISHING-3889-V1';
export const FROZEN_TESTING_MANIFEST='docs/TESTING_3889_CANDIDATE.json';
const JOURNAL='docs/workstreams/issue-3889.md';
const SHA=/^[a-f0-9]{40}$/;
const FP=/^[a-f0-9]{64}$/;
const SAFE=/^[A-Za-z0-9_.\/-]+$/;
const REVIEWED=/^(?:site\/|src\/|supabase\/|netlify\/|scripts\/|tests\/|\.github\/workflows\/|package(?:-lock)?\.json$)/;
const ordered=a=>[...new Set(a)].sort();
const same=(a,b)=>JSON.stringify(ordered(a))===JSON.stringify(ordered(b));
const validPath=p=>typeof p==='string'&&SAFE.test(p)&&!p.startsWith('/')&&!p.includes('..')&&!p.includes('//');
const hold=s=>{throw Error('TESTING frozen source HOLD: '+s);};
function reader(repoDir){
 return (args,{env=process.env,input,trim=true}={})=>{
  const value=execFileSync('git',args,{cwd:repoDir,env,input,encoding:'utf8',
   timeout:45000,maxBuffer:16000000,stdio:['pipe','pipe','pipe']});
  return trim?value.trim():value;
 };
}
// The pure phase-two planner is re-bound to its exact hashed identity; a
// caller cannot extend selected scope by altering the returned path arrays.
function validatePlan(plan){
 if(plan?.kind!==PROVISIONAL_KIND||plan.status!=='PROVISIONAL_SOURCE_PLAN_ONLY'||
    plan.baseline_sha!==BASELINE_DEV_SHA||plan.baseline_blob!==BASELINE_QUEUE_BLOB||
    !SHA.test(plan.development_sha||'')||!SHA.test(plan.published_sha||'')||
    !SHA.test(plan.merged_source_sha||'')||!FP.test(plan.fingerprint||'')||
    plan.publication_authorized!==false||plan.certified_ready_count!==0||
    plan.candidate_sha!==null||!Array.isArray(plan.selected_ready_item_ids)||
    plan.selected_ready_item_ids.length||!Array.isArray(plan.applicable_candidate_ci)||
    plan.applicable_candidate_ci.length||!/^DIC-Q-[1-9]\d*-[a-z0-9-]+$/.test(plan.selected_testing_item_id||''))
  hold('not a single immutable unpublished TESTING plan');
 const selected=plan.selected_blobs,restored=plan.restored_to_published_paths;
 if(!Array.isArray(selected)||!selected.length||!Array.isArray(restored)||
    selected.some(x=>!x||!validPath(x.path)||!REVIEWED.test(x.path)||
      !/^100(?:644|755):[a-f0-9]{40}$/.test(x.source_sha||''))||
    restored.some(p=>!validPath(p)||!REVIEWED.test(p))||
    !same(selected.map(x=>x.path),ordered(selected.map(x=>x.path)))||
    selected.length!==new Set(selected.map(x=>x.path)).size||
    restored.length!==new Set(restored).size||
    restored.some(p=>selected.some(x=>x.path===p)))
  hold('invalid, overlapping or duplicated selected/restored paths');
 const identity={kind:PROVISIONAL_KIND,baseline_sha:plan.baseline_sha,
  baseline_blob:plan.baseline_blob,development_sha:plan.development_sha,
  published_sha:plan.published_sha,selected_testing_item_id:plan.selected_testing_item_id,
  merged_source_sha:plan.merged_source_sha,selected_blobs:selected,
  restored_to_published_paths:restored};
 const fp=createHash('sha256').update(JSON.stringify(identity)).digest('hex');
 if(fp!==plan.fingerprint||
    plan.candidate_branch!=='release-candidates/testing3889-'+fp.slice(0,20))
  hold('plan fingerprint or branch does not match exact source');
}

// Cheap, read-only, exact-tree import closure before spending on candidate CI.
// Published script/test bytes may refer to later unselected #33 modules. Such a
// source cannot be certified merely by restoring other deployable paths.
export function assertFrozenAuditServerImportClosure({paths,readSource,hasPath}={}){
 if(!Array.isArray(paths)||typeof readSource!=='function'||typeof hasPath!=='function')
  hold('static audit/server import source evidence unavailable');
 for(const path of paths){
  if(!/^(?:scripts\/audit|src\/server)\/.*\.[cm]?js$/.test(path)||!hasPath(path))continue;
  const source=readSource(path);
  if(typeof source!=='string')hold('cannot read active audit/server module: '+path);
  const imports=[...source.matchAll(/^\s*(?:import|export)\s+(?:[^;\n]*?\s+from\s+)?['"](\.{1,2}\/[^'"\n]+)['"]/gm)]
   .map(m=>m[1]);
  for(const spec of imports){
   const target=posix.normalize(posix.join(posix.dirname(path),spec.split(/[?#]/)[0]));
   if(target.startsWith('../')||target.startsWith('/')||!target)
    hold('unsafe static relative import: '+path+' -> '+spec);
   const variants=posix.extname(target)?[target]:
    [target,target+'.js',target+'.mjs',target+'.cjs',target+'.json',
     target+'/index.js',target+'/index.mjs'];
   if(!variants.some(hasPath))
    hold('unresolved active audit/server relative import: '+path+' -> '+spec);
  }
 }
 return true;
}

// NEVER publishes a branch. Returns a local immutable Git object for readback.
export function freezeProvisionalTestingPlan({repoDir=process.cwd(),plan,preflightBlobSha}={}){
 validatePlan(plan);
 if(!SHA.test(preflightBlobSha||''))hold('exact development preflight blob required');
 const git=reader(repoDir);
 const at=(ref,path)=>{
  if(!validPath(path))hold('unsafe Git object path');
  const entries=git(['ls-tree','-z',ref,'--',path],{trim:false}).split('\0').filter(Boolean);
  if(!entries.length)return null;
  if(entries.length!==1)hold('ambiguous Git object: '+path);
  const m=/^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/.exec(entries[0]);
  if(!m||m[3]!==path)hold('nonregular Git object: '+path);
  return m[1]+':'+m[2];
 };
 const changed=(a,b)=>git(['diff','--name-only','--no-renames',a,b]).split(/\r?\n/).filter(Boolean);
 if(git(['rev-parse',plan.development_sha+':docs/ai/PREFLIGHT.md'])!==preflightBlobSha||
    !git(['show',plan.development_sha+':docs/ai/PREFLIGHT.md']).startsWith('# Mandatory starting point'))
  hold('preflight object not present at exact development SHA');
 if(at(plan.development_sha,'docs/RELEASE_CANDIDATE.json')||
    at(plan.development_sha,'docs/RELEASE_REQUEST.json'))
  hold('standard publisher manifest/request must not be inherited');
 if(at(plan.development_sha,FROZEN_TESTING_MANIFEST))
  hold('existing TESTING manifest must not be overwritten');
 const actual=changed(plan.published_sha,plan.development_sha);
 if(actual.some(p=>!validPath(p)))hold('invalid source diff path');
 const expected=[...plan.selected_blobs.map(x=>x.path),...plan.restored_to_published_paths];
 if(!same(actual.filter(p=>REVIEWED.test(p)),expected))
  hold('selected + restored paths do not account for all changed executable source');
 for(const {path,source_sha} of plan.selected_blobs){
  if(at(plan.merged_source_sha,path)!==source_sha||
     at(plan.development_sha,path)!==source_sha||
     at(plan.published_sha,path)===source_sha)
   hold('selected source not the exact current unpublished merge blob: '+path);
 }
 for(const path of plan.restored_to_published_paths)
  if(at(plan.development_sha,path)===at(plan.published_sha,path))
   hold('restoration has no development drift: '+path);
 const temp=mkdtempSync(join(tmpdir(),'dic-testing3889-'));
 try{
  const env={...process.env,GIT_INDEX_FILE:join(temp,'index'),
   GIT_AUTHOR_NAME:'DIC nonpublishing TESTING evidence',
   GIT_AUTHOR_EMAIL:'dic-testing-candidate@users.noreply.github.com',
   GIT_COMMITTER_NAME:'DIC nonpublishing TESTING evidence',
   GIT_COMMITTER_EMAIL:'dic-testing-candidate@users.noreply.github.com'};
  git(['read-tree',plan.development_sha],{env});
  for(const path of plan.restored_to_published_paths){
   const object=at(plan.published_sha,path);
   if(object){
    const [mode,sha]=object.split(':');
    git(['update-index','--add','--cacheinfo',mode,sha,path],{env});
   }else git(['update-index','--force-remove','--',path],{env});
  }
  const manifest={schema_version:1,kind:FROZEN_TESTING_KIND,
   candidate_branch:plan.candidate_branch,baseline_dev_sha:plan.baseline_sha,
   baseline_queue_blob:plan.baseline_blob,development_source_sha:plan.development_sha,
   published_source_sha:plan.published_sha,selected_testing_item_id:plan.selected_testing_item_id,
   merged_source_sha:plan.merged_source_sha,plan_fingerprint:plan.fingerprint,
   selected_blobs:plan.selected_blobs,restored_to_published_paths:plan.restored_to_published_paths,
   status:'FROZEN_SOURCE_ONLY_CI_NOT_RUN',selected_ready_item_ids:[],
   certified_ready_count:0,publication_authorized:false};
  const line='DIC_PREFLIGHT_VERIFIED development_sha='+plan.development_sha+
    ' preflight_blob_sha='+preflightBlobSha;
  const existing=at(plan.development_sha,JOURNAL)?git(['show',plan.development_sha+':'+JOURNAL],{trim:false}):'# #3889 TESTING cohort candidate evidence\n';
  const journal=existing.trimEnd()+'\n\n'+line+
    '\n\n## Nonpublishing frozen TESTING source ('+plan.selected_testing_item_id+') [skip netlify]\n'+
    '- Exact development parent: '+plan.development_sha+'\n'+
    '- Published tested base: '+plan.published_sha+'\n'+
    '- Selected merge source: '+plan.merged_source_sha+'\n'+
    '- Plan fingerprint: '+plan.fingerprint+'\n'+
    '- Restored unrelated executable paths: '+plan.restored_to_published_paths.length+'\n'+
    '- Local Git tree only; candidate five native checks NOT RUN, NOT READY, NOT publishable.\n';
  for(const [path,content] of [[FROZEN_TESTING_MANIFEST,JSON.stringify(manifest,null,2)+'\n'],[JOURNAL,journal]]){
   const sha=git(['hash-object','-w','--stdin'],{env,input:content});
   if(!SHA.test(sha))hold('unable to create Git blob: '+path);
   git(['update-index','--add','--cacheinfo','100644',sha,path],{env});
  }
  const treeSha=git(['write-tree'],{env});
  const auditAndServer=git(['ls-tree','-r','--name-only',treeSha,'--','scripts/audit','src/server'])
   .split(/\r?\n/).filter(Boolean);
  assertFrozenAuditServerImportClosure({paths:auditAndServer,
   readSource:path=>git(['show',treeSha+':'+path],{trim:false}),
   hasPath:path=>at(treeSha,path)!==null});
  const candidateSha=git(['commit-tree',treeSha,'-p',plan.development_sha,'-m',
   'Freeze nonpublishing #3889 TESTING source '+plan.selected_testing_item_id+' [skip netlify]'],{env});
  if(!SHA.test(treeSha)||!SHA.test(candidateSha)||
     git(['rev-parse',candidateSha+'^{tree}'])!==treeSha||
     git(['rev-list','--parents','-n','1',candidateSha])!==candidateSha+' '+plan.development_sha)
   hold('frozen candidate tree/parent readback mismatch');
  if(git(['rev-parse',candidateSha+':docs/RELEASE_QUEUE.json'])!==
     git(['rev-parse',plan.development_sha+':docs/RELEASE_QUEUE.json']))
   hold('frozen candidate changed the TESTING queue');
  if(at(candidateSha,'docs/RELEASE_CANDIDATE.json')||at(candidateSha,'docs/RELEASE_REQUEST.json'))
   hold('publisher-compatible request or manifest in TESTING tree');
  if(JSON.stringify(JSON.parse(git(['show',candidateSha+':'+FROZEN_TESTING_MANIFEST])))!==
     JSON.stringify(manifest))
   hold('frozen manifest Git blob readback mismatch');
  for(const {path,source_sha} of plan.selected_blobs)
   if(at(candidateSha,path)!==source_sha)hold('selected Git object changed at freeze: '+path);
  for(const path of plan.restored_to_published_paths)
   if(at(candidateSha,path)!==at(plan.published_sha,path))
    hold('unready Git object was not fully restored: '+path);
  if(!same(changed(plan.published_sha,candidateSha).filter(p=>REVIEWED.test(p)),
    plan.selected_blobs.map(x=>x.path)))
   hold('candidate includes unrelated executable source or omits selected tests');
  if(!same(changed(plan.development_sha,candidateSha),
    [...plan.restored_to_published_paths,FROZEN_TESTING_MANIFEST,JOURNAL]))
   hold('candidate commit changed unreviewed paths');
  return {status:'FROZEN_LOCAL_SOURCE_ONLY_NO_REF_OR_CI',kind:FROZEN_TESTING_KIND,
   candidate_sha:candidateSha,tree_sha:treeSha,development_sha:plan.development_sha,
   published_sha:plan.published_sha,selected_testing_item_id:plan.selected_testing_item_id,
   manifest,publication_authorized:false,certified_ready_count:0};
 }finally{rmSync(temp,{recursive:true,force:true});}
}
export function prepareProvisionalTestingCandidate({repoDir=process.cwd(),developmentSha,selectedId}={}){
 if(!SHA.test(developmentSha||''))hold('exact live development SHA required');
 const inventory=inspectTestingBaseline({repoDir,developmentSha});
 const git=reader(repoDir);
 const baselineQueue=JSON.parse(git(['show',BASELINE_DEV_SHA+':docs/RELEASE_QUEUE.json']));
 const liveQueue=JSON.parse(git(['show',developmentSha+':docs/RELEASE_QUEUE.json']));
 const at=(ref,path)=>{
  if(!validPath(path))hold('unsafe source object');
  const match=/^(100644|100755) blob ([0-9a-f]{40})\t(.+)$/.exec(
   git(['ls-tree','-z',ref,'--',path],{trim:false}).split('\0')[0]||'');
  return match&&match[3]===path?match[1]+':'+match[2]:null;
 };
 const changes=(a,b)=>git(['diff','--name-only','--no-renames',a,b]).split(/\r?\n/).filter(Boolean);
 const plan=planProvisionalTestingCandidate({inventory,baselineQueue,liveQueue,selectedId,
  developmentChangedPaths:changes(inventory.published_source_sha,developmentSha),
  firstParentChangedPaths:sha=>changes(sha+'^',sha),sourceObjectAt:at});
 return freezeProvisionalTestingPlan({repoDir,plan,preflightBlobSha:inventory.preflight_blob_sha});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==4)hold('usage: stage-testing-provisional-candidate.mjs <development SHA> <one TESTING ID>');
  console.log(JSON.stringify(prepareProvisionalTestingCandidate({
   developmentSha:process.argv[2],selectedId:process.argv[3]})));
 }catch(e){console.error('[DIC #3889 candidate HOLD] '+e.message);process.exitCode=2;}
}
