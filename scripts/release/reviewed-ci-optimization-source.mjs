// #3889 / #3667: reviewed operational CI is not production workflow content.
// Keep every candidate workflow at exact published bytes. Source/test objects
// below bind the independently tested development implementation; the candidate
// still needs all five native exact-SHA SUCCESS jobs and its full applicable corpus.
const SHA=/^[a-f0-9]{40}$/;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const sorted=xs=>[...new Set(xs)].sort();
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const REVIEW=freeze({
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
});
const MARKER='DIC-3889-EXACT-CI-ONLY-1';
const SOURCE_QA_PATHS=['tests/ci-optimization.test.mjs','tests/fast-pr-check.test.mjs'];
const expectedRuns=()=>[...REVIEW.original_runs,...sorted(REVIEW.steps.flatMap(s=>s.runs).filter(id=>!REVIEW.original_runs.includes(id)))];
const sourceSteps=()=>REVIEW.steps.map(s=>({merge_sha:s.merge,first_parent_sha:s.parents[0],
 changed_paths:[...s.changed],run_ids:[...s.runs],
 ...(s.merge==='426792b245dd6a43c1e528a2e4a9297cc0819601'?{}:{historical_applicability:MARKER})}));
const hold=why=>{throw Error('PROSPECTIVE_BATCH_HOLD: CI optimization '+why);};
export function ciOptimizationReviewFixture(){return structuredClone(REVIEW);}
export function reviewedCiHistoricalCheckNames(step){
 if(step?.historical_applicability!==MARKER||!sourceSteps().some(s=>same(s,step)))
  hold('unreviewed historical applicability');
 return ['approval','validate','cloud-tests','mobile-browser-qa'];
}
export function reviewedCiOptimizationComposite({row,publishedSourceSha,developmentSourceSha,
 readParents,isAncestor,firstParentChangedPaths,sourceObjectAt}={}){
 if(row?.id!==REVIEW.id)return null;
 if(row.issue!==REVIEW.issue||row.pr!==REVIEW.pr||row.merged_source_sha!==REVIEW.merge||
    !same(row.scope_paths,['package.json'])||publishedSourceSha!==REVIEW.published||
    !SHA.test(developmentSourceSha||'')||
    [readParents,isAncestor,firstParentChangedPaths,sourceObjectAt].some(x=>typeof x!=='function'))
  hold('exact row, baseline or Git readers missing');
 if(!same(row.ci_runs,REVIEW.original_runs)&&!same(row.ci_runs,expectedRuns()))hold('original source receipt inventory changed');
 if(isAncestor(REVIEW.source,REVIEW.qa_parent)!==true||isAncestor(REVIEW.qa_parent,developmentSourceSha)!==true)
  hold('reviewed source ancestry missing');
 for(const step of REVIEW.steps){
  if(!same(readParents(step.merge),step.parents)||isAncestor(step.merge,REVIEW.source)!==true)
   hold('historical ordered parents or ancestry mismatch '+step.merge);
  const paths=firstParentChangedPaths(step.merge);
  if(!Array.isArray(paths)||paths.some(p=>typeof p!=='string')||
     !same(paths.filter(p=>!p.startsWith('docs/')&&p!=='AGENTS.md').sort(),step.changed))
   hold('historical executable inventory mismatch '+step.merge);
  for(const path of step.changed)
   if(sourceObjectAt(step.parents[0],path)!==step.before[path]||sourceObjectAt(step.merge,path)!==step.after[path])
    hold('historical first-parent object mismatch '+path);
 }
 // Every final operational source was already exercised together on c26cd...
 // (four applicable PUSH jobs; earlier exact-source SQL and all five candidate
 // jobs remain separate evidence). No later unreviewed source can enter here.
 for(const [path,object] of Object.entries(REVIEW.source_objects)){
  if(sourceObjectAt(REVIEW.source,path)!==object||sourceObjectAt(REVIEW.qa_parent,path)!==object||
     sourceObjectAt(REVIEW.published,path)!==REVIEW.published_objects[path])
   hold('reviewed coherent source/published object mismatch '+path);
  const current=REVIEW.qa_objects[path]??object;
  if(sourceObjectAt(developmentSourceSha,path)!==current)hold('unreviewed development object '+path);
 }
 // This amendment changes two tests only so their operational workflow
 // assertions use the proven source, and their fixture negative case follows
 // actual candidate imports. Their original assertions and runtime stay intact.
 let fix=developmentSourceSha,found=false;
 for(let n=0;n<64&&fix!==REVIEW.qa_parent;n++){
  const parents=readParents(fix);
  if(!Array.isArray(parents)||!parents.length||parents.some(s=>!SHA.test(s)))hold('QA amendment parents unavailable');
  if(SOURCE_QA_PATHS.some(path=>sourceObjectAt(parents[0],path)!==REVIEW.qa_objects[path])){
   if(parents.length!==1||parents[0]!==REVIEW.qa_parent)hold('QA amendment is not the reviewed direct child');
   for(const path of SOURCE_QA_PATHS)
    if(sourceObjectAt(fix,path)!==REVIEW.qa_objects[path]||
       sourceObjectAt(parents[0],path)!==REVIEW.source_objects[path])hold('QA amendment exact objects mismatch');
   const changed=firstParentChangedPaths(fix);
   if(!Array.isArray(changed)||!SOURCE_QA_PATHS.every(p=>changed.includes(p))||
      changed.some(p=>/^(?:site\/|src\/server\/|netlify\/functions\/|supabase\/(?:functions|migrations)\/|package(?:-lock)?\.json$|build_cloud\.mjs$|netlify\.toml$)/.test(p)))
    hold('QA amendment includes production source or omits the reviewed tests');
   found=true;break;
  }
  fix=parents[0];
 }
 if(!found)hold('reviewed QA amendment missing');
 return {id:row.id,source_merges:sourceSteps(),deployable_paths:['package.json'],
  source_objects:{...REVIEW.source_objects,...REVIEW.qa_objects},
  operational_source_sha:REVIEW.source,
  operational_workflows:Object.keys(REVIEW.source_objects).filter(p=>p.startsWith('.github/workflows/')),
  published_workflow_objects:Object.fromEntries(Object.entries(REVIEW.published_objects).filter(([p])=>p.startsWith('.github/workflows/'))),
  qa_amendment_sha:fix,publication_authorized:false,ready_certified:false};
}
export function reconcileReviewedCiReceiptQueue(queue,{selectedIds,...readers}={}){
 if(!Array.isArray(selectedIds)||!selectedIds.includes(REVIEW.id))return null;
 const row=queue?.items?.find(x=>x.id===REVIEW.id);
 if(row?.state!=='TESTING')hold('only selected TESTING receipt reconciliation allowed');
 reviewedCiOptimizationComposite({...readers,row});
 if(same(row.ci_runs,expectedRuns()))return null;
 if(!same(row.ci_runs,REVIEW.original_runs))hold('unexpected pre-reconciliation receipt inventory');
 return applyReviewedCiReceiptDelta(queue);
}
// Pure exact-delta replay for raw publisher queue parity. This proves no source
// or CI by itself; the caller also requires the independently reconstructed plan.
export function applyReviewedCiReceiptDelta(queue){
 const row=queue?.items?.find(x=>x.id===REVIEW.id);
 if(row?.state!=='TESTING'||row.issue!==REVIEW.issue||row.pr!==REVIEW.pr||
    row.merged_source_sha!==REVIEW.merge||!same(row.scope_paths,['package.json'])||
    !same(row.ci_runs,REVIEW.original_runs))hold('immutable receipt replay row changed');
 const output=structuredClone(queue),next=output.items.find(x=>x.id===REVIEW.id);
 next.ci_runs=expectedRuns();
 return {queue:output,receipt:{id:REVIEW.id,source_sha:REVIEW.source,
  added_successful_run_ids:next.ci_runs.slice(REVIEW.original_runs.length)}};
}

// An unselected #3667 keeps the existing full published-test restoration.
// Admit only this exact reviewed compatibility amendment at the separately
// pinned QA generation; never restore or exclude a selected CI assertion.
export function reviewedCiOptimizationUnselectedTest({selectedIds,path,
 developmentSourceSha,publishedSourceSha,qaFixSha,referenceObject,sourceObjectAt}={}){
 const test='tests/ci-optimization.test.mjs';
 if(path!==test||!Array.isArray(selectedIds)||selectedIds.includes(REVIEW.id)||
    publishedSourceSha!==REVIEW.published||!SHA.test(developmentSourceSha||'')||
    !SHA.test(qaFixSha||'')||typeof sourceObjectAt!=='function'||
    referenceObject!==REVIEW.source_objects[test])return false;
 return sourceObjectAt(developmentSourceSha,test)===REVIEW.qa_objects[test]&&
  sourceObjectAt(qaFixSha,test)===REVIEW.qa_objects[test]&&
  sourceObjectAt(REVIEW.qa_parent,test)===REVIEW.source_objects[test]&&
  sourceObjectAt(REVIEW.source,test)===REVIEW.source_objects[test]&&
  sourceObjectAt(publishedSourceSha,test)===REVIEW.published_objects[test];
}
