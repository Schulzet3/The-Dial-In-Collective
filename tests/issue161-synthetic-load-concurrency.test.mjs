import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {rawFixture,rawShot,OWNER} from './cloud-fixtures/raw.js';
import {hydrate} from '../site/cloud/mapping.js';
import {Outbox} from '../site/cloud/outbox.js';

const TIME='2026-10-20T12:00:00Z';
const seeded=seed=>()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
const pick=(next,a)=>a[Math.floor(next()*a.length)];
class Store{
 constructor(){this.events=[];this.receipts=[];this.seq=0;}
 async put(e){const old=this.events.find(x=>x.owner===e.owner&&x.id===e.id);
  this.events=this.events.filter(x=>x.owner!==e.owner||x.id!==e.id);
  this.events.push({...structuredClone(e),sequence:old?.sequence??++this.seq});}
 async list(owner){return structuredClone(this.events.filter(e=>e.owner===owner).sort((a,b)=>a.sequence-b.sequence));}
 async acknowledge(e,r){this.receipts.push({owner:e.owner,id:e.id,result:r});
  this.events=this.events.filter(x=>x.owner!==e.owner||x.id!==e.id);}
}
function queue(){
 let owner=OWNER,epoch=0,index=0;const store=new Store(),calls=[];
 const remote={async mutate(e){calls.push([e.owner,e.id]);return {ok:true};}};
 const q=new Outbox({store,remote,identity:async()=>owner?{id:owner,sessionEpoch:epoch}:null,
  uuid:()=>('event-'+(++index)),now:()=>TIME});
 return {q,store,remote,calls,swap:v=>{owner=v;epoch++;}};
}
async function within(p,ms=1500){
 let timer;try{return await Promise.race([p,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Stalled owner-scoped synchronization')),ms);})]);}
 finally{clearTimeout(timer);}
}
test('400 queued shots and 20 overlapping flush calls do not duplicate remote mutations',async()=>{
 const {q,store,calls}=queue();const ids=[];
 for(let i=0;i<400;i++)ids.push((await q.enqueue('save_shot',{id:'shot-'+i,setup_version_id:'v',library_entry_id:'c'})).id);
 const results=await Promise.all(Array.from({length:20},()=>q.flush()));
 assert.ok(results.every(x=>x.state==='synced'&&x.sent===400));
 assert.equal(calls.length,400);assert.equal(new Set(calls.map(x=>x[1])).size,400);
 assert.deepEqual(calls.map(x=>x[1]),ids);assert.equal(store.receipts.length,400);
 assert.equal((await q.pending()).length,0);
});
test('stalled previous member cannot delay the replacement account or leak its pending shots',async()=>{
 const {q,store,remote,calls,swap}=queue();
 for(let i=0;i<40;i++)await q.enqueue('save_shot',{id:'old-'+i,setup_version_id:'v',library_entry_id:'c'});
 let release,start;const held=new Promise(resolve=>{release=resolve;}),started=new Promise(resolve=>{start=resolve;});
 remote.mutate=async e=>{calls.push([e.owner,e.id]);if(e.owner===OWNER){start();await held;}return {ok:true};};
 const old=q.flush();await started;swap('different-member');
 await q.enqueue('save_shot',{id:'new',setup_version_id:'v',library_entry_id:'c'});
 try{
  const fresh=await within(q.flush());assert.equal(fresh.state,'synced');assert.equal(fresh.sent,1);
  assert.equal(calls.length,2);assert.equal(calls[1][0],'different-member');
 }finally{release();await old;}
 assert.equal(store.receipts.length,2);
 assert.equal(store.events.filter(x=>x.owner===OWNER).length,39);
 assert.equal((await q.pending()).length,0);
});
test('160 independent shot writes preserve conflicts and never replay held mutations',async()=>{
 const {q,store,calls,remote}=queue();
 for(let n=0;n<160;n++)await q.enqueue('save_shot',{id:'logical-'+n,setup_version_id:'v',library_entry_id:'c'});
 remote.mutate=async e=>{calls.push(e.id);return Number(e.payload.id.split('-').at(-1))%11===0?{ok:false,code:'conflict'}:{ok:true};};
 const conflicts=Array.from({length:160},(_,i)=>i).filter(i=>i%11===0).length,result=await q.flush();
 assert.equal(result.state,'conflict');assert.equal(result.sent,160-conflicts);
 assert.equal(store.events.length,conflicts);assert.equal(store.receipts.length,160-conflicts);
 assert.ok(store.events.every(e=>e.status==='conflict'));
 const before=calls.length;await q.flush();assert.equal(calls.length,before);
});
test('synthetic 600-coffee and 6000-shot load retains historical notes, bags and latest visibility',()=>{
 const raw=rawFixture(),next=seeded(0x161cafe),coffees=600,shots=10;
 raw.library=[];raw.submissions=[];raw.workspaceCoffees=[];raw.shots=[];raw.notes=[];
 for(let c=0;c<coffees;c++){
  const id='coffee-'+c;
  raw.library.push({id,owner_id:OWNER,submission_id:'p-'+c,created_at:TIME});
  raw.submissions.push({id:'p-'+c,proposed_data:{name:'Coffee '+c,roaster:'Synthetic',
   roast_level:pick(next,['Light','Medium','Dark'])}});
  raw.workspaceCoffees.push({setup_version_id:'version',library_entry_id:id,
   selected_style:'Turbo',basket_version_id:'basketv'});
  for(let j=0;j<shots;j++){
   const shotId='shot-'+c+'-'+j;
   raw.shots.push(rawShot({id:shotId,library_entry_id:id,style:j%2?'Traditional':'Turbo',
    pulled_at:'2026-10-'+String(j+1).padStart(2,'0')+'T12:00:00Z',
    hidden_at:j===shots-1?TIME:null,bag_id:j===0?'historic-bag':null}));
   raw.notes.push({shot_id:shotId,notes:'Private synthetic note '+c+' #'+j});
  }
 }
 const frozen=structuredClone(raw),start=performance.now(),s=hydrate(raw),elapsed=performance.now()-start;
 console.log('[Issue161 synthetic load] '+coffees+' coffees '+raw.shots.length+' shots '+Math.round(elapsed)+'ms');
 assert.equal(s.coffees.length,coffees);assert.equal(s.shots.length,coffees*shots);
 assert.deepEqual(s.shots.map(x=>x.id),raw.shots.map(x=>x.id));assert.deepEqual(raw,frozen);
 assert.equal(s.shots.filter(x=>x.suggestion!==undefined).length,coffees*2);
 for(let c=0;c<coffees;c++){
  const first=s.shots[c*shots],last=s.shots[c*shots+shots-1];
  assert.equal(first.bagId,'historic-bag');assert.equal(first.notes,'Private synthetic note '+c+' #0');
  assert.equal(last.suggestion,undefined);
 }
 assert.ok(elapsed<60000,'Synthetic load exceeded 60 seconds on this runner');
});
