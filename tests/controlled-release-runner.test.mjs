import test from 'node:test';
import assert from 'node:assert/strict';
import {executeSingleUseRelease,initialLedgerOnMissing,RELEASE_GENESIS_SHA,MINIMUM_GUARDED_SOURCE_SHA} from '../scripts/release/controlled-release-runner.mjs';
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
