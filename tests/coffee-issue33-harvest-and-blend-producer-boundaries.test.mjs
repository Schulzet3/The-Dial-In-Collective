// Issue #33: original603 #354/#380 synthetic adversarial provenance; live HTML separately verified.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const page=(name,body)=>'<html><head><meta property="og:type" content="product"></head><body><main><article class="product"><h1>'+name+'</h1><div class="product__description">'+body+'</div></article></main></body></html>';
test('#354 Harvest: December–March is not a release edition',()=>{
 const body='<p>Producer: Elvin Suazo</p><p>Farm: Finca Rancho Escondido</p><p>Country: Honduras</p><p>Region: La Paz</p><p>Process: Natural</p><p>Roast Level: Light</p><p>Harvest: December–March</p>';
 const r=extractPublicCoffeeFacts(page('Honduras Elvin Suazo Coffee Beans',body),{source_url:'https://staccatoroasters.com/products/honduras-elvin-suazo-natural-coffee'});
 assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.fields.release_label,undefined,JSON.stringify(r.fields));
 assert.equal(r.fields.process,'Natural');assert.equal(r.fields.roast_level,'Light');
});
test('#380 one blend component association and unrelated farmer cannot become whole-blend producer',()=>{
 const body='<p>ROAST: Medium</p><p>ORIGIN: Guatemala / Nicaragua</p><p>REGION: Huehuetenango(GT) / Matagalpa(NI)</p><p>PROCESS: Washed</p>'+
 '<p>The Horizon Organic blend features two great coffee communities sharing one vision.</p>'+
 '<p>Huehuetenango, Guatemala is home to our organic producing community ACODIHUE. ACODIHUE is an association of mostly women who rely on small lots.</p>'+
 '<section class="meet-the-farmer"><h2>MEET Marta Solares</h2><p>Marta grows coffee at La Esperanza in Guatemala, in another farmer profile.</p></section>';
 const r=extractPublicCoffeeFacts(page('Horizon Organic',body),{source_url:'https://thrivefarmers.com/products/horizon-organic'});
 assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.fields.name,'Horizon Organic');
 assert.equal(r.fields.producer,undefined,JSON.stringify(r.fields));
 assert.doesNotMatch(JSON.stringify(r.fields),/Marta Solares|La Esperanza|ACODIHUE/);
});
