import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {orderedShotHistory} from '../site/lib/model.js';

const five={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const shot=(id,timestamp,notes)=>({id,timestamp,notes,
 doseG:18,yieldG:36,timeS:26,grindSetting:1.2,feedMode:'standard',
 style:'Traditional',tasteScales:{...five},dialedIn:true});

test('#455 shot history lists actual newest instant before lexical-later older offset',()=>{
 const older=shot('older','2026-11-05T03:00:00+02:00','Original private older note');
 const newer=shot('newer','2026-11-04T23:30:00-07:00','Original private newer note');
 assert.ok(older.timestamp>newer.timestamp,'fixture exposes original lexical bug');
 assert.ok(Date.parse(older.timestamp)<Date.parse(newer.timestamp));
 const rows=[older,newer],preserved=structuredClone(rows);
 const order=orderedShotHistory(rows);
 assert.deepEqual(order.map(x=>x.id),['newer','older']);
 assert.deepEqual(rows,preserved,'original measurements, five tastes, notes and timestamp strings untouched');
 assert.notEqual(order,rows,'the sort must never mutate a caller-owned history array');
});

test('#455 invalid or absent legacy shot times remain visible after dated shots',()=>{
 const entries=[
  shot('no-date',undefined,'Keep undated legacy note'),
  shot('newer','2026-11-05T07:00:00Z','Recent rated shot'),
  shot('bad','not-a-date','Keep invalid date'),
  shot('old','2026-11-05T03:00:00Z','Earlier shot'),
  shot('blank','  ','Keep whitespace date')
 ];
 const preserved=structuredClone(entries);
 const order=orderedShotHistory(entries);
 assert.deepEqual(order.map(x=>x.id),['newer','old','no-date','bad','blank']);
 assert.deepEqual(entries,preserved);
 assert.ok(order.every(x=>x.tasteScales.sweetness===5&&x.notes));
});

test('#455 equal instants retain original order and normal UTC dates remain correctly ordered',()=>{
 const entries=[
  shot('equal-a','2026-11-05T07:00:00Z','A'),
  shot('earlier','2026-11-05T06:00:00Z','B'),
  shot('equal-b','2026-11-05T00:00:00-07:00','C'),
  shot('newest','2026-11-05T08:00:00Z','D')
 ];
 assert.deepEqual(orderedShotHistory(entries).map(x=>x.id),['newest','equal-a','equal-b','earlier']);
 assert.deepEqual(orderedShotHistory([]),[]);
});

test('#455 coffee-screen Shot History uses the same tested instant-order helper',()=>{
 const source=readFileSync(new URL('../site/cloud/main.js',import.meta.url),'utf8');
 assert.match(source,/M\.orderedShotHistory\(s\.shots\.filter\(sh=>sh\.coffeeId===c\.id&&!sh\.hidden\)\)/);
 assert.doesNotMatch(source,/timestamp\.localeCompare\(/);
});
