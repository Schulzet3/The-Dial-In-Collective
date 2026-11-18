// R309: mocked bounded HTTPS transport, no real network or member writes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {fetchPublicCoffeeHtml,isCoffeeSourceAccessChallenge} from '../src/server/coffee-url-guard.mjs';
const url='https://merchant-roaster.example.net/products/current-lot';
const access='<!DOCTYPE html><html lang=en><head><title>One moment, please...</title><script nonce="x">setTimeout(function(){window.location.reload()},5000)</script></head><body>Checking browser</body></html>';
const product='<html><head><title>Breakfast Blend</title></head><body><main><h1>Breakfast Blend</h1><p>Central and South Americas. Medium body with mild acidity.</p></main></body></html>';
function mock(html,mime='text/html'){
 return (opts,respond)=>{
  assert.equal(opts.protocol,'https:');assert.equal(opts.rejectUnauthorized,true);
  assert.equal(opts.hostname,'merchant-roaster.example.net');
  const req=new EventEmitter();req.destroy=()=>{};
  req.end=()=>queueMicrotask(()=>{
   const res=new EventEmitter();res.statusCode=200;res.headers={'content-type':mime};res.destroy=()=>{};
   respond(res);res.emit('data',Buffer.from(html));res.emit('end');
  });
  return req;
 };
}
test('R309 current anti-bot 200 HTML challenge becomes source inaccessible',async()=>{
 assert.equal(isCoffeeSourceAccessChallenge(Buffer.from(access)),true);
 const r=await fetchPublicCoffeeHtml(url,{request:mock(access)});
 assert.equal(r.ok,false);assert.equal(r.reason,'source_access_challenge');
 assert.equal(r.source_url,url);assert.equal(r.html,undefined);
});
test('R309 actual selected H1 remains accepted',async()=>{
 const r=await fetchPublicCoffeeHtml(url,{request:mock(product)});
 assert.equal(isCoffeeSourceAccessChallenge(product),false);
 assert.equal(r.ok,true);assert.equal(r.html,product);
});
test('R309 H1 positive protection even if scripts and challenge title happen to coexist',async()=>{
 const source=product.replace('<title>Breakfast Blend</title>','<title>One moment, please...</title>')+
  '<script>setTimeout(function(){window.location.reload()},5000)</script>';
 assert.equal(isCoffeeSourceAccessChallenge(source),false);
 assert.equal((await fetchPublicCoffeeHtml(url,{request:mock(source)})).ok,true);
});
test('R309 title alone or reload alone cannot classify as challenge',async()=>{
 for(const source of ['<html><title>One moment, please...</title><body><p>legitimate</p></body></html>',
  '<html><title>Current Coffee</title><script>window.location.reload()</script></html>']){
  assert.equal(isCoffeeSourceAccessChallenge(source),false);
  assert.equal((await fetchPublicCoffeeHtml(url,{request:mock(source)})).ok,true);
 }
});
test('R309 existing strict MIME guard still rejects non HTML',async()=>{
 const r=await fetchPublicCoffeeHtml(url,{request:mock(access,'application/octet-stream')});
 assert.equal(r.ok,false);assert.equal(r.reason,'not_html');
});
