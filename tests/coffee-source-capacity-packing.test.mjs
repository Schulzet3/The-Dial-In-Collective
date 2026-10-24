import test from 'node:test';
import assert from 'node:assert/strict';
import {collectCoffeeSourceFacts,collectCoffeePageGuidanceFacts,collectStructuredCoffeeSourceFacts,mergeCoffeeSourceFacts,
 MAX_SOURCE_FACTS,MAX_SOURCE_FACT_CHARACTERS,MAX_SOURCE_FACT_PARTS} from '../src/server/coffee-source-facts.mjs';
import {coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const url='https://roaster.example/products/current';
const cost=fact=>['label','value','section','source_path','source_locator'].reduce((sum,key)=>sum+(fact[key]?.length||0),0);
const source={source_url:url,source_type:'product_json'};

test('expanded evidence capacity retains more than 128 independent contexts through merging and export',()=>{
 const originals=Array.from({length:300},(_,i)=>({...source,label:'Published specification '+i,value:'Exact public value '+i,section:'Selected product details'}));
 const facts=mergeCoffeeSourceFacts(originals);
 assert.equal(facts.truncated,false);assert.deepEqual(facts,originals);
 assert.deepEqual(mergeCoffeeSourceFacts(facts,originals),originals);
 const exported=coffeeSourceReviewSnapshot({ok:true,source_url:url,source_facts:facts}).published_source_information;
 assert.deepEqual(exported,originals);assert.equal(exported.at(-1).value,'Exact public value 299');
});

test('a complete large record and distinct whole alternatives retain original values and source contexts',()=>{
 const image={caption:'Public label text '.repeat(6000),width:0};
 const a={'@type':'Product',name:'Current / Whole bean',sku:'S-1',image:'https://images.example/bag.jpg',offers:{price:'23.00',availability:'https://schema.org/InStock'}};
 const b={...a,'@id':'/products/current?variant=1#variant',image:'https://images.example/bag.jpg?width=1920',offers:{...a.offers,'@id':'/products/current?variant=1#offer',availability:'http://schema.org/InStock'}};
 const base=collectStructuredCoffeeSourceFacts({image,hasVariant:[a]},{source_url:url});
 const alternate=collectStructuredCoffeeSourceFacts({hasVariant:[b]},{source_url:url});
 const contexts=[
  {label:'Page description',value:'Dried orange in the published metadata.',source_type:'html',source_url:url,section:'Published page metadata'},
  {label:'Open Graph title',value:'A distinct published title',source_type:'html',source_url:url,section:'Published page metadata'},
  {label:'Product image description',value:'Current Cupping Notes',source_type:'product_json',source_url:url+'.js',section:'Published image caption'},
 ];
 const facts=mergeCoffeeSourceFacts(base,alternate,contexts);
 assert.equal(facts.truncated,false);assert.ok(facts.reduce((n,f)=>n+cost(f),0)>64_000);
 assert.deepEqual(JSON.parse(facts.filter(f=>f.source_path==='/image').toSorted((x,y)=>x.part-y.part).map(f=>f.value).join('')),image);
 const alternatives=facts.filter(f=>f.source_path==='/hasVariant/0').map(f=>JSON.parse(f.value));
 assert.equal(alternatives.length,2);assert.ok(alternatives.some(v=>JSON.stringify(v)===JSON.stringify(a)));
 assert.ok(alternatives.some(v=>JSON.stringify(v)===JSON.stringify(b)));
 for(const original of contexts)assert.deepEqual(facts.find(f=>f.label===original.label),original);
 assert.deepEqual(coffeeSourceReviewSnapshot({ok:true,source_url:url,source_facts:facts}).published_source_information,facts);
});

test('long generated option titles remain exact in the summary value and typed variant',()=>{
 const title='A distinct published grind and bag selection '.repeat(4).trim();
 const variant={id:1,title,price:2300,weight:250,weight_unit:'g',available:false};
 const facts=collectStructuredCoffeeSourceFacts({variants:[variant]},{source_url:url+'.js'});
 assert.equal(facts.truncated,false);
 const summary=facts.find(f=>f.label==='Purchase option: Published variant');
 assert.equal(summary.value,'title '+title+'; price 2300 (currency minor units); shipping weight 250 g; unavailable');
 assert.deepEqual(JSON.parse(facts.find(f=>f.source_path==='/variants/0').value),variant);
 assert.ok(facts.every(f=>f.label.length<=100));
 assert.equal(collectStructuredCoffeeSourceFacts({attributes:[{name:'source-authored label '.repeat(6),value:'Separate context'}]}).truncated,true);
});

test('the bounded shortcode scan reaches exact markers after large inert selected-product content',()=>{
 const marker='1.383 | -77.156 | Buesaco, Colombia';
 const padding='<!-- '+('public layout '.repeat(14000))+' -->';
 const html='<main>'+padding+'<p>[map map_markers="'+marker+'"]</p>'+
  '<script>"[map map_markers=\'script-only marker\']"</script><!-- [map map_markers="comment-only marker"] --></main>';
 assert.ok(html.indexOf(marker)>160_000&&html.length<2_000_000);
 const facts=collectCoffeeSourceFacts(html,{source_url:url});
 assert.equal(facts.truncated,false);
 assert.deepEqual(facts.filter(f=>f.label==='Published map marker').map(f=>[f.value,f.source_url,f.field]),[[marker,url,undefined]]);
 assert.doesNotMatch(JSON.stringify(facts),/script-only marker|comment-only marker/);
});

test('shortcode and page input bounds still refuse content beyond the existing two-million-character scope',()=>{
 const html=' '.repeat(2_000_001)+'[map map_markers="Beyond the input bound"]';
 const page=collectCoffeeSourceFacts(html,{source_url:url});
 assert.equal(page.truncated,true);assert.equal(page.length,0);
 const data=collectStructuredCoffeeSourceFacts({description:html},{source_url:url+'.js'});
 assert.equal(data.truncated,true);assert.equal(data.some(f=>f.label==='Published map marker'),false);
});

test('bounded intermediate collection can prioritize eligible evidence beyond the former 512-row prefix',()=>{
 const panels=Array.from({length:600},(_,i)=>({...source,label:'Panel '+i,value:'Educational copy '+i,section:'Supplementary page panel'}));
 const selected={...source,label:'Published selected variety',value:'Bourbon Ají',field:'variety',section:'Selected product details'};
 const facts=mergeCoffeeSourceFacts([...panels,selected]);
 assert.equal(facts.length,MAX_SOURCE_FACTS);assert.equal(facts.truncated,true);
 assert.deepEqual(facts.find(f=>f.field==='variety'),selected);
 const overflow=mergeCoffeeSourceFacts([...Array.from({length:MAX_SOURCE_FACTS*2},(_,i)=>({...source,label:'Field '+i,value:'v'})),selected]);
 assert.equal(overflow.truncated,true);assert.equal(overflow.some(f=>f.field==='variety'),false);
});

test('structured part validity remains independent of the expanded fact count',()=>{
 const row={...source,label:'Original JSON fragment',source_path:'/media',format:'json',part:MAX_SOURCE_FACT_PARTS-1,value:'null'};
 const allowed=mergeCoffeeSourceFacts([row]);
 assert.equal(allowed[0].part,127);assert.equal(allowed.truncated,false);
 assert.equal(coffeeSourceReviewSnapshot({ok:true,source_url:url,source_facts:allowed}).published_source_information[0].part,127);
 for(const part of [MAX_SOURCE_FACT_PARTS,MAX_SOURCE_FACTS-1,-1,1.5,NaN,Infinity,null,'0']){
  const facts=mergeCoffeeSourceFacts([{...row,part}]);
  assert.equal(facts.length,0);assert.equal(facts.truncated,true);
 }
});

test('oversized generated JSON cannot expose unsupported parts, broken Unicode or dangling child references',()=>{
 const terms='🍋'.repeat(MAX_SOURCE_FACT_CHARACTERS);
 const variants=[{id:1,title:'Bag one',price:1200,selling_plan_allocations:[{terms}]},{id:2,title:'Bag two',price:2400,selling_plan_allocations:[{terms}]}];
 const facts=collectStructuredCoffeeSourceFacts({variants},{source_url:url+'.js'});
 assert.equal(facts.truncated,true);assert.ok(facts.some(f=>f.format==='projection'&&f.source_path==='/variants/0'));
 assert.ok(facts.some(f=>f.format==='projection'&&f.source_path==='/variants/1'));
 assert.equal(facts.some(f=>f.format==='reference'),false);
 assert.ok(facts.length<=MAX_SOURCE_FACTS);assert.ok(facts.reduce((n,f)=>n+cost(f),0)<=MAX_SOURCE_FACT_CHARACTERS);
 for(const f of facts){
  assert.ok(f.value.length<=1600);assert.ok(f.part===undefined||f.part<MAX_SOURCE_FACT_PARTS);
  assert.equal(Buffer.from(f.value,'utf8').toString('utf8'),f.value);
 }
});

test('a genuine malformed guidance tail remains explicitly truncated',()=>{
 const facts=collectCoffeePageGuidanceFacts('<footer><details><summary>How should I store it?</summary><p>Keep the selected coffee sealed and dry.</p></details><di\n</footer>',{source_url:url});
 assert.equal(facts.truncated,true);
 assert.ok(facts.some(f=>f.section==='Roaster general coffee guidance'&&f.value==='Keep the selected coffee sealed and dry.'));
});
