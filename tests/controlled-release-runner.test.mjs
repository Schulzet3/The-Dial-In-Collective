import test from 'node:test';
import assert from 'node:assert/strict';
import {executeSingleUseRelease,initialLedgerOnMissing,RELEASE_GENESIS_SHA,MINIMUM_GUARDED_SOURCE_SHA,
 selectLatestCiConclusions,assertCurrentReleaseRefs,gitFailureDiagnostic,redactTransportText,verifiedGitAncestry} from '../scripts/release/controlled-release-runner.mjs';
test('release controller cannot operate outside controlled main OPS Actions',async()=>{
 await assert.rejects(executeSingleUseRelease({}),/only valid in controlled main-branch/);
 await assert.rejects(executeSingleUseRelease({GITHUB_ACTIONS:'true',GITHUB_REF:'refs/heads/development/backend-foundation',
  GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REPOSITORY:'Schulzet3/The-Dial-In-Collective'}),/only valid/);
});
test('missing actual Netlify cutover and Free/private mode stop BEFORE Git commands',async()=>{
 const base={GITHUB_ACTIONS:'true',GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'workflow_dispatch',
  GITHUB_REPOSITORY:'Schulzet3/The-Dial-In-Collective'};
 await assert.rejects(executeSingleUseRelease(base),/not independently enabled/);
 await assert.rejects(executeSingleUseRelease({...base,
  DIC_PRIVATE_FREE_COMPENSATING_MODE:'YES',
  DIC_NETLIFY_PRODUCTION_BRANCH_VERIFIED:'development/backend-foundation',
  DIC_RELEASE_CONTROLLER_VERIFIED:'YES'}),/Netlify cutover/);
 await assert.rejects(executeSingleUseRelease({...base,DIC_PRIVATE_FREE_COMPENSATING_MODE:'YES',
  DIC_NETLIFY_PRODUCTION_BRANCH_VERIFIED:'release/production',DIC_RELEASE_CONTROLLER_VERIFIED:'YES',
  INPUT_RELEASE_ID:'not-valid',INPUT_TESTED_SOURCE_SHA:'a'.repeat(40)}),/Missing exact release ID/);
});

test('manual dispatch without explicit bounded evidence stops before Git or provider access',async()=>{
 const base={GITHUB_ACTIONS:'true',GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'workflow_dispatch',
  GITHUB_REPOSITORY:'Schulzet3/The-Dial-In-Collective',DIC_PRIVATE_FREE_COMPENSATING_MODE:'YES',
  DIC_NETLIFY_PRODUCTION_BRANCH_VERIFIED:'release/production',DIC_RELEASE_CONTROLLER_VERIFIED:'YES',
  INPUT_RELEASE_ID:'DIC-20261021-EXAMPLE1',INPUT_TESTED_SOURCE_SHA:'a'.repeat(40)};
 for(const INPUT_RELEASE_EVIDENCE_JSON of [undefined,'',' '.repeat(10),'x'.repeat(32_769)])
  await assert.rejects(executeSingleUseRelease({...base,INPUT_RELEASE_EVIDENCE_JSON}),/requires explicit.*evidence JSON/);
 await assert.rejects(executeSingleUseRelease({...base,INPUT_RELEASE_EVIDENCE_JSON:'not JSON'}),/not valid JSON/);
});

test('chat push cannot impersonate manual event or run without an exact GitHub request commit',async()=>{
 const base={GITHUB_ACTIONS:'true',GITHUB_REF:'refs/heads/main',
  GITHUB_EVENT_NAME:'push',GITHUB_REPOSITORY:'Schulzet3/The-Dial-In-Collective',
  DIC_PRIVATE_FREE_COMPENSATING_MODE:'YES',
  DIC_NETLIFY_PRODUCTION_BRANCH_VERIFIED:'release/production',
  DIC_RELEASE_CONTROLLER_VERIFIED:'YES'};
 await assert.rejects(executeSingleUseRelease(base),/Chat release request commit SHA/);
 await assert.rejects(executeSingleUseRelease({...base,GITHUB_SHA:'bad'}),/Chat release request commit SHA/);
 await assert.rejects(executeSingleUseRelease({...base,GITHUB_REF:'refs/heads/development/backend-foundation'}),
  /only valid in controlled main-branch/);
});

test('an absent consumed ledger is allowed ONLY at independently verified production genesis',()=>{
 const missing=()=>{throw Error('missing');};
 assert.deepEqual(JSON.parse(initialLedgerOnMissing({releaseHead:RELEASE_GENESIS_SHA,readLedger:missing})),
  {schema_version:1,consumed:[]});
 assert.throws(()=>initialLedgerOnMissing({releaseHead:'c'.repeat(40),readLedger:missing}),/NON-GENESIS/);
 assert.equal(initialLedgerOnMissing({releaseHead:'c'.repeat(40),readLedger:()=>'{"schema_version":1,"consumed":[{"id":"DIC-20261020-TWO123"}]}'}).includes('TWO123'),true);
});
test('release lineage has exact current production genesis and no legacy unguarded source floor',()=>{
 assert.equal(RELEASE_GENESIS_SHA,'e7e16e5e13b35a6f4b6aa81db5b09b93b1aefc60');
 assert.equal(MINIMUM_GUARDED_SOURCE_SHA,'994a4d9f91e2475a96df42a46564c06e29f1c8d7');
});

test('newer pending or failing CI overrides an earlier success on the same exact source',()=>{
 const sha='a'.repeat(40);
 const check={id:1,name:'approval',head_sha:sha,app:{slug:'github-actions'},
  status:'completed',conclusion:'success',completed_at:'2026-10-21T20:00:00Z'};
 const pending={...check,id:2,status:'queued',conclusion:null,completed_at:null};
 assert.deepEqual(selectLatestCiConclusions([pending,check],sha),{approval:'pending'});
 assert.deepEqual(selectLatestCiConclusions([check,{...pending,status:'completed',conclusion:'failure'}],sha),
  {approval:'failure'});
 assert.deepEqual(selectLatestCiConclusions([check,pending,
  {...check,id:3,app:{slug:'untrusted-check-writer'}},
  {...check,id:4,head_sha:'b'.repeat(40)}],sha),{approval:'pending'});
 assert.throws(()=>selectLatestCiConclusions([{...check,id:null}],sha),/check-run identity/);
});

test('changed or unavailable approval/release refs after CI are refused before publication',()=>{
 const developmentHead='a'.repeat(40),releaseHead='b'.repeat(40);
 const refs={developmentHead,releaseHead,actualDevelopmentHead:developmentHead,actualReleaseHead:releaseHead};
 assert.equal(assertCurrentReleaseRefs(refs),true);
 for(const change of [{actualDevelopmentHead:'c'.repeat(40)},{actualReleaseHead:'c'.repeat(40)},
  {actualDevelopmentHead:undefined},{actualReleaseHead:''}])
  assert.throws(()=>assertCurrentReleaseRefs({...refs,...change}),/changed during preflight/);
});

test('porcelain refusal reasons survive diagnostics without credential or URL disclosure',()=>{
 const token='private-test-token-1234',basic=Buffer.from('x-access-token:'+token).toString('base64');
 const error={status:1,
  stdout:'!\tabc:refs/heads/release/production\t[remote rejected] (refusing to allow a GitHub App to update workflow without workflows permission)\n'+
   'To https://x-access-token:'+token+'@github.com/example/repo?secret=do-not-log',
  stderr:'Authorization: basic '+basic+'\nBearer '+token+'\nghp_example_secret_value\neyJhbGciOiJub25lIn0.eyJleHAiOjF9.fake_signature'};
 const result=gitFailureDiagnostic(error,{operation:'push',secrets:[token]});
 assert.equal(result.category,'WORKFLOW_PERMISSION_DENIED');
 assert.equal(result.operation,'push');
 assert.equal(result.exit_code,1);
 assert.match(result.stdout,/remote rejected/);
 const printed=JSON.stringify(result);
 for(const secret of [token,basic,'do-not-log','ghp_example_secret_value','eyJhbGciOiJub25lIn0'])
  assert.equal(printed.includes(secret),false);
 assert.equal(printed.includes('https://'),false);
 assert.match(redactTransportText('prefix '+encodeURIComponent(token),[token]),/REDACTED/);
 const escaped='private-test-\u001b[31mtoken-1234 ht\u001b[0mtps://host.example/hidden';
 assert.equal(redactTransportText(escaped,[token]).includes(token),false);
 assert.equal(redactTransportText(escaped,[token]).includes('hidden'),false);
 assert.ok(redactTransportText('x'.repeat(5000)).length<=1600);
 assert.equal(gitFailureDiagnostic({status:1,stdout:'[rejected] (non-fast-forward)'},{operation:'push'}).category,'REF_CONFLICT');
});

test('operational release controller fails closed when Git ancestry object is missing',()=>{
 assert.equal(verifiedGitAncestry('a'.repeat(40),'b'.repeat(40),{run:()=>{}}),true);
 assert.equal(verifiedGitAncestry('a'.repeat(40),'b'.repeat(40),{run:()=>{throw Object.assign(Error('unrelated'),{status:1});}}),false);
 assert.throws(()=>verifiedGitAncestry('a'.repeat(40),'b'.repeat(40),{run:()=>{throw Object.assign(Error('missing object'),{status:128});}}),/verification unavailable/);
});
