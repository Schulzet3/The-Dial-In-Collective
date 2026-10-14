import test from 'node:test';
import assert from 'node:assert/strict';
import {officialProductUrl,productNameMatches,extractOfficialEvidence,normalizeWords}
 from '../supabase/functions/dic-verify-coffee/evidence.mjs';

const official='sweetbloomcoffee.com';
const html=(title,description='',productUrl='https://sweetbloomcoffee.com/products/hambela')=>
 \`<html><head><meta property="og:type" content="product"><meta property="og:title" content="\${title}"></head>
 <body><script type="application/ld+json">\${JSON.stringify({'@context':'https://schema.org','@graph':[
 {'@type':'WebSite',name:'Sweet Bloom'}, {'@type':'Product',name:title,description,url:productUrl}
 ]})}</script></body></html>\`;

test('known official product path is allowed; outside domain and redirect-like URL blocked',()=>{
 assert.equal(officialProductUrl('https://sweetbloomcoffee.com/products/hambela',official),
  'https://sweetbloomcoffee.com/products/hambela');
 assert.equal(officialProductUrl('https://www.sweetbloomcoffee.com/products/hambela?variant=123',official),
  'https://www.sweetbloomcoffee.com/products/hambela?variant=123');
 for(const u of [
  'http://sweetbloomcoffee.com/products/hambela',
  'https://sweetbloomcoffee.com.evil.test/products/hambela',
  'https://sweetbloomcoffee.com@127.0.0.1/products/hambela',
  'https://127.0.0.1/products/hambela',
  'https://sweetbloomcoffee.com:8443/products/hambela',
  'https://sweetbloomcoffee.com/admin',
  'https://sweetbloomcoffee.com/collections/all',
  'file:///etc/passwd',
  'https://sweetbloomcoffee.com/products/hambela#unsafe',
  'https://evil.test/redirect?url=https://sweetbloomcoffee.com/products/hambela'
 ])assert.equal(officialProductUrl(u,official),null,u);
});
test('all five Sweet Bloom roaster spellings are identity, not release proof',()=>{
 const names=['Sweet Bloom','Sweetbloom','Sweet Bloom Coffee','Sweet Bloom Coffee Roasters','Sweet-Bloom'];
 for(const n of names)assert.ok(normalizeWords(n).includes('sweet')||normalizeWords(n)==='sweetbloom');
 assert.equal(productNameMatches('Hambella','Hambela'),false);
 assert.equal(productNameMatches('Bavyeyi IV','BURUNDI | Bavyeyi IV | Bourbon | Natural'),true);
 assert.equal(productNameMatches('Wuri','Wuri Decaf'),false);
 assert.equal(productNameMatches('Hambela','Hambela 2025'),false);
 assert.equal(productNameMatches('Wuri','Wurist'),false);
});
test('verified official Product JSON-LD yields bounded evidence not arbitrary HTML',()=>{
 const sample=html('Hambela','Guji Ethiopia Natural process raspberry and chocolate');
 const out=extractOfficialEvidence(sample,{name:'Hambela',release_label:'',source_url:'https://sweetbloomcoffee.com/products/hambela'});
 assert.equal(out.ok,true);
 assert.equal(out.evidence_kind,'jsonld_product');
 assert.equal(out.product_name,'Hambela');
 assert.equal(out.verified_fields.name,'Hambela');
 assert.doesNotMatch(JSON.stringify(out),/<script|private|owner_id/i);
});
test('source evidence must match actual coffee and not an unrelated product carousel',()=>{
 const sample=html('Wuri','This is Wuri');
 const out=extractOfficialEvidence(sample,{name:'Hambela',source_url:'https://sweetbloomcoffee.com/products/hambela'});
 assert.equal(out.ok,false);
 assert.equal(out.reason,'product_title_not_verified');
});
test('source verification will not fabricate release year using page copyright',()=>{
 const sample=html('Hambela','Guji natural',undefined)+'<footer>Copyright 2026</footer>';
 const out=extractOfficialEvidence(sample,{name:'Hambela',release_label:'2026 harvest',source_url:'https://sweetbloomcoffee.com/products/hambela'});
 assert.equal(out.ok,false);
});
test('source with different official product URL cannot verify another catalog item',()=>{
 const sample=html('Hambela','Guji natural','https://sweetbloomcoffee.com/products/different');
 const out=extractOfficialEvidence(sample,{name:'Hambela',source_url:'https://sweetbloomcoffee.com/products/hambela'});
 assert.equal(out.ok,false);
 assert.equal(out.reason,'structured_product_url_mismatch');
});
test('conflicting verified process rejects auto promotion',()=>{
 const sample='<script type="application/ld+json">'+JSON.stringify({
  '@type':'Product',name:'Hambela',
  additionalProperty:[{name:'Process',value:'Natural'}]
 })+'</script>';
 const out=extractOfficialEvidence(sample,{name:'Hambela',process:'Washed'});
 assert.equal(out.ok,false);assert.equal(out.reason,'process_conflict');
});
test('nonproduct pages never auto-approve, even if title is an exact string',()=>{
 const page='<html><head><title>Hambela</title><meta property="og:title" content="Hambela"></head></html>';
 const out=extractOfficialEvidence(page,{name:'Hambela'});
 assert.equal(out.ok,false);
});
test('page size, badly formed markup and ambiguous products fail safely',()=>{
 assert.equal(extractOfficialEvidence('x'.repeat(950001),{name:'Hambela'}).ok,false);
 assert.equal(extractOfficialEvidence('<script type="application/ld+json">INVALID</script>',{name:'Hambela'}).ok,false);
 const multi='<script type="application/ld+json">'+JSON.stringify([
 {'@type':'Product',name:'Hambela'},{'@type':'Product',name:'Hambela'}
 ])+'</script>';
 assert.equal(extractOfficialEvidence(multi,{name:'Hambela'}).ok,false);
});
test('source worker only deploys behind verified JWT and uses service-only database APIs',async()=>{
 const {readFileSync}=await import('node:fs');
 const f=readFileSync(new URL('../supabase/functions/dic-verify-coffee/index.ts',import.meta.url),'utf8');
 assert.match(f,/\\.auth\\.getUser\\(token\\)/);
 assert.match(f,/dic_source_check_target/);
 assert.match(f,/dic_source_claim/);
 assert.match(f,/dic_trusted_source_verify/);
 assert.match(f,/redirect:'manual'/);
 assert.match(f,/AbortSignal\\.timeout\\(10000\\)/);
 assert.match(f,/const link=officialProductUrl/);
 assert.doesNotMatch(f,/fetch\\(target\\.source_url/);
});
