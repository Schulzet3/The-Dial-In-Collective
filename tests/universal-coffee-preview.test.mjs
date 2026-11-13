import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EventEmitter} from 'node:events';
import {safeCoffeeUrl,isGlobalIpv4,guardedLookup,fetchPublicCoffeeHtml,fetchPublicCoffeeJson,MAX_HTML_BYTES} from '../src/server/coffee-url-guard.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {ecwidProductRequest,extractEcwidSnapshotData,extractEcwidProduct,sameEcwidTitle} from '../src/server/coffee-ecwid-snapshot.mjs';
import {shopifyProductRequest,extractShopifyAjaxData,extractShopifyProduct,mergeShopifyPreview} from '../src/server/coffee-shopify-ajax.mjs';
import {wooProductRequest,extractWooStoreData,extractWooProduct} from '../src/server/coffee-woocommerce-store.mjs';
import {createPreviewHandler,config} from '../netlify/functions/coffee-url-preview.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';

const productURL='https://unknownartisanroaster.com/shop/coffees/ethiopia?variant=123';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const product={
 '@context':'https://schema.org','@type':'Product',name:'Ethiopia 2026',url:productURL,
 brand:{'@type':'Brand',name:'Unknown Artisan Roaster'},
 additionalProperty:[
  {name:'Origin',value:'Sidama, Ethiopia'},{name:'Processing',value:'Washed'},
  {name:'Varietal',value:'Heirloom'},{name:'Elevation',value:'1,900 m'},
  {name:'Tasting Notes',value:'Peach, bergamot, honey'},{name:'Harvest',value:'2026'},
  {name:'Roast Level',value:'Light-Medium'}
 ]
};
const wrap=product=>'<html><head><meta property="og:type" content="product"></head><body>'+
 '<script type="application/ld+json">'+JSON.stringify(product)+'</script></body></html>';
const wuriURL='https://sweetbloomcoffee.com/products/wuri';
const wuri='<html><head><meta property="og:title" content="Wuri – Sweet Bloom Coffee">'+
 '<meta property="og:site_name" content="Sweet Bloom Coffee"></head><body><nav>Shop Current Coffee</nav>'+
 '<main><h1>Wuri</h1><h4>Heirloom Variety</h4><p>Gedeb, Ethiopia</p>'+
 '<p>citra hops, mandarin, sugarcane</p><p>washed process</p>'+
 '<div><h2>2000-2100 masl</h2>Elevation</div><h2>850 small scale producers</h2><span>PRODUCER</span>'+
 '<p>Our last washed offering from Ethiopia for 2026 comes from the Wuri washing station.</p>'+
 '<h3>Espresso</h3><p>COFFEE IN 18.5g</p><p>ESPRESSO OUT 36g</p><p>BREW TIME 20-22s</p>'+
 '</main><h2>More coffees</h2><p>Different Coffee from 2027</p></body></html>';

test('unknown public roaster URLs are allowed; private and unsafe hosts are rejected',()=>{
 assert.equal(safeCoffeeUrl(productURL).hostname,'unknownartisanroaster.com');
 assert.equal(safeCoffeeUrl(wuriURL).hostname,'sweetbloomcoffee.com');
 assert.ok(safeCoffeeUrl('https://another-roaster.co.uk/beans/lot'));
 const bad=['http://roaster.com/coffee','https://localhost/products/coffee',
  'https://roaster.local/products/coffee','https://metadata.google.internal/latest',
  'https://127.0.0.1/coffee','https://169.254.169.254/latest','https://[::1]/coffee',
  'https://10.0.0.8/coffee','https://user:pass@roaster.com/coffee',
  'https://roaster.com:8443/coffee','https://roaster.com/coffee#bad',
  'https://roaster.test/coffee','file:///etc/passwd','https://roaster.com/'+'x'.repeat(900)];
 for(const x of bad)assert.equal(safeCoffeeUrl(x),null,x);
});
test('global IPv4 test excludes local, carrier NAT, reserved, multicast and mapped IPv6',()=>{
 const blocked=['0.0.0.0','10.0.0.2','100.64.0.1','127.0.0.1','169.254.169.254','172.16.1.2',
  '192.0.0.8','192.0.2.45','192.168.1.1','198.18.0.1','198.51.100.10','203.0.113.1','224.0.0.1','255.255.255.255','::1','::ffff:127.0.0.1'];
 for(const ip of blocked)assert.equal(isGlobalIpv4(ip),false,ip);
 for(const ip of ['1.1.1.1','8.8.8.8','172.32.0.1','203.0.114.1'])
  assert.equal(isGlobalIpv4(ip),true,ip);
});
const dnsLookup=answers=>new Promise(resolve=>{
 guardedLookup((_host,_options,cb)=>cb(null,answers))
 ('unknownartisanroaster.com',{},(err,ip,family)=>resolve({err,ip,family}));
});
test('connection-time pinned DNS check rejects any mixed or private A answer',async()=>{
 assert.equal((await dnsLookup([{address:'8.8.8.8',family:4}])).ip,'8.8.8.8');
 assert.match((await dnsLookup([{address:'8.8.8.8',family:4},{address:'127.0.0.1',family:4}])).err.message,/unsafe_dns_target/);
 assert.match((await dnsLookup([{address:'169.254.169.254',family:4}])).err.message,/unsafe_dns_target/);
 assert.match((await dnsLookup([])).err.message,/unsafe_dns_target/);
 await new Promise(done=>{
  guardedLookup(()=>{throw Error('Never query direct IP');})('127.0.0.1',{},e=>{
   assert.match(e.message,/unsafe_dns_host/);done();
  });
 });
});
const mockRequest=({status=200,type='text/html',body='<html>coffee</html>',location=null}={})=>{
 const seen=[];
 const request=(options,callback)=>{
  const req=new EventEmitter();
  req.end=()=>{
   const res=new EventEmitter();
   res.statusCode=status;res.headers={'content-type':type,...(location?{location}:{})};
   res.destroy=()=>{};
   queueMicrotask(()=>{
    callback(res);
    if(status===200){res.emit('data',Buffer.from(body));res.emit('end');}
   });
  };
  req.destroy=()=>{};
  seen.push(options);
  return req;
 };
 return {seen,request};
};
test('secure fetch uses pinned TLS, refuses redirects and bounds body',async()=>{
 const f=mockRequest();
 assert.equal((await fetchPublicCoffeeHtml(productURL,{request:f.request})).ok,true);
 const options=f.seen[0];
 assert.equal(options.hostname,'unknownartisanroaster.com');
 assert.equal(options.servername,'unknownartisanroaster.com');
 assert.equal(options.rejectUnauthorized,true);
 assert.equal(options.agent,false);
 assert.equal(typeof options.lookup,'function');
 assert.equal(options.method,'GET');
 assert.equal(options.path,'/shop/coffees/ethiopia?variant=123');
 assert.equal(Object.keys(options.headers).some(k=>/authorization|cookie|apikey/i.test(k)),false);
 assert.equal((await fetchPublicCoffeeHtml(productURL,{request:mockRequest({status:302}).request})).reason,'redirect_requires_review');
 assert.equal((await fetchPublicCoffeeHtml(productURL,{request:mockRequest({body:'x'.repeat(MAX_HTML_BYTES+1)}).request})).reason,'page_too_large');
});
test('HTTPS redirects can be followed only through fresh validated pinned connections',async()=>{
 const bad=mockRequest({status:302,location:'https://127.0.0.1/secrets'});
 const blocked=await fetchPublicCoffeeHtml(productURL,{request:bad.request});
 assert.equal(blocked.reason,'redirect_requires_review');
 assert.equal(bad.seen.length,1);
 const downgrade=mockRequest({status:301,location:'http://unknownartisanroaster.com/coffee'});
 assert.equal((await fetchPublicCoffeeHtml(productURL,{request:downgrade.request})).reason,'redirect_requires_review');
 let count=0;
 const original=[];
 const safeRequest=(options,cb)=>{
  original.push(options);
  const opts=count++===0?{status:302,location:'/products/new-lot'}:
   {status:200,body:'<html><h1>New Lot</h1></html>'};
  return mockRequest(opts).request(options,cb);
 };
 const redirected=await fetchPublicCoffeeHtml(productURL,{request:safeRequest});
 assert.equal(redirected.ok,true);
 assert.equal(original.length,2);
 assert.equal(original[0].hostname,original[1].hostname);
 assert.equal(typeof original[1].lookup,'function');
 assert.equal(redirected.source_url,'https://unknownartisanroaster.com/products/new-lot');
 const infinite=mockRequest({status:302,location:'/products/loop'});
 const loop=await fetchPublicCoffeeHtml(productURL,{request:infinite.request});
 assert.equal(loop.reason,'redirect_requires_review');
 assert.equal(infinite.seen.length,3);
});
test('unknown schema.org Product yields correctly labeled proposed, not Verified facts',()=>{
 const r=extractPublicCoffeeFacts(wrap(product),{source_url:productURL});
 assert.equal(r.ok,true);
 assert.equal(r.source,'unverified_public_page');
 assert.equal(r.fields.name,'Ethiopia 2026');
 assert.equal(r.fields.roaster,'Unknown Artisan Roaster');
 assert.equal(r.fields.origin,'Sidama, Ethiopia');
 assert.equal(r.fields.process,'Washed');
 assert.equal(r.fields.variety,'Heirloom');
 assert.equal(r.fields.roast_level,'Medium-Light');
 assert.equal(r.fields.release_label,'2026');
 assert.equal(r.fields.tasting_notes,'Peach, bergamot, honey');
 assert.equal(r.fields.producer,undefined);
});
test('Sweet Bloom Wuri-style page extracts H1, labeled info and exact espresso recipe',()=>{
 const r=extractPublicCoffeeFacts(wuri,{source_url:wuriURL});
 assert.equal(r.ok,true);
 assert.equal(r.fields.name,'Wuri');
 assert.equal(r.fields.roaster,'Sweet Bloom Coffee');
 assert.equal(r.fields.process,'Washed');
 assert.equal(r.fields.variety,'Heirloom');
 assert.equal(r.fields.origin,'Gedeb, Ethiopia');
 assert.equal(r.fields.tasting_notes,'citra hops, mandarin, sugarcane');
 assert.equal(r.fields.elevation_m,'2000-2100 masl');
 assert.equal(r.fields.producer,'850 small scale producers');
 // The source explicitly calls this the last offering for 2026.
 assert.equal(r.fields.release_label,'2026');
 assert.deepEqual(r.roaster_recipe,{dose_g:18.5,yield_g:36,time_s_min:20,time_s_max:22});
 const markup=coffeeUrlPreviewMarkup(r);
 assert.match(markup,/Unverified Page/);
 assert.match(markup,/Roaster's published espresso recipe/);
 assert.match(markup,/Reference only/);
});
test('blend descriptors never get forced into a single inaccurate processing category',()=>{
 const data={'@type':'Product',name:'Blend 9.2',url:productURL,
  additionalProperty:[{name:'Process',value:'Washed & Natural'}]};
 const r=extractPublicCoffeeFacts(wrap(data),{source_url:productURL});
 assert.equal(r.ok,true);
 assert.equal(r.fields.process,'Other/Unknown');
 const html='<html><body><h1>Blend 9.2</h1><p>washed & natural process</p></body></html>';
 const fallback=extractPublicCoffeeFacts(html,{source_url:productURL});
 assert.equal(fallback.fields.process,'Other/Unknown');
});
test('conflicting unlabeled product JSON-LD is ambiguous; other product URL cannot win',()=>{
 const a={...product,name:'Alpha',url:productURL},b={...product,name:'Beta',url:productURL};
 const ambig=extractPublicCoffeeFacts(wrap([a,b]),{source_url:productURL});
 assert.equal(ambig.ok,false);
 const wrong=extractPublicCoffeeFacts(wrap({...product,url:'https://unknownartisanroaster.com/products/different'}),{source_url:productURL});
 assert.equal(wrong.ok,false);
});
const approvedEnv=key=>({SUPABASE_URL:'https://azviqqejypsefzilgonr.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test_nonfunctional'}[key]);
const identityJson=()=>({id:'12345678-1111-4111-8111-123456789012'});
const mockPreviewApi=(url,{admitted=true,allowed=true}={})=>url.endsWith('/auth/v1/user')?identityJson():
 url.endsWith('/rpc/dic_session_status')?{admitted,emailVerified:true}:
 url.endsWith('/rpc/dic_preview_cached_verified')?null:
 url.endsWith('/rpc/dic_preview_preflight')?{allowed,ticket:allowed?'00000000-0000-4000-8000-000000000123':null,reason:allowed?null:'daily_preview_limit'}:
 url.endsWith('/rpc/dic_preview_complete')?{charged:true}:null;
function handlerMock({admitted=true,allowed=true,status=200}={}){
 const calls=[],apiFetch=async (u,opt)=>{
  calls.push({u,method:opt.method,hasBearer:/^Bearer /i.test(opt.headers.Authorization||'')});
  const data=mockPreviewApi(u,{admitted,allowed});
  return {ok:status===200,json:async()=>data};
 };
 let outbound=0;
 const handler=createPreviewHandler({apiFetch,env:approvedEnv,
  readHtml:async()=>{outbound++;return {ok:true,html:wrap(product)};}});
 const invoke=async(path='/api/coffee-preview',params={})=>{
  const req=new Request('https://app.dialincollective.com'+path,{
   method:'POST',headers:{'content-type':'application/json','authorization':'Bearer valid.jwt.token','origin':'https://app.dialincollective.com'},
   body:JSON.stringify({source_url:productURL,...params})
  });
  const response=await handler(req);
  return {http:response.status,result:await response.json()};
 };
 return {calls,handler,invoke,get outbound(){return outbound;}};
}
test('auth/member/quota precede network fetch; returned web fields are unverified',async()=>{
 const ok=handlerMock();
 const result=await ok.invoke();
 assert.equal(result.http,200);
 assert.equal(result.result.verification,'unverified');
 assert.equal(result.result.fields.name,'Ethiopia 2026');
 assert.equal(ok.outbound,1);
 assert.equal(ok.calls.length,5);
 assert.equal(ok.calls[0].hasBearer,true);
 const denied=handlerMock({admitted:false});
 assert.equal((await denied.invoke()).http,403);
 assert.equal(denied.outbound,0);
 const quota=handlerMock({allowed:false});
 assert.equal((await quota.invoke()).http,429);
 assert.equal(quota.outbound,0);
});
test('bad origins and URL targets cannot trigger Supabase or external fetch',async()=>{
 const app=handlerMock();
 let req=new Request('https://app.dialincollective.com/api/coffee-preview',{method:'POST',
  headers:{'content-type':'application/json','authorization':'Bearer x','origin':'https://attacker.example.org'},
  body:JSON.stringify({source_url:productURL})});
 assert.equal((await app.handler(req)).status,403);
 req=new Request('https://app.dialincollective.com/api/coffee-preview',{method:'POST',
  headers:{'content-type':'application/json','authorization':'Bearer x','origin':'https://app.dialincollective.com'},
  body:JSON.stringify({source_url:'http://127.0.0.1:80/private'})});
 assert.equal((await app.handler(req)).status,400);
 assert.equal(app.calls.length,0);
 assert.equal(app.outbound,0);
});
test('Netlify endpoint uses rate limiting, private server-only import paths and no promotion',()=>{
 assert.equal(config.path,'/api/coffee-preview');
 assert.equal(config.rateLimit.action,'rate_limit');
 const endpoint=read('netlify/functions/coffee-url-preview.mjs');
 assert.doesNotMatch(endpoint,/service_role|SUPABASE_SERVICE_ROLE_KEY/);
 assert.doesNotMatch(endpoint,/dic_trusted_source_verify/);
 const migration=read('supabase/migrations/20261017005739_dic_universal_coffee_preview_shared_30s.sql');
 assert.match(migration,/private.dic_url_preview_attempts/);
 assert.match(migration,/private.is_member\(\)/);
 assert.match(migration,/attempts>=60/);
 assert.match(migration,/interval '30 seconds'/);
 assert.match(migration,/private.dic_shared_preview_claim/);
 assert.match(migration,/revoke all on function/);
});


test('historic 12/day migration remains immutable; latest role policy is unlimited Admin and 15-second member cooldown',()=>{
 const migration=read('supabase/migrations/20261017050220_dic_preview_daily_budget_12.sql');
 assert.match(migration,/COFFEE-URL-DAILY-20261016-02/);
 assert.match(migration,/check \(attempts between 0 and 12\)/i);
 assert.match(migration,/rec\.attempts>=12/);
 assert.match(migration,/last_attempt_at>clock-interval '30 seconds'/);
 assert.match(migration,/window_started_at<clock-interval '24 hours'/);
 assert.match(migration,/private\.dic_shared_preview_claim\(account_id uuid\)/);
 assert.match(migration,/revoke all on function private\.dic_shared_preview_claim\(uuid\)/);
 assert.match(migration,/set attempts=12 where attempts>12/);
 const memberSql=read('supabase/tests/universal_url_preview.sql');
 assert.match(memberSql,/set attempts=11,last_attempt_at/);
 assert.match(memberSql,/Member daily counter did not reach 12/);
 assert.match(memberSql,/member_account/);
 const current=read('supabase/migrations/20261113043000_dic_admin_preview_unlimited_member_15s.sql');
 assert.match(current,/m\.enabled and m\.admitted_at is not null/);
 assert.match(current,/u\.email_confirmed_at is not null/);
 assert.match(current,/if private\.is_admin\(\) then/);
 assert.match(current,/last_attempt_at>clock-interval '15 seconds'/);
 assert.match(current,/rec\.attempts>=12/);
 const serviceSql=read('supabase/tests/url_preview_release.sql');
 assert.match(serviceSql,/set attempts=12,last_attempt_at/);
});

test('public product snapshot JSON shares safe pinned TLS and bounded reads',async()=>{
 const url='https://storefront.ecwid.com/product-page/12345678/734210068/static-code';
 const req=mockRequest({type:'application/json; charset=utf-8',body:'{"canonicalUrl":"https://www.mangotreecoffee.org/shop/Mango-Tree-Blend-p734210068"}'});
 const response=await fetchPublicCoffeeJson(url,{request:req.request});
 assert.equal(response.ok,true);
 assert.equal(typeof response.json,'string');
 assert.equal(req.seen[0].servername,'storefront.ecwid.com');
 assert.equal(req.seen[0].headers.Accept,'application/json');
 assert.equal(typeof req.seen[0].lookup,'function');
 assert.equal(Object.keys(req.seen[0].headers).some(k=>/authorization|cookie|apikey/i.test(k)),false);
 assert.equal((await fetchPublicCoffeeJson(url,{request:mockRequest({type:'text/html'}).request})).reason,'not_html');
 assert.equal((await fetchPublicCoffeeJson(url,{request:mockRequest({type:'application/json',body:'x'.repeat(MAX_HTML_BYTES+1)}).request})).reason,'page_too_large');
 assert.equal((await fetchPublicCoffeeHtml(url,{request:req.request})).reason,'not_html');
 assert.equal((await fetchPublicCoffeeJson('https://127.0.0.1/secret',{request:req.request})).reason,'invalid_url');
});

test('Wix/Ecwid shop-shell SEO title must not become a nonexistent coffee',()=>{
 const url='https://www.mangotreecoffee.org/shop/Mango-Tree-Blend-p734210068';
 const shell='<html><head><title>Mango Tree Coffee: Store</title>'+
  '<meta property="og:title" content="Mango Tree Coffee: Store">'+
  '<meta property="og:site_name" content="mangotreecoffee">'+
  '<meta property="og:type" content="website"></head><body>'+
  '<main><p>Shop</p><p>Another coffee</p></main></body></html>';
 const preview=extractPublicCoffeeFacts(shell,{source_url:url});
 assert.equal(preview.ok,false);
 assert.equal(preview.reason,'ambiguous_or_missing_product');
});
test('real product evidence remains eligible even when site OG title says Store',()=>{
 const url='https://www.mangotreecoffee.org/shop/Mango-Tree-Blend-p734210068';
 const html='<html><head><meta property="og:title" content="Mango Tree Coffee: Store">'+
  '<meta property="og:site_name" content="Mango Tree Coffee">'+
  '<meta property="og:type" content="website"></head><body>'+
  '<main><h1>Mango Tree Blend</h1><p>Origin: Colombia, Brazil</p>'+
  '<p>Tasting Notes: Chocolate, caramel</p></main></body></html>';
 const preview=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(preview.ok,true);
 assert.equal(preview.fields.name,'Mango Tree Blend');
 assert.equal(preview.fields.origin,'Colombia, Brazil');
});

const mangoPageUrl='https://www.mangotreecoffee.org/shop/Mango-Tree-Blend-p734210068';
const mangoProduct={
 '@context':'https://schema.org','@type':'Product',name:'Mango Tree Blend',url:mangoPageUrl,
 brand:{'@type':'Brand',name:'Mango Tree Coffee'}
};
const ecwidSnapshot={
 title:'Mango Tree Blend',canonicalUrl:'',
 jsonLDHtml:'<script type="application/ld+json">'+JSON.stringify(mangoProduct)+'</script>',
 ogTagsHtml:'<meta property="og:title" content="Mango Tree Blend">'+
  '<meta property="og:site_name" content="Mango Tree Coffee">',
 htmlCode:'<article><h1>Mango Tree Blend</h1>'+
  '<p>Tasting Notes: Pear, Molasses, Brookside Chocolate Covered Acai</p>'+
  '<p>Roast: Medium</p><p>Origins: Ethiopia and Brazil</p>'+
  '</article><h2>You may also like</h2><p>Unrelated dark roast</p>'
};
test('public Ecwid transport target is strict, exact product URL and public store mapping',()=>{
 const request=ecwidProductRequest(mangoPageUrl);
 assert.equal(request.storeId,'6820274');
 assert.equal(request.productId,'734210068');
 assert.equal(request.expectedName,'Mango Tree Blend');
 assert.equal(request.requestUrl,'https://storefront.ecwid.com/product-page/6820274/734210068/static-code');
 assert.equal(ecwidProductRequest('https://www.mangotreecoffee.org/shop/'),null);
 assert.equal(ecwidProductRequest('https://evil.mangotreecoffee.org/shop/Mango-Tree-Blend-p734210068'),null);
 assert.equal(ecwidProductRequest('https://www.mangotreecoffee.org/shop/Mango-Tree-Blend-p734210068#fragment'),null);
 assert.equal(ecwidProductRequest('https://www.mangotreecoffee.org/shop/Other-Blend-p734210068')?.expectedName,'Other Blend');
 assert.equal(ecwidProductRequest(mangoPageUrl,'<script src="https://app.ecwid.com/script.js?9999999"></script>'),null);
});
test('Mango Tree snapshot extracts exact published coffee details, not unrelated suggestions',()=>{
 const req=ecwidProductRequest(mangoPageUrl);
 const result=extractEcwidSnapshotData(ecwidSnapshot,req);
 assert.equal(result?.ok,true);
 assert.equal(result.fields.name,'Mango Tree Blend');
 assert.equal(result.fields.roaster,'Mango Tree Coffee');
 assert.equal(result.fields.roast_level,'Medium');
 assert.equal(result.fields.origin,'Ethiopia and Brazil');
 assert.equal(result.fields.tasting_notes,'Pear, Molasses, Brookside Chocolate Covered Acai');
 for(const field of ['process','variety','producer','elevation_m','release_label'])
  assert.equal(result.fields[field],undefined,'Do not invent unpublished '+field);
 assert.equal(result.source,'unverified_public_page');
});
test('Ecwid rejects wrong title, other canonical product, malformed or oversized static output',()=>{
 const req=ecwidProductRequest(mangoPageUrl);
 assert.equal(extractEcwidSnapshotData({...ecwidSnapshot,title:'Other Blend'},req),null);
 assert.equal(extractEcwidSnapshotData({...ecwidSnapshot,canonicalUrl:'https://www.mangotreecoffee.org/shop/Other-Blend-p999999999'},req),null);
 assert.equal(extractEcwidSnapshotData({...ecwidSnapshot,htmlCode:'x'.repeat(MAX_HTML_BYTES)},req),null);
 assert.equal(extractEcwidSnapshotData({...ecwidSnapshot,jsonLDHtml:null},req)?.ok,true);
 assert.equal(extractEcwidSnapshotData({...ecwidSnapshot,htmlCode:'<h1>Wrong Blend</h1>',jsonLDHtml:''},req),null);
});
test('Ecwid preview returns only source-backed fields after member quota, no Wix shell fetch',async()=>{
 const calls=[];let rawFetches=0,jsonReads=0;
 const apiFetch=async(u,opt)=>{
  calls.push({u,auth:!!opt.headers.Authorization});
  const data=mockPreviewApi(u);
  return {ok:true,json:async()=>data};
 };
 const handler=createPreviewHandler({apiFetch,env:approvedEnv,
  readHtml:async()=>{rawFetches++;return {ok:true,html:'<title>Mango Tree Coffee: Store</title>'};},
  readJson:async()=>{jsonReads++;return {ok:true,json:JSON.stringify(ecwidSnapshot)};}});
 const req=new Request('https://app.dialincollective.com/api/coffee-preview',{
  method:'POST',headers:{'content-type':'application/json','authorization':'Bearer user.jwt.value',
   'origin':'https://app.dialincollective.com'},
  body:JSON.stringify({source_url:mangoPageUrl})});
 const response=await handler(req),result=await response.json();
 assert.equal(response.status,200);
 assert.equal(result.fields.name,'Mango Tree Blend');
 assert.equal(result.fields.tasting_notes,'Pear, Molasses, Brookside Chocolate Covered Acai');
 assert.equal(result.verification,'unverified');
 assert.equal(rawFetches,0,'known Ecwid store should skip broad 662KB Wix page');
 assert.equal(jsonReads,1);
 assert.equal(calls.length,5,'session, verified lookup, cooldown and completion must be checked');
});
test('Ecwid snapshot failure safely falls back to blank/manual rather than false shop identity',async()=>{
 const result=await extractEcwidProduct(mangoPageUrl,'',{
  readJson:async()=>({ok:true,json:JSON.stringify({...ecwidSnapshot,title:'A Different Coffee'})})
 });
 assert.equal(result,null);
});

test('generic Ecwid embeds across shop/store paths use only an actual public script-src ID',()=>{
 const src='<script async src="https://app.ecwid.com/script.js?12345678&data_platform=code"></script>';
 const paths=['shop','store','online-store','coffee','coffees','products'];
 for(const prefix of paths){
  const page='https://random-artisanroaster.com/'+prefix+'/2026-Natural-Gesha-p987654321';
  const details=ecwidProductRequest(page,src);
  assert.equal(details?.storeId,'12345678',prefix);
  assert.equal(details?.productId,'987654321',prefix);
  assert.equal(details?.expectedName,'2026 Natural Gesha',prefix);
  assert.equal(details?.requestUrl,'https://storefront.ecwid.com/product-page/12345678/987654321/static-code');
  assert.equal(ecwidProductRequest(page,''),null,'Unknown store must disclose its ID');
  assert.equal(ecwidProductRequest(page,'Marketing mentions https://app.ecwid.com/script.js?12345678'),null);
  assert.equal(ecwidProductRequest(page,'<script src="https://app.ecwid.com/script.js?12345678"></script>'+
   '<script src="https://app.ecwid.com/script.js?99999999"></script>'),null,'Mixed store identities require manual review');
 }
 assert.equal(ecwidProductRequest('https://random-artisanroaster.com/shop/item-p987654321',src)?.productId,'987654321');
 assert.equal(ecwidProductRequest('https://random-artisanroaster.com/collections/item-p987654321',src),null);
 assert.equal(ecwidProductRequest('https://random-artisanroaster.com/shop/item-p987654321','<script src="http://app.ecwid.com/script.js?12345678"></script>'),null);
 assert.equal(sameEcwidTitle('Coffee & Cacao','coffee-cacao'),true);
 assert.equal(sameEcwidTitle('Blend Deluxe','Blend'),false);
});
test('selected Product description supplies explicit structured-label facts on new platforms',()=>{
 const url='https://new-roaster.coffee/products/ethiopia-ambela';
 const details={
  '@context':'https://schema.org','@type':'Product',url,name:'Ethiopia Ambela',
  brand:{'@type':'Brand',name:'New Roaster'},
  description:'Origin: Ethiopia\nProcess: Washed\nVariety: Heirloom\nRoast Level: Light\nTasting Notes: Peach, jasmine, honey'
 };
 const r=extractPublicCoffeeFacts(wrap(details),{source_url:url});
 assert.equal(r.ok,true);
 assert.equal(r.fields.origin,'Ethiopia');
 assert.equal(r.fields.process,'Washed');
 assert.equal(r.fields.variety,'Heirloom');
 assert.equal(r.fields.roast_level,'Light');
 assert.equal(r.fields.tasting_notes,'Peach, jasmine, honey');
 const htmlLabels={...details,description:'<p>Origin: Brazil<br>Process: Natural</p><p>Producer: Fazenda Sol</p>'};
 const h=extractPublicCoffeeFacts(wrap(htmlLabels),{source_url:url});
 assert.equal(h.fields.origin,'Brazil');
 assert.equal(h.fields.process,'Natural');
 assert.equal(h.fields.producer,'Fazenda Sol');
 const unrelated={...details,url:'https://new-roaster.coffee/products/someone-else'};
 assert.equal(extractPublicCoffeeFacts(wrap(unrelated),{source_url:url}).ok,false);
});
test('unknown Ecwid store shell uses product snapshot first, not shop-wide SEO',async()=>{
 const url='https://random-artisanroaster.com/store/Blend-No-7-p987654321';
 const shop='<html><head><meta property="og:title" content="Roaster Store">'+
  '<meta property="og:type" content="website"></head><body><h1>Roaster Store</h1>'+
  '<script src="https://app.ecwid.com/script.js?12345678"></script></body></html>';
 const productData={...ecwidSnapshot,title:'Blend No 7',canonicalUrl:'',
  jsonLDHtml:'<script type="application/ld+json">'+JSON.stringify({
   '@type':'Product',url,name:'Blend No 7',brand:{'@type':'Brand',name:'Random Artisan'}
  })+'</script>',ogTagsHtml:'<meta property="og:title" content="Blend No 7">',
  htmlCode:'<h1>Blend No 7</h1><p>Origin: Brazil</p><p>Roast: Medium</p>'};
 const called=[];let pages=0;
 const apiFetch=async u=>({ok:true,json:async()=>mockPreviewApi(u)});
 const handler=createPreviewHandler({apiFetch,env:approvedEnv,
  readHtml:async()=>{pages++;return {ok:true,html:shop,source_url:url};},
  readJson:async path=>{called.push(path);return {ok:true,json:JSON.stringify(productData)};}});
 const request=new Request('https://app.dialincollective.com/api/coffee-preview',{
  method:'POST',headers:{'content-type':'application/json','authorization':'Bearer valid.jwt.token',
   'origin':'https://app.dialincollective.com'},body:JSON.stringify({source_url:url})
 });
 const result=await (await handler(request)).json();
 assert.equal(result.ok,true);
 assert.equal(result.fields.name,'Blend No 7');
 assert.equal(result.fields.origin,'Brazil');
 assert.equal(pages,1);
 assert.deepEqual(called,['https://storefront.ecwid.com/product-page/12345678/987654321/static-code']);
});

test('Shopify Ajax canonical product handle and locale are strictly validated',()=>{
 const paths=[
  ['https://somecoffee.com/products/hambela','https://somecoffee.com/products/hambela.js'],
  ['https://somecoffee.com/collections/espresso/products/hambela?variant=123','https://somecoffee.com/products/hambela.js'],
  ['https://somecoffee.com/en-ca/products/hambela','https://somecoffee.com/en-ca/products/hambela.js']
 ];
 for(const [source,dest] of paths)assert.equal(shopifyProductRequest(source)?.url,dest);
 for(const input of ['https://somecoffee.com/collections/espresso','https://somecoffee.com/admin/api/products/hambela',
  'https://somecoffee.com/products/hambela.json','https://somecoffee.com/products/hambela?token=ok#fragment',
  'http://somecoffee.com/products/hambela','https://127.0.0.1/products/hambela'])
  assert.equal(shopifyProductRequest(input),null,input);
});
test('Shopify public product JSON parses only the exact handle and explicit source labels',()=>{
 const request=shopifyProductRequest('https://coffee.example-shop.com/products/wuri');
 const payload={title:'Wuri',handle:'wuri',vendor:'Example Roaster',
  description:'<p>Origin: Ethiopia<br>Process: Washed</p>'+
   '<p>Variety: Heirloom</p><p>Tasting Notes: Mango, mandarin, sugarcane</p>',
  tags:['Roast Level: Light','Coffee','Seasonal']};
 const parsed=extractShopifyAjaxData(payload,request);
 assert.equal(parsed?.fields.name,'Wuri');
 assert.equal(parsed.fields.roaster,'Example Roaster');
 assert.equal(parsed.fields.origin,'Ethiopia');
 assert.equal(parsed.fields.process,'Washed');
 assert.equal(parsed.fields.variety,'Heirloom');
 assert.equal(parsed.fields.roast_level,'Light');
 assert.equal(parsed.fields.tasting_notes,'Mango, mandarin, sugarcane');
 assert.equal(parsed.fields.producer,undefined);
 assert.equal(extractShopifyAjaxData({...payload,handle:'unrelated'},request),null);
 assert.equal(extractShopifyAjaxData({...payload,description:'<script>malicious</script>Origin: Ethiopia'},request)?.ok,true);
 assert.equal(extractShopifyAjaxData({...payload,description:'x'.repeat(20001)},request)?.fields.origin,undefined);
});
test('Shopify independent source disagreement is withheld instead of silently merged',()=>{
 const previous={ok:true,source:'unverified_public_page',
  fields:{name:'Wuri',roaster:'Example Roaster',origin:'Ethiopia',process:'Washed',tasting_notes:''},
  available:['name','roaster','origin','process']};
 const ajax={ok:true,fields:{name:'Wuri',origin:'Colombia',process:'Washed',tasting_notes:'Peach, mango'}};
 const combined=mergeShopifyPreview(previous,ajax);
 assert.equal(combined.ok,true);
 assert.equal(combined.fields.origin,undefined);
 assert.deepEqual(combined.conflicts,['origin']);
 assert.equal(combined.fields.process,'Washed');
 assert.equal(combined.fields.tasting_notes,'Peach, mango');
 assert.equal(mergeShopifyPreview(previous,{ok:true,fields:{name:'Not Wuri',origin:'Brazil'}}),previous);
});
test('cross-platform product enrichment preserves more precise compatible origins but rejects divergent countries',()=>{
 const base={ok:true,fields:{name:'Wuri',roaster:'Roaster',origin:'Gedeb, Ethiopia',process:'Washed'}};
 const compatible={ok:true,fields:{name:'Wuri',origin:'Ethiopia',tasting_notes:'Peach, sugarcane'}};
 const good=mergeShopifyPreview(base,compatible);
 assert.equal(good.fields.origin,'Gedeb, Ethiopia');
 assert.equal(good.fields.tasting_notes,'Peach, sugarcane');
 assert.equal(good.conflicts,undefined);
 const more=mergeShopifyPreview({ok:true,fields:{name:'Wuri',origin:'Ethiopia'}},
  {ok:true,fields:{name:'Wuri',origin:'Gedeb, Ethiopia'}});
 assert.equal(more.fields.origin,'Gedeb, Ethiopia');
 const bad=mergeShopifyPreview(base,{ok:true,fields:{name:'Wuri',origin:'Gedeb, Colombia'}});
 assert.equal(bad.fields.origin,undefined);
 assert.deepEqual(bad.conflicts,['origin']);
 const blend=mergeShopifyPreview(base,{ok:true,fields:{name:'Wuri',origin:'Ethiopia, Colombia'}});
 assert.equal(blend.fields.origin,undefined,'Do not assume a single-country lot is the same as a multi-country blend');
 assert.deepEqual(blend.conflicts,['origin']);
});

test('sparse but valid Shopify HTML enriches missing structured facts from exact-handle public JSON',async()=>{
 const url='https://coffee-example.com/products/mountain-lot';
 const page='<html><head><meta property="og:type" content="product"><meta property="og:title" content="Mountain Lot">'+
  '<meta property="og:site_name" content="Coffee Example"></head><body><main><h1>Mountain Lot</h1>'+
  '<p>Origin: Gedeb, Ethiopia</p></main></body></html>';
 let calls=0;
 const client=async endpoint=>({ok:true,json:async()=>mockPreviewApi(endpoint)});
 const handler=createPreviewHandler({apiFetch:client,env:approvedEnv,
  readHtml:async()=>({ok:true,html:page,source_url:url}),
  readJson:async endpoint=>{calls++;assert.equal(endpoint,'https://coffee-example.com/products/mountain-lot.js');
   return {ok:true,json:JSON.stringify({title:'Mountain Lot',handle:'mountain-lot',vendor:'Coffee Example',
    description:'<p>Origin: Ethiopia</p><p>Process: Washed</p><p>Tasting Notes: Jasmine, peach</p>',
    tags:['Variety: Heirloom']})};}});
 const req=new Request('https://app.dialincollective.com/api/coffee-preview',{
  method:'POST',headers:{'content-type':'application/json','authorization':'Bearer valid.jwt.token',
   'origin':'https://app.dialincollective.com'},body:JSON.stringify({source_url:url})});
 const found=await (await handler(req)).json();
 assert.equal(found.ok,true);
 assert.equal(found.fields.name,'Mountain Lot');
 assert.equal(found.fields.origin,'Gedeb, Ethiopia');
 assert.equal(found.fields.process,'Washed');
 assert.equal(found.fields.variety,'Heirloom');
 assert.equal(found.fields.tasting_notes,'Jasmine, peach');
 assert.equal(calls,1);
});

test('Shopify fallback retrieves a bounded public JSON product when HTML source unavailable',async()=>{
 const url='https://my-roaster.coffee/products/berry-lot';
 const data={handle:'berry-lot',title:'Berry Lot',vendor:'My Roaster',
  description:'<p>Origin: Kenya</p><p>Tasting Notes: Blackcurrant, bergamot</p>'};
 let htmlReads=0,jsonReads=0;
 const apiFetch=async path=>({ok:true,json:async()=>mockPreviewApi(path)});
 const handler=createPreviewHandler({apiFetch,env:approvedEnv,
  readHtml:async()=>{htmlReads++;return {ok:false,reason:'page_too_large'};},
  readJson:async path=>{jsonReads++;assert.equal(path,'https://my-roaster.coffee/products/berry-lot.js');return {ok:true,json:JSON.stringify(data)};}});
 const req=new Request('https://app.dialincollective.com/api/coffee-preview',{
  method:'POST',headers:{'content-type':'application/json','authorization':'Bearer valid.jwt.token',
   'origin':'https://app.dialincollective.com'},body:JSON.stringify({source_url:url})});
 const result=await (await handler(req)).json();
 assert.equal(result.ok,true);
 assert.equal(result.fields.name,'Berry Lot');
 assert.equal(result.fields.origin,'Kenya');
 assert.equal(result.fields.tasting_notes,'Blackcurrant, bergamot');
 assert.equal(htmlReads,1);assert.equal(jsonReads,1);
 assert.equal(result.verification,'unverified');
});
test('Shopify public JSON is fetched with pinned TLS and no credentials',async()=>{
 const url='https://example-roaster.org/products/wuri';
 const mock=mockRequest({type:'application/json',body:JSON.stringify({title:'Wuri',handle:'wuri',vendor:'Example Roaster'})});
 const result=await extractShopifyProduct(url,{readJson:p=>fetchPublicCoffeeJson(p,{request:mock.request})});
 assert.equal(result?.fields.name,'Wuri');
 assert.equal(mock.seen[0].servername,'example-roaster.org');
 assert.equal(mock.seen[0].path,'/products/wuri.js');
 assert.equal(Object.keys(mock.seen[0].headers).some(k=>/authorization|cookie|apikey/i.test(k)),false);
});

test('Shopify product .js MIME compatibility does not execute arbitrary JavaScript',async()=>{
 const url='https://coffee-example.com/products/ethiopia.js';
 const valid=mockRequest({type:'application/javascript; charset=utf-8',
  body:JSON.stringify({handle:'ethiopia',title:'Ethiopia',vendor:'Roaster'})});
 const read=await fetchPublicCoffeeJson(url,{shopifyProduct:true,request:valid.request});
 assert.equal(read.ok,true);
 assert.deepEqual(JSON.parse(read.json),{handle:'ethiopia',title:'Ethiopia',vendor:'Roaster'});
 assert.equal(valid.seen[0].headers.Accept,'application/json,text/javascript,application/javascript');
 assert.equal((await fetchPublicCoffeeJson(url,{request:valid.request})).reason,'not_html');
 const js=mockRequest({type:'text/javascript',body:'globalThis.exploit=true;'});
 const rejected=await extractShopifyProduct('https://coffee-example.com/products/ethiopia',{
  readJson:uri=>fetchPublicCoffeeJson(uri,{shopifyProduct:true,request:js.request})
 });
 assert.equal(rejected,null,'Executable script is never evaluated, only strict JSON is parsed');
 assert.equal((await fetchPublicCoffeeJson('https://coffee-example.com/static/other.js',
  {shopifyProduct:true,request:valid.request})).reason,'invalid_url');
 assert.equal((await fetchPublicCoffeeJson(url,{shopifyProduct:true,
  request:mockRequest({type:'text/html',body:'<html>wrong</html>'}).request})).reason,'not_html');
});

test('Woo public Store API lookup accepts only exact, secure product slugs',()=>{
 const url='https://roaster.example-coffee.com/product/ethiopia-ambela/';
 const target=wooProductRequest(url);
 assert.equal(target.slug,'ethiopia-ambela');
 assert.equal(target.api,'https://roaster.example-coffee.com/wp-json/wc/store/v1/products/ethiopia-ambela');
 assert.equal(wooProductRequest('https://roaster.example-coffee.com/en/product/ethiopia-ambela/')?.slug,'ethiopia-ambela');
 assert.equal(wooProductRequest('https://roaster.example-coffee.com/coffees/ethiopia-ambela/')?.api,
  'https://roaster.example-coffee.com/wp-json/wc/store/v1/products/ethiopia-ambela');
 for(const src of ['https://roaster.example-coffee.com/wp-admin','https://roaster.example-coffee.com/shop/ethiopia-ambela',
 'https://roaster.example-coffee.com/product-category/coffee',
 'https://roaster.example-coffee.com/product/coffee?nonce=x#frag','http://roaster.example-coffee.com/product/coffee',
 'https://127.0.0.1/product/coffee'])assert.equal(wooProductRequest(src),null,src);
});
test('Woo public Store API selects exact published product and bounded attributes, no secrets',()=>{
 const req=wooProductRequest('https://new-roaster.coffee/product/kenya-sidama');
 const product={id:123,name:'Kenya Sidama',slug:'kenya-sidama',
  permalink:'https://new-roaster.coffee/product/kenya-sidama/',
  description:'<p>Tasting Notes: Lime, cranberry, cacao</p>',
  short_description:'<p>Origin: Kenya<br>Process: Washed</p>',
  attributes:[{name:'Roast Level',terms:[{name:'Light'}]},{name:'Variety',terms:[{name:'SL28'}]}]};
 const out=extractWooStoreData(product,req);
 assert.equal(out?.ok,true);
 assert.equal(out.fields.name,'Kenya Sidama');
 assert.equal(out.fields.origin,'Kenya');
 assert.equal(out.fields.process,'Washed');
 assert.equal(out.fields.roast_level,'Light');
 assert.equal(out.fields.variety,'SL28');
 assert.equal(out.fields.tasting_notes,'Lime, cranberry, cacao');
 assert.equal(out.fields.producer,undefined);
 assert.equal(extractWooStoreData({...product,slug:'someone-else'},req),null);
 assert.equal(extractWooStoreData({...product,is_password_protected:true},req),null);
 assert.equal(extractWooStoreData({...product,permalink:'https://other-roaster.com/product/kenya-sidama/'},req),null);
 assert.equal(extractWooStoreData({...product,permalink:'https://new-roaster.coffee/product/other-coffee/'},req),null);
});
test('Woo product JSON fallback honors member admission/quota and strict field source',async()=>{
 const url='https://new-roaster.coffee/product/kenya-sidama';
 const product={name:'Kenya Sidama',slug:'kenya-sidama',permalink:url,
  description:'<p>Origin: Kenya</p><p>Tasting Notes: Lime, cranberry, cacao</p>'};
 let htmlCalls=0,jsonCalls=0,apiCalls=0;
 const apiFetch=async endpoint=>{apiCalls++;return {ok:true,json:async()=>mockPreviewApi(endpoint)};};
 const handler=createPreviewHandler({apiFetch,env:approvedEnv,
  readHtml:async()=>{htmlCalls++;return {ok:false,reason:'page_too_large'};},
  readJson:async endpoint=>{jsonCalls++;assert.equal(endpoint,'https://new-roaster.coffee/wp-json/wc/store/v1/products/kenya-sidama');
   return {ok:true,json:JSON.stringify(product)};}});
 const req=new Request('https://app.dialincollective.com/api/coffee-preview',{
  method:'POST',headers:{'content-type':'application/json','authorization':'Bearer valid.jwt.token',
   'origin':'https://app.dialincollective.com'},body:JSON.stringify({source_url:url})});
 const response=await handler(req),body=await response.json();
 assert.equal(response.status,200);
 assert.equal(body.fields.name,'Kenya Sidama');
 assert.equal(body.fields.origin,'Kenya');
 assert.equal(body.fields.tasting_notes,'Lime, cranberry, cacao');
 assert.equal(body.verification,'unverified');
 assert.equal(htmlCalls,1);assert.equal(jsonCalls,1);assert.equal(apiCalls,5);
 assert.equal(await extractWooProduct(url,{readJson:async()=>({ok:true,json:'unexpected JS'})}),null);
});

test('exact repeated URL reuses public warm preview without additional daily claim or source fetch',async()=>{
 const app=handlerMock();const first=await app.invoke();const second=await app.invoke();
 assert.equal(first.result.ok,true);assert.equal(second.result.cached,true);assert.equal(app.outbound,1);
 assert.equal(app.calls.filter(x=>x.u.endsWith('/rpc/dic_preview_complete')).length,1);
 assert.equal(app.calls.filter(x=>x.u.endsWith('/rpc/dic_preview_preflight')).length,2);
});
test('transient website failure does not call charge-completion RPC',async()=>{
 const calls=[];
 const apiFetch=async u=>{calls.push(u);return {ok:true,json:async()=>mockPreviewApi(u)};};
 const handler=createPreviewHandler({apiFetch,env:approvedEnv,readHtml:async()=>({ok:false,reason:'source_unavailable'})});
 const req=new Request('https://app.dialincollective.com/api/coffee-preview',{method:'POST',
  headers:{'content-type':'application/json','authorization':'Bearer valid.jwt.token',
  'origin':'https://app.dialincollective.com'},body:JSON.stringify({source_url:productURL})});
 const result=await(await handler(req)).json();assert.equal(result.reason,'source_unavailable');
 assert.equal(calls.filter(x=>x.endsWith('/rpc/dic_preview_complete')).length,0);
});
test('complete unambiguous approved catalog skips retrieval, preserves cooldown, never claims source verification',async()=>{
 let outbound=0;const requests=[];
 const apiFetch=async (url,opt)=>{requests.push({url,body:opt.body});return {ok:true,json:async()=>
  url.endsWith('/rpc/dic_preview_cached_verified')?
   {ok:true,source:'verified_catalog',fields:{name:'Known Release',roaster:'Known Roaster',
    release_label:'2026',origin:'Ethiopia',process:'Washed',roast_level:'Light',elevation_m:'1900 masl',
    variety:'Heirloom',producer:'Named Cooperative',tasting_notes:'Peach, tea, honey'}}:mockPreviewApi(url)};};
 const handler=createPreviewHandler({apiFetch,env:approvedEnv,readHtml:async()=>{outbound++;throw Error('Should not fetch');}});
 const req=new Request('https://app.dialincollective.com/api/coffee-preview',{method:'POST',
 headers:{'content-type':'application/json','authorization':'Bearer valid.jwt.token',
 'origin':'https://app.dialincollective.com'},body:JSON.stringify({source_url:productURL})});
 const result=await(await handler(req)).json();assert.equal(result.cached,true);
 assert.equal(result.verification,'unverified');assert.equal(result.source_verified,false);assert.equal(result.catalog_approved,true);assert.equal(result.source,'approved_catalog');assert.equal(outbound,0);
 assert.equal(requests.some(x=>x.url.endsWith('/rpc/dic_preview_complete')),false);
 assert.equal(requests.find(x=>x.url.endsWith('/rpc/dic_preview_preflight')).body,'{"p_cached":true}');
});
