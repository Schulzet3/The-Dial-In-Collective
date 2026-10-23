import test from 'node:test';
import assert from 'node:assert/strict';
import {readBoundedJson} from '../supabase/functions/_shared/request-budget.mjs';
const req=(body,headers={},signal)=>new Request('https://audit.invalid/',{method:'POST',headers:{'Content-Type':'application/json',...headers},body,signal,duplex:'half'});
const rejects=(request,code,options)=>assert.rejects(()=>readBoundedJson(request,options),error=>error.code===code);
test('bounded JSON preserves objects and counts UTF-8 bytes, not JavaScript characters',async()=>{
 assert.deepEqual(await readBoundedJson(req('{"x":1}')),{x:1});
 await rejects(req(JSON.stringify({x:'\u00e9'.repeat(2100)})),'request_too_large');
});
test('invalid, misleading, null and array JSON requests are rejected',async()=>{
 for(const value of ['{','null','[]','"hello"'])await rejects(req(value),'invalid_json');
 await rejects(req('{}',{'Content-Type':'text/plain'}),'invalid_content_type');
 await rejects(req('{}',{'Content-Type':'text/application/json-malformed'}),'invalid_content_type');
 await rejects(req(new Uint8Array([0xc0,0xaf])),'invalid_json');
});
test('false length, negative length and advertised oversized requests fail before parsing',async()=>{
 for(const length of ['-1','9e8','4201'])await rejects(req('{}',{'Content-Length':length}),'request_too_large');
 await rejects(req(JSON.stringify({x:'x'.repeat(5000)}),{'Content-Length':'1'}),'request_too_large');
});
test('stalled body and indefinitely blocked cancellation cannot occupy the handler forever',async()=>{
 let cancelled=false;
 const body=new ReadableStream({pull(){return new Promise(()=>{});},cancel(){cancelled=true;return new Promise(()=>{});}});
 await rejects(req(body),'request_timeout',{timeoutMs:25});assert.equal(cancelled,true);
});
test('slow chunks do not renew the absolute body deadline',async()=>{
 let cancel=false;
 const body=new ReadableStream({async pull(c){await new Promise(resolve=>setTimeout(resolve,15));try{c.enqueue(new TextEncoder().encode(' '));}catch{/* Cancelled by the absolute deadline. */}},cancel(){cancel=true;}});
 await rejects(req(body),'request_timeout',{timeoutMs:35});assert.equal(cancel,true);
});
test('abort stops a blocked read and already-aborted requests fail closed',async()=>{
 const ac=new AbortController();ac.abort();await rejects(req('{}',{},ac.signal),'request_aborted');
 const controller=new AbortController(),request=req(new ReadableStream({pull(){return new Promise(()=>{});}}),{},controller.signal);
 const pending=rejects(request,'request_aborted');controller.abort();await pending;
});
test('early valid completion releases its stream lock and timer',async()=>{
 const request=req('{"source_url":"https://example.invalid/products/coffee"}');
 assert.equal((await readBoundedJson(request,{timeoutMs:25})).source_url,'https://example.invalid/products/coffee');
 assert.equal(request.body.locked,false);
});
