// Nonpublishing pre-Publish READY source candidate rehearsal (#3347).
// HEAD/tree Git object writes are local-only; NEVER pushes, grants or deploys.
import {execFileSync} from 'node:child_process';
import {appendFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {stageReadyOnlyCandidate} from './stage-ready-only-candidate.mjs';
import {deployableChangedPaths} from './release-queue.mjs';
const SHA=/^[a-f0-9]{40}$/;
const git=args=>execFileSync('git',args,{encoding:'utf8',timeout:25000,
 maxBuffer:12_000_000,stdio:['ignore','pipe','pipe']}).trim();
export function deriveProactivePinPaths(queue,{developmentSourceSha,changedPaths,
 sourceObjectAt,isAncestor}={}){
 if(!SHA.test(developmentSourceSha||'')||typeof sourceObjectAt!=='function'||
    typeof isAncestor!=='function'||!Array.isArray(changedPaths)||
    !Array.isArray(queue?.items))throw Error('Proactive READY source proof unavailable');
 const selected=queue.items.filter(i=>i.state==='READY'), pins=[];
 for(const path of deployableChangedPaths(changedPaths)){
  const chosen=selected.filter(i=>i.scope_paths?.includes(path));
  if(!chosen.length)continue; // stage separately rejects untracked changes
  const competing=queue.items.filter(i=>i.state!=='READY'&&i.state!=='DEPLOYED'&&
   i.scope_paths?.includes(path));
  if(!competing.length)continue;
  const allUnmerged=competing.every(i=>!SHA.test(i.merged_source_sha||''));
  if(allUnmerged){
   const tips=chosen.filter(tip=>chosen.every(owner=>owner===tip||
    isAncestor(owner.merged_source_sha,tip.merged_source_sha)===true));
   if(tips.length===1){
    const frozen=sourceObjectAt(tips[0].merged_source_sha,path);
    if(frozen&&frozen===sourceObjectAt(developmentSourceSha,path))continue;
   }
  }
  pins.push(path); // ambiguous, merged, missing or drifted source: explicit pin/HOLD
 }
 return pins.sort();
}
function sourceObjectAt(ref,path){
 const entries=git(['ls-tree','-z',ref,'--',path]).split('\0').filter(Boolean);
 if(!entries.length)return null;
 if(entries.length!==1)throw Error('Ambiguous Git object: '+path);
 const match=/^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/.exec(entries[0]);
 if(!match||match[3]!==path)throw Error('Unsafe Git source mode/path: '+path);
 return match[1]+':'+match[2];
}
function isAncestor(a,b){
 if(!SHA.test(a||'')||!SHA.test(b||''))throw Error('Missing exact ancestry ref');
 try{git(['merge-base','--is-ancestor',a,b]);return true;}
 catch(error){if(error.status===1)return false;throw Error('Cannot read Git ancestry '+a+' -> '+b);}
}
export function prevalidateReadyQueue(){
 const dev=git(['rev-parse','refs/remotes/origin/development/backend-foundation']);
 const release=git(['rev-parse','refs/remotes/origin/release/production']);
 if(!SHA.test(dev)||!SHA.test(release))throw Error('Live immutable development/release refs missing');
 const queue=JSON.parse(git(['show',dev+':docs/RELEASE_QUEUE.json']));
 const ledger=JSON.parse(git(['show',release+':docs/RELEASE_CONSUMPTION.json']));
 const baseline=ledger.consumed?.at(-1)?.tested_source_sha;
 if(!SHA.test(baseline||'')||baseline!==queue.published_base?.tested_source_sha)
  throw Error('Queue published baseline differs from latest real one-use release');
 const ids=(queue.items||[]).filter(i=>i.state==='READY').map(i=>i.id).sort();
 if(ids.length===0)throw Error('No READY feature sources to prevalidate');
 const changed=git(['diff','--name-only','--no-renames',baseline,dev]).split(/\r?\n/).filter(Boolean);
 const pins=deriveProactivePinPaths(queue,{developmentSourceSha:dev,changedPaths:changed,
  sourceObjectAt,isAncestor});
 // createLocalRef:false means NO local/remote branch and NO candidate CI.
 // No source/test/feature status is promoted by this rehearsal.
 const probe=stageReadyOnlyCandidate({developmentSourceSha:dev,
  selectedIds:ids,pinnedReadyPaths:pins,branch:'release-candidates/prevalidation-'+dev.slice(0,12),
  createLocalRef:false});
 return {status:'SOURCE_TREE_PREFLIGHT_PASS_CANDIDATE_CI_NOT_RUN',development_sha:dev,
  baseline_sha:baseline,ready_item_count:ids.length,candidate_local_object:probe.candidate_sha,
  source_risk:probe.manifest.risk_classification,pinned_paths:pins,
  restored_unfinished_count:probe.plan.restored_paths.length,
  requirement:'Exact frozen source five-CI candidate proof and NEW owner Publish still required'};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 try{const report=prevalidateReadyQueue();console.log('[DIC prepublish] '+JSON.stringify(report));
  if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,
   '## READY source-only nonpublishing preflight\n\nStatus: '+report.status+
   '\n\nDevelopment: '+report.development_sha+
   '\n\nREADY source entries: '+report.ready_item_count+
   '\n\nFive-CI source-bound release candidate **NOT certified**; no publication or provider action.\n');
 }catch(error){
  const msg=String(error.message||error).slice(0,3000);
  console.error('[DIC prepublish] HOLD: '+msg);
  if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,
   '## READY source-only nonpublishing HOLD\n\n'+msg+'\n\nNo publication or provider action occurred.\n');
  process.exitCode=2;
 }
}
