import test from 'node:test';
import assert from 'node:assert/strict';
import {selected550,directSelectedProof,locationUnrepeated} from '../scripts/audit/issue33-r107-550-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {withoutRepeatedCoffeeOriginSuffix} from '../src/server/coffee-fact-compatibility.mjs';
const own='Best Uses- Pour Over, Espresso, Auto Drip, Aero Press. Elevation: 2100 m. Varietals: Ethiopian Heirloom. Milling Process: Natural. Drying Process: Raised beds. Harvest Start Month: November. Harvest End Month: January. This particular farm is Located in the Durame Village of Kembata, Ethiopia. At 2100 meters above sea level, the soil is extremely fertile and ideal for growing high quality coffee beans. The cherries that are unwashed spend 15-21 days drying. The resulting coffee is an extremely complex cup marked with notes of blueberry and strawberry.';
const markup=(body=own,name=selected550.name,extra='')=>
 '<html><head><meta property="og:type" content="product"><meta property="og:url" content="'+selected550.url+'"></head><body><main><article class="product"><h1>'+name+'</h1><div class="product__description"><p>'+body.replace(/\.\s+(?=(?:Elevation|Varietals|Milling Process|Drying Process|Harvest Start Month|Harvest End Month|This particular farm)\b)/gu,'</p><p>')+'</p></div></article>'+extra+'</main></body></html>';
test('current selected official product requires one exact H1 and six own direct facts',()=>{
 const proof=directSelectedProof(markup());assert.equal(proof.uniqueH1,true);assert.equal(proof.direct.length,6);assert.ok(proof.direct.every(Boolean));
});
test('recycled H1 or two simultaneous H1 products cannot certify the original',()=>{
 for(const h of [markup(own,'Ethiopia Another Lot'),markup(own,''),markup().replace('</h1>','</h1><h1>Other coffee</h1>')])
  assert.equal(directSelectedProof(h).uniqueH1,false);
});
test('menu, metadata, or related coffee do not establish the selected farm story',()=>{
 const p=directSelectedProof(markup('No processing or farm description published.',selected550.name,'<aside>'+own+'</aside><nav>'+own+'</nav>'));
 assert.equal(p.uniqueH1,true);assert.ok(p.direct.every(v=>v===false),JSON.stringify(p));
});
test('changing direct lot region or milling method invalidates exact source contract',()=>{
 const p=directSelectedProof(markup(own.replace('Durame Village of Kembata, Ethiopia','Sidama, Ethiopia').replace('Milling Process: Natural','Milling Process: Washed')));
 assert.equal(p.direct[2],false);assert.equal(p.direct[4],false);
});
test('actual parser preserves selected Ethiopian heirloom, natural and blueberry/strawberry notes',()=>{
 const p=extractPublicCoffeeFacts(markup(),{source_url:selected550.url});assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields.name,selected550.name);
 assert.match(String(p.fields.elevation_m||''),/2100/);
 assert.match(String(p.fields.variety||''),/heirloom/i);
 assert.match(String(p.fields.process||''),/natural/i);
 assert.match(String(p.fields.tasting_notes||''),/blueberry/i);
 assert.match(String(p.fields.tasting_notes||''),/strawberry/i);
});
test('selected origin must not repeat Kembata or Durame from two independent place candidates',()=>{
 const p=extractPublicCoffeeFacts(markup(),{source_url:selected550.url});assert.equal(p.ok,true,JSON.stringify(p));
 assert.match(String(p.fields.origin||''),/Durame.*Kembata.*Ethiopia/i);
 assert.equal(locationUnrepeated(p.fields.origin),true,JSON.stringify(p.fields));
 assert.equal(locationUnrepeated('Durame Village of Kembata, Ethiopia, Kembata, Durame'),false);
});
test('unrelated neighbor must not poison selected process or flavor claims',()=>{
 const p=extractPublicCoffeeFacts(markup(own,selected550.name,'<aside>Other product: washed Kenya Nyeri, notes of raspberry and lemon.</aside>'),{source_url:selected550.url});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/raspberry|lemon/i);
 assert.doesNotMatch(String(p.fields.process||''),/washed/i);
});

test('source-printed locality and country remove only duplicate short trailing place fragments',()=>{
 assert.equal(withoutRepeatedCoffeeOriginSuffix('Durame Village of Kembata, Ethiopia, Kembata, Durame'),'Durame Village of Kembata, Ethiopia');
 assert.equal(withoutRepeatedCoffeeOriginSuffix('Durame Village of Kembata, Ethiopia, Kembata, Sidama'),'Durame Village of Kembata, Ethiopia, Kembata, Sidama');
 assert.equal(withoutRepeatedCoffeeOriginSuffix('Durame Village of Kembata, Ethiopia, Kembata, Kenya'),'Durame Village of Kembata, Ethiopia, Kembata, Kenya');
 assert.equal(withoutRepeatedCoffeeOriginSuffix('Gatara, Kayanza, Burundi'),'Gatara, Kayanza, Burundi');
 assert.equal(withoutRepeatedCoffeeOriginSuffix('Colombia, Ethiopia, Colombia'),'Colombia, Ethiopia, Colombia');
 assert.equal(withoutRepeatedCoffeeOriginSuffix('Huehuetenango, Guatemala, Huehuetenango'),'Huehuetenango, Guatemala');
});
