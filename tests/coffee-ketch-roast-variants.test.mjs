import test from 'node:test';
import assert from 'node:assert/strict';
import {extractSelectedCoffeeRoastVariants,extractSelectedCoffeeRoastVariantsFromHtml} from '../src/server/coffee-roast-variants.mjs';
import {createPreviewHandler} from '../netlify/functions/coffee-url-preview.mjs';
import {shopifyProductRequest,extractShopifyAjaxData,mergePublicProductPreview} from '../src/server/coffee-shopify-ajax.mjs';
import {coffeeRoastVariantPreview,coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot,applyCoffeeRoastVariant,applyCoffeeUrlFields} from '../site/cloud/coffee-url-autofill.js';

// Literal selected Ketch product-page clauses, read 2026-10-27. This is
// supplementary acceptance, never a rewrite of the immutable original603.
const url='https://www.ketchcoffee.com/products/tier-2-legacy-farms-honduras-natural-process';
const options=[
 {name:'Roast Level',values:['Light','Medium-dark']},
 {name:'Amount',values:['8 oz Bag','16 oz Bag','5lb Bag']},
 {name:'Whole Bean or Ground',values:['Whole Bean','Ground Medium']}
];
const description=`<h3>FLAVOR PROFILE (What we taste)</h3>
<p>The dominant flavor note of this coffee that we taste is blackberry but think dark berries.</p>
<p>As a light roast, this coffee has floral and blackberry notes, moderate sweetness, lower to moderate acidity, and a heavier body. Using a scale of 0-10, we place the sweetness at a 6, the acidity at a 3, the body at a 7, and no bitterness.</p>
<p>As a medium-dark roast, this coffee has blackberry and caramelized sugar notes, moderate sweetness, lower acidity, and a heavier body. Using a scale of 0-10, we place the sweetness at a 5-7, the acidity at a 2, the body at a 7, and no bitterness.</p>
<h3>RECOMMENDED BREWING METHODS</h3>
<p>As a light roast, we have only brewed it as a filter and immersion but will in time experiment with it as espresso. As a lighter roasted coffee, we recommend starting with a water temperature between 201-208F depending on brew method. If you decide to brew it as espresso, we would recommend using a higher water temperature (e.g., 203-205F) if your machine allows and starting with a 1:3 ratio (e.g., 18 grams of coffee to 54 grams of coffee in the cup).</p>
<p>As a medium-dark roast, this coffee is versatile and is great brewed as filter/drip, immersion, cold brew, and espresso. We recommend starting with a water temperature of 198-201F depending on the brew method. For espresso, we would recommend starting with a water temperature of 200-202F and a 1:2 ratio.</p>
<h3>ABOUT THIS COFFEE</h3>
<p>Producers: Legacy Farms Coffee and the Williams' Family</p><p>Country: Honduras</p><p>Region: Cerro Bueno</p><p>Varietals: Lempira</p>
<p>Process: Natural</p><p>Altitude/elevation: 1450 meters to 1520 MASL (4772-5003 feet)</p>
<p>Harvest Period: December 2024 to March 2025</p>`;
const data={title:'Tier 2: Legacy Farms Honduras Natural Process',
 handle:'tier-2-legacy-farms-honduras-natural-process',
 vendor:'Ketch Coffee Roasters',options,description};
const request=shopifyProductRequest(url);
test('Ketch: parse exactly two purchased roast alternatives, no mixed flavors or ratios',()=>{
 const [light,dark]=extractSelectedCoffeeRoastVariants({description,options});
 assert.deepEqual([light.id,dark.id],['light','medium-dark']);
 assert.deepEqual([light.fields.roast_level,dark.fields.roast_level],['Light','Medium-Dark']);
 assert.equal(light.fields.tasting_notes,'Floral, blackberry');
 assert.equal(dark.fields.tasting_notes,'Blackberry, caramelized sugar');
 assert.deepEqual(light.sensory,{sweetness:'6',acidity:'3',body:'7',bitterness:'0'});
 assert.deepEqual(dark.sensory,{sweetness:'5-7',acidity:'2',body:'7',bitterness:'0'});
 assert.equal(light.roaster_recipe.ratio,3);
 assert.equal(light.roaster_recipe.dose_g,18);
 assert.equal(light.roaster_recipe.yield_g,54);
 assert.equal(light.roaster_recipe.temperature_reference,'203–205°F');
 assert.equal(dark.roaster_recipe.ratio,2);
 assert.equal(dark.roaster_recipe.dose_g,undefined);
 assert.equal(dark.roaster_recipe.temperature_reference,'200–202°F');
});
test('Ketch selected-product endpoint exposes shared facts without picking a roast or SEO-only variety',()=>{
 const parsed=extractShopifyAjaxData(data,request);
 assert.equal(parsed.ok,true);
 assert.equal(parsed.roast_variants.length,2);
 assert.equal(parsed.fields.roast_level,undefined);
 assert.equal(parsed.roaster_recipe,undefined); // An unchosen roast has no global recipe.
 assert.equal(parsed.fields.tasting_notes,undefined);
 assert.ok(!parsed.conflicts?.includes('roast_level'));
 assert.ok(!parsed.conflicts?.includes('tasting_notes'));
 assert.equal(parsed.fields.variety,'Lempira');
 assert.ok(!JSON.stringify(parsed).includes('Parainema'));
 const merged=mergePublicProductPreview({ok:true,source_url:url,fields:{name:parsed.fields.name}},parsed);
 assert.equal(merged.roast_variants.length,2);
 assert.equal(merged.fields.roast_level,undefined);
 assert.equal(merged.roaster_recipe,undefined);
 const chosen=coffeeRoastVariantPreview(merged,'medium-dark');
 assert.equal(chosen.fields.roast_level,'Medium-Dark');
 assert.equal(chosen.fields.tasting_notes,'Blackberry, caramelized sugar');
 assert.equal(chosen.fields.variety,'Lempira');
});
test('No purchase roast options means no fabricated alternatives from narrative, guides or SEO',()=>{
 assert.deepEqual(extractSelectedCoffeeRoastVariants({description}),[]);
 assert.deepEqual(extractSelectedCoffeeRoastVariants({description,options:[{name:'Roast Level',values:['Light']}]}),[]);
 assert.deepEqual(extractSelectedCoffeeRoastVariants({description:'As a light roast this coffee has apple notes. As a dark roast this coffee has chocolate notes.',options:[{name:'Roast Level',values:['Light','Dark']}]}),[]);
});
test('Add Coffee shows no photos, prompts for selected roast, changes review without changing shared coffee',()=>{
 const parsed=extractShopifyAjaxData(data,request);
 const before=coffeeUrlPreviewMarkup(parsed);
 assert.match(before,/Which roast did you buy\?/);
 assert.match(before,/choose-coffee-roast-variant/);
 assert.match(before,/No roast was selected automatically/);
 assert.doesNotMatch(before,/<img\b/i);
 const light=coffeeRoastVariantPreview(parsed,'light');
 const dark=coffeeRoastVariantPreview(parsed,'medium-dark');
 assert.match(coffeeUrlPreviewMarkup(light),/203–205°F/);
 assert.match(coffeeUrlPreviewMarkup(dark),/200–202°F/);
 assert.match(coffeeUrlPreviewMarkup(dark),/Selected roast: Medium-dark/);
 assert.doesNotMatch(coffeeUrlPreviewMarkup(dark),/<img\b/i);
 const saved=coffeeSourceReviewSnapshot({...dark,source_url:url});
 assert.equal(saved.selected_roast_variant,'medium-dark');
 assert.deepEqual(saved.roast_variants.map(v=>v.id),['light','medium-dark']);
});
test('switching roast preserves manually corrected flavor or roast instead of overwriting',()=>{
 const current=coffeeRoastVariantPreview({ok:true,fields:{name:'Ketch'},roast_variants:extractSelectedCoffeeRoastVariants({description,options})},'light');
 const next=coffeeRoastVariantPreview({ok:true,fields:{name:'Ketch'},roast_variants:extractSelectedCoffeeRoastVariants({description,options})},'medium-dark');
 const controls={
  roast_level:{value:'Light',tagName:'SELECT',options:[{value:'Light'},{value:'Medium-Dark'}],dispatchEvent(){}},
  tasting_notes:{value:'My personally confirmed notes',tagName:'INPUT',dispatchEvent(){}}
 };
 const form={elements:{namedItem:key=>controls[key]}};
 assert.equal(applyCoffeeRoastVariant(form,current,next),1);
 assert.equal(controls.roast_level.value,'Medium-Dark');
 assert.equal(controls.tasting_notes.value,'My personally confirmed notes');
});

test('SEO-only Parainema is not offered against Ketch selected-product Lempira',()=>{
 const current=extractShopifyAjaxData(data,request);
 const stale={ok:true,source_url:url,fields:{name:current.fields.name,variety:'Parainema'},
  source_facts:[{field:'variety',label:'Historical SEO',value:'Parainema',source_type:'page_meta',source_url:url}]};
 const merged={...mergePublicProductPreview(stale,current),source_url:url};
 assert.equal(merged.fields.variety,'Lempira');
 assert.ok(!merged.conflicts?.includes('variety'));
 const html=coffeeUrlPreviewMarkup(merged);
 assert.match(html,/Lempira/);
 assert.doesNotMatch(html,/Parainema/);
 const audit=coffeeSourceReviewSnapshot(merged);
 assert.ok(audit.published_source_information.some(x=>x.value==='Parainema'));
});

const selectedHtml=(control='<fieldset class="product-form__input"><legend>Roast Level</legend><input type="radio" name="Roast Level" value="Light"><input type="radio" name="Roast Level" value="Medium-dark"></fieldset>',
 prose=description)=>'<html><head><meta property="og:type" content="product"></head><body><main id="MainContent"><h1>Tier 2: Legacy Farms Honduras Natural Process</h1>'+control+'<section class="product__description">'+prose+'</section></main></body></html>';
test('Live Shopify HTML fieldset fallback recovers both roast profiles without JSON API',()=>{
 const variants=extractSelectedCoffeeRoastVariantsFromHtml(selectedHtml());
 assert.deepEqual(variants.map(v=>v.fields.roast_level),['Light','Medium-Dark']);
 assert.deepEqual(variants.map(v=>v.fields.tasting_notes),['Floral, blackberry','Blackberry, caramelized sugar']);
 assert.deepEqual(variants.map(v=>v.roaster_recipe.ratio),[3,2]);
 assert.deepEqual(variants.map(v=>v.roaster_recipe.temperature_reference),['203–205°F','200–202°F']);
});
test('HTML fallback also supports named Shopify roast select and rejects mere marketing copy',()=>{
 const selection='<select name="options[Roast Level]"><option value="Light">Light</option><option value="Medium-dark">Medium-dark</option></select>';
 assert.equal(extractSelectedCoffeeRoastVariantsFromHtml(selectedHtml(selection)).length,2);
 for(const control of ['', '<fieldset><legend>Grind Size</legend><input type="radio" value="Light"><input type="radio" value="Medium-dark"></fieldset>',
  '<fieldset hidden><legend>Roast Level</legend><input type="radio" value="Light"><input type="radio" value="Medium-dark"></fieldset>',
  '<fieldset><legend>Roast Level</legend><input type="radio" value="Light"></fieldset>']){
  assert.deepEqual(extractSelectedCoffeeRoastVariantsFromHtml(selectedHtml(control)),[]);
 }
 assert.deepEqual(extractSelectedCoffeeRoastVariantsFromHtml(selectedHtml(selection,'<p>Light roast and dark roast are both possible ways to brew coffee.</p>')),[]);
 assert.deepEqual(extractSelectedCoffeeRoastVariantsFromHtml('<html><p>'+description+'</p>'+selection+'</html>'),[],
   'a non-product/SEO document cannot invent purchase variants');
});
test('Selecting purchased roast replaces generic autofill but never manually edited tasting notes',()=>{
 const controls={
  roast_level:{value:'',tagName:'SELECT',options:[{value:''},{value:'Light'},{value:'Medium-Dark'}],dataset:{},dispatchEvent(){}},
  tasting_notes:{value:'',tagName:'INPUT',dataset:{},dispatchEvent(){}}
 };
 const form={elements:{namedItem:key=>controls[key]}};
 const generic={ok:true,fields:{tasting_notes:'Blackberry'}};
 assert.equal(applyCoffeeUrlFields(form,generic).filled,1);
 assert.equal(controls.tasting_notes.value,'Blackberry');
 const base={ok:true,fields:{},roast_variants:extractSelectedCoffeeRoastVariantsFromHtml(selectedHtml())};
 const light=coffeeRoastVariantPreview(base,'light'),dark=coffeeRoastVariantPreview(base,'medium-dark');
 assert.equal(applyCoffeeRoastVariant(form,base,light),2);
 assert.equal(controls.tasting_notes.value,'Floral, blackberry');
 assert.equal(applyCoffeeRoastVariant(form,light,dark),2);
 assert.equal(controls.tasting_notes.value,'Blackberry, caramelized sugar');
 controls.tasting_notes.value='My own bag notes';
 assert.equal(applyCoffeeRoastVariant(form,dark,light),1);
 assert.equal(controls.tasting_notes.value,'My own bag notes');
});
test('Full authenticated preview handler offers roast selection when Shopify JSON is unavailable',async()=>{
 const calls=[];
 const apiFetch=async (uri,options)=>{
  const end=uri.split('/').at(-1),body=options.body?JSON.parse(options.body):{};
  calls.push({end,body});
  const response=end==='user'?{id:'fixture-user'}:
   end==='dic_session_status'?{admitted:true,emailVerified:true}:
   end==='dic_preview_preflight'?{allowed:true,ticket:'00000000-0000-4000-8000-000000000123'}:
   end==='dic_preview_complete'?{charged:true}:null;
  return {ok:true,json:async()=>response};
 };
 const handler=createPreviewHandler({
  env:key=>({SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture_nonfunctional'}[key]),
  apiFetch,
  readHtml:async()=>({ok:true,source_url:url,html:selectedHtml()}),
  readJson:async()=>({ok:false,reason:'source_unavailable'}),
  extract:(_html,{source_url})=>({ok:true,source_url,source:'unverified_public_page',
   fields:{name:'Tier 2: Legacy Farms Honduras Natural Process',roaster:'Ketch',origin:'Cerro Bueno, Honduras',
    tasting_notes:'Blackberry',roast_level:'Medium'},source_facts:[]})
 });
 const response=await handler(new Request('https://app.dialincollective.com/api/coffee-preview',{
  method:'POST',headers:{Origin:'https://app.dialincollective.com','Content-Type':'application/json',
   Authorization:'Bearer fixture.jwt'},body:JSON.stringify({source_url:url})
 }));
 const result=await response.json();
 assert.equal(response.status,200,JSON.stringify(result));
 assert.equal(result.roast_variants?.length,2);
 assert.equal(result.fields.roast_level,undefined);
 assert.equal(result.fields.tasting_notes,undefined);
 assert.equal(result.roaster_recipe,undefined);
 assert.match(coffeeUrlPreviewMarkup(result),/Which roast did you buy\?/);
 const picked=coffeeRoastVariantPreview(result,'medium-dark');
 assert.equal(picked.fields.tasting_notes,'Blackberry, caramelized sugar');
 assert.equal(coffeeSourceReviewSnapshot(picked).selected_roast_variant,'medium-dark');
 assert.equal(calls.filter(x=>x.end==='dic_preview_complete').length,1);
});

test('owner Ketch URL with tracking and Shopify variant preserves per-roast source options',()=>{
 const supplied='https://www.ketchcoffee.com/products/tier-2-legacy-farms-honduras-natural-process?utm_source=chatgpt.com&variant=47417784074460';
 const selected=shopifyProductRequest(supplied);
 assert.equal(selected?.handle,request.handle);
 assert.equal(selected?.url,request.url);
 const result=extractShopifyAjaxData(data,selected);
 assert.deepEqual(result.roast_variants.map(v=>v.fields.tasting_notes),['Floral, blackberry','Blackberry, caramelized sugar']);
 assert.equal(result.fields.tasting_notes,undefined);
});
