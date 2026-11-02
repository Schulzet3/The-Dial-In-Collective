import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('CI certificate binds exact source and does not claim publication',()=>{
 const s=readFileSync(new URL('../scripts/release/write-ci-certificate.mjs',import.meta.url),'utf8');
 assert.match(s,/sha!==head/);
 assert.match(s,/NOT_RELEASE_APPROVAL/);
 assert.match(s,/github_run_id/);
});
