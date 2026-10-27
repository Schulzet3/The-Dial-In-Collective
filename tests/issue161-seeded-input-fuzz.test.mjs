import test from 'node:test';
import assert from 'node:assert/strict';
import {safeCoffeeUrl,isGlobalIpv4,guardedLookup} from '../src/server/coffee-url-guard.mjs';
import {readBoundedJson} from '../supabase/functions/_shared/request-budget.mjs';
import {validateShot} from '../site/lib/model.js';

const seeded=seed=>()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
const pick=(next,a)=>a[Math.floor(next()*a.length)];
const TASTES={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};

test('seeded DNS fuzz: reserved, carrier NAT, and non-global targets fail closed',async()=>{
 const rand=seeded(0x161da7a);
 for(let n=0;n<5000;n++){
  const a=Math.floor(rand()*256),b=Math.floor(rand()*256),c=Math.floor(rand()*256),d=Math.floor(rand()*256);
  const blocked=a===0||a===10||a===127||a>=224||(a===100&&b>=64&&b<=127)||
   (a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&(b===168||(b===0&&c===0)))||
   (a===198&&(b===18||b===19))||(a===203&&b===0&&c===113);
  if(!blocked)continue;
  const ip=[a,b,c,d].join('.');
  assert.equal(isGlobalIpv4(ip),false,ip);
  const result=await new Promise(resolve=>guardedLookup((_h,_o,cb)=>cb(null,[{address:ip,family:4}]))
   ('roaster.example.org',{},(err,address)=>resolve({err,address})));
  assert.ok(result.err,ip);assert.equal(result.address,undefined);
 }
 for(const ip of ['192.0.0.1','192.0.0.170','192.0.0.255','100.127.0.1','169.254.169.254'])
  assert.equal(isGlobalIpv4(ip),false,ip);
});
test('seeded URL fuzz: protocol, credential, port, fragment and private DNS authority',()=>{
 const next=seeded(0x161009),hosts=['coffee.example.org','roaster.co.uk','shop.vendor.coffee'];
 for(let n=0;n<3400;n++){
  const host=pick(next,hosts),prefix=pick(next,['https://','http://','ftp://','https://user@','https://user:pass@']);
  const url=prefix+host+pick(next,[':8443','/bag#token','/bag','/','?q=%252f','/lot%0a']);
  const parsed=safeCoffeeUrl(url);
  if(parsed){assert.equal(parsed.protocol,'https:');assert.equal(parsed.username,'');
   assert.equal(parsed.password,'');assert.equal(parsed.port,'');assert.equal(parsed.hash,'');
   assert.ok(hosts.includes(parsed.hostname));}
 }
 for(const bad of ['https://localhost/','https://service.internal/','https://a.local/','https://roaster.com:8443/','https://u:p@roaster.com/'])
  assert.equal(safeCoffeeUrl(bad),null);
});
test('seeded UTF-8 stream fuzz: full byte budget is enforced before JSON decoding',async()=>{
 const next=seeded(0x161bad),budget={maxBytes:256,timeoutMs:500};
 for(let i=0;i<320;i++){
  const data={name:pick(next,['café','☕','🌐','🧪','x','🐈']).repeat(Math.floor(next()*175)),index:i};
  const body=JSON.stringify(data),request=new Request('https://synthetic.invalid/',{
   method:'POST',headers:{'Content-Type':'application/json'},body});
  if(Buffer.byteLength(body,'utf8')>budget.maxBytes)
   await assert.rejects(()=>readBoundedJson(request,budget),e=>e.code==='request_too_large');
  else assert.deepEqual(await readBoundedJson(request,budget),data);
 }
});
test('seeded shot fuzz: invalid numbers and incomplete taste readings never enter queue',()=>{
 const next=seeded(0x161a11),bad=[NaN,Infinity,-Infinity,-1,0,'','unknown',null,undefined,'1e999'];
 for(let i=0;i<4000;i++){
  const field=pick(next,['doseG','yieldG','timeS','grindSetting']);
  const d={doseG:18,yieldG:36,timeS:26,grindSetting:2,style:'Traditional',tasteScales:{...TASTES}};
  d[field]=pick(next,field==='grindSetting'?bad.filter(x=>x!==0):bad);
  assert.ok(validateShot(d).length>0,field+': '+String(d[field]));
 }
});
