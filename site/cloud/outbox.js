import {CloudError} from './client.js';
import {patchAcknowledgement} from './cache.js';
export const ACTIONS=new Set(['create_setup','save_preferences','submit_coffee','add_verified_coffee','save_shot','hide_shot','select_setup','set_style','save_setup_settings','make_current','rename_setup','confirm_coffee_existing']);
export class Outbox {
 constructor({store,remote,identity,uuid=()=>crypto.randomUUID(),now=()=>new Date().toISOString(),notify=()=>{}}){Object.assign(this,{store,remote,identity,uuid,now,notify});this.running=null;}
 async enqueue(action,payload){
  if(!ACTIONS.has(action))throw new CloudError('Unsupported cloud action.','unsupported_action');
  const who=await this.identity();if(!who?.id)throw new CloudError('Sign in first.','signed_out');
  const event={owner:who.id,id:this.uuid(),action,payload:structuredClone(payload),createdAt:this.now(),status:'pending'};
  await this.store.put(event);this.notify({state:'pending'});return event;
 }
 async pending(){const who=await this.identity();return who?.id?(await this.store.list(who.id)):[];}
 async flush(){if(this.running)return this.running;this.running=this.run().finally(()=>this.running=null);return this.running;}
 async run(){
  const who=await this.identity();if(!who?.id)return {state:'signed_out'};let sent=0;
  for(const event of await this.store.list(who.id)){
   if((await this.identity())?.id!==who.id)return {state:'account_changed',sent};
   if(['conflict','rejected'].includes(event.status))return {state:event.status,sent};
   let r;
   try{r=await this.remote.mutate(event);}catch(error){
    const rejected=['22023','23514','23503','23505','23502','42501'].includes(error.code);
    if(rejected)await this.store.put({...event,status:'rejected',error:{code:error.code,message:error.message}});
    const result={state:rejected?'rejected':'offline',sent};this.notify(result);return result;
   }
   if(!r?.ok){const state=r?.code==='conflict'?'conflict':'rejected';await this.store.put({...event,status:state,result:r});this.notify({state});return {state,sent};}
   // A lost response is retried with the SAME immutable mutation ID + payload.
   await this.store.acknowledge(event,r);sent++;
  }
  if((await this.identity())?.id!==who.id)return {state:'account_changed',sent};
  const result={state:'synced',sent,at:this.now()};this.notify(result);return result;
 }
}
export class IndexedStore {
 constructor(idb=globalThis.indexedDB){this.idb=idb;this.promise=null;}
 db(){return this.promise ||= new Promise((resolve,reject)=>{
  if(!this.idb)return reject(new CloudError('Offline storage is unavailable. No change was queued.','storage_unavailable'));
  const r=this.idb.open('dic_cloud_owner_test_v1',1);
  r.onupgradeneeded=()=>{r.result.createObjectStore('events',{keyPath:['owner','id']});r.result.createObjectStore('receipts',{keyPath:['owner','id']});r.result.createObjectStore('meta');r.result.createObjectStore('cache');};
  r.onerror=()=>reject(r.error);r.onsuccess=()=>resolve(r.result);
 });}
 async transaction(stores,fn){const db=await this.db();return new Promise((resolve,reject)=>{const tx=db.transaction(stores,'readwrite');fn(tx);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new CloudError('Local write was interrupted.','storage_failed'));});}
 put(event){return this.transaction(['events','meta'],tx=>{const events=tx.objectStore('events'),meta=tx.objectStore('meta');const exists=events.get([event.owner,event.id]);exists.onsuccess=()=>{if(exists.result){events.put({...event,sequence:exists.result.sequence});return;}const r=meta.get('sequence');r.onsuccess=()=>{const sequence=(r.result||0)+1;meta.put(sequence,'sequence');events.put({...event,sequence});};};});}
 async list(owner){const db=await this.db();return new Promise((resolve,reject)=>{const r=db.transaction('events').objectStore('events').getAll();r.onerror=()=>reject(r.error);r.onsuccess=()=>resolve(r.result.filter(e=>e.owner===owner).sort((a,b)=>a.sequence-b.sequence));});}
 acknowledge(event,result){return this.transaction(['events','receipts','cache'],tx=>{tx.objectStore('receipts').put({owner:event.owner,id:event.id,event:structuredClone(event),result,at:new Date().toISOString()});const cache=tx.objectStore('cache'),r=cache.get(event.owner);r.onsuccess=()=>{if(r.result)cache.put({...r.result,snapshot:patchAcknowledgement(r.result.snapshot,event,result),needsRefresh:true},event.owner);};tx.objectStore('events').delete([event.owner,event.id]);});}
 async readCache(owner){const db=await this.db();return new Promise((resolve,reject)=>{const r=db.transaction('cache').objectStore('cache').get(owner);r.onerror=()=>reject(r.error);r.onsuccess=()=>resolve(r.result||null);});}
 saveCache(owner,snapshot){return this.transaction(['cache'],tx=>tx.objectStore('cache').put({owner,snapshot:structuredClone(snapshot),at:new Date().toISOString()},owner));}
 async export(owner){const cache=await this.readCache(owner),pending=await this.list(owner),db=await this.db();const receipts=await new Promise((resolve,reject)=>{const r=db.transaction('receipts').objectStore('receipts').getAll();r.onerror=()=>reject(r.error);r.onsuccess=()=>resolve(r.result.filter(e=>e.owner===owner));});return {app:'The Dial In Collective',format:'cloud-owner-test',exportedAt:new Date().toISOString(),cache,pending,receipts};}
}
