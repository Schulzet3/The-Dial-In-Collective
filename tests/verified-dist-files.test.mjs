import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedDistFiles} from '../scripts/release/verified-dist-files.mjs';
const fn=Buffer.concat([Buffer.from('PK'),Buffer.alloc(130)]);
test('verified ZIP manifest is passed to static and function digest checks',()=>{
 const r=verifiedDistFiles({zipPath:'fake.zip',functionZip:fn,
 runner:()=>JSON.stringify({'/index.html':Buffer.from('ok').toString('base64')})});
 assert.equal(r.files['/index.html'].toString(),'ok');
 assert.equal(r.manifest.functions['coffee-url-preview'],r.functionHash);
});
test('invalid ZIP extraction fails closed',()=>{
 assert.throws(()=>verifiedDistFiles({zipPath:'fake.zip',functionZip:fn,runner:()=>JSON.stringify({'/../bad':'YQ=='})}));
});
