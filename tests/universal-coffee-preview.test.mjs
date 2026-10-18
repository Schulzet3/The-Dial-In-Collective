import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EventEmitter} from 'node:events';
import {safeCoffeeUrl,isGlobalIpv4,guardedLookup,fetchPublicCoffeeHtml,MAX_HTML_BYTES} from '../src/server/coffee-url-guard.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
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
 assert.equal(r.fields.release_label,undefined);
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
 assert.equal(r.fields.process,undefined);
 const html='<html><body><h1>Blend 9.2</h1><p>washed & natural process</p></body></html>';
 const fallback=extractPublicCoffeeFacts(html,{source_url:productURL});
 assert.equal(fallback.fields.process,undefined);
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
function handlerMock({admitted=true,allowed=true,status=200}={}){
 const calls=[],apiFetch=async (u,opt)=>{
  calls.push({u,method:opt.method,hasBearer:/^Bearer /i.test(opt.headers.Authorization||'')});
  const data=u.endsWith('/auth/v1/user')?identityJson():
   u.endsWith('/rpc/dic_session_status')?{admitted,emailVerified:true}:
   u.endsWith('/rpc/dic_claim_universal_preview')?{allowed,reason:allowed?null:'daily_preview_limit'}:null;
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
 assert.equal(ok.calls.length,3);
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


test('approved 12-claim account budget keeps shared 30-second cooldown and legacy route protection',()=>{
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
 assert.match(memberSql,/Boundary claim did not set exactly 12/);
 const serviceSql=read('supabase/tests/url_preview_release.sql');
 assert.match(serviceSql,/set attempts=12,last_attempt_at/);
});
