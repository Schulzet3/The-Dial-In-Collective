// Source-fixture sanitizer for public coffee acceptance. This is not the application extractor.
// Keep only static, same-roaster public cart URLs; strip secrets and active credentials.
const sensitiveKey=/(?:password|secret|token|csrf|authorization|cookie|customer|session|email|phone|cart|checkout)/i;
export function publicCheckoutTemplate(value,sourceUrl){
 if(typeof value!=='string'||value.length>600||!sourceUrl)return false;
 try{
  const source=new URL(sourceUrl),url=new URL(value,source);
  if(source.protocol!=='https:'||url.protocol!=='https:'||url.hostname!==source.hostname||
   url.username||url.password||url.port||url.hash)return false;
  // Only a roaster-local public shopping cart template, not a private
  // customer checkout, bearer capability, email or session-bearing link.
  if(!/^\/cart\//i.test(url.pathname)||/[?&](?:token|secret|session|customer|email|checkout|auth|key)=/i.test(url.search))
   return false;
  return true;
 }catch{return false;}
}
export function sanitizeJson(value,sourceUrl){
 return JSON.stringify(value,(key,item)=>{
  if(key==='checkoutPageURLTemplate'&&publicCheckoutTemplate(item,sourceUrl))return item;
  return sensitiveKey.test(key)?undefined:item;
 }).replace(/</g,'\\u003c').replace(/>/g,'\\u003e');
}
