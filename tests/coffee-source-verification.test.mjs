import test from 'node:test';
import assert from 'node:assert/strict';
import {officialProductUrl,productNameMatches,extractOfficialEvidence,normalizeWords}
 from '../supabase/functions/dic-verify-coffee/evidence.mjs';

const official='sweetbloomcoffee.com';
const html=(title,description='',productUrl='https://sweetbloomcoffee.com/products/hambela')=>
 `<html><head><meta property="og:type" content="product"><meta property="og:title" content="${title}"></head>
 <body><script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@graph':[
 {'@type':'WebSite',name:'Sweet Bloom'}, {'@type':'Product',name:title,description,url:productUrl}
 ]})}</script></body></html>`;

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
  'https://sweetbloomcoffee.com/products/hambela?redirect=https://internal.test',
  'https://sweetbloomcoffee.com/products/hambela?next=http://127.0.0.1',
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
test('a matching year cannot verify a contradictory or missing lot or named release',()=>{
 const page=html('Hambela','Harvest 2026. Lot 17, washed process.');
 for(const release_label of ['Lot 42 2026','2026 Special Reserve','Batch 4 2026']){
  const out=extractOfficialEvidence(page,{name:'Hambela',release_label});
  assert.equal(out.ok,false,release_label);
 }
 assert.equal(extractOfficialEvidence(page,{name:'Hambela',release_label:'2026 harvest'}).ok,true);
 const proved=html('Hambela','Our Lot 42 2026 release is washed.');
 assert.equal(extractOfficialEvidence(proved,{name:'Hambela',release_label:'Lot 42 2026'}).ok,true);
});
test('release-year proof excludes company history and contradicting harvest evidence',()=>{
 const page=html('Mango Tree Blend','Our company was founded in 2025. This product is from the 2024 harvest.');
 for(const release_label of ['2025','2025 Harvest','Harvest 2025'])
  assert.equal(extractOfficialEvidence(page,{name:'Mango Tree Blend',release_label}).ok,false,release_label);
 assert.equal(extractOfficialEvidence(page,{name:'Mango Tree Blend',release_label:'2024 Harvest'}).ok,true);
 const ambiguous=html('Hambela','Harvest 2025. Crop year: 2024.');
 for(const release_label of ['2025','2024','2025 Harvest'])
  assert.equal(extractOfficialEvidence(ambiguous,{name:'Hambela',release_label}).ok,false,release_label);
 const unrelated=html('Hambela','Our roaster started in 2025. A washed Ethiopian coffee.');
 assert.equal(extractOfficialEvidence(unrelated,{name:'Hambela',release_label:'2025'}).ok,false);
});
test('explicit release ranges and product identity remain bounded evidence',()=>{
 const page=html('Hambela','Crop year: 2025/2026. Founded in 1988.');
 assert.equal(extractOfficialEvidence(page,{name:'Hambela',release_label:'2025/2026 harvest'}).ok,true);
 assert.equal(extractOfficialEvidence(page,{name:'Hambela',release_label:'2025'}).ok,false);
 assert.equal(extractOfficialEvidence(html('Hambela 2025'),{name:'Hambela 2025',release_label:'2025'}).ok,true);
 assert.equal(extractOfficialEvidence(html('Hambela 2025','Harvest 2024'),
  {name:'Hambela 2025',release_label:'2025'}).ok,false);
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
 assert.ok(f.includes('.auth.getUser(token)'));
 assert.match(f,/dic_source_check_target/);
 assert.match(f,/dic_source_claim/);
 assert.match(f,/dic_trusted_source_verify/);
 assert.match(f,/redirect:'manual'/);
 assert.ok(f.includes('AbortSignal.timeout(10000)'));
 assert.match(f,/const link=officialProductUrl/);
 assert.ok(!f.includes('fetch(target.source_url'));
});

test('official verifier allows the custom beta app origin while rejecting wildcard origins',async()=>{
 const {readFileSync}=await import('node:fs');
 const source=readFileSync(new URL('../supabase/functions/dic-verify-coffee/index.ts',import.meta.url),'utf8');
 assert.match(source,/'https:\/\/app\.dialincollective\.com'/);
 assert.match(source,/if\(origin&&!allowOrigins\.has\(origin\)\)/);
 assert.doesNotMatch(source,/Access-Control-Allow-Origin':\s*'\*'/);
});

test('metadata-poor official Wuri product with one matching H1 can verify exact 2026 release',()=>{
 const page='<html><head><title>Wuri – Sweet Bloom Coffee</title></head><body>'+
  '<nav>Shop Coffee</nav><main><h1>Wuri</h1><h4>Heirloom Variety</h4>'+
  '<p>Our last washed Ethiopian selection for 2026 comes from Wuri washing station.</p>'+
  '<h3>Espresso</h3><p>COFFEE IN 18.5g ESPRESSO OUT 36g BREW TIME 20-22s</p></main></body></html>';
 const input={name:'Wuri',roaster:'Sweet Bloom Coffee',release_label:'2026',
  source_url:'https://sweetbloomcoffee.com/products/wuri'};
 const verified=extractOfficialEvidence(page,input);
 assert.equal(verified.ok,true);
 assert.equal(verified.evidence_kind,'official_product_page');
 assert.equal(verified.product_name,'Wuri');
 assert.equal(verified.release_label,'2026');
 assert.equal(verified.title_matches,true);
 const falseTitle=extractOfficialEvidence(page,{...input,name:'Wurist'});
 assert.equal(falseTitle.ok,false);
 const falseYear=extractOfficialEvidence(page,{...input,release_label:'2025'});
 assert.equal(falseYear.ok,false);
 const badPage=extractOfficialEvidence(page,{...input,source_url:'https://sweetbloomcoffee.com/admin'});
 assert.equal(badPage.ok,false);
 const doubled=extractOfficialEvidence(page.replace('</main>','<h1>Wuri Blend</h1></main>'),input);
 assert.equal(doubled.ok,false);
});

test('official H1 release proof ignores a footer-only copyright year',()=>{
 const page='<html><main><h1>Wuri</h1><p>Washed coffee in Ethiopia.</p></main>'+
  '<footer>Copyright 2026 Sweet Bloom Coffee</footer></html>';
 const found=extractOfficialEvidence(page,{name:'Wuri',release_label:'2026',
  source_url:'https://sweetbloomcoffee.com/products/wuri'});
 assert.equal(found.ok,false);
 assert.equal(found.reason,'product_title_not_verified');
});

test('Pending official-source retry uses authenticated stored owner submission',async()=>{
 const {readFileSync}=await import('node:fs');
 const source=readFileSync(new URL('../site/cloud/main.js',import.meta.url),'utf8');
 assert.match(source,/Retry Official Source Check/);
 assert.match(source,/if\(a==='retry-pending-source'\)/);
 assert.match(source,/this\.client\.verifyCoffeeSource\(submission\.id\)/);
 assert.match(source,/submission\.status!=='pending'/);
 assert.doesNotMatch(source,/dic_trusted_source_verify/);
});


test('official product facts cannot certify conflicting origin or producer',()=>{
 const product=(properties)=>'<script type="application/ld+json">'+JSON.stringify({
  '@type':'Product',name:'Wuri',url:'https://sweetbloomcoffee.com/products/wuri',
  additionalProperty:properties.map(([name,value])=>({name,value}))
 })+'</script>';
 const page=product([['Origin','Gedeb, Ethiopia'],['Producer','Wuri Washing Station'],['Process','Washed']]);
 const entry={name:'Wuri',source_url:'https://sweetbloomcoffee.com/products/wuri',
  origin:'Ethiopia',producer:'Wuri Washing Station',process:'Washed'};
 const ok=extractOfficialEvidence(page,entry);
 assert.equal(ok.ok,true);
 assert.equal(ok.verified_fields.origin,'Gedeb, Ethiopia');
 assert.equal(ok.verified_fields.producer,'Wuri Washing Station');
 assert.equal(extractOfficialEvidence(page,{...entry,origin:'Huila, Colombia'}).reason,'origin_conflict');
 assert.equal(extractOfficialEvidence(page,{...entry,origin:'Huila, Ethiopia'}).reason,'origin_conflict');
 assert.equal(extractOfficialEvidence(page,{...entry,producer:'Different Farm'}).reason,'producer_conflict');
 assert.equal(extractOfficialEvidence(page,{...entry,process:'Natural'}).reason,'process_conflict');
 assert.equal(extractOfficialEvidence(page,{...entry,origin:'Gedeb, Ethiopia'}).ok,true);
 assert.equal(extractOfficialEvidence(product([['Origin','Ethiopia'],['Origin','Colombia']]),entry).reason,'ambiguous_product_facts');
 const unknown=extractOfficialEvidence(product([]),entry);
 assert.equal(unknown.ok,true);
 assert.equal('origin' in unknown.verified_fields,false);
 assert.equal('producer' in unknown.verified_fields,false);
});
