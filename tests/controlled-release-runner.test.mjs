import test from 'node:test';
import assert from 'node:assert/strict';
import {executeSingleUseRelease} from '../scripts/release/controlled-release-runner.mjs';
test('release controller cannot operate outside default-branch manually dispatched hosted Actions',async()=>{
 await assert.rejects(executeSingleUseRelease({}),/only valid in dispatched/);
 await assert.rejects(executeSingleUseRelease({GITHUB_ACTIONS:'true',GITHUB_REF:'refs/heads/development/backend-foundation',
  GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REPOSITORY:'Schulzet3/The-Dial-In-Collective'}),/only valid/);
});
test('missing private protections and Netlify branch cutover stop execution BEFORE Git commands',async()=>{
 const base={GITHUB_ACTIONS:'true',GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'workflow_dispatch',
  GITHUB_REPOSITORY:'Schulzet3/The-Dial-In-Collective'};
 await assert.rejects(executeSingleUseRelease(base),/not independently enabled/);
 await assert.rejects(executeSingleUseRelease({...base,DIC_PRIVATE_BRANCH_PROTECTION_VERIFIED:'YES',
  DIC_NETLIFY_PRODUCTION_BRANCH_VERIFIED:'release/production',DIC_RELEASE_CONTROLLER_VERIFIED:'YES',
  INPUT_RELEASE_ID:'not-valid',INPUT_TESTED_SOURCE_SHA:'a'.repeat(40)}),/Missing exact release ID/);
});
