#!/usr/bin/env node
/** Independent, keyless browser evidence. Never loads an application parser. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {isIP} from 'node:net';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const [root,executablePath,limitArg]=process.argv.slice(2);
const manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8'));
const out=path.join(root,'render-audit');await fs.mkdir(out,{recursive:true});
const proxyUrl=process.env.HTTPS_PROXY||process.env.HTTP_PROXY;
let proxy;if(proxyUrl){const u=new URL(proxyUrl);proxy={server:u.protocol+'//'+u.host,...(u.username?{username:decodeURIComponent(u.username),password:decodeURIComponent(u.password)}:{})};}
// Trust only the managed proxy certificate already configured for this runtime.
// Do not disable certificate validation globally or change production transport.
const extraArgs=[];
if(process.env.SSL_CERT_FILE){
 const pem=await fs.readFile(process.env.SSL_CERT_FILE,'utf8');
 const pins=[...pem.matchAll(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g)].map(m=>crypto.createHash('sha256').update(new crypto.X509Certificate(m[0]).publicKey.export({type:'spki',format:'der'})).digest('base64'));
 if(pins.length)extraArgs.push('--ignore-certificate-errors-spki-list='+pins.join(','));
}
const browser=await chromium.launch({executablePath,headless:true,proxy,args:['--disable-dev-shm-usage','--disable-background-networking',...extraArgs]});
const entries=[];
for(const folder of await fs.readdir(path.join(root,'cases'))){try{const p=JSON.parse(await fs.readFile(path.join(root,'cases',folder,'source-packet.json'),'utf8'));entries.push(p);}catch{}}
const selected=manifest.roasters.map(r=>({id:r.id,cases:r.selected_urls.map(u=>entries.find(p=>p.source_url===u)).filter(Boolean)}));
const results=[];let cursor=0,completed=0;
const publicUrl=raw=>{try{const u=new URL(raw);const host=u.hostname.replace(/\.+$/,'');return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!isIP(host)&&host.includes('.')&&!/\.(?:localhost|local|internal|invalid|test|lan|home|corp)$/.test(host);}catch{return false;}};
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
async function capture(packet){
 const dir=path.join(out,packet.id);await fs.mkdir(dir,{recursive:true});const receipt=path.join(dir,'receipt.json');
 try{const old=JSON.parse(await fs.readFile(receipt,'utf8'));if(old.status==='render_captured'){results.push(old);completed++;return;}await fs.writeFile(path.join(dir,'previous-receipt.json'),JSON.stringify(old,null,2));}catch{}
 const record={case_id:packet.id,source_url:packet.source_url,captured_at:new Date().toISOString(),method:'isolated_local_chromium',not_production_transport_acceptance:true,interactions:[],blocked_requests:[],status:'started'};
 const context=await browser.newContext({viewport:{width:1440,height:1000},userAgent:'DialInCollective-CoffeeSourceAudit/1.0 (Chromium public product review)',serviceWorkers:'block',acceptDownloads:false});
 const page=await context.newPage();
 await context.route('**/*',route=>{
  const req=route.request(),type=req.resourceType(),url=req.url();
  if(!publicUrl(url)||['image','media','font'].includes(type)||!['GET','HEAD'].includes(req.method())){
   if(record.blocked_requests.length<100)record.blocked_requests.push({url,type,method:req.method()});return route.abort();
  }
  return route.continue();
 });
 const errors=[];page.on('pageerror',e=>{if(errors.length<10)errors.push(String(e).slice(0,300));});
 try{
  const response=await page.goto(packet.source_url,{waitUntil:'domcontentloaded',timeout:18000});record.http_status=response?.status();record.resolved_url=page.url();
  await page.waitForLoadState('networkidle',{timeout:3000}).catch(()=>{});
  const data=await page.evaluate(()=>{
   for(const details of document.querySelectorAll('details'))details.open=true;
   const text=document.body?.innerText||'';
   return {title:document.title,visible_text:text.slice(0,400000),visible_text_truncated:text.length>400000,
    images:[...document.images].slice(0,200).map(i=>({src:i.currentSrc||i.src,alt:i.alt})),
    videos:[...document.querySelectorAll('video,iframe')].slice(0,50).map(e=>({tag:e.tagName,src:e.src,title:e.title})),
    tab_controls:[...document.querySelectorAll('[role=tab],[aria-controls]')].slice(0,100).map(e=>({text:e.textContent?.trim().slice(0,160),role:e.getAttribute('role'),target:e.getAttribute('aria-controls')}))};
  });
  const html=await page.content();record.dom_bytes=Buffer.byteLength(html);record.dom_truncated=record.dom_bytes>3000000;
  if(!record.dom_truncated){await fs.writeFile(path.join(dir,'rendered.html'),html);record.dom_sha256=sha(html);}
  await fs.writeFile(path.join(dir,'rendered-source.json'),JSON.stringify(data,null,2));record.text_characters=data.visible_text.length;record.page_errors=errors;record.status='render_captured';
 }catch(e){record.status='unreviewed';record.error=String(e).slice(0,300);}
 finally{await context.close();}
 await fs.writeFile(receipt,JSON.stringify(record,null,2));results.push(record);completed++;console.log(JSON.stringify({completed,case_id:packet.id,status:record.status,text_characters:record.text_characters}));
}
async function worker(){while(cursor<selected.length){const index=cursor++;if(limitArg&&index>=Number(limitArg))break;for(const p of selected[index].cases)await capture(p);}}
await Promise.all(Array.from({length:6},worker));await browser.close();
await fs.writeFile(path.join(out,'results.json'),JSON.stringify({not_production_transport_acceptance:true,results},null,2));
console.log(JSON.stringify({complete:true,cases:results.length,captured:results.filter(r=>r.status==='render_captured').length}));
