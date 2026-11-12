// #2258: explicit per-device approval-alert consent; no Admin push subscription is touched.
const WORKER='/member-approval/sw.js',SCOPE='/member-approval/';
const keyBytes=value=>{
 const normalized=String(value||'').replace(/-/g,'+').replace(/_/g,'/');
 const binary=globalThis.atob(normalized+'='.repeat((4-normalized.length%4)%4));
 const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
 if(bytes.length!==65||bytes[0]!==4)throw Error('Approval notification public key unavailable.');
 return bytes;
};
function supported(){
 return !!(globalThis.isSecureContext&&globalThis.Notification&&
  globalThis.navigator?.serviceWorker&&globalThis.PushManager);
}
function installed(){
 const ua=String(globalThis.navigator?.userAgent||'');
 return !/iPhone|iPad|iPod/i.test(ua)||
  globalThis.navigator?.standalone===true||
  globalThis.matchMedia?.('(display-mode: standalone)')?.matches===true;
}
async function currentSubscription(){
 if(!globalThis.navigator?.serviceWorker)return null;
 const registration=await globalThis.navigator.serviceWorker.getRegistration(SCOPE);
 return await registration?.pushManager?.getSubscription()||null;
}
export async function approvalPushEnabled(client){
 if(!supported()||globalThis.Notification.permission!=='granted')return false;
 const subscription=await currentSubscription();
 if(!subscription)return false;
 // Device subscription alone is not proof that this signed-in account owns it.
 const result=await client.approvalPush({op:'status',endpoint:subscription.endpoint});
 return result?.ok===true&&result.subscribed===true;
}
export async function enableApprovalPush(client){
 if(!supported())throw Error('Push alerts need a supported secure Home Screen app.');
 if(!installed())throw Error('On iPhone, add Dial In to your Home Screen and open it there to enable approval push notifications.');
 // Keep permission request immediately inside the user tap, before the first network await.
 const permission=globalThis.Notification.permission==='granted'?'granted':
  await globalThis.Notification.requestPermission();
 if(permission!=='granted')throw Error('Allow notifications in your phone settings to enable approval alerts.');
 const [key,registration]=await Promise.all([
  client.approvalPush({op:'key'}),
  globalThis.navigator.serviceWorker.register(WORKER,{scope:SCOPE})
 ]);
 if(!key?.ok||!registration?.pushManager)throw Error('Approval push service is unavailable.');
 const vapid=keyBytes(key.publicKey);
 let sub=await registration.pushManager.getSubscription();
 const existing=sub?.options?.applicationServerKey;
 if(sub&&existing&&String([...new Uint8Array(existing)])!==String([...vapid])){
  await sub.unsubscribe();sub=null;
 }
 const created=!sub;
 if(!sub)sub=await registration.pushManager.subscribe({
  userVisibleOnly:true,applicationServerKey:vapid});
 try{
  const result=await client.approvalPush({op:'subscribe',endpoint:sub.endpoint});
  if(result?.ok!==true||result.subscribed!==true)throw Error('Server did not accept the device.');
 }catch(error){if(created)await sub.unsubscribe().catch(()=>{});throw error;}
 return 'Approval push alerts enabled for this device. You can receive your approval alert while the app is closed.';
}
export async function disableApprovalPush(client){
 const sub=await currentSubscription();
 if(!sub)return 'No approval push subscription is active on this device.';
 let removedFromServer=false;
 try{
  const result=await client.approvalPush({op:'unsubscribe',endpoint:sub.endpoint});
  removedFromServer=result?.ok===true;
 }catch{/* Device opt-out must still work when offline/server unavailable. */}
 if(!(await sub.unsubscribe()))throw Error('Could not disable this device subscription.');
 return removedFromServer?'Approval push alerts disabled.':
  'Approval alerts disabled on this device. Server cleanup will follow when the old endpoint expires.';
}
