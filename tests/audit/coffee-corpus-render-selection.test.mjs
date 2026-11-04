import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// Read and execute only the selection expression in a sterile VM.
// Never launch Playwright, fetch a roaster, call Auth, or mutate corpus data.
const script=path.resolve(import.meta.dirname,'../../scripts/audit/coffee-corpus-render.mjs');
const source=fs.readFileSync(script,'utf8');
const declaration=source.split('\n').filter(line=>line.startsWith('const selected=manifest.roasters.map('));
assert.equal(declaration.length,1,'Expected exactly one source packet selection');
const select=(manifest,entries)=>vm.runInNewContext(declaration[0]+'\nselected',{manifest,entries,Error});

test('select all frozen source packets in manifest order without mutation',()=>{
 const u1='https://roaster.example/a',u2='https://roaster.example/b';
 const selected=select({roasters:[{id:'r',selected_urls:[u2,u1]}]},
  [{id:'a',source_url:u1},{id:'b',source_url:u2}]);
 assert.deepEqual(JSON.parse(JSON.stringify(selected)),[{id:'r',cases:[{id:'b',source_url:u2},{id:'a',source_url:u1}]}]);
});

test('a missing selected public source packet fails closed instead of silently disappearing',()=>{
 const missing='https://roaster.example/missing';
 assert.throws(()=>select({roasters:[{id:'r',selected_urls:[missing]}]},[]),/Missing selected public source packet/);
});

test('duplicate manifest selections retain original first-matching packet behavior',()=>{
 const u='https://roaster.example/a';
 const result=select({roasters:[{id:'r',selected_urls:[u,u]}]},[{id:'a',source_url:u}]);
 assert.deepEqual(Array.from(result[0].cases,x=>x.id),['a','a']);
});

test('unselected extra packets never change exact selected-source identity',()=>{
 const u='https://roaster.example/a';
 const result=select({roasters:[{id:'r',selected_urls:[u]}]},
  [{id:'other',source_url:'https://roaster.example/other'},{id:'a',source_url:u}]);
 assert.equal(result[0].cases[0].id,'a');
});
