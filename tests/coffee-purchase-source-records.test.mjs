import test from 'node:test';
import assert from 'node:assert/strict';
import {collectCoffeeSourceFacts,collectStructuredCoffeeSourceFacts,mergeCoffeeSourceFacts,MAX_SOURCE_FACTS,MAX_SOURCE_FACT_CHARACTERS} from '../src/server/coffee-source-facts.mjs';
import {coffeeSourceReviewSnapshot,coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const url='https://roaster.example/product/current/';
const escape=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
const form=(values,{action=url,id='123',extra=''}={})=>'<form class="variations_form cart" action="'+action+'" data-product_id="'+id+'" '+extra+' data-product_variations="'+escape(JSON.stringify(values))+'"><p>Selected product details.</p></form>';

// Test-side reconstruction deliberately keeps namespaces and exact paths;
// a projection alone cannot masquerade as the original whole record.
function reconstruct(facts,sourcePath,locator='',seen=new Set()){
 const key=locator+'\0'+sourcePath;assert.equal(seen.has(key),false,'reference cycle');
 seen=new Set([...seen,key]);
 const destinations=f=>{if(f.format!=='reference')return [f.source_path];try{return JSON.parse(f.value).destinations||[f.source_path];}catch{return [f.source_path];}};
 const at=facts.filter(f=>f.source_url===url&&destinations(f).includes(sourcePath)&&(f.source_locator||'')===locator);
 assert.ok(at.length,'missing exact source path '+sourcePath);
 assert.ok(at.every(f=>f.format===at[0].format));
 const chunks=at.toSorted((a,b)=>a.part-b.part);chunks.forEach((f,i)=>assert.equal(f.part,i));
 const value=JSON.parse(chunks.map(f=>f.value).join(''));
 if(at[0].format==='reference')return reconstruct(facts,value.source_path,locator,seen);
 if(at[0].format==='json')return value;
 assert.equal(at[0].format,'projection');
 const children=new Set(facts.filter(f=>f.source_url===url&&(f.source_locator||'')===locator).flatMap(destinations)
  .filter(path=>path?.startsWith(sourcePath+'/')).map(path=>path.slice(sourcePath.length+1).split('/')[0]));
 for(const child of children){assert.equal(Object.hasOwn(value,child),false);value[child]=reconstruct(facts,sourcePath+'/'+child,locator,seen);}
 return value;
}

test('large repeated subscription records retain every original variant with explicit references',()=>{
 const plans=Array.from({length:18},(_,i)=>({selling_plan_id:800+i,price:2200,per_delivery_price:2200,terms:'Every '+(i+1)+' weeks; '+('public recurring purchase terms ').repeat(8)}));
 const variants=Array.from({length:12},(_,i)=>({id:1000+i,title:'Bag '+i,options:['250g','Grind '+i],price:2200+i,available:i%2===0,
  sku:null,weight:250,quantity_rule:{min:1,max:null,increment:1},selling_plan_allocations:plans}));
 const facts=collectStructuredCoffeeSourceFacts({variants},{source_url:url});
 assert.ok(facts.some(f=>f.format==='projection'));assert.ok(facts.some(f=>f.format==='reference'));
 assert.equal(facts.truncated,false);assert.ok(facts.length<=MAX_SOURCE_FACTS);
 assert.ok(facts.reduce((n,f)=>n+f.value.length+f.label.length+(f.source_path?.length||0),0)<MAX_SOURCE_FACT_CHARACTERS);
 for(let i=0;i<variants.length;i++)assert.deepEqual(reconstruct(facts,'/variants/'+i),variants[i]);
 assert.equal(facts.filter(f=>f.format==='json'&&f.source_path?.endsWith('/selling_plan_allocations')&&f.part===0).length,1);
 const snapshot=coffeeSourceReviewSnapshot({ok:true,source_url:url,source_facts:facts});
 assert.deepEqual(reconstruct(snapshot.published_source_information,'/variants/11'),variants[11]);
 assert.doesNotMatch(coffeeUrlPreviewMarkup({ok:true,source_url:url,fields:{name:'Coffee'},source_facts:facts}),/selling_plan_id/);
});

test('selected ProductGroup children retain their own price, identity and original hasVariant paths',()=>{
 const variants=[{'@type':'Product',name:'Current coffee / 12oz',sku:'A',url:url+'?variant=1',offers:{price:'18.50',priceCurrency:'USD'}},
  {'@type':'Product',name:'Current coffee / 2lb',sku:'B',url:url+'?variant=2',offers:{price:'36.00',priceCurrency:'USD'}}];
 const facts=collectStructuredCoffeeSourceFacts({'@type':'ProductGroup',name:'Current coffee',hasVariant:variants},{source_url:url});
 for(let i=0;i<variants.length;i++)assert.deepEqual(reconstruct(facts,'/hasVariant/'+i),variants[i]);
 assert.equal(facts.some(f=>f.source_path?.startsWith('/variants/')),false);
 const single=collectStructuredCoffeeSourceFacts({hasVariant:variants[0]},{source_url:url});
 assert.deepEqual(reconstruct(single,'/hasVariant'),variants[0]);
});

test('repeated page variant projections cannot displace original endpoint purchase globals and cores',()=>{
 const plans=Array.from({length:20},(_,i)=>({id:i,terms:'Repeated public subscription terms '.repeat(12)}));
 const variant=i=>({id:i,title:'Variant '+i,price:2000+i,available:false,options:['Size '+i],selling_plan_allocations:plans});
 const page=collectStructuredCoffeeSourceFacts({variants:Array.from({length:48},(_,i)=>variant(i))},{source_url:url});
 const data={price_min:2000,price_max:2011,available:false,options:[{name:'Size',values:['250g','2lb']}],attributes:[{name:'Grind',options:['Whole bean','Ground']}],
  selling_plan_groups:[{name:'Monthly',plans:[1,2]}],variants:Array.from({length:12},(_,i)=>variant(i))};
 const endpoint=collectStructuredCoffeeSourceFacts(data,{source_url:url+'coffee.js'});
 const specifications=Array.from({length:MAX_SOURCE_FACTS-32},(_,i)=>({label:'Selected specification '+i,value:'Original specification '+i,source_url:url,source_type:'html'}));
 const combined=mergeCoffeeSourceFacts(specifications,page,endpoint);
 for(const key of ['price_min','price_max','available','options','attributes','selling_plan_groups']){
  const facts=combined.filter(f=>f.source_url===url+'coffee.js'&&f.source_path==='/'+key);
  assert.deepEqual(JSON.parse(facts.toSorted((a,b)=>a.part-b.part).map(f=>f.value).join('')),data[key]);
 }
 for(let i=0;i<12;i++)assert.ok(combined.some(f=>f.source_url===url+'coffee.js'&&f.source_path==='/variants/'+i&&f.format==='projection'));
 assert.equal(combined.truncated,true);
});

test('large Woo form attributes preserve exact public purchase associations and HTML locator',()=>{
 const image={src:'https://images.example/bag.jpg',alt:'Public bag label',srcset:'image '.repeat(400)};
 const values=Array.from({length:12},(_,i)=>({variation_id:300+i,attributes:{'attribute_bag-size':i%2?'2lb':'12oz',attribute_pa_grind:'whole-bean'},
  display_price:21+i,display_regular_price:30,is_in_stock:i!==2,is_purchasable:true,min_qty:1,max_qty:'',weight:'0.75',image,
  gallery_images_html:'<figure>'+('Repeated published product gallery ').repeat(100)+'</figure>',nonce:'private-session-value'}));
 const markup=form(values);assert.ok(markup.indexOf('>')>2400);
 const facts=collectCoffeeSourceFacts(markup,{source_url:url}),locator='form[data-product_variations][data-product_id="123"]';
 assert.equal(facts.truncated,false);
 for(let i=0;i<values.length;i++){const {nonce,...expected}=values[i];assert.equal(nonce,'private-session-value');assert.deepEqual(reconstruct(facts,'/'+i,locator),expected);}
 assert.doesNotMatch(JSON.stringify(facts),/private-session-value|nonce/);
 assert.ok(facts.some(f=>f.label.startsWith('Purchase option:')&&f.value.includes('Published price 32')));
 const exported=coffeeSourceReviewSnapshot({ok:true,source_url:url,source_facts:facts}).published_source_information;
 assert.deepEqual(reconstruct(exported,'/11',locator),reconstruct(facts,'/11',locator));
 assert.ok(exported.some(f=>f.source_locator===locator));
});

test('Woo records require the selected form action and exclude hidden or unrelated forms',()=>{
 const selected=[{variation_id:1,attributes:{attribute_size:'250g'},display_price:0,is_in_stock:false}];
 const other=[{variation_id:2,display_price:999}];
 const facts=collectCoffeeSourceFacts(form(other,{action:'https://roaster.example/product/other/'})+'<nav>'+form(other)+'</nav>'+form(other,{extra:'hidden'})+form(selected),{source_url:url});
 const locator='form[data-product_variations][data-product_id="123"]';
 assert.deepEqual(reconstruct(facts,'/0',locator),selected[0]);
 assert.doesNotMatch(JSON.stringify(facts),/999/);
});

test('inactive Woo forms under inline CSS or hidden ancestry do not become selected purchase records',()=>{
 const values=[{variation_id:1,display_price:999}];
 const forms=[form(values,{extra:'style="display: none !important"'}),form(values,{extra:'style="visibility:hidden"'}),
  '<div style="color:red;display:none">'+form(values)+'</div>','<section style="visibility:hidden">'+form(values)+'</section>',
  '<div hidden>'+form(values)+'</div>','<div aria-hidden="true">'+form(values)+'</div>'];
 for(const markup of forms){
  assert.equal(collectCoffeeSourceFacts(markup,{source_url:url}).some(f=>f.source_locator),false);
  const html='<head><script type="application/ld+json">'+JSON.stringify({'@type':'Product',name:'Current coffee',url})+'</script></head><main><h1>Current coffee</h1><p>Variety: Bourbon Ají</p>'+markup+'</main>';
  const preview=extractPublicCoffeeFacts(html,{source_url:url});
  assert.equal(preview.ok,true);assert.equal(preview.source_facts.some(f=>f.source_locator),false);
 }
 const visible=collectCoffeeSourceFacts('<div style="display:grid;visibility:visible">'+form(values)+'</div>',{source_url:url});
 assert.ok(visible.some(f=>f.source_locator));
});

test('ambiguous Woo product identities and inconsistent duplicate forms are withheld',()=>{
 for(const markup of [form([{variation_id:1}],{id:'123'})+form([{variation_id:2}],{id:'456'}),form([{variation_id:1}])+form([{variation_id:2}])]){
  const facts=collectCoffeeSourceFacts(markup,{source_url:url});
  assert.equal(facts.some(f=>f.source_locator),false);assert.equal(facts.truncated,true);
 }
 const duplicate=collectCoffeeSourceFacts(form([{variation_id:1}])+form([{variation_id:1}]),{source_url:url});
 assert.equal(duplicate.filter(f=>f.source_locator&&f.source_path==='/0').length,1);
});

test('Woo action identity includes meaningful query selectors but permits ordinary tracking',()=>{
 const values=[{variation_id:1,display_price:22}];
 const wrong=collectCoffeeSourceFacts(form(values,{action:url+'?product_id=other'}),{source_url:url});
 assert.equal(wrong.some(f=>f.source_locator),false);
 const wrongVariation=collectCoffeeSourceFacts(form(values,{action:url+'?variation_id=2'}),{source_url:url+'?variation_id=1'});
 assert.equal(wrongVariation.some(f=>f.source_locator),false);
 const tracking=collectCoffeeSourceFacts(form(values),{source_url:url+'?utm_source=search&srsltid=public-tracking'});
 assert.ok(tracking.some(f=>f.source_locator));
 const same=collectCoffeeSourceFacts(form(values,{action:'?product_id=1&sort=asc'}),{source_url:url+'?sort=asc&product_id=1'});
 assert.ok(same.some(f=>f.source_locator));
 const implicit=collectCoffeeSourceFacts(form(values,{action:''}),{source_url:url+'?product_id=1'});
 assert.ok(implicit.some(f=>f.source_locator));
});

test('Woo variation limits and malformed attributes report incompleteness without executing markup',()=>{
 const oversized=form([{variation_id:1,gallery_images_html:'x'.repeat(520000)}]);
 assert.equal(collectCoffeeSourceFacts(oversized,{source_url:url}).truncated,true);
 const malformed='<form class="variations_form" data-product_id="123" data-product_variations="{bad}"></form>';
 assert.equal(collectCoffeeSourceFacts(malformed,{source_url:url}).truncated,true);
 const falseData='<form class="variations_form" data-product_id="123" data-product_variations="false"></form>';
 assert.equal(collectCoffeeSourceFacts(falseData,{source_url:url}).some(f=>f.source_locator),false);
});

test('references cannot survive without a complete target in the exact source namespace',()=>{
 const base={source_type:'product_json',source_url:url,part:0};
 const reference={...base,label:'Repeated plan',source_path:'/variants/1/plans',format:'reference',value:'{"source_path":"/variants/0/plans"}'};
 const target={...base,label:'Original plan',source_path:'/variants/0/plans',format:'json',value:'{"frequency":"weekly"}'};
 for(const targets of [[],[{...target,source_url:url+'?other=1'}],[{...target,source_locator:'form[data-product_variations][data-product_id="123"]'}],[{...target,value:'{"frequency":'}]]){
  const facts=mergeCoffeeSourceFacts([reference,...targets]);
  assert.equal(facts.some(f=>f.format==='reference'),false);assert.equal(facts.truncated,true);
 }
 const valid=mergeCoffeeSourceFacts([reference,target]);
 assert.equal(valid.some(f=>f.format==='reference'),true);assert.equal(valid.truncated,false);
});

test('72 public variants retain every exact field by grouping repeated child destinations within existing bounds',()=>{
 const plans=Array.from({length:3},(_,i)=>({selling_plan_id:100+i,price:2000+i,terms:'Published recurring purchase terms. '.repeat(Math.ceil(MAX_SOURCE_FACT_CHARACTERS/(72*3*35))+3)}));
 const image={src:'https://images.example/bag.jpg',alt:'Published product image',srcset:'public-image '.repeat(35)};
 const variants=Array.from({length:72},(_,i)=>({id:4000+i,title:'Size '+i+' / Whole bean',option1:'Size '+i,option2:'Whole bean',option3:null,
  sku:'public-'+i,requires_shipping:true,taxable:false,featured_image:image,available:i%2===0,name:'Current coffee / Size '+i,
  options:['Size '+i,'Whole bean'],price:2000+i,weight:250,quantity_rule:{min:1,max:null,increment:1},selling_plan_allocations:plans}));
 assert.ok(JSON.stringify(variants).length>MAX_SOURCE_FACT_CHARACTERS);
 const facts=collectStructuredCoffeeSourceFacts({variants},{source_url:url});
 const groups=facts.filter(f=>f.format==='reference'&&JSON.parse(f.value).destinations);
 assert.ok(groups.length>0);assert.ok(groups.every(f=>f.value.length<=1600));
 for(const f of groups){const value=JSON.parse(f.value);assert.equal(value.destinations[0],f.source_path);assert.equal(new Set(value.destinations).size,value.destinations.length);}
 for(let i=0;i<variants.length;i++)assert.deepEqual(reconstruct(facts,'/variants/'+i),variants[i]);
 assert.ok(facts.length<=MAX_SOURCE_FACTS);
 assert.ok(facts.reduce((n,f)=>n+f.value.length+f.label.length+(f.section?.length||0)+(f.source_path?.length||0)+(f.source_locator?.length||0),0)<=MAX_SOURCE_FACT_CHARACTERS);
 const exported=coffeeSourceReviewSnapshot({ok:true,source_url:url,source_facts:facts}).published_source_information;
 assert.deepEqual(exported,facts);
 assert.deepEqual(reconstruct(exported,'/variants/71'),variants[71]);
});

test('public variant cap covers indices 64 through 127 and explicitly flags values beyond 128',()=>{
 const variants=Array.from({length:129},(_,i)=>({id:6000+i,title:'Bag '+i,price:1000+i,available:false}));
 const facts=collectStructuredCoffeeSourceFacts({variants},{source_url:url});
 for(const i of [0,63,64,71,127])assert.deepEqual(reconstruct(facts,'/variants/'+i),variants[i]);
 assert.equal(facts.some(f=>f.source_path==='/variants/128'),false);
 assert.equal(facts.truncated,true);assert.equal(facts.filter(f=>/^\/variants\/\d+$/.test(f.source_path||'')).length,128);
});

test('grouped references reject duplicate, conflicting, unrelated and unsupported destinations',()=>{
 const base={source_type:'product_json',source_url:url,part:0};
 const target={...base,label:'Original plans',source_path:'/variants/0/plans',format:'json',value:'[{"price":0,"maximum":null}]'};
 const reference={...base,label:'Repeated plans',source_path:'/variants/1/plans',format:'reference',
  value:JSON.stringify({source_path:target.source_path,destinations:['/variants/1/plans','/variants/2/plans']})};
 const valid=mergeCoffeeSourceFacts([target,reference]);assert.equal(valid.truncated,false);assert.equal(valid.length,2);
 const invalid=[
  {source_path:target.source_path,destinations:['/variants/2/plans','/variants/1/plans']},
  {source_path:target.source_path,destinations:['/variants/1/plans','/variants/1/plans']},
  {source_path:target.source_path,destinations:['/variants/1/plans']},
  {source_path:target.source_path,destinations:['/variants/1/plans','/variants/0/plans']},
  {source_path:target.source_path,destinations:['/variants/1/plans','/hasVariant/2/plans']},
  {source_path:target.source_path,destinations:['/variants/1/plans','/variants/2/image']},
  {source_path:target.source_path,destinations:['/variants/1/plans','/variants/128/plans']},
  {source_path:target.source_path,destinations:['/variants/1/plans','https://other.example/variants/2/plans']},
  {source_path:target.source_path,destinations:['/variants/1/plans','/variants/2/plans'],source_url:'https://other.example/'},
 ];
 for(const value of invalid){const facts=mergeCoffeeSourceFacts([target,{...reference,value:JSON.stringify(value)}]);assert.equal(facts.some(f=>f.format==='reference'),false);assert.equal(facts.truncated,true);}
 for(const extra of [
  {...target,source_path:'/variants/2/plans'},
  {...reference,source_path:'/variants/2/plans',value:JSON.stringify({source_path:target.source_path})},
  {...target,format:'projection'},
 ]){
  const facts=mergeCoffeeSourceFacts([target,reference,extra]);
  assert.equal(facts.some(f=>f.source_path==='/variants/1/plans'&&f.format==='reference'),false);assert.equal(facts.truncated,true);
 }
});

test('grouped references cannot borrow a partial or different URL/form target',()=>{
 const base={source_type:'product_json',source_url:url,part:0};
 const target={...base,label:'Plans',source_path:'/variants/0/plans',format:'json',value:'[1,2,3]'};
 const reference={...base,label:'Repeated plans',source_path:'/variants/1/plans',format:'reference',
  value:JSON.stringify({source_path:target.source_path,destinations:['/variants/1/plans','/variants/2/plans']})};
 for(const changed of [
  {...target,value:'[1,2,'},{...target,part:1},{...target,source_url:url+'other'},
  {...target,source_locator:'form[data-product_variations][data-product_id="456"]'},
 ]){
  const facts=mergeCoffeeSourceFacts([changed,reference]);assert.equal(facts.some(f=>f.format==='reference'),false);assert.equal(facts.truncated,true);
 }
});

test('a complete typed variant permits finishing a bounded media object before its redundant purchase summary',()=>{
 const endpoint=url+'coffee.js',base={source_url:endpoint,source_type:'product_json'};
 const fillers=Array.from({length:MAX_SOURCE_FACTS-3},(_,i)=>({...base,label:'Published specification '+i,value:'Unique source value '+i}));
 const variant={id:1,title:'Bag',price:1900,weight:250,available:true};
 const original={...base,label:'Purchase variant 1',source_path:'/variants/0',format:'json',part:0,value:JSON.stringify(variant)};
 const summary={...base,label:'Purchase option: Bag',value:'price 1900 (currency minor units); shipping weight 250 g (Shopify); available'};
 const media=[{id:99,alt:'Public bag image '.repeat(100),src:'https://images.example/bag.png'}],encoded=JSON.stringify(media);
 assert.ok(encoded.length>1600&&encoded.length<3200);
 const chunks=[0,1].map(part=>({...base,label:'Published product media'+(part?' (continued 2)':''),source_path:'/media',format:'json',part,value:encoded.slice(part*1600,(part+1)*1600)}));
 const facts=mergeCoffeeSourceFacts([...fillers,original,summary,...chunks]);
 assert.equal(facts.length,MAX_SOURCE_FACTS);assert.equal(facts.truncated,true);
 assert.equal(facts.some(f=>f.label===summary.label),false);
 for(const filler of fillers)assert.ok(facts.some(f=>f.label===filler.label&&f.value===filler.value));
 assert.ok(facts.some(f=>f.source_path==='/variants/0'&&f.value===original.value));
 assert.deepEqual(JSON.parse(facts.filter(f=>f.source_path==='/media').toSorted((a,b)=>a.part-b.part).map(f=>f.value).join('')),media);
});

test('bounded completion preserves fallback summaries unless the exact same-source typed variant survived',()=>{
 const endpoint=url+'coffee.js',base={source_url:endpoint,source_type:'product_json'};
 const fillers=Array.from({length:MAX_SOURCE_FACTS-3},(_,i)=>({...base,label:'Published specification '+i,value:'Unique source value '+i}));
 const original={...base,label:'Purchase variant 1',source_path:'/variants/0',format:'json',part:0,value:JSON.stringify({id:1,title:'Bag',price:1900,available:true})};
 const summary={...base,label:'Purchase option: Bag',value:'price 1900 (currency minor units); available'};
 const encoded=JSON.stringify([{alt:'Published image '.repeat(110)}]);
 const chunks=[0,1].map(part=>({...base,label:'Published product media'+(part?' (continued 2)':''),source_path:'/media',format:'json',part,value:encoded.slice(part*1600,(part+1)*1600)}));
 const controls=[
  [{...original,value:'{"id":1,'},summary,chunks],
  [{...original,format:'projection',value:'{"id":1,"title":"Bag","available":true}'},summary,chunks],
  [{...original,source_url:endpoint+'?other=1'},summary,chunks],
  [original,{...summary,value:'price 2000 (currency minor units); available'},chunks],
  [original,{...summary,supporting_sources:[{source_url:url,source_type:'html'}]},chunks],
  [original,{...summary,conflicting:true},chunks],
  [original,{...summary,field:'origin'},chunks],
  [original,{...summary,source_path:'/variants/9'},chunks],
  [original,{...summary,part:0},chunks],
  [original,{...summary,section:'Independent context'},chunks],
  [original,{...summary,source_locator:'form[data-product_variations][data-product_id="123"]'},chunks],
  [original,summary,[chunks[0],{...chunks[1],value:'not complete JSON'}]],
  [original,summary,[chunks[0],{...chunks[1],part:2}]],
 ];
 for(const [variant,display,parts] of controls){
  const facts=mergeCoffeeSourceFacts([...fillers,variant,display,...parts]);
  assert.ok(facts.some(f=>f.label===summary.label),'fallback or separately sourced summary must survive');
  assert.equal(facts.filter(f=>f.source_path==='/media').length,1);
  assert.equal(facts.length,MAX_SOURCE_FACTS);assert.equal(facts.truncated,true);
 }
});

test('a shared summary needs exact typed evidence at every retained supporting source',()=>{
 const endpoint=url+'coffee.js',base={source_url:endpoint,source_type:'product_json'};
 const variant={id:1,title:'Bag',price:'19.00',weight:8,weight_unit:'oz',available:false};
 const original={...base,label:'Purchase variant 1',source_path:'/variants/0',format:'projection',part:0,value:JSON.stringify(variant)};
 const page={...original,source_url:url,source_type:'html'};
 const summary={...base,label:'Purchase option: Bag',value:'price 19.00; shipping weight 8 oz; unavailable',supporting_sources:[{source_url:url,source_type:'html'}]};
 const fillers=Array.from({length:MAX_SOURCE_FACTS-4},(_,i)=>({...base,label:'Published specification '+i,value:'Unique source value '+i}));
 const encoded=JSON.stringify([{alt:'Published image '.repeat(110)}]);
 const chunks=[0,1].map(part=>({...base,label:'Published product media'+(part?' (continued 2)':''),source_path:'/media',format:'json',part,value:encoded.slice(part*1600,(part+1)*1600)}));
 const facts=mergeCoffeeSourceFacts([...fillers,original,page,summary,...chunks]);
 assert.equal(facts.length,MAX_SOURCE_FACTS);assert.equal(facts.truncated,true);
 assert.equal(facts.some(f=>f.label===summary.label),false);
 assert.equal(facts.filter(f=>f.source_path==='/variants/0').length,2);
 assert.equal(facts.filter(f=>f.source_path==='/media').length,2);
 for(const filler of fillers)assert.ok(facts.some(f=>f.label===filler.label&&f.value===filler.value));
});

test('a shared ProductGroup child survives page-only pressure before later endpoint repacking',()=>{
 const description='Published details about this exact coffee. '.repeat(16);
 const variants=Array.from({length:24},(_,i)=>({'@type':'Product',name:'Bag '+i,sku:'public-'+i,description,
  offers:{price:'22.00',priceCurrency:'USD',url:url+'?variant='+i},url:url+'?variant='+i,detail:'Different '+i+' '+('published '.repeat(40))}));
 const page=collectStructuredCoffeeSourceFacts({'@type':'ProductGroup',hasVariant:variants},{source_url:url});
 assert.equal(page.truncated,false);assert.ok(page.some(f=>f.format==='projection'));
 const fillers=Array.from({length:MAX_SOURCE_FACTS-8},(_,i)=>({source_url:url,source_type:'html',label:'Published specification '+i,value:'Unique source value '+i}));
 const facts=mergeCoffeeSourceFacts(fillers,page);
 assert.equal(facts.length,MAX_SOURCE_FACTS);assert.equal(facts.truncated,true);
 for(const filler of fillers)assert.ok(facts.some(f=>f.label===filler.label&&f.value===filler.value));
 assert.deepEqual(reconstruct(facts,'/hasVariant/0'),variants[0]);
 assert.ok(facts.some(f=>f.source_path==='/hasVariant/0/description'&&f.format==='json'));
});

test('character pressure compacts only generated projection labels and nested merges retain one exact record',()=>{
 const base={source_url:url,source_type:'product_json'};
 const projections=Array.from({length:10},(_,i)=>({...base,label:'Purchase variant '+(i+1)+' public fields',source_path:'/hasVariant/'+i,
  format:'projection',part:0,value:JSON.stringify({id:i,name:'Bag '+i,detail:'Public original value '.repeat(25)})}));
 const authored={...base,label:'Purchase variant 1 public fields',value:'An independently published source label',section:'Original published context'};
 const cost=f=>['label','value','section','source_path','source_locator'].reduce((n,k)=>n+(f[k]?.length||0),0);
 const fillers=[authored];let characters=projections.reduce((n,f)=>n+cost(f),0)+cost(authored);
 for(let i=0;characters<MAX_SOURCE_FACT_CHARACTERS-20;i++){
  const label='Unique published specification '+i,value='x'.repeat(Math.min(1600,MAX_SOURCE_FACT_CHARACTERS-20-characters-label.length));
  const fact={...base,label,value};fillers.push(fact);characters+=cost(fact);
 }
 const ordinary=mergeCoffeeSourceFacts(fillers,projections);
 assert.equal(ordinary.truncated,false);assert.equal(ordinary.length,fillers.length+projections.length);
 assert.equal(ordinary.filter(f=>f.format==='projection').every(f=>f.label.includes(' public fields')),true);
 const offer={...base,label:'Published offers',source_path:'/offers',format:'json',part:0,
  value:JSON.stringify({'@type':'AggregateOffer',priceCurrency:'USD',lowPrice:'8.95',highPrice:'124.60',offerCount:24})};
 const bounded=mergeCoffeeSourceFacts(ordinary,[offer]);
 assert.ok(bounded.some(f=>f.label.startsWith('Fields for #')));
 assert.ok(bounded.some(f=>f.source_path==='/offers'&&f.value===offer.value));
 for(const f of fillers)assert.ok(bounded.some(actual=>actual.label===f.label&&actual.value===f.value&&actual.section===f.section));
 for(const f of projections)assert.ok(bounded.some(actual=>actual.source_path===f.source_path&&actual.value===f.value&&actual.format===f.format&&actual.part===f.part));
 assert.ok(bounded.reduce((n,f)=>n+cost(f),0)<=MAX_SOURCE_FACT_CHARACTERS);
 const nested=mergeCoffeeSourceFacts(bounded,projections);
 assert.equal(nested.length,bounded.length);assert.equal(nested.filter(f=>f.format==='projection').length,10);
 assert.equal(nested.find(f=>f.source_path==='/offers').value,offer.value);
 const anotherRoot=mergeCoffeeSourceFacts(ordinary,[{...offer,label:'Published dimensions',source_path:'/dimensions'}]);
 assert.equal(anotherRoot.find(f=>f.source_path==='/dimensions').value,offer.value,'complete selected root-property retention is not tied to a particular field name');
});

test('generated label aliases preserve distinct source contexts and never normalize custom or mismatched labels',()=>{
 const original={source_url:url,source_type:'product_json',label:'Purchase variant 1 public fields',source_path:'/hasVariant/0',format:'projection',part:0,value:'{"id":1}'};
 const compact={...original,label:'Fields for #1'};
 for(const pair of [[original,compact],[compact,original]])assert.equal(mergeCoffeeSourceFacts(pair).length,1);
 const pairs=[
  [original,{...compact,source_url:url+'?other=1'}],
  [original,{...compact,source_type:'html'}],
  [original,{...compact,source_locator:'form[data-product_variations][data-product_id="123"]'}],
  [original,{...compact,label:'Fields for #1 (continued 2)',part:1}],
  [original,{...compact,value:'{"id":2}'}],
  [{...original,field:'origin'},{...compact,field:'variety'}],
  [{...original,conflicting:true},compact],
  [{...original,section:'Original source context'},compact],
  [{...original,label:'Purchase variant 2 public fields'},compact],
  [{...original,label:'Published source wording'},compact],
  [{...original,format:'json'},{...compact,format:'json'}],
  [{...original,format:undefined},{...compact,format:undefined}],
 ];
 for(const pair of pairs)assert.equal(mergeCoffeeSourceFacts(pair).length,2,'independent attribution or source-authored label must survive');
});

test('a proof-backed purchase summary can make room for an original image-caption role and all its sources',()=>{
 const endpoint=url+'coffee.js',base={source_url:endpoint,source_type:'product_json'};
 const fillers=Array.from({length:MAX_SOURCE_FACTS-2},(_,i)=>({...base,label:'Published specification '+i,value:'Original source value '+i}));
 const original={...base,label:'Purchase variant 1',source_path:'/variants/0',format:'json',part:0,value:'{"title":"Bag","price":1900,"available":true}'};
 const summary={...base,label:'Purchase option: Bag',value:'price 1900 (currency minor units); available'};
 const caption={source_url:url,source_type:'html',label:'Product image description',value:'Drip Machine',section:'Published image caption',
  supporting_sources:[{source_url:url+'?published=1',source_type:'html'}]};
 const gallery={...base,label:'Published product media',source_path:'/media',format:'json',part:0,value:'[{"alt":"New gallery record"}]'};
 const facts=mergeCoffeeSourceFacts([...fillers,original,summary,caption,gallery]);
 assert.equal(facts.length,MAX_SOURCE_FACTS);assert.equal(facts.truncated,true);
 assert.equal(facts.some(f=>f.label===summary.label),false);
 assert.deepEqual(facts.find(f=>f.label===caption.label),caption);
 assert.equal(facts.some(f=>f.source_path==='/media'),false,'original caption priority also governs reclaimed capacity');
 for(const fact of fillers)assert.ok(facts.some(f=>f.label===fact.label&&f.value===fact.value));
});
