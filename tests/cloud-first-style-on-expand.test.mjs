import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rawFixture,rawShot,OWNER} from './cloud-fixtures/raw.js';
import {hydrate} from '../site/cloud/mapping.js';
import {suggestedStyle} from '../site/lib/engine.js';
const source=readFileSync(new URL('../site/cloud/main.js',import.meta.url),'utf8');
const sql=readFileSync(new URL('../supabase/migrations/20261022053000_dic_first_coffee_style_prompt.sql',import.meta.url),'utf8');
const idb=readFileSync(new URL('../site/cloud/outbox.js',import.meta.url),'utf8');
globalThis.document={querySelector:()=>({}),createElement:()=>({setAttribute(){},addEventListener(){},replaceChildren(){}}),body:{append(){}}};
const {CloudApp}=await import('../site/cloud/main.js');
delete globalThis.document;
test('first-shot suggestion absent from Add Coffee and appears until first logged shot',()=>{
 const add=source.slice(source.indexOf('showAdd(){'),source.indexOf('async finishCoffeeAdd('));
 assert.doesNotMatch(add,/Recommended for you|Starting Shot Style|starting_style/);
 assert.match(source,/async expandCoffee\(id\)/);
 assert.match(source,/firstStyle=!s\.shots\.some\(sh=>sh\.coffeeId===c\.id\)/);
 assert.match(source,/Recommended for you:/);
 assert.match(source,/first-shot-log/);
 assert.doesNotMatch(source,/this\.expanded\.add\(lid\)/);
});
test('legacy first view storage and SQL remain compatible with older clients',()=>{
 assert.match(idb,/first-style:'\+owner\+':'\+libraryId/);
 assert.match(idb,/pendingFirstStylePrompts\(owner\)/);
 assert.match(idb,/acknowledgeFirstStylePrompt\(owner,libraryId\)/);
 assert.doesNotMatch(source,/syncFirstStylePrompts|firstStylePromptId|firstStyleClaimInFlight|claimFirstStylePrompt/);
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
function appFor(raw=rawFixture(),claims={count:0}){
 const app=new CloudApp({
  async claimFirstStylePrompt(){claims.count++;throw Error('legacy RPC must not gate guidance');},
  async recommendationCommunityEvidence(){return [];}
 },{
  async claimFirstStylePrompt(){claims.count++;throw Error('legacy local claim must not gate guidance');}
 });
 app.identity={id:OWNER};app.status={admitted:true};app.raw=raw;app.state=hydrate(raw);
 app.render=()=>{};app.inSession=async fn=>fn();
 return app;
}

test('zero-shot guidance remains on reopen and reload without local or server claims',async()=>{
 const claims={count:0},id=rawFixture().library[0].id;
 const app=appFor(rawFixture(),claims);
 await app.expandCoffee(id);
 assert.match(app.coffees(),/Recommended for you:/);
 assert.match(app.coffees(),/Starting Shot Style/);
 assert.match(app.coffees(),/Log First Shot/);
 await app.expandCoffee(id);
 assert.doesNotMatch(app.coffees(),/Recommended for you:/);
 await app.expandCoffee(id);
 assert.match(app.coffees(),/Recommended for you:/);
 const reloaded=appFor(rawFixture(),claims);
 await reloaded.expandCoffee(id);
 assert.match(reloaded.coffees(),/Recommended for you:/);
 assert.equal(claims.count,0);
});

test('logged shot replaces guidance with normal controls, even if later hidden',async()=>{
 const raw=rawFixture(),id=raw.library[0].id,app=appFor(raw);
 await app.expandCoffee(id);
 assert.match(app.coffees(),/Log First Shot/);
 app.state=hydrate({...raw,shots:[rawShot()]});
 assert.doesNotMatch(app.coffees(),/Recommended for you:/);
 assert.doesNotMatch(app.coffees(),/Starting Shot Style/);
 assert.match(app.coffees(),/Log A Shot/);
 app.state.shots[0].hidden=true;
 assert.doesNotMatch(app.coffees(),/Recommended for you:/);
 assert.match(app.coffees(),/Starting Recommendation/);
});
