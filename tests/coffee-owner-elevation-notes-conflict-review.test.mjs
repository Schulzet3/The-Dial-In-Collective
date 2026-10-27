import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {parseCoffeeElevation} from '../src/server/coffee-elevation-evidence.mjs';
import {shopifyProductRequest,extractShopifyAjaxData,mergePublicProductPreview} from '../src/server/coffee-shopify-ajax.mjs';
import {coffeeUrlPreviewMarkup,coffeeConflictReviewOptions,applyCoffeeUrlFields,elevationWithDefaultMeters,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const url='https://roaster.example.com/products/woods-blend';
const selected=body=>extractPublicCoffeeFacts('<html><head><meta property="og:type" content="product"><meta property="og:url" content="'+url+'"></head><body><main><h1>Woods Blend</h1>'+body+'</main></body></html>',{source_url:url});
const shopify=tags=>extractShopifyAjaxData({title:'Uganda AA Lifesong',handle:'uganda-aa-lifesong',tags,description:'<p>Roast Level: Medium</p>'},shopifyProductRequest('https://shop.example.com/products/uganda-aa-lifesong'));
test('roaster explicitly itemized Notes wins narrative adjectives, without creating a false conflict',()=>{
 const coffee=selected('<p>Our popular medium roast carries hints of cinnamon, semi-sweet cocoa and dry finish.</p><p>Notes: Almonds | Mild Fruit | Cocoa Powder</p>');
 assert.equal(coffee.fields.tasting_notes,'Almonds, Mild Fruit, Cocoa Powder');
 assert.ok(!coffee.conflicts?.includes('tasting_notes'));
 assert.match(JSON.stringify(coffee.source_facts),/cinnamon/);
});
test('two genuinely contradictory labeled notes lists remain withheld and show both exact readings',()=>{
 const coffee=selected('<p>Tasting Notes: Plum, Lime</p><p>Cupping Notes: Orange, Chocolate</p>');
 assert.equal(coffee.fields.tasting_notes,undefined);
 assert.ok(coffee.conflicts?.includes('tasting_notes'),JSON.stringify(coffee));
 const group=coffeeConflictReviewOptions(coffee).find(g=>g.field==='tasting_notes');
 assert.deepEqual(new Set(group.options.map(x=>x.value)),new Set(['Plum, Lime','Orange, Chocolate']));
 assert.match(coffeeUrlPreviewMarkup(coffee),/Review conflicting details/);
});
test('unitless selected coffee elevation is numerically meters, and app labels assumed unit rather than inventing ft',()=>{
 const p=parseCoffeeElevation('Elevation: 1.300-1.600');
 assert.equal(p.unit,'m');assert.equal(p.explicitUnit,false);assert.equal(p.low,1300);assert.equal(p.high,1600);
 assert.equal(elevationWithDefaultMeters('1.300-1.600'),'1.300-1.600 m');
 assert.equal(elevationWithDefaultMeters('950'),'950 m');
 assert.equal(elevationWithDefaultMeters('1,500 masl'),'1,500 masl');
 assert.equal(elevationWithDefaultMeters('4,900 feet'),'4,900 feet');
 const formFields={elevation_m:{value:'',tagName:'INPUT',dispatchEvent(){}}};
 const form={elements:{namedItem(key){return formFields[key]||null;}}};
 assert.deepEqual(applyCoffeeUrlFields(form,{ok:true,fields:{elevation_m:'1.300-1.600'}}),{filled:1,skipped:0});
 assert.equal(formFields.elevation_m.value,'1.300-1.600 m');
 const snapshot=coffeeSourceReviewSnapshot({ok:true,source_url:url,fields:{elevation_m:'1.300-1.600'},source_facts:[]});
 assert.equal(snapshot.field_suggestions.elevation_m,'1.300-1.600 m');
});
test('missing unit never merges genuinely different numeric elevations',()=>{
 const a=selected('<p>Elevation: 1.800-2.000</p>');
 const b=selected('<p>Elevation: 1800-2200 meters</p>');
 const merged=mergePublicProductPreview(a,b);
 assert.equal(merged.fields.elevation_m,undefined);
 assert.ok(merged.conflicts?.includes('elevation_m'));
 assert.ok(coffeeConflictReviewOptions(merged).some(g=>g.field==='elevation_m'&&g.options.length>=2));
});
test('selected Shopify conflicting roast category tags are withheld and both displayed for manual review',()=>{
 const coffee=shopify(['Coffee_Light Roast','Consumer Product','medium-roast']);
 assert.equal(coffee.fields.roast_level,undefined);
 assert.ok(coffee.conflicts?.includes('roast_level'));
 const group=coffeeConflictReviewOptions(coffee).find(x=>x.field==='roast_level');
 assert.ok(group.options.some(x=>/light/i.test(x.value)));
 assert.ok(group.options.some(x=>/medium/i.test(x.value)));
 assert.match(coffeeUrlPreviewMarkup(coffee),/Nothing was selected automatically/);
});
test('untrusted options are escaped, bounded and never silently applied to user fields',()=>{
 const evil='<img src=x onerror=alert(1)>';
 const result={ok:true,source_url:url,fields:{name:'Woods Blend'},conflicts:['origin'],
  conflict_options:{origin:[{value:evil,label:evil},{value:'Guji, Ethiopia',label:'Region'}]}};
 const html=coffeeUrlPreviewMarkup(result);
 assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<img/);
 const fields={origin:{value:'My Typed Origin',tagName:'INPUT',dispatchEvent(){}}};
 const form={elements:{namedItem(key){return fields[key]||null;}}};
 assert.deepEqual(applyCoffeeUrlFields(form,result),{filled:0,skipped:0});
 assert.equal(fields.origin.value,'My Typed Origin');
 const review=coffeeSourceReviewSnapshot(result);
 assert.equal(review.conflict_options[0].options.length,2);
 assert.ok(!JSON.stringify(review).includes('token'));
});
