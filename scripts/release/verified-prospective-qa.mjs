// Read-only Git proof for the same independent selected-path verifier used by
// nonpublishing pre-certification. An opaque in-process receipt cannot be
// manufactured from a manifest flag, caller-provided map or CI conclusion.
import {execFileSync} from 'node:child_process';
import {generalBatchQaGeneration} from './reviewed-general-batch-qa.mjs';
import {reviewedStaleFamilyComposite} from './prospective-ready-source.mjs';
import {reviewedMemberBrokerComposite,reviewedMemberHistoricalCheckNames} from './reviewed-member-broker-source.mjs';
import {reviewedCiOptimizationComposite,reviewedCiHistoricalCheckNames} from './reviewed-ci-optimization-source.mjs';
const SHA=/^[a-f0-9]{40}$/;
const OBJ=/^100(?:644|755):[a-f0-9]{40}$/;
const safePath=p=>typeof p==='string'&&/^[A-Za-z0-9_.\/-]+$/.test(p)&&!p.includes('..');
const sorted=xs=>[...new Set(xs)].sort();
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const receipts=new WeakMap();
export function runIndependentProspectiveQa({repoDir=process.cwd(),candidateSha}={}){
 if(!SHA.test(candidateSha||''))throw Error('Exact prospective QA candidate SHA required');
 const program=`
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const sha=process.argv[1];
const git=(args)=>execFileSync('git',args,{encoding:'utf8',timeout:45000,maxBuffer:8*1024*1024,stdio:['ignore','pipe','pipe']});
const ref=r=>r==='HEAD'?sha:r;
const readGitText=(r,p)=>git(['show',ref(r)+':'+p]);
const sourceObjectAt=(r,p)=>{
 const rows=git(['ls-tree','-z',ref(r),'--',p]).split('\\0').filter(Boolean);
 if(!rows.length)return null;
 assert.equal(rows.length,1);
 const x=/^(100644|100755) blob ([a-f0-9]{40})\\t(.+)$/.exec(rows[0]);
 assert.ok(x&&x[3]===p);
 return x[1]+':'+x[2];
};
const readParents=r=>git(['rev-list','--parents','-n','1',r]).trim().split(/\\s+/).slice(1);
const isAncestor=(a,b)=>{try{git(['merge-base','--is-ancestor',a,b]);return true;}catch(e){if(e.status===1)return false;throw e;}};
const firstParentChangedPaths=r=>git(['diff','--name-only','--no-renames',r+'^',r]).split(/\\r?\\n/).filter(Boolean);
const firstParentPatch=(r,p)=>git(['diff','--no-color','--no-ext-diff','--no-textconv','--no-renames','--full-index','--no-indent-heuristic','--diff-algorithm=myers','--unified=3','--src-prefix=a/','--dst-prefix=b/',r+'^',r,'--',p]);
const manifest=JSON.parse(readGitText(sha,'docs/RELEASE_CANDIDATE.json'));
const queue=JSON.parse(readGitText(sha,'docs/RELEASE_QUEUE.json'));
assert.deepEqual(readParents(sha),[manifest.development_source_sha]);
const source=readGitText(sha,'tests/helpers/release-published-restoration.mjs');
assert.equal(sourceObjectAt(sha,'tests/helpers/release-published-restoration.mjs'),sourceObjectAt(manifest.development_source_sha,'tests/helpers/release-published-restoration.mjs'));
const {verifyGeneralProspectiveBatchReadyTestScope:verify}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const paths=verify({manifest,queue,branch:'refs/heads/'+manifest.candidate_branch,commitParent:readParents(sha)[0],readGitText,sourceObjectAt,readParents,isAncestor,firstParentChangedPaths,firstParentPatch});
assert.ok(Array.isArray(paths)&&paths.length>0,'Independent selected QA source proof required');
console.log(JSON.stringify({paths,objects:Object.fromEntries(paths.map(path=>[path,sourceObjectAt(sha,path)]))}));
`;
 try{return JSON.parse(execFileSync(process.execPath,['--input-type=module','--eval',program,candidateSha],{
  cwd:repoDir,encoding:'utf8',timeout:240000,maxBuffer:4*1024*1024,stdio:['ignore','pipe','pipe']}).trim());}
 catch(e){throw Error('Independent prospective selected QA scope HOLD: '+String(e.stderr||e.message).slice(-2500));}
}


export function proveGeneralFrozenQa({candidateSha,candidateBranch,publishedSourceSha,
 queue,prospectiveBatchPlan:p,repoDir=process.cwd()}={}){
 const hold=why=>{throw Error('Frozen prospective publisher QA HOLD: '+why);};
 if(!SHA.test(candidateSha||'')||!SHA.test(publishedSourceSha||'')||
  !/^release-candidates\/prospectbatch3889-[a-f0-9]{20}$/.test(candidateBranch||'')||
  !p||p.status!=='PROSPECTIVE_BATCH_PLAN_ONLY'||p.ready_certified!==false||
  p.publication_authorized!==false||!same(p.queue,queue)||
  p.published_base?.tested_source_sha!==publishedSourceSha)
  hold('exact replayed prospective plan, queue and candidate identity required');
 const git=args=>execFileSync('git',args,{cwd:repoDir,encoding:'utf8',timeout:45000,maxBuffer:8*1024*1024,stdio:['ignore','pipe','pipe']});
 const sourceObjectAt=(ref,path)=>{
  if(!/^[a-f0-9]{40}(?:\^)?$/.test(ref||'')||!safePath(path))hold('unsafe Git source lookup');
  const rows=git(['ls-tree','-z',ref,'--',path]).split('\0').filter(Boolean);
  if(!rows.length)return null;
  if(rows.length!==1)hold('ambiguous source path '+path);
  const x=/^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/.exec(rows[0]);
  if(!x||x[3]!==path)hold('invalid source object '+path);
  return x[1]+':'+x[2];
 };
 const readParents=sha=>git(['rev-list','--parents','-n','1',sha]).trim().split(/\s+/).slice(1);
 const isAncestor=(a,b)=>{try{git(['merge-base','--is-ancestor',a,b]);return true;}catch(e){if(e.status===1)return false;throw e;}};
 const firstParentChangedPaths=sha=>git(['diff','--name-only','--no-renames',sha+'^',sha]).split(/\r?\n/).filter(Boolean);
 const manifest=JSON.parse(git(['show',candidateSha+':docs/RELEASE_CANDIDATE.json']));
 const dev=manifest.development_source_sha;
 const actualRaw=git(['show',candidateSha+':docs/RELEASE_QUEUE.json']);
 const selected=queue.items.filter(i=>i.state==='READY');
 if(selected.length<3||new Set(selected.map(i=>i.id)).size!==selected.length||
  !SHA.test(dev||'')||!same(readParents(candidateSha),[dev])||dev!==p.development_source_sha||
  manifest.candidate_branch!==candidateBranch||manifest.published_source_sha!==publishedSourceSha||
  manifest.publication_authorized!==false||
  manifest.prospective_ready_batch_preview?.identity_sha256!==p.identity_sha256||
  !same(manifest.selected_ready_item_ids,sorted(selected.map(i=>i.id)))||
  actualRaw!==JSON.stringify(queue,null,2)+'\n')
  hold('actual Git parent, candidate queue, selection or plan identity mismatch');
 // Verify every reviewed support blob before executing ANY candidate helper.
 const generation=generalBatchQaGeneration(dev,sourceObjectAt);
 if(!isAncestor(generation.fix,dev))hold('reviewed QA fix absent from candidate parent ancestry');
 for(const [path,blob] of generation.support)
  if(sourceObjectAt(candidateSha,path)!=='100644:'+blob)hold('candidate reviewed QA support drift '+path);
 const independent=runIndependentProspectiveQa({repoDir,candidateSha});
 if(!Array.isArray(independent?.paths)||!independent.paths.length||
  !same(independent.paths,sorted(independent.paths))||
  !same(sorted(Object.keys(independent.objects||{})),independent.paths))
  hold('invalid independent selected path inventory');
 for(const path of independent.paths){
  const object=independent.objects[path];
  if(!safePath(path)||(object!==null&&!OBJ.test(object||''))||
   sourceObjectAt(candidateSha,path)!==object)
   hold('independent selected object mismatch '+path);
 }
 const rows=new Map();
 for(const item of selected){
  const composite=reviewedStaleFamilyComposite({row:item,developmentSourceSha:dev,publishedSourceSha,
   readParents,isAncestor,firstParentChangedPaths,sourceObjectAt})||
   reviewedMemberBrokerComposite({row:item,developmentSourceSha:dev,publishedSourceSha,
    readParents,isAncestor,firstParentChangedPaths,sourceObjectAt})||
   reviewedCiOptimizationComposite({row:item,developmentSourceSha:dev,publishedSourceSha,
    readParents,isAncestor,firstParentChangedPaths,sourceObjectAt});
  const changed=composite?sorted(composite.source_merges.flatMap(s=>s.changed_paths)):
   firstParentChangedPaths(item.merged_source_sha);
  const owned=sorted([...item.scope_paths,...changed.filter(path=>!path.startsWith('docs/'))]);
  if(owned.some(path=>!Object.hasOwn(independent.objects,path))||
   item.scope_paths.some(path=>!OBJ.test(independent.objects[path]||'')))
   hold('selected row has no exact independent ownership '+item.id);
  rows.set(item.id,{record:JSON.stringify(item),owned:new Set(owned),
   composite:composite?.source_merges||[]});
 }
 const receipt=Object.freeze({});
 receipts.set(receipt,{candidateSha,objects:independent.objects,rows});
 return receipt;
}
function verifiedRow(proof,item,sha){
 const evidence=receipts.get(proof),row=evidence?.rows.get(item?.id);
 return evidence?.candidateSha===sha&&row?.record===JSON.stringify(item)?{evidence,row}:null;
}
export function verifiedSelectedCandidatePath(proof,item,sha,path,actualObject){
 const bound=verifiedRow(proof,item,sha);
 return !!bound&&bound.row.owned.has(path)&&Object.hasOwn(bound.evidence.objects,path)&&
  bound.evidence.objects[path]===actualObject&&
  (OBJ.test(actualObject||'')||(actualObject===null&&!item.scope_paths.includes(path)));
}
export function verifiedSelectedCompositeSources(proof,item,sha){
 const bound=verifiedRow(proof,item,sha);
 if(!bound)throw Error('Unverified candidate row receipt');
 return structuredClone(bound.row.composite);
}

// Historical applicability is issued only by the opaque, independently
// source-proven row receipt. Neither a manifest nor a caller-supplied list
// may remove a check. Frozen-candidate verification always uses all five.
export function verifiedSelectedHistoricalCheckNames(proof,item,sha,step){
 const bound=verifiedRow(proof,item,sha);
 if(!bound||!bound.row.composite.some(x=>JSON.stringify(x)===JSON.stringify(step)))
  throw Error('Unverified historical applicability receipt');
 const member=reviewedMemberHistoricalCheckNames(step);
 if(member)return member;
 if(step?.historical_applicability==='DIC-3889-EXACT-CI-ONLY-1')return reviewedCiHistoricalCheckNames(step);
 if(step?.historical_applicability!==undefined)throw Error('Unknown historical applicability source');
 return ['approval','validate','cloud-tests','mobile-browser-qa','sql'];
}
