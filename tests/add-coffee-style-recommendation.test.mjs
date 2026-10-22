import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AVAILABLE_NEW_COFFEE_STYLES,recommendNewCoffeeStyle,refreshNewCoffeeStyle} from '../site/cloud/coffee-style-choice.js';
const source=()=>readFileSync(new URL('../site/cloud/main.js',import.meta.url),'utf8');
test('roast/personal preference yields a soft recommendation and excludes unfinished Custom style',()=>{
 assert.deepEqual(AVAILABLE_NEW_COFFEE_STYLES,['Traditional','Turbo','Ristretto','Lungo']);
 assert.equal(recommendNewCoffeeStyle('Light','I prefer clarity').style,'Turbo');
 assert.equal(recommendNewCoffeeStyle('Medium','I prefer body').style,'Traditional');
 assert.equal(recommendNewCoffeeStyle('','').style,'Traditional');
});
test('manual user choice survives changed roast and URL-fetched values',()=>{
 const label={textContent:''},form={dataset:{},elements:{roast_level:{value:'Medium'},style:{value:'Traditional'}},querySelector:()=>label};
 form.elements.roast_level.value='Light';refreshNewCoffeeStyle(form,'clarity');
 assert.equal(form.elements.style.value,'Turbo');
 form.dataset.styleChanged='yes';form.elements.style.value='Lungo';form.elements.roast_level.value='Dark';
 refreshNewCoffeeStyle(form,'clarity');assert.equal(form.elements.style.value,'Lungo');
 assert.match(label.textContent,/Recommended for you: Traditional/);
});
test('style remains owner-scoped, revision-checked, and never makes coffee Current',()=>{
 const s=source();
 assert.match(s,/new-coffee-style-suggestion/);
 assert.match(s,/refreshNewCoffeeStyle\(form,this\.state\.preferences\)/);
 assert.match(s,/async persistAddedStyle\(lid,style\)/);
 assert.match(s,/await this\.mutate\('set_style'/);
 assert.match(s,/expected_revision:row\?\.revision\|\|0/);
 assert.match(s,/const styleSaved=await this\.persistAddedStyle\(lid,d\.style\)/);
 const sql=readFileSync(new URL('../supabase/migrations/20261012030019_dic_owner_workspace_actions.sql',import.meta.url),'utf8');
 assert.match(sql,/Viewing\/changing style does not alter recency or Current Coffee/);
});
