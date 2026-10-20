import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MAX_HTML_BYTES,safeCoffeeUrl} from '../src/server/coffee-url-guard.mjs';
test('read-only 2MB benchmark must not silently widen published 900KB safe-fetch limit',()=>{
 assert.equal(MAX_HTML_BYTES,900_000);
 assert.equal(safeCoffeeUrl('https://127.0.0.1/'),null);
 assert.equal(safeCoffeeUrl('http://coffee.example.org/product'),null);
 const study=readFileSync(new URL('../scripts/audit/coffee-extractor-2mb-study.mjs',import.meta.url),'utf8');
 assert.match(study,/mkdtempSync/);
 assert.match(study,/src\/server\//);
 assert.match(study,/const BASE=900_000,STUDY=2_000_000/);
 const workflow=readFileSync(new URL('../.github/workflows/roaster-source-probe.yml',import.meta.url),'utf8');
 assert.match(workflow,/isolated-size-study:/);
 assert.match(workflow,/timeout-minutes: 5/);
 assert.match(workflow,/timeout-minutes: 10/);
});
