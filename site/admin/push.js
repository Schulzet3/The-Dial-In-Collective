// Opt-in Web Push for installed Home Screen apps, with no member details in a push.
const endpoint='/api/admin-push';
const keyBytes=key=>{
 const normalized=String(key||'').replace(/-/g,'+').replace(/_/g,'/');
 const binary=globalThis.atob(normalized+'='.repeat((4-normalized.length%4)%4));
 const bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 if(bytes.length!==65||bytes[0]!==4)throw Error('Push server key is invalid.');
 return bytes;
};
async function authorizedFetch(sdk,method,body){
 const {data,error}=await sdk.auth.getSession();
 const token=data?.session?.access_token;
 if(error||!token)throw Error('Sign in before managing push notifications.');
 let response;
 try{
  response=await globalThis.fetch(endpoint,{method,cache:'no-store',credentials:'same-origin',
   referrerPolicy:'no-referrer',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
   ...(body?{body:JSON.stringify(body)}:{})});
 }catch{throw Error('Push service is temporarily unavailable.');}
 const payload=await response.json().catch(()=>({}));
 if(!response.ok||payload.ok!==true)
  throw Error(payload.reason==='push_not_configured'?'Push service has not been configured for this release.'
   :payload.reason==='not_administrator'?'Administrator access is required.'
   :'Push service is temporarily unavailable.');
 return payload;
}
function installedOnHomeScreen(){
 const ua=String(globalThis.navigator?.userAgent||'');
 if(!/iPhone|iPad|iPod/i.test(ua))return true;
 return globalThis.navigator?.standalone===true||globalThis.matchMedia?.('(display-mode: standalone)')?.matches===true;
}
function compatible(){
 return !!(globalThis.isSecureContext && globalThis.Notification &&
  globalThis.navigator?.serviceWorker && globalThis.PushManager);
}
export async function enableAdminPush(sdk){
 if(!compatible())throw Error('Push needs a supported secure, installed Home Screen app.');
 if(!installedOnHomeScreen())throw Error('On iPhone, add Dial In to your Home Screen and open it there to enable push alerts.');
 // Called directly from a user tap: requestPermission happens before any await.
 const permission=globalThis.Notification.permission==='granted'?'granted':
  await globalThis.Notification.requestPermission();
 if(permission!=='granted')throw Error('Allow notifications in your iPhone settings to enable push alerts.');
 const [key,registration]=await Promise.all([
  authorizedFetch(sdk,'GET'),
  globalThis.navigator.serviceWorker.register('/sw.js',{scope:'/'})
 ]);
 if(!registration?.pushManager)throw Error('This browser cannot subscribe to push alerts.');
 const vapid=keyBytes(key.publicKey);
 let subscription=await registration.pushManager.getSubscription();
 const previous=subscription?.options?.applicationServerKey;
 if(subscription&&previous&&String([...new Uint8Array(previous)])!==String([...vapid])){
  await subscription.unsubscribe();subscription=null;
 }
 if(!subscription)subscription=await registration.pushManager.subscribe({
  userVisibleOnly:true,applicationServerKey:vapid});
 try{await authorizedFetch(sdk,'POST',{endpoint:subscription.endpoint});}
 catch(err){await subscription.unsubscribe().catch(()=>{});throw err;}
 return 'Push alerts enabled. You can receive them while the Home Screen app is closed.';
}
export async function disableAdminPush(sdk){
 if(!globalThis.navigator?.serviceWorker)return 'Push alerts are unavailable on this device.';
 const registration=await globalThis.navigator.serviceWorker.getRegistration('/');
 const subscription=await registration?.pushManager?.getSubscription();
 if(!subscription)return 'No push subscription is active on this device.';
 let serverRemoved=false;
 try{await authorizedFetch(sdk,'DELETE',{endpoint:subscription.endpoint});serverRemoved=true;}
 catch{/* The device revocation still prevents future deliveries. */}
 const removed=await subscription.unsubscribe();
 if(!removed)throw Error('iPhone could not disable this push subscription.');
 return serverRemoved?'Push alerts disabled on this device.':
  'Device push alerts disabled. Server cleanup will occur after the expired endpoint is detected.';
}

// Device state is authoritative; do not persist a misleading local preference.
export async function getAdminPushStatus(){
 if(!globalThis.navigator?.serviceWorker||!globalThis.PushManager||!globalThis.Notification)return 'disabled';
 const registration=await globalThis.navigator.serviceWorker.getRegistration('/');
 const subscription=await registration?.pushManager?.getSubscription();
 return subscription&&globalThis.Notification.permission==='granted'?'enabled':'disabled';
}
