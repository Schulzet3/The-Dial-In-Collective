// Issue #33 original603 #501: selected current lot locality and region must be
// independently printed; neither a reused URL nor related/old coffee is proof.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';

const url='https://www.ixxacoffee.com/products/organic-ki-saya-tenejapa-microlot';
const name='Organic Ki-Saya - Tenejapa Microlot';
const named='Ki-Saya, our organic gem from Chiapas, blends two Mayan words: "Ki" (tasty) and "Saayab" (nature).';
const lot='This lot hails from Tenejapa—a high-altitude spot where rich volcanic soil and ideal climate make magic happen.';
const page=(title,body,head='')=>'<html><head><meta property="og:type" content="product">'+head+
 '</head><body><main><article class="product"><h1>'+title+'</h1><div itemprop="description">'+
 body+'</div></article></main></body></html>';
const parse=(title,body,head='')=>extractPublicCoffeeFacts(page(title,body,head),{source_url:url});

test('current selected Ki-Saya lot preserves both directly published Tenejapa and Chiapas',()=>{
 const result=parse(name,'<p>'+named+'</p><p>'+lot+'</p>'+
  '<p>Notes Of: Chocolate, creamy caramel, honey, hazelnut</p>');
 assert.equal(result.ok,true);
 assert.equal(result.fields.origin,'Tenejapa, Chiapas');
 assert.match(coffeeUrlPreviewMarkup(result),/Tenejapa, Chiapas/);
 assert.ok(result.source_facts?.some(f=>f.field==='origin'&&
  /Tenejapa/.test(f.value)&&/Chiapas/.test(f.value)));
});

test('stale SEO, unrelated recommendations and grind options cannot donate another lot',()=>{
 const result=parse(name,'<p>'+named+'</p><p>'+lot+'</p>'+
  '<section class="product-recommendations"><h2>Related Products</h2>'+
  '<h3>Other Coffee</h3><p>This lot hails from Oaxaca.</p></section>'+
  '<label>Grind</label><select><option>Whole Bean</option><option>Medium</option></select>',
  '<title>Guatemala Antigua - Previous Lot</title>');
 assert.equal(result.ok,true);
 assert.equal(result.fields.origin,'Tenejapa, Chiapas');
 assert.ok(!result.conflicts?.includes('origin'));
});

test('competing current named regions must not be silently combined with one lot',()=>{
 const competing='Ki-Saya, our organic gem from Oaxaca, is a different claim.';
 const result=parse(name,'<p>'+named+'</p><p>'+competing+'</p><p>'+lot+'</p>');
 assert.equal(result.ok,true);
 assert.notEqual(result.fields.origin,'Tenejapa, Chiapas');
 assert.notEqual(result.fields.origin,'Tenejapa, Oaxaca');
});

test('old regional story and a mismatched selected H1 cannot corroborate this lot',()=>{
 const old=parse(name,'<p>Previously, '+named+'</p><p>'+lot+'</p>');
 assert.notEqual(old.fields.origin,'Tenejapa, Chiapas');
 const different=parse('Another Microlot','<p>'+named+'</p><p>'+lot+'</p>');
 assert.notEqual(different.fields.origin,'Tenejapa, Chiapas');
});
