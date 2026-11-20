import test from 'node:test';
import assert from 'node:assert/strict';
import {classify241Transport,ORIGINAL,CANONICAL,STORE} from '../scripts/audit/issue33-r350-241-transport.mjs';
const good={ok:true,selected_identity:true,parser_ok:true,add_coffee_rendered:true,
 source_review_rendered:true,html_sha256:'a'.repeat(64),html_bytes:231092};
test('original exact Buesaco route and canonical slash use same HTTPS host',()=>{
 assert.equal(new URL(ORIGINAL).hostname,new URL(CANONICAL).hostname);
 assert.equal(new URL(ORIGINAL).pathname+'/',new URL(CANONICAL).pathname);
 assert.equal(new URL(STORE).hostname,new URL(ORIGINAL).hostname);
});
test('Store API alone cannot turn challenged selected HTML into PASS',()=>{
 assert.equal(classify241Transport({original:{ok:false,reason:'source_access_challenge'},
  canonical:{ok:false,reason:'source_access_challenge'},store:{ok:true,exact_buesaco_count:1}}),
  'UNAVAILABLE_NO_PRIMARY_PROOF');
});
test('original selected HTML requires current parser, identity and both read-only UI renderings',()=>{
 for(const field of ['selected_identity','parser_ok','add_coffee_rendered','source_review_rendered']){
  assert.equal(classify241Transport({original:{...good,[field]:false}}),'UNAVAILABLE_NO_PRIMARY_PROOF');
 }
});
test('canonical only counts with exact chosen HTML hash and actual source preview',()=>{
 assert.equal(classify241Transport({original:{ok:false},canonical:good}),'CURRENT_SELECTED_PRIMARY_HTML_AND_PARSER_OBSERVED');
 assert.equal(classify241Transport({canonical:{...good,html_bytes:0}}),'UNAVAILABLE_NO_PRIMARY_PROOF');
 assert.equal(classify241Transport({canonical:{...good,html_sha256:'not_sha'}}),'UNAVAILABLE_NO_PRIMARY_PROOF');
});
