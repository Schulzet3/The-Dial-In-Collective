import test from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers';
import {readySelectionFingerprint,verifyReadyPromotion,READY_CERT_KIND,
 gitReadyAncestry,githubReadyPromotionReaders} from '../scripts/release/ready-promotion-gate.mjs';

const A='a'.repeat(40),B='b'.repeat(40),C='c'.repeat(40),D='d'.repeat(40);
const item={id:'DIC-Q-100',issue:100,title:'Safe change',owner_source:'owner',
 state:'READY',merged_source_sha:A,scope_paths:['site/cloud/shot.js'],
 tests:['tests/shot.test.mjs'],ci_runs:[6],blockers:[]};
const queue={schema_version:1,authority:'OPS-AUTONOMOUS-BUILD-TEST-QUEUE-20261022',
 published_base:{tested_source_sha:B,release_sha:C,netlify_deploy_id:'netlify'},
 items:[item],history:[]};
const branch='release-candidates/ready3347-12345678901234567890';
const ids=[10,11,12,13];
const certificate={schema_version:1,kind:READY_CERT_KIND,
 candidate_branch:branch,candidate_sha:C,run_ids:ids,
 ready_selection_sha256:readySelectionFingerprint(queue)};
const manifest={schema_version:1,kind:'DIC-READY-ONLY-SOURCE-1',
 candidate_branch:branch,development_source_sha:A,published_source_sha:B,
 selected_ready_item_ids:[item.id],publication_authorized:false,
 risk_classification:{tier:'high',checks:['approval','validate','cloud-tests','mobile-browser-qa','sql'],builds:1}};
const checks=['approval','validate','cloud-tests','mobile-browser-qa','sql'].map((name,i)=>({
 id:100+i,app:{slug:'github-actions'},name,head_sha:C,status:'completed',conclusion:'success',
 details_url:'https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/'+ids[Math.min(i,3)]+'/job/'+(300+i)}));
const fixtures={queue,certificate,developmentSha:D,
 loadCandidateRef:async()=>({ref:'refs/heads/'+branch,object:{sha:C}}),
 loadCommit:async()=>({parents:[{sha:A}]}),
 loadCandidateFile:async(_sha,path)=>path.endsWith('RELEASE_CANDIDATE.json')?manifest:queue,
 loadRun:async id=>({id,head_sha:C,head_branch:branch,event:'push',
  status:'completed',conclusion:'success'}),
 loadChecks:async()=>checks,
 isAncestor:(a,d)=>a===A&&d===D};
test('no READY items require no network and do not pretend to have candidate CI',async()=>{
 const r=await verifyReadyPromotion({queue:{...queue,items:[]},developmentSha:'invalid'});
 assert.equal(r.ready,true);assert.equal(r.status,'NO_READY_ITEMS');
});
test('valid immutable batch and five source-bound push checks certify READY',async()=>{
 const r=await verifyReadyPromotion(fixtures);
 assert.equal(r.ready,true,JSON.stringify(r.errors));
 assert.equal(r.status,'BATCH_RELEASE_READY');assert.equal(r.count,1);
});
test('READY without certificate fails closed rather than being source-certified only',async()=>{
 const r=await verifyReadyPromotion({...fixtures,certificate:undefined});
 assert.equal(r.ready,false);assert.match(r.errors.join(' '),/complete.*certificate/);
});
test('later TESTING intake leaves frozen READY certification valid',async()=>{
 const other={...item,id:'DIC-Q-101',issue:101,state:'TESTING',merged_source_sha:null,
 tests:[],ci_runs:[],blockers:['work in progress']};
 const next={...queue,items:[item,other]};
 const r=await verifyReadyPromotion({...fixtures,queue:next});
 assert.equal(r.ready,true,r.errors.join(' | '));
});
test('new READY, changed source pin, or published base makes old certificate stale',async()=>{
 for(const next of [
  {...queue,items:[item,{...item,id:'DIC-Q-101',issue:101}]},
  {...queue,items:[{...item,merged_source_sha:D}]},
  {...queue,published_base:{...queue.published_base,tested_source_sha:D}}
 ]){
  const r=await verifyReadyPromotion({...fixtures,queue:next});
  assert.equal(r.ready,false);assert.match(r.errors.join(' '),/selection or published base changed/);
 }
});
test('candidate branch, commit, manifest and first-parent source must agree',async()=>{
 const mods=[
  {loadCandidateRef:async()=>({ref:'refs/heads/'+branch,object:{sha:A}})},
  {loadCommit:async()=>({parents:[{sha:A},{sha:B}]})},
  {loadCandidateFile:async(_s,p)=>p.endsWith('RELEASE_CANDIDATE.json')?
   {...manifest,publication_authorized:true}:queue},
  {loadCandidateFile:async(_s,p)=>p.endsWith('RELEASE_CANDIDATE.json')?
   {...manifest,selected_ready_item_ids:['DIC-Q-999']}:queue},
  {loadCandidateFile:async(_s,p)=>p.endsWith('RELEASE_CANDIDATE.json')?
   manifest:{...queue,items:[{...item,title:'Changed'}]}},
  {isAncestor:()=>false}
 ];
 for(const change of mods){
  const r=await verifyReadyPromotion({...fixtures,...change});
  assert.equal(r.ready,false,JSON.stringify(change));
 }
});
test('all five jobs must be on same candidate, completed, successful, recorded and current',async()=>{
 const changedChecks=[
  checks.filter(x=>x.name!=='sql'),
  checks.map(x=>x.name==='sql'?{...x,conclusion:'skipped'}:x),
  checks.map(x=>x.name==='sql'?{...x,details_url:x.details_url.replace('/runs/13/','/runs/999/')}:x),
  [...checks,{...checks[0],id:999,conclusion:'failure'}],
  checks.map(x=>x.name==='validate'?{...x,head_sha:A}:x)
 ];
 for(const variant of changedChecks){
  const r=await verifyReadyPromotion({...fixtures,loadChecks:async()=>variant});
  assert.equal(r.ready,false,JSON.stringify(variant));
 }
 for(const override of [{event:'pull_request'},{status:'in_progress'},{conclusion:'failure'},
    {head_sha:A},{head_branch:'main'}]){
  const r=await verifyReadyPromotion({...fixtures,loadRun:async id=>({
   id,head_sha:C,head_branch:branch,event:'push',status:'completed',conclusion:'success',...override})});
  assert.equal(r.ready,false,JSON.stringify(override));
 }
});
test('Git ancestry and candidate read transport failures deny; never infer pass',async()=>{
 const notAncestor=gitReadyAncestry({run:()=>{let e=Error('not ancestor');e.status=1;throw e;}});
 assert.equal(notAncestor(A,D),false);
 assert.throws(()=>gitReadyAncestry({run:()=>{throw Error('network');}})(A,D),/unavailable/);
 assert.throws(()=>gitReadyAncestry()(A,'invalid'),/Unverified/);
 const api=githubReadyPromotionReaders('test',{request:async()=>({ok:false,status:403})});
 await assert.rejects(()=>api.loadCandidateRef(branch),/HTTP 403/);
});

// #3667: collapse serial GitHub reads without suppressing any independent gate.
test('frozen READY verification overlaps independent source and five-job evidence reads',async()=>{
 const active={source:0,ci:0},peaks={source:0,ci:0};
 const observed=(kind,reader)=>async (...args)=>{
  active[kind]++;
  peaks[kind]=Math.max(peaks[kind],active[kind]);
  try{
   await new Promise(resolve=>setImmediate(resolve));
   return await reader(...args);
  }finally{active[kind]--;}
 };
 const result=await verifyReadyPromotion({...fixtures,
  loadCandidateRef:observed('source',fixtures.loadCandidateRef),
  loadCommit:observed('source',fixtures.loadCommit),
  loadCandidateFile:observed('source',fixtures.loadCandidateFile),
  loadRun:observed('ci',fixtures.loadRun),
  loadChecks:observed('ci',fixtures.loadChecks)
 });
 assert.equal(result.ready,true,JSON.stringify(result.errors));
 assert.equal(peaks.source,4,'ref, commit, frozen queue and manifest must overlap');
 assert.equal(peaks.ci,ids.length+1,'all cited runs and native checks must overlap');
 const denied=await verifyReadyPromotion({...fixtures,
  loadCandidateFile:async (...args)=>{
   if(args[1]==='docs/RELEASE_QUEUE.json')throw Error('read-only source temporarily unavailable');
   return fixtures.loadCandidateFile(...args);
  }
 });
 assert.equal(denied.ready,false);
 assert.match(denied.errors.join(' '),/source temporarily unavailable/);
});

test('approval workflow runs exactly one live immutable READY verifier with negative regression',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/approval-continuity.yml',import.meta.url),'utf8');
 const evidence=readFileSync(new URL('../scripts/release/ready-evidence-gate.mjs',import.meta.url),'utf8');
 assert.equal(workflow.split('node scripts/release/ready-evidence-gate.mjs').length-1,1,
  'READY certification must be a single source-bound live read');
 assert.equal(workflow.includes('node scripts/release/ready-promotion-gate.mjs'),false,
  'second CLI duplicated identical source/run/status readback');
 assert.equal(workflow.includes('node --test tests/ready-promotion-gate.test.mjs'),true,
  'retain negative fail-closed unit acceptance');
 assert.equal(evidence.includes('return verifyReadyPromotion(args)'),true,
  'surviving live gate must delegate to full immutable five-job verifier');
});
