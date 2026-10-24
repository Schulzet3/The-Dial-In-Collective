import test from 'node:test';
import assert from 'node:assert/strict';
import {collectCoffeeSourceFacts,collectCoffeePageMetaSourceFacts,collectCoffeePageGuidanceFacts,collectStructuredCoffeeSourceFacts,mergeCoffeeSourceFacts,MAX_SOURCE_FACTS,MAX_SOURCE_FACT_CHARACTERS} from '../src/server/coffee-source-facts.mjs';
import {coffeeUrlPreviewMarkup,applyCoffeeUrlFields,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const source='https://roaster.example.com/products/current-coffee';
test('only recognized public product head metadata enters the source review',()=>{
 const facts=collectCoffeePageMetaSourceFacts({'product:price:currency':'USD','product:price:amount':'24.00',
  'product:availability':'in stock','csrf-token':'private','shopify-checkout-token':'private','og:site_name':'Store'},{source_url:source});
 assert.deepEqual(facts.map(f=>[f.label,f.value]),[['Published price','24.00'],['Price currency','USD'],['Published availability','in stock']]);
 assert.doesNotMatch(JSON.stringify(facts),/private|token/);
});
test('public page descriptions stay explicitly metadata and never become canonical suggestions',()=>{
 const facts=collectCoffeePageMetaSourceFacts({'og:description':'Ideal for pour-over or espresso enjoyment.',
  description:'This farm spans 17 acres and over 10 nano-lots.','twitter:description':'A different seasonal description.',
  'og:title':'Current Coffee','customer-email':'private@example.com','csrf-token':'private'},{source_url:source});
 assert.equal(facts.length,4);assert.ok(facts.every(f=>f.section==='Published page metadata'&&!f.field));
 assert.ok(facts.some(f=>f.value.includes('17 acres')));assert.doesNotMatch(JSON.stringify(facts),/private/);
 const snapshot=coffeeSourceReviewSnapshot({ok:true,source_url:source,fields:{name:'Current Coffee'},source_facts:facts});
 assert.deepEqual(snapshot.field_suggestions,{name:'Current Coffee'});
 assert.equal(snapshot.published_source_information.length,4);
});
test('visible general coffee FAQs retain packaging guidance without becoming current-lot fields',()=>{
 const html='<footer><details><summary>How should I store it?<svg><path d="x"></path></svg></summary><p>These bags are nitrogen-flushed before sealing. Store at room temperature.</p><p hidden>Old instructions: refrigerate.</p></details>'+
  '<details><summary>How do I store my payment details?</summary><p>Unrelated account information.</p></details></footer>';
 const facts=collectCoffeePageGuidanceFacts(html,{source_url:source});
 assert.equal(facts.length,1);assert.equal(facts[0].section,'Roaster general coffee guidance');
 assert.match(facts[0].value,/nitrogen-flushed/);assert.doesNotMatch(facts[0].value,/refrigerate|account/);
 assert.equal(facts[0].field,undefined);
});
test('small explicit map markers survive long shortcode descriptions without geographic inference',()=>{
 const marker='1.383 | -77.156 | Buesaco, Colombia';
 const data={description:'[vc_row text="'+('Published layout '.repeat(2600))+'"] [nectar_gmap map_markers=&#8221;'+marker+'&#8221;]'};
 const facts=collectStructuredCoffeeSourceFacts(data,{source_url:source+'.json'});
 const fact=facts.find(f=>f.label==='Published map marker');
 assert.equal(fact.value,marker);assert.equal(fact.source_url,source+'.json');assert.equal(fact.field,undefined);
 const html=collectCoffeeSourceFacts('<div class="map-marker" data-lat="1.383" data-lng="-77.156" data-mapinfo="Buesaco, Colombia"></div>',{source_url:source});
 assert.ok(html.some(f=>f.label==='Published map marker'&&f.value===marker));
 const excluded=collectCoffeeSourceFacts('<script>"[map map_markers=\'private marker\']"</script><!-- [map map_markers="commented marker"] -->');
 assert.equal(excluded.some(f=>f.label==='Published map marker'),false);
 const malformed=collectStructuredCoffeeSourceFacts({description:'[map '.repeat(10000)+'[map map_markers="'+marker+'"]'});
 assert.ok(malformed.some(f=>f.label==='Published map marker'&&f.value===marker));
});
test('yearless harvest windows remain source details without release-identity field attribution',()=>{
 const facts=collectStructuredCoffeeSourceFacts({additionalProperty:[{name:'Harvest Season',value:'July–September'},{name:'Harvest',value:'January 2026'}]},{source_url:source});
 assert.equal(facts.find(f=>f.label==='Harvest Season').field,'harvest_season');
 assert.equal(facts.find(f=>f.label==='Harvest').field,'release_label');
});

test('generic lot categories remain published facts without distinct-release attribution',()=>{
 const facts=collectCoffeeSourceFacts('<main><h1>Current Coffee</h1><p>Lot: Microlot</p><p>Release: Lot #42</p></main>',{name:'Current Coffee',source_url:'https://roaster.example.com/products/current-coffee'});
 assert.equal(facts.find(f=>f.label==='Lot').field,'lot_type');
 assert.equal(facts.find(f=>f.label==='Lot').value,'Microlot');
 assert.equal(facts.find(f=>f.label==='Release').field,'release_label');
 assert.equal(facts.find(f=>f.label==='Release').value,'Lot #42');
});
test('general FAQ collection excludes hidden, review and recommendation contexts',()=>{
 const faq='<details><summary>How should I store it?</summary><p>Not current roaster guidance.</p></details>';
 for(const wrapper of ['<div hidden>'+faq+'</div>','<div class="product-recommendations">'+faq+'</div>',
  '<section class="customer-reviews">'+faq+'</section>','<div style="display: none">'+faq+'</div>','<nav>'+faq+'</nav>'])
  assert.equal(collectCoffeePageGuidanceFacts(wrapper,{source_url:source}).length,0);
});
test('scoped gallery captions survive as unclassified evidence with image context',()=>{
 const facts=collectCoffeeSourceFacts('<main><h1>Current coffee</h1><img alt="Current coffee" src="bag.jpg"><img alt="Old lot: Bourbon, 1,500 meters" src="old-bag.jpg"><aside><img alt="Different coffee: Robusta" src="other.jpg"></aside></main>',{source_url:source,name:'Current coffee'});
 const captions=facts.filter(f=>f.label==='Product image description');
 assert.equal(captions.length,1);assert.equal(captions[0].value,'Old lot: Bourbon, 1,500 meters');
 assert.equal(captions[0].section,'Published image caption');assert.equal(captions[0].field,undefined);
 assert.doesNotMatch(JSON.stringify(facts),/Robusta/);
});
test('structured image and media records preserve their raw caption and reference',()=>{
 const images=[{src:'https://cdn.example.com/bag.jpg',alt:'Label: Bourbon Ají',width:1200,height:1200}];
 const facts=collectStructuredCoffeeSourceFacts({images},{source_url:source});
 assert.deepEqual(JSON.parse(facts.find(f=>f.source_path==='/images').value),images);
});
test('unknown explicit specs, units, and product prose survive for review',()=>{
 const facts=collectCoffeeSourceFacts('<h1>Current coffee</h1><dl><dt>Water activity</dt><dd>0.51</dd></dl><table><tr><th>Cupping score</th><td>89.5</td></tr></table><p>Certification: Organic</p><p>These cherries dried for eighteen days on raised beds.</p>',{source_url:source});
 assert.ok(facts.some(f=>f.label==='Water activity'&&f.value==='0.51'));
 assert.ok(facts.some(f=>f.label==='Cupping score'&&f.value==='89.5'));
 assert.ok(facts.some(f=>f.label==='Certification'&&f.value==='Organic'));
 assert.ok(facts.some(f=>f.value.includes('eighteen days')));
 assert.ok(facts.every(f=>f.source_url===source));
});
test('structured coffee evidence preserves Woo terms, labeled tags and quantitative units',()=>{
 const facts=collectStructuredCoffeeSourceFacts({attributes:[{name:'Drying duration',terms:[{name:'18 days'}]}],tags:['Decaffeination: Ethyl acetate'],weight:{value:250,unitCode:'GRM'},additionalProperty:[{name:'Water activity',value:0.51}],offers:{price:'24.00',priceCurrency:'USD',availability:'https://schema.org/InStock'}},{source_url:source});
 assert.ok(facts.some(f=>f.label==='Drying duration'&&f.value==='18 days'));
 assert.ok(facts.some(f=>f.label==='Decaffeination'&&f.value==='Ethyl acetate'));
 assert.ok(facts.some(f=>f.label==='Weight'&&f.value==='250 g'));
 assert.ok(facts.some(f=>f.label==='Price'&&f.value==='24.00 USD'));
 assert.ok(facts.some(f=>f.label==='Availability'&&f.value==='InStock'));
});
test('long descriptions are split into complete review chunks, not silently cut at one value',()=>{
 const story=Array.from({length:400},(_,i)=>'sourceword'+i).join(' ');
 const facts=collectStructuredCoffeeSourceFacts({description:story});
 assert.equal(facts.map(f=>f.value).join(' '),story);
 assert.ok(facts.length>1);
 assert.equal(facts.truncated,false);
});
test('bounded evidence reports overflow instead of claiming completeness',()=>{
 const facts=mergeCoffeeSourceFacts(Array.from({length:250},(_,i)=>({label:'Field '+i,value:'x'.repeat(1590),source_type:'html'})));
 assert.equal(facts.truncated,true);
 assert.ok(facts.length<=MAX_SOURCE_FACTS);
 assert.ok(facts.reduce((sum,f)=>sum+f.label.length+f.value.length,0)<=MAX_SOURCE_FACT_CHARACTERS);
 assert.equal(mergeCoffeeSourceFacts(facts).truncated,true);
});
test('nested and scalar source limits are explicitly reported',()=>{
 assert.equal(collectStructuredCoffeeSourceFacts({description:'x'.repeat(MAX_SOURCE_FACT_CHARACTERS+6000)}).truncated,true);
 assert.equal(collectStructuredCoffeeSourceFacts({attributes:[{name:'Varieties',value:Array.from({length:129},(_,i)=>'V'+i)}]}).truncated,true);
 assert.equal(collectStructuredCoffeeSourceFacts({options:Array.from({length:21},(_,i)=>({name:'Option '+i,values:['A']}))}).truncated,true);
 assert.equal(mergeCoffeeSourceFacts([{label:'Fact',value:'Value',section:'x'.repeat(101)}]).truncated,true);
});
test('equivalent repeated evidence deduplicates and preserves a conflict flag',()=>{
 const facts=mergeCoffeeSourceFacts([{label:'Variety',value:'Bourbon Ají',source_type:'html'}],[{label:'VARIETY',value:'Bourbon Ají',source_type:'product_json',conflicting:true},{label:'Variety',value:'Caturra',source_type:'product_json',conflicting:true}]);
 assert.equal(facts.length,2);
 assert.ok(facts.every(f=>f.conflicting));
});
test('deduplicated prose preserves bounded explicit sources through merging and export',()=>{
 const first={label:'Product description',value:'The selected coffee dried on raised beds for eighteen days.',source_type:'html',source_url:source};
 const second={...first,source_type:'product_json',source_url:source+'.js'};
 const facts=mergeCoffeeSourceFacts([first],[second]);
 assert.equal(facts.length,1);assert.deepEqual(facts[0].supporting_sources,[{source_url:source+'.js',source_type:'product_json'}]);
 const again=mergeCoffeeSourceFacts(facts,[{...second,source_url:source+'.json'}]);
 assert.equal(again[0].supporting_sources.length,2);
 const exported=coffeeSourceReviewSnapshot({ok:true,source_url:source,source_facts:again}).published_source_information;
 assert.deepEqual(exported[0].supporting_sources,again[0].supporting_sources);
 const bounded=mergeCoffeeSourceFacts(Array.from({length:6},(_,i)=>({...first,source_url:source+'?source='+i})));
 assert.equal(bounded[0].supporting_sources.length,3);assert.equal(bounded.truncated,true);
});

test('terminal caption colons do not displace different data or erase source attribution',()=>{
 const base={label:'Origin',value:'Tolima, Colombia',field:'origin',section:'Details',source_type:'html',source_url:source};
 const endpoint={...base,label:'Origin :',source_url:source+'.json',source_type:'product_json'};
 const facts=mergeCoffeeSourceFacts([base],[endpoint,{...endpoint,label:'Origin：'}],
  [{...base,section:'Other coffee'},{...base,value:'Cauca, Colombia'},{...base,label:'Country of origin'},
   {...endpoint,field:'producer'},{...base,label:'Origin: current'},{...endpoint,label:'Origin (continued 2)'},
   {...endpoint,source_locator:'form[data-product_variations][data-product_id="42"]'}]);
 assert.equal(facts.length,8);
 assert.equal(facts[0].label,'Origin');assert.equal(facts[0].value,'Tolima, Colombia');
 assert.deepEqual(facts[0].supporting_sources,[{source_url:source+'.json',source_type:'product_json'}]);
 assert.ok(facts.some(f=>f.section==='Other coffee'));
 assert.ok(facts.some(f=>f.value==='Cauca, Colombia'));
 assert.ok(facts.some(f=>f.label==='Country of origin'));
 const structured={label:'Record',value:'{"price":24}',format:'json',source_path:'/offers',part:0,source_url:source,source_type:'product_json'};
 assert.equal(mergeCoffeeSourceFacts([structured,{...structured,label:'Record:'}]).length,2);
});
test('supporting sources cannot export credentials or private extra properties',()=>{
 const fact={label:'Fact',value:'Published information',source_url:'https://user:secret@roaster.example/x',supporting_sources:[
  {source_url:'https://user:secret@roaster.example/y',source_type:'html'},
  {source_url:source+'.js',source_type:'product_json',private_member_id:'secret'}]};
 const merged=mergeCoffeeSourceFacts([fact]);assert.equal(merged[0].source_url,source+'.js');
 assert.doesNotMatch(JSON.stringify(merged),/secret|private_member/);
 const output=coffeeSourceReviewSnapshot({ok:true,source_url:source,source_facts:[fact]}).published_source_information[0];
 assert.equal(output.source_url,undefined);assert.deepEqual(output.supporting_sources,[{source_url:source+'.js',source_type:'product_json'}]);
});
test('review facts keep distinct filter and espresso guide contexts',()=>{
 const facts=collectCoffeeSourceFacts('<button data-guide="filter">Filter - English</button><button data-guide="espresso">Espresso - English</button><div class="guide-body" data-guide="filter"><p>Water: 400g @ 205°F</p></div><div class="guide-body" data-guide="espresso"><p>Yield: 47g</p></div>');
 assert.ok(facts.some(f=>f.label==='Water'&&f.section==='Filter - English'));
 assert.ok(facts.some(f=>f.label==='Yield'&&f.section==='Espresso - English'));
});
test('a singular additionalProperty and direct fields retain their actual labels',()=>{
 const facts=collectStructuredCoffeeSourceFacts({additionalProperty:{name:'Variety',value:'Chiroso'},process:'Washed',origin:'Nariño, Colombia'});
 assert.ok(facts.some(f=>f.label==='Variety'&&f.value==='Chiroso'));
 assert.ok(facts.some(f=>f.label==='process'&&f.value==='Washed'));
 assert.ok(facts.some(f=>f.label==='origin'&&f.value==='Nariño, Colombia'));
 assert.equal(facts.some(f=>f.label==='name'||f.label==='value'),false);
});
test('raw scripts, controls, and navigation do not become review facts',()=>{
 const facts=collectCoffeeSourceFacts('<nav><p>Origin: Kenya</p></nav><script>Variety:Wrong</script><select><option>Country:Canada</option></select><p>Variety: Bourbon Aj&iacute;</p>');
 assert.ok(facts.some(f=>f.value==='Bourbon Ají'));
 assert.equal(facts.some(f=>/Kenya|Wrong|Canada/.test(f.value)),false);
});
test('unfamiliar bare-node measurements survive in scoped review text',()=>{
 const facts=collectCoffeeSourceFacts('<h1>Current coffee</h1><div><span>COFFEE IN</span><span>18g</span></div><div><span>Transportation</span><span>$0.10/lb</span></div><div>Water activity <span>0.51</span></div><footer>Unrelated coffee 2100m</footer>',{name:'Current coffee'});
 const full=facts.find(f=>f.label==='Published product text');
 assert.match(full.value,/COFFEE IN 18g/);
 assert.match(full.value,/Transportation \$0\.10\/lb/);
 assert.match(full.value,/Water activity 0\.51/);
 assert.doesNotMatch(full.value,/Unrelated/);
});
test('long quoted attributes and embedded product JSON never leak into source prose',()=>{
 const facts=collectCoffeeSourceFacts('<h1>Current coffee</h1><div data-product=\'{"hidden":"'+('attribute-only '.repeat(700))+'","comparison":"a > b"}\'><span>Moisture:</span><span>10.5%</span></div>',{name:'Current coffee'});
 const full=facts.find(f=>f.label==='Published product text');
 assert.match(full.value,/Moisture: 10\.5%/);
 assert.doesNotMatch(full.value,/attribute-only|data-product|hidden|<div/);
});
test('public variant JSON preserves attribution, units, false and null through chunking',()=>{
 const data={options:[{name:'Size',values:['250g','2lb']}],variants:[{title:'250g',price:2500,available:false,sku:null,weight:454,quantity_rule:{min:1,max:null,increment:1},description:'Word '.repeat(400)}]};
 const facts=collectStructuredCoffeeSourceFacts(data,{source_url:source});
 const chunks=facts.filter(f=>f.source_path==='/variants/0').sort((a,b)=>a.part-b.part);
 assert.ok(chunks.length>1);
 assert.deepEqual(JSON.parse(chunks.map(f=>f.value).join('')),data.variants[0]);
 assert.deepEqual(JSON.parse(facts.find(f=>f.source_path==='/options').value),data.options);
 assert.match(facts.find(f=>f.label==='Purchase option: 250g').value,/shipping weight 454 g \(Shopify\)/);
 assert.equal(facts.truncated,false);
});
test('identical JSON fragments retain their source URL and part identity',()=>{
 const endpoint=source+'.js';
 const base={label:'Purchase variant',value:'x'.repeat(1600),format:'json',source_path:'/variants/0',source_type:'product_json'};
 const facts=mergeCoffeeSourceFacts([{...base,source_url:source,part:0},{...base,source_url:source,part:1}],
  [{...base,source_url:endpoint,part:0},{...base,source_url:endpoint,part:1}]);
 assert.equal(facts.length,4);
 for(const url of [source,endpoint])assert.deepEqual(facts.filter(f=>f.source_url===url).map(f=>f.part),[0,1]);
});
test('long secondary explanations cannot displace the primary story and purchase record',()=>{
 const explanations=Array.from({length:MAX_SOURCE_FACTS+80},(_,i)=>'<p>Explanation '+i+': '+('Educational reference text '+i+' ').repeat(12)+'</p>').join('');
 const html='<main><h1>Current coffee</h1><div class="coffee-modal">'+explanations+'</div><section><h2>The story</h2><p>This selected lot dried for nineteen days on raised beds.</p><div><span>Green cost</span><span>$8.75/lb</span></div></section></main>';
 const facts=collectCoffeeSourceFacts(html,{name:'Current coffee',source_url:source});
 const primary=facts.find(f=>f.label==='Published primary product text');
 assert.match(primary.value,/nineteen days/);assert.match(primary.value,/Green cost \$8\.75\/lb/);
 assert.doesNotMatch(primary.value,/Educational reference/);
 const combined=mergeCoffeeSourceFacts(facts,collectStructuredCoffeeSourceFacts({variants:[{title:'250g',price:2400,available:true}]},{source_url:source+'.js'}));
 assert.ok(combined.some(f=>f.source_path==='/variants/0'&&JSON.parse(f.value).price===2400));
 assert.ok(combined.some(f=>f.value.includes('nineteen days')));
 assert.equal(combined.truncated,true);
 assert.ok(combined.length<=MAX_SOURCE_FACTS);
});
test('hundreds of short early dialog labels cannot crowd out later primary product facts',()=>{
 const education=Array.from({length:300},(_,i)=>'<p>Explanation '+i+': generic tutorial '+i+'</p>').join('');
 const facts=collectCoffeeSourceFacts('<main><h1>Current coffee</h1><div class="coffee-modal">'+education+'</div><section><h2>The story</h2><p>This selected lot dried for nineteen days on raised beds.</p><p>Variety: Bourbon Ají</p></section></main>',{source_url:source,name:'Current coffee'});
 assert.ok(facts.some(f=>f.label==='Published primary product text'&&f.value.includes('nineteen days')));
 assert.ok(facts.some(f=>f.label==='Variety'&&f.value==='Bourbon Ají'));
 assert.equal(facts.truncated,true);assert.ok(facts.length<=MAX_SOURCE_FACTS);
});
test('malformed optional variants do not discard a valid product and remain exact raw evidence',()=>{
 const variants=[null,7,'invalid',[],{title:'250g',price:2500}];
 const facts=collectStructuredCoffeeSourceFacts({description:'Variety: Bourbon Ají',variants},{source_url:source+'.js'});
 assert.ok(facts.some(f=>f.value==='Variety: Bourbon Ají'));
 assert.ok(facts.some(f=>f.label==='Purchase option: 250g'));
 for(let i=0;i<variants.length;i++)assert.deepEqual(JSON.parse(facts.find(f=>f.source_path==='/variants/'+i).value),variants[i]);
});
test('each Unicode JSON chunk is well formed and round trips through the actual source export',()=>{
 const variant={description:'x'.repeat(1583)+'🍓'+'y'.repeat(1598)+'🍋'};
 const facts=collectStructuredCoffeeSourceFacts({variants:[variant]},{source_url:source+'.js'});
 const snapshot=coffeeSourceReviewSnapshot({ok:true,source_url:source,source_facts:facts});
 const chunks=snapshot.published_source_information.filter(f=>f.source_path==='/variants/0').sort((a,b)=>a.part-b.part);
 assert.ok(chunks.length>=2);assert.ok(chunks.every(f=>f.value.isWellFormed()&&f.value.length<=1600));
 assert.deepEqual(JSON.parse(chunks.map(f=>f.value).join('')),variant);
 assert.equal(facts.truncated,false);
 const plain=collectStructuredCoffeeSourceFacts({description:'x'.repeat(1599)+'🍓tail'});
 assert.ok(plain.every(f=>f.value.isWellFormed()));assert.equal(plain.map(f=>f.value).join(''),'x'.repeat(1599)+'🍓tail');
 const bounded=mergeCoffeeSourceFacts([{label:'x'.repeat(99)+'🍓',value:'y'.repeat(1599)+'🍋'}]);
 assert.equal(bounded.truncated,true);assert.ok(bounded.every(f=>f.label.isWellFormed()&&f.value.isWellFormed()));
});
test('long image captions preserve the tail and keep continuation chunks in order',()=>{
 const caption='Public caption '.repeat(127)+'FINISH: Bourbon Ají';
 const facts=collectCoffeeSourceFacts('<main><h1>Current coffee</h1><img alt="'+caption+'"></main>',{source_url:source,name:'Current coffee'});
 const captions=facts.filter(f=>f.label.startsWith('Product image description'));
 assert.equal(captions.map(f=>f.value).join(' '),caption);
 assert.equal(captions[0].label,'Product image description');assert.match(captions[1].label,/continued 2/);
 assert.equal(facts.truncated,false);
});
test('raw JSON evidence stays out of the form and is preserved in the explicit download',()=>{
 const facts=collectStructuredCoffeeSourceFacts({options:[{name:'<img src=x onerror=alert(1)>',values:['</dd><script>bad()</script>']}]});
 const result={ok:true,source_url:source,fields:{name:'Test'},source_facts:facts};
 const markup=coffeeUrlPreviewMarkup(result);
 assert.doesNotMatch(markup,/<script>|<img src=x/);
 assert.match(markup,/original structured purchase options/);
 const exported=coffeeSourceReviewSnapshot(result).published_source_information.find(f=>f.source_path==='/options');
 assert.equal(JSON.parse(exported.value)[0].values[0],'</dd><script>bad()</script>');
});
test('source-review export contains only public preview evidence',()=>{
 const snapshot=coffeeSourceReviewSnapshot({ok:true,source_url:source,fields:{name:'Test',variety:'Bourbon Ají',token:'private'},
  source_facts:[{label:'Water activity',value:'0.51',token:'private',source_path:'/attributes/0'}],
  roaster_recipe:{dose_g:18,yield_g:36},match:{private_member_id:'private'},auth_token:'private'},
  {checkedAt:'2026-10-24T00:00:00Z'});
 assert.equal(snapshot.type,'coffee_source_review');
 assert.equal(snapshot.field_suggestions.variety,'Bourbon Ají');
 assert.equal(snapshot.published_source_information[0].source_path,'/attributes/0');
 assert.doesNotMatch(JSON.stringify(snapshot),/private|auth_token|member_id/);
 assert.equal(coffeeSourceReviewSnapshot({ok:true,source_url:'https://user:password@roaster.example.com/x'}),null);
});
test('supplementary source evidence is escaped, reviewable, and never part of autofill',()=>{
 const result={ok:true,fields:{name:'Current coffee'},source_facts:[{label:'<img src=x>',value:'<script>alert(1)</script>',conflicting:true}],source_facts_truncated:true};
 const markup=coffeeUrlPreviewMarkup(result);
 assert.match(markup,/Published source information/);
 assert.match(markup,/&lt;script&gt;/);
 assert.doesNotMatch(markup,/<script>/);
 assert.match(markup,/conflicting sources/);
 assert.match(markup,/more information than the preview can display/);
 const touched=[];
 applyCoffeeUrlFields({elements:{namedItem:key=>{touched.push(key);return null;}}},result);
 assert.equal(touched.includes('source_facts'),false);
 assert.equal(touched.includes('source_facts_truncated'),false);
});
