import './reviewed-3889-receipts.test.mjs';
import './prospective-ready-source.test.mjs';
import test from 'node:test';
import {createHash as cryptoCreateHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {frozenReadyBranch,requiredReadyPins,selectedReadyItems,
 prevalidateReadySource,neutralWorkflowTransportCommit,candidateTreeReceipt,assertReadyCandidateJournalReceipt,assertReadyFirstParentDeployable,assertProspectiveCandidateQaScope} from '../scripts/release/precertify-ready-source.mjs';
const A='a'.repeat(40),B='b'.repeat(40),C='c'.repeat(40);
const one={id:'DIC-Q-100',issue:100,title:'ready',owner_source:'owner approval',
 state:'READY',merged_source_sha:B,scope_paths:['site/main.js'],
 tests:['source verified'],ci_runs:[123],blockers:[]};
const notReady={...one,id:'DIC-Q-101',issue:101,state:'TESTING',
 scope_paths:['site/main.js','src/server/unready.mjs'],
 tests:[],ci_runs:[],blockers:['pending']};
const q={schema_version:1,authority:'OPS-AUTONOMOUS-BUILD-TEST-QUEUE-20261022',
 published_base:{tested_source_sha:A,release_sha:C,netlify_deploy_id:'receipt'},
 items:[one,notReady],history:[]};
test('#3347 source-bound READY pins exactly the genuine READY/unready shared path',()=>{
 assert.deepEqual(selectedReadyItems(q).map(i=>i.id),['DIC-Q-100']);
 assert.deepEqual(requiredReadyPins(q,[one.id],
  ['site/main.js','src/server/unready.mjs']),['site/main.js']);
 assert.deepEqual(requiredReadyPins({...q,items:[one]},[one.id],['site/main.js']),[]);
 assert.throws(()=>requiredReadyPins(q,[notReady.id],['site/main.js']),/not source-certified/);
 assert.throws(()=>requiredReadyPins(q,[one.id,one.id],['site/main.js']),/source\/selection unavailable/);
});
test('#3347 pre-certification skips only source-proven unmerged same-file labels',()=>{
 const unmerged={...notReady,merged_source_sha:null};
 const queue={...q,items:[one,unmerged]};
 const frozen='100644:'+'e'.repeat(40),changed='100644:'+'f'.repeat(40);
 const at=(ref,path)=>path==='site/main.js'?
  (ref===B||ref===C?frozen:null):null;
 const exact={developmentSourceSha:C,sourceObjectAt:at,isAncestor:(a,b)=>a===B&&b===C};
 assert.deepEqual(requiredReadyPins(queue,[one.id],
  ['site/main.js','src/server/unready.mjs'],exact),[]);
 assert.deepEqual(requiredReadyPins(queue,[one.id],['site/main.js'],
  {...exact,sourceObjectAt:(ref,path)=>ref===C&&path==='site/main.js'?changed:at(ref,path)}),
  ['site/main.js'],'real post-READY edit must still require exact isolation pin');
 assert.deepEqual(requiredReadyPins(queue,[one.id],['site/main.js']),
  ['site/main.js'],'no Git object reader must never waive pin');
 assert.deepEqual(requiredReadyPins({...queue,items:[one,{...unmerged,merged_source_sha:B}]},
  [one.id],['site/main.js'],exact),['site/main.js'],
  'merged competing change never receives unmerged-label exception');
 const second={...one,id:'DIC-Q-102',issue:102,merged_source_sha:C};
 assert.throws(()=>requiredReadyPins({...queue,items:[one,second,unmerged]},
  [one.id,second.id],['site/main.js'],
  {...exact,isAncestor:()=>{throw Error('missing commit');}}),/ancestry\/parity unavailable/,
  'ambiguously ordered co-selected READY merges must fail closed');
});
test('#3667 QA-only first-parent READY pin fails before duplicate frozen candidate CI',()=>{
 assert.equal(assertReadyFirstParentDeployable([one],sha=>{
  assert.equal(sha,B);return ['tests/source-hygiene.test.mjs','site/main.js'];
 }),true);
 for(const paths of [['tests/source-hygiene.test.mjs'],['docs/workstreams/issue-3851.md'],
  ['site/unrelated.js']])
  assert.throws(()=>assertReadyFirstParentDeployable([one],()=>paths),
   /no first-parent changed owned deployable path/);
 assert.throws(()=>assertReadyFirstParentDeployable([one],()=>null),/Git diff unavailable/);
 assert.throws(()=>assertReadyFirstParentDeployable([one],()=>[null]),/Git diff unavailable/);
 assert.throws(()=>assertReadyFirstParentDeployable([{...one,merged_source_sha:null}],()=>['site/main.js']),
  /source identity missing/);
 const another={...one,id:'DIC-Q-102',scope_paths:['site/another.js']};
 assert.equal(assertReadyFirstParentDeployable([one,another],()=>
  ['site/main.js','site/another.js']),true,'co-selected items may each own a subset');
});
test('#3347 candidate name is stable across unready changes, but changes with READY bytes',()=>{
 const b=frozenReadyBranch(q,[one],B);
 assert.match(b,/^release-candidates\/ready3347-[a-f0-9]{20}$/);
 assert.notEqual(frozenReadyBranch(q,[one],C),b,'a repaired exact source cannot reuse failed candidate branch');
 assert.throws(()=>frozenReadyBranch(q,[one]),/exact source commit/);
 assert.equal(frozenReadyBranch({...q,items:[one,{...notReady,scope_paths:['site/other.js']}]},[one],B),b);
 assert.notEqual(frozenReadyBranch(q,[{...one,merged_source_sha:C}],B),b);
 assert.notEqual(frozenReadyBranch({...q,published_base:{...q.published_base,tested_source_sha:C}},[one],B),b);
});
test('#3347 no candidate can be pushed without authenticated CI main context',()=>{
 assert.throws(()=>prevalidateReadySource({developmentSourceSha:'not-a-sha'}),/Exact development/);
 assert.throws(()=>selectedReadyItems({...q,authority:'wrong'}),/schema HOLD/);
});

import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,rmSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('#3347 transport carries exact candidate app bytes but NEVER mutates workflow files',()=>{
 const dir=mkdtempSync(join(tmpdir(),'dic-ready-transport-unit-'));
 const git=(...args)=>execFileSync('git',args,{cwd:dir,encoding:'utf8'}).trim();
 const file=(p,s)=>{mkdirSync(join(dir,p.slice(0,p.lastIndexOf('/'))),{recursive:true});writeFileSync(join(dir,p),s);};
 try{
  git('init','-q');git('config','user.email','test@example.com');git('config','user.name','test');
  file('.github/workflows/ci.yml','name: older\n');file('site/main.js','published');
  git('add','-A');git('commit','-qm','published');const pub=git('rev-parse','HEAD');
  file('.github/workflows/ci.yml','name: new\n');file('site/main.js','ready-app');
  git('add','-A');git('commit','-qm','development');const dev=git('rev-parse','HEAD');
  file('.github/workflows/ci.yml','name: older\n');
  git('add','-A');git('commit','-qm','candidate');const candidate=git('rev-parse','HEAD');
  const x=neutralWorkflowTransportCommit({repoDir:dir,developmentSourceSha:dev,candidateSha:candidate,
   workflowPaths:['.github/workflows/ci.yml']});
  assert.match(x.transport_sha,/^[a-f0-9]{40}$/);
  assert.equal(git('show',x.transport_sha+':.github/workflows/ci.yml'),'name: new');
  assert.equal(git('show',candidate+':.github/workflows/ci.yml'),'name: older');
  assert.equal(git('show',x.transport_sha+':site/main.js'),'ready-app');
  assert.equal(git('rev-parse',x.transport_sha+'^'),dev);
  assert.equal(git('rev-parse','HEAD'),candidate);
  assert.throws(()=>neutralWorkflowTransportCommit({repoDir:dir,developmentSourceSha:dev,
   candidateSha:candidate,workflowPaths:['../../.github/workflows/ci.yml']}),/Unsafe transport/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

// Source staging has additional full Git fixture tests; read-only export must
// deny missing local candidate objects rather than invent a certified tree.
test('#3347 connector source receipt fail-closes absent staged tree and no Actions push',()=>{
 assert.throws(()=>candidateTreeReceipt({developmentSourceSha:'a'.repeat(40),staged:{candidate_sha:'b'.repeat(40)}}),/No verified staged/);
 assert.throws(()=>prevalidateReadySource({developmentSourceSha:'a'.repeat(40),push:true}),/Actions ref push prohibited/);
});

test('#3347 candidate read-only receipt requires the exact NEW dev parent preflight in journal',()=>{
 const exact='\n\nDIC_PREFLIGHT_VERIFIED development_sha='+B+
  ' preflight_blob_sha='+C+'\n\n## READY-only source candidate (not published)\n';
 assert.equal(assertReadyCandidateJournalReceipt(exact,{developmentSourceSha:B,preflightBlob:C}),true);
 assert.throws(()=>assertReadyCandidateJournalReceipt('\n\n## READY-only source candidate',{developmentSourceSha:B,preflightBlob:C}),/missing exact NEW/);
 assert.throws(()=>assertReadyCandidateJournalReceipt(exact,{developmentSourceSha:A,preflightBlob:C}),/missing exact NEW/);
 assert.throws(()=>assertReadyCandidateJournalReceipt(exact,{developmentSourceSha:B,preflightBlob:A}),/missing exact NEW/);
 assert.throws(()=>assertReadyCandidateJournalReceipt(exact,{developmentSourceSha:'invalid',preflightBlob:C}),/Unverifiable/);
});

test('#3347 main workflow pushes to changed controller source trigger read-only recertification',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/dic-ready-precertification.yml',import.meta.url),'utf8');
 for(const p of ['.github/workflows/dic-ready-precertification.yml',
  'scripts/release/precertify-ready-source.mjs',
  'scripts/release/stage-ready-only-candidate.mjs',
  'scripts/release/ready-only-candidate.mjs'])
  assert.ok(workflow.includes("'"+p+"'"),'missing controller trigger: '+p);
 assert.match(workflow,/permissions:\s*\n  contents: read\s*\n  actions: read\s*\n  checks: read/);
 assert.match(workflow,/node scripts\/release\/precertify-ready-source.mjs/);
 assert.doesNotMatch(workflow,/git push|deploy to netlify|POST.*publish/i);
});

test('#3667 READY handoff persists a machine-readable exact Git-tree receipt without granting publication',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/dic-ready-precertification.yml',import.meta.url),'utf8');
 assert.match(workflow,/sed -n 's\/\^/);
 assert.ok(workflow.includes(String.raw`sed -n 's/^\[DIC READY pre-certification\] //p'`),
  'Exact one-backslash sed literal must parse the official receipt');
 assert.match(workflow,/ready-source\/receipt\.json/);
 assert.match(workflow,/JSON\.parse\(require\('node:fs'\)\.readFileSync/);
 assert.match(workflow,/LOCAL_TREE_RECEIPT_NO_REMOTE_CANDIDATE/);
 assert.match(workflow,/expected_tree_sha/);
 assert.match(workflow,/actions\/upload-artifact@v7/);
 assert.match(workflow,/if-no-files-found: error/);
 assert.match(workflow,/permissions:\s*\n  contents: read\s*\n  actions: read\s*\n  checks: read/);
 assert.doesNotMatch(workflow,/git push|POST.*publish|deploy to netlify/i);
});

test('#3667 READY pre-cert fast event gate skips only source-proven irrelevant approvals',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/dic-ready-precertification.yml',import.meta.url),'utf8');
 const marker='      - name: Fast skip stale or queue-unchanged approvals before checkout\n';
 const segment=workflow.split(marker)[1]?.split('      - uses: actions/checkout@v7')[0];
 assert.ok(segment,'precheckout gate required');
 const source=segment.split('        run: |\n')[1];
 assert.ok(source,'executable shell script required');
 const script=source.split('\n').map(s=>s.startsWith('          ')?s.slice(10):s).join('\n');
 assert.match(script,/\.files \| length\) >= 300/,'truncated changed-file response must fail open');
 assert.match(script,/docs\/RELEASE_QUEUE\.json/);
 assert.match(script,/\|\| \{ decide true; exit 0; \}/,'unavailable API must retain the Git guard');
 for(const step of ['actions/checkout@v7','actions/setup-node@v7.1.0','Verify live development and source bound approved queue transition']){
  const index=workflow.indexOf(step,workflow.indexOf(marker));
  assert.ok(index>0,'step must exist: '+step);
  const tail=workflow.slice(index,index+240);
  assert.match(tail,/if: steps\.event_gate\.outputs\.proceed != 'false'/,'no-op must bypass '+step);
 }
 const dir=mkdtempSync(join(tmpdir(),'dic-ready-fast-event-'));
 const output=join(dir,'out');
 const S='b'.repeat(40);
 const mock=`gh() {
   if [[ "$2" == *"/git/ref/heads/development/backend-foundation" ]]; then
     if [ "$DIC_FAKE_REF_FAIL" = "1" ]; then return 1; fi
     printf '%s\\n' "$DIC_FAKE_LIVE"
   else
     if [ "$DIC_FAKE_COMMIT_FAIL" = "1" ]; then return 1; fi
     printf '%s\\n' "$DIC_FAKE_KIND"
   fi
 }
 `;
 function check(opts,expected){
  writeFileSync(output,'');
  execFileSync('bash',['-c',mock+script],{encoding:'utf8',env:{
   ...process.env,GITHUB_OUTPUT:output,GITHUB_REPOSITORY:'Schulzet3/The-Dial-In-Collective',
   EVENT_HEAD:S,DIC_FAKE_LIVE:S,DIC_FAKE_KIND:'queue',
   DIC_FAKE_REF_FAIL:'0',DIC_FAKE_COMMIT_FAIL:'0',...opts
  }});
  assert.equal(readFileSync(output,'utf8').trim(),'proceed='+expected);
 }
 try{
  check({DIC_FAKE_KIND:'queue'},'true');
  check({DIC_FAKE_KIND:'unknown'},'true');
  check({DIC_FAKE_KIND:'unrelated'},'false');
  check({DIC_FAKE_LIVE:'a'.repeat(40)},'false');
  check({DIC_FAKE_REF_FAIL:'1'},'true');
  check({DIC_FAKE_COMMIT_FAIL:'1'},'true');
 }finally{rmSync(dir,{force:true,recursive:true});}
 assert.match(workflow,/schedule:[\s\S]*cron: '17 \* \* \* \*'/,'scheduled recertification retained');
 assert.match(workflow,/workflow_dispatch:/,'manual guarded route retained');
 assert.match(workflow,/permissions:\n  contents: read\n  actions: read\n  checks: read/,'read-only token scope');
});

test('#3667 exact zero-READY queue blob short-circuits checkout; proof gaps fail open',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/dic-ready-precertification.yml',import.meta.url),'utf8');
 const marker='      - name: Fast skip stale or queue-unchanged approvals before checkout\n';
 const segment=workflow.split(marker)[1]?.split('      - uses: actions/checkout@v7')[0];
 assert.ok(segment,'precheckout gate required');
 const script=segment.split('        run: |\n')[1].split('\n').map(s=>s.startsWith('          ')?s.slice(10):s).join('\n');
 assert.ok(script.includes('git hash-object'));
 const dir=mkdtempSync(join(tmpdir(),'dic-ready-zero-queue-'));
 const out=join(dir,'out'),source='b'.repeat(40);
 const queue=(items)=>JSON.stringify({schema_version:1,authority:'OPS-AUTONOMOUS-BUILD-TEST-QUEUE-20261022',items});
 const body=(bytes,overrideSha)=>{
  const sha=cryptoCreateHash('sha1').update('blob '+Buffer.byteLength(bytes)+'\0').update(bytes).digest('hex');
  return JSON.stringify({sha:overrideSha||sha,encoding:'base64',content:Buffer.from(bytes).toString('base64')});
 };
 const mock=`gh() {
  if [[ "$2" == *"/git/ref/heads/development/backend-foundation" ]]; then
    printf '%s\\n' "$DIC_FAKE_LIVE"
  elif [[ "$2" == *"/commits/"* ]]; then
    printf '%s\\n' "queue"
  elif [[ "$2" == *"/contents/docs/RELEASE_QUEUE.json?"* ]]; then
    if [[ "$DIC_FAKE_API_FAIL" = "1" ]]; then return 1; fi
    printf '%s\\n' "$DIC_FAKE_BODY"
  else return 1
  fi
 }
 `;
 function check(json,expected,extra={}){
  writeFileSync(out,'');
  execFileSync('bash',['-c',mock+script],{encoding:'utf8',env:{
   ...process.env,GITHUB_OUTPUT:out,GITHUB_REPOSITORY:'Schulzet3/The-Dial-In-Collective',
   EVENT_HEAD:source,DIC_FAKE_LIVE:source,DIC_FAKE_BODY:json,DIC_FAKE_API_FAIL:'0',...extra
  }});
  assert.equal(readFileSync(out,'utf8').trim(),'proceed='+expected);
 }
 try{
  check(body(queue([{state:'TESTING'},{state:'DEPLOYED'}])),'false');
  check(body(queue([{state:'TESTING'},{state:'READY'}])),'true');
  check(body(queue([{state:'BLOCKED'}])),'false');
  check(body(queue([{state:'UNREVIEWED'}])),'true');
  check(body(queue([]),'f'.repeat(40)),'true');
  check('not-json','true');
  check(body(queue([])),'true',{DIC_FAKE_API_FAIL:'1'});
 }finally{rmSync(dir,{recursive:true,force:true});}
 assert.ok(workflow.includes("cron: '17 * * * *'"));
 assert.ok(workflow.includes('workflow_dispatch:'));
 for(const phrase of ['contents: read','actions: read','checks: read'])assert.ok(workflow.includes(phrase));
});

test('#3667 real >1 MiB queue Git blob falls back to immutable Git Blobs API',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/dic-ready-precertification.yml',import.meta.url),'utf8');
 const marker='      - name: Fast skip stale or queue-unchanged approvals before checkout\n';
 const segment=workflow.split(marker)[1]?.split('      - uses: actions/checkout@v7')[0];
 assert.ok(segment);
 const script=segment.split('        run: |\n')[1].split('\n').map(s=>s.startsWith('          ')?s.slice(10):s).join('\n');
 assert.ok(script.includes('/git/blobs/'));
 const dir=mkdtempSync(join(tmpdir(),'dic-ready-large-queue-'));
 const out=join(dir,'out'),meta=join(dir,'meta.json'),full=join(dir,'blob.json');
 const source='b'.repeat(40);
 const queue=(ready)=>JSON.stringify({schema_version:1,authority:'OPS-AUTONOMOUS-BUILD-TEST-QUEUE-20261022',items:[{state:ready?'READY':'TESTING'}],history:'x'.repeat(1100000)});
 const write=(ready,badSha=false)=>{
  const bytes=queue(ready);
  const sha=cryptoCreateHash('sha1').update('blob '+Buffer.byteLength(bytes)+'\0').update(bytes).digest('hex');
  writeFileSync(meta,JSON.stringify({sha,encoding:'none',content:'',size:Buffer.byteLength(bytes)}));
  writeFileSync(full,JSON.stringify({sha:badSha?'f'.repeat(40):sha,encoding:'base64',content:Buffer.from(bytes).toString('base64')}));
 };
 const mock=`gh() {
  if [[ "$2" == *"/git/ref/heads/development/backend-foundation" ]]; then
    printf '%s\\n' "$DIC_FAKE_LIVE"
  elif [[ "$2" == *"/commits/"* ]]; then
    printf '%s\\n' "queue"
  elif [[ "$2" == *"/contents/docs/RELEASE_QUEUE.json?"* ]]; then
    cat "$DIC_META_PATH"
  elif [[ "$2" == *"/git/blobs/"* ]]; then
    if [[ "$DIC_BLOB_FAIL" = '1' ]]; then return 1; fi
    cat "$DIC_BLOB_PATH"
  else return 1
  fi
 }
 `;
 function check(ready,badSha,expected,fail='0'){
  write(ready,badSha);writeFileSync(out,'');
  execFileSync('bash',['-c',mock+script],{encoding:'utf8',env:{
    ...process.env,GITHUB_OUTPUT:out,GITHUB_REPOSITORY:'Schulzet3/The-Dial-In-Collective',
    EVENT_HEAD:source,DIC_FAKE_LIVE:source,DIC_META_PATH:meta,DIC_BLOB_PATH:full,DIC_BLOB_FAIL:fail
  }});
  assert.equal(readFileSync(out,'utf8').trim(),'proceed='+expected);
 }
 try{
  check(false,false,'false');
  check(true,false,'true');
  check(false,true,'true');
  check(false,false,'true','1');
 }finally{rmSync(dir,{recursive:true,force:true});}
 assert.ok(workflow.includes('contents: read'));
 assert.ok(workflow.includes('checks: read'));
});


test('#3889 two-phase workflow preview does not pre-promote development READY or publish',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/dic-ready-precertification.yml',import.meta.url),'utf8');
 const script=readFileSync(new URL('../scripts/release/precertify-ready-source.mjs',import.meta.url),'utf8');
 assert.match(workflow,/NO_READY_ITEMS/);
 assert.match(workflow,/--prospective=DIC-Q-509-stale-project-shot-comment-20261122/);
 assert.match(script,/prospectiveReadyItemId/);
 assert.match(script,/candidateTreeReceipt/);
 assert.match(workflow,/permissions:\s*\n  contents: read\s*\n  actions: read\s*\n  checks: read/);
 const executable=workflow.split('\n').filter(line=>!/^\s*#/.test(line)).join('\n');
 assert.doesNotMatch(executable,/POST.*publish|\bgit push\b|\bnetlify\s+build\b/i);
});

test('#3889 scoped hosted prospective input is exact-source-bound, read-only and consumed only on its own main push',async()=>{
 const {prospectiveReceiptArg}=await import('../scripts/release/prospective-receipt-input.mjs');
 const dev='a'.repeat(40),pre='b'.repeat(40),blob='c'.repeat(40),published='d'.repeat(40);
 const id='DIC-Q-33-r399-original99-producer-tenure-precision';
 const plan={schema_version:1,kind:'DIC-NONPUBLISHING-PROSPECTIVE-RECEIPT-3889',development_sha:dev,
  preflight_blob:pre,queue_blob:blob,published_source_sha:published,selected_testing_ids:[id],publication_authorized:false};
 const readers={developmentSha:dev,readBlob:(sha,p)=>p.endsWith('PREFLIGHT.md')?pre:blob,
  readQueue:()=>({published_base:{tested_source_sha:published},items:[{id,state:'TESTING'}]})};
 assert.equal(prospectiveReceiptArg(plan,readers),'--prospective-batch='+id);
 for(const edit of [
  (p,r)=>p.publication_authorized=true,
  (p,r)=>p.selected_testing_ids.push(id),
  (p,r)=>p.selected_testing_ids=['--push'],
  (p,r)=>p.grant='forged',
  (p,r)=>r.developmentSha='e'.repeat(40),
  (p,r)=>r.readBlob=()=>dev,
  (p,r)=>r.readQueue=()=>({published_base:{tested_source_sha:published},items:[{id,state:'READY'}]}),
  (p,r)=>p.published_source_sha=dev,
 ]){const p=structuredClone(plan),r={...readers};edit(p,r);assert.throws(()=>prospectiveReceiptArg(p,r),/HOLD/);}
 const workflow=readFileSync(new URL('../.github/workflows/dic-ready-precertification.yml',import.meta.url),'utf8');
 assert.ok(workflow.includes("'docs/workstreams/issue-3889-prospective-input.json'"));
 assert.ok(workflow.includes('if [ "$EVENT" = \'push\' ]; then'));
 assert.ok(workflow.includes('git diff --name-only "$PUSH_BEFORE" "$GITHUB_SHA" -- "$plan_path"'));
 assert.ok(workflow.includes('test "$(git rev-parse HEAD)" = "$GITHUB_SHA"'));
 assert.ok(workflow.includes('--receipt "$prospective_arg"'));
 assert.match(workflow,/permissions:\s*\n  contents: read\s*\n  actions: read\s*\n  checks: read/);
 const executable=workflow.split('\n').filter(line=>!/^\s*#/.test(line)).join('\n');
 assert.doesNotMatch(executable,/\bgit push\b|\bnetlify\s+build\b|POST.*publish/i);
});

// The receipt cannot be emitted when the actual candidate or its independent
// selected-test verifier is absent, or when the verifier rejects the tree.
test('#3889 cheap independent prospective QA gate fails closed before receipt',()=>{
 assert.throws(()=>assertProspectiveCandidateQaScope({candidateSha:'invalid'}),/Exact prospective QA/);
 assert.throws(()=>assertProspectiveCandidateQaScope({candidateSha:'a'.repeat(40)}),/Independent prospective selected QA scope HOLD/);
 const source=readFileSync(new URL('../scripts/release/precertify-ready-source.mjs',import.meta.url),'utf8');
 assert.ok(source.indexOf('if(prospectiveReadyItemIds!==null)assertProspectiveCandidateQaScope')<source.indexOf('if(receipt)return candidateTreeReceipt'));
});
