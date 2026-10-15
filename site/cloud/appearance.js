// Shared cosmetic preference; never used for authentication or authorization.
export const APPEARANCE_KEY='dic_appearance_v1';
export const normalizeAppearance=value=>['light','dark','system'].includes(value)?value:'system';
export const resolveAppearance=(value,darkSystem=false)=>normalizeAppearance(value)==='system'?(darkSystem?'dark':'light'):normalizeAppearance(value);
export function readAppearance(storage){
 try{return normalizeAppearance((storage||globalThis.localStorage)?.getItem(APPEARANCE_KEY));}catch{return 'system';}
}
let preference='system',installed=false;
export function applyAppearance(value,{remember=true}={}){
 preference=normalizeAppearance(value);
 const dark=globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches||false;
 const resolved=resolveAppearance(preference,dark);
 const root=globalThis.document?.documentElement;
 if(root){root.dataset.theme=resolved;root.style.colorScheme=resolved;}
 const meta=globalThis.document?.querySelector('meta[name="theme-color"]');
 if(meta)meta.content=resolved==='dark'?'#171009':'#f4eee4';
 if(remember){try{globalThis.localStorage?.setItem(APPEARANCE_KEY,preference);}catch{}}
 if(!installed&&globalThis.addEventListener){
  installed=true;
  globalThis.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{if(preference==='system')applyAppearance(preference,{remember:false});});
  globalThis.addEventListener('storage',event=>{if(event.key===APPEARANCE_KEY)applyAppearance(event.newValue,{remember:false});});
 }
 return resolved;
}
