import test from 'node:test';
import assert from 'node:assert/strict';
import {auditLatestCommit} from '../scripts/audit/verify-commit-checkpoint.mjs';
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
