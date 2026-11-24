// READY-only candidate regression helper: verify the exact CURRENT published
// narrative Git object, not a stale hard-coded list of older release SHAs.
// Unisolated development retains stricter Issue #33 grower assertions.
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const SHA=/^[a-f0-9]{40}$/;
const PATH='src/server/coffee-narrative-evidence.mjs';
export function isPublishedNarrativeRestored(){
 let manifest;
 try{manifest=JSON.parse(readFileSync(new URL('../../docs/RELEASE_CANDIDATE.json',import.meta.url),'utf8'));}
 catch(e){if(e?.code==='ENOENT')return false;throw e;}
 if(manifest?.kind!=='DIC-READY-ONLY-SOURCE-1'||
    !SHA.test(manifest.published_source_sha||'')||
    manifest.publication_authorized!==false||
    !manifest.restored_to_published_paths?.includes(PATH))return false;
 const queue=JSON.parse(readFileSync(new URL('../../docs/RELEASE_QUEUE.json',import.meta.url),'utf8'));
 assert.equal(queue?.published_base?.tested_source_sha,manifest.published_source_sha,
  'candidate narrative restoration must match the exact queued published baseline');
 const bytes=readFileSync(new URL('../../'+PATH,import.meta.url));
 const observed=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 const expected=execFileSync('git',['rev-parse',manifest.published_source_sha+':'+PATH],
  {encoding:'utf8',timeout:15000}).trim();
 assert.match(expected,SHA,'independent published Git object must exist');
 assert.equal(observed,expected,'isolated narrative must exactly match current published Git blob');
 return true;
}


// #3781: The isolated candidate restores UNSELECTED unfinished CI/server
// behavior to exact published Git objects. Tests for later unfinished behavior
// are NOT_APPLICABLE only after these independent source-object assertions.
// Never skip actual admission, ownership, revocation, offline or privacy tests.
const ADMISSION_ID='DIC-Q-3781-returning-session-background-admission';
const INSTANT_ID='DIC-Q-3851-cache-before-admission';
const INSTANT_PUBLISHED_SOURCE='d4af1c4e13d1babe6f10d277d5243582eb798c56';
const CLEAN_ADMISSION_SOURCE='354ddd99ef0ce8f03b2f74544782e4e977201a31';
const CLEAN_INSTANT_SOURCE='39c28f4e8fbb01451b6d2f819908ca6996fa89e7';
const SELECTED_PUBLISHED_GROWERS='3d05488a45f1b39e47fc096137e6025cc2480e56';
function selectedAdmissionCandidate(){
 let m;
 try {m=JSON.parse(readFileSync(new URL('../../docs/RELEASE_CANDIDATE.json',import.meta.url),'utf8'));}
 catch(e){if(e?.code==='ENOENT')return null;throw e;}
 if(m?.kind!=='DIC-READY-ONLY-SOURCE-1'||m.publication_authorized!==false||
    !SHA.test(m.published_source_sha||'')||m.selected_ready_item_ids?.length!==1||
    ![ADMISSION_ID,INSTANT_ID].includes(m.selected_ready_item_ids[0]))return null;
 if(m.selected_ready_item_ids[0]===INSTANT_ID){
  assert.equal(m.published_source_sha,INSTANT_PUBLISHED_SOURCE,
   'Instant startup must use the exact last published #3781 baseline');
  assert.ok(m.pinned_to_ready_paths?.includes('site/cloud/main.js'),
   'Instant startup must pin the mixed-owner entrypoint');
 }
 return m;
}
function gitBlob(ref,path){
 const value=execFileSync('git',['rev-parse',ref+':'+path],{
  encoding:'utf8',timeout:15000
 }).trim();
 assert.match(value,SHA,'reviewed historical Git object must exist: '+path);
 return value;
}
function currentBlob(path){
 const bytes=readFileSync(new URL('../../'+path,import.meta.url));
 return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
}
export function frozenExcludedReadySource(paths){
 if(frozenExcludedProspectiveSource(paths))return true;
 if(frozenExcludedTestingSource(paths))return true;
 const m=selectedAdmissionCandidate();if(!m)return false;
 assert.ok(Array.isArray(paths)&&paths.length>0);
 for(const path of paths){
  assert.ok(m.restored_to_published_paths?.includes(path)||
    m.restored_unpublished_workflow_paths?.includes(path),
    'Never call unselected behavior in a frozen candidate without its manifest exclusion: '+path);
  assert.equal(currentBlob(path),gitBlob(m.published_source_sha,path),
    'Unselected code/workflow was not exactly restored to last published Git bytes: '+path);
 }
 return true;
}
export function frozenAdmissionScopedSource(){
 if(frozenExcludedTestingSource(['site/cloud/main.js','site/cloud/client.js']))return true;
 if(frozenExcludedProspectiveSource(['site/cloud/main.js','site/cloud/client.js']))return true;
 const m=selectedAdmissionCandidate();if(!m)return false;
 assert.ok(m.pinned_to_ready_paths?.includes('site/cloud/main.js'),
  'Cannot classify unready Log Shot behavior without frozen mixed-file pin');
 const frozen=m.selected_ready_item_ids[0]===INSTANT_ID?CLEAN_INSTANT_SOURCE:CLEAN_ADMISSION_SOURCE;
 for(const path of ['site/cloud/main.js','site/cloud/client.js']){
  assert.equal(currentBlob(path),gitBlob(frozen,path),
   'Selected Auth code differs from the independently reviewed clean source: '+path);
 }
 return true;
}
export function currentPublishedGrowerEvidence(){
 const m=selectedAdmissionCandidate()||prospectiveCandidate();if(!m)return false;
 const path='src/server/coffee-narrative-evidence.mjs';
 if(!m.restored_to_published_paths?.includes(path))return false;
 const prior=gitBlob(m.published_source_sha,path);
 assert.equal(currentBlob(path),prior,'Narrative parser must retain published bytes');
 return prior===SELECTED_PUBLISHED_GROWERS;
}

/** Narrow N/A for an unselected #33 QA-only helper whose new runtime import
 * was itself restored to published absence in the exact #3851 candidate.
 * Never exempt shipped application modules or unrelated broken imports. */
export function frozenUnselectedAuditImport(sourcePath,imported){
 const audit='scripts/audit/issue33-original603-focused-source-review.mjs';
 const target='src/server/coffee-selected-shopify-variant-richtext.mjs';
 if(sourcePath!==audit||imported!=='../../'+target)return false;
 const m=selectedAdmissionCandidate();
 if(!m||m.selected_ready_item_ids[0]!==INSTANT_ID)return false;
 assert.ok(m.restored_to_published_paths?.includes(target),
  'Unready audit target must be explicitly restored to published absence');
 const q=JSON.parse(readFileSync(new URL('../../docs/RELEASE_QUEUE.json',import.meta.url),'utf8'));
 assert.ok(q.items.some(i=>i.issue===33&&['IN_PROGRESS','TESTING','BLOCKED'].includes(i.state)&&
  i.scope_paths?.includes(target)),
  'Unready audit-only import requires actual unfinished #33 ownership');
 assert.equal(q.published_base.tested_source_sha,m.published_source_sha,
  'Candidate and queue published baseline differ');
 assert.equal(currentBlob(audit),gitBlob(m.development_source_sha,audit),
  'Audit source must remain the exact staging-source Git object');
 assert.notEqual(currentBlob(audit),gitBlob(m.published_source_sha,audit),
  'Audit source must be unselected newer code');
 assert.match(gitBlob(m.development_source_sha,target),SHA,
  'Unready target must be an excluded actual development Git object');
 return true;
}


const PROSPECTIVE_ID='DIC-Q-509-stale-project-shot-comment-20261122';
const PROSPECTIVE_MERGE='5b5159823908f3ae660f45b3ad93c096be586aec';
const PROSPECTIVE_MIGRATION='supabase/migrations/20261122214500_dic_project_shot_comment_refresh.sql';
const PROSPECTIVE_MIGRATION_BLOB='84cecbe69143b2170aa97a851198cc35b9926303';
const PROSPECTIVE_BASELINE='46304f47eb0e78fac8c7845155af86080900b3c4';
const PROSPECTIVE_PUBLISHED='2d22d448160d428a977f06482323646b92818fcf';
// Only allow NOT_APPLICABLE test branches when the one unchanged selected
// migration and every excluded source are independently Git-object proven.
// This is a QA helper; it cannot certify READY or grant publication.
export function verifyProspectiveReadyTestScope({manifest,queue,branch,commitParent,sourceObjectAt}={}){
 const p=manifest?.prospective_ready_preview;
 if(p===undefined)return false;
 assert.equal(manifest.kind,'DIC-READY-ONLY-SOURCE-1');
 assert.equal(manifest.schema_version,1);
 assert.equal(manifest.publication_authorized,false);
 assert.equal(p.status,'PROSPECTIVE_ONLY_FIVE_CI_AND_PROMOTION_PENDING');
 assert.equal(p.selected_id,PROSPECTIVE_ID);
 assert.equal(p.baseline_queue_blob,PROSPECTIVE_BASELINE);
 assert.match(p.identity_sha256||'',/^[a-f0-9]{64}$/);
 assert.match(manifest.candidate_branch||'',/^release-candidates\/prospect3889-[a-f0-9]{20}$/);
 assert.deepEqual(manifest.selected_ready_item_ids,[PROSPECTIVE_ID]);
 assert.match(manifest.development_source_sha||'',SHA);
 assert.equal(manifest.published_source_sha,PROSPECTIVE_PUBLISHED);
 assert.equal(commitParent,manifest.development_source_sha);
 if((branch||'').startsWith('refs/heads/release-candidates/'))
  assert.equal(branch,'refs/heads/'+manifest.candidate_branch);
 assert.equal(queue?.published_base?.tested_source_sha,PROSPECTIVE_PUBLISHED);
 assert.ok(Array.isArray(queue.items));
 const ready=queue.items.filter(x=>x.state==='READY');
 assert.deepEqual(ready.map(x=>x.id),[PROSPECTIVE_ID]);
 const item=ready[0];
 assert.equal(item.issue,509);
 assert.equal(item.merged_source_sha,PROSPECTIVE_MERGE);
 assert.deepEqual(item.scope_paths,[PROSPECTIVE_MIGRATION]);
 assert.ok(Array.isArray(item.tests)&&item.tests.length>0);
 assert.ok(Array.isArray(item.ci_runs)&&item.ci_runs.length>0);
 assert.deepEqual(item.blockers,[]);
 assert.equal(typeof sourceObjectAt,'function');
 for(const ref of ['HEAD',PROSPECTIVE_MERGE,manifest.development_source_sha])
  assert.equal(sourceObjectAt(ref,PROSPECTIVE_MIGRATION),PROSPECTIVE_MIGRATION_BLOB,
   'prospective candidate cannot alter the sole selected SQL migration');
 assert.ok(Array.isArray(manifest.restored_to_published_paths));
 assert.ok(Array.isArray(manifest.restored_unpublished_workflow_paths));
 return true;
}

const BATCH_R399_ID='DIC-Q-33-r399-original99-producer-tenure-precision';
const BATCH_R399_MERGE='513f98ac06cdd0fe569390354420158458342859';
const BATCH_R399_PATH='src/server/coffee-narrative-evidence.mjs';
const BATCH_R399_TEST='tests/coffee-issue33-r399-keller-tenure.test.mjs';
const BATCH_R399_BLOB='3de11626496a0b698e558ec8929f0158e3083b0a';
const BATCH_R399_TEST_BLOB='16c4d572ecd43860a9cd4f1a7f2baffd670382ee';
const BATCH_BASELINE_DEV='d9fc859d81a23e10ee2cd0e1a37013b93a4980e5';
const BATCH_PARENT_QUEUE='dd9c0ea0ad69590555b243dc3e5c81b6ac080e0c';
const BATCH_PROSPECTIVE_QUEUE='3f4e6ed4fc81e843c10cc17b2468c34bc3a04818';
const BATCH_SELECTED_PATHS=[PROSPECTIVE_MIGRATION,BATCH_R399_PATH,BATCH_R399_TEST];
// Reviewed two-ID #3889 scope only. A new selection or queue requires its own
// exact proof. Do not classify selected source/tests as not applicable.
export function verifyProspectiveBatchReadyTestScope({manifest,queue,branch,commitParent,sourceObjectAt}={}){
 const p=manifest?.prospective_ready_batch_preview;
 if(p===undefined)return false;
 assert.equal(manifest.kind,'DIC-READY-ONLY-SOURCE-1');
 assert.equal(manifest.schema_version,1);
 assert.equal(manifest.publication_authorized,false);
 assert.equal(manifest.prospective_ready_preview,undefined);
 assert.equal(p.status,'PROSPECTIVE_BATCH_PLAN_ONLY');
 assert.equal(p.publication_authorized,false);
 assert.equal(p.ready_certified,false);
 assert.equal(p.baseline_queue_blob,PROSPECTIVE_BASELINE);
 assert.deepEqual(p.added_ids,[BATCH_R399_ID]);
 assert.deepEqual(p.retained_ready_ids,[PROSPECTIVE_ID]);
 assert.match(p.identity_sha256||'',/^[a-f0-9]{64}$/);
 assert.match(manifest.candidate_branch||'',/^release-candidates\/prospectbatch3889-[a-f0-9]{20}$/);
 assert.deepEqual(manifest.selected_ready_item_ids,[BATCH_R399_ID,PROSPECTIVE_ID]);
 assert.match(manifest.development_source_sha||'',SHA);
 assert.equal(manifest.published_source_sha,PROSPECTIVE_PUBLISHED);
 assert.equal(commitParent,manifest.development_source_sha);
 if((branch||'').startsWith('refs/heads/release-candidates/'))
  assert.equal(branch,'refs/heads/'+manifest.candidate_branch);
 assert.equal(queue?.published_base?.tested_source_sha,PROSPECTIVE_PUBLISHED);
 assert.ok(Array.isArray(queue.items));
 const ready=queue.items.filter(x=>x.state==='READY');
 assert.deepEqual(ready.map(x=>x.id).sort(),[BATCH_R399_ID,PROSPECTIVE_ID]);
 for(const [id,issue,merge,path] of [[PROSPECTIVE_ID,509,PROSPECTIVE_MERGE,PROSPECTIVE_MIGRATION],
  [BATCH_R399_ID,33,BATCH_R399_MERGE,BATCH_R399_PATH]]){
  const item=ready.find(x=>x.id===id);
  assert.equal(item.issue,issue);assert.equal(item.merged_source_sha,merge);
  assert.deepEqual(item.scope_paths,[path]);assert.deepEqual(item.blockers,[]);
  assert.equal(item.production_deployed,false);
  assert.ok(Array.isArray(item.tests)&&item.tests.length>0);
  assert.ok(Array.isArray(item.ci_runs)&&item.ci_runs.length>0);
 }
 assert.equal(typeof sourceObjectAt,'function');
 assert.equal(sourceObjectAt(BATCH_BASELINE_DEV,'docs/RELEASE_QUEUE.json'),PROSPECTIVE_BASELINE);
 assert.equal(sourceObjectAt(manifest.development_source_sha,'docs/RELEASE_QUEUE.json'),BATCH_PARENT_QUEUE);
 assert.equal(sourceObjectAt('HEAD','docs/RELEASE_QUEUE.json'),BATCH_PROSPECTIVE_QUEUE);
 for(const [path,merge,blob] of [[PROSPECTIVE_MIGRATION,PROSPECTIVE_MERGE,PROSPECTIVE_MIGRATION_BLOB],
  [BATCH_R399_PATH,BATCH_R399_MERGE,BATCH_R399_BLOB],
  [BATCH_R399_TEST,BATCH_R399_MERGE,BATCH_R399_TEST_BLOB]]){
  for(const key of ['restored_to_published_paths','restored_unpublished_workflow_paths','excluded_unready_test_paths',
   'restored_to_published_unready_test_paths','restored_reviewed_batch_qa_paths']){
   if(manifest[key]!==undefined){
    assert.ok(Array.isArray(manifest[key]));
    assert.ok(!manifest[key].includes(path),'selected batch path may never be restored/excluded: '+path);
   }
  }
  for(const ref of ['HEAD',merge,manifest.development_source_sha])
   assert.equal(sourceObjectAt(ref,path),blob,'selected batch source/test must retain exact reviewed Git object: '+path);
 }
 assert.ok(Array.isArray(manifest.restored_to_published_paths));
 assert.ok(Array.isArray(manifest.restored_unpublished_workflow_paths));
 return true;
}

let prospectiveCache;
function prospectiveCandidate(){
 if(prospectiveCache!==undefined)return prospectiveCache;
 let m;
 try{m=JSON.parse(readFileSync(new URL('../../docs/RELEASE_CANDIDATE.json',import.meta.url),'utf8'));}
 catch(e){if(e?.code==='ENOENT')return prospectiveCache=null;throw e;}
 if(m?.prospective_ready_preview===undefined&&m?.prospective_ready_batch_preview===undefined)return prospectiveCache=null;
 const q=JSON.parse(readFileSync(new URL('../../docs/RELEASE_QUEUE.json',import.meta.url),'utf8'));
 const parent=execFileSync('git',['rev-parse','HEAD^'],{encoding:'utf8',timeout:15000}).trim();
 const opts={manifest:m,queue:q,branch:process.env.GITHUB_REF||'',commitParent:parent,sourceObjectAt:gitBlob};
 if(m.prospective_ready_batch_preview!==undefined)verifyProspectiveBatchReadyTestScope(opts);
 else verifyProspectiveReadyTestScope(opts);
 return prospectiveCache=m;
}
function frozenExcludedProspectiveSource(paths){
 const m=prospectiveCandidate();if(!m)return false;
 assert.ok(Array.isArray(paths)&&paths.length>0);
 for(const path of paths){
  assert.ok(!(m.prospective_ready_batch_preview!==undefined?BATCH_SELECTED_PATHS:[PROSPECTIVE_MIGRATION]).includes(path),
   'selected prospective source and tests must NEVER be excluded: '+path);
  const published=gitBlob(m.published_source_sha,path);
  const developed=gitBlob(m.development_source_sha,path);
  assert.ok(m.restored_to_published_paths.includes(path)||
    m.restored_unpublished_workflow_paths.includes(path)||developed===published,
    'only independently restored or already published unselected code may be N/A: '+path);
  assert.equal(currentBlob(path),published,
   'prospective source must exactly match published Git object: '+path);
 }
 return true;
}

// #3889 TESTING-only compatibility: an unselected test is N/A only after
// independent exact published-Git-blob parity. Never mark a CI job PASS here.
let testingManifestCache;
function testingManifest(){
 if(testingManifestCache!==undefined)return testingManifestCache;
 let m;
 try{m=JSON.parse(readFileSync(new URL('../../docs/TESTING_3889_CANDIDATE.json',import.meta.url),'utf8'));}
 catch(e){if(e?.code==='ENOENT')return testingManifestCache=null;throw e;}
 assert.equal(m.kind,'DIC-TESTING-FROZEN-NONPUBLISHING-3889-V1');
 assert.equal(m.publication_authorized,false);assert.equal(m.certified_ready_count,0);
 assert.deepEqual(m.selected_ready_item_ids,[]);
 assert.equal(m.status,'FROZEN_SOURCE_WITH_QA_COMPATIBILITY_CI_NOT_RUN');
 assert.match(m.published_source_sha,SHA);assert.match(m.development_source_sha,SHA);
 assert.match(m.merged_source_sha,SHA);assert.match(m.baseline_queue_blob,SHA);
 assert.equal(m.selected_testing_item_id,'DIC-Q-509-stale-project-shot-comment-20261122');
 assert.equal(m.selected_blobs?.length,1);
 assert.equal(m.selected_blobs[0]?.path,'supabase/migrations/20261122214500_dic_project_shot_comment_refresh.sql');
 assert.equal(m.selected_blobs[0]?.source_sha,
   '100644:'+gitBlob('HEAD',m.selected_blobs[0].path));
 assert.equal(gitBlob(m.merged_source_sha,m.selected_blobs[0].path),gitBlob('HEAD',m.selected_blobs[0].path));
 assert.ok(Array.isArray(m.restored_to_published_paths)&&m.restored_to_published_paths.length>0);
 const q=JSON.parse(readFileSync(new URL('../../docs/RELEASE_QUEUE.json',import.meta.url),'utf8'));
 assert.equal(q.published_base.tested_source_sha,m.published_source_sha);
 assert.equal(q.items.find(x=>x.id===m.selected_testing_item_id)?.state,'TESTING');
 assert.equal(q.items.some(x=>x.state==='READY'),false);
 const branch=process.env.GITHUB_REF||'';
 if(branch.startsWith('refs/heads/release-candidates/'))
  assert.equal(branch,'refs/heads/'+m.candidate_branch);
 try{readFileSync(new URL('../../docs/RELEASE_CANDIDATE.json',import.meta.url));
  assert.fail('nonpublishing TESTING candidate must not have READY publisher manifest');
 }catch(e){if(e?.code!=='ENOENT')throw e;}
 return testingManifestCache=m;
}
function frozenExcludedTestingSource(paths){
 const m=testingManifest();if(!m)return false;
 assert.ok(Array.isArray(paths)&&paths.length>0);
 for(const path of paths){
  assert.ok(!m.selected_blobs.some(x=>x.path===path),'cannot exclude selected TESTING path '+path);
  const pub=gitBlob(m.published_source_sha,path),dev=gitBlob(m.development_source_sha,path);
  assert.ok(m.restored_to_published_paths.includes(path)||dev===pub,
   'unselected path must be restored or originally identical: '+path);
  assert.equal(currentBlob(path),pub,'unselected TESTING source not exact published Git bytes: '+path);
 }
 return true;
}
