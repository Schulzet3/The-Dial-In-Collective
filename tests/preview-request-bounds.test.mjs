import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreviewHandler} from '../netlify/functions/coffee-url-preview.mjs';
const env=key=>key==='SUPABASE_URL'?'https://test.supabase.co':'sb_publishable_test';
test('oversized chunked requests are cancelled before reading the entire body',async()=>{
 let cancelled=false,pulls=0,apiCalls=0;
 const body=new ReadableStream({pull(controller){pulls++;controller.enqueue(new Uint8Array(3000));if(pulls===10)controller.close();},cancel(){cancelled=true;}});
 const request=new Request('https://app.example/api/coffee-preview',{method:'POST',duplex:'half',body,headers:{'Content-Type':'application/json',Authorization:'Bearer test'}});
 const response=await createPreviewHandler({env,apiFetch:async()=>{apiCalls++;}})(request);
 assert.equal(response.status,400);assert.equal(cancelled,true);assert.ok(pulls<10);assert.equal(apiCalls,0);
});
test('a bounded request still reaches admission and returns the original fields',async()=>{
 let calls=0;
 const handler=createPreviewHandler({env,apiFetch:async()=>new Response(JSON.stringify(++calls===1?{id:'member'}:calls===2?{admitted:true,emailVerified:true}:{allowed:true})),readHtml:async()=>({ok:true,html:'product'}),extract:()=>({ok:true,fields:{name:'Coffee'}})});
 const response=await handler(new Request('https://app.example/api/coffee-preview',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer test'},body:JSON.stringify({source_url:'https://roaster.com/products/coffee'})}));
 assert.equal(response.status,200);assert.equal((await response.json()).fields.name,'Coffee');assert.equal(calls,3);
});
