import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRoastLabel,extractRoastVisualEvidence,roastLabelHint} from '../src/server/roast-level-evidence.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const current=(label,extra='')=>'<html><head><title>Ethiopia Harrar - Aveley Farms</title>'+
 '<meta property="og:site_name" content="Aveley Farms"></head><body><main><h1>Ethiopia Harrar</h1>'+
 '<section><p>Cupping notes: Cocao - Berries - Pleasant Body</p>'+
 '<p>Roast Level: '+label+'</p><p>Processing Method: Natural Processed</p>'+
 '<p>Varietal: Heirloom</p><p>1800 MASL</p>'+extra+'</section></main></body></html>';

test('owner Full City maps Medium-Dark alone and in consistent parentheses',()=>{
 assert.equal(normalizeRoastLabel('Full City'),'Medium-Dark');
 assert.equal(normalizeRoastLabel('Full City (Medium-Dark)'),'Medium-Dark');
 assert.equal(normalizeRoastLabel('Medium (Med)'),'Medium');
 assert.equal(normalizeRoastLabel('Medium (Velvety)'),'Medium');
});
test('contradictory current roast and abbreviation cannot silently choose another tier',()=>{
 for(const label of ['Full City (Med)','Full City (Medium)','Light (Dark)','Dark (Light)','Medium-Dark (Medium)']){
  assert.equal(normalizeRoastLabel(label),null,label);
  assert.match(roastLabelHint(label),/inconsistent roast categories/i,label);
 }
});
test('actual selected Ethiopia Harrar opposing Full City and Med stays blank and reviewable',()=>{
 const html=current('Full City (Med)');
 const parsed=extractPublicCoffeeFacts(html,{source_url:'https://www.aveleyfarmscoffee.com/products/ethiopia-harrar'});
 assert.equal(parsed.ok,true);
 assert.equal(parsed.fields.name,'Ethiopia Harrar');
 assert.equal(parsed.fields.roast_level,undefined);
 assert.match(parsed.roast_hint||'',/inconsistent roast categories/i);
 const visual=extractRoastVisualEvidence(html);
 assert.equal(visual.value,null);
 assert.match(visual.hint||'',/inconsistent roast categories/i);
});
test('supported unambiguous selected Full City still normalizes to Medium-Dark',()=>{
 const p=extractPublicCoffeeFacts(current('Full City'),{source_url:'https://www.aveleyfarmscoffee.com/products/ethiopia-harrar'});
 assert.equal(p.ok,true);
 assert.equal(p.fields.roast_level,'Medium-Dark');
});
test('unrelated or unsupported parentheses do not supply a selected roast tier',()=>{
 for(const label of ['White (Med)','Roast options: Full City (Med)','Full City (unknown)']){
  assert.equal(normalizeRoastLabel(label),null,label);
 }
 const p=extractPublicCoffeeFacts(current('Full City (Med)','<nav><a href="/products/another">Other dark coffee</a></nav>'),{source_url:'https://www.aveleyfarmscoffee.com/products/ethiopia-harrar'});
 assert.equal(p.ok,true);
 assert.equal(p.fields.roast_level,undefined);
});
