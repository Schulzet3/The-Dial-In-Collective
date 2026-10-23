import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {mergePublicProductPreview} from '../src/server/coffee-shopify-ajax.mjs';

const source_url='https://roaster.example/products/current-coffee';
function parse(properties,body='',head=''){
 const product={'@type':'Product',name:'Current Coffee',url:source_url,
  additionalProperty:properties.map(([name,value])=>({name,value}))};
 return extractPublicCoffeeFacts(head+'<script type="application/ld+json">'+JSON.stringify(product)+
  '</script><main><h1>Current Coffee</h1>'+body+'</main>',{source_url});
}
function withheld(result){
 assert.equal(result.ok,true);assert.equal(result.fields.origin,undefined);
 assert.ok(result.conflicts?.includes('origin'));assert.ok(!result.available.includes('origin'));
}

test('structured Origin cannot be overwritten by a contradictory visible Country and Region',()=>{
 const result=parse([['Origin','Ethiopia']],'<p>Country: Colombia</p><p>Region: Huila</p>');
 withheld(result);
 withheld(parse([['Origin','Ethiopia']],'<p>Country: Colombia</p>'));
});

test('cross-alias geography conflicts are independent of structured and visible evidence order',()=>{
 for(const properties of [
  [['Country','Colombia'],['Region','Huila']],
  [['Region','Huila'],['Country','Colombia']]
 ])withheld(parse(properties,'<p>Origen: Ethiopia</p>'));
 withheld(parse([['Origin','Colombia'],['Origine','Ethiopia']],'<p>Region: Huila</p><p>Country: Colombia</p>'));
});

test('compatible origin country or region fragments enrich to the full explicitly labeled geography',()=>{
 for(const origin of ['Colombia','Huila','Huila, Colombia']){
  const result=parse([['Origin',origin]],'<p>Country: Colombia</p><p>Region: Huila</p>');
  assert.equal(result.fields.origin,'Huila, Colombia');assert.equal(result.conflicts,undefined);
 }
 const fuller=parse([['Origin','Huila, Colombia']],'<p>Country: Colombia</p>');
 assert.equal(fuller.fields.origin,'Huila, Colombia');assert.equal(fuller.conflicts,undefined);
 const region=parse([['Origin','Hawaii']],'<p>Country: United States</p><p>Region: Hawaii</p>');
 assert.equal(region.fields.origin,'Hawaii, United States');assert.equal(region.conflicts,undefined);
});

test('compatible geographic precision and accent equivalents preserve the more detailed source spelling',()=>{
 const result=parse([['Origin','Génova, Quindío, Colombia']],'<p>Country: Colombia</p><p>Region: Quindio</p>');
 assert.equal(result.fields.origin,'Génova, Quindío, Colombia');assert.equal(result.conflicts,undefined);
 const reverse=parse([['Country','Colombia'],['Region','Quindío']],'<p>Origen: Genova, Quindio, Colombia</p>');
 assert.equal(reverse.fields.origin,'Genova, Quindio, Colombia');assert.equal(reverse.conflicts,undefined);
 const countryAccent=parse([['Origin','México']],'<p>Country: Mexico</p><p>Region: Oaxaca</p>');
 assert.equal(countryAccent.fields.origin,'Oaxaca, Mexico');assert.equal(countryAccent.conflicts,undefined);
});

test('equivalent origin segment ordering and ordinary delimiters are not country conflicts',()=>{
 for(const origin of ['Colombia, Huila','Colombia / Huila','Colombia - Huila']){
  const result=parse([['Origin',origin]],'<p>Country: Colombia</p><p>Region: Huila</p>');
  assert.ok(result.fields.origin);assert.equal(result.conflicts,undefined);
 }
});

test('a differing explicit country in a full origin cannot be hidden by a shared region fragment',()=>{
 withheld(parse([['Origin','Huila, Ethiopia']],'<p>Country: Colombia</p><p>Region: Huila</p>'));
 withheld(parse([['Origin','Colombia, Ethiopia']],'<p>Country: Colombia</p><p>Region: Huila</p>'));
 withheld(parse([['Origin','Huila, Colombia, Ethiopia']],'<p>Country: Colombia</p><p>Region: Huila</p>'));
 withheld(parse([['Origin','Unknown Valley']],'<p>Country: Colombia</p><p>Region: Huila</p>'));
});

test('origin conflicts remain withheld through direct nearby and endpoint fallbacks',()=>{
 const result=parse([['Origin','Ethiopia']],
  '<p>Country: Colombia</p><p>Region: Huila</p><h3>Huila, Colombia</h3><p>Peach, mango</p>',
  '<meta name="coffee:origin" content="Huila, Colombia">');
 withheld(result);
 const merged=mergePublicProductPreview(result,{ok:true,fields:{name:'Current Coffee',origin:'Huila, Colombia'}});
 withheld(merged);
});

test('later blend evidence cannot restore a geographic field already rejected for source disagreement',()=>{
 const result=parse([['Origin','Ethiopia']],'<p>Country: Colombia</p><p>Region: Huila</p>'+
  '<h2>Components:</h2><p>50% Colombia - Washed</p><p>50% Brazil - Natural</p>');
 withheld(result);assert.match(result.roaster_details?.blend_components||'',/Colombia.*Brazil/);
});
