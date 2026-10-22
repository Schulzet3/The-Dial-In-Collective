import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shotCard} from '../site/cloud/shot_card.js';
import {Outbox} from '../site/cloud/outbox.js';

const sampleShot={
 id:'9f161ab1-9781-4f69-ac17-12184e090bc4',timestamp:'2026-10-21T19:00:00Z',
 doseG:18,yieldG:36,timeS:28,grindSetting:5.5,tempC:null,style:'Traditional',
 tasteScales:{extraction:3,body:3,clarity:3,sweetness:3,astringency:3},
 notes:'Saved personal note',dialedIn:true,setupVersionId:'version',
 snapshot:{setupName:'Personal Setup',basketDoseG:18,tempUnit:'F'},revision:7
};
test('Hide Shot appears only in expanded synced personal shot details',()=>{
 const html=shotCard(sampleShot,{expanded:true,activeVersionId:'version'});
 assert.match(html,/data-action="hide-shot"/);
 assert.match(html,/Hide Shot/);
 assert.match(html,/data-action="edit"/);
 assert.match(html,/data-action="make-current"/);
 assert.doesNotMatch(shotCard(sampleShot,{expanded:false}),/data-action="hide-shot"/);
 assert.doesNotMatch(shotCard({...sampleShot,cloudPending:true},{expanded:true}),/data-action="hide-shot"/);
});
test('hide handler confirms and dispatches an owner revision guarded action without purge',()=>{
 const source=readFileSync(new URL('../site/cloud/main.js',import.meta.url),'utf8');
 const start=source.indexOf("if(a==='hide-shot')");
 const end=source.indexOf("if(a==='edit')",start);
 assert.ok(start>=0&&end>start);
 const action=source.slice(start,end);
 assert.match(action,/!navigator\.onLine\|\|this\.syncState==='offline'\|\|this\.pending\.length/);
 assert.match(action,/!x\.hidden&&!x\.cloudPending/);
 assert.match(action,/Number\.isSafeInteger\(Number\(sh\.revision\)\)/);
 assert.match(action,/globalThis\.confirm\?\.\('Hide this shot from your personal history/);
 assert.match(action,/this\.mutate\('hide_shot',\{id,expected_revision:Number\(sh\.revision\)\},\{onlineOnly:true\}\)/);
 assert.doesNotMatch(action,/delete_shot|purge|\.splice\(/);
});
test('hide revision conflict is durable, not silently retried or leaked cross-account',async()=>{
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
 await outbox.enqueue('hide_shot',{id:sampleShot.id,expected_revision:7});
 owner='member-B';assert.equal((await outbox.pending()).length,0);
 owner='member-A';assert.equal((await outbox.flush()).state,'conflict');
 assert.equal(sent,1);assert.equal(acked,0);
 const pending=await outbox.pending();
 assert.equal(pending.length,1);assert.equal(pending[0].status,'conflict');
 assert.equal((await outbox.flush()).state,'conflict');
 assert.equal(sent,1,'conflicted mutation must not silently repeat');
});