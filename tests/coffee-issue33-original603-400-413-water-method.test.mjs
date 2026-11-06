import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

// Current official original603 selected products, runner 42277219748, raw
// source SHA256 #400 df0e3467ef65cc720f81df8963990610f1353589ae133860ea882aece3713f67
// and #413 4406ce927e5fd955e00b7b1b20b52a4683d337524af162c4102bb499315805f1.
// Synthetic minimal exact-product fixtures, never frozen-corpus substitutions.
const vt="https://vtartisan.com/products/dark-decaf";
const woods="https://woodscoffee.com/products/decaf";
const vtProse="These Central American &amp; African beans are naturally decaffeinated using the 'Mountain Water' process. The benefit is not only a delicious decaf coffee, but no toxic chemicals or environmentally damaging materials were used in the process. This coffee, perfect to follow an evening meal, is 97 - 99% caffeine free.";
const woodsProse="A medium roast that delivers notes of sweet, floral, and spice. Using the Swiss Water Process, our decaf uses the elements of water, temperature and time to offer a decaf blend that is 99.9% caffeine free.";
const parse=(name,body,url=vt)=>extractPublicCoffeeFacts('<main class="product"><h1>'+name+'</h1>'+body+'</main>',{source_url:url});

test('VT Artisan exact selected Dark Decaf Mountain Water prose supplies Water Process',()=>{
 const p=parse('Dark Decaf','<p>'+vtProse+'</p>');
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,'Dark Decaf');
 assert.equal(p.fields.decaffeination_method,'Water Process');
 assert.ok((p.source_facts||[]).some(f=>f.field==='decaffeination_method'&&/Mountain Water/i.test(String(f.value))));
});
test('Woods exact selected Decaf Swiss Water prose with decimal caffeine percentage supplies Water Process',()=>{
 const p=parse('Decaf','<p>'+woodsProse+'</p>',woods);
 assert.equal(p.ok,true);
 assert.equal(p.fields.decaffeination_method,'Water Process');
 assert.ok((p.source_facts||[]).some(f=>f.field==='decaffeination_method'&&/Swiss Water/i.test(String(f.value))));
});
test('regular selected coffee cannot inherit selected-decaf wording',()=>{
 assert.equal(parse('Dark Roast','<p>'+vtProse+'</p>').fields.decaffeination_method,undefined);
});
test('half-caf cannot inherit full-decaf treatment',()=>{
 assert.equal(parse('Half Caf','<p>'+vtProse+'</p>').fields.decaffeination_method,undefined);
});
test('historical rather than present treatment cannot supply method',()=>{
 assert.equal(parse('Dark Decaf','<p>Previously, '+vtProse+'</p>').fields.decaffeination_method,undefined);
});
test('other coffee treatment cannot become selected product treatment',()=>{
 assert.equal(parse('Dark Decaf','<p>Another coffee uses a Mountain Water decaf process. Our selected product has no published method.</p>').fields.decaffeination_method,undefined);
});
test('water used for beans or equipment without named decaffeination is not Water Process',()=>{
 assert.equal(parse('Dark Decaf','<p>These Central American beans are washed and processed using mountain water. The decaffeination method is not stated.</p>').fields.decaffeination_method,undefined);
});
test('related coffee decaf description outside chosen product may not fill a method',()=>{
 const p=parse('Dark Decaf','<p>Only roast and origin are published.</p><aside class="related-products"><h2>Other coffee</h2><p>'+vtProse+'</p></aside>');
 assert.equal(p.fields.decaffeination_method,undefined);
});
test('water wording cannot overwrite independently selected Sugar Process method',()=>{
 const p=parse('Colombia EA Sugarcane Decaf Coffee Beans','<p>Decaffeinated using Colombia sugarcane EA Process.</p><p>Process: Washed • EA Sugarcane Decaffeination</p>','https://staccatoroasters.com/products/colombia-valle-del-cauca-ea-decaf');
 assert.notEqual(p.fields.decaffeination_method,'Water Process');
});
