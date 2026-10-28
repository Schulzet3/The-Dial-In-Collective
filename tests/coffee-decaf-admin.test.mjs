import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderAdminRecord,renderAdminCoffeeFacts} from '../site/admin/records.js';
const sql=readFileSync(new URL('../supabase/migrations/20261027170000_dic_decaf_only_method.sql',import.meta.url),'utf8');
const ui=readFileSync(new URL('../site/admin/main.js',import.meta.url),'utf8');
const id='00000000-0000-4000-8000-000000000180';
const base={id,revision:1,name:'Colombia Decaf',roaster:'Example',origin:'Colombia',is_decaf:true,decaffeination_method:'Sugar Process'};
test('admin decaf facts retain distinct processing and method',()=>{
 const facts=renderAdminCoffeeFacts({...base,process:'Washed'});
 assert.match(facts,/Decaffeination Method/);
 assert.match(facts,/Sugar Process/);
 assert.match(facts,/Washed/);
});
test('regular and half-caf facts never show a decaffeination method',()=>{
 for(const name of ['Regular Colombia','Colombia Half-Caf']){
  assert.doesNotMatch(renderAdminCoffeeFacts({...base,name,is_decaf:false}),/Decaffeination Method/);
 }
});
test('admin edit has explicit fully-decaf checkbox and three-value selector',()=>{
 const decaf=renderAdminRecord({...base,created_at:'2026-10-27'},'approved');
 assert.match(decaf,/name="is_decaf"/);
 assert.match(decaf,/name="decaffeination_method"/);
 assert.match(decaf,/Water Process/);
 assert.match(decaf,/Sugar Process/);
 assert.match(decaf,/Carbon Dioxide \(CO2\)/);
 const regular=renderAdminRecord({...base,name:'Regular',is_decaf:false,created_at:'2026-10-27'},'approved');
 assert.match(regular,/class="admin-decaf-method" hidden/);
 assert.match(ui,/el.name==='is_decaf'\?el.checked:el.value/);
});
test('staged admin SQL retains original audit and revision guards',()=>{
 assert.match(sql,/CREATE OR REPLACE FUNCTION private\.dic_admin_edit_record/);
 assert.match(sql,/oldcoffee\.revision/);
 assert.match(sql,/private\.admin_content_edits/);
 assert.match(sql,/classify_personal_shot/);
 assert.match(sql,/decaffeination_method=case/);
 assert.match(sql,/is_decaf=case/);
});
