import test from 'node:test';
import assert from 'node:assert/strict';
import {ORIGINAL,CANONICAL,STORE,exactStoreIdentity,classification,diagnose} from '../scripts/audit/issue33-r369-novo-transport.mjs';
const own={slug:'buesaco',name:'Buesaco',permalink:CANONICAL};
test('Store identity accepts only one exact chosen first-party product',()=>{
 assert.equal(exactStoreIdentity([own]),true);
 for(const x of [[],[own,own],[{...own,slug:'other'}],[{...own,name:'Other'}],
  [{...own,permalink:'https://elsewhere.example/product/buesaco'}],
  [{...own,permalink:'https://novocoffee.com/product/another'}],
  [{...own,permalink:'http://novocoffee.com/product/buesaco'}],{}])
  assert.equal(exactStoreIdentity(x),false);
});
test('invalid Store JSON never supplies product evidence',()=>{
 for(const x of ['not json','{}','null','[{}]'])assert.equal(exactStoreIdentity(x),false);
});
test('two anti-bot challenges are a blocked selected-HTML outcome',()=>{
 const b={ok:false,reason:'source_access_challenge'};
 assert.equal(classification(b,b,{exact_store_identity:true}),'BOTH_HTML_URLS_CHALLENGED');
});
test('Store-only identity cannot pass selected source afterproof',()=>{
 const b={ok:false,reason:'source_unavailable'};
 assert.equal(classification(b,b,{exact_store_identity:true}),'STORE_ONLY_HTML_UNAVAILABLE');
});
test('strictly bounded runner first-party probes never promote fields or save',async()=>{
 const calls=[];
 const r=await diagnose({
  htmlFetch:async (url,opts)=>{calls.push([url,opts.maxBytes]);return {ok:false,reason:'source_access_challenge'}},
  jsonFetch:async url=>{calls.push([url]);return {ok:true,json:JSON.stringify([own])}}
 });
 assert.deepEqual(calls,[[ORIGINAL,2000000],[CANONICAL,2000000],[STORE]]);
 assert.equal(r.verdict,'BOTH_HTML_URLS_CHALLENGED');
 assert.equal(r.hard_original241_source_acceptance,'NOT_RUN');
 assert.equal(r.source_fields_promoted,false);
 assert.equal(r.member_save,false);
 assert.equal(r.production_writes,0);
});
test('wrong selected H1 cannot establish current Buesaco even with valid HTML',async()=>{
 const r=await diagnose({
  htmlFetch:async()=>({ok:true,html:'<main><article class="product"><h1>Other Coffee</h1></article></main>'}),
  jsonFetch:async()=>({ok:false,reason:'source_unavailable'})
 });
 assert.equal(r.original.selected_html_parser_ui,false);
 assert.equal(r.verdict,'HTML_READABLE_BUT_IDENTITY_UNVERIFIED');
});
