import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {isIP} from 'node:net';
import vm from 'node:vm';

// Examine ONLY the source URL guard, without loading Playwright, contacting roasters
// or creating any source packets, browser sessions or member data.
const script=path.resolve(import.meta.dirname,'../../scripts/audit/coffee-corpus-render.mjs');
const source=fs.readFileSync(script,'utf8');
const declaration=source.split('\n').filter(line=>line.startsWith('const publicUrl=raw=>'));
assert.equal(declaration.length,1,'Audit source must define exactly one URL gate');
const publicUrl=vm.runInNewContext(declaration[0]+'\npublicUrl',{URL,isIP});

test('allow conventional public HTTPS sources and dotted DNS names',()=>{
 for(const url of ['https://roaster.example/product','https://public.example./coffee'])
  assert.equal(publicUrl(url),true,url);
});
test('reject trailing-dot localhost/internal targets (previously accepted)',()=>{
 for(const url of ['https://localhost./','https://localhost.../','https://host.local./','https://gateway.internal./','https://service.corp./'])
  assert.equal(publicUrl(url),false,url);
});
test('preserve rejection of local literals and unsafe request URL forms',()=>{
 for(const url of ['https://localhost/','https://127.0.0.1/','https://[::1]/',
  'http://public.example/','https://user:pass@public.example/','https://public.example:8443/','not a URL'])
  assert.equal(publicUrl(url),false,url);
});
test('the audit URL gate stays a local synchronous filter, not a network request',()=>{
 assert.equal(source.includes('const publicUrl=raw=>'),true);
 assert.equal(publicUrl.constructor.name,'Function');
});
