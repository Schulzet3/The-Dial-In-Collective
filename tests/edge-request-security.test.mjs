import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {readBoundedJson,RequestBodyError} from '../supabase/functions/_shared/request-budget.mjs';
import {extractProductPreview,officialPreviewUrl} from '../supabase/functions/dic-preview-coffee/preview.mjs';
import {extractOfficialEvidence,officialProductUrl} from '../supabase/functions/dic-verify-coffee/evidence.mjs';
function edge(name,{admitted=false,valid=true}={}){
 let handler,clients=0,fetches=0,rpcs=0;
 const code=readFileSync(new URL('../supabase/functions/'+name+'/index.ts',import.meta.url),'utf8').replace(/^import .*?;\n/gm,'');
 vm.runInNewContext(code,{
  Deno:{env:{get:k=>({SUPABASE_URL:'https://fixture.invalid',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'private-fixture'})[k]},serve:h=>{handler=h;}},
  readBoundedJson:request=>readBoundedJson(request,{timeoutMs:25}),RequestBodyError,
  extractProductPreview,officialPreviewUrl,extractOfficialEvidence,officialProductUrl,
  Request,Response,Headers,URL,AbortSignal,TextDecoder,
  fetch:()=>{fetches++;throw Error('No source fetch is allowed in negative fixtures');},
  createClient:(_url,key)=>{clients++;assert.equal(key,'anon','negative request must not construct a privileged client');return {
   auth:{getUser:async()=>({data:{user:valid?{id:'member'}:null},error:null})},
   rpc:async()=>{rpcs++;return {data:{admitted},error:null};}
  };}
 });
 return {call:(body,headers={})=>handler(new Request('https://edge.invalid/'+name,{method:'POST',duplex:'half',headers:{Authorization:'Bearer fake', 'Content-Type':'application/json',...headers},body})),counts:()=>({clients,fetches,rpcs})};
}
for(const name of ['dic-verify-coffee']){
 test(name+': malformed, excessive, foreign-origin and content-type inputs are denied before SDK access',async()=>{
  for(const [body,headers,status] of [['{',{},400],['x'.repeat(5000),{},413],['{}',{'Content-Type':'text/plain'},415],['{}',{Origin:'https://attacker.invalid'},403]]){
   const f=edge(name),r=await f.call(body,headers);assert.equal(r.status,status);assert.deepEqual(f.counts(),{clients:0,fetches:0,rpcs:0});
  }
 });
 test(name+': blocked request stream times out without identity, quota, or source requests',async()=>{
  const f=edge(name),r=await f.call(new ReadableStream({pull(){return new Promise(()=>{});}}));
  assert.equal(r.status,408);assert.deepEqual(f.counts(),{clients:0,fetches:0,rpcs:0});
 });
 test(name+': valid syntax cannot bypass current membership or invalid identity',async()=>{
  const body=JSON.stringify(name==='dic-preview-coffee'?{source_url:'https://roaster.com/products/coffee'}:{submission_id:'11111111-1111-4111-8111-111111111111'});
  for(const valid of [true,false]){const f=edge(name,{valid}),r=await f.call(body);assert.equal(r.status,valid?403:401);assert.equal(f.counts().clients,1);assert.equal(f.counts().fetches,0);}
 });
}

test('retired legacy dic-preview-coffee cannot fetch, authorize, or accept any domain',async()=>{
 for(const [body,headers] of [['{',{}],['x'.repeat(5000),{}],
  ['{}',{'Content-Type':'text/plain'}],['{}',{Origin:'https://attacker.invalid'}],
  [JSON.stringify({source_url:'https://any-global-roaster.example.org/products/new-coffee'}),{}]]){
  const f=edge('dic-preview-coffee'),r=await f.call(body,headers);
  assert.equal(r.status,410);
  assert.equal((await r.json()).reason,'retired_endpoint');
  assert.deepEqual(f.counts(),{clients:0,fetches:0,rpcs:0});
 }
 const f=edge('dic-preview-coffee'),slow=await f.call(new ReadableStream({pull(){return new Promise(()=>{});}}));
 assert.equal(slow.status,410);
 assert.deepEqual(f.counts(),{clients:0,fetches:0,rpcs:0});
});
