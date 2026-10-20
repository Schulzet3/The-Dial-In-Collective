// Generic coffee-page preview: connection-time DNS pinning, not DNS preflight
// followed by an unguarded fetch. This module is never copied into dist/.
// No cookies, user JWTs, API keys or browser headers are sent to target sites.
import {lookup as systemLookup} from 'node:dns';
import https from 'node:https';
import {isIP} from 'node:net';
import {gunzipSync,inflateSync,brotliDecompressSync} from 'node:zlib';

export const MAX_HTML_BYTES=900_000;
export const MAX_PRODUCT_RETRY_BYTES=2_000_000;
// The expanded limit is available ONLY to an explicitly shaped product page.
// Category and homepage paths must never receive the larger response budget.
export function isCoffeeProductDetailUrl(raw){
 const u=safeCoffeeUrl(raw);if(!u)return false;
 const parts=u.pathname.split('/').filter(Boolean);
 const tail=parts.at(-1)||'',parent=(parts.at(-2)||'').toLowerCase();
 if(!/^[a-z0-9][a-z0-9._%+~-]{3,155}$/i.test(tail))return false;
 if(/^(?:all|coffee|coffees|beans|products|new|featured|collection|collections|shop|store|category|sale|search)$/i.test(tail))return false;
 if(parent==='shop'||parent==='store')return /-p\d{6,14}$/i.test(tail);
 return ['product','products','product-page','coffee','coffees','beans'].includes(parent);
}

const MAX_URL_LENGTH=3000;
const BLOCKED_TLDS=new Set(['localhost','local','internal','test','invalid','example','onion','arpa','home','lan','corp']);
function ipv4Parts(ip){
 if(isIP(ip)!==4)return null;
 return ip.split('.').map(Number);
}
// Fail closed for all private, link-local, carrier NAT, documentation,
// benchmarking, protocol assignments, multicast and reserved ranges.
export function isGlobalIpv4(ip){
 const p=ipv4Parts(ip);if(!p)return false;
 const [a,b,c]=p;
 if(a===0||a===10||a===127||a>=224)return false;
 if(a===100&&b>=64&&b<=127)return false;
 if(a===169&&b===254)return false;
 if(a===172&&b>=16&&b<=31)return false;
 if(a===192&&(b===168||(b===0&&c===0)||(b===0&&c===2)||(b===88&&c===99)))return false;
 if(a===198&&(b===18||b===19||(b===51&&c===100)))return false;
 if(a===203&&b===0&&c===113)return false;
 return true;
}
export function safeCoffeeUrl(raw){
 if(typeof raw!=='string'||raw.length>MAX_URL_LENGTH||raw.trim()!==raw)return null;
 let u;try{u=new URL(raw);}catch{return null;}
 if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash)return null;
 const host=u.hostname.toLowerCase();
 if(!host||host.length>253||isIP(host)||host.endsWith('.')||host.includes('..'))return null;
 if(!/^[a-z0-9.-]+$/.test(host))return null;
 const labels=host.split('.');
 if(labels.length<2||labels.some(x=>!x||x.length>63||x.startsWith('-')||x.endsWith('-')))return null;
 if(BLOCKED_TLDS.has(labels.at(-1)))return null;
 const tld=labels.at(-1);
 if(!/^(?:[a-z]{2,63}|xn--[a-z0-9-]{4,59})$/.test(tld))return null;
 if(u.pathname.length>650||u.search.length>750)return null;
 // No fragments, credentials, alternate ports, bare IP addresses or dotless
 // hostnames. Percent-encoded query strings are never treated as new URLs.
 return u;
}
export function guardedLookup(resolve=systemLookup){
 return (host,options,callback)=>{
  if(typeof callback!=='function')throw new TypeError('DNS callback required');
  if(isIP(host)||!safeCoffeeUrl('https://'+host+'/')){
   callback(new Error('unsafe_dns_host'));return;
  }
  // The actual TLS socket uses precisely one of these checked A records.
  // IPv6-only sites fail safely and can use Pending/manual entry.
  resolve(host,{family:4,all:true,verbatim:true},(error,answers)=>{
   if(error||!Array.isArray(answers)||answers.length===0||
      answers.some(x=>x?.family!==4||!isGlobalIpv4(x.address))){
    callback(new Error('unsafe_dns_target'));return;
   }
   const chosen=answers[0];
   if(options?.all)callback(null,[{address:chosen.address,family:4}]);
   else callback(null,chosen.address,4);
  });
 };
}
function decodeBody(bytes,encoding,cap){
 try{
  let decoded;
  // Maximum output is enforced by zlib *during* decompression. A tiny
  // compression bomb can never inflate unboundedly before the size check.
  const options={maxOutputLength:cap+1};
  if(!encoding||encoding==='identity')decoded=bytes;
  else if(encoding==='gzip')decoded=gunzipSync(bytes,options);
  else if(encoding==='deflate')decoded=inflateSync(bytes,options);
  else if(encoding==='br')decoded=brotliDecompressSync(bytes,options);
  else return {reason:'not_html'};
  return decoded.length>cap?{reason:'page_too_large'}:{body:decoded};
 }catch(error){
  return {reason:error?.code==='ERR_BUFFER_TOO_LARGE'?'page_too_large':'not_html'};
 }
}
export async function fetchPublicCoffeeHtml(raw,{
 request=https.request,lookup=guardedLookup(),responseType='html',
 maxBytes=MAX_HTML_BYTES,deadlineAt=null
}={},redirectsRemaining=2){
 if(!['html','json','shopify_json'].includes(responseType))return {ok:false,reason:'invalid_source'};
 const url=safeCoffeeUrl(raw);
 if(!url)return {ok:false,reason:'invalid_url'};
 if(maxBytes!==MAX_HTML_BYTES&&
    !(maxBytes===MAX_PRODUCT_RETRY_BYTES&&responseType==='html'&&isCoffeeProductDetailUrl(url.toString())))
  return {ok:false,reason:'invalid_source'};
 const remaining=deadlineAt==null?11_000:Math.min(11_000,Math.floor(deadlineAt-Date.now()));
 if(remaining<=0)return {ok:false,reason:'source_unavailable'};
 // Narrow HTML-in-JS MIME compatibility to the documented public product
 // endpoint, never general third-party scripts or untrusted executable code.
 if(responseType==='shopify_json'&&!/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?products\/[a-z0-9][a-z0-9-]{0,155}\.js$/i.test(url.pathname))
  return {ok:false,reason:'invalid_url'};
 const result=await new Promise(resolve=>{
  let settled=false;
  const finish=(value)=>{if(settled)return;settled=true;clearTimeout(timer);resolve(value);};
  const timer=setTimeout(()=>{req?.destroy();finish({ok:false,reason:'source_unavailable'});},remaining);
  let req;
  try{
   req=request({
    protocol:'https:',hostname:url.hostname,servername:url.hostname,port:443,
    path:url.pathname+url.search,method:'GET',lookup,family:4,agent:false,
    rejectUnauthorized:true,timeout:Math.min(10_000,remaining),maxHeaderSize:12_000,
    headers:{Accept:responseType==='html'?'text/html,application/xhtml+xml':
     responseType==='shopify_json'?'application/json,text/javascript,application/javascript':'application/json',
     'Accept-Encoding':'gzip, br',
     'User-Agent':'DialInCollective-CoffeePreview/1.0',Connection:'close'}
   },res=>{
    const status=res.statusCode||0;
    if(status>=300&&status<400){const target=res.headers.location;res.destroy();finish({ok:false,reason:'redirect_requires_review',redirect:typeof target==='string'?target:null});return;}
    if(status<200||status>=300){res.destroy();finish({ok:false,reason:'source_unavailable'});return;}
    const mime=String(res.headers['content-type']||'').toLowerCase();
    const jsonMime=/^(?:application\/json|application\/[a-z0-9.-]+\+json)(?:\s*;|$)/i.test(mime);
    const shopifyJsMime=/^(?:application|text)\/(?:x-)?javascript(?:\s*;|$)/i.test(mime);
    // Some public coffee product hosts accidentally serve HTML as text/plain.
    // Admit ONLY explicit product URLs and verify that the body is HTML after
    // bounded reading. Never relax MIME checks on JSON, catalogs or homepages.
    const plainProductHtml=responseType==='html'&&/^text\/plain(?:\s*;|$)/i.test(mime)&&
     isCoffeeProductDetailUrl(url.toString());
    if(responseType==='html'?
       (!mime.includes('text/html')&&!mime.includes('application/xhtml+xml')&&!plainProductHtml):
       !(jsonMime||(responseType==='shopify_json'&&shopifyJsMime))){
     res.destroy();finish({ok:false,reason:'not_html'});return;
    }
    const length=Number(res.headers['content-length']||0);
    if(length>maxBytes){res.destroy();finish({ok:false,reason:'page_too_large',source_url:url.toString()});return;}
    const chunks=[];let total=0;
    res.on('data',chunk=>{
     total+=chunk.length;
     if(total>maxBytes){
      res.destroy();finish({ok:false,reason:'page_too_large',source_url:url.toString()});return;
     }
     chunks.push(chunk);
    });
    res.on('end',()=>{
     if(settled)return;
     const decoded=decodeBody(Buffer.concat(chunks),String(res.headers['content-encoding']||'').toLowerCase().trim(),maxBytes);
     if(!decoded.body){finish({ok:false,reason:decoded.reason,source_url:url.toString()});return;}
     const body=decoded.body;
     if(plainProductHtml&&!/<(?:!doctype\s+html|html|head|body|main|article|h1)\b/i.test(body.toString('utf8',0,2048))){
      finish({ok:false,reason:'not_html',source_url:url.toString()});return;
     }
     finish({ok:true,...(responseType!=='html'?{json:body.toString('utf8')}:{html:body.toString('utf8')}),source_url:url.toString()});
    });
    res.on('error',()=>finish({ok:false,reason:'source_fetch_failed'}));
   });
   req.on('timeout',()=>{req.destroy();finish({ok:false,reason:'source_unavailable'});});
   req.on('error',()=>finish({ok:false,reason:'source_fetch_failed'}));
   req.end();
  }catch{finish({ok:false,reason:'source_fetch_failed'});}
 });
 if(result.redirect&&redirectsRemaining>0){
  let destination;
  try{destination=new URL(result.redirect,url).toString();}catch{return {ok:false,reason:'redirect_requires_review'};}
  if(!safeCoffeeUrl(destination))return {ok:false,reason:'redirect_requires_review'};
  // A new HTTPS request independently revalidates and pins its DNS records
  // at connect time. No Supabase credentials, cookies or raw caller headers.
  return fetchPublicCoffeeHtml(destination,{request,lookup,responseType,maxBytes,deadlineAt},redirectsRemaining-1);
 }
 return result.redirect?{ok:false,reason:'redirect_requires_review'}:result;
}

// Ecwid snapshots require true JSON. Shopify's documented exact product .js
// endpoint can supply JSON with JavaScript media type; we NEVER execute it.
export const fetchPublicCoffeeJson=(url,options={})=>{
 const {shopifyProduct=false,...rest}=options;
 return fetchPublicCoffeeHtml(url,{...rest,responseType:shopifyProduct?'shopify_json':'json'});
};

// Explicit, product-shaped second fetch. Never apply a 2 MB cap to JSON,
// catalog roots, arbitrary redirects, or the default 900 KB request.
export function fetchPublicCoffeeProductRetry(raw,options={}){
 if(!isCoffeeProductDetailUrl(raw))return Promise.resolve({ok:false,reason:'invalid_url'});
 const {request,lookup,deadlineAt}=options;
 return fetchPublicCoffeeHtml(raw,{request,lookup,deadlineAt,maxBytes:MAX_PRODUCT_RETRY_BYTES});
}
