import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shotCard} from '../site/cloud/shot_card.js';
import {Outbox,ACTIONS} from '../site/cloud/outbox.js';
import {CloudError} from '../site/cloud/client.js';

const sampleShot={
 id:'9f161ab1-9781-4f69-ac17-12184e090bc4',timestamp:'2026-10-21T19:00:00Z',
 doseG:18,yieldG:36,timeS:28,grindSetting:5.5,tempC:null,style:'Traditional',
 tasteScales:{extraction:3,body:3,clarity:3,sweetness:3,astringency:3},
 notes:'Saved personal note',dialedIn:true,setupVersionId:'version',
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