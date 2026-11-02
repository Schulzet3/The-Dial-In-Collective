import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('main release controller cannot silently fall back to Git rebuild publication',()=>{
 const s=readFileSync(new URL('../scripts/release/controlled-release-runner.mjs',import.meta.url),'utf8');
 const gate=s.indexOf("DIC_IMMUTABLE_FUNCTION_PARITY_VERIFIED");
 const push=s.indexOf("git(['push','--porcelain'");
 assert.ok(gate>0&&push>gate);
 assert.match(s,/verifyReleaseArtifactReceipt\(/);
 assert.match(s,/provider artifact publisher not activated; no Git push/);
 assert.match(s,/chatPush&&chatRequest.mode==='validate_only'/);
});
