import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as C from '../site/lib/constants.js';
import {autofillFields,coffeeSourceDifferences} from '../site/cloud/coffee-url-autofill.js';
import {hydrate} from '../site/cloud/mapping.js';
const ui=fs.readFileSync(new URL('../site/cloud/main.js',import.meta.url),'utf8');
const sql=fs.readFileSync(new URL('../supabase/migrations/20261027170000_dic_decaf_only_method.sql',import.meta.url),'utf8');
test('fully decaf is distinct from regular and half-caf',()=>{
 assert.equal(C.isFullyDecafName('Colombia Decaf'),true);
 assert.equal(C.isFullyDecafName('Colombia Half-Caf Blend'),false);
 assert.equal(C.isFullyDecafName('Regular Colombia'),false);
 assert.deepEqual(C.DECAFFEINATION_METHODS,['Water Process','Sugar Process','Carbon Dioxide (CO2)']);
});
test('source preview, correction form and read-only details share method field',()=>{
 assert.ok(autofillFields.some(([key])=>key==='decaffeination_method'));
 assert.equal(coffeeSourceDifferences({decaffeination_method:'Sugar Process'},{decaffeination_method:''}).find(x=>x.key==='decaffeination_method')?.submitted,'Sugar Process');
 assert.match(ui,/\['Decaffeination Method',c\.decaffeinationMethod\]/);
 assert.match(ui,/normalizeDecafSubmission\(d\)/);
 assert.match(ui,/updateDecafFields\(form\)/);
});
test('hydration displays method only on fully decaffeinated coffee',()=>{
 const sample=[{id:'a',name:'Colombia Decaf',is_decaf:true,decaffeination_method:'Water Process'},{id:'b',name:'Colombia',is_decaf:false,decaffeination_method:'Sugar Process'},{id:'c',name:'Colombia Half-Caf',is_decaf:false,decaffeination_method:'Carbon Dioxide (CO2)'}];
 const base={preferences:{},setups:[],versions:[],workspaceCoffees:[],submissions:[],shots:[],families:[],recipes:[]};
 const raw={...base,library:sample.map(x=>({id:x.id,coffee_id:x.id,created_at:'2026-10-27T00:00:00Z'})),coffees:sample};
 const coffees=hydrate(raw).coffees;
 assert.equal(coffees.find(x=>x.id==='a')?.decaffeinationMethod,'Water Process');
 assert.equal(coffees.find(x=>x.id==='b')?.decaffeinationMethod,'');
 assert.equal(coffees.find(x=>x.id==='c')?.decaffeinationMethod,'');
});
test('canonical SQL is staged and refuses duplicate/cross-member overwrites',()=>{
 assert.match(sql,/dic_coffee_first_entry/);
 assert.match(sql,/first_submission_id=new\.id/);
 assert.match(sql,/coffee_decaffeination_only_when_decaf_check/);
 assert.match(sql,/revoke all on function/);
});
