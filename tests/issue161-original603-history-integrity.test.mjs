import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const files=['a','b','c','root','root-extra-c'];
const oracle=files.flatMap(name=>JSON.parse(readFileSync(new URL('../docs/audits/extractor-600-oracle-'+name+'.json',import.meta.url),'utf8')));
test('the immutable original 603-coffee oracle retains 201 roasters, three cases each and 4002+6474 unchanged facts',()=>{
 const ids=new Set(),roasters=new Map();let canonical=0,additional=0;
 for(const row of oracle){
  assert.ok(row&&typeof row.case_id==='string'&&row.case_id);
  assert.ok(typeof row.roaster_id==='string'&&row.roaster_id);
  assert.ok(row.source_url?.startsWith('https://'));
  assert.ok(Array.isArray(row.reviewed_sources)&&row.reviewed_sources.length);
  assert.ok(row.canonical&&typeof row.canonical==='object'&&!Array.isArray(row.canonical));
  for(const key of ['additional_facts','ambiguities','not_observed_fields','blocked'])
   assert.ok(Array.isArray(row[key]));
  assert.ok(!ids.has(row.case_id),'Duplicate original oracle '+row.case_id);
  ids.add(row.case_id);roasters.set(row.roaster_id,(roasters.get(row.roaster_id)||0)+1);
  canonical+=Object.keys(row.canonical).length;additional+=row.additional_facts.length;
 }
 assert.equal(oracle.length,603);assert.equal(ids.size,603);assert.equal(roasters.size,201);
 assert.ok([...roasters.values()].every(n=>n===3));
 assert.equal(canonical,4002);assert.equal(additional,6474);
});
