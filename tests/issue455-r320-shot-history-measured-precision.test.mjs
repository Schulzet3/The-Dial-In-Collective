import test from 'node:test';
import assert from 'node:assert/strict';
import {shotSummary} from '../site/lib/ui.js';

const shot=(o={})=>({doseG:18.25,yieldG:36.35,timeS:25.25,grindSetting:2.45,tempC:91,
  notes:'Original recorded notes stay unchanged',
  tasteScales:{extraction:3,body:3,clarity:5,sweetness:5,astringency:1},...o});

test('R320 Shot History displays original non-tenth scalar readings without implied rounding',()=>{
 const original=shot(),before=structuredClone(original);
 const html=shotSummary(original,'C');
 for(const fragment of ['18.25g','36.35g','25.25s','Grind 2.45','1:1.99','91°C'])
  assert.ok(html.includes(fragment),fragment+' missing from: '+html);
 assert.ok(!html.includes('36.4g'));
 assert.ok(!html.includes('Grind 2.5'));
 assert.deepEqual(original,before);
});
test('R320 historic numeric strings retain exact meaningful non-tenth precision',()=>{
 const original=shot({doseG:'18.25',yieldG:'36.35',timeS:'25.25',grindSetting:'2.45'});
 const before=structuredClone(original),html=shotSummary(original);
 assert.ok(html.includes('18.25g'));
 assert.ok(html.includes('36.35g'));
 assert.ok(html.includes('25.25s'));
 assert.ok(html.includes('Grind 2.45'));
 assert.deepEqual(original,before);
});
test('R320 existing tenth and integer formatting stays visually consistent',()=>{
 const html=shotSummary(shot({doseG:18,yieldG:36.4,timeS:25,grindSetting:2.4,tempC:null}));
 for(const fragment of ['18.0g','36.4g','25.0s','Grind 2.4'])
  assert.ok(html.includes(fragment),fragment+' missing: '+html);
});
test('R320 missing/boolean/unsafe legacy measurements never become fabricated numeric values or markup',()=>{
 const original=shot({doseG:null,yieldG:'  ',timeS:false,grindSetting:'<img src=x onerror=alert(1)>',tempC:null});
 const before=structuredClone(original),html=shotSummary(original);
 assert.ok(html.includes('—g'));
 assert.ok(html.includes('· —s'));
 assert.ok(!html.includes('Grind '));
 assert.ok(!html.includes('<img'));
 assert.ok(!html.includes('1:'));
 assert.deepEqual(original,before);
});
test('R320 historical true zero and invalid legacy unit retain existing physical display semantics',()=>{
 const original=shot({doseG:0,yieldG:5,timeS:0,grindSetting:0,tempC:91});
 const before=structuredClone(original),html=shotSummary(original,'<svg/onload=alert(1)>');
 for(const fragment of ['0.0g','5.0g','0.0s','Grind 0.0','196°F'])
  assert.ok(html.includes(fragment),fragment+' missing: '+html);
 assert.ok(!html.includes('<svg'));
 assert.deepEqual(original,before);
});
