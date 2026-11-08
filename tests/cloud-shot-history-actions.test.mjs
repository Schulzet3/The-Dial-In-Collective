import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shotCard} from '../site/cloud/shot_card.js';
import {Outbox,ACTIONS} from '../site/cloud/outbox.js';

const sampleShot={
 id:'9f161ab1-9781-4f69-ac17-12184e090bc4',timestamp:'2026-10-21T19:00:00Z',
 doseG:18,yieldG:36,timeS:28,grindSetting:5.5,tempC:null,style:'Traditional',
 tasteScales:{extraction:3,body:3,clarity:5,sweetness:5,astringency:1},
 notes:'Saved personal note',dialedIn:true,setupVersionId:'version',familyId:'family-1',
 snapshot:{setupName:'Personal Setup',basketDoseG:18,tempUnit:'F'},revision:7
};
test('Shot History exposes Edit and Make Current, never Hide Shot',()=>{
 const html=shotCard(sampleShot,{expanded:true,activeVersionId:'version'});
 assert.match(html,/data-action="edit"/);
 assert.match(html,/data-action="make-current"/);
 for(const rendered of [
   html,
   shotCard(sampleShot,{expanded:false,activeVersionId:'version'}),
   shotCard({...sampleShot,cloudPending:true},{expanded:true,activeVersionId:'version'})
 ]) {
   assert.doesNotMatch(rendered,/hide-shot|Hide Shot|history-hide/i);
 }
});
test('personal client has no Hide Shot click route or hide mutation',()=>{
 const source=readFileSync(new URL('../site/cloud/main.js',import.meta.url),'utf8');
 const card=readFileSync(new URL('../site/cloud/shot_card.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/if\(a==='hide-shot'\)/);
 assert.doesNotMatch(source,/this\.mutate\('hide_shot'/);
 assert.doesNotMatch(card,/hide-shot|Hide Shot|history-hide/i);
});
test('legacy already-queued hide mutation remains account isolated and conflict safe',async()=>{
 let owner='member-A',sent=0,acked=0;
 const saved=[];
 const store={
  async put(e){const index=saved.findIndex(x=>x.owner===e.owner&&x.id===e.id);if(index>=0)saved[index]=structuredClone(e);else saved.push(structuredClone(e));},
  async list(id){return structuredClone(saved.filter(e=>e.owner===id));},
  async acknowledge(){acked++;}
 };
 const outbox=new Outbox({store,identity:()=>({id:owner}),uuid:()=> 'hide-event-1',
  now:()=> '2026-10-21T20:00:00Z',
  remote:{async mutate(event){sent++;assert.equal(event.action,'hide_shot');assert.equal(event.payload.expected_revision,7);return {ok:false,code:'conflict',revision:8};}}
 });
 assert.equal(ACTIONS.has('hide_shot'),false,'new obsolete hide events must be refused');
 await assert.rejects(outbox.enqueue('hide_shot',{id:sampleShot.id,expected_revision:7}),{code:'unsupported_action'});
 // Existing old-device events remain readable, rejectable, and exportable.
 await store.put({owner:'member-A',id:'hide-event-1',action:'hide_shot',payload:{id:sampleShot.id,expected_revision:7},status:'pending',createdAt:'2026-10-21T20:00:00Z'});
 owner='member-B';assert.equal((await outbox.pending()).length,0);
 owner='member-A';assert.equal((await outbox.flush()).state,'conflict');
 assert.equal(sent,1);assert.equal(acked,0);
 const pending=await outbox.pending();
 assert.equal(pending.length,1);assert.equal(pending[0].status,'conflict');
 assert.equal((await outbox.flush()).state,'conflict');
 assert.equal(sent,1,'conflicted mutation must not silently repeat');
});
test('mobile Shot History summary wraps rather than clipping Grind and keeps the card readable',()=>{
 const css=readFileSync(new URL('../site/visual.css',import.meta.url),'utf8');
 const card=shotCard({...sampleShot,grindSetting:1,tempC:89},{expanded:true,activeVersionId:'version'});
 assert.match(card,/Grind 1\.0/);
 assert.match(card,/class="shot-numbers"/);
 assert.match(card,/class="shot-record-context"/);
 assert.match(css,/\.shot-numbers\{[^}]*overflow:visible;white-space:normal;overflow-wrap:anywhere/);
 assert.match(css,/\.shot-topline\{display:grid;grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/\.shot-body \.taste-chip\{[^}]*max-width:100%;white-space:normal/);
 assert.match(css,/\.shot-body \.radar\{[^}]*max-width:100%/);
});

test('shot history summary preserves desktop one-row date while narrow cards can wrap',()=>{
 const css=readFileSync(new URL('../site/visual.css',import.meta.url),'utf8');
 assert.match(css,/@media\(min-width:700px\)\{\s*\.shot-topline\{grid-template-columns:minmax\(0,1fr\) auto;align-items:baseline/);
 assert.match(css,/\.shot-topline \.shot-date\{justify-self:end;white-space:nowrap/);
 assert.match(css,/\.shot-numbers\{[^}]*overflow:visible;white-space:normal/);
});


test('#455 history does not call incomplete or nonideal archived taste a Dialed In recipe',()=>{
 const ideal=sampleShot.tasteScales;
 const cases=[
  {extraction:3,body:3,clarity:null,sweetness:5,astringency:1},
  {extraction:3,body:3,clarity:5,sweetness:4,astringency:1},
  {extraction:'3',body:3,clarity:5,sweetness:5,astringency:1},
  {extraction:3,body:3,clarity:5,astringency:1},
 ];
 for(const tasteScales of cases){
  const archived={...sampleShot,tasteScales,notes:'Original private historical note'};
  const original=structuredClone(archived);
  const html=shotCard(archived,{expanded:true,activeVersionId:'version'});
  assert.doesNotMatch(html,/<span class="status-badge">Dialed In/);
  assert.doesNotMatch(html,/data-action="make-current"/);
  assert.match(html,/data-action="edit"/);
  assert.match(html,/Original private historical note/);
  assert.deepEqual(archived,original,'render never rewrites historical ratings or notes');
 }
 const unflagged={...sampleShot,tasteScales:ideal,dialedIn:false};
 const html=shotCard(unflagged,{expanded:true,activeVersionId:'version'});
 assert.doesNotMatch(html,/<span class="status-badge">Dialed In/);
 assert.doesNotMatch(html,/data-action="make-current"/);
});

test('#455 genuine five-green shot keeps Make Current for its version, never pending or other-version',()=>{
 const record=structuredClone(sampleShot);
 const same=shotCard(record,{expanded:true,activeVersionId:'version'});
 assert.match(same,/<span class="status-badge">Dialed In/);
 assert.match(same,/data-action="make-current"/);
 const otherVersion=shotCard(record,{expanded:true,activeVersionId:'other-version'});
 assert.match(otherVersion,/<span class="status-badge">Dialed In/);
 assert.doesNotMatch(otherVersion,/data-action="make-current"/);
 const pending=shotCard({...record,cloudPending:true},{expanded:true,activeVersionId:'version'});
 assert.match(pending,/Pending Sync/);
 assert.doesNotMatch(pending,/data-action="make-current"/);
 assert.deepEqual(record,sampleShot);
});
