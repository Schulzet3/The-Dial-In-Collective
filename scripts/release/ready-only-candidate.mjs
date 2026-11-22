// One-publisher READY-only source staging policy. This module does not deploy,
// write a repository ref, call a provider, or execute tests. Fail closed when
// a selected READY path overlaps unfinished source (including same-file edits).
import {deployableChangedPaths,queueSchemaErrors} from './release-queue.mjs';
import {posix} from 'node:path';
import {classifyReleaseRisk} from './release-reliability.mjs';
const SHA=/^[a-f0-9]{40}$/;
const ITEM=/^DIC-Q-[1-9][0-9]*(?:-[a-z0-9-]+)?$/;
const sorted=items=>[...items].sort();
const equal=(a,b)=>JSON.stringify(sorted(a))===JSON.stringify(sorted(b));
// One file can be both a reviewed workflow-only and an issue-scoped unready
// test. Both proofs stay mandatory, but Git's changed-path inventory is a SET.
export function assertExactCandidateStagedPaths(actual,...provenanceGroups){
 if(!Array.isArray(actual)||provenanceGroups.some(g=>!Array.isArray(g)))
  throw Error('Isolated READY candidate HOLD: candidate changed-path provenance unavailable');
 const expected=sorted([...new Set(provenanceGroups.flat())]);
 if(!equal(actual,expected))
  throw Error('Isolated READY candidate HOLD: Candidate staging commit changes unrelated paths or lacks same-commit journal');
 return true;
}

export const CANDIDATE_RECEIPT_PATH='docs/RELEASE_CANDIDATE.json';
export const CANDIDATE_JOURNAL_PATH='docs/ACTIVE_WORK_2026-10-20_APPROVAL_TO_RELEASE_INTEGRITY.md';
export const CANDIDATE_KIND='DIC-READY-ONLY-SOURCE-1';
// Production publication must never edit/create GitHub Actions workflows.
// The Actions GITHUB_TOKEN publisher has no workflows scope. Keep all CI
// workflow evolution on main/development and restore exact published bytes
// in the isolated source, without weakening READY feature/test gating.
export const workflowChangedPaths=paths=>sorted([...new Set((Array.isArray(paths)?paths:[])
 .filter(p=>typeof p==='string'&&/^\.github\/workflows\/[A-Za-z0-9_./-]+\.ya?ml$/.test(p)))]);
export const REVIEWED_WORKFLOW_TEST=Object.freeze({
 path:'tests/issue455-browser-dependency-install-fallback.test.mjs',
 sourceBlob:'32174be8c42ba9ae73085e0f6f1f42613b2b08db',
 restoredWorkflow:'.github/workflows/cloud-regression.yml'
});
export const REVIEWED_CI_FAST_PR_TEST=Object.freeze({
 path:'tests/fast-pr-check.test.mjs',sourceBlob:'d11a0f702d35032e3442bfc8ee8671216f3496f8',
 restoredWorkflow:'.github/workflows/cloud-beta-ci.yml'
});
// Full published workflow bytes never execute newer workflow-only tests.
export function discoverReviewedWorkflowTestExclusions({publishedSourceSha,
 developmentSourceSha,restoredWorkflows,sourceObjectAt}={}){
 if(typeof sourceObjectAt!=='function'||!Array.isArray(restoredWorkflows))return [];
 return sorted([REVIEWED_WORKFLOW_TEST,REVIEWED_CI_FAST_PR_TEST]
  .filter(spec=>restoredWorkflows.includes(spec.restoredWorkflow)&&
   sourceObjectAt(publishedSourceSha,spec.path)===null&&
   sourceObjectAt(developmentSourceSha,spec.path)==='100644:'+spec.sourceBlob)
  .map(spec=>spec.path));
}

export const REVIEWED_SOURCE_PATH_CASE_SQL_TEST=Object.freeze({
 path:'supabase/tests/coffee_identity_matching.sql',
 itemId:'DIC-Q-509-source-path-case-guard-20261115',
 migration:'supabase/migrations/20261115124500_dic_source_key_path_case_guard.sql',
 sourceMerge:'9a7ffa65955d8c2b81e41153653e19fc512f3a31',
 publishedBlob:'831bcc8535337d9bb4a028fb7688e1d3b6c57d27',
 unpublishedBlob:'1047d26527ddcb922fe8a366c7806e47b3e32b0c'
});
// Restore a pre-existing SQL test to its EXACT last-published Git object only
// when the single, independently tracked TESTING migration introduced its
// newer assertions. This is never permission to delete an unrelated test or
// to silently certify the unfinished migration.
export function discoverReviewedRestoredSqlTests({queue,restoredPaths,publishedSourceSha,
 developmentSourceSha,sourceObjectAt,selectedReadyItems=[]}={}){
 const original=REVIEWED_SOURCE_PATH_CASE_SQL_TEST;
 if(typeof sourceObjectAt!=='function'||!Array.isArray(restoredPaths)||
    !Array.isArray(selectedReadyItems))
  throw Error('SQL test restoration provenance unavailable');
 // No migration is being excluded, so there is no migration-specific SQL
 // fixture to restore. Synthetic READY-only tests legitimately have no SQL.
 if(!restoredPaths.some(path=>path.startsWith('supabase/migrations/'))){
  const original=REVIEWED_SOURCE_PATH_CASE_SQL_TEST;
  if(sourceObjectAt(developmentSourceSha,original.path)==='100644:'+original.unpublishedBlob)
   throw Error('Unready SQL case-path test source/owner is not independently attributable');
  for(const fixture of REVIEWED_UNREADY_SQL_SUITE)
   if(sourceObjectAt(developmentSourceSha,fixture.path)==='100644:'+fixture.unpublishedBlob)
    throw Error('Unready SQL regression source lacks excluded TESTING migration: '+fixture.path);
  return [];
 }
 const restored=[];
 const same=(ref,path,blob)=>sourceObjectAt(ref,path)===(blob?'100644:'+blob:null);
 const readyUnchanged=path=>{
  for(const item of selectedReadyItems){
   if(!SHA.test(item.merged_source_sha||'')||
      sourceObjectAt(item.merged_source_sha,path)!==
       sourceObjectAt(item.merged_source_sha+'^',path))
    throw Error('Selected READY merge modified an unready SQL test: '+item.id+' '+path);
  }
 };
 const originalCurrent=sourceObjectAt(developmentSourceSha,original.path);
 if(originalCurrent==='100644:'+original.unpublishedBlob){
  if(!same(publishedSourceSha,original.path,original.publishedBlob))
   throw Error('Published SQL identity test blob has unreviewed drift');
  const owner=queue?.items?.find(i=>i.id===original.itemId);
  if(owner?.issue!==509||!['IN_PROGRESS','TESTING','BLOCKED'].includes(owner.state)||
     owner.merged_source_sha!==original.sourceMerge||
     !Array.isArray(owner.scope_paths)||owner.scope_paths.length!==1||
     owner.scope_paths[0]!==original.migration||!restoredPaths.includes(original.migration)||
     sourceObjectAt(publishedSourceSha,original.migration)!==null||
     sourceObjectAt(developmentSourceSha,original.migration)===null||
     !same(original.sourceMerge,original.path,original.unpublishedBlob)||
     !same(original.sourceMerge+'^',original.path,original.publishedBlob))
   throw Error('Unready SQL case-path test source/owner is not independently attributable');
  readyUnchanged(original.path);
  restored.push(original.path);
 }else if(originalCurrent!==null){
  throw Error('Unreviewed SQL case-path test source drift');
 }
 for(const spec of REVIEWED_UNREADY_SQL_SUITE){
  const current=sourceObjectAt(developmentSourceSha,spec.path);
  // Synthetic/older source fixtures without this exact unready test are not
  // eligible to restore it; an altered real test is always a HOLD.
  if(current===null&&sourceObjectAt(publishedSourceSha,spec.path)===null)continue;
  if(!same(developmentSourceSha,spec.path,spec.unpublishedBlob)||
     !same(publishedSourceSha,spec.path,spec.publishedBlob))
   throw Error('Unreviewed current or published SQL test bytes: '+spec.path);
  const owner=queue?.items?.find(i=>i.issue===509&&
    ['IN_PROGRESS','TESTING','BLOCKED'].includes(i.state)&&
    Array.isArray(i.scope_paths)&&i.scope_paths.length===1&&
    i.scope_paths[0]===spec.migration);
  if(!owner||!restoredPaths.includes(spec.migration)||
     sourceObjectAt(publishedSourceSha,spec.migration)!==null||
     sourceObjectAt(developmentSourceSha,spec.migration)===null||
     !same(spec.sourceMerge,spec.path,spec.unpublishedBlob)||
     sourceObjectAt(spec.sourceMerge+'^',spec.path)===current)
   throw Error('Unready SQL regression test lacks exact source/migration provenance: '+spec.path);
  readyUnchanged(spec.path);
  restored.push(spec.path);
 }
 return sorted([...new Set(restored)]);
}

// Only these exact 13 reviewed post-published SQL test objects may be
// restored/removed with their separately TESTING migration. No READY-owned
// SQL test is eligible; hash or provenance drift remains a HOLD.
export const REVIEWED_UNREADY_SQL_SUITE=Object.freeze([
  {
    "path": "supabase/tests/admin_coffee_review.sql",
    "publishedBlob": "a3d1376e52bbe8b84bcf241f0de635d8f49062b4",
    "unpublishedBlob": "080e37931406845eae8e8f8e0430b3046ab616c1",
    "sourceMerge": "942c3d1b7051553ccd9c5795d2db2412418c56e7",
    "migration": "supabase/migrations/20261117130000_dic_admin_merge_null_normalized_name_guard.sql"
  },
  {
    "path": "supabase/tests/community_quality_integrity.sql",
    "publishedBlob": "149453cc3177203ca96762dbf8312c966c87eb98",
    "unpublishedBlob": "80c49e9e2a3a3e5c3be89660ff624864d487b25e",
    "sourceMerge": "a6373cd1b9f6451603e147271750f89641bd03e1",
    "migration": "supabase/migrations/20261116224000_dic_community_search_producer_parity.sql"
  },
  {
    "path": "supabase/tests/source_worker_auth_and_admission.sql",
    "publishedBlob": "85c2138a84911016f1dffffb34a960049af34ded",
    "unpublishedBlob": "7a4c4d370f8cf8085d32084141758ffa2f78c40b",
    "sourceMerge": "6f271a49ee5904a78250a826bdfd1dce4d4843ad",
    "migration": "supabase/migrations/20261117133000_dic_source_retry_rollover_cooldown.sql"
  },
  {
    "path": "supabase/tests/universal_url_preview.sql",
    "publishedBlob": "4a18d99435b8ddc45406fdd3cfa7a520517f9705",
    "unpublishedBlob": "663e7728fac240e0b576aab27948427dd4100f0c",
    "sourceMerge": "12bdea41b49d0b4e558da11c2a6829e56e0e6c5a",
    "migration": "supabase/migrations/20261117114500_dic_shared_preview_rollover_cooldown.sql"
  },
  {
    "path": "supabase/tests/admin_edit_normalized_identity_guard.sql",
    "publishedBlob": null,
    "unpublishedBlob": "63f4c9d236f8fc727b8db3387128e79636f63b40",
    "sourceMerge": "e958c3acace0d908a4464b5cf95c0405510a1c8b",
    "migration": "supabase/migrations/20261118214500_dic_admin_edit_normalized_identity_guard.sql"
  },
  {
    "path": "supabase/tests/coffee_confirm_null_name_guard.sql",
    "publishedBlob": null,
    "unpublishedBlob": "afd1640a6514abbe8b4779fbcc052ed1ea5f99c7",
    "sourceMerge": "78969b25dc5c0f258b05cc3bfb4cc0fd83fb5dd5",
    "migration": "supabase/migrations/20261118113500_dic_confirm_coffee_null_name_guard.sql"
  },
  {
    "path": "supabase/tests/coffee_first_entry_no_self_alias.sql",
    "publishedBlob": null,
    "unpublishedBlob": "52afd0ebfc7ace8d9274ecd4ed2357ed54f91cf2",
    "sourceMerge": "bc4c79b3c75fc3ead13be581430d96cbb29401b4",
    "migration": "supabase/migrations/20261118114600_dic_first_entry_no_self_alias.sql"
  },
  {
    "path": "supabase/tests/coffee_historical_alias_suggestion_confirm.sql",
    "publishedBlob": null,
    "unpublishedBlob": "5e520243be220c7c9893c0cd875f86c319d51162",
    "sourceMerge": "d9df02a046ea3edef31e705f00568fee830a07fd",
    "migration": "supabase/migrations/20261118140000_dic_coffee_alias_suggestion_confirm.sql"
  },
  {
    "path": "supabase/tests/community_outlier_null_revision.sql",
    "publishedBlob": null,
    "unpublishedBlob": "43c7da7cc7df111c63ad42e56b95f44354e09115",
    "sourceMerge": "fd48065ca1b027e0f0425a040e1c041fcd4914d5",
    "migration": "supabase/migrations/20261118181500_dic_community_outlier_null_revision_guard.sql"
  },
  {
    "path": "supabase/tests/import_additional_credential_keys.sql",
    "publishedBlob": null,
    "unpublishedBlob": "670a5cd2fa299861e105f585e02a45996909182b",
    "sourceMerge": "949df84d4861cf316a82e82ea8201f158b1a1fd2",
    "migration": "supabase/migrations/20261116210000_dic_import_additional_credential_keys.sql"
  },
  {
    "path": "supabase/tests/legacy_private_hide_shot_retirement.sql",
    "publishedBlob": null,
    "unpublishedBlob": "7d9c4730b6e8c5170a7b5945d7730de5e5c42f3e",
    "sourceMerge": "835883b0180d6bb1e7ff3ec2293fafd9f09643f7",
    "migration": "supabase/migrations/20261118164500_dic_remove_legacy_private_hide_shot_handler.sql"
  },
  {
    "path": "supabase/tests/pending_canonical_name_response.sql",
    "publishedBlob": null,
    "unpublishedBlob": "70d6f1943402785e319a8651239c24598a30bf4e",
    "sourceMerge": "cccd5c0ebc63203326829f61d85b96403b951465",
    "migration": "supabase/migrations/20261116151600_dic_pending_canonical_name_response.sql"
  },
  {
    "path": "supabase/tests/recommendation_unique_controls.sql",
    "publishedBlob": null,
    "unpublishedBlob": "9ae348244ea6545b208e8ad1fbb76dff652b7da4",
    "sourceMerge": "8b4e4e3edc42c821aa9f6858e62b20fdd4300ef8",
    "migration": "supabase/migrations/20261118180000_dic_recommendation_unique_controls.sql"
  },
  {
    "path": "supabase/tests/admin_shot_delete_family_refresh.sql",
    "publishedBlob": null,
    "unpublishedBlob": "73849edbbd737b69ea5e33570c93a6844967c1ea",
    "sourceMerge": "78dac5c9a2506041f1e2439281ab526058436b14",
    "migration": "supabase/migrations/20261119105000_dic_admin_shot_delete_family_refresh.sql"
  }
]);

// Existing coffee tests were changed in exactly the same unfinished #33 R232
// merge as their runtime. Restore complete LAST-PUBLISHED test bytes when
// that runtime is deliberately restored, never delete/skip these regressions.
export const REVIEWED_R232_COFFEE_TEST=Object.freeze({
 item:'DIC-Q-33-r232-selected-annual-release-role',issue:33,
 merge:'b585b9cf646da868e6c7c8871289c82f6d96e6ca',
 runtime:'src/server/coffee-identity-evidence.mjs',
 oldRuntime:'c43e128ea1eb61d09dbaad4ce6a926eedcbe9e83',
 newRuntime:'a75ec662fec764f41982bcbb3bbfb2798f7c5b1d',
 testBlobs:Object.freeze({
  'tests/coffee-corpus-identity-regressions.test.mjs':Object.freeze({
   old:'7269450ec113a605499c694bea1a53cf7bcb03cf',
   newer:'d9e9ea3f27b12a0f44fc40ababdc2e4c319e3cee'}),
  'tests/universal-coffee-preview.test.mjs':Object.freeze({
   old:'8c49e473dbcb978860881654ff59e9d3224539a5',
   newer:'306c7d79f07f800f73ffc575b90ed881b57b8d67'})
 })
});
export function discoverReviewedRestoredR232CoffeeTests({queue,restoredPaths,
 publishedSourceSha,developmentSourceSha,sourceObjectAt,selectedReadyItems=[]}={}){
 const s=REVIEWED_R232_COFFEE_TEST;
 if(!restoredPaths?.includes(s.runtime))return [];
 if(typeof sourceObjectAt!=='function'||!Array.isArray(selectedReadyItems))
  throw Error('R232 frozen coffee source proof unavailable');
 const owner=queue?.items?.find(i=>i.id===s.item);
 const obj=(sha,path)=>sourceObjectAt(sha,path);
 if(owner?.issue!==s.issue||owner.state!=='TESTING'||
    (owner.merged_source_sha!==null&&owner.merged_source_sha!==undefined)||
    owner.scope_paths?.length!==1||owner.scope_paths[0]!==s.runtime||
    obj(publishedSourceSha,s.runtime)!=='100644:'+s.oldRuntime||
    obj(developmentSourceSha,s.runtime)!=='100644:'+s.newRuntime||
    obj(s.merge,s.runtime)!=='100644:'+s.newRuntime||
    obj(s.merge+'^',s.runtime)!=='100644:'+s.oldRuntime)
  throw Error('Unready R232 owner or runtime provenance mismatch');
 const paths=Object.keys(s.testBlobs).sort();
 for(const path of paths){
  const proof=s.testBlobs[path];
  if(obj(publishedSourceSha,path)!=='100644:'+proof.old||
     obj(developmentSourceSha,path)!=='100644:'+proof.newer||
     obj(s.merge,path)!=='100644:'+proof.newer||
     obj(s.merge+'^',path)!=='100644:'+proof.old)
   throw Error('R232 historical test Git object changed: '+path);
  for(const item of selectedReadyItems){
   if(!SHA.test(item.merged_source_sha||'')||
      obj(item.merged_source_sha,path)!==obj(item.merged_source_sha+'^',path))
    throw Error('Selected READY merge edited R232 test: '+path);
  }
 }
 return paths;
}


// #3347: preserve the COMPLETE published Admin test suite when the unfinished
// #509 search recovery is excluded. Test-only provenance, no product changes.
export const REVIEWED_UNREADY_ADMIN_TEST=Object.freeze({
 path:'tests/admin-records.test.mjs',
 runtime:'site/admin/main.js',
 owner:'DIC-Q-509-admin-search-recovery-visible',
 sourceMerge:'614e9ed2eb8db3cac1067a4a33fbc08b392123e0',
 published:'18121e3fca15bdb7470d8cbba067a8877411911c',
 development:'bd4e95b55c4f6b4f139739c77c4d1a215a8cf640',
 mergeParent:'637fcd5471383b36056d460e52ead81c160a0272'
});
export function discoverReviewedRestoredUnreadyAdminTests({queue,restoredPaths,
 publishedSourceSha,developmentSourceSha,sourceObjectAt,selectedReadyItems=[]}={}){
 const s=REVIEWED_UNREADY_ADMIN_TEST;
 if(!restoredPaths?.includes(s.runtime))return [];
 if(typeof sourceObjectAt!=='function'||!Array.isArray(selectedReadyItems))
  throw Error('Unready Admin test exact provenance unavailable');
 const obj=(ref,path)=>sourceObjectAt(ref,path);
 const owner=queue?.items?.find(i=>i.id===s.owner);
 if(owner?.issue!==509||owner.state!=='TESTING'||
    owner.scope_paths?.length!==1||owner.scope_paths[0]!==s.runtime||
    obj(publishedSourceSha,s.runtime)===obj(developmentSourceSha,s.runtime)||
    obj(publishedSourceSha,s.path)!=='100644:'+s.published||
    obj(developmentSourceSha,s.path)!=='100644:'+s.development||
    obj(s.sourceMerge,s.path)!=='100644:'+s.development||
    obj(s.sourceMerge+'^',s.path)!=='100644:'+s.mergeParent)
  throw Error('Unready Admin test/source exact owner or Git blob changed');
 for(const item of selectedReadyItems){
  if(!SHA.test(item.merged_source_sha||'')||
     obj(item.merged_source_sha,s.path)!==obj(item.merged_source_sha+'^',s.path))
   throw Error('Selected READY merge modified excluded Admin tests: '+item.id);
 }
 return [s.path];
}


 // Exact previous PR #3675 source-only test isolation proof: the selected
 // startup merge restored two COMPLETE published tests before reintroducing
 // separately unfinished Log Shot work into development. Preserve all checks.
export const REVIEWED_STARTUP_MIXED_TESTS=Object.freeze({
 id:'DIC-Q-455-startup-recovery-deferred-worker',
 merge:'ffbf4656de2969326988d7b0ac0a21c3117575a6',
 runtime:'site/cloud/main.js',
 cleanRuntime:'fe9124fa1deeb84d7a41659c066f517f6311039e',
 tests:Object.freeze([
  Object.freeze({path:'tests/cloud-draft-recommendation-context.test.mjs',
   published:'a2218f85796f67d298b0ef5d06a980eaa92860ed',
   unready:'256646aa00684386e2af1efdc3b5d036c7d5fca3'}),
  Object.freeze({path:'tests/issue455-local-success-physical-bounds.test.mjs',
   published:'132486d9435888f9ddbb84a4e8bae8d9d6509abb',
   unready:'c7357cd031bab6b8bb9ae031a5aa1e477c651f6d'}),
  Object.freeze({path:'tests/ci-optimization.test.mjs',
   published:'91aadb1eccb64764253dc1344d6524ef42621fcc',unready:'4702f245499fde64922af965ceb23d73cf7a9a88'}),
  Object.freeze({path:'tests/issue2258-member-approval-notices.test.mjs',
   published:'179dc171aa7ab11b182b8832c3fd3f733dbc6824',unready:'48ac09eaf2a000200b444cc9104ffba50893e246'}),
  Object.freeze({path:'tests/sql-runner-coverage.test.mjs',
   published:'587d36c5931b1c14220914bd32460af5690984e9',unready:'9550fd21ff0edc93adbeed716e657a504a41d2e9'}),
  Object.freeze({path:'scripts/audit/issue33-original603-focused-source-review.mjs',
   published:'49b50fa3c1a1a07e61943ad98bbb2cc31c119fac',
   unready:'74d78a80b72305d67a9d346e60fc5fe977de2031'})
 ])
});
export function discoverReviewedRestoredStartupTests({queue,pinnedReadyPaths=[],
 publishedSourceSha,developmentSourceSha,sourceObjectAt,selectedReadyItems=[]}={}){
 const s=REVIEWED_STARTUP_MIXED_TESTS;
 const selected=selectedReadyItems.find(i=>i.id===s.id);
 if(!selected)return [];
 if(typeof sourceObjectAt!=='function'||
    queue?.items?.find(i=>i.id===s.id)?.state!=='READY'||selected.issue!==455||
    selected.merged_source_sha!==s.merge||!selected.scope_paths?.includes(s.runtime)||
    !pinnedReadyPaths.includes(s.runtime)||!queue?.items?.some(i=>
      i.id!==s.id&&i.issue===455&&['TESTING','IN_PROGRESS'].includes(i.state)&&
      i.scope_paths?.includes(s.runtime)))
  throw Error('Startup test restoration lacks selected owner and mixed-file provenance');
 const obj=(ref,path)=>sourceObjectAt(ref,path);
 if(obj(s.merge,s.runtime)!=='100644:'+s.cleanRuntime||
    obj(developmentSourceSha,s.runtime)===obj(s.merge,s.runtime))
  throw Error('Startup clean runtime is not the reviewed pinned source blob');
 const restored=[];
 for(const spec of s.tests){
  const published=obj(publishedSourceSha,spec.path),current=obj(developmentSourceSha,spec.path);
  if(published===null&&current===null)continue;
  if(published!=='100644:'+spec.published||current!=='100644:'+spec.unready)
   throw Error('Startup test restoration unreviewed Git blob: '+spec.path);
  const merged=obj(s.merge,spec.path),firstParent=obj(s.merge+'^',spec.path);
  if(!((merged===published&&firstParent===current)||(merged===current&&firstParent===current)))
   throw Error('Startup test restoration first-parent drift: '+spec.path);
  for(const ready of selectedReadyItems.filter(i=>i.id!==s.id))
   if(!SHA.test(ready.merged_source_sha||'')||
      obj(ready.merged_source_sha,spec.path)!==obj(ready.merged_source_sha+'^',spec.path))
    throw Error('Another selected READY merge modified startup-coupled test: '+spec.path);
  restored.push(spec.path);
 }
 return restored.sort();
}

const REVIEWED_OWNER_DRIVE_TEST=Object.freeze({
 path:'tests/dic-owner-drive-connect.test.mjs',
 runtime:'netlify/functions/dic-owner-drive-connect.mjs',
 itemId:'DIC-Q-28-owner-drive-browser-oauth-20261115'
});
function eligibleOwnerDriveTestExclusion({queue,restoredPaths,publishedSourceSha,
 developmentSourceSha,sourceObjectAt}){
 const i=queue?.items?.find(row=>row.id===REVIEWED_OWNER_DRIVE_TEST.itemId);
 return i?.issue===28&&['IN_PROGRESS','TESTING','BLOCKED'].includes(i.state)&&
  i.scope_paths?.length===1&&i.scope_paths[0]===REVIEWED_OWNER_DRIVE_TEST.runtime&&
  restoredPaths?.includes(REVIEWED_OWNER_DRIVE_TEST.runtime)&&
  sourceObjectAt(publishedSourceSha,REVIEWED_OWNER_DRIVE_TEST.runtime)===null&&
  sourceObjectAt(developmentSourceSha,REVIEWED_OWNER_DRIVE_TEST.runtime)!==null&&
  sourceObjectAt(publishedSourceSha,REVIEWED_OWNER_DRIVE_TEST.path)===null&&
  sourceObjectAt(developmentSourceSha,REVIEWED_OWNER_DRIVE_TEST.path)!==null;
}
// Only new, issue-scoped tests for entirely restored unfinished/unselected
// runtime may be absent from a candidate. Selected READY test edits never vanish.

// #3347: newer #33 R324 fixture imports a symbol absent from the PINNED READY
// coffee parser. It is new/unpublished and owned by unready #33 work only.
export const REVIEWED_PINNED_COFFEE_TEST=Object.freeze({
 path:'tests/coffee-producer-team-disagreement.test.mjs',
 runtime:'src/server/coffee-page-metadata.mjs',
 merge:'c9b1bf2a1cecce9a67c84983eb1fd8d379f2d5f2',
 blob:'9a1263d7022311a5d313db64f1604e91504fce23'
});
function reviewedPinnedCoffeeTest(path,{queue,pinnedReadyPaths,restoredPaths=[],
 publishedSourceSha,developmentSourceSha,sourceObjectAt}){
 const s=REVIEWED_PINNED_COFFEE_TEST;
 if(path!==s.path||(!pinnedReadyPaths.includes(s.runtime)&&!restoredPaths.includes(s.runtime)))return false;
 const obj=(ref,p)=>sourceObjectAt(ref,p);
 if(!(queue?.items||[]).some(i=>i.issue===33&&
    ['IN_PROGRESS','TESTING','BLOCKED'].includes(i.state)&&
    i.scope_paths?.includes(s.runtime))||
    obj(publishedSourceSha,s.path)!==null||
    obj(developmentSourceSha,s.path)!=='100644:'+s.blob||
    obj(s.merge,s.path)!=='100644:'+s.blob||
    obj(s.merge+'^',s.path)!==null||
    obj(s.merge,s.runtime)===obj(s.merge+'^',s.runtime))
  throw Error('Unready pinned coffee test/source owner or Git blob changed');
 return true;
}
export function discoverExcludedUnreadyTests({queue,selectedIds,restoredPaths,pinnedReadyPaths=[],
 publishedSourceSha,developmentSourceSha,changedPaths,sourceObjectAt,compatibleAuditSupportPaths=[]}={}){
 if(typeof sourceObjectAt!=='function'||!Array.isArray(changedPaths)||
    !Array.isArray(restoredPaths)||!Array.isArray(selectedIds)||
    !SHA.test(publishedSourceSha||'')||!SHA.test(developmentSourceSha||''))
  throw Error('Unverifiable unfinished test exclusion inputs');
 const restored=new Set(restoredPaths), selected=new Set(selectedIds), result=[];
 const chosen=(queue?.items||[]).filter(i=>selected.has(i.id));
 for(const path of changedPaths){
  if(compatibleAuditSupportPaths.includes(path))continue;
  const m=typeof path==='string'?/^tests\/(?:coffee-)?issue([1-9][0-9]*)-[a-z0-9-]+\.test\.mjs$/.exec(path):null;
  const ownerDrive=path===REVIEWED_OWNER_DRIVE_TEST.path&&
   eligibleOwnerDriveTestExclusion({queue,restoredPaths,publishedSourceSha,
    developmentSourceSha,sourceObjectAt});
  const support=reviewedUnreadySupport(path,{queue,restoredPaths,pinnedReadyPaths,
   publishedSourceSha,developmentSourceSha,sourceObjectAt});
  const pinnedCoffee=reviewedPinnedCoffeeTest(path,{queue,pinnedReadyPaths,restoredPaths,
 publishedSourceSha,developmentSourceSha,sourceObjectAt});
  if(!m&&!ownerDrive&&!support&&!pinnedCoffee)continue;
  const issue=pinnedCoffee?33:ownerDrive?28:support?.issue??Number(m[1]);
  // A named support helper may have an unfinished owner spanning exact published
  // restoration and a separately pinned READY file. reviewedUnreadySupport
  // already proves every owning path and the absent required runtime.
  if(!support&&!pinnedCoffee&&!(queue?.items||[]).some(i=>i.issue===issue&&!selected.has(i.id)&&
    ['IN_PROGRESS','TESTING','BLOCKED','READY'].includes(i.state)&&
    i.scope_paths?.length>0&&i.scope_paths.every(x=>restored.has(x))))continue;
  if(sourceObjectAt(publishedSourceSha,path)!==null||
     sourceObjectAt(developmentSourceSha,path)===null)continue;
  let touched=false;
  for(const i of chosen){
   if(!SHA.test(i.merged_source_sha||''))throw Error('Invalid selected READY merge');
   const blob=sourceObjectAt(i.merged_source_sha,path);
   if(blob!==null&&blob!==sourceObjectAt(i.merged_source_sha+'^',path)){touched=true;break;}
  }
  if(!touched)result.push(path);
 }
 return sorted([...new Set(result)]);
}


const REVIEWED_UNREADY_SUPPORT=Object.freeze({
 'scripts/audit/issue33-selected-product-heading.mjs':{
   itemId:'DIC-Q-33-r215-original325-327-current-offer-h2-water-decaf',
   issue:33, requiredRuntime:'src/server/coffee-selected-offer-h2.mjs'
 },
 'supabase/tests/member_approval_finish_null_receipts.sql':{
   itemId:'DIC-Q-509-member-approval-null-receipt-guard',
   issue:509, requiredRuntime:'supabase/migrations/20261114195000_dic_member_approval_finish_null_receipts.sql'
 },
 'scripts/audit/issue33-shopify-pagefly-h3.mjs':{
  itemId:'DIC-Q-33-r374-original41-selected-pagefly-sugarcane-method',issue:33,
  requiredRuntime:'src/server/coffee-pagefly-selected-h3.mjs',
  sourceBlob:'825edd6c8ff2ff73ff65bebbee029924518eca82'
 },
 'supabase/tests/workspace_inactive_selection_guards.sql':{
  itemId:'DIC-Q-509-workspace-inactive-selection-guards',issue:509,
  requiredRuntime:'supabase/migrations/20261120044500_dic_workspace_inactive_selection_guards.sql',
  sourceBlob:'12bb65b7f4e1ea2c52a1b1704dcefa75cee931b7'
 },
 'scripts/audit/issue33-r374-original41-check.mjs':{
  itemId:'DIC-Q-33-r374-original41-selected-pagefly-sugarcane-method',issue:33,
  requiredRuntime:'src/server/coffee-pagefly-selected-h3.mjs',
  sourceBlob:'6b47cfa4736189d91df71ed6867f9455065ce4b3'
 },
 'supabase/tests/admin_account_delete_completed_receipt.sql':{
  itemId:'DIC-Q-509-admin-completed-delete-retry-count',issue:509,
  requiredRuntime:'supabase/migrations/20261119175000_dic_admin_delete_completed_retry_count.sql',
  sourceBlob:'5a9fc2b8d1c61d8b7c885d8bfec6f128160c35c2'
 },
 'supabase/tests/personal_family_refresh_single_pass_post.sql':{
  itemId:'DIC-Q-509-classify-family-single-refresh',issue:509,
  requiredRuntime:'supabase/migrations/20261119133000_dic_classify_family_refresh_single_pass.sql',
  sourceBlob:'a04c6e40693577caec79d2678d155786bcfd26da'
 }
});
function reviewedUnreadySupport(path,{queue,restoredPaths,pinnedReadyPaths=[],
 publishedSourceSha,developmentSourceSha,sourceObjectAt}={}){
 const spec=REVIEWED_UNREADY_SUPPORT[path];
 if(!spec||!Array.isArray(restoredPaths)||!Array.isArray(pinnedReadyPaths))return null;
 const owner=queue?.items?.find(i=>i.id===spec.itemId);
 if(spec.sourceBlob&&sourceObjectAt(developmentSourceSha,path)!=='100644:'+spec.sourceBlob)return null;
 if(owner?.issue!==spec.issue||!['IN_PROGRESS','TESTING','BLOCKED'].includes(owner.state)||
    !owner.scope_paths?.includes(spec.requiredRuntime)||
    !restoredPaths.includes(spec.requiredRuntime)||
    !owner.scope_paths.every(p=>restoredPaths.includes(p)||pinnedReadyPaths.includes(p))||
    (sourceObjectAt(publishedSourceSha,path)!==null&&
     !(path===REVIEWED_COMPATIBLE_AUDIT_SUPPORT.path&&
       sourceObjectAt(publishedSourceSha,path)==='100644:'+REVIEWED_COMPATIBLE_AUDIT_SUPPORT.historicalBlobSha))||
    sourceObjectAt(developmentSourceSha,path)===null||
    sourceObjectAt(publishedSourceSha,spec.requiredRuntime)!==null||
    sourceObjectAt(developmentSourceSha,spec.requiredRuntime)===null)return null;
 return spec;
}


export const REVIEWED_COMPATIBLE_AUDIT_SUPPORT=Object.freeze({
 path:'scripts/audit/issue33-selected-product-heading.mjs',
 historicalSourceSha:'3a361f2c187f7a77b317a321f82282c465dde6b2',
 historicalBlobSha:'7ce2de1fbf70261b006475ae43f1952c140228b6',
 unfinishedBlobSha:'96b1e529d0c7fb66339b34f78a25923c76556813'
});
// Replace ONLY the unready R215 audit helper with its previously reviewed,
// working immutable Git blob, rather than deleting 89 historical test imports.
// No runtime, SQL, READY test or GitHub workflow is replaced by this exception.
export function discoverCompatibleAuditSupport({queue,restoredPaths,pinnedReadyPaths=[],
 publishedSourceSha,developmentSourceSha,sourceObjectAt,selectedReadyItems=[]}={}){
 const spec=REVIEWED_COMPATIBLE_AUDIT_SUPPORT;
 if(typeof sourceObjectAt!=='function'||!Array.isArray(restoredPaths)||
    !Array.isArray(pinnedReadyPaths)||!Array.isArray(selectedReadyItems))return [];
 // The previous production commit already contains the helper. A newer
 // unfinished R215 mutation cannot replace it or erase its 88 existing tests.
 const published=sourceObjectAt(publishedSourceSha,spec.path);
 const current=sourceObjectAt(developmentSourceSha,spec.path);
 if(current==='100644:'+spec.unfinishedBlobSha&&
    published!=='100644:'+spec.historicalBlobSha)
   throw Error('Published historical audit helper bytes do not match reviewed source');
 if(published!=='100644:'+spec.historicalBlobSha||
    current!=='100644:'+spec.unfinishedBlobSha)return [];
 const owner=queue?.items?.find(i=>i.id==='DIC-Q-33-r215-original325-327-current-offer-h2-water-decaf');
 const runtime='src/server/coffee-selected-offer-h2.mjs';
 if(owner?.issue!==33||!['IN_PROGRESS','TESTING','BLOCKED'].includes(owner.state)||
    !owner.scope_paths?.includes(runtime)||!restoredPaths.includes(runtime)||
    !owner.scope_paths.every(p=>restoredPaths.includes(p)||pinnedReadyPaths.includes(p))||
    sourceObjectAt(publishedSourceSha,runtime)!==null||
    sourceObjectAt(developmentSourceSha,runtime)===null)return [];
 if(sourceObjectAt(spec.historicalSourceSha,spec.path)!=='100644:'+spec.historicalBlobSha)
   throw Error('Reviewed pre-R215 audit helper blob provenance unavailable');
 for(const item of selectedReadyItems){
   if(!SHA.test(item?.merged_source_sha||''))
     throw Error('Selected READY helper provenance unavailable');
   if(sourceObjectAt(item.merged_source_sha,spec.path)!==
      sourceObjectAt(item.merged_source_sha+'^',spec.path))
     throw Error('Selected READY merge changed published heading helper: '+item.id);
 }
 return [spec.path];
}
// Cheap, source-bound pre-CI static import existence check. The exact app
// build remains mandatory for exported symbol/type/dynamic import semantics.
export function assertCandidateRelativeImports(paths,{readSource,hasPath}={}){
 if(!Array.isArray(paths)||typeof readSource!=='function'||typeof hasPath!=='function')
  throw Error('Candidate relative-import evidence unavailable');
 for(const path of paths){
  if(!/^(?:site|src\/server|netlify\/functions)\/.*\.[cm]?js$/.test(path)||!hasPath(path))continue;
  const source=readSource(path);
  if(typeof source!=='string')throw Error('Cannot read candidate module: '+path);
  const imports=[...source.matchAll(/^\s*(?:import|export)\s+(?:[^;\n]*?\s+from\s+)?['"](\.{1,2}\/[^'"\n]+)['"]/gm)].map(m=>m[1]);
  for(const spec of imports){
   const target=posix.normalize(posix.join(posix.dirname(path),spec.split(/[?#]/)[0]));
   if(target.startsWith('../')||target.startsWith('/')||target==='')
    throw Error('Unsafe relative module path: '+path+' -> '+spec);
   const choices=posix.extname(target)?[target]:
    [target,target+'.js',target+'.mjs',target+'.cjs',target+'.json',target+'/index.js',target+'/index.mjs'];
   if(!choices.some(x=>hasPath(x)))
    throw Error('Unresolved static relative module import: '+path+' -> '+spec);
  }
 }
 return true;
}


// Conservative direct ESM export preflight before the ONE required candidate build.
// Star/barrel/CommonJS/dynamic semantics remain for that full build; no eval/network.
export function assertCandidateStaticNamedExports(paths,{readSource,hasPath}={}){
 if(!Array.isArray(paths)||typeof readSource!=='function'||typeof hasPath!=='function')
  throw Error('Candidate export evidence unavailable');
 const find=(from,spec)=>{
  const target=posix.normalize(posix.join(posix.dirname(from),spec.split(/[?#]/)[0]));
  if(target.startsWith('../')||target.startsWith('/')||!target)
   throw Error('Unsafe relative module path: '+from+' -> '+spec);
  const options=posix.extname(target)?[target]:
   [target,target+'.js',target+'.mjs',target+'.cjs',target+'.json',target+'/index.js'];
  const found=options.find(p=>hasPath(p));
  if(!found)throw Error('Unresolved static relative module import: '+from+' -> '+spec);
  return found;
 };
 for(const path of paths){
  if(!/^(?:site|src\/server|netlify\/functions)\/.*\.[cm]?js$/.test(path)||!hasPath(path))continue;
  const src=readSource(path);
  if(typeof src!=='string')throw Error('Cannot read candidate module: '+path);
  const named=/^\s*(?:import|export)\s+\{([^}]{1,600})\}\s*from\s*['"](\.{1,2}\/[^'"\n]+)['"]/gm;
  const defaultImport=/^\s*import\s+[A-Za-z_$][\w$]*\s+from\s+['"](\.{1,2}\/[^'"\n]+)['"]/gm;
  const uses=[
   ...[...src.matchAll(named)].map(m=>({spec:m[2],names:m[1].split(',').map(s=>s.trim().split(/\s+as\s+/)[0]).filter(Boolean)})),
   ...[...src.matchAll(defaultImport)].map(m=>({spec:m[1],names:['default']}))
  ];
  for(const use of uses){
   const target=find(path,use.spec);
   if(!target.endsWith('.js')&&!target.endsWith('.mjs'))continue;
   const targetCode=readSource(target);
   if(typeof targetCode!=='string')throw Error('Cannot read candidate module: '+target);
   // Known ambiguous exports are NOT guessed; full build must verify them.\n    // Generator declarations (function* and async function*) are direct named exports.
   if(/^\s*export\s*\*/m.test(targetCode)||/\bmodule\.exports\b|\bexports\./.test(targetCode)||
      /^\s*export\s+(?:const|let|var)\s*\{/m.test(targetCode))continue;
   const exports=new Set();
   if(/^\s*export\s+default\b/m.test(targetCode))exports.add('default');
   for(const m of targetCode.matchAll(/^\s*export\s+(?:async\s+)?(?:function\s*\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm))
    exports.add(m[1]);
   for(const m of targetCode.matchAll(/^\s*export\s*\{([^}]+)\}/gm))
    for(const entry of m[1].split(',')){
     const parts=entry.trim().split(/\s+as\s+/);
     if(parts[0])exports.add((parts[1]||parts[0]).trim());
    }
   for(const name of use.names)
    if(/^[A-Za-z_$][\w$]*$/.test(name)&&!exports.has(name))
     throw Error('Missing static relative module export: '+path+' imports '+name+' from '+use.spec);
  }
 }
 return true;
}

export function planReadyOnlyCandidate(queue,{publishedSourceSha,developmentSourceSha,
 selectedIds,developmentChangedPaths,pinnedReadyPaths=[],isAncestor,sourceObjectAt}={}){
 const errors=queueSchemaErrors(queue);
 if(!SHA.test(publishedSourceSha||'')||!SHA.test(developmentSourceSha||'')||
    typeof isAncestor!=='function')errors.push('Missing source anchors/ancestry');
 if(queue?.published_base?.tested_source_sha!==publishedSourceSha)
  errors.push('Queue baseline does not match last published tested source');
 if(!Array.isArray(selectedIds)||selectedIds.length===0||selectedIds.some(x=>!ITEM.test(x))||
    new Set(selectedIds).size!==selectedIds.length)
  errors.push('Nonempty unique READY item IDs required');
 const wanted=new Set(Array.isArray(selectedIds)?selectedIds:[]);
 const selected=(queue?.items||[]).filter(i=>wanted.has(i.id));
 if(selected.length!==wanted.size)errors.push('Unknown selected READY item ID');
 if(selected.some(i=>i.state!=='READY'))errors.push('Selected item is not READY');
 if(typeof isAncestor==='function'&&SHA.test(publishedSourceSha||'')&&SHA.test(developmentSourceSha||'')){
  try{
   // Published production bytes may be an immutable READY-only candidate
   // created as a ONE-parent sibling of continued development (#3347).
   // Do not require that detached frozen source commit to be an ancestor:
   // verify its exact candidate manifest object, published release receipt,
   // and that its first parent is in current development ancestry instead.
   const direct=isAncestor(publishedSourceSha,developmentSourceSha)===true;
   if(!direct){
    const sourceReceipt=typeof sourceObjectAt==='function'?
     sourceObjectAt(publishedSourceSha,CANDIDATE_RECEIPT_PATH):null;
    const detached=/^100644:[a-f0-9]{40}$/.test(sourceReceipt||'')&&
     SHA.test(queue?.published_base?.release_sha||'')&&
     typeof queue?.published_base?.netlify_deploy_id==='string'&&
     queue.published_base.netlify_deploy_id.length>0&&
     isAncestor(publishedSourceSha+'^',developmentSourceSha)===true;
    if(!detached)errors.push('Published baseline lacks direct or frozen-candidate development provenance');
   }
  }catch{errors.push('Cannot verify published-to-development source provenance');}
 }
 for(const item of selected){
  try{
   if(!SHA.test(item.merged_source_sha||'')||
      // A selected READY merge may predate an isolated published candidate:
      // the candidate deliberately restored this item's code to older bytes.
      // Its current source must still descend from the READY merge, and the
      // actual deployable byte diff and exact READY blob are checked below.
      item.merged_source_sha===publishedSourceSha||
      isAncestor(item.merged_source_sha,developmentSourceSha)!==true)
    errors.push(item.id+' READY merge is absent from current development ancestry');
  }catch{errors.push(item.id+' READY ancestry unavailable');}
 }
 const changed=deployableChangedPaths(developmentChangedPaths||[]);
 if(!Array.isArray(pinnedReadyPaths)||pinnedReadyPaths.some(x=>typeof x!=='string')||
    new Set(pinnedReadyPaths).size!==pinnedReadyPaths.length)
   errors.push('Invalid or duplicate pinned READY overlap paths');
 const wantedPins=new Set(Array.isArray(pinnedReadyPaths)?pinnedReadyPaths:[]);
 const included=[],restored=[],pinned=[];
 for(const path of changed){
  const owners=(queue?.items||[]).filter(i=>i.scope_paths?.includes(path));
  const chosen=owners.filter(i=>wanted.has(i.id)&&i.state==='READY');
  const competing=owners.filter(i=>!wanted.has(i.id)&&i.state!=='DEPLOYED');
  const deployed=owners.filter(i=>i.state==='DEPLOYED');
  if(!owners.length||(!chosen.length&&!competing.length))
   errors.push('Untracked or DEPLOYED-only unpublished deployable source: '+path);
  else if(chosen.length&&competing.length){
   // An unmerged issue record can share READY ownership without containing
   // any different bytes. Skip its pin ONLY on exact unique READY frozen-blob
   // parity against current development; never rely on an unmerged label alone.
   const unmergedOnly=competing.every(i=>i.state!=='READY'&&!SHA.test(i.merged_source_sha||''));
   let noActualOverlap=false;
   if(unmergedOnly&&typeof sourceObjectAt==='function'){
    try{
     const tips=chosen.filter(tip=>chosen.every(owner=>owner===tip||
      isAncestor(owner.merged_source_sha,tip.merged_source_sha)===true));
     if(tips.length===1){
      const frozen=sourceObjectAt(tips[0].merged_source_sha,path);
      noActualOverlap=!!frozen&&frozen===sourceObjectAt(developmentSourceSha,path);
     }
    }catch{errors.push('Cannot verify exact READY owner source parity: '+path);}
   }
   if(noActualOverlap&&!wantedPins.has(path))included.push(path);
   else if(!wantedPins.has(path))
    errors.push('READY/unready or unselected overlap cannot be isolated: '+path);
   else{included.push(path);pinned.push(path);}
  }
  else if(chosen.length){
   if(deployed.some(i=>SHA.test(i.merged_source_sha||'')&&i.merged_source_sha!==publishedSourceSha)){
    // A historic DEPLOYED label can be inaccurate: fail closed if its merged
    // source is newer than baseline and present in the development lineage.
    try{if(deployed.some(i=>SHA.test(i.merged_source_sha||'')&&
      isAncestor(publishedSourceSha,i.merged_source_sha)===true&&
      i.merged_source_sha!==publishedSourceSha&&
      isAncestor(i.merged_source_sha,developmentSourceSha)===true))
       errors.push('New DEPLOYED-labelled source overlaps READY path: '+path);
    }catch{errors.push('Cannot verify DEPLOYED ancestry for '+path);}
   }
   included.push(path);
  }else restored.push(path);
 }
 for(const path of wantedPins)if(!pinned.includes(path))
  errors.push('Pinned READY path is not an actual READY/unready overlap: '+path);
 if(!included.length)errors.push('No selected READY deployable change to release');
 for(const item of selected)if(!item.scope_paths?.some(p=>included.includes(p)))
  errors.push(item.id+' does not deliver an isolated deployable change');
 return {ready:errors.length===0,errors,published_source_sha:publishedSourceSha,
  development_source_sha:developmentSourceSha,selected_ids:sorted(selectedIds||[]),
  included_paths:sorted(included),restored_paths:sorted(restored),
  original_changed_paths:changed,pinned_ready_paths:sorted(pinned),
  ready_items:selected.map(i=>({id:i.id,issue:i.issue,title:i.title,
   merged_source_sha:i.merged_source_sha,scope_paths:i.scope_paths})),
  other_items:(queue?.items||[]).filter(i=>i.state!=='READY'&&i.state!=='DEPLOYED')
   .map(i=>({id:i.id,state:i.state,merged_source_sha:i.merged_source_sha,blockers:i.blockers}))};
}
export function validateReadyOnlyCandidate(queue,{manifest,publishedSourceSha,developmentHead,
 candidateSha,actualParents,developmentChangedPaths,candidateChangedPaths,
 stagedCommitChangedPaths,developmentDriftPaths,queueContentMatches,liveQueue,sourceObjectAt,
 candidateBranch,isAncestor}={}){
 const reject=reason=>{throw Error('Isolated READY candidate HOLD: '+reason);};
 if(!manifest||manifest.schema_version!==1||manifest.kind!==CANDIDATE_KIND||
  !SHA.test(candidateSha||'')||!SHA.test(developmentHead||'')||
  manifest.published_source_sha!==publishedSourceSha||
  !SHA.test(manifest.development_source_sha||'')||
  typeof candidateBranch!=='string'||!/^\brelease-candidates\/[a-z0-9][a-z0-9-]{2,80}$/.test(candidateBranch)||
  manifest.candidate_branch!==candidateBranch)
  reject('Missing or mismatched immutable candidate source/ref identity');
 if(!Array.isArray(actualParents)||actualParents.length!==2||
  actualParents[0]!==candidateSha||actualParents[1]!==manifest.development_source_sha)
  reject('Candidate must be ONE direct nonmerge child of the verified development source');
 if(typeof isAncestor!=='function'||typeof sourceObjectAt!=='function')
  reject('Git ancestry or tree readback is unavailable');
 try{if(isAncestor(manifest.development_source_sha,developmentHead)!==true)
  reject('Candidate staging source no longer in development ancestry');}
 catch(e){reject('Cannot verify development ancestry: '+e.message);}
 // The staged candidate is an immutable, CI-tested source tree. Newer
 // development work may advance independently, but NEVER enter this tree.
 // Validate current READY inventory and each selected item, while allowing
 // solely tracked UNREADY runtime edits after the frozen staging anchor.
 if(queueContentMatches!==true)
  reject('Candidate queue differs from its immutable staging-source queue');
 if(liveQueue!==undefined){
  const liveErrors=queueSchemaErrors(liveQueue);
  if(liveErrors.length)reject('Latest development queue invalid: '+liveErrors.join('; ').slice(0,400));
  if(JSON.stringify(liveQueue.published_base)!==JSON.stringify(queue.published_base))
   reject('Published baseline changed since candidate staging');
  const liveReady=liveQueue.items.filter(i=>i.state==='READY');
  const selectedSet=new Set(manifest.selected_ready_item_ids);
  if(manifest.selected_ready_item_ids.some(id=>!liveReady.some(i=>i.id===id)))
   reject('Selected READY item is no longer READY on development');
  // New READY records after this owner-approved immutable candidate must NOT
  // be silently added to this one-use grant or source. They can coexist only
  // when their exact merge happened after this candidate staging anchor.
  for(const item of liveReady.filter(i=>!selectedSet.has(i.id))){
   // A separately unfinished item may be certified READY while this approved
   // candidate is tested. If its app bytes were already in the staging
   // ancestry, allow it ONLY when it was tracked as unready in the frozen
   // staging queue and EVERY scoped deployable file was restored to the
   // published Git object in this candidate. Never include an added READY
   // feature merely because its status changed after staging.
   const original=queue.items.find(i=>i.id===item.id);
   const previouslyUnready=original&&['IN_PROGRESS','TESTING','BLOCKED'].includes(original.state);
   // An independently READY item may already exist at staging but is NOT in
   // this owner's selected batch. Never require it to be published, and never
   // let its source in unless the ENTIRE scoped file set is restored to the
   // published blobs. Reject any mutation of its frozen READY receipt.
   const frozenUnselectedReady=original?.state==='READY'&&JSON.stringify(original)===JSON.stringify(item);
   const scoped=Array.isArray(item.scope_paths)?item.scope_paths:[];
   let fullyExcluded=false;
   if((previouslyUnready||frozenUnselectedReady)&&scoped.length>0&&equal(scoped,original.scope_paths||[])){
    try{
     fullyExcluded=scoped.every(path=>
      manifest.restored_to_published_paths?.includes(path)&&
      sourceObjectAt(candidateSha,path)===sourceObjectAt(publishedSourceSha,path)&&
      sourceObjectAt(manifest.development_source_sha,path)!==sourceObjectAt(publishedSourceSha,path));
    }catch(e){reject('Cannot verify newly READY excluded source blobs: '+e.message);}
   }
   if(fullyExcluded)continue;
   try{
    if(!SHA.test(item.merged_source_sha||'')||
       item.merged_source_sha===manifest.development_source_sha||
       isAncestor(manifest.development_source_sha,item.merged_source_sha)!==true||
       isAncestor(item.merged_source_sha,developmentHead)!==true)
     reject('Additional READY source not proven post-staging: '+item.id);
   }catch(e){reject('Cannot certify additional READY source chronology: '+e.message);}
  }
  for(const id of manifest.selected_ready_item_ids){
   const original=queue.items.find(i=>i.id===id);
   const current=liveQueue.items.find(i=>i.id===id);
   if(!original||!current||JSON.stringify(original)!==JSON.stringify(current))
    reject('Selected READY record changed since candidate staging: '+id);
  }
 }
 const runtimeDrift=deployableChangedPaths(developmentDriftPaths||[]);
 if(runtimeDrift.length){
  if(!liveQueue)reject('Development app code changed without verifiable current queue');
  for(const path of runtimeDrift){
   if(!liveQueue.items.some(i=>i.scope_paths?.includes(path)&&(
       ['IN_PROGRESS','TESTING','BLOCKED'].includes(i.state)||
       (i.state==='READY'&&!manifest.selected_ready_item_ids.includes(i.id)&&
        SHA.test(i.merged_source_sha||'')&&
        isAncestor(manifest.development_source_sha,i.merged_source_sha)===true))))
    reject('Newer development app changes lack an excluded post-staging owner: '+path);
  }
  // Every staged READY path is still checked below against its exact READY
  // merged blob; no late overlapping or other unready edit can be published.
 }
 const plan=planReadyOnlyCandidate(queue,{
  publishedSourceSha,developmentSourceSha:manifest.development_source_sha,
  selectedIds:manifest.selected_ready_item_ids,
  pinnedReadyPaths:manifest.pinned_to_ready_paths||[],developmentChangedPaths,isAncestor,sourceObjectAt});
 if(!plan.ready)reject(plan.errors.join('; '));
 if(!manifest.risk_classification||
    JSON.stringify(manifest.risk_classification)!==JSON.stringify(classifyReleaseRisk(plan.included_paths)))
  reject('candidate risk-tier/one-build receipt differs from actual selected source');
 if(!Array.isArray(manifest.restored_to_published_paths)||
    !equal(manifest.restored_to_published_paths,plan.restored_paths))
  reject('Restoration manifest differs from actual unready source inventory');
 if(!equal(deployableChangedPaths(candidateChangedPaths||[]),plan.included_paths))
  reject('Candidate app diff includes more or fewer than exact selected READY paths');
 if(!Array.isArray(manifest.pinned_to_ready_paths||[])||
    !equal(manifest.pinned_to_ready_paths||[],plan.pinned_ready_paths))
  reject('Pinned READY manifest differs from actual mixed-source paths');
 const workflowChanges=workflowChangedPaths(developmentChangedPaths||[]);
 const frozenWorkflows=manifest.restored_unpublished_workflow_paths||[];
 if(!Array.isArray(frozenWorkflows)||!equal(frozenWorkflows,workflowChanges))
  reject('Production candidate must restore every changed GitHub Actions workflow to exact published source');
 if(workflowChangedPaths(candidateChangedPaths||[]).length)
  reject('Production candidate must not modify/create GitHub Actions workflows');
 for(const path of frozenWorkflows)
  if(sourceObjectAt(candidateSha,path)!==sourceObjectAt(publishedSourceSha,path))
   reject('GitHub Actions workflow was not exactly restored to published bytes: '+path);
 const workflowOnlyTests=manifest.excluded_unpublished_workflow_test_paths||[];
 if(!Array.isArray(workflowOnlyTests)||new Set(workflowOnlyTests).size!==workflowOnlyTests.length||
   !equal(workflowOnlyTests,discoverReviewedWorkflowTestExclusions({
     publishedSourceSha,developmentSourceSha:manifest.development_source_sha,
     restoredWorkflows:frozenWorkflows,sourceObjectAt
   })))
  reject('Only one byte-pinned, reviewed workflow-only test can be excluded when its workflow was restored');
 for(const path of workflowOnlyTests){
  const spec=[REVIEWED_WORKFLOW_TEST,REVIEWED_CI_FAST_PR_TEST].find(x=>x.path===path);
  if(!spec||sourceObjectAt(candidateSha,path)!==null||
     sourceObjectAt(manifest.development_source_sha,path)!=='100644:'+spec.sourceBlob||
     sourceObjectAt(publishedSourceSha,path)!==null)
   reject('Workflow-only test exclusion source/blob/absence mismatch: '+path);
  // Never exclude a test introduced or modified by ANY selected READY merge.
  // Merely inheriting this earlier development workflow test is not ownership.
  for(const item of plan.ready_items){
   let selectedBlob,parentBlob;
   try{
    selectedBlob=sourceObjectAt(item.merged_source_sha,path);
    if(selectedBlob!==null)parentBlob=sourceObjectAt(item.merged_source_sha+'^',path);
   }catch{reject('Selected READY workflow-only test provenance unavailable: '+path);}
   if(selectedBlob!==null&&selectedBlob!==parentBlob)
    reject('Selected READY merge introduced or modified a workflow-only test: '+path);
  }
 }
 const compatibleAuditSupport=manifest.restored_compatible_audit_support_paths||[];
 const expectedCompatibleAuditSupport=discoverCompatibleAuditSupport({
   queue,restoredPaths:plan.restored_paths,pinnedReadyPaths:plan.pinned_ready_paths,
   publishedSourceSha,developmentSourceSha:manifest.development_source_sha,sourceObjectAt,
   selectedReadyItems:plan.ready_items});
 if(!Array.isArray(compatibleAuditSupport)||!equal(compatibleAuditSupport,expectedCompatibleAuditSupport))
   reject('Audited historical coffee support helper manifest differs from exact reviewed provenance');
 for(const path of compatibleAuditSupport)
   if(path!==REVIEWED_COMPATIBLE_AUDIT_SUPPORT.path||
      sourceObjectAt(candidateSha,path)!=='100644:'+REVIEWED_COMPATIBLE_AUDIT_SUPPORT.historicalBlobSha)
     reject('Historical audit helper was not restored to exact independent reviewed bytes');
 const restoredTests=manifest.restored_to_published_unready_test_paths||[];
 const sqlTests=discoverReviewedRestoredSqlTests({queue,
  restoredPaths:plan.restored_paths,publishedSourceSha,
  developmentSourceSha:manifest.development_source_sha,sourceObjectAt,
  selectedReadyItems:plan.ready_items});
 const coffeeTests=discoverReviewedRestoredR232CoffeeTests({queue,
  restoredPaths:plan.restored_paths,publishedSourceSha,
  developmentSourceSha:manifest.development_source_sha,sourceObjectAt,
  selectedReadyItems:plan.ready_items});
 const adminTests=discoverReviewedRestoredUnreadyAdminTests({queue,
  restoredPaths:plan.restored_paths,publishedSourceSha,
  developmentSourceSha:manifest.development_source_sha,sourceObjectAt,
  selectedReadyItems:plan.ready_items});
 const startupTests=discoverReviewedRestoredStartupTests({queue,
  pinnedReadyPaths:plan.pinned_ready_paths,publishedSourceSha,
  developmentSourceSha:manifest.development_source_sha,sourceObjectAt,
  selectedReadyItems:plan.ready_items});
 const approvedTests=[...sqlTests,...coffeeTests,...adminTests,...startupTests].sort();
 if(!Array.isArray(restoredTests)||!equal(restoredTests,approvedTests))
  reject('Restored existing unfinished tests differ from exact reviewed source/ownership');
 for(const path of restoredTests){
  if(!approvedTests.includes(path)||
     sourceObjectAt(candidateSha,path)!==sourceObjectAt(publishedSourceSha,path))
   reject('Original complete regression suite not restored to exact published Git object: '+path);
 }
 const excludedTests=manifest.excluded_unready_test_paths||[];
 if(excludedTests.some(path=>compatibleAuditSupport.includes(path)))
   reject('A reviewed compatible helper cannot be simultaneously excluded');
 if(!Array.isArray(excludedTests)||new Set(excludedTests).size!==excludedTests.length)
  reject('Invalid or duplicate excluded unfinished test paths');
 for(const path of excludedTests){
  const m=typeof path==='string'?/^tests\/(?:coffee-)?issue([1-9][0-9]*)-[a-z0-9-]+\.test\.mjs$/.exec(path):null;
  const ownerDrive=path===REVIEWED_OWNER_DRIVE_TEST.path&&
   eligibleOwnerDriveTestExclusion({queue,restoredPaths:plan.restored_paths,
    publishedSourceSha,developmentSourceSha:manifest.development_source_sha,sourceObjectAt})&&
   sourceObjectAt(candidateSha,REVIEWED_OWNER_DRIVE_TEST.runtime)===null;
  const support=reviewedUnreadySupport(path,{queue,restoredPaths:plan.restored_paths,
   pinnedReadyPaths:plan.pinned_ready_paths,publishedSourceSha,
   developmentSourceSha:manifest.development_source_sha,sourceObjectAt});
  const eligibleSupport=Boolean(support)&&sourceObjectAt(candidateSha,path)===null;
  const pinnedCoffee=reviewedPinnedCoffeeTest(path,{queue,pinnedReadyPaths:plan.pinned_ready_paths,
 restoredPaths:plan.restored_paths,publishedSourceSha,developmentSourceSha:manifest.development_source_sha,sourceObjectAt});
  if(!m&&!ownerDrive&&!eligibleSupport&&!pinnedCoffee)
   reject('Only proven issue-scoped, pinned coffee, owner Drive, or exact unready support tests can be excluded');
  const issue=pinnedCoffee?33:ownerDrive?28:eligibleSupport?support.issue:Number(m[1]);
  const unfinishedMixed=queue.items.some(i=>i.issue===issue&&
   ['IN_PROGRESS','TESTING','BLOCKED'].includes(i.state)&&
   i.scope_paths?.some(p=>plan.pinned_ready_paths.includes(p)));
  // A separately verified READY item NOT selected for this owner release
  // may carry NEW tests of code deliberately restored to published bytes.
  // Exclude ONLY its original CI-tested test blob, never a selected test or
  // a changed/unattributed test. Require every owned runtime file restored.
  const frozenOtherReady=queue.items.some(i=>i.issue===issue&&i.state==='READY'&&
   !manifest.selected_ready_item_ids.includes(i.id)&&
   i.scope_paths?.length>0&&i.scope_paths.every(p=>plan.restored_paths.includes(p))&&
   liveQueue?.items.some(now=>now.id===i.id&&JSON.stringify(now)===JSON.stringify(i))&&
   SHA.test(i.merged_source_sha||'')&&
   sourceObjectAt(i.merged_source_sha,path)!==null&&
   sourceObjectAt(i.merged_source_sha,path)===sourceObjectAt(manifest.development_source_sha,path));
  const unfinishedRestored=queue.items.some(i=>i.issue===issue&&
   ['IN_PROGRESS','TESTING','BLOCKED'].includes(i.state)&&
   i.scope_paths?.length>0&&i.scope_paths.every(x=>plan.restored_paths.includes(x)));
  if(!unfinishedMixed&&!unfinishedRestored&&!frozenOtherReady)
   reject('Excluded test does not belong to a frozen unselected READY or unfinished mixed-source item, nor wholly restored unfinished source');
  if(sourceObjectAt(publishedSourceSha,path)!==null||
     sourceObjectAt(manifest.development_source_sha,path)===null||
     sourceObjectAt(candidateSha,path)!==null)
   reject('Excluded test must be newly introduced and absent from isolated candidate');
  // Later, independently READY commits inherit older unfinished issue tests
  // in their Git trees. Mere historical presence does not make an inherited
  // test part of the selected READY change. Prove its exact blob was UNCHANGED
  // relative to each READY merge's real first parent before permitting omission.
  // A test introduced/modified by any selected READY commit is never excluded.
  for(const item of plan.ready_items){
   let selectedBlob,parentBlob;
   try{
    selectedBlob=sourceObjectAt(item.merged_source_sha,path);
    if(selectedBlob!==null)
     parentBlob=sourceObjectAt(item.merged_source_sha+'^',path);
   }catch{
    reject('Cannot independently verify selected READY test provenance: '+path);
   }
   if(selectedBlob!==null&&selectedBlob!==parentBlob)
    reject('Cannot exclude a test introduced or modified by an approved READY merge: '+path);
  }
 }
 // Preserve every provenance check above; count a doubly qualified path once.
 assertExactCandidateStagedPaths(stagedCommitChangedPaths||[],
  plan.restored_paths,plan.pinned_ready_paths,compatibleAuditSupport,restoredTests,
  excludedTests,workflowOnlyTests,frozenWorkflows,
  [CANDIDATE_RECEIPT_PATH,CANDIDATE_JOURNAL_PATH]);
 for(const path of plan.restored_paths)
  if(sourceObjectAt(candidateSha,path)!==sourceObjectAt(publishedSourceSha,path))
   reject('Unready file was not exactly restored to published bytes: '+path);
 for(const path of plan.included_paths){
  const candidateBlob=sourceObjectAt(candidateSha,path);
  const isPinned=plan.pinned_ready_paths.includes(path);
  if(isPinned){
   if(candidateBlob===sourceObjectAt(manifest.development_source_sha,path))
    reject('Pinned mixed-source READY file was not actually isolated: '+path);
  }else if(candidateBlob!==sourceObjectAt(manifest.development_source_sha,path))
   reject('Selected READY file was changed during isolation: '+path);
  // A later, UNTRACKED commit touching an already READY path must not be
  // laundered into the release merely because the same path has a READY owner.
  // Require the final blob to equal the exact Git blob from at least one
  // selected READY merged commit that owns this file.
  const readyOwners=plan.ready_items.filter(i=>i.scope_paths.includes(path));
  if(!readyOwners.some(i=>sourceObjectAt(i.merged_source_sha,path)===candidateBlob))
   reject('Selected file includes edits after its verified READY merge: '+path);
 }
 return {ready:true,errors:[],deployable_paths:plan.included_paths,
  ready_items:plan.ready_items,other_items:plan.other_items,
  excluded_paths:plan.restored_paths,pinned_ready_paths:plan.pinned_ready_paths,restored_compatible_audit_support_paths:compatibleAuditSupport,restored_to_published_unready_test_paths:restoredTests,excluded_unready_test_paths:excludedTests,excluded_unpublished_workflow_test_paths:workflowOnlyTests,
  development_source_sha:manifest.development_source_sha,
  candidate_source_sha:candidateSha};
}
