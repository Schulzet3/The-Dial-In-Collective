import test from 'node:test';
import assert from 'node:assert/strict';
import {selected111,selected111Direct,selected111FieldsOk} from '../scripts/audit/issue33-r111-561-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const own='<h3>Cupping notes: Lime/Grape/Brown Sugar</h3><ul><li>Grower: Finca Churupampa</li><li>Region: Chirinos, Cajamarca</li><li>Altitude: 1,600-1,900m</li><li>Process: Washed</li><li>Certifications: Fair Trade, Organic</li></ul><p>Finca Churupampa is a coffee farm in Chirinos, Cajamarca, Peru run by Eber Tocto and his brothers.</p>';
const page=(story=own,noise='',title=selected111.name)=>'<html><head><title>'+title+'</title><meta property="og:type" content="product"><meta property="og:url" content="'+selected111.url+'"></head><body><main><article class="product"><h1>'+title+'</h1><div class="product__description">'+story+'</div></article>'+noise+'</main></body></html>';
test('561 correct selected unique H1 and actual visible spec proof',()=>{
 const x=selected111Direct(page());assert.equal(x.uniqueH1,true);assert.ok(x.direct.every(y=>y.matched),JSON.stringify(x));
});
test('561 direct source lacking selected altitude or grower fails',()=>{
 assert.ok(selected111Direct(page(own.replace('1,600-1,900m','100-200m'))).direct.some(x=>!x.matched));
 assert.ok(selected111Direct(page(own.replace('Finca Churupampa','Other Farm'))).direct.some(x=>!x.matched));
});
test('561 reused Peru handle with a different current H1 fails',()=>{
 assert.equal(selected111Direct(page(own,'','Other coffee')).uniqueH1,false);
 assert.equal(selected111Direct(page().replace('</h1>','</h1><h1>Different Coffee</h1>')).uniqueH1,false);
});
test('561 generic SEO, menu, aside and reviews do not certify direct selected facts',()=>{
 const x=selected111Direct(page('<p>Peru coffee</p>', '<aside>'+own+'</aside><nav>'+own+'</nav><h2>Customer Reviews</h2>'+own));
 assert.ok(x.direct.some(y=>!y.matched),JSON.stringify(x));
});
test('561 current product fields retain direct grower, process, place, literal cup notes',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:selected111.url});
 assert.equal(p.ok,true,JSON.stringify(p));assert.ok(selected111FieldsOk(p.fields),JSON.stringify(p.fields));
});
test('561 marketing neighboring farmers are not substituted for selected farm identity',()=>{
 const p=extractPublicCoffeeFacts(page(own+'<p>Marketing and export services for 215 neighboring farmers.</p>'),{source_url:selected111.url});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.ok(!/215 neighboring/i.test(String(p.fields.producer||'')),JSON.stringify(p.fields));
});
test('561 fertilizer honey is NOT selected honey coffee processing',()=>{
 const p=extractPublicCoffeeFacts(page(own+'<p>Leftover honey from fermentation tanks makes fertilizer pellets.</p>'),{source_url:selected111.url});
 assert.equal(p.ok,true,JSON.stringify(p));assert.equal(p.fields.process,'Washed',JSON.stringify(p.fields));
});
test('561 different coffee flavor facts in sidebar excluded',()=>{
 const p=extractPublicCoffeeFacts(page(own,'<aside><h2>Other Coffee</h2><p>Tasting notes: lychee, jasmine, blackberry</p></aside>'),{source_url:selected111.url});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.ok(!/lychee|jasmine|blackberry/i.test(String(p.fields.tasting_notes||'')),JSON.stringify(p.fields));
});
