import test from 'node:test';
import assert from 'node:assert/strict';
import {fmt,shotSummary} from '../site/lib/ui.js';
import {shotCard} from '../site/cloud/shot_card.js';

const tastes={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const oldShot={
 id:'old-import',timestamp:null,style:'Traditional',doseG:18,yieldG:36,timeS:27,
 grindSetting:1.5,tempC:90,feedMode:'standard',tasteScales:{...tastes},
 notes:'Preserve my private original notes',dialedIn:true,setupVersionId:'v1',
 snapshot:{setupName:'Original',tempUnit:'F'}
};

test('#455 missing, blank or boolean numeric measurements render as unknown, never fabricated zero',()=>{
 for(const value of ['', '   ', '\t', null, undefined, false, true, {}, [], NaN, Infinity, 'NaN']){
  assert.equal(fmt(value),'—',String(value));
 }
 assert.equal(fmt(0),'0.0','genuine measured zero remains distinct from missing');
 assert.equal(fmt('0'),'0.0');
 assert.equal(fmt(' 18.25 ',2),'18.25');
 assert.equal(fmt(1.26),'1.3');
});

test('#455 legacy incomplete shot does not invent zero dose, yield, time, grind, temperature or ratio',()=>{
 const record={...oldShot,doseG:' ',yieldG:'',timeS:false,grindSetting:'',tempC:' '};
 const before=structuredClone(record);
 const compact=shotSummary(record,'F');
 const html=shotCard(record,{expanded:true,activeVersionId:'v1',unit:'F'});
 for(const view of [compact,html]){
  assert.match(view,/—g → —g/);
  assert.match(view,/—s/);
  assert.doesNotMatch(view,/1:\d|Grind 0\.0|32°F|0\.0g|0\.0s|NaN|Infinity/);
 }
 assert.match(html,/Date not recorded/);
 assert.match(html,/Preserve my private original notes/);
 assert.match(html,/Dialed In/);
 assert.deepEqual(record,before,'render must not alter the original shot or ratings');
});

test('#455 valid numeric strings and actual zero values retain exact history information',()=>{
 const record={...oldShot,doseG:'18',yieldG:'36',timeS:'27',grindSetting:0,tempC:0};
 const compact=shotSummary(record,'F');
 assert.match(compact,/18\.0g → 36\.0g · 1:2\.00 · 27\.0s/);
 assert.match(compact,/32°F/,'real 0°C is a valid temperature');
 assert.match(compact,/Grind 0\.0/,'real zero grinder setting remains visible');
 assert.deepEqual(record.tasteScales,tastes);
});
