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

// General prospective cohort QA: independently reconstruct the exact immutable
// parent-to-candidate queue and selected first-parent source/test objects.
// This verifies test applicability only; never certifies READY or publication.
const QUEUE_PATH='docs/RELEASE_QUEUE.json';
const CERT_PATH='docs/READY_BATCH_CERTIFICATION.json';
const hex64=/^[a-f0-9]{64}$/;
const sortedUnique=xs=>[...new Set(xs)].sort();
const sourcePath=p=>/^(?:site\/|src\/server\/|netlify\/functions\/|supabase\/migrations\/|supabase\/functions\/)/.test(p)||
 ['build_cloud.mjs','netlify.toml','supabase/config.toml','package.json','package-lock.json',
  'scripts/netlify/should-ignore-build.mjs','scripts/audit/approval-coverage.mjs',
  'scripts/release/one-use-claim.mjs','scripts/pwa/service-worker.template.txt',
  'scripts/pwa/member-approval-worker.template.txt'].includes(p);
const safePath=p=>typeof p==='string'&&/^[A-Za-z0-9_.\/-]+$/.test(p)&&!p.startsWith('/')&&!p.includes('..');
const fileObject=/^100(?:644|755):[a-f0-9]{40}$/;
const sameJSON=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function blobOfText(raw){
 assert.equal(typeof raw,'string');
 const bytes=Buffer.from(raw,'utf8');
 return '100644:'+createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
}
function exactGitJSON(ref,path,readGitText,sourceObjectAt){
 const raw=readGitText(ref,path);
 assert.equal(sourceObjectAt(ref,path),blobOfText(raw),'independent Git JSON blob mismatch '+path);
 return {raw,value:JSON.parse(raw)};
}
// Independent QA verification: reconstruct selected first-parent patches from
// actual Git objects. No main receipt/manifest-provided patch or blob accepted.
function replayQaExactTextPatch({before,after,selected,patch,path,beforeObject,afterObject}){
 const fail=why=>{throw Error('selected-only replay '+path+': '+why);};
 const lines=s=>{
  if(typeof s!=='string'||!s.endsWith('\n')||/[\r\u0000\ufffd]/.test(s))fail('not exact LF text');
  return s.slice(0,-1).split('\n');
 };
 const old=lines(before),wanted=lines(after),current=lines(selected),diff=lines(patch);
 if(!/^100(?:644|755):[a-f0-9]{40}$/.test(beforeObject||'')||
    !/^100(?:644|755):[a-f0-9]{40}$/.test(afterObject||'')||
    beforeObject.slice(0,6)!==afterObject.slice(0,6))fail('unsafe or changed mode');
 if(diff[0]!=='diff --git a/'+path+' b/'+path||
    diff[1]!=='index '+beforeObject.slice(7)+'..'+afterObject.slice(7)+' '+beforeObject.slice(0,6)||
    diff[2]!=='--- a/'+path||diff[3]!=='+++ b/'+path)fail('unbound or unsupported patch header');
 const historical=old.slice();
 let i=4,offset=0,oldEnd=0,selectedEnd=0,count=0;
 const matches=(hay,pos,needle)=>pos>=0&&pos+needle.length<=hay.length&&needle.every((x,j)=>hay[pos+j]===x);
 while(i<diff.length){
  const h=/^@@ -([0-9]+)(?:,([0-9]+))? \+([0-9]+)(?:,([0-9]+))? @@(?: .*)?$/.exec(diff[i++]);
  if(!h)fail('malformed or unsupported hunk header');
  const start=Number(h[1])-1,oldCount=Number(h[2]??1),newStart=Number(h[3])-1,newCount=Number(h[4]??1);
  if(![start,oldCount,newStart,newCount].every(Number.isSafeInteger)||
     start<oldEnd||oldCount<1||newCount<1||newStart!==start+offset)fail('invalid or overlapping hunk positions');
  const a=[],b=[];let context=0,changes=0;
  while(i<diff.length&&!diff[i].startsWith('@@ ')){
   const line=diff[i++],type=line[0],value=line.slice(1);
   if(type===' '){a.push(value);b.push(value);context++;}
   else if(type==='-'){a.push(value);changes++;}
   else if(type==='+'){b.push(value);changes++;}
   else fail('unsupported or truncated hunk');
  }
  if(a.length!==oldCount||b.length!==newCount||!context||!changes||
     !matches(old,start,a)||!matches(historical,start+offset,a))fail('historical preimage or hunk counts mismatch');
  historical.splice(start+offset,a.length,...b);
  offset+=b.length-a.length;oldEnd=start+a.length;
  let pos=-1;
  for(let j=0;j<=current.length-a.length;j++)if(matches(current,j,a)){
   if(pos!==-1)fail('ambiguous selected full context');pos=j;
  }
  if(pos<selectedEnd||pos<0)fail('missing or out-of-order selected full context');
  current.splice(pos,a.length,...b);selectedEnd=pos+b.length;count++;
 }
 if(!count||historical.length!==wanted.length||!matches(historical,0,wanted))fail('historical postimage mismatch');
 return current.join('\n')+'\n';
}

export function verifySelectedOnlyQaReplay({path,merges,publishedRef,liveRef,readGitText,sourceObjectAt,firstParentPatch}){
 assert.ok(safePath(path)&&Array.isArray(merges)&&merges.length&&new Set(merges).size===merges.length);
 assert.ok(merges.every(sha=>SHA.test(sha))&&SHA.test(publishedRef)&&SHA.test(liveRef));
 assert.equal(typeof firstParentPatch,'function','missing independent first-parent patch reader');
 const exact=(ref,object)=>{
  assert.ok(fileObject.test(object||''),'missing independent regular Git object '+path);
  const value=readGitText(ref,path);
  assert.equal(blobOfText(value).slice(7),object.slice(7),'independent Git text blob mismatch '+path);
  return value;
 };
 const published=sourceObjectAt(publishedRef,path),live=sourceObjectAt(liveRef,path);
 let selected=exact(publishedRef,published);
 for(const merge of merges){
  const before=sourceObjectAt(merge+'^',path),after=sourceObjectAt(merge,path);
  assert.equal(before?.slice(0,6),published.slice(0,6),'selected QA replay mode mismatch: '+path+' at '+merge);
  assert.equal(after?.slice(0,6),published.slice(0,6),'selected QA replay mode mismatch: '+path+' at '+merge);
  selected=replayQaExactTextPatch({path,selected,before:exact(merge+'^',before),after:exact(merge,after),
   patch:firstParentPatch(merge,path),beforeObject:before,afterObject:after});
 }
 assert.equal(live?.slice(0,6),published.slice(0,6));
 assert.equal(selected,exact(liveRef,live),'selected-only QA replay differs from live bytes '+path);
 return true;
}

// The original merge retains its full ownership. These independently reviewed
// direct-child corrections extend only its existing paths, never another row.
const REVIEWED_AMENDMENTS=[
 {id:'DIC-Q-455-r411-nonpersonal-starting-yield-boundary',
  parent:'3945a7353dadf81e7702170dde58cb95241e5782',merge:'0e377d1037d22518e7f42bc3935cb1c2d76f000b',
  objects:{'site/lib/engine.js':'100644:bdec2d5c00783cc0394667cae112e9a0ad9f2c98',
   'tests/issue455-r411-nonpersonal-prior-yield-boundary.test.mjs':'100644:76ef54b0e6afa2ae48ffc194561e4f5e57f1d2fc'}},
 {id:'DIC-Q-509-pending-coffee-null-flags',
  parent:'af0537cc8313328269eca4f92a5e4439bf84848b',merge:'19b06f1a890ac26c9f8b9f13ce6c3a4634c85615',
  objects:{'supabase/tests/pending_coffee_null_guards.sql':'100644:be4ea6842ab2dd8c4eaf364c68f98613eb6424b0'}},
 {id:'DIC-Q-509-recommendation-context-null-control-guard',
  parent:'7607c69f62f65979079fd02a0d25f4b7653a2303',merge:'0cd5054c6684a63062daf794e33ea265daf5ce66',
  objects:{'supabase/tests/recommendation_context_null_controls.sql':'100644:61e496319939f59eb4b7843fdb93aa6b4c1e33fa'}}
];
export function reviewedSelectedQaAmendment({row,dev,initialPaths,readParents,isAncestor,firstParentChangedPaths,sourceObjectAt}){
 const entry=REVIEWED_AMENDMENTS.find(x=>x.id===row.id&&x.parent===row.merged_source_sha);
 if(!entry)return null;
 assert.equal(typeof readParents,'function');
 assert.deepEqual(readParents(entry.merge),[entry.parent],'selected amendment is not the exact sole direct child');
 assert.equal(isAncestor(entry.merge,dev),true);
 const paths=firstParentChangedPaths(entry.merge).filter(p=>!p.startsWith('docs/')).sort();
 assert.deepEqual(paths,Object.keys(entry.objects).sort());
 for(const path of paths){
  assert.ok(initialPaths.includes(path),'amendment cannot add unowned paths');
  assert.equal(sourceObjectAt(entry.merge,path),entry.objects[path]);
  assert.notEqual(sourceObjectAt(entry.parent,path),entry.objects[path]);
 }
 return {merge:entry.merge,paths};
}

// These exact published test blobs preserve the selected assertions under
// the #3781 admission guard. The guard must NOT skip a selected main.js.
// Require independent historical continuity and candidate/published parity.
const GUARD_COMMIT='e85780b670f9d89328fdf46ba035b9d81205bb18';
const GUARD_PARENT='c7bb311b92a64271fe22ed29a80deb62d77b8475';
const GUARD_OBJECTS={
 'tests/cloud-shot-rating-focus.test.mjs':['100644:590cf96c2f1e2bf216ba7f76fac2f21090fec5b6','100644:3a55870c51fb5c422f3f06e257bc54065491e894'],
 'tests/cloud-draft-recommendation-context.test.mjs':['100644:256646aa00684386e2af1efdc3b5d036c7d5fca3','100644:2f945becd412b964e43094c9951f28711fb9cc6a'],
 'tests/issue455-local-success-physical-bounds.test.mjs':['100644:c7357cd031bab6b8bb9ae031a5aa1e477c651f6d','100644:a1aae20cbf99e624752ad57f0375f6ee7c0a9e83']
};
export function reviewedPublishedSelectedGuard({path,merges,pub,dev,mainSelected,allRetained=false,priorCandidate,
 readParents,isAncestor,firstParentChangedPaths,sourceObjectAt}){
 const pair=GUARD_OBJECTS[path];
 if(!pair||!mainSelected||!merges.length||sourceObjectAt(merges.at(-1),path)!==pair[0])return false;
 assert.equal(typeof readParents,'function');
 assert.deepEqual(readParents(GUARD_COMMIT),[GUARD_PARENT]);
 assert.equal(isAncestor(GUARD_COMMIT,dev),true);
 assert.ok(firstParentChangedPaths(GUARD_COMMIT).includes(path));
 assert.equal(sourceObjectAt(GUARD_PARENT,path),pair[0]);
 assert.equal(sourceObjectAt(GUARD_COMMIT,path),pair[1]);
 let previous=sourceObjectAt(merges[0]+'^',path);
 for(const merge of merges){
  assert.equal(sourceObjectAt(merge+'^',path),previous,'selected shared test chronology is discontinuous');
  const next=sourceObjectAt(merge,path);
  assert.ok(fileObject.test(next||'')&&next!==previous);
  previous=next;
 }
 assert.equal(previous,pair[0]);
 assert.equal(sourceObjectAt(pub,path),pair[1]);
 assert.equal(sourceObjectAt('HEAD',path),pair[1]);
 if(allRetained)assert.equal(sourceObjectAt(priorCandidate,path),pair[1]);
 else assert.equal(sourceObjectAt(dev,path),pair[1]);
 return true;
}

// A reviewed direct-child amendment can already be published even though its
// dedicated selected fixture was first introduced after the historical parent.
// Bind the actual introduction, sole direct child and final published bytes;
// no assertion is excluded and no runtime/workflow path can use this rule.
export function reviewedAlreadyPublishedAmendedQa({path,merges,pub,dev,readParents,isAncestor,firstParentChangedPaths,sourceObjectAt}){
 if(!/^(?:tests|supabase\/tests)\//.test(path)||merges.length!==2)return false;
 const entry=REVIEWED_AMENDMENTS.find(x=>x.parent===merges[0]&&x.merge===merges[1]&&Object.hasOwn(x.objects,path));
 if(!entry||sourceObjectAt(entry.parent+'^',path)!==null)return false;
 const object=entry.objects[path];
 if(sourceObjectAt(pub,path)!==object)return false;
 assert.deepEqual(readParents(entry.merge),[entry.parent]);
 assert.equal(isAncestor(entry.merge,dev),true);
 assert.ok(firstParentChangedPaths(entry.parent).includes(path));
 assert.ok(firstParentChangedPaths(entry.merge).includes(path));
 const introduced=sourceObjectAt(entry.parent,path);
 assert.ok(fileObject.test(introduced||''));
 assert.equal(introduced.slice(0,6),object.slice(0,6));
 assert.notEqual(introduced,object);
 assert.equal(sourceObjectAt(entry.merge+'^',path),introduced);
 assert.equal(sourceObjectAt(entry.merge,path),object);
 assert.equal(sourceObjectAt(dev,path),object);
 assert.equal(sourceObjectAt('HEAD',path),object);
 return true;
}

// Shared SQL test orchestration is not deployable runtime. Only the two exact
// published support paths may co-own historical retained and new tests. Both
// candidate and prior certified candidate must preserve identical bytes.
export function reviewedPublishedSqlSupport({path,pub,dev,priorCandidate,hasRetained,sourceObjectAt}){
 if(!['scripts/audit/isolated-sql-regression.sh','tests/sql-runner-coverage.test.mjs'].includes(path))return false;
 const published=sourceObjectAt(pub,path);
 return fileObject.test(published||'')&&sourceObjectAt(dev,path)===published&&
  sourceObjectAt('HEAD',path)===published&&(!hasRetained||sourceObjectAt(priorCandidate,path)===published);
}

// #3889 independent QA proof for the two historical stale-family source
// merges. This verifier deliberately does not import or trust main planning,
// queue notes or a manifest-provided source inventory. Both actual migration
// introductions and the complete named fixture chain must be present.
// Published SQL support is retained byte-for-byte; no selected test is skipped.
const FAMILY_ID='DIC-Q-509-stale-family-statistics-reconcile';
const FAMILY_FIRST='a45bb63ffd8a3eee164828c3c81e63baa6a8f155';
const FAMILY_LAST='1def2c9d6573297c406192b413ffc3e7620ffe7a';
const FAMILY_PATHS=[
 'supabase/migrations/20261119120000_dic_reconcile_stale_personal_family_stats.sql',
 'supabase/migrations/20261119122000_dic_reconcile_all_personal_family_derived_stats.sql',
 'supabase/tests/family_statistics_historical_reconcile_pre.sql',
 'supabase/tests/family_statistics_historical_reconcile_post.sql',
 'supabase/tests/family_statistics_complete_reconcile_post.sql',
 'scripts/audit/isolated-sql-regression.sh','tests/sql-runner-coverage.test.mjs'
];
const FAMILY_PRE=[
 null,null,null,null,null,'ff048e4e1e68cfeb73b82c922148683813107ad9','ffafb78bdaf9751696d2b6b948857c79abd66b1a'];
const FAMILY_MID=[
 '8b66a860e6dba420c447d0c9de13d7e69e53879c',null,'2573be7360c184b33fa6f44609e18d7e25c60178','a64c72781017301d4b547842099f09c8a01e25d9',null,'32e169dda9f3a297656198b9a7e60a48322fdb86','6035e6e4af92722e279c5376ba3fd75ed174c41c'];
const FAMILY_POST=[
 '8b66a860e6dba420c447d0c9de13d7e69e53879c','26b06be50ebb0c823ec6a98a0015963925dcc6f0','730b789570f85ffb085bb74c0011408bb7f62c9f','a64c72781017301d4b547842099f09c8a01e25d9','7013829d296a2d6b1a9a450374285ab8738169f4','526ccf9a276acee21e4362cacf8a2fda69b8c8d2','587d36c5931b1c14220914bd32460af5690984e9'];
export function reviewedStaleFamilyQa({row,dev,pub,retained=false,priorCandidate=null,
 readParents,isAncestor,firstParentChangedPaths,sourceObjectAt}={}){
 if(row?.id!==FAMILY_ID)return null;
 assert.equal(row.issue,509);assert.equal(row.merged_source_sha,FAMILY_LAST);
 assert.deepEqual(sortedUnique(row.scope_paths),FAMILY_PATHS.slice(0,2));
 assert.equal(row.scope_paths.length,2);
 assert.equal(pub,PROSPECTIVE_PUBLISHED);assert.match(dev||'',SHA);
 for(const reader of [readParents,isAncestor,firstParentChangedPaths,sourceObjectAt])assert.equal(typeof reader,'function');
 assert.ok([44519926449,44519926537,44519926388,44519926461,44526403238,44526403147,44526403127,44526403259]
  .every(id=>row.ci_runs?.includes(id)),'missing dual historical source receipts');
 const p1=['5eca094cf069b820e9cbfd927f7dc6469e2e84fa','89fcc5a79855b0a44d77e787aca8b33dbf043688'];
 const p2=['1521edf9c6a81ce80253a217dcf08d5c0b0b5f83','0977a43e4a6eb15c8bb1e33de59ed44577f364c2'];
 assert.deepEqual(readParents(FAMILY_FIRST),p1);assert.deepEqual(readParents(FAMILY_LAST),p2);
 assert.equal(isAncestor(FAMILY_FIRST,p2[0]),true);
 assert.equal(isAncestor(FAMILY_LAST,dev),true);
 const object=sha=>sha===null?null:'100644:'+sha;
 const byPath=new Map();
 for(const [merge,parent,before,after] of [[FAMILY_FIRST,p1[0],FAMILY_PRE,FAMILY_MID],[FAMILY_LAST,p2[0],FAMILY_MID,FAMILY_POST]]){
  const expected=FAMILY_PATHS.filter((_,i)=>before[i]!==after[i]).sort();
  const changed=firstParentChangedPaths(merge);
  assert.ok(Array.isArray(changed)&&changed.every(safePath));
  assert.deepEqual(changed.filter(p=>!p.startsWith('docs/')).sort(),expected);
  for(const [i,path] of FAMILY_PATHS.entries()){
   assert.equal(sourceObjectAt(parent,path),object(before[i]),'historical family first-parent object mismatch '+path);
   assert.equal(sourceObjectAt(merge,path),object(after[i]),'historical family source object mismatch '+path);
   if(before[i]!==after[i])byPath.set(path,[...(byPath.get(path)||[]),merge]);
  }
 }
 const final=[...FAMILY_POST.slice(0,5),'76578af1b7a2a9acce39802e2db933a8af9d0d10','9550fd21ff0edc93adbeed716e657a504a41d2e9'];
 for(const [i,path] of FAMILY_PATHS.entries()){
  assert.equal(sourceObjectAt(pub,path),object(i<2?null:final[i]),'family published object mismatch '+path);
  assert.equal(sourceObjectAt(dev,path),object(final[i]),'family development object mismatch '+path);
  assert.equal(sourceObjectAt('HEAD',path),object(final[i]),'family candidate object mismatch '+path);
  if(retained){
   assert.match(priorCandidate||'',SHA);
   assert.equal(sourceObjectAt(priorCandidate,path),object(final[i]),'retained family frozen source drift '+path);
  }
 }
 // Return actual selected per-path owners, not a synthetic combined merge.
 // Dedicated fixtures have already been independently proved to exist at
 // exact final published/development/candidate bytes, and MUST run normally.
 return {byPath,publishedFixtures:FAMILY_PATHS.slice(2,5)};
}

// Independently reviewed #3667 operational source. The frozen candidate
// executes the published workflows and full applicable corpus. Its operational
// configuration assertions read only the exact already-tested source below.
// This grants no workflow publication and no exemption from candidate checks.
const CI_OPERATIONAL_REVIEW={
 "id": "DIC-Q-3667-ci-parallel-full-suite",
 "issue": 3667,
 "pr": 3668,
 "merge": "8e89dfe942422789bae59338364139b274143e63",
 "published": "2d22d448160d428a977f06482323646b92818fcf",
 "source": "c26cd02724be477eeb7f30b989f586716fff2c56",
 "qa_parent": "947237d17fe3f9d8ee2638c12f9633168e42176f",
 "original_runs": [
  44984227423,
  44984227361,
  44984227364,
  44984227371,
  44984227329,
  44984227409,
  44984483650,
  44984483653,
  44984483687,
  44984483657,
  44984692927,
  44984692870,
  44984692878,
  44984692941,
  44988286966,
  44988286960,
  44988286947,
  44988286941,
  44988489617,
  44988489650,
  44988489607,
  44988720734,
  44988720688,
  44988720740,
  44988720731
 ],
 "steps": [
  {
   "merge": "8e89dfe942422789bae59338364139b274143e63",
   "parents": [
    "c9d86f460580faf71ed27a1d5ec54568ef2e2321"
   ],
   "changed": [
    ".github/workflows/cloud-beta-ci.yml",
    ".github/workflows/cloud-regression.yml",
    "package.json",
    "scripts/audit/run-full-suite.mjs",
    "tests/ci-optimization.test.mjs"
   ],
   "runs": [
    44984692878,
    44984692927,
    44984692870
   ],
   "before": {
    ".github/workflows/cloud-beta-ci.yml": "100644:1c3bee839494e3e9ee2200203354f6e5763ec45d",
    ".github/workflows/cloud-regression.yml": "100644:b01d986be0183cf813e6f51569b7ccc6bf219d53",
    "package.json": "100644:ec7aa50fb9273e791f7fe54839f753097b16c150",
    "scripts/audit/run-full-suite.mjs": null,
    "tests/ci-optimization.test.mjs": "100644:91aadb1eccb64764253dc1344d6524ef42621fcc"
   },
   "after": {
    ".github/workflows/cloud-beta-ci.yml": "100644:db257c78188225d2711c99358a4c7da17d12123a",
    ".github/workflows/cloud-regression.yml": "100644:412a3fc516a30d3ee1ee7391d1a6e0cbdb6d04fa",
    "package.json": "100644:1d7cc5b935f0148b4076939fda01fa9d849b9cbc",
    "scripts/audit/run-full-suite.mjs": "100644:3f71a7c5f8fd982adc5bf705ef63bee8001e4190",
    "tests/ci-optimization.test.mjs": "100644:4702f245499fde64922af965ceb23d73cf7a9a88"
   }
  },
  {
   "merge": "cfd8bdd7b79b503d849f1a1824ad1ddd3e95c0b4",
   "parents": [
    "0828f884c963613a8435f34d187db6887f63a924"
   ],
   "changed": [
    ".github/workflows/approval-continuity.yml",
    ".github/workflows/cloud-beta-ci.yml",
    ".github/workflows/cloud-regression.yml",
    "scripts/audit/fast-pr-check.mjs",
    "scripts/audit/syntax-batch.mjs",
    "tests/fast-pr-check.test.mjs",
    "tests/site-integrity.test.mjs"
   ],
   "runs": [
    44987423405,
    44987423569,
    44987423409
   ],
   "before": {
    ".github/workflows/approval-continuity.yml": "100644:044552d982caf2f83fd866367b38393a51ee2247",
    ".github/workflows/cloud-beta-ci.yml": "100644:db257c78188225d2711c99358a4c7da17d12123a",
    ".github/workflows/cloud-regression.yml": "100644:412a3fc516a30d3ee1ee7391d1a6e0cbdb6d04fa",
    "scripts/audit/fast-pr-check.mjs": null,
    "scripts/audit/syntax-batch.mjs": null,
    "tests/fast-pr-check.test.mjs": null,
    "tests/site-integrity.test.mjs": "100644:daa0930810bf29bbc4c22307f00bb090b5a3e7b2"
   },
   "after": {
    ".github/workflows/approval-continuity.yml": "100644:050485ed0ec2649db15511540b50a92d4e19587d",
    ".github/workflows/cloud-beta-ci.yml": "100644:a1eb79b7689e3ecb17b0a5756714b673aa4372b3",
    ".github/workflows/cloud-regression.yml": "100644:1e0b47fbc32374be380b1aedfaf48cca6cbbd710",
    "scripts/audit/fast-pr-check.mjs": "100644:57a28c1f89d0b11a447c918575b198c1de8928bb",
    "scripts/audit/syntax-batch.mjs": "100644:12746c5c7db2cce68dd3e4300b48af8f52a522a7",
    "tests/fast-pr-check.test.mjs": "100644:d11a0f702d35032e3442bfc8ee8671216f3496f8",
    "tests/site-integrity.test.mjs": "100644:6ae50d3421e46abe481383272f2bac8bd8952985"
   }
  },
  {
   "merge": "426792b245dd6a43c1e528a2e4a9297cc0819601",
   "parents": [
    "ac0dae1004ef84316ca721f6a5f19720b516e20d"
   ],
   "changed": [
    ".github/workflows/isolated-sql-regression.yml",
    "tests/ci-optimization.test.mjs"
   ],
   "runs": [
    45012672134,
    45012672123,
    45012672118,
    45012672154
   ],
   "before": {
    ".github/workflows/isolated-sql-regression.yml": "100644:de10846d8fad93f907307a8fe3ac8114443583bb",
    "tests/ci-optimization.test.mjs": "100644:4d893323af0539947df1d29b4234b616107f0545"
   },
   "after": {
    ".github/workflows/isolated-sql-regression.yml": "100644:4c3921caf3526c02c9d6184f0c077711a6264486",
    "tests/ci-optimization.test.mjs": "100644:5dfa805be243ec0d7afe3e785ec0b274ba7c42be"
   }
  },
  {
   "merge": "76c5090bb4103b0039903f1dc9fb173ff9f93891",
   "parents": [
    "a6b4097800f4df2230110890c2c2af4245849442"
   ],
   "changed": [
    ".github/workflows/approval-continuity.yml",
    ".github/workflows/cloud-beta-ci.yml",
    ".github/workflows/cloud-regression.yml",
    "scripts/audit/run-full-suite.mjs",
    "tests/ci-optimization.test.mjs"
   ],
   "runs": [
    45017599961,
    45017599986,
    45017599948
   ],
   "before": {
    ".github/workflows/approval-continuity.yml": "100644:843c7280fc9dfb1491d19d5670327fc17677121b",
    ".github/workflows/cloud-beta-ci.yml": "100644:cd2f77bb0e5dc3e6fcb01493824852fa41ae0b99",
    ".github/workflows/cloud-regression.yml": "100644:c7aef17210e56e058ff778ba4fb4ffb1660a2d9c",
    "scripts/audit/run-full-suite.mjs": "100644:7f3d7c472070ad025508d04c417057ea324b0c8e",
    "tests/ci-optimization.test.mjs": "100644:5dfa805be243ec0d7afe3e785ec0b274ba7c42be"
   },
   "after": {
    ".github/workflows/approval-continuity.yml": "100644:ddeb77be7d4f35f9beb028f283d5f7a591c1d3a1",
    ".github/workflows/cloud-beta-ci.yml": "100644:f249e51c81805b565632e9d8fa06790a4bb37453",
    ".github/workflows/cloud-regression.yml": "100644:f336b9c6715d19924ea2896c2f5d2e5c2e60e6a6",
    "scripts/audit/run-full-suite.mjs": "100644:505aa636fb03a30058a98d19c5e3a57ea41ae950",
    "tests/ci-optimization.test.mjs": "100644:002f79dd2a9d225044d922c0d87aa889dac7a4d3"
   }
  },
  {
   "merge": "fbc3f49723ac16128236d2e61d8bfbcf8fc59ed2",
   "parents": [
    "4c3ef2d80bc42aae9cf040cd0e300752c99ff9bb"
   ],
   "changed": [
    ".github/workflows/approval-continuity.yml",
    ".github/workflows/cloud-regression.yml",
    "tests/ci-optimization.test.mjs"
   ],
   "runs": [
    45022987746,
    45022987844,
    45022987714
   ],
   "before": {
    ".github/workflows/approval-continuity.yml": "100644:ddeb77be7d4f35f9beb028f283d5f7a591c1d3a1",
    ".github/workflows/cloud-regression.yml": "100644:30ffa1a5e7a8073741fc705fa04c164845f61760",
    "tests/ci-optimization.test.mjs": "100644:f519ba59973729548b8353c075666b84343a7f56"
   },
   "after": {
    ".github/workflows/approval-continuity.yml": "100644:9f968f3a1d1355bd79d860cd3e5b8c7bf03e5bf5",
    ".github/workflows/cloud-regression.yml": "100644:68955cbb7b0d3b79a5aa40ccb50f3126ec802709",
    "tests/ci-optimization.test.mjs": "100644:53e368923dfc686a4424097f8b3aab3b4facff5e"
   }
  },
  {
   "merge": "c26cd02724be477eeb7f30b989f586716fff2c56",
   "parents": [
    "f3b38fbdae9bb0360833110f24ca5b3cd33890bb",
    "e380367f93990351df430f4306104e84aea64ff4"
   ],
   "changed": [
    "scripts/audit/run-full-suite.mjs",
    "tests/ci-optimization.test.mjs"
   ],
   "runs": [
    45149083785,
    45149083798,
    45149083776
   ],
   "before": {
    "scripts/audit/run-full-suite.mjs": "100644:4c76dc5721eec24b002bcd62055b116911ae6c4e",
    "tests/ci-optimization.test.mjs": "100644:21dc97fee802315487cb95e07678f02023989d21"
   },
   "after": {
    "scripts/audit/run-full-suite.mjs": "100644:0c49500a66ede0a2411d7f99e42ab3594b109091",
    "tests/ci-optimization.test.mjs": "100644:b3b8753dd089775ea645646291b9c19e5f8dedb2"
   }
  }
 ],
 "published_objects": {
  ".github/workflows/approval-continuity.yml": "100644:3a44b0c9dc92949bb864250ee774336031bff996",
  ".github/workflows/cloud-beta-ci.yml": "100644:1c3bee839494e3e9ee2200203354f6e5763ec45d",
  ".github/workflows/cloud-regression.yml": "100644:0d48fbffa8f1030f371c02640cf221f98e59f150",
  ".github/workflows/isolated-sql-regression.yml": "100644:de10846d8fad93f907307a8fe3ac8114443583bb",
  "package.json": "100644:ec7aa50fb9273e791f7fe54839f753097b16c150",
  "scripts/audit/fast-pr-check.mjs": "100644:57a28c1f89d0b11a447c918575b198c1de8928bb",
  "scripts/audit/run-full-suite.mjs": "100644:4c76dc5721eec24b002bcd62055b116911ae6c4e",
  "scripts/audit/syntax-batch.mjs": "100644:12746c5c7db2cce68dd3e4300b48af8f52a522a7",
  "tests/ci-optimization.test.mjs": "100644:21dc97fee802315487cb95e07678f02023989d21",
  "tests/fast-pr-check.test.mjs": null,
  "tests/site-integrity.test.mjs": "100644:6ae50d3421e46abe481383272f2bac8bd8952985"
 },
 "source_objects": {
  ".github/workflows/approval-continuity.yml": "100644:9f968f3a1d1355bd79d860cd3e5b8c7bf03e5bf5",
  ".github/workflows/cloud-beta-ci.yml": "100644:f249e51c81805b565632e9d8fa06790a4bb37453",
  ".github/workflows/cloud-regression.yml": "100644:68955cbb7b0d3b79a5aa40ccb50f3126ec802709",
  ".github/workflows/isolated-sql-regression.yml": "100644:4c3921caf3526c02c9d6184f0c077711a6264486",
  "package.json": "100644:1d7cc5b935f0148b4076939fda01fa9d849b9cbc",
  "scripts/audit/fast-pr-check.mjs": "100644:57a28c1f89d0b11a447c918575b198c1de8928bb",
  "scripts/audit/run-full-suite.mjs": "100644:0c49500a66ede0a2411d7f99e42ab3594b109091",
  "scripts/audit/syntax-batch.mjs": "100644:12746c5c7db2cce68dd3e4300b48af8f52a522a7",
  "tests/ci-optimization.test.mjs": "100644:b3b8753dd089775ea645646291b9c19e5f8dedb2",
  "tests/fast-pr-check.test.mjs": "100644:d11a0f702d35032e3442bfc8ee8671216f3496f8",
  "tests/site-integrity.test.mjs": "100644:6ae50d3421e46abe481383272f2bac8bd8952985"
 },
 "qa_objects": {
  "tests/ci-optimization.test.mjs": "100644:ec33271cadc9d07bfaaa417bc5eb161226f46bc7",
  "tests/fast-pr-check.test.mjs": "100644:755ab443255cddd5be9977e6e416e74a89c80bf2"
 }
};
const ciSame=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const ciExpectedRuns=()=>[...CI_OPERATIONAL_REVIEW.original_runs,
 ...[...new Set(CI_OPERATIONAL_REVIEW.steps.flatMap(s=>s.runs)
  .filter(id=>!CI_OPERATIONAL_REVIEW.original_runs.includes(id)))].sort()];
export function ciOptimizationQaFixture(){return structuredClone(CI_OPERATIONAL_REVIEW);}
export function reviewedCiOptimizationQa({row,dev,pub,retained=false,priorCandidate=null,
 readParents,isAncestor,firstParentChangedPaths,sourceObjectAt}={}){
 const r=CI_OPERATIONAL_REVIEW;
 if(row?.id!==r.id)return null;
 assert.equal(row.issue,3667,'CI optimization issue');assert.equal(row.pr,3668,'CI optimization PR');
 assert.equal(row.merged_source_sha,r.merge,'CI optimization original deployable source');
 assert.deepEqual(row.scope_paths,['package.json'],'CI optimization deployable scope');
 assert.equal(pub,r.published,'CI optimization published baseline');assert.match(dev||'',SHA);
 for(const fn of [readParents,isAncestor,firstParentChangedPaths,sourceObjectAt])assert.equal(typeof fn,'function');
 assert.ok(ciSame(row.ci_runs,r.original_runs)||ciSame(row.ci_runs,ciExpectedRuns()),'CI optimization exact historical receipts');
 assert.equal(isAncestor(r.source,r.qa_parent),true,'CI optimization source ancestry');
 assert.equal(isAncestor(r.qa_parent,dev),true,'CI optimization QA source ancestry');
 const byPath=new Map();
 for(const step of r.steps){
  assert.deepEqual(readParents(step.merge),step.parents,'CI optimization ordered source parents');
  assert.equal(isAncestor(step.merge,r.source),true,'CI optimization merge ancestry');
  const changed=firstParentChangedPaths(step.merge);
  assert.ok(Array.isArray(changed)&&changed.every(safePath),'CI optimization source inventory');
  assert.deepEqual(changed.filter(p=>!p.startsWith('docs/')&&p!=='AGENTS.md').sort(),step.changed,
   'CI optimization exact executable inventory');
  for(const path of step.changed){
   assert.equal(sourceObjectAt(step.parents[0],path),step.before[path],'CI optimization source parent object '+path);
   assert.equal(sourceObjectAt(step.merge,path),step.after[path],'CI optimization source object '+path);
   byPath.set(path,[...(byPath.get(path)||[]),step.merge]);
  }
 }
 let amendment=dev;
 const qaPaths=Object.keys(r.qa_objects);
 const seen=new Set();
 while(amendment!==r.qa_parent){
  assert.ok(!seen.has(amendment)&&seen.size<64,'CI optimization QA ancestry bounds');seen.add(amendment);
  const parents=readParents(amendment);
  assert.ok(Array.isArray(parents)&&parents.length>0&&parents.every(x=>SHA.test(x)),'CI optimization QA parent');
  if(qaPaths.some(path=>sourceObjectAt(parents[0],path)!==r.qa_objects[path])){
   assert.deepEqual(parents,[r.qa_parent],'CI optimization reviewed direct-child QA fix');
   const changed=firstParentChangedPaths(amendment);
   assert.ok(Array.isArray(changed)&&qaPaths.every(path=>changed.includes(path)), 'CI optimization QA path inventory');
   assert.ok(!changed.some(path=>/^(?:site\/|src\/server\/|netlify\/functions\/|supabase\/(?:functions|migrations)\/|package(?:-lock)?\.json$|build_cloud\.mjs$|netlify\.toml$)/.test(path)),
    'CI optimization QA fix must not introduce production source');
   for(const path of qaPaths){
    assert.equal(sourceObjectAt(parents[0],path),r.source_objects[path],'CI optimization original QA object');
    assert.equal(sourceObjectAt(amendment,path),r.qa_objects[path],'CI optimization amended QA object');
   }
   break;
  }
  amendment=parents[0];
 }
 assert.notEqual(amendment,r.qa_parent,'CI optimization QA amendment is missing');
 for(const [path,historical] of Object.entries(r.source_objects)){
  assert.equal(sourceObjectAt(r.source,path),historical,'CI optimization coherent historical source '+path);
  assert.equal(sourceObjectAt(r.qa_parent,path),historical,'CI optimization reviewed parent source '+path);
  assert.equal(sourceObjectAt(pub,path),r.published_objects[path],'CI optimization published source '+path);
  const actual=r.qa_objects[path]??historical;
  assert.equal(sourceObjectAt(dev,path),actual,'CI optimization development drift '+path);
  // Operational workflows remain unshipped. Every other selected executable
  // and both amended regressions must be the exact independently reviewed bytes.
  const expected=path.startsWith('.github/workflows/')?r.published_objects[path]:actual;
  assert.equal(sourceObjectAt('HEAD',path),expected,'CI optimization candidate source '+path);
  if(retained){assert.match(priorCandidate||'',SHA);assert.equal(sourceObjectAt(priorCandidate,path),expected,'CI optimization retained source '+path);}
 }
 return {byPath,publishedFixtures:[],operationalWorkflowPaths:Object.keys(r.source_objects).filter(p=>p.startsWith('.github/workflows/'))};
}
export function reviewedCiOptimizationQaReceiptQueue(queue,{added}={}){
 if(!added?.includes(CI_OPERATIONAL_REVIEW.id))return queue;
 const output=structuredClone(queue),row=output.items.find(x=>x.id===CI_OPERATIONAL_REVIEW.id);
 assert.equal(row?.state,'TESTING','CI optimization selected TESTING receipt row required');
 assert.deepEqual(row.ci_runs,CI_OPERATIONAL_REVIEW.original_runs,'CI optimization immutable original receipts');
 row.ci_runs=ciExpectedRuns();
 return output;
}
export function reviewedCiOperationalWorkflowText(path){
 const r=CI_OPERATIONAL_REVIEW;
 if(!Object.hasOwn(r.source_objects,path)||!path.startsWith('.github/workflows/'))return null;
 const m=prospectiveCandidate();
 if(!m||!m.selected_ready_item_ids?.includes(r.id))return null;
 assert.ok(generalSelectedPaths?.includes(path),'CI optimization operational source lacks complete independent proof');
 assert.equal(currentBlob(path),r.published_objects[path].split(':')[1],
  'CI optimization candidate workflow must remain publisher-compatible');
 assert.equal(gitBlob(r.source,path),r.source_objects[path].split(':')[1],
  'CI optimization reviewed operational workflow object changed');
 return gitText(r.source,path);
}

// #3889 independent receipt-only QA replay: never trust main's plan or a
// manifest-provided removal list. Exact frozen READY51 queue and previous
// certificate are independently bound. No source, test, blocker or state
// is changed here; the caller still performs every selected-source proof.
const RECEIPT_Q51='af0266a5cb9e56394bf976383adeda9b47653b38';
const RECEIPT_C51='7ad87165296f638d87638c1120527e30fdac82ba';
const RECEIPT_FAMILY='DIC-Q-509-stale-family-statistics-reconcile';
const RECEIPT_REMOVALS=[
  [
    "DIC-Q-509-admin-normalized-identity",
    [
      44405688303,
      44406406046,
      44406406174
    ]
  ],
  [
    "DIC-Q-509-source-path-case-guard-20261115",
    [
      43715405733
    ]
  ],
  [
    "DIC-Q-509-confirm-coffee-null-name",
    [
      44289071815,
      44289071927,
      44289525218,
      44290199558
    ]
  ],
  [
    "DIC-Q-33-r347-original299-directions-source",
    [
      44685623135,
      44686742250
    ]
  ],
  [
    "DIC-Q-509-admin-push-lazy-vault-poll",
    [
      44740390567,
      44741312173
    ]
  ],
  [
    "DIC-Q-455-r444-pending-shot-form-lock",
    [
      45029642249
    ]
  ]
];
export function reviewedHistoricalQaReceiptQueue({parent,added,previousCandidate,readGitText,sourceObjectAt}={}){
 if(!added?.includes(RECEIPT_FAMILY)||blobOfText(parent.raw)!=='100644:'+RECEIPT_Q51)return null;
 assert.equal(previousCandidate,RECEIPT_C51,'historical receipt correction requires exact READY51 certificate');
 assert.equal(parent.raw,JSON.stringify(parent.value,null,2)+'\n');
 const old=exactGitJSON(previousCandidate,QUEUE_PATH,readGitText,sourceObjectAt);
 assert.equal(old.raw,parent.raw,'historical queue differs from frozen READY51 bytes');
 const corrected=structuredClone(parent.value);
 for(const [id,remove] of RECEIPT_REMOVALS){
  const rows=corrected.items.filter(x=>x.id===id);
  assert.equal(rows.length,1);
  const row=rows[0];
  assert.equal(row.state,'READY');
  assert.equal(new Set(row.ci_runs).size,row.ci_runs.length);
  for(const run of remove)assert.ok(row.ci_runs.includes(run),'missing exact archived receipt '+run);
  row.ci_runs=row.ci_runs.filter(run=>!remove.includes(run));
  assert.ok(row.ci_runs.length,'retained successful refs required');
 }
 const rows=corrected.items.filter(x=>x.id===RECEIPT_FAMILY);
 assert.equal(rows.length,1);
 const family=rows[0];
 assert.equal(family.state,'TESTING');
 assert.equal(family.merged_source_sha,'1def2c9d6573297c406192b413ffc3e7620ffe7a');
 assert.deepEqual(family.ci_runs,[44526403238,44526403147,44526403127,44526403259]);
 family.ci_runs.unshift(44519926449,44519926537,44519926388,44519926461);
 return corrected;
}

// Independent exact replay of the four member source receipts. The full row
// is pinned to the immutable READY52 queue; no metadata other than ci_runs
// changes here, and no original run is removed or promoted from failure.
const memberReceiptOriginalRuns=[44602832336,44602832355,44602832163,44602832499,
 44602832351,44602832140,44602832041,44612256397,44612256441,44612256428];
const memberReceiptAddedRuns=[44612256444,44663957436,44663957447,44663957497];
const memberReceiptCanonical=x=>Array.isArray(x)?'['+x.map(memberReceiptCanonical).join(',')+']':x&&typeof x==='object'?
 '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+memberReceiptCanonical(x[k])).join(',')+'}':JSON.stringify(x);
export function reviewedMemberBrokerQaReceiptQueue(queue,{added,parent,dev,sourceObjectAt,manifestReceipt}={}){
 const id='DIC-Q-509-member-approval-gone-push-receipt';
 if(!added?.includes(id)){assert.equal(manifestReceipt,undefined,'unselected member receipt marker');return queue;}
 assert.equal(new Set(added).size,added.length);assert.match(dev||'',SHA);
 assert.equal(typeof sourceObjectAt,'function');
 assert.equal(sourceObjectAt('58d5902c39e7aad61fc5a8b0acc072c2be1df4ef',QUEUE_PATH),
  '100644:dac49db2e3478531fb34c5e022871d8fbc04dbf2','immutable member reference queue');
 assert.equal(typeof parent?.raw,'string');
 assert.equal(sourceObjectAt(dev,QUEUE_PATH),blobOfText(parent.raw),'member parent Git queue');
 assert.deepEqual(parent.value,JSON.parse(parent.raw));
 assert.deepEqual(parent.value.published_base,queue.published_base);
 assert.equal(queue.published_base?.tested_source_sha,PROSPECTIVE_PUBLISHED);
 const rows=queue.items.filter(x=>x.id===id),prior=parent.value.items.filter(x=>x.id===id);
 assert.equal(rows.length,1);assert.equal(prior.length,1);assert.deepEqual(rows[0],prior[0],'member parent row drift');
 const row=rows[0];assert.equal(row.state,'TESTING');
 const original=JSON.stringify(row.ci_runs)===JSON.stringify(memberReceiptOriginalRuns);
 assert.ok(original||JSON.stringify(row.ci_runs)===JSON.stringify([...memberReceiptOriginalRuns,...memberReceiptAddedRuns]),
  'exact original member receipts or fixed append required');
 const copy=structuredClone(row);copy.ci_runs=[...memberReceiptOriginalRuns];
 assert.equal(createHash('sha256').update(memberReceiptCanonical(copy)).digest('hex'),
  'ed15440c72aef6f8adc6f397aa9acfe6334085c61203fcd4a2b30a9d39bb2b60','immutable full member row');
 if(!original){assert.equal(manifestReceipt,undefined,'no repeated member receipt delta');return queue;}
 assert.deepEqual(manifestReceipt,{id,original_queue_source_sha:'58d5902c39e7aad61fc5a8b0acc072c2be1df4ef',
  original_queue_blob_sha:'dac49db2e3478531fb34c5e022871d8fbc04dbf2',
  original_row_sha256:'ed15440c72aef6f8adc6f397aa9acfe6334085c61203fcd4a2b30a9d39bb2b60',
  source_shas:['d2b99b7972512989a829a6406a201ad8d9ab264e','afd799a98475d253a896a45f2dacd432f9964c88'],
  added_successful_run_ids:[...memberReceiptAddedRuns]},'independent member receipt manifest');
 const output=structuredClone(queue);output.items.find(x=>x.id===id).ci_runs=[...memberReceiptOriginalRuns,...memberReceiptAddedRuns];
 return output;
}

// Independent #3889 member-broker source proof. It does not import main's
// planner or trust its source map. #3452 remains the original cohort item;
// #3472 is a separately named, owner-receipted component of the same frozen
// source. Both runtime fixes and all three regression assertions are selected.
export function reviewedMemberBrokerQa({row,dev,pub,retained=false,priorCandidate=null,
 readParents,isAncestor,firstParentChangedPaths,sourceObjectAt}={}){
 const id='DIC-Q-509-member-approval-gone-push-receipt';
 if(row?.id!==id)return null;
 const runtime='supabase/functions/dic-member-approval-broker/core.mjs';
 const regression='tests/issue2258-member-approval-notices.test.mjs';
 const paths=[runtime,regression];
 const first='d2b99b7972512989a829a6406a201ad8d9ab264e';
 const later='afd799a98475d253a896a45f2dacd432f9964c88';
 const parents=[['f9f42b0d13e89ebc78aa50f2c6e2823d5ada7ab2','26b3d74da619e9584ab644322df7365610b58fad'],
  ['0a08e269a919110a0beaaef253be1e9dfb38775d','044bdfcb693966ba91599245b9d18e323caecfd7']];
 const objects=[
  ['1bc82c0c0f7e90bb86dd7da895c18f9c4e015c5a','179dc171aa7ab11b182b8832c3fd3f733dbc6824'],
  ['113ffd9ac7bc45839a0566da8837edd22352adf2','9ebf20df39d311d8d743ee6eb8b7b443584ec712'],
  ['3834e530c379d60f0ff60ae22115cc552a4e5d8a','48ac09eaf2a000200b444cc9104ffba50893e246']
 ];
 const testChain=[
  ['e85780b670f9d89328fdf46ba035b9d81205bb18','c7bb311b92a64271fe22ed29a80deb62d77b8475',objects[2][1],'c2486b828c08365acd1aca8cd74242093be16c08'],
  ['4c42b2338f68d621325ffd6a34a78a485d48bf90','d9fc859d81a23e10ee2cd0e1a37013b93a4980e5','c2486b828c08365acd1aca8cd74242093be16c08','881f9d25ab46a54df14edb0584249a8118bbb6bf'],
  ['a9ecf011fe0cac741246234202145f0474533969','7aedd1cd0cc0aa734831b1cb9871ab48d9269a8a','881f9d25ab46a54df14edb0584249a8118bbb6bf','c9dfb612b200025a316c6e018e48e10e0d518a82']
 ];
 const ownerPath='docs/audits/issue509-r377-member-approval-vault-isolation-20261120.json';
 const ownerBlob='e8835d92fa2c5d1c73a21f69605d7660069e2bab';
 const originalRuns=[44612256441,44612256444,44612256428],componentRuns=[44663957436,44663957447,44663957497];
 const object=sha=>'100644:'+sha;
 assert.equal(row.issue,509);assert.equal(row.pr,3452);
 assert.equal(row.merged_source_sha,first);assert.deepEqual(row.scope_paths,[runtime]);
 assert.equal(row.production_deployed,false);assert.equal(pub,PROSPECTIVE_PUBLISHED);assert.match(dev||'',SHA);
 for(const reader of [readParents,isAncestor,firstParentChangedPaths,sourceObjectAt])assert.equal(typeof reader,'function');
 assert.ok([...originalRuns,...componentRuns].every(run=>row.ci_runs?.includes(run)),'both member source receipt sets required');
 assert.equal(isAncestor(first,parents[1][0]),true);
 assert.equal(isAncestor(later,testChain[0][1]),true);assert.equal(isAncestor(later,dev),true);
 for(const [i,merge] of [first,later].entries()){
  assert.deepEqual(readParents(merge),parents[i],'member exact ordered source parents');
  assert.deepEqual(firstParentChangedPaths(merge).filter(p=>!p.startsWith('docs/')).sort(),paths.slice().sort(),
   'member source contains undeclared runtime/test/workflow');
  for(const [j,path] of paths.entries()){
   assert.equal(sourceObjectAt(parents[i][0],path),object(objects[i][j]));
   assert.equal(sourceObjectAt(merge,path),object(objects[i+1][j]));
  }
 }
 for(const [i,[merge,parent,before,after]] of testChain.entries()){
  assert.deepEqual(readParents(merge),[parent]);assert.equal(isAncestor(merge,dev),true);
  if(i)assert.equal(isAncestor(testChain[i-1][0],parent),true);
  assert.ok(firstParentChangedPaths(merge).includes(regression));
  assert.equal(sourceObjectAt(parent,regression),object(before));
  assert.equal(sourceObjectAt(merge,regression),object(after));
  for(const ref of [parent,merge])assert.equal(sourceObjectAt(ref,runtime),object(objects[2][0]));
 }
 assert.equal(sourceObjectAt(pub,runtime),object(objects[0][0]));
 assert.equal(sourceObjectAt(pub,regression),object(testChain[0][3]));
 const finalObjects={[runtime]:object(objects[2][0]),[regression]:object(testChain.at(-1)[3])};
 for(const path of paths){
  assert.equal(sourceObjectAt(dev,path),finalObjects[path],'member live source/test drift');
  assert.equal(sourceObjectAt('HEAD',path),finalObjects[path],'member candidate source/test drift');
  if(retained)assert.equal(sourceObjectAt(priorCandidate,path),finalObjects[path],'retained member component drift');
 }
 for(const ref of [later,dev])assert.equal(sourceObjectAt(ref,ownerPath),object(ownerBlob),'member component owner receipt drift');
 return {byPath:new Map(paths.map(path=>[path,[first,later]])),verifiedFixtures:[regression],
  additional_source_components:[{kind:'DIC-APPROVED-NONBASELINE-SOURCE-COMPONENT-1',
   id:'DIC-Q-509-member-approval-vault-isolation',baseline_id:id,baseline_cohort_member:false,
   issue:509,pr:3472,merged_source_sha:later,scope_paths:[runtime],
   owner_receipt_path:ownerPath,owner_receipt_blob_sha:ownerBlob,ci_run_ids:componentRuns,
   publication_authorized:false,ready_certified:false}]};
}

export function verifyGeneralProspectiveBatchReadyTestScope({manifest:m,queue:q,branch,commitParent,
 readGitText,sourceObjectAt,firstParentChangedPaths,isAncestor,readParents,firstParentPatch}={}){
 const p=m?.prospective_ready_batch_preview;
 if(p===undefined)return false;
 assert.equal(m.schema_version,1);
 assert.equal(m.kind,'DIC-READY-ONLY-SOURCE-1');
 assert.equal(m.publication_authorized,false);
 assert.equal(m.prospective_ready_preview,undefined);
 assert.equal(p.status,'PROSPECTIVE_BATCH_PLAN_ONLY');
 assert.equal(p.publication_authorized,false);
 assert.equal(p.ready_certified,false);
 assert.equal(p.baseline_queue_blob,PROSPECTIVE_BASELINE);
 assert.match(p.identity_sha256||'',hex64);
 assert.match(m.candidate_branch||'',/^release-candidates\/prospectbatch3889-[a-f0-9]{20}$/);
 assert.match(m.development_source_sha||'',SHA);
 assert.equal(m.published_source_sha,PROSPECTIVE_PUBLISHED);
 assert.equal(commitParent,m.development_source_sha);
 if(branch)assert.ok(branch==='refs/heads/'+m.candidate_branch||/^refs\/pull\/[1-9][0-9]*\/merge$/.test(branch),
  'unexpected candidate ref');
 for(const read of [readGitText,sourceObjectAt,firstParentChangedPaths,isAncestor])
  assert.equal(typeof read,'function','independent Git readers required');
 const dev=m.development_source_sha,pub=m.published_source_sha;
 // A published frozen tree can be a sibling of development, not an ancestor.
 // Independently bind its actual sole parent and immutable manifest before
 // proving that parent's ancestry; never substitute a caller-supplied base.
 if(isAncestor(pub,dev)!==true){
  assert.equal(typeof readParents,'function','independent published parent reader required');
  const frozen=exactGitJSON(pub,'docs/RELEASE_CANDIDATE.json',readGitText,sourceObjectAt).value;
  assert.equal(frozen.schema_version,1);
  assert.equal(frozen.kind,'DIC-READY-ONLY-SOURCE-1');
  assert.equal(frozen.publication_authorized,false);
  assert.match(frozen.candidate_branch||'',/^release-candidates\/ready3347-[a-f0-9]{20}$/);
  assert.match(frozen.development_source_sha||'',SHA);
  assert.deepEqual(readParents(pub),[frozen.development_source_sha],'published frozen parent mismatch');
  assert.equal(isAncestor(frozen.development_source_sha,dev),true,'published frozen parent must be an ancestor');
 }
 const baseline=exactGitJSON(BATCH_BASELINE_DEV,QUEUE_PATH,readGitText,sourceObjectAt);
 assert.equal(blobOfText(baseline.raw),'100644:'+PROSPECTIVE_BASELINE);
 const parent=exactGitJSON(dev,QUEUE_PATH,readGitText,sourceObjectAt);
 const candidate=exactGitJSON('HEAD',QUEUE_PATH,readGitText,sourceObjectAt);
 assert.deepEqual(candidate.value,q);
 const cohort=baseline.value.items.filter(x=>x.state==='TESTING');
 assert.equal(cohort.length,63);
 assert.equal(new Set(cohort.map(x=>x.id)).size,63);
 for(const value of [baseline.value,parent.value,q]){
  assert.equal(value.published_base?.tested_source_sha,pub);
  assert.equal(new Set(value.items.map(x=>x.id)).size,value.items.length);
  assert.deepEqual(value.published_base,parent.value.published_base);
 }
 const baseRows=new Map(cohort.map(x=>[x.id,x]));
 const parentRows=new Map(parent.value.items.map(x=>[x.id,x]));
 assert.ok(cohort.every(x=>parentRows.has(x.id)),'baseline cohort incomplete');
 const added=p.added_ids,retained=p.retained_ready_ids;
 for(const ids of [added,retained,m.selected_ready_item_ids]){
  assert.ok(Array.isArray(ids));
  assert.deepEqual(ids,sortedUnique(ids));
  assert.ok(ids.every(id=>typeof id==='string'&&/^DIC-Q-[1-9][0-9]*-[a-z0-9-]+$/.test(id)));
 }
 assert.ok(added.length);
 assert.deepEqual(retained,parent.value.items.filter(x=>x.state==='READY').map(x=>x.id).sort());
 const selected=[...added,...retained];
 assert.equal(new Set(selected).size,selected.length);
 assert.deepEqual(m.selected_ready_item_ids,[...selected].sort());
 const receiptCert=retained.length?exactGitJSON(dev,CERT_PATH,readGitText,sourceObjectAt).value:null;
 const historical=reviewedHistoricalQaReceiptQueue({parent,added,previousCandidate:receiptCert?.candidate_sha,readGitText,sourceObjectAt})||structuredClone(parent.value);
 const memberReceipts=reviewedMemberBrokerQaReceiptQueue(historical,{added,parent,dev,sourceObjectAt,
  manifestReceipt:p.member_receipt_reconciliation});
 const receiptQueue=reviewedCiOptimizationQaReceiptQueue(memberReceipts,{added});
 const coffee=verifyReviewedCoffeeSelectedQa({addedIds:added,parentQueue:receiptQueue,manifest:m,
  readGitText,sourceObjectAt,firstParentChangedPaths,firstParentPatch,readParents,isAncestor});
 const expected=coffee?.queue||receiptQueue;
 for(const id of added){
  const row=expected.items.find(x=>x.id===id),original=baseRows.get(id);
  assert.ok(row&&original&&row.state==='TESTING');
  assert.equal(row.issue,original.issue);
  if(!coffee?.ids.includes(id))assert.deepEqual(row.scope_paths,original.scope_paths);
  row.state='READY';row.blockers=[];
 }
 assert.deepEqual(q,expected,'only exact selected TESTING-to-READY queue changes permitted');
 assert.equal(candidate.raw,JSON.stringify(expected,null,2)+'\n','candidate queue raw byte parity');
 assert.deepEqual(q.items.filter(x=>x.state==='READY').map(x=>x.id).sort(),m.selected_ready_item_ids);
 const excluded=new Set(),workflowRestorations=new Set(),otherExclusions=new Set();
 for(const key of ['restored_to_published_paths','restored_unpublished_workflow_paths',
  'excluded_unpublished_workflow_test_paths','excluded_unready_test_paths','restored_to_published_unready_test_paths','restored_reviewed_batch_qa_paths']){
  const paths=m[key]??[];
  assert.ok(Array.isArray(paths)&&paths.every(safePath));
  for(const path of paths){
   excluded.add(path);
   if(key==='restored_unpublished_workflow_paths'){
    assert.ok(/^\.github\/workflows\/[^/]+\.ya?ml$/.test(path),'invalid restored workflow path: '+path);
    workflowRestorations.add(path);
   }else otherExclusions.add(path);
  }
 }
 if(coffee){
  for(const path of coffee.protectedPaths){
   if(coffee.workflowPaths.includes(path))assert.ok(workflowRestorations.has(path)&&!otherExclusions.has(path),
    'selected coffee workflow requires exclusive published restoration '+path);
   else if(coffee.metadataOnlyPaths.includes(path))assert.ok(
    m.excluded_unpublished_workflow_test_paths?.includes(path)&&!m.excluded_unready_test_paths?.includes(path),
    'only exact historical workflow metadata test may be excluded '+path);
   else assert.ok(!excluded.has(path),'selected coffee source or assertion excluded '+path);
  }
 }
 // Preserve old READY bytes from the exact previously certified candidate,
 // never from a later development file. New selected paths must have a
 // continuous published-to-live source chain, including tests and workflows.
 let previousCandidate=null;
 if(retained.length){
  const cert=receiptCert;
  assert.equal(cert.kind,'DIC-PREVALIDATED-READY-BATCH-1');
  assert.match(cert.candidate_sha||'',SHA);
  assert.match(cert.ready_selection_sha256||'',hex64);
  previousCandidate=cert.candidate_sha;
  const old=exactGitJSON(previousCandidate,QUEUE_PATH,readGitText,sourceObjectAt).value;
  assert.deepEqual(old.items.filter(x=>x.state==='READY').map(x=>x.id).sort(),retained);
  for(const id of retained)assert.deepEqual(old.items.find(x=>x.id===id),parentRows.get(id));
 }
 const owners=new Map(),compositeFixtures=new Map(),ciOwned=new Set(),independentComponents=[];
 for(const id of selected){
  const row=q.items.find(x=>x.id===id),merge=row.merged_source_sha;
  assert.match(merge||'',SHA);
  // Historical queue schema permitted an omitted deployment flag. Only
  // accept omission preserved in both immutable baseline and exact live parent;
  // a removed flag, null, true or other altered value never proves readiness.
  if(!Object.hasOwn(row,'production_deployed')){
   const original=baseRows.get(id),prior=parentRows.get(id);
   assert.ok(original&&prior&&!Object.hasOwn(original,'production_deployed')&&
    !Object.hasOwn(prior,'production_deployed'),'unproven historical deployment flag omission');
  }else assert.equal(row.production_deployed,false);
  assert.ok(row.tests?.length&&row.ci_runs?.length&&row.ci_runs.every(x=>Number.isSafeInteger(x)&&x>0));
  assert.deepEqual(row.blockers,[]);
  assert.equal(isAncestor(merge,dev),true);
  if(coffee?.ids.includes(id))continue; // original ownership and candidate objects proved above
  const ci=reviewedCiOptimizationQa({row,dev,pub,retained:retained.includes(id),
   priorCandidate:previousCandidate,readParents,isAncestor,firstParentChangedPaths,sourceObjectAt});
  const composite=ci||reviewedStaleFamilyQa({row,dev,pub,retained:retained.includes(id),
   priorCandidate:previousCandidate,readParents,isAncestor,firstParentChangedPaths,sourceObjectAt})||
   reviewedMemberBrokerQa({row,dev,pub,retained:retained.includes(id),
    priorCandidate:previousCandidate,readParents,isAncestor,firstParentChangedPaths,sourceObjectAt});
  if(ci)for(const path of ci.byPath.keys())ciOwned.add(path);
  if(composite?.additional_source_components)independentComponents.push(...composite.additional_source_components);
  if(composite)for(const path of composite.publishedFixtures||composite.verifiedFixtures||[])
   compositeFixtures.set(path,{id,merges:composite.byPath.get(path)});
  const changes=composite?[...composite.byPath.keys()]:firstParentChangedPaths(merge);
  assert.ok(Array.isArray(changes)&&changes.every(safePath));
  assert.deepEqual(sortedUnique(changes.filter(sourcePath)),sortedUnique(row.scope_paths));
  // Every selected executable, test, workflow and other non-document first-
  // parent path is protected, not just the queue's deployable path inventory.
  const paths=sortedUnique(changes.filter(path=>!path.startsWith('docs/')));
  assert.ok(paths.length&&row.scope_paths.every(path=>paths.includes(path)));
  const amendment=reviewedSelectedQaAmendment({row,dev,initialPaths:paths,readParents,isAncestor,firstParentChangedPaths,sourceObjectAt});
  for(const path of paths){
   // Release candidates must preserve published workflow bytes, even for a
   // selected historical specialist's workflow. Its first-parent and live
   // provenance are still verified below; never exempt selected source/tests.
   const workflow=/^\.github\/workflows\/[^/]+\.ya?ml$/.test(path);
   if(workflow){
    assert.ok(workflowRestorations.has(path)&&!otherExclusions.has(path),
     'selected workflow lacks exclusive published restoration: '+path);
   }else assert.ok(!excluded.has(path),'selected source/test/workflow excluded: '+path);
   const list=owners.get(path)||[];
   for(const source of composite?composite.byPath.get(path):[merge])
    list.push({id,merge:source,retained:retained.includes(id)});
   if(amendment?.paths.includes(path))list.push({id,merge:amendment.merge,retained:retained.includes(id)});
   owners.set(path,list);
  }
 }
 assert.deepEqual(p.additional_source_components||[],independentComponents,'unverified or missing nonbaseline source component');
 if(coffee)for(const path of coffee.protectedPaths)
  assert.ok(!owners.has(path),'coffee component overlaps another selected or retained source '+path);
 for(const row of parent.value.items){
  if(selected.includes(row.id)||!['TESTING','IN_PROGRESS','BLOCKED'].includes(row.state))continue;
  for(const path of row.scope_paths??[]){
   assert.ok(!(owners.get(path)||[]).some(x=>!x.retained),
    'excluded unfinished owner overlaps new selected source: '+path);
  }
 }
 for(const [path,list] of owners){
  assert.equal(new Set(list.map(x=>x.merge)).size,list.length,'ambiguous selected path ownership');
  if(ciOwned.has(path)){
   assert.ok(list.every(x=>x.id===CI_OPERATIONAL_REVIEW.id),'CI optimization path has an unrelated selected owner');
   continue; // all historical, published, current and candidate objects proved independently above
  }
  const allRetained=list.every(x=>x.retained);
  let previous=sourceObjectAt(pub,path);
  const published=previous;
  const workflow=workflowRestorations.has(path);
  // A historical audit checker can already be present at its exact selected
  // bytes in published source (e.g. its earlier publication alongside other
  // work). Keep that checker and run its selected tests; only the redundant
  // historical introduction is exempt from published-to-first-parent equality.
  const alreadyPublishedAudit=!allRetained&&list.length===1&&
   /^scripts\/audit\/[^/]+\.mjs$/.test(path)&&fileObject.test(published||'')&&
   sourceObjectAt(list[0].merge,path)===published&&
   sourceObjectAt(dev,path)===published&&sourceObjectAt('HEAD',path)===published;
  // The SQL runner/coverage support is already published at a later reviewed
  // revision. Keep its exact published bytes and execute the selected SQL
  // fixtures; historical edits to this shared support are not new runtime.
  // Never apply this rule to migrations, dedicated tests or workflows.
  const publishedSupport=reviewedPublishedSqlSupport({path,pub,dev,priorCandidate:previousCandidate,
   hasRetained:list.some(x=>x.retained),sourceObjectAt});
  assert.ok(allRetained||list.every(x=>!x.retained)||publishedSupport,
   'retained READY overlap requires separate reviewed isolation: '+path);
  const remaining=[...list],orderedMerges=[];
  let discontinuous=false;
  while(remaining.length){
   const earliest=remaining.filter(x=>remaining.every(y=>x===y||isAncestor(x.merge,y.merge)===true));
   assert.equal(earliest.length,1,'ambiguous selected merge chronology: '+path);
   const x=earliest[0];remaining.splice(remaining.indexOf(x),1);
   const before=sourceObjectAt(x.merge+'^',path),after=sourceObjectAt(x.merge,path);
   assert.ok(fileObject.test(after||''),'selected path missing or unsafe: '+path);
   assert.notEqual(before,after,'selected first-parent change missing: '+path);
   if(!allRetained&&!publishedSupport&&!alreadyPublishedAudit&&before!==previous)discontinuous=true;
   orderedMerges.push(x.merge);
   previous=after;
  }
  if(compositeFixtures.has(path)){
   const verified=compositeFixtures.get(path);
   assert.ok(list.every(x=>x.id===verified.id),'unrelated selected owner of composite fixture: '+path);
   assert.deepEqual(orderedMerges,verified.merges);
   continue; // exact dedicated fixture already verified, never excluded or skipped
  }
  if(reviewedPublishedSelectedGuard({path,merges:orderedMerges,pub,dev,
   mainSelected:owners.has('site/cloud/main.js'),allRetained,priorCandidate:previousCandidate,
   readParents,isAncestor,firstParentChangedPaths,sourceObjectAt}))continue;
  if(discontinuous){
   assert.equal(sourceObjectAt(dev,path),previous,'unreviewed selected tip: '+path);
   const publishedAmendment=!allRetained&&list.every(x=>!x.retained&&x.id===list[0].id)&&
    reviewedAlreadyPublishedAmendedQa({path,merges:orderedMerges,pub,dev,
     readParents,isAncestor,firstParentChangedPaths,sourceObjectAt});
   if(!publishedAmendment)verifySelectedOnlyQaReplay({path,merges:orderedMerges,publishedRef:pub,liveRef:dev,
    readGitText,sourceObjectAt,firstParentPatch});
  }
  if(workflow){
   // Independent candidate CI is still mandatory on the published workflows.
   // Historical specialist workflow bytes remain bound to the exact live
   // merged source, while the candidate (and any retained certificate)
   // must contain only the published object, including a proven absence.
   assert.notEqual(published,previous,'restored selected workflow has no unpublished change: '+path);
   assert.equal(sourceObjectAt(dev,path),previous,'selected development workflow drift: '+path);
   assert.equal(sourceObjectAt('HEAD',path),published,'selected workflow not restored to published: '+path);
   if(allRetained)assert.equal(sourceObjectAt(previousCandidate,path),published,'retained READY workflow drift: '+path);
   continue;
  }
  if(publishedSupport)continue; // exact published runner is retained and not excluded
  assert.equal(sourceObjectAt('HEAD',path),previous,'selected candidate object mismatch: '+path);
  if(allRetained)assert.equal(sourceObjectAt(previousCandidate,path),previous,'retained READY drift: '+path);
  else assert.equal(sourceObjectAt(dev,path),previous,'selected development tip drift: '+path);
 }
 return sortedUnique([...owners.keys(),...(coffee?.protectedPaths||[])]);
}
function gitText(ref,path){
 return execFileSync('git',['show',ref+':'+path],{encoding:'utf8',timeout:20000,maxBuffer:4000000});
}
function gitObject(ref,path){
 const lines=execFileSync('git',['ls-tree','-z',ref,'--',path],{encoding:'utf8',timeout:15000}).split('\0').filter(Boolean);
 if(!lines.length)return null;
 assert.equal(lines.length,1);
 const x=/^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/.exec(lines[0]);
 assert.ok(x&&x[3]===path,'unexpected Git path or mode: '+path);
 return x[1]+':'+x[2];
}
function firstParentPaths(sha){
 return execFileSync('git',['diff','--name-only','--no-renames',sha+'^',sha],{encoding:'utf8',timeout:15000}).split(/\r?\n/).filter(Boolean);
}
function gitFirstParentPatch(sha,path){
 return execFileSync('git',['diff','--no-color','--no-ext-diff','--no-textconv','--no-renames',
  '--full-index','--no-indent-heuristic','--diff-algorithm=myers','--unified=3','--src-prefix=a/','--dst-prefix=b/',
  sha+'^',sha,'--',path],{encoding:'utf8',timeout:20000,maxBuffer:4000000});
}
function gitParents(sha){
 const [commit,...parents]=execFileSync('git',['rev-list','--parents','-n','1',sha],{encoding:'utf8',timeout:15000}).trim().split(/\s+/);
 assert.equal(commit,sha);
 return parents;
}
function gitAncestor(a,b){
 try{execFileSync('git',['merge-base','--is-ancestor',a,b],{stdio:'ignore',timeout:15000});return true;}
 catch(e){if(e.status===1)return false;throw e;}
}
let generalSelectedPaths=null;
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
 if(m.prospective_ready_batch_preview!==undefined){
  if(sameJSON(m.selected_ready_item_ids,[BATCH_R399_ID,PROSPECTIVE_ID]))verifyProspectiveBatchReadyTestScope(opts);
  else generalSelectedPaths=verifyGeneralProspectiveBatchReadyTestScope({...opts,readGitText:gitText,
   sourceObjectAt:gitObject,firstParentChangedPaths:firstParentPaths,isAncestor:gitAncestor,readParents:gitParents,
   firstParentPatch:gitFirstParentPatch});
 }else verifyProspectiveReadyTestScope(opts);
 return prospectiveCache=m;
}
function frozenExcludedProspectiveSource(paths){
 const m=prospectiveCandidate();if(!m)return false;
 assert.ok(Array.isArray(paths)&&paths.length>0);
 // For a generalized candidate, any selected path must run the original
 // assertion, never receive an N/A classification.
 if(generalSelectedPaths&&paths.some(path=>generalSelectedPaths.includes(path)))return false;
 for(const path of paths){
  assert.ok(!(m.prospective_ready_batch_preview!==undefined?(generalSelectedPaths||BATCH_SELECTED_PATHS):[PROSPECTIVE_MIGRATION]).includes(path),
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

// Immutable reviewed provenance; independent of operational main receipts.
const REVIEWED_COFFEE_QA=Object.freeze({
  "published": "2d22d448160d428a977f06482323646b92818fcf",
  "baseline": "d9fc859d81a23e10ee2cd0e1a37013b93a4980e5",
  "baseline_queue": "46304f47eb0e78fac8c7845155af86080900b3c4",
  "reference": "947237d17fe3f9d8ee2638c12f9633168e42176f",
  "reference_queue": "af0266a5cb9e56394bf976383adeda9b47653b38",
  "sources": [
    {
      "id": "DIC-Q-33-r311-original63-selected-sourcing-province",
      "merge": "1e326fb0683ee745a76108f38fb3c580141831e9",
      "parent": "db84d03a192da78c1b5ff577ffbdfb400a1ae87a",
      "paths": {
        ".github/workflows/issue33-r311-original63.yml": [
          null,
          "100644:7325da5121afe195dad0b9787ed9198f2c92e0e0"
        ],
        "scripts/audit/issue33-r311-original63-check.mjs": [
          null,
          "100644:23df2a1e9b7ea8d239588103e4edc610adb65866"
        ],
        "src/server/coffee-page-metadata.mjs": [
          "100644:0c317c384406780918612c6c5d58afff24479db6",
          "100644:95e3442af91092390e2d2e6a086a5c8b0c6d2404"
        ],
        "src/server/coffee-selected-published-sourcing-region.mjs": [
          null,
          "100644:5206c073a43fdce048d6b85dcfdd566fbbf43499"
        ],
        "tests/coffee-issue33-r311-original63.test.mjs": [
          null,
          "100644:1fdd17b150dc02430bbf3c3b949738c94977365b"
        ]
      },
      "runs": [
        44419345944,
        44419345886,
        44419345791,
        44419345617
      ]
    },
    {
      "id": "DIC-Q-33-r327-original138-icon-labeled-source",
      "merge": "bc5e03764d37ee97b9e75cb34a2a995a26a57d57",
      "parent": "c646c0c1fdc330cc00a347572181fe3f015ce7f2",
      "paths": {
        ".github/workflows/issue33-r327-original138.yml": [
          null,
          "100644:9e1e18559bfe1f0143e981ccc9c40683821d3c22"
        ],
        "scripts/audit/issue33-r327-original138-check.mjs": [
          null,
          "100644:501803b5587df32039bc5f40eaf2ddca7b96c823"
        ],
        "src/server/coffee-page-metadata.mjs": [
          "100644:05d26d839a1cf04a46fafa4e5ec57f915c4a9fd2",
          "100644:0a56583b970216935dc2031f792ea81808cbaea3"
        ],
        "src/server/coffee-selected-icon-specs.mjs": [
          null,
          "100644:e8943c005181c429eca9a82eae7de6d2d36f1a86"
        ],
        "tests/coffee-issue33-r327-original138.test.mjs": [
          null,
          "100644:abfda824c67e4cc5defc9e01299923f1788f6d75"
        ]
      },
      "runs": [
        44535725044,
        44535729012,
        44535724939,
        44535728531
      ]
    },
    {
      "id": "DIC-Q-33-r342-original249-review-source-roles",
      "merge": "74d0f758e284a2b1909862669900f24ea8fa4f57",
      "parent": "edfda99ed82a56bb1d64597534002de640c2795d",
      "paths": {
        ".github/workflows/issue33-r342-original249-review.yml": [
          null,
          "100644:3f233a6fff494c2e9f1a44e166ed35579b2f9b3c"
        ],
        "scripts/audit/issue33-r342-original249-review-check.mjs": [
          null,
          "100644:dfbca18a6157ef026f1e815ae86487332fdbf810"
        ],
        "src/server/coffee-source-facts.mjs": [
          "100644:1a760a5db212d81e93899c4fedc47320ee949946",
          "100644:3b2a69b6bd8ea10882184ded0ade7481b46de52a"
        ],
        "tests/coffee-issue33-r342-original249-review.test.mjs": [
          null,
          "100644:7bfb95e53b9a9457923df2634ffc6a9ca0904cbc"
        ]
      },
      "runs": [
        44652295060,
        44652295145,
        44652295404,
        44652295243
      ]
    },
    {
      "id": "DIC-Q-33-r352-original298-selected-analogy-and-sensory",
      "merge": "9d13dd2de90f5de4591a250f3ea8c57c0c9a1115",
      "parent": "67cbb36cb1e433675feb5868d617d5af802c869c",
      "paths": {
        ".github/workflows/issue33-r349-original298.yml": [
          null,
          "100644:833f8dfd2cfee926e2853c30e0c9bdaf4696699b"
        ],
        ".github/workflows/issue33-shared-parser-regressions.yml": [
          "100644:4cb69f3cb9767026423c79e3d1915751cbd7a5aa",
          "100644:e976d52a097f2c179e590192114265cb00d91bd3"
        ],
        "scripts/audit/issue33-r349-original298-check.mjs": [
          null,
          "100644:1d20cdf4d5e9d5ec45281c8c4fd2c05b2476280a"
        ],
        "src/server/coffee-flavor-evidence.mjs": [
          "100644:48ae3cc76e45e5324a7a149f59e784ee59ecd25d",
          "100644:4d92c3ac798f4373a74354c1f297c36dd13f8558"
        ],
        "src/server/coffee-page-metadata.mjs": [
          "100644:0a56583b970216935dc2031f792ea81808cbaea3",
          "100644:203d935af543fc6da2aaa4e227b0321cb647d4f2"
        ],
        "tests/coffee-issue33-r349-original298.test.mjs": [
          null,
          "100644:8a43302eeeabe0803162cd9a56d2e725ebd339ad"
        ],
        "tests/coffee-issue33-r352-selected-analogy-tastes.test.mjs": [
          null,
          "100644:aeff67899ebb0c9dd7a83f0e7796b99da7943ed9"
        ],
        "tests/coffee-issue33-shared-ci-trigger.test.mjs": [
          "100644:b59d48ad06f82cb3fb11855c4fd5f47af6ddcb75",
          "100644:d121ded71e1733c351421206b9f5733e1ec392c7"
        ]
      },
      "runs": [
        44734558032,
        44734557910,
        44734561125,
        44734560826
      ]
    },
    {
      "id": "DIC-Q-33-r374-original41-selected-pagefly-sugarcane-method",
      "merge": "84bf75f33918bd1f15f037344aedced15906d6f2",
      "parent": "2a4f8473f21ea57365c72c25fac22aa7336bf9ec",
      "paths": {
        ".github/workflows/issue33-r374-original41.yml": [
          null,
          "100644:c97d6393f478485c59302da6d10ce5ceea08ddce"
        ],
        ".github/workflows/issue33-shared-parser-regressions.yml": [
          "100644:c2f3c0cbcc3c0586f83f26f041e50f0e1856077c",
          "100644:ba789016ab07f0c701c6bb9e10338872d8d96d55"
        ],
        "scripts/audit/issue33-original603-focused-source-review.mjs": [
          "100644:49b50fa3c1a1a07e61943ad98bbb2cc31c119fac",
          "100644:56c5d28a12a2ae00a7ab9941dc7948ec18e2808f"
        ],
        "scripts/audit/issue33-r374-original41-check.mjs": [
          null,
          "100644:a559c28ade3033723f508bf5916d9e596bc058ad"
        ],
        "scripts/audit/issue33-shopify-pagefly-h3.mjs": [
          null,
          "100644:825edd6c8ff2ff73ff65bebbee029924518eca82"
        ],
        "src/server/coffee-decaffeination-method.mjs": [
          "100644:71f36151e92954a869f5e58ca7ae3933a7664c39",
          "100644:7eeea4a9a35cb3f3aca7a6e8f2e0b8595fe2e0dc"
        ],
        "src/server/coffee-direct-product-prose.mjs": [
          "100644:462a7a7f045f534f689cff2836a387fac79472aa",
          "100644:59ad849cf56850850639f68a469c5844e642cef7"
        ],
        "src/server/coffee-pagefly-selected-h3.mjs": [
          null,
          "100644:2ef2f6e659e097001d18c5717264696ad1f29751"
        ],
        "tests/coffee-issue33-r374-original41.test.mjs": [
          null,
          "100644:af76e5cd05e0efcacaa0b3226b077b0e11c990b5"
        ],
        "tests/coffee-issue33-shared-ci-trigger.test.mjs": [
          "100644:243202377546100a7ad28c89e0716f9ec65009c0",
          "100644:f61a25edc3ebbfc4a93721458425800592bfdfea"
        ]
      },
      "runs": [
        44874280318,
        44874280183,
        44874280264,
        44874280314
      ]
    },
    {
      "id": "DIC-Q-33-r380b-original242-woo-conflicting-region",
      "merge": "fea352502587653ae02c99c8a941a76729d60767",
      "parent": "1a36a69add59bc220a94d1e16ffe88081b7ba0e5",
      "paths": {
        "src/server/coffee-page-metadata.mjs": [
          "100644:203d935af543fc6da2aaa4e227b0321cb647d4f2",
          "100644:761e92af185c924b3e4c17cb30ec02eae42c7908"
        ],
        "src/server/coffee-selected-woo-short-origin-conflict.mjs": [
          null,
          "100644:5eddda126a7d09b775a316661e98d58a48d02c30"
        ],
        "tests/coffee-issue33-242-selected-woo-origin-conflict.test.mjs": [
          null,
          "100644:2c88de0388fcd9491fcdbaf70634d69f4af04670"
        ]
      },
      "runs": [
        44899001007,
        44899002278,
        44899001033,
        44899001138
      ]
    },
    {
      "id": "DIC-Q-33-r403-original134-selected-swiss-water-method",
      "merge": "e536ad7b12cb55966e2e1e23ec396d82b1f30f91",
      "parent": "2ef1dd0281be97aa1b067278f52ddc7229cd5196",
      "paths": {
        "src/server/coffee-direct-product-prose.mjs": [
          "100644:0748d9bf284f38f78d1e5cacf95c3233f9215744",
          "100644:2bc22ff9b94f368b81a2a589a89ac145a0b57809"
        ],
        "src/server/coffee-page-metadata.mjs": [
          "100644:761e92af185c924b3e4c17cb30ec02eae42c7908",
          "100644:ff8173ebb3c5a36ed7bb19628e459298c910764d"
        ],
        "src/server/coffee-source-facts.mjs": [
          "100644:3b2a69b6bd8ea10882184ded0ade7481b46de52a",
          "100644:7dd87bf77057f765fec61a20c6b6dcf31c8a9f87"
        ],
        "tests/coffee-issue33-r403-selected-swiss-water-claim.test.mjs": [
          null,
          "100644:2620b36c1fa439880f071795b146a04d9cf54353"
        ]
      },
      "runs": [
        45003858575,
        45003858281,
        45003857100,
        45003857954
      ]
    },
    {
      "id": "DIC-Q-33-r408-original123-producer-farm-roles",
      "merge": "96d8d08ded663012f9a9cfc30b298908b38174ab",
      "parent": "a1b2d2c25dc144f7c6d96d7360cff0e273ef1cd2",
      "paths": {
        ".github/workflows/issue33-r407-original119-123.yml": [
          "100644:491749dd2a478194e1d01e435329753dec5676f8",
          "100644:9d71944d1e8d07a142b547004c7f40793be0292b"
        ],
        "scripts/audit/issue33-r407-original119-123-check.mjs": [
          "100644:f6bc68d5ac8f4fb9603edc2860b019e16b2b9356",
          "100644:1b320d1f673a1439dc0fadc0f37bbf4080504c87"
        ],
        "src/server/coffee-page-metadata.mjs": [
          "100644:ff8173ebb3c5a36ed7bb19628e459298c910764d",
          "100644:29a7eba5e1dfc2e6367b9ffe4c38602ab423573d"
        ],
        "tests/coffee-issue33-r408-producer-farm-caption.test.mjs": [
          null,
          "100644:56715259c6a5e8ed35f93951f28990cac08a2136"
        ]
      },
      "runs": [
        45020841647,
        45020841657,
        45020841681,
        45020842641
      ]
    },
    {
      "id": "DIC-Q-33-r424-kati-selected-h1-free-richtext",
      "merge": "e2e11042c190d6640829f5b6a2a758f5e7645ab0",
      "parent": "7f9f00aba51cbb4016509180add98df58d3e2027",
      "paths": {
        ".github/workflows/issue33-r424-kati173-174.yml": [
          null,
          "100644:4e690437e27e3e3ae16a5546e5131b669fbc86dd"
        ],
        "scripts/audit/issue33-original603-focused-source-review.mjs": [
          "100644:cda89ef1d7fd5bacfde1300c59733d330b8d6819",
          "100644:1cfb8ad340e7095ee3550e0c9fefbaa36e53d7f0"
        ],
        "scripts/audit/issue33-r424-kati173-174-check.mjs": [
          null,
          "100644:2b9181303a15771014a9e3e1bec88929c3fc9e8c"
        ],
        "src/server/coffee-page-metadata.mjs": [
          "100644:29a7eba5e1dfc2e6367b9ffe4c38602ab423573d",
          "100644:491b42d8db03439ac3f9d61271b3eb542088618d"
        ],
        "src/server/coffee-selected-shopify-variant-richtext.mjs": [
          null,
          "100644:e2e00fe1afee5c02a1b6c3fdc98274795e0bcdfd"
        ],
        "tests/issue33-r424-kati173-174.test.mjs": [
          null,
          "100644:8bb0a444d4750f21899b815690f005bf3117e1cc"
        ]
      },
      "runs": [
        45110856925,
        45110855352,
        45110855547,
        45110857171
      ]
    }
  ],
  "runtime_results": {
    "src/server/coffee-page-metadata.mjs": "100644:cdf1b661ad1176bf95e182133190bf9a5a7858cc",
    "src/server/coffee-selected-published-sourcing-region.mjs": "100644:5206c073a43fdce048d6b85dcfdd566fbbf43499",
    "src/server/coffee-selected-icon-specs.mjs": "100644:e8943c005181c429eca9a82eae7de6d2d36f1a86",
    "src/server/coffee-source-facts.mjs": "100644:7dd87bf77057f765fec61a20c6b6dcf31c8a9f87",
    "src/server/coffee-flavor-evidence.mjs": "100644:4d92c3ac798f4373a74354c1f297c36dd13f8558",
    "src/server/coffee-decaffeination-method.mjs": "100644:7eeea4a9a35cb3f3aca7a6e8f2e0b8595fe2e0dc",
    "src/server/coffee-direct-product-prose.mjs": "100644:94a397062e8c72bf451cf772dc7bb4ae6d1adfad",
    "src/server/coffee-pagefly-selected-h3.mjs": "100644:2ef2f6e659e097001d18c5717264696ad1f29751",
    "src/server/coffee-selected-woo-short-origin-conflict.mjs": "100644:5eddda126a7d09b775a316661e98d58a48d02c30",
    "src/server/coffee-selected-shopify-variant-richtext.mjs": "100644:e2e00fe1afee5c02a1b6c3fdc98274795e0bcdfd"
  },
  "r374_correction": {
    "merge": "acf394919bf577c264deaa4d5810b18e02062899",
    "parent": "0e377d1037d22518e7f42bc3935cb1c2d76f000b",
    "paths": {
      "scripts/audit/issue33-r374-original41-check.mjs": [
        "100644:a559c28ade3033723f508bf5916d9e596bc058ad",
        "100644:6b47cfa4736189d91df71ed6867f9455065ce4b3"
      ],
      "tests/coffee-issue33-r374-original41.test.mjs": [
        "100644:af76e5cd05e0efcacaa0b3226b077b0e11c990b5",
        "100644:c1ba8d832cce68fc36b5ce127bc23ed0465b4bd0"
      ]
    }
  },
  "r408_relocation": {
    "kind": "DIC-3889-R408-EXACT-ADDITIONS-RELOCATION-1",
    "merge": "96d8d08ded663012f9a9cfc30b298908b38174ab",
    "parent": "a1b2d2c25dc144f7c6d96d7360cff0e273ef1cd2",
    "path": "src/server/coffee-page-metadata.mjs",
    "original_parent_blob": "ff8173ebb3c5a36ed7bb19628e459298c910764d",
    "original_merge_blob": "29a7eba5e1dfc2e6367b9ffe4c38602ab423573d",
    "selected_eight_blob": "b1f2bd40c8ced51b155b3486ba010b33d0c5e4f4",
    "selected_nine_blob": "cdf1b661ad1176bf95e182133190bf9a5a7858cc",
    "hunks": [
      {
        "hunk": 1,
        "inserted_lines": 28,
        "side": "before_exact_following_published_anchor",
        "anchor": "// Best-effort facts from arbitrary PUBLIC coffee pages. This is NOT official\n// roaster verification and never promotes a canonical record.\nimport {extractRoastVisualEvidence,normalizeRoastLabel,roastLabelHint} from './roast-level-evidence.mjs';\n",
        "insertion": "// A chosen current Producer caption can contain a human farmer and a distinct\n// named farm. Separate roles only with independently supported selected prose.\n// The complete published caption remains unchanged in the source-review facts.\nexport function selectedLabeledPersonFarmRoles({publishedProducer,sourceFacts,selectedProse,existingFarm}={}){\n const literal=String(publishedProducer||'').trim();\n const match=/^(.{6,110}?):\\s*((?:Fazenda|Finca|Hacienda)\\s+[\\p{Lu}][\\p{L}\\p{M}0-9'\u2019.-]{1,45}(?:\\s+[\\p{L}\\p{M}0-9'\u2019.-]{1,45}){0,5})$/u.exec(literal);\n if(!match)return null;\n const person=match[1].trim(),farm=match[2].trim();\n if(!/^[\\p{Lu}][\\p{L}\\p{M}'\u2019-]{1,39}(?:\\s+(?:[\\p{Lu}][\\p{L}\\p{M}'\u2019-]{1,39}|de|da|do|dos|das|del|van|von)){1,5}$/u.test(person)||\n    /\\b(?:coffee|company|export|trading|group|coop|cooperative|station|estate|farm|finca|fazenda|hacienda|roaster)\\b/iu.test(person))return null;\n const key=s=>String(s||'').normalize('NFKD').replace(/\\p{M}/gu,'').toLowerCase().replace(/\\s+/gu,' ').trim();\n if(existingFarm&&key(existingFarm)!==key(farm))return null;\n const direct=Array.isArray(sourceFacts)&&sourceFacts.some(f=>f.field==='producer'&&\n   /^\\s*producer\\s*:?\\s*$/iu.test(String(f.label||''))&&\n   f.source_type==='html'&&f.conflicting!==true&&\n   String(f.section||'')!=='Different coffee in the source'&&key(f.value)===key(literal));\n if(!direct||!Array.isArray(selectedProse))return null;\n const selectedGrowingCredit=selectedProse.some(b=>{\n  if(b.educational||typeof b.text!=='string'||b.text.length>2500||\n     /^\\s*producer\\s*[:\uff1a]/iu.test(b.text))return false;\n  const normalized=key(b.text),at=normalized.indexOf(key(person));\n  if(at<0)return false;\n  const near=normalized.slice(Math.max(0,at-120),at+key(person).length+210);\n  return /\\b(?:coffee\\s+from|coffee\\s+farmers?|farmers?|family\\s+farm|growers?|grows?|grown|cultivat\\w*|harvest\\w*)\\b/iu.test(near);\n });\n return selectedGrowingCredit?{producer:person,farm,literal}:null;\n}\n\n",
        "anchor_occurrences": 1
      },
      {
        "hunk": 2,
        "inserted_lines": 12,
        "side": "after_exact_preceding_published_anchor",
        "anchor": " // count after primary Farm normalization. Respect the published label at\n // FINAL field reconciliation, without suppressing independently labelled\n // Producer collectives or qualified anonymous-growing-group prose.\n const countedSupplier=/^\\d{1,3}(?:,?\\d{3})?\\s+(?:(?:small[ -]?holder|small|family|local|independent|regional)\\s+){0,3}(?:farms?|farmers?|growers?|families|producers?|cooperatives?)$/iu;\n if(fields.producer&&countedSupplier.test(fields.producer)){\n  const same=value=>keyOf(String(value||''))===keyOf(fields.producer);\n  const printedFarm=source_facts.some(f=>\n    f.section!=='Different coffee in the source'&&\n    /^(?:farm|farms|finca)$/i.test(String(f.label||'').trim())&&same(f.value))||\n    productCoffeeProse(canonicalProduct,clean).some(b=>\n     /^farm\\s*[:\uff1a]/i.test(b.text)&&same(b.text.replace(/^farm\\s*[:\uff1a]\\s*/i,'')));\n  const printedProducer=source_facts.some(f=>\n    f.section!=='Different coffee in the source'&&\n    /^(?:producers?|growers?)$/i.test(String(f.label||'').trim())&&same(f.value));\n  if(printedFarm&&!printedProducer){\n   rememberCoffeeReviewCandidate(fields,'producer',fields.producer,\n    'Count-only selected Farm caption; named supplier not published');\n   delete fields.producer;\n  }\n }\n",
        "insertion": " // Direct selected Producer: PERSON: FARM is two roles only if a separate\n // selected own-coffee growing description corroborates the named person.\n const personFarm=!conflicts.has('producer')&&fields.producer\n  ?selectedLabeledPersonFarmRoles({publishedProducer:fields.producer,\n    sourceFacts:source_facts,selectedProse:productCoffeeProse(canonicalProduct,clean),\n    existingFarm:roaster_details.farm}):null;\n if(personFarm){\n  fields.producer=personFarm.producer;\n  if(!roaster_details.farm)roaster_details.farm=personFarm.farm;\n  if(keyOf(roaster_details.named_producer||'')===keyOf(personFarm.literal))\n   roaster_details.named_producer=personFarm.producer;\n }\n",
        "anchor_occurrences": 1
      }
    ],
    "excluded_context_sources": [
      "c9b1bf2a1cecce9a67c84983eb1fd8d379f2d5f2",
      "c1dfa5abc5433d5413b62610089dc98b6cba5b3e"
    ],
    "source_changes": "Two complete original insertion blocks only, no added/removed/reworded runtime statement beyond the selected original patch."
  }
});

// Independently replay the original #33 component from actual Git objects.
// The operational receipt is compared only after this reconstruction; it never
// supplies source bytes, parent relationships, queue authority or skip rules.
export function relocateCoffeeSelectedQa(spec,{before,after,selected,published,patch}){
 assert.equal(blobOfText(before),'100644:'+spec.original_parent_blob);
 assert.equal(blobOfText(after),'100644:'+spec.original_merge_blob);
 assert.equal(blobOfText(selected),'100644:'+spec.selected_eight_blob,'coffee relocation exact selected preimage');
 assert.equal(replayQaExactTextPatch({before,after,selected:before,patch,path:spec.path,
  beforeObject:blobOfText(before),afterObject:blobOfText(after)}),after);
 const bodies=[];let body=null;
 for(const line of patch.slice(0,-1).split('\n')){
  if(line.startsWith('@@ ')){body=[];bodies.push(body);}
  else if(body)body.push(line);
 }
 assert.equal(bodies.length,2,'coffee relocation must own exactly two full original insertions');
 assert.equal(spec.hunks.length,2);
 let result=selected;
 for(let i=0;i<bodies.length;i++){
  const lines=bodies[i],h=spec.hunks[i];
  assert.ok(lines.every(l=>l.startsWith('+')||l.startsWith(' ')),'coffee relocation cannot remove source');
  const first=lines.findIndex(l=>l.startsWith('+')),last=lines.findLastIndex(l=>l.startsWith('+'));
  assert.ok(first>=0&&last>=first);
  assert.ok(lines.slice(first,last+1).every(l=>l.startsWith('+')),'coffee original insertion must be contiguous');
  const added=lines.slice(first,last+1).map(l=>l.slice(1)).join('\n')+'\n';
  assert.equal(added,h.insertion);assert.equal(last-first+1,h.inserted_lines);assert.equal(h.hunk,i+1);
  assert.ok(h.anchor?.endsWith('\n'));
  for(const text of [published,result])assert.equal(text.split(h.anchor).length,2,'coffee published anchor must be unique');
  assert.equal(result.includes(added),false,'coffee insertion already present');
  assert.equal(h.side,i===0?'before_exact_following_published_anchor':'after_exact_preceding_published_anchor');
  const pos=result.indexOf(h.anchor)+(i===1?h.anchor.length:0);
  result=result.slice(0,pos)+added+result.slice(pos);
 }
 assert.equal(blobOfText(result),'100644:'+spec.selected_nine_blob,'coffee relocation exact final object');
 return result;
}

export function reconstructCoffeeSelectedQa(spec,{dev,readGitText,sourceObjectAt,
 firstParentChangedPaths,firstParentPatch,readParents,isAncestor}={}){
 assert.match(dev||'',SHA);
 for(const f of [readGitText,sourceObjectAt,firstParentChangedPaths,firstParentPatch,readParents,isAncestor])
  assert.equal(typeof f,'function','independent coffee Git reader required');
 const read=(ref,path,object=sourceObjectAt(ref,path))=>{
  assert.match(object||'',/^100644:[a-f0-9]{40}$/,'coffee regular Git object '+path);
  const raw=readGitText(ref,path);
  assert.equal(blobOfText(raw),object,'coffee text hash '+path);
  return raw;
 };
 const history=new Map(),built=new Map();
 const workflows=[],metadata=[];
 for(const s of spec.sources){
  assert.deepEqual(readParents(s.merge),[s.parent],'coffee sole parent '+s.id);
  assert.equal(isAncestor(s.merge,dev),true,'coffee source not merged '+s.id);
  const paths=Object.keys(s.paths).sort();
  assert.deepEqual(firstParentChangedPaths(s.merge).filter(p=>!p.startsWith('docs/')).sort(),paths,
   'coffee full original executable ownership '+s.id);
  for(const path of paths){
   const [before,after]=s.paths[path];
   assert.equal(sourceObjectAt(s.parent,path),before,'coffee historical parent '+path);
   assert.equal(sourceObjectAt(s.merge,path),after,'coffee historical selected source '+path);
   assert.notEqual(before,after);
   assert.equal(sourceObjectAt(dev,path),sourceObjectAt(spec.reference,path),'unreviewed coffee source drift '+path);
   history.set(path,[...(history.get(path)||[]),s]);
   if(path.startsWith('.github/workflows/')){workflows.push(path);continue;}
   if(path==='tests/coffee-issue33-shared-ci-trigger.test.mjs'){metadata.push(path);continue;}
   read(s.merge,path,after);
   if(!path.startsWith('src/server/'))continue;
   if(s.merge===spec.r408_relocation?.merge&&path===spec.r408_relocation.path)continue;
   let current=built.has(path)?built.get(path):sourceObjectAt(spec.published,path)===null?null:read(spec.published,path);
   if(before===null){
    assert.equal(current,null,'coffee added source unexpectedly present '+path);
    current=read(s.merge,path,after);
   }else{
    current=replayQaExactTextPatch({path,beforeObject:before,afterObject:after,
     before:read(s.parent,path,before),after:read(s.merge,path,after),selected:current,
     patch:firstParentPatch(s.merge,path)});
   }
   built.set(path,current);
  }
 }
 if(spec.r408_relocation){
  const r=spec.r408_relocation,s=spec.sources.find(s=>s.merge===r.merge);
  assert.ok(s);assert.equal(s.parent,r.parent);
  assert.deepEqual(s.paths[r.path],['100644:'+r.original_parent_blob,'100644:'+r.original_merge_blob]);
  built.set(r.path,relocateCoffeeSelectedQa(r,{before:read(r.parent,r.path),after:read(r.merge,r.path),
   selected:built.get(r.path),published:read(spec.published,r.path),patch:firstParentPatch(r.merge,r.path)}));
 }
 assert.deepEqual([...built.keys()].sort(),Object.keys(spec.runtime_results).sort());
 const objects={};
 for(const [path,text] of built){
  const object=blobOfText(text);
  assert.equal(object,spec.runtime_results[path],'coffee selected-only reconstructed blob '+path);
  objects[path]=object;
 }
 const amendments=new Map();
 if(spec.r374_correction){
  const c=spec.r374_correction;
  assert.deepEqual(readParents(c.merge),[c.parent]);
  assert.equal(isAncestor(c.merge,dev),true);
  assert.deepEqual(firstParentChangedPaths(c.merge).filter(p=>!p.startsWith('docs/')).sort(),Object.keys(c.paths).sort());
  for(const [path,[before,after]] of Object.entries(c.paths)){
   assert.equal(history.get(path)?.at(-1).paths[path][1],before,'coffee QA correction ownership');
   assert.equal(sourceObjectAt(c.parent,path),before);
   assert.equal(sourceObjectAt(c.merge,path),after);
   assert.equal(sourceObjectAt(dev,path),after);
   read(c.merge,path,after);amendments.set(path,after);
  }
 }
 for(const [path,chain] of history){
  if(built.has(path))continue;
  const published=sourceObjectAt(spec.published,path);
  if(workflows.includes(path)||metadata.includes(path)){
   assert.equal(published,null,'coffee historical-only workflow/test must be absent in published source');
   objects[path]=null;
  }else if(amendments.has(path))objects[path]=amendments.get(path);
  else if(path.startsWith('scripts/audit/')&&published!==null&&chain.some(s=>s.paths[path][1]===published)){
   read(spec.published,path,published);objects[path]=published;
  }else{
   assert.equal(chain.length,1,'coffee unreviewed test/support source chain');
   const after=chain[0].paths[path][1];
   assert.equal(published,null);
   assert.equal(sourceObjectAt(dev,path),after,'coffee selected test/support source drift');
   read(chain[0].merge,path,after);objects[path]=after;
  }
 }
 for(const [path,object] of Object.entries(objects))
  assert.equal(sourceObjectAt('HEAD',path),object,'coffee exact candidate object/absence '+path);
 return {objects,ids:spec.sources.map(s=>s.id).sort(),protectedPaths:[...history.keys()].sort(),
  workflowPaths:sortedUnique(workflows),metadataOnlyPaths:sortedUnique(metadata),
  runtimePaths:[...built.keys()].sort()};
}

export function verifyReviewedCoffeeSelectedQa({addedIds,parentQueue,manifest:m,
 readGitText,sourceObjectAt,firstParentChangedPaths,firstParentPatch,readParents,isAncestor}={}){
 const s=REVIEWED_COFFEE_QA,ids=s.sources.map(x=>x.id).sort();
 const any=ids.some(id=>addedIds?.includes(id));
 if(!any){assert.equal(m?.reviewed_coffee_source_component,undefined);return null;}
 assert.ok(ids.every(id=>addedIds.includes(id)),'partial coffee shared-source component selection');
 assert.equal(m.published_source_sha,s.published);
 const original=exactGitJSON(s.baseline,QUEUE_PATH,readGitText,sourceObjectAt);
 const reference=exactGitJSON(s.reference,QUEUE_PATH,readGitText,sourceObjectAt);
 assert.equal(blobOfText(original.raw),'100644:'+s.baseline_queue);
 assert.equal(blobOfText(reference.raw),'100644:'+s.reference_queue);
 assert.equal(original.value.items.filter(x=>x.state==='TESTING').length,63);
 assert.deepEqual(original.value.published_base,parentQueue.published_base);
 assert.deepEqual(reference.value.published_base,parentQueue.published_base);
 const queue=structuredClone(parentQueue);
 for(const entry of s.sources){
  const base=original.value.items.filter(x=>x.id===entry.id),prior=reference.value.items.filter(x=>x.id===entry.id);
  const current=queue.items.filter(x=>x.id===entry.id);
  assert.equal(base.length,1);assert.equal(base[0].state,'TESTING');
  assert.equal(prior.length,1);assert.equal(current.length,1);
  assert.deepEqual(current[0],prior[0],'coffee selected row differs from immutable reviewed queue');
  const row=current[0];
  assert.equal(row.state,'TESTING');assert.equal(row.merged_source_sha,entry.merge);
  const owned=Object.keys(entry.paths).filter(p=>p.startsWith('src/server/')).sort();
  if(entry.id!=='DIC-Q-33-r424-kati-selected-h1-free-richtext')assert.deepEqual([...row.scope_paths].sort(),owned);
  row.scope_paths=owned;
  row.ci_runs=[...entry.runs];
  row.tests.push('Independent #3889 exact merged-source native approval/validate/cloud/mobile and selected official afterproof verified. Historical failed/prechange receipts remain in prior tests and frozen queue '+s.reference_queue+'. Candidate source is independently reconstructed from the selected actual first-parent deltas; five exact candidate SUCCESS checks remain mandatory.');
 }
 const proof=reconstructCoffeeSelectedQa(s,{dev:m.development_source_sha,readGitText,sourceObjectAt,
  firstParentChangedPaths,firstParentPatch,readParents,isAncestor});
 const wanted={kind:'DIC-REVIEWED-COFFEE-SOURCE-COMPONENT-3889-V1',published_source_sha:s.published,
  reference_source_sha:s.reference,reference_queue_blob:s.reference_queue,development_source_sha:m.development_source_sha,
  selected_ids:ids,source_merges:s.sources.map(x=>({id:x.id,merge:x.merge,parent:x.parent,paths:x.paths})),
  reviewed_relocations:s.r408_relocation?[s.r408_relocation]:[],
  reconstructed_objects:proof.objects,publication_authorized:false,ready_certified:false};
 const {identity_sha256,...recorded}=m.reviewed_coffee_source_component||{};
 assert.deepEqual(recorded,wanted,'coffee manifest cannot replace independent source proof');
 assert.equal(identity_sha256,createHash('sha256').update(JSON.stringify(recorded)).digest('hex'));
 return {...proof,queue};
}
