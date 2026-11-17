import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {humanDate} from '../site/lib/ui.js';
import {shotCard} from '../site/cloud/shot_card.js';

const tastes={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const original=timestamp=>({id:'historic-calendar-date',timestamp,
 style:'Traditional',doseG:18.25,yieldG:36.35,timeS:25.25,grindSetting:2.45,
 feedMode:'standard',notes:'Original private text',tasteScales:{...tastes},
 dialedIn:true});
const inTimezone=(zone,value)=>{
 const target=JSON.stringify(new URL('../site/lib/ui.js',import.meta.url).href);
 const code='import {humanDate} from '+target+';process.stdout.write(humanDate('+JSON.stringify(value)+'));';
 const run=spawnSync(process.execPath,['--input-type=module','-e',code],{
  encoding:'utf8',env:{...process.env,TZ:zone}});
 assert.equal(run.status,0,run.stderr||'timezone child exited unsuccessfully');
 return run.stdout;
};

test('R321 legacy YYYY-MM-DD Shot History stays on entered calendar date across timezones',()=>{
 for(const zone of ['America/Denver','Pacific/Auckland','UTC']){
  assert.equal(inTimezone(zone,'2026-11-05'),'11/5/2026',zone);
  assert.equal(inTimezone(zone,'2024-02-29'),'2/29/2024',zone);
 }
 const shot=original('2026-11-05'),before=structuredClone(shot);
 const html=shotCard(shot,{expanded:true});
 assert.match(html,/11\/5\/2026/);
 assert.match(html,/Original private text/);
 assert.deepEqual(shot,before,'original measurements, notes and five tastes remain intact');
});

test('R321 offset-bearing ISO timestamps retain real local instant display',()=>{
 assert.equal(inTimezone('America/Denver','2026-11-05T00:30:00Z'),'11/4/2026');
 assert.equal(inTimezone('America/Denver','2026-11-05T12:00:00Z'),'11/5/2026');
 assert.equal(inTimezone('Pacific/Auckland','2026-11-05T23:30:00Z'),'11/6/2026');
});

test('R321 impossible legacy date-only and missing dates are never fabricated',()=>{
 for(const invalid of ['2026-02-30','2026-13-01','2026-00-01','2026-11-31','not-a-date','',null]){
  assert.equal(humanDate(invalid),'',String(invalid));
  const shot=original(invalid),before=structuredClone(shot),html=shotCard(shot);
  assert.match(html,/Date not recorded/);
  assert.deepEqual(shot,before);
 }
});
