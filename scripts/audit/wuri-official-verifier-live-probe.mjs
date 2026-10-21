// Opt-in unprivileged live Wuri source parity test. NO member access,
// Supabase keys/JWT/SQL, external writes, product HTML retention or deploy.
// Checks the CURRENT deployed-style deterministic verifier against real
// official page, not just the more flexible URL Autofill extractor.
import assert from 'node:assert/strict';
import {fetchPublicCoffeeHtml,safeCoffeeUrl} from '../../src/server/coffee-url-guard.mjs';
import {officialProductUrl,extractOfficialEvidence} from '../../supabase/functions/dic-verify-coffee/evidence.mjs';

const submitted={name:'Wuri',roaster:'Sweet Bloom',release_label:'',
 origin:'Gedeb, Ethiopia',process:'Washed',
 source_url:'https://sweetbloomcoffee.com/products/wuri'};
const registeredHost='sweetbloomcoffee.com';
const target=officialProductUrl(submitted.source_url,registeredHost);
assert.ok(target&&safeCoffeeUrl(target),'Only exact known HTTPS roaster product URL is allowed');
const response=await fetchPublicCoffeeHtml(target,{deadlineAt:Date.now()+20000});
if(!response?.ok){
 console.log('[DIC WURI OFFICIAL VERIFIER]',JSON.stringify({accepted:false,
  stage:'source_fetch',reason:response?.reason||'unavailable',
  productionMutation:false}));
 process.exitCode=1;
}else{
 const bytes=Buffer.byteLength(response.html,'utf8');
 const candidate=bytes>950000?{ok:false,reason:'edge_html_exceeds_950kb'}:
   extractOfficialEvidence(response.html,submitted);
 console.log('[DIC WURI OFFICIAL VERIFIER]',JSON.stringify({
  accepted: candidate.ok===true, reason:candidate.ok?null:candidate.reason,
  kind:candidate.evidence_kind||null, titleMatches:candidate.title_matches===true,
  productName:candidate.ok?candidate.product_name:null,htmlBytes:bytes,
  exactProductUrl:target, productSourceOnly:true,
  memberAuthenticated:false,productionMutation:false
 }));
 assert.equal(candidate.ok,true,'Real Wuri official page failed current verification rules; no real promotion is justified');
 assert.equal(candidate.title_matches,true);
}
