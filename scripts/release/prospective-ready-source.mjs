// #3889 owner-authorized two-phase preparation of a prospective READY source.
// The proposed queue is NEVER written to live development by this module.
// It is not certification, a release grant, publication, or proof of five CI jobs.
import {createHash} from 'node:crypto';
import {deployableChangedPaths,queueSchemaErrors} from './release-queue.mjs';
export const BASELINE_DEV_SHA='d9fc859d81a23e10ee2cd0e1a37013b93a4980e5';
export const BASELINE_QUEUE_BLOB='46304f47eb0e78fac8c7845155af86080900b3c4';
const SHA=/^[a-f0-9]{40}$/;
const sorted=xs=>[...new Set(xs)].sort();
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// R399 is a narrow source fix, not certification of the parent original603 audit.
// Its scoped specialist afterproof (#3678/#3685, exact job 137103214703) was
// independently read, including actual selected #99 producer and no conflicts.
// Match this exact audit-only marker, source and test bytes and original CI IDs.
// All other substantive blockers remain hard HOLD. This is preview only;
// actual five native frozen-candidate jobs and publisher verification still apply.
const R399_ID='DIC-Q-33-r399-original99-producer-tenure-precision';
const R399_PARENT_AUDIT='Original603 603 selected current identities/lot/source manual semantic adjudication unfinished, #33 OPEN; related #267 V2/#96 scoped separately.';
const R399_MERGE='513f98ac06cdd0fe569390354420158458342859';
const R399_TESTED='f06e3f7c4143c9f9b8409bed7d062c16a0269a23';
const R399_PATH='src/server/coffee-narrative-evidence.mjs';
const R399_TEST='tests/coffee-issue33-r399-keller-tenure.test.mjs';
const R399_REQUIRED_RUNS=[44987903105,44987902345,44987902359,44987902371,44988168022,44988168102,44988168054,44988168083];
function reviewedParentAuditOnly({original,current,marker,developmentSourceSha,sourceObjectAt,firstParentChangedPaths,isAncestor}){
 if(marker!==R399_PARENT_AUDIT||original.id!==R399_ID||current.id!==R399_ID||
    original.issue!==33||current.issue!==33||current.pr!==3678||
    original.merged_source_sha!==R399_MERGE||current.merged_source_sha!==R399_MERGE||
    !same(current.scope_paths,[R399_PATH])||!original.blockers.includes(marker)||
    !R399_REQUIRED_RUNS.every(id=>original.ci_runs.includes(id)&&current.ci_runs.includes(id)))return false;
 try{
  const changed=firstParentChangedPaths(R399_MERGE);
  if(!same(sorted(deployableChangedPaths(changed)),[R399_PATH])||
     !changed.includes(R399_TEST)||isAncestor(R399_MERGE,developmentSourceSha)!==true)return false;
  for(const [path,object] of [[R399_PATH,'100644:3de11626496a0b698e558ec8929f0158e3083b0a'],[R399_TEST,'100644:16c4d572ecd43860a9cd4f1a7f2baffd670382ee']]){
   if([R399_MERGE,R399_TESTED,developmentSourceSha].some(ref=>sourceObjectAt(ref,path)!==object))return false;
  }
  return true;
 }catch{return false;}
}

// #3889: the original stale-family row has TWO real source merges, not a
// fictitious single first-parent diff. Keep its historical second merge
// anchor and require independently observed Git parents, changed paths,
// objects and selected fixture chronology for BOTH sources. The current
// published runner/coverage and fixtures are retained and actually executed;
// this proof grants neither READY nor publication.
const STALE_FAMILY_ID='DIC-Q-509-stale-family-statistics-reconcile';
const STALE_FAMILY_PUBLISHED='2d22d448160d428a977f06482323646b92818fcf';
const STALE_FAMILY_PATHS=[
 'supabase/migrations/20261119120000_dic_reconcile_stale_personal_family_stats.sql',
 'supabase/migrations/20261119122000_dic_reconcile_all_personal_family_derived_stats.sql',
 'supabase/tests/family_statistics_historical_reconcile_pre.sql',
 'supabase/tests/family_statistics_historical_reconcile_post.sql',
 'supabase/tests/family_statistics_complete_reconcile_post.sql',
 'scripts/audit/isolated-sql-regression.sh',
 'tests/sql-runner-coverage.test.mjs'
];
const STALE_FAMILY_STEPS=[
 {merge:'a45bb63ffd8a3eee164828c3c81e63baa6a8f155',
  parents:['5eca094cf069b820e9cbfd927f7dc6469e2e84fa','89fcc5a79855b0a44d77e787aca8b33dbf043688'],
  before:[null,null,null,null,null,'ff048e4e1e68cfeb73b82c922148683813107ad9','ffafb78bdaf9751696d2b6b948857c79abd66b1a'],
  after:['8b66a860e6dba420c447d0c9de13d7e69e53879c',null,'2573be7360c184b33fa6f44609e18d7e25c60178','a64c72781017301d4b547842099f09c8a01e25d9',null,'32e169dda9f3a297656198b9a7e60a48322fdb86','6035e6e4af92722e279c5376ba3fd75ed174c41c'],
  runs:[44519926449,44519926537,44519926388,44519926461]},
 {merge:'1def2c9d6573297c406192b413ffc3e7620ffe7a',
  parents:['1521edf9c6a81ce80253a217dcf08d5c0b0b5f83','0977a43e4a6eb15c8bb1e33de59ed44577f364c2'],
  before:['8b66a860e6dba420c447d0c9de13d7e69e53879c',null,'2573be7360c184b33fa6f44609e18d7e25c60178','a64c72781017301d4b547842099f09c8a01e25d9',null,'32e169dda9f3a297656198b9a7e60a48322fdb86','6035e6e4af92722e279c5376ba3fd75ed174c41c'],
  after:['8b66a860e6dba420c447d0c9de13d7e69e53879c','26b06be50ebb0c823ec6a98a0015963925dcc6f0','730b789570f85ffb085bb74c0011408bb7f62c9f','a64c72781017301d4b547842099f09c8a01e25d9','7013829d296a2d6b1a9a450374285ab8738169f4','526ccf9a276acee21e4362cacf8a2fda69b8c8d2','587d36c5931b1c14220914bd32460af5690984e9'],
  runs:[44526403238,44526403147,44526403127,44526403259]}
];
export function reviewedStaleFamilyComposite({row,developmentSourceSha,publishedSourceSha,
 readParents,isAncestor,firstParentChangedPaths,sourceObjectAt}={}){
 if(row?.id!==STALE_FAMILY_ID)return null;
 const hold=why=>{throw Error('PROSPECTIVE_BATCH_HOLD: stale-family composite '+why);};
 const [first,last]=STALE_FAMILY_STEPS,paths=STALE_FAMILY_PATHS;
 if(row.issue!==509||row.merged_source_sha!==last.merge||
    !Array.isArray(row.scope_paths)||!same(sorted(row.scope_paths),paths.slice(0,2))||
    row.scope_paths.length!==2||publishedSourceSha!==STALE_FAMILY_PUBLISHED||
    !SHA.test(developmentSourceSha||'')||
    [readParents,isAncestor,firstParentChangedPaths,sourceObjectAt].some(fn=>typeof fn!=='function'))
  hold('exact row, published base or Git readers missing');
 if(!Array.isArray(row.ci_runs)||!STALE_FAMILY_STEPS.flatMap(s=>s.runs).every(run=>row.ci_runs.includes(run)))
  hold('both original exact native run receipts required');
 if(isAncestor(first.merge,last.parents[0])!==true||isAncestor(last.merge,developmentSourceSha)!==true)
  hold('source ancestry unavailable');
 const object=blob=>blob===null?null:'100644:'+blob;
 const steps=[];
 for(const s of STALE_FAMILY_STEPS){
  if(!same(readParents(s.merge),s.parents))hold('exact ordered parents mismatch '+s.merge);
  const changed=firstParentChangedPaths(s.merge);
  const expected=paths.filter((_,i)=>s.before[i]!==s.after[i]).sort();
  if(!Array.isArray(changed)||changed.some(p=>typeof p!=='string')||
     !same(changed.filter(p=>!p.startsWith('docs/')).sort(),expected))
   hold('first-parent executable inventory mismatch '+s.merge);
  for(const [i,path] of paths.entries()){
   if(sourceObjectAt(s.parents[0],path)!==object(s.before[i])||
      sourceObjectAt(s.merge,path)!==object(s.after[i]))
    hold('first-parent object mismatch '+s.merge+' '+path);
  }
  steps.push({merge_sha:s.merge,first_parent_sha:s.parents[0],
   changed_paths:expected,run_ids:[...s.runs]});
 }
 // The first migration is unchanged in the second merge; require both
 // individually introduced migrations absent from publication and exact live
 // bytes, not just the second merge containing the first file.
 if(!same(first.after,last.before))hold('historical object chain discontinuity');
 const final=[...last.after];
 final[5]='76578af1b7a2a9acce39802e2db933a8af9d0d10';
 final[6]='9550fd21ff0edc93adbeed716e657a504a41d2e9';
 for(const [i,path] of paths.entries()){
  if(sourceObjectAt(developmentSourceSha,path)!==object(final[i])||
     sourceObjectAt(publishedSourceSha,path)!==object(i<2?null:final[i]))
   hold('live/published object drift '+path);
 }
 return {id:row.id,source_merges:steps,deployable_paths:paths.slice(0,2),
  source_objects:Object.fromEntries(paths.map((path,i)=>[path,object(final[i])]))};
}

export function proposeProspectiveReadyQueue(args={}){
 if(args.selectedId===STALE_FAMILY_ID)throw Error('PROSPECTIVE_READY_HOLD: stale-family requires reviewed composite batch source');
 return proposeProspectiveReadyQueueInternal(args,null);
}
function proposeProspectiveReadyQueueInternal({baselineQueue,liveQueue,selectedId,
 developmentSourceSha,firstParentChangedPaths,isAncestor,sourceObjectAt}={},sharedProof=null){
 const hold=why=>{throw Error('PROSPECTIVE_READY_HOLD: '+why);};
 if(!SHA.test(developmentSourceSha||'')||typeof selectedId!=='string'||
   typeof firstParentChangedPaths!=='function'||typeof isAncestor!=='function'||
   typeof sourceObjectAt!=='function')hold('missing exact source Git readers or selected ID');
 if(queueSchemaErrors(baselineQueue).length||queueSchemaErrors(liveQueue).length)
  hold('baseline or live queue schema invalid');
 const frozen=(baselineQueue.items||[]).filter(i=>i.state==='TESTING');
 if(frozen.length!==63||frozen.some(i=>!/^DIC-Q-[0-9]+-/.test(i.id))||
   !same(baselineQueue.published_base,liveQueue.published_base))
  hold('immutable 63-item cohort or published tested source mismatch');
 const frozenIds=sorted(frozen.map(i=>i.id));
 if(frozenIds.length!==63||frozenIds.some(id=>!liveQueue.items.some(i=>i.id===id)))
  hold('baseline ID cohort changed or is missing');
 const original=frozen.find(i=>i.id===selectedId);
 const current=liveQueue.items.find(i=>i.id===selectedId);
 if(!original||!current||original.state!=='TESTING'||current.state!=='TESTING'||
   original.issue!==current.issue||!same(original.scope_paths,current.scope_paths)||
   !current.scope_paths.length||!SHA.test(current.merged_source_sha||'')||
   !current.tests.length||!current.ci_runs.length||
   current.ci_runs.some(id=>!Number.isSafeInteger(id)||id<=0))
  hold('selected original item is not source-tracked TESTING with existing test receipts');
 // No speculative deletion of non-candidate domain defects or actual source failures.
 // The single independently reviewed parent-audit marker is not a defect in R399.
 if(current.blockers.some(b=>!reviewedParentAuditOnly({original,current,marker:b,
   developmentSourceSha,sourceObjectAt,firstParentChangedPaths,isAncestor})&&
   (typeof b!=='string'||
   !(/#3347|candidate.*certification|new owner Publish/i.test(b))||
   /(?:unavailable|failed|auth|external|real hosted|privacy|source mismatch|pending seller)/i.test(b))))
  hold('unresolved substantive blocker requires its specialist before preview');
 let changed;
 try{changed=firstParentChangedPaths(current.merged_source_sha);}catch{
  hold('first-parent source diff missing');
 }
 if(!Array.isArray(changed)||changed.some(x=>typeof x!=='string'))
  hold('invalid first-parent changed-path inventory');
 const owned=deployableChangedPaths(changed);
 if(!owned.length||owned.some(path=>!current.scope_paths.includes(path)))
  hold('first-parent deployable source is absent or not declared');
 try{
  if(isAncestor(current.merged_source_sha,developmentSourceSha)!==true)
   hold('source merge not ancestor of live development');
  const published=liveQueue.published_base.tested_source_sha;
  for(const path of current.scope_paths){
   const merged=sourceObjectAt(current.merged_source_sha,path);
   const exactShared=sharedProof?.get(current.id+'\u0000'+path)===merged;
   if(!/^100(?:644|755):[a-f0-9]{40}$/.test(merged||'')||
     (!exactShared&&merged!==sourceObjectAt(developmentSourceSha,path))||
     merged===sourceObjectAt(published,path))
    hold('selected scope differs from merged source or published bytes: '+path);
  }
 }catch(e){if(String(e.message).includes('PROSPECTIVE_READY_HOLD:'))throw e;
  hold('Git ancestry/blob proof unavailable: '+String(e.message).slice(0,100));}
 const queue=structuredClone(liveQueue),item=queue.items.find(i=>i.id===selectedId);
 item.state='READY';item.blockers=[];
 if(queueSchemaErrors(queue).length)hold('proposed READY queue fails owner schema');
 const others=queue.items.filter(i=>i.id!==selectedId);
 if(!same(others,liveQueue.items.filter(i=>i.id!==selectedId)))
  hold('unexpected nonselected row mutation');
 const identity={baseline_dev_sha:BASELINE_DEV_SHA,
  baseline_queue_blob:BASELINE_QUEUE_BLOB,published_source_sha:queue.published_base.tested_source_sha,
  development_source_sha:developmentSourceSha,selected_id:selectedId,
  merged_source_sha:item.merged_source_sha,source_paths:sorted(item.scope_paths),
  proposed_ready_item:item};
 const fingerprint=createHash('sha256').update(JSON.stringify(identity)).digest('hex');
 return {status:'PROSPECTIVE_ONLY_FIVE_CI_AND_PROMOTION_PENDING',
  publication_authorized:false,ready_certified:false,
  baseline_count:63,selected_id:selectedId,identity_sha256:fingerprint,queue};
}

// Complete first-parent text replay is permitted only for an explicitly co-selected
// chain with actual immutable blob identity. No fuzzy/offset fallback, binary,
// missing or ambiguous context, mode changes, truncated patches or partial result.
export function replayExactTextPatch({before,after,selected,patch,path,beforeObject,afterObject}){
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

function proveSelectedOnlyReplay({path,steps,published,live,publishedRef,developmentSourceSha,sourceTextAt,firstParentPatch}){
 if(typeof sourceTextAt!=='function'||typeof firstParentPatch!=='function')throw Error('missing selected-only Git text/patch readers');
 const exactText=(ref,object)=>{
  if(!/^100(?:644|755):[a-f0-9]{40}$/.test(object||''))throw Error('selected-only replay missing regular Git object');
  const text=sourceTextAt(ref,path);
  if(typeof text!=='string')throw Error('selected-only replay missing text');
  const bytes=Buffer.from(text,'utf8');
  const hash=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  if(hash!==object.slice(7))throw Error('selected-only replay text Git object mismatch');
  return text;
 };
 let selected=exactText(publishedRef,published);
 for(const step of steps){
  if(step.parent_object?.slice(0,6)!==published.slice(0,6)||step.object?.slice(0,6)!==published.slice(0,6))throw Error('selected-only replay mode mismatch');
  selected=replayExactTextPatch({path,selected,before:exactText(step.merge_sha+'^',step.parent_object),
   after:exactText(step.merge_sha,step.object),patch:firstParentPatch(step.merge_sha,path),
   beforeObject:step.parent_object,afterObject:step.object});
 }
 if(live.slice(0,6)!==published.slice(0,6)||selected!==exactText(developmentSourceSha,live))throw Error('selected-only replay does not equal live Git bytes');
}

// The reviewed exact direct-child corrections extend the original source
// ownership, rather than replacing its first-parent merge attribution.
// They are NOT a certificate or a source pin; the full chain still has to
// reproduce the live selected source, and the independent QA checks its tests.
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
export function reviewedSelectedAmendment({row,developmentSourceSha,readParents,isAncestor,firstParentChangedPaths,sourceObjectAt}){
 const entry=REVIEWED_AMENDMENTS.find(x=>x.id===row.id&&x.parent===row.merged_source_sha);
 if(!entry)return null;
 const hold=why=>{throw Error('PROSPECTIVE_BATCH_HOLD: direct-child selected amendment '+why);};
 if(typeof readParents!=='function'||!same(readParents(entry.merge),[entry.parent])||
   isAncestor(entry.merge,developmentSourceSha)!==true)
  hold('missing exact sole parent/ancestry');
 const initial=firstParentChangedPaths(entry.parent);
 const paths=sorted(firstParentChangedPaths(entry.merge).filter(p=>!p.startsWith('docs/')));
 if(!same(paths,sorted(Object.keys(entry.objects)))||!paths.every(path=>initial.includes(path)))
  hold('unknown or unowned changed path');
 for(const path of paths){
  if(sourceObjectAt(entry.merge,path)!==entry.objects[path]||sourceObjectAt(entry.parent,path)===entry.objects[path])
   hold('exact object/first-parent mismatch '+path);
  if(deployableChangedPaths([path]).length&&!row.scope_paths.includes(path))hold('amendment outside original deployable scope '+path);
 }
 return {id:row.id,parent:entry.parent,merge:entry.merge,paths,objects:entry.objects};
}

// Shared prospective TESTING owners can be co-selected only when actual
// first-parent Git objects form one uninterrupted byte chain from the published
// object to the exact current development object. This is preparation only,
// not a READY certificate, test/workflow exemption or publisher admission.
// Retained READY overlaps and ANY excluded unfinished owner remain HOLD.
function proveSharedProspectiveSources({selected,originalReady,liveQueue,
 developmentSourceSha,firstParentChangedPaths,isAncestor,sourceObjectAt,sourceTextAt,firstParentPatch,amendments=new Map()}){
 const hold=why=>{throw Error('PROSPECTIVE_BATCH_HOLD: shared selected source needs reviewed chronology: '+why);};
 const byPath=new Map();
 for(const row of [...originalReady,...selected]){
  for(const path of row.scope_paths){
   const owners=byPath.get(path)||[];owners.push(row);byPath.set(path,owners);
  }
 }
 const proof=new Map(),chains=[];
 for(const [path,owners] of [...byPath.entries()].sort(([a],[b])=>a.localeCompare(b))){
  if(owners.length<2)continue;
  // Already-certified co-owners do not participate in a NEW prospective
  // source chain. Their unchanged records and frozen candidate bytes remain
  // mandatory in staging and independent selected QA verification. A mixed
  // retained/new path must still HOLD; never treat a new owner as retained.
  if(owners.every(row=>row.state==='READY'))continue;
  if(owners.some(row=>row.state!=='TESTING')||
     typeof sourceObjectAt!=='function'||typeof isAncestor!=='function'||
     new Set(owners.map(row=>row.merged_source_sha)).size!==owners.length)
   hold(path);
  const remaining=[...owners],ordered=[];
  while(remaining.length){
   const earliest=remaining.filter(row=>remaining.every(other=>row===other||
    isAncestor(row.merged_source_sha,other.merged_source_sha)===true));
   if(earliest.length!==1)hold('ambiguous merge ancestry '+path);
   const row=earliest[0];ordered.push(row);remaining.splice(remaining.indexOf(row),1);
  }
  let previous=sourceObjectAt(liveQueue.published_base.tested_source_sha,path);
  const published=previous,steps=[];
  let discontinuous=false;
  for(const row of ordered){
   const merge=row.merged_source_sha;
   if(!SHA.test(merge||'')||isAncestor(merge,developmentSourceSha)!==true||
      !firstParentChangedPaths(merge)?.includes(path))
    hold('missing first-parent ownership '+row.id+' '+path);
   const before=sourceObjectAt(merge+'^',path),after=sourceObjectAt(merge,path);
   if(before!==previous)discontinuous=true;
   if(!/^100(?:644|755):[a-f0-9]{40}$/.test(after||'')||
      after===before||after===published)
    hold('unselected or discontinuous bytes '+row.id+' '+path);
   proof.set(row.id+'\u0000'+path,after);
   steps.push({id:row.id,merge_sha:merge,parent_object:before,object:after});
   previous=after;
   const correction=amendments.get(row.id);
   if(correction?.paths.includes(path)){
    const amended=sourceObjectAt(correction.merge,path);
    if(sourceObjectAt(correction.merge+'^',path)!==previous||amended!==correction.objects[path]||amended===previous)
     hold('direct-child amendment discontinuity '+row.id+' '+path);
    steps.push({id:row.id,merge_sha:correction.merge,parent_object:previous,object:amended});
    previous=amended;
   }
  }
  const live=sourceObjectAt(developmentSourceSha,path);
  if(previous!==live)hold('unreviewed live tip '+path);
  if(discontinuous){
   try{proveSelectedOnlyReplay({path,steps,published,live,publishedRef:liveQueue.published_base.tested_source_sha,
    developmentSourceSha,sourceTextAt,firstParentPatch});}
   catch(e){hold(String(e.message).slice(0,300));}
  }
  chains.push({path,published_object:published,steps,...(discontinuous?{selected_only_replay:true}:{})});
 }
 return {proof,chains};
}

/**
 * #3889: read-only, source-proven expansion of a live READY selection.
 * Every added item must independently pass the existing strict preview gate.
 * Shared TESTING paths require exact first-parent continuity or independently reconstructed selected-only replay. Retained
 * READY or excluded unfinished overlaps still require separate isolation proof.
 * Neither the returned queue nor its fingerprint is a publisher certificate.
 */
export function proposeDisjointProspectiveReadyBatch({selectedIds,...readers}={}){
 const hold=why=>{throw Error('PROSPECTIVE_BATCH_HOLD: '+why);};
 if(!Array.isArray(selectedIds)||!selectedIds.length||
    selectedIds.some(id=>typeof id!=='string'||!/^DIC-Q-[0-9]+-[a-z0-9-]+$/.test(id))||
    new Set(selectedIds).size!==selectedIds.length)
  hold('explicit unique original TESTING IDs required');
 const {liveQueue,baselineQueue,developmentSourceSha,firstParentChangedPaths}=readers;
 if(queueSchemaErrors(liveQueue).length||queueSchemaErrors(baselineQueue).length||
    !SHA.test(developmentSourceSha||'')||typeof firstParentChangedPaths!=='function')
  hold('exact queue/source readers unavailable');
 const ordered=sorted(selectedIds);
 const originalReady=liveQueue.items.filter(i=>i.state==='READY');
 const selected=ordered.map(id=>liveQueue.items.find(i=>i.id===id));
 if(selected.some(i=>!i||i.state!=='TESTING'))hold('selected item is not live TESTING');
 const newPaths=new Set(selected.flatMap(i=>i.scope_paths));
 for(const i of liveQueue.items){
  if(ordered.includes(i.id)||!['TESTING','IN_PROGRESS','BLOCKED'].includes(i.state))continue;
  if(i.scope_paths.some(path=>newPaths.has(path)))
   hold('unfinished overlapping owner requires reviewed source isolation: '+i.id);
 }
 const amendments=new Map(),composites=new Map();
 for(const row of selected){
  const composite=reviewedStaleFamilyComposite({...readers,row,publishedSourceSha:liveQueue.published_base.tested_source_sha});
  if(composite)composites.set(row.id,composite);
  const proof=reviewedSelectedAmendment({...readers,row});
  if(proof)amendments.set(row.id,proof);
 }
 let shared;
 try{shared=proveSharedProspectiveSources({...readers,selected,originalReady,amendments});}
 catch(e){if(String(e.message).includes('PROSPECTIVE_BATCH_HOLD:'))throw e;hold('shared source Git proof unavailable: '+String(e.message).slice(0,160));}
 let queue=structuredClone(liveQueue);
 const proofs=[];
 for(const id of ordered){
  const original=selected.find(i=>i.id===id);
  const composite=composites.get(id);
  const actual=composite?composite.source_merges.flatMap(s=>s.changed_paths):firstParentChangedPaths(original.merged_source_sha);
  if(!Array.isArray(actual)||!same(sorted(deployableChangedPaths(actual)),sorted(original.scope_paths)))
   hold('declared scope does not equal first-parent deployable paths: '+id);
  const p=proposeProspectiveReadyQueueInternal({...readers,liveQueue:queue,selectedId:id},shared.proof);
  queue=p.queue;
  proofs.push({id,identity_sha256:p.identity_sha256});
 }
 const retained=queue.items.filter(i=>!ordered.includes(i.id));
 if(!same(retained,liveQueue.items.filter(i=>!ordered.includes(i.id))))
  hold('nonselected record changed');
 const selectedReadyItems=queue.items.filter(i=>i.state==='READY').sort((a,b)=>a.id.localeCompare(b.id));
 const identity={kind:shared.chains.length?'DIC-PROSPECTIVE-CHRONOLOGICAL-BATCH-3889-V2':'DIC-PROSPECTIVE-DISJOINT-BATCH-3889-V1',baseline_dev_sha:BASELINE_DEV_SHA,
  baseline_queue_blob:BASELINE_QUEUE_BLOB,published_base:queue.published_base,
  development_source_sha:developmentSourceSha,added_ids:ordered,
  retained_ready_ids:originalReady.map(i=>i.id).sort(),selected_ready_records:selectedReadyItems,
  preview_proofs:proofs,...(shared.chains.length?{shared_source_chains:shared.chains}:{}),
  ...(amendments.size?{selected_amendments:[...amendments.values()]}:{}),
  ...(composites.size?{selected_composite_sources:[...composites.values()]}:{})};
 return {...identity,identity_sha256:createHash('sha256').update(JSON.stringify(identity)).digest('hex'),
  status:'PROSPECTIVE_BATCH_PLAN_ONLY',publication_authorized:false,ready_certified:false,queue};
}
