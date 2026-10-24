import test from 'node:test';
import assert from 'node:assert/strict';
import {sanitizePublicCoffeeJson,sanitizePublicCoffeeFixtureHtml} from '../scripts/audit/coffee-source-fixture-sanitization.mjs';
import {compactCoffeeProductHtml} from '../src/server/coffee-product-prep.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const SOURCE='https://coffee.example/products/selected-kenya';
const offer=(id='1001',quantity='1')=>({
 '@type':'Offer',url:SOURCE+'?variant='+id,price:'18.00',priceCurrency:'USD',
 availability:'https://schema.org/InStock',
 checkoutPageURLTemplate:'https://coffee.example/cart/add?id='+id+'&quantity='+quantity
});
const product=(offers=[offer()])=>({
 '@context':'https://schema.org','@type':'Product',name:'Selected Kenya',
 url:SOURCE,brand:{'@type':'Brand',name:'Example Coffee Roasters'},
 description:'<p>Origin: Kenya</p><p>Process: Washed</p>',offers
});
const clean=value=>JSON.parse(sanitizePublicCoffeeJson(value,{source_url:SOURCE}));
const documentFor=data=>'<main><h1>Selected Kenya</h1><p>Origin: Kenya</p><p>Process: Washed</p>'+
 '<script type="application/ld+json">'+JSON.stringify(data)+'</script></main>';

test('audit JSON keeps only selected public offer templates and still recursively redacts private keys',()=>{
 const input=product(Array.from({length:9},(_,index)=>offer(String(1001+index),index===8?'99':'1')));
 input.sessionToken='DO_NOT_RETAIN_ROOT';
 input.customer={name:'DO_NOT_RETAIN_CUSTOMER'};
 input.metadata={email:'DO_NOT_RETAIN_EMAIL',nested:{csrf:'DO_NOT_RETAIN_CSRF',public_note:'Published lot'}};
 input.offers[0].checkoutSession='DO_NOT_RETAIN_CHECKOUT';
 input.offers[0].details={authorization:'DO_NOT_RETAIN_AUTH',public_note:'250 g'};
 input.cart={selected:'DO_NOT_RETAIN_CART'};
 const before=structuredClone(input),actual=clean(input);
 assert.deepEqual(input,before,'sanitization must not mutate the source');
 assert.deepEqual(actual.offers.map(row=>row.checkoutPageURLTemplate),input.offers.map(row=>row.checkoutPageURLTemplate));
 assert.equal(actual.metadata.nested.public_note,'Published lot');
 assert.equal(actual.offers[0].details.public_note,'250 g');
 assert.doesNotMatch(JSON.stringify(actual),/DO_NOT_RETAIN/);
 assert.equal(Object.hasOwn(actual,'cart'),false);
 assert.equal(Object.hasOwn(actual.offers[0],'checkoutSession'),false);
});

test('audit JSON rejects unsafe or ambiguous checkout endpoints, quantities and variant selectors',()=>{
 const invalid=[
  'http://coffee.example/cart/add?id=1001&quantity=1',
  'https://other.example/cart/add?id=1001&quantity=1',
  'https://user:password@coffee.example/cart/add?id=1001&quantity=1',
  'https://@coffee.example/cart/add?id=1001&quantity=1',
  'https://coffee.example:443/cart/add?id=1001&quantity=1',
  'https://coffee.example/cart/add?id=1001&quantity=1#private',
  'https://coffee.example/cart/add?id=1001&quantity=1#',
  'https://coffee.example/cart/checkout?id=1001&quantity=1',
  'https://coffee.example/other/../cart/add?id=1001&quantity=1',
  '/cart/add?id=1001&quantity=1',
  'https://coffee.example/cart/add?id=1001&quantity=1&session=private',
  'https://coffee.example/cart/add?id=1001&quantity=1&return_to=/checkout',
  'https://coffee.example/cart/add?id=1001&id=1001&quantity=1',
  'https://coffee.example/cart/add?id=1001&quantity=1&quantity=2',
  'https://coffee.example/cart/add?id=1001&quantity=0',
  'https://coffee.example/cart/add?id=1001&quantity=100',
  'https://coffee.example/cart/add?id=1001&quantity=01',
  'https://coffee.example/cart/add?id=1001&quantity=1.5',
  'https://coffee.example/cart/add?id=1001',
  'https://coffee.example/cart/add?id=1002&quantity=1',
  'https://coffee.example/cart/add?id={variant}&quantity=1',
  'https://coffee.example/cart/add?id=1001&quantity=1\n'
 ];
 for(const template of invalid){
  const data=product();data.offers[0].checkoutPageURLTemplate=template;
  assert.equal(Object.hasOwn(clean(data).offers[0],'checkoutPageURLTemplate'),false,template);
 }
 for(const quantity of ['1','2','99']){
  const data=product([offer('1001',quantity)]);
  assert.equal(clean(data).offers[0].checkoutPageURLTemplate,data.offers[0].checkoutPageURLTemplate,quantity);
 }
});

test('audit template exception requires the selected Product and its matching typed Offer',()=>{
 const mutate=[
  data=>{data.url='https://coffee.example/products/another-coffee';},
  data=>{data['@type']='Organization';},
  data=>{data.offers[0]['@type']='Thing';},
  data=>{data.offers[0].url='https://coffee.example/products/another-coffee?variant=1001';},
  data=>{data.offers[0].url=SOURCE+'?variant=1001&session=private';},
  data=>{data.offers[0].url=SOURCE+'?variant=1001&variant=1001';},
  data=>{data.offers[0].url=SOURCE+'?variant=not-a-number';},
  data=>{data.offers[0].url=SOURCE;},
  data=>{delete data.offers[0].url;},
  data=>{data.url=SOURCE+'?variant=1002';}
 ];
 for(const change of mutate){
  const data=product();change(data);
  assert.equal(Object.hasOwn(clean(data).offers[0],'checkoutPageURLTemplate'),false,String(change));
 }
 const detached={...product(),details:{...offer()}};
 detached.checkoutPageURLTemplate=offer().checkoutPageURLTemplate;
 const actual=clean(detached);
 assert.equal(Object.hasOwn(actual,'checkoutPageURLTemplate'),false);
 assert.equal(Object.hasOwn(actual.details,'checkoutPageURLTemplate'),false);
 assert.ok(actual.offers[0].checkoutPageURLTemplate);
 const graph={'@graph':[product(),{...product(),url:'https://coffee.example/products/other'}]};
 const graphResult=clean(graph);
 assert.ok(graphResult['@graph'][0].offers[0].checkoutPageURLTemplate);
 assert.equal(Object.hasOwn(graphResult['@graph'][1].offers[0],'checkoutPageURLTemplate'),false);
 assert.equal(Object.hasOwn(JSON.parse(sanitizePublicCoffeeJson(product())).offers[0],'checkoutPageURLTemplate'),false);
 const byId=product();byId.offers[0]['@id']=byId.offers[0].url+'#offer';delete byId.offers[0].url;
 assert.ok(clean(byId).offers[0].checkoutPageURLTemplate);
 for(const suffix of ['', '#product', '#offer-private']){
  const ambiguous=structuredClone(byId);ambiguous.offers[0]['@id']=SOURCE+'?variant=1001'+suffix;
  assert.equal(Object.hasOwn(clean(ambiguous).offers[0],'checkoutPageURLTemplate'),false,suffix);
 }
 const contradictory=structuredClone(byId);contradictory.offers[0].url='https://other.example/products/selected-kenya?variant=1001';
 assert.equal(Object.hasOwn(clean(contradictory).offers[0],'checkoutPageURLTemplate'),false);
});

test('sanitized selected-product JSON-LD retains the entire public extraction including all offers',()=>{
 const html=documentFor(product([offer('1001'),offer('1002','2'),offer('1003','99')]));
 const before=extractPublicCoffeeFacts(compactCoffeeProductHtml(html),{source_url:SOURCE});
 const fixture=sanitizePublicCoffeeFixtureHtml(html,{source_url:SOURCE});
 const after=extractPublicCoffeeFacts(fixture,{source_url:SOURCE});
 assert.equal(before.ok,true);
 assert.equal(before.fields.name,'Selected Kenya');
 assert.ok(before.source_facts?.length);
 assert.match(fixture,/checkoutPageURLTemplate/);
 assert.deepEqual(after,before,'compare every field, conflict and source fact; no filtered parity');
});

test('nested public Yoast variants and URL-less exact Offer IDs retain complete extraction',()=>{
 const base=product(),variants=['1001','1002','1003'].map(id=>{
  const variantOffer=offer(id);
  variantOffer['@id']=variantOffer.url+'#offer';delete variantOffer.url;
  return {'@type':'Product',name:'Selected Kenya - '+id,url:SOURCE+'?variant='+id,offers:variantOffer};
 });
 delete base.offers;base.hasVariant=variants;
 const html=documentFor(base),fixture=sanitizePublicCoffeeFixtureHtml(html,{source_url:SOURCE});
 const before=extractPublicCoffeeFacts(compactCoffeeProductHtml(html),{source_url:SOURCE});
 const after=extractPublicCoffeeFacts(fixture,{source_url:SOURCE});
 assert.ok(before.ok);
 assert.match(fixture,/checkoutPageURLTemplate/);
 assert.deepEqual(after,before);
});

test('same-origin root schema Product variants and typed Offers preserve exact selected public facts',()=>{
 const base=product();delete base.offers;
 base.hasVariant=Array.from({length:9},(_,index)=>{
  const id=String(1001+index);
  return {'@type':'Product','@id':'https://coffee.example/#/schema/Product/selected-'+id,
   name:'Selected Kenya '+id,
   offers:{...offer(id),'@id':'https://coffee.example/#/schema/Offer/selected-'+id}};
 });
 const json=clean(base);
 assert.equal(json.hasVariant.length,9);
 for(let i=0;i<9;i++)
  assert.equal(json.hasVariant[i].offers.checkoutPageURLTemplate,base.hasVariant[i].offers.checkoutPageURLTemplate);
 const html=documentFor(base);
 const original=extractPublicCoffeeFacts(compactCoffeeProductHtml(html),{source_url:SOURCE});
 const fixture=sanitizePublicCoffeeFixtureHtml(html,{source_url:SOURCE});
 const replay=extractPublicCoffeeFacts(fixture,{source_url:SOURCE});
 assert.equal(original.ok,true);
 assert.equal((fixture.match(/checkoutPageURLTemplate/g)||[]).length,9);
 assert.deepEqual(replay,original,'source-fact records, conflicts and all published offers must be identical');
 for(const change of [
  child=>{child['@id']='https://other.example/#/schema/Product/selected-1001';},
  child=>{child['@id']='https://coffee.example/products/selected-kenya#/schema/Product/selected-1001';},
  child=>{child['@id']='https://coffee.example/#/schema/Product/selected-1001?private';},
  child=>{child.url=SOURCE;},
  child=>{child.offers['@id']='https://other.example/#/schema/Offer/selected-1001';},
  child=>{child.offers['@id']='https://coffee.example/#/schema/Product/selected-1001';},
  child=>{child.offers.url='https://coffee.example/products/other?variant=1001';},
  child=>{child.offers.url=SOURCE+'?variant=1002';}
 ]){
  const data=structuredClone(base);data.hasVariant=[data.hasVariant[0]];
  change(data.hasVariant[0]);
  assert.equal(Object.hasOwn(clean(data).hasVariant[0].offers,'checkoutPageURLTemplate'),false,String(change));
 }
 const foreign=structuredClone(base);foreign.url='https://coffee.example/products/another-coffee';
 assert.equal(Object.hasOwn(clean(foreign).hasVariant[0].offers,'checkoutPageURLTemplate'),false);
 assert.equal(Object.hasOwn(JSON.parse(sanitizePublicCoffeeJson(base)).hasVariant[0].offers,'checkoutPageURLTemplate'),false);
});

test('all real inert product markers preserve complete extraction and genuine variety conflicts',()=>{
 const data={title:'Selected Kenya',handle:'selected-kenya',url:SOURCE,vendor:'Example Coffee Roasters',
  variants:[{id:1001,title:'250 g',price:1800,available:true}],description:'A published Kenyan coffee.'};
 for(const marker of ['data-product-json','data-product','data-product-data','data-shopify-product']){
  for(const prefix of ['', '=unusual @click="marker inside quoted value" ']){
   const html='<main><h1>Selected Kenya</h1><dl><dt>Origin</dt><dd>Kenya</dd>'+
    '<dt>Variety</dt><dd>SL34</dd><dt>Variety</dt><dd>Ruiru 11</dd></dl>'+
    '<script type="application/json" '+prefix+marker+'="DO_NOT_RETAIN_ATTRIBUTE">'+JSON.stringify(data)+'</script></main>';
   const before=extractPublicCoffeeFacts(compactCoffeeProductHtml(html),{source_url:SOURCE});
   const fixture=sanitizePublicCoffeeFixtureHtml(html,{source_url:SOURCE});
   const after=extractPublicCoffeeFacts(fixture,{source_url:SOURCE});
   assert.equal(before.ok,true,marker);
   assert.equal(before.fields.roaster,'Example Coffee Roasters',marker);
   assert.ok(before.conflicts?.includes('variety'),marker);
   assert.equal(Object.hasOwn(before.fields,'variety'),false,marker);
   assert.ok(fixture.includes('<script type="application/json" '+marker+'>'),marker);
   assert.doesNotMatch(fixture,/DO_NOT_RETAIN_ATTRIBUTE|@click=/,marker);
   assert.deepEqual(after,before,'the whole conflicting source result must survive: '+marker);
  }
 }
});

test('fixture attributes preserve only a real inert marker and strip executable and private controls',()=>{
 const data=JSON.stringify({title:'Selected Kenya',handle:'selected-kenya',url:SOURCE});
 for(const marker of ['data-product-json','data-product','data-product-data','data-shopify-product']){
  for(const attributes of [
   'type="application/json" data-note="'+marker+'"',
   'type="application/json" ='+marker,
   'type="application/json" @click="'+marker+'"',
   'type="application/json" 7="'+marker+'"',
   'type="application/json" title="id=\'ProductData\' '+marker+'"'
  ]){
   const fixture=sanitizePublicCoffeeFixtureHtml('<script '+attributes+'>'+data+'</script>',{source_url:SOURCE});
   assert.equal(fixture.includes(marker),false,attributes);
   assert.doesNotMatch(fixture,/id="ProductData"/,attributes);
  }
 }
 const forged=sanitizePublicCoffeeFixtureHtml('<script @click="type=\'application/json\' data-product-json">'+data+'</script>',{source_url:SOURCE});
 assert.doesNotMatch(forged,/<script/);
 const html='<meta name="csrf-token" content="DO_NOT_RETAIN_META">'+
  '<form action="https://bad.invalid/DO_NOT_RETAIN_ACTION"><h1>Selected Kenya</h1><p>Variety: SL34</p><input value="DO_NOT_RETAIN_INPUT">'+
  '<input type="hidden" name="coffee_variant" value="washed"><input name="csrf_token" value="DO_NOT_RETAIN_QUOTED&gt;SECRET">'+
  '<a onclick="DO_NOT_RETAIN_EVENT" href="javascript:alert(1)">Coffee</a></form>'+
  '<script type="application/json" DATA-PRODUCT-JSON="DO_NOT_RETAIN_ATTRIBUTE" nonce="DO_NOT_RETAIN_NONCE">'+data+'</script>'+
  '<script>DO_NOT_RETAIN_EXECUTABLE()</script>';
 const fixture=sanitizePublicCoffeeFixtureHtml(html,{source_url:SOURCE});
 assert.match(fixture,/Variety: SL34/);
 assert.match(fixture,/<script type="application\/json" data-product-json>/);
 assert.match(fixture,/<form\b/i);
 assert.match(fixture,/<input\b[^>]*name="coffee_variant"[^>]*value="washed"/i);
 assert.doesNotMatch(fixture,/DO_NOT_RETAIN|csrf_token|javascript:|\snonce=|\sonclick=|\saction=/i);
 assert.match(fixture,/href="#"/);
});

test('public fixture neutralizes quoted and unquoted JavaScript link or source attributes',()=>{
 for(const key of ['href','src']){
  for(const value of ['javascript:alert(1)','"javascript:alert(1)"',"'javascript:alert(1)'",
   '"javascript:alert(\'x\')"',"'javascript:alert(\"x\")'"]){
   const html='<main><h1>Selected Kenya</h1><a '+key+'='+value+'>Coffee</a>'+
    '<p>Variety: Bourbon</p><a href="https://coffee.example/products/selected-kenya">Public product</a></main>';
   const fixture=sanitizePublicCoffeeFixtureHtml(html,{source_url:SOURCE});
   assert.doesNotMatch(fixture,/javascript:|alert\(1\)/i,key+'='+value);
   assert.ok(fixture.includes(key+'="#"'),key+'='+value);
   assert.match(fixture,/href="https:\/\/coffee.example\/products\/selected-kenya"/);
   assert.match(fixture,/Variety: Bourbon/);
  }
 }
});
