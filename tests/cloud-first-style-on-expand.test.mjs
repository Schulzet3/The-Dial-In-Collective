import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rawFixture,OWNER} from './cloud-fixtures/raw.js';
import {hydrate} from '../site/cloud/mapping.js';
import {suggestedStyle} from '../site/lib/engine.js';
const source=readFileSync(new URL('../site/cloud/main.js',import.meta.url),'utf8');
const sql=readFileSync(new URL('../supabase/migrations/20261022053000_dic_first_coffee_style_prompt.sql',import.meta.url),'utf8');
const idb=readFileSync(new URL('../site/cloud/outbox.js',import.meta.url),'utf8');
globalThis.document={querySelector:()=>({}),createElement:()=>({setAttribute(){},addEventListener(){},replaceChildren(){}}),body:{append(){}}};
const {CloudApp}=await import('../site/cloud/main.js');
delete globalThis.document;
test('first-shot suggestion absent from Add Coffee and appears only on intentional expansion',()=>{
 const add=source.slice(source.indexOf('showAdd(){'),source.indexOf('async finishCoffeeAdd('));
 assert.doesNotMatch(add,/Recommended for you|Starting Shot Style|starting_style/);
 assert.match(source,/async expandCoffee\(id\)/);
 assert.match(source,/firstStylePromptId===c.id&&shots.length===0/);
 assert.match(source,/Recommended for you:/);
 assert.match(source,/first-shot-log/);
 assert.doesNotMatch(source,/this\.expanded\.add\(lid\)/);
});
test('owner-scoped first view is durable once across reloads and devices',()=>{
 assert.match(idb,/first-style:'\+owner\+':'\+libraryId/);
 assert.match(sql,/primary key\(owner_id,library_entry_id\)/);
 assert.match(sql,/private\.require_member\(\)/);
 assert.match(sql,/on conflict\(owner_id,library_entry_id\) do nothing/);
 assert.match(sql,/grant execute on function public\.dic_claim_first_style_prompt\(uuid\) to authenticated/);
 assert.doesNotMatch(sql,/grant (?:insert|update|delete) on table .* to authenticated/);
});
test('user style choice drives first shot while coffee facts remain shared only as coffee',()=>{
 assert.equal(suggestedStyle({roastLevel:'Light'},'floral clarity').style,'Turbo');
 assert.equal(suggestedStyle({roastLevel:'Dark'},'body texture').style,'Traditional');
 assert.match(source,/E\.prefill\(this\.state,cid,styleOverride\?\{style:styleOverride\}:\{\}\)/);
 assert.match(source,/E\.recommendation\(this\.state,cid,styleOverride\?\{style:styleOverride\}:\{\}\)/);
 assert.match(source,/this\.mutate\('set_style',\{setup_id:setup\.id,setup_version_id:version\.id,library_entry_id:id,style,expected_revision:rev\}/);
});
test('only the first owner expansion shows the guidance; later opens do not',async()=>{
 const raw=rawFixture(),id=raw.library[0].id,seen=new Set();let remote=0;
 const app=new CloudApp({async claimFirstStylePrompt(){remote++;return {ok:true,show:remote===1};}},{
  async claimFirstStylePrompt(owner,lid){const key=owner+':'+lid;if(seen.has(key))return false;seen.add(key);return true;}
 });
 app.identity={id:OWNER};app.status={admitted:true};app.raw=raw;app.state=hydrate(raw);
 app.state.shots=app.state.shots.filter(x=>x.coffeeId!==id);
 app.render=()=>{};app.inSession=async fn=>fn();
 await app.expandCoffee(id);assert.equal(app.firstStylePromptId,id);
 await app.expandCoffee(id);assert.equal(app.firstStylePromptId,null);
 await app.expandCoffee(id);assert.equal(app.firstStylePromptId,null);
 assert.equal(remote,2);
});
