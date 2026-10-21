import test from 'node:test';
import assert from 'node:assert/strict';
import {auditLatestCommit,auditCommitRange} from '../scripts/audit/verify-commit-checkpoint.mjs';
const checkpoint='docs/ACTIVE_WORK_2026-10-20_APPROVAL_TO_RELEASE_INTEGRITY.md';
test('source changes without same-commit durable checkpoint are blocked',()=>{
 assert.match(auditLatestCommit({paths:['site/cloud/main.js'],subject:'fix: button [skip netlify]'}).join(' '),/lacks SAME-COMMIT/);
});
test('source changes with same-commit work journal pass',()=>{
 assert.deepEqual(auditLatestCommit({paths:['site/cloud/main.js',checkpoint],subject:'fix: approved control [skip netlify]'}),[]);
});
test('doc-only commits without skip are blocked; docs with skip are accepted',()=>{
 assert.ok(auditLatestCommit({paths:['docs/CURRENT_STATUS.md'],subject:'docs: status'}).length);
 assert.deepEqual(auditLatestCommit({paths:['docs/CURRENT_STATUS.md'],subject:'docs: status [skip netlify]'}),[]);
});
test('release marker cannot sneak code changes into a production publish commit',()=>{
 assert.match(auditLatestCommit({paths:['site/cloud/main.js',checkpoint],subject:'Release DIC: approved UI [dic-publish]'}).join(' '),/only contain reviewed documentation/);
 assert.deepEqual(auditLatestCommit({paths:['docs/CURRENT_STATUS.md'],subject:'Release DIC: owner approved [dic-publish]'}),[]);
});

test('bad first commit is not concealed by a later docs-only commit in the same push',()=>{
 const batch=[{sha:'first',paths:['site/cloud/main.js'],subject:'feat: no journal [skip netlify]'},
  {sha:'second',paths:['docs/CURRENT_STATUS.md'],subject:'docs: handoff [skip netlify]'}];
 assert.match(auditCommitRange(batch).join(' '),/first:.*SAME-COMMIT/);
});
test('every source-changing commit with its own journal passes range audit',()=>{
 assert.deepEqual(auditCommitRange([
  {sha:'first',paths:['site/lib/engine.js',checkpoint],subject:'fix: engine [skip netlify]'},
  {sha:'second',paths:['site/cloud/main.js',checkpoint],subject:'fix: UI [skip netlify]'},
  {sha:'third',paths:['docs/CURRENT_STATUS.md'],subject:'docs: complete [skip netlify]'}
 ]),[]);
});
