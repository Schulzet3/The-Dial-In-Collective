import {readBoundedJson,RequestBodyError} from '../supabase/functions/_shared/request-budget.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {extractOfficialEvidence,officialProductUrl} from '../supabase/functions/dic-verify-coffee/evidence.mjs';

// Execute the real Edge request handler with synthetic SDK/network responses.
// No Supabase account, real submission, or external product page is touched.
const source=readFileSync(new URL('../supabase/functions/dic-verify-coffee/index.ts',import.meta.url),'utf8').replace(/^import .*?;\n/gm,'');
const SID='a1111111-1111-4111-8111-111111111111';
const origin='https://app.dialincollective.com';
function fixture({admitted=true,statusError=null,owner='member',authenticated=true,submissionStatus='pending',alreadyVerified=false,promoteError=null,releaseLabel='',productDescription=''}={}){
 const calls=[],trusted=[];let handler;
 const productUrl='https://sweetbloomcoffee.com/products/hambela';
 const createClient=(_url,key)=>{
  calls.push('client:'+key);
  if(key==='anon')return {
   auth:{async getUser(){calls.push('identity');return authenticated?{data:{user:{id:'member'}}}:{data:{user:null},error:{message:'Expired'}};}},
   async rpc(name){calls.push(name);return {data:{admitted},error:statusError};}
  };
  return {
   from(){calls.push('submission_read');return {select:()=>({eq:()=>({async maybeSingle(){return {data:{id:SID,owner_id:owner,status:submissionStatus,canonical_coffee_id:'canonical'}};}})})};},
   async rpc(name,args){calls.push(name);if(name==='dic_trusted_source_verify'){trusted.push(args);if(promoteError)return {error:promoteError};}
    return {data:{
     dic_source_check_target:{official_host:'sweetbloomcoffee.com',source_url:productUrl,name:'Hambela',release_label:releaseLabel,submission_revision:7},
     dic_source_claim:{allowed:true},dic_trusted_source_verify:{ok:true,coffee_id:'canonical',already_verified:alreadyVerified}
    }[name]};}
  };
 };
 const context=vm.createContext({Deno:{env:{get:name=>({SUPABASE_URL:'https://fixture.invalid',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'service'})[name]},serve:fn=>{handler=fn;}},
  readBoundedJson,RequestBodyError,createClient,extractOfficialEvidence,officialProductUrl,Response,URL,TextDecoder,AbortSignal,
  fetch:async()=>{calls.push('fetch');return new Response('<script type="application/ld+json">'+JSON.stringify({'@type':'Product',name:'Hambela',url:productUrl,description:productDescription})+'</script>',{headers:{'Content-Type':'text/html'}});}});
 vm.runInContext(source,context);
 return {calls,trusted,request:()=>handler(new Request('https://edge.invalid/dic-verify-coffee',{method:'POST',headers:{origin,Authorization:'Bearer fixture-token','Content-Type':'application/json'},body:JSON.stringify({submission_id:SID})}))};
}
test('revoked beta member cannot start any privileged verification operation',async()=>{
 const f=fixture({admitted:false}),response=await f.request();
 assert.equal(response.status,403);assert.equal((await response.json()).reason,'admitted_member_required');
 assert.deepEqual(f.calls,['client:anon','identity','dic_session_status']);
});
test('membership check errors fail closed before constructing the service client',async()=>{
 const f=fixture({statusError:{message:'Unavailable'}}),response=await f.request();
 assert.equal(response.status,403);assert.equal(f.calls.includes('client:service'),false);assert.equal(f.calls.includes('fetch'),false);
});
test('invalid login never attempts membership or privileged operations',async()=>{
 const f=fixture({authenticated:false}),response=await f.request();
 assert.equal(response.status,401);assert.deepEqual(f.calls,['client:anon','identity']);
});
test('admitted user still cannot verify another owner submission',async()=>{
 const f=fixture({owner:'another-member'}),response=await f.request();
 assert.equal(response.status,403);assert.equal((await response.json()).reason,'submission_not_accessible');
 assert.equal(f.calls.includes('dic_source_claim'),false);assert.equal(f.calls.includes('fetch'),false);
});
test('admitted owner retains the bounded claim, fetch and evidence verification path',async()=>{
 const f=fixture(),response=await f.request();
 const result=await response.json();
 assert.equal(response.status,200);assert.equal(result.status,'verified');assert.equal(result.source_verified,true);
 assert.equal(f.trusted[0].submission_id,SID);assert.equal(f.trusted[0].evidence.submission_revision,7);
 assert.deepEqual(f.calls,['client:anon','identity','dic_session_status','client:service','submission_read','dic_source_check_target','dic_source_claim','fetch','dic_trusted_source_verify']);
});
test('an admitted owner cannot promote a recurring yearless harvest window as a verified release',async()=>{
 for(const releaseLabel of ['January','July–September','Spring / Summer',': November – April']){
  const f=fixture({releaseLabel,productDescription:'Harvest period: '+releaseLabel+'. A washed coffee.'});
  const response=await f.request(),result=await response.json();
  assert.equal(response.status,200);assert.equal(result.status,'pending');assert.equal(result.reason,'product_title_not_verified');
  assert.equal(f.calls.includes('fetch'),true);assert.equal(f.calls.includes('dic_trusted_source_verify'),false);assert.equal(f.trusted.length,0);
 }
 const dated=fixture({releaseLabel:'January 2026',productDescription:'Harvest period: January 2026. A washed coffee.'});
 assert.equal((await (await dated.request()).json()).status,'verified');assert.equal(dated.trusted.length,1);
});
test('generic microlot proof stays pending while a published numbered microlot can verify',async()=>{
 const generic=fixture({releaseLabel:'Microlot',productDescription:'Lot: Microlot. A washed coffee.'});
 const rejected=await(await generic.request()).json();
 assert.equal(rejected.status,'pending');assert.equal(rejected.reason,'product_title_not_verified');
 assert.equal(generic.calls.includes('dic_trusted_source_verify'),false);assert.equal(generic.trusted.length,0);
 const numbered=fixture({releaseLabel:'Microlot 7',productDescription:'Lot: Microlot 7. A washed coffee.'});
 assert.equal((await(await numbered.request()).json()).status,'verified');assert.equal(numbered.trusted.length,1);
});
test('approval during the product fetch cannot be mislabeled as new official evidence',async()=>{
 const f=fixture({alreadyVerified:true}),response=await f.request(),result=await response.json();
 assert.equal(result.ok,true);assert.equal(result.status,'verified');assert.equal(result.source_verified,false);
 assert.equal(f.calls.includes('fetch'),true);assert.equal(f.calls.includes('dic_trusted_source_verify'),true);
});
test('changed submission revision stays Pending when the trusted write rejects stale evidence',async()=>{
 const f=fixture({promoteError:{code:'40001',message:'Submission changed'}}),response=await f.request(),result=await response.json();
 assert.equal(result.ok,false);assert.equal(result.status,'pending');assert.equal(result.reason,'verification_requires_review');
 assert.equal(result.source_verified,undefined);assert.equal(f.trusted[0].evidence.submission_revision,7);
});
test('concurrent catalog approval never becomes a claim that official source evidence was checked',async()=>{
 for(const submissionStatus of ['approved','merged']){
  const f=fixture({submissionStatus}),response=await f.request(),result=await response.json();
  assert.equal(response.status,200);assert.equal(result.status,'verified');
  assert.equal(result.source_verified,false);assert.equal(result.coffee_id,'canonical');
  assert.deepEqual(f.calls,['client:anon','identity','dic_session_status','client:service','submission_read']);
 }
});
