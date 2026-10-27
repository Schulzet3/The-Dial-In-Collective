import {CloudError,isAccessDenied} from './client.js';
import {patchAcknowledgement} from './cache.js';
export const ACTIONS=new Set(['create_setup','save_preferences','submit_coffee','add_verified_coffee','save_shot','select_setup','set_style','save_setup_settings','make_current','rename_setup','confirm_coffee_existing']);
// Only provably independent, fully identified operations can pass a held
// change. All other pairs preserve queue order and original idempotency keys.
export function independentMutations(held,event){
 if(!held||!event)return false;
 const a=held.payload||{},b=event.payload||{};
 if(held.action==='save_shot'&&event.action==='save_shot')
  return typeof a.id==='string'&&!!a.id&&typeof b.id==='string'&&!!b.id&&a.id!==b.id
    &&!!b.setup_version_id&&!!b.library_entry_id;
 if(held.action==='save_shot'&&event.action==='save_preferences')return true;
 if(held.action==='save_preferences'&&event.action==='save_shot')
  return !!b.id&&!!b.setup_version_id&&!!b.library_entry_id;
 return false;
}
function stoppedWithAccess(state,sent,notify,who){
 const result={state,sent,accessDenied:true};notify({...result,owner:who.id,sessionEpoch:who.sessionEpoch??null});return result;
}
export class Outbox {
 constructor({store,remote,identity,uuid=()=>crypto.randomUUID(),now=()=>new Date().toISOString(),notify=()=>{}}){Object.assign(this,{store,remote,identity,uuid,now,notify});this.runningBySession=new Map();}
 async enqueue(action,payload){
  if(!ACTIONS.has(action))throw new CloudError('Unsupported cloud action.','unsupported_action');
  const who=await this.identity();if(!who?.id)throw new CloudError('Sign in first.','signed_out');
  const event={owner:who.id,id:this.uuid(),action,payload:structuredClone(payload),createdAt:this.now(),status:'pending'};
  await this.store.put(event);this.notify({state:'pending',owner:who.id,sessionEpoch:who.sessionEpoch??null});return event;
 }
 async pending(){const who=await this.identity();return who?.id?(await this.store.list(who.id)):[];}
 async flush(){
  const who=await this.identity();if(!who?.id)return {state:'signed_out'};
  // A stalled prior member/session cannot hold the next signed-in member's
  // durable queue. Session epoch also distinguishes a reauthenticated owner.
  const key=JSON.stringify([who.id,who.sessionEpoch??null]);
  if(this.runningBySession.has(key))return this.runningBySession.get(key);
  const task=this.run(who).finally(()=>{
   if(this.runningBySession.get(key)===task)this.runningBySession.delete(key);
  });
  this.runningBySession.set(key,task);return task;
 }
 async run(who){
  const matches=async()=>{const active=await this.identity();return active?.id===who.id&&
   (who.sessionEpoch==null||active?.sessionEpoch===who.sessionEpoch);};
  if(!(await matches()))return {state:'account_changed',sent:0};
  let sent=0;const held=[];
  const stopped=state=>{const result={state,sent};this.notify({...result,owner:who.id,sessionEpoch:who.sessionEpoch??null});return result;};
  for(const event of await this.store.list(who.id)){
   if(!(await matches()))return {state:'account_changed',sent};
   if(['conflict','rejected'].includes(event.status)){
    if(isAccessDenied(event.error||event.result))return {state:event.status,sent,accessDenied:true,recheckAccess:true};
    held.push(event);
    continue;
   }
   // A known invalid/conflicted mutation cannot be replayed. A different shot
   // may still sync, but setup, coffee, recipe and revision dependencies stay held.
   // Unknown/legacy actions fail closed rather than being silently re-ordered.
   if(held.some(previous=>!independentMutations(previous,event)))continue;
   let r;
   try{r=await this.remote.mutate(event);}catch(error){
    const accessDenied=isAccessDenied(error);
    const rejected=accessDenied||['22023','23514','23503','23505','23502'].includes(error.code);
    if(rejected){
     try{await this.store.put({...event,status:'rejected',error:{code:error.code,message:error.message,status:error.status}});}
     catch(storageError){
      if(!accessDenied)throw storageError;
     }
    }
    if(accessDenied)return stoppedWithAccess('rejected',sent,this.notify,who);
    if(!rejected)return stopped('offline');
    held.push(event);continue;
   }
   if(!r?.ok){
    const state=r?.code==='conflict'?'conflict':'rejected';
    await this.store.put({...event,status:state,result:r});
    held.push({...event,status:state,result:r});
    continue;
   }
   // Lost responses always retain their original mutation ID for safe retries.
   await this.store.acknowledge(event,r);sent++;
  }
  if(!(await matches()))return {state:'account_changed',sent};
  const state=held.some(event=>event.status==='conflict'||event.result?.code==='conflict')?'conflict':held.length?'rejected':'synced';
  const result={state,sent,at:this.now()};this.notify({...result,owner:who.id,sessionEpoch:who.sessionEpoch??null});return result;
 }
}
export class IndexedStore {
 constructor(idb=globalThis.indexedDB){this.idb=idb;this.promise=null;}
 db(){
  if(this.promise)return this.promise;
  // A temporary IndexedDB open failure must not permanently poison offline
  // storage for the lifetime of the tab. Keep the existing database name
  // unchanged to preserve every user's queued events and receipts.
  const opening=new Promise((resolve,reject)=>{
   if(!this.idb)return reject(new CloudError('Offline storage is unavailable. No change was queued.','storage_unavailable'));
   let request;
   try{request=this.idb.open('dic_cloud_owner_test_v1',1);}
   catch(error){reject(error);return;}
   request.onupgradeneeded=()=>{const db=request.result;
    for(const [name,options] of [['events',{keyPath:['owner','id']}],['receipts',{keyPath:['owner','id']}],['meta',undefined],['cache',undefined]]){
     if(!db.objectStoreNames.contains(name))db.createObjectStore(name,options);
    }
   };
   request.onerror=()=>reject(request.error);
   request.onblocked=()=>reject(new CloudError('Offline storage is blocked by another open app tab. Close old tabs and retry.','storage_blocked'));
   request.onsuccess=()=>resolve(request.result);
  });
  this.promise=opening.catch(error=>{this.promise=null;throw error;});
  return this.promise;
 }
 async transaction(stores,fn){
  const db=await this.db();
  return new Promise((resolve,reject)=>{
   let tx;
   try{
    tx=db.transaction(stores,'readwrite');
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error||new CloudError('Local write failed.','storage_failed'));
    tx.onabort=()=>reject(tx.error||new CloudError('Local write was interrupted.','storage_failed'));
    fn(tx);
   }catch(error){try{tx?.abort();}catch{}reject(error);}
  });
 }
 put(event){return this.transaction(['events','meta'],tx=>{const events=tx.objectStore('events'),meta=tx.objectStore('meta');const exists=events.get([event.owner,event.id]);exists.onsuccess=()=>{if(exists.result){events.put({...event,sequence:exists.result.sequence});return;}const r=meta.get('sequence');r.onsuccess=()=>{const sequence=(r.result||0)+1;meta.put(sequence,'sequence');events.put({...event,sequence});};};});}
 async list(owner){const db=await this.db();return new Promise((resolve,reject)=>{const r=db.transaction('events').objectStore('events').getAll();r.onerror=()=>reject(r.error);r.onsuccess=()=>resolve(r.result.filter(e=>e.owner===owner).sort((a,b)=>a.sequence-b.sequence));});}
 acknowledge(event,result){return this.transaction(['events','receipts','cache'],tx=>{tx.objectStore('receipts').put({owner:event.owner,id:event.id,event:structuredClone(event),result,at:new Date().toISOString()});const cache=tx.objectStore('cache'),r=cache.get(event.owner);r.onsuccess=()=>{if(r.result)cache.put({...r.result,snapshot:patchAcknowledgement(r.result.snapshot,event,result),needsRefresh:true},event.owner);};tx.objectStore('events').delete([event.owner,event.id]);});}
 async readReceipt(owner,id){
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if(typeof owner!=='string'||typeof id!=='string'||!uuid.test(owner)||!uuid.test(id))return null;
  const db=await this.db();
  return new Promise((resolve,reject)=>{
   const request=db.transaction('receipts','readonly').objectStore('receipts').get([owner,id]);
   request.onerror=()=>reject(request.error);
   request.onsuccess=()=>{
    const receipt=request.result;
    resolve(receipt?.owner===owner&&receipt.id===id&&receipt.event?.owner===owner&&receipt.event.id===id?receipt:null);
   };
  });
 }
 async claimFirstStylePrompt(owner,libraryId){
  if(!owner||!libraryId)throw new CloudError('Owner and coffee are required.','invalid_prompt');
  const key='first-style:'+owner+':'+libraryId;let first=false;
  await this.transaction(['meta'],tx=>{
   const store=tx.objectStore('meta'),request=store.get(key);
   request.onsuccess=()=>{if(!request.result){first=true;store.put({seen:true,serverAck:false},key);}};
  });
  return first;
 }
 async pendingFirstStylePrompts(owner){
  if(!owner)return [];
  const db=await this.db(),prefix='first-style:'+owner+':';
  return new Promise((resolve,reject)=>{
   const ids=[],request=db.transaction('meta','readonly').objectStore('meta').openCursor();
   request.onerror=()=>reject(request.error);
   request.onsuccess=()=>{
    const cursor=request.result;if(!cursor){resolve(ids);return;}
    if(typeof cursor.key==='string'&&cursor.key.startsWith(prefix)&&!cursor.value?.serverAck)
     ids.push(cursor.key.slice(prefix.length));
    cursor.continue();
   };
  });
 }
 async acknowledgeFirstStylePrompt(owner,libraryId){
  if(!owner||!libraryId)return;
  const key='first-style:'+owner+':'+libraryId;
  await this.transaction(['meta'],tx=>tx.objectStore('meta').put({seen:true,serverAck:true},key));
 }
 async readCache(owner){const db=await this.db();return new Promise((resolve,reject)=>{const r=db.transaction('cache').objectStore('cache').get(owner);r.onerror=()=>reject(r.error);r.onsuccess=()=>resolve(r.result||null);});}
 saveCache(owner,snapshot){return this.transaction(['cache'],tx=>tx.objectStore('cache').put({owner,snapshot:structuredClone(snapshot),at:new Date().toISOString()},owner));}
 // Fresh server denial revokes cache for that owner; queued events and receipts survive.
 clearCache(owner){return this.transaction(['cache'],tx=>tx.objectStore('cache').delete(owner));}
 async export(owner){const cache=await this.readCache(owner),pending=await this.list(owner),db=await this.db();const receipts=await new Promise((resolve,reject)=>{const r=db.transaction('receipts').objectStore('receipts').getAll();r.onerror=()=>reject(r.error);r.onsuccess=()=>resolve(r.result.filter(e=>e.owner===owner));});return {app:'The Dial In Collective',format:'cloud-owner-test',exportedAt:new Date().toISOString(),cache,pending,receipts};}
}
