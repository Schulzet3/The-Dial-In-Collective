import test from 'node:test';
import assert from 'node:assert/strict';
import {smoke,smokePaths} from '../scripts/release/production-readonly-smoke.mjs';
const response=(status=200,type='text/html',body='<html>ok</html>')=>({
 ok:status>=200&&status<300,status,headers:{get:()=>type},text:async()=>body
});
test('production smoke is strictly read-only and checks public routes',async()=>{
 const calls=[];const r=await smoke({fetchImpl:async(url,opts)=>{calls.push({url,opts});return response();}});
 assert.equal(r.read_only,true);assert.equal(r.provider_deploy_sha_verified,false);
 assert.deepEqual(calls.map(x=>x.url),smokePaths.map(p=>'https://app.dialincollective.com'+p));
 assert.ok(calls.every(x=>x.opts.method==='GET'&&x.opts.redirect==='error'));
});
test('smoke fails closed on unexpected origin, path, status or content',async()=>{
 await assert.rejects(smoke({origin:'https://example.com',fetchImpl:async()=>response()}),/origin/);
 await assert.rejects(smoke({paths:['/admin'],fetchImpl:async()=>response()}),/path/);
 await assert.rejects(smoke({fetchImpl:async()=>response(503)}),/failed/);
 await assert.rejects(smoke({fetchImpl:async()=>response(200,'text/html','')}),/invalid body/);
});
