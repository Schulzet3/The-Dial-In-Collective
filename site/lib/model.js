import {SCHEMA_VERSION,CONFIG,STYLES,canonicalRoastLevel,newId,now,clone,num,norm,canonicalUrl} from './constants.js';
export const blankWorkspace = () => ({currentCoffeeId:null, recent:{}, coffees:{}});
export const blankCoffeeState = () => ({style:'Traditional',currentFamilies:{},referenceFamilies:{},favoriteShots:{},basketId:null,experiments:{}});
export function blankState(mode='personal') {
 return {schemaVersion:SCHEMA_VERSION,mode,revision:0,theme:'system',activeSetupId:null,preferences:'',setups:[],coffees:[],shots:[],families:[],experiments:[],audit:[],consent:{},createdAt:now()};
}
export function activeSetup(s) {return s.setups.find(x=>x.id===s.activeSetupId)||null;}
export function activeVersion(s,setup=activeSetup(s)) {return setup?.versions.find(x=>x.id===setup.activeVersionId)||null;}
export function workspace(s,setup=activeSetup(s)) {return setup?.workspaces[setup.activeVersionId]||blankWorkspace();}
export function coffeeState(s,coffeeId,setup=activeSetup(s)) {return workspace(s,setup).coffees[coffeeId]||blankCoffeeState();}
export function ensureCoffeeState(s,coffeeId) {
 const w=workspace(s); return w.coffees[coffeeId] ||= blankCoffeeState();
}
export function selectedBasket(s,coffeeId,version=activeVersion(s)) {
 if(!version)return null;
 const b=coffeeState(s,coffeeId).basketId;
 return version.baskets.find(x=>x.id===b&&!x.archived)||version.baskets.find(x=>x.id===version.defaultBasketId&&!x.archived)||version.baskets.find(x=>!x.archived);
}
export function feedMode(v) {return v?.advanced.slowFeed ? (v.slowFeed?'slow':'standard') : 'standard';}
export function logAudit(s,action,detail) {s.audit.push({id:newId('audit'),at:now(),action,detail});}
export function createSetup(s,input) {
 const dose=num(input.basketDoseG), lo=num(input.grinderMin), hi=num(input.grinderMax);
 if(!input.name?.trim())throw new Error('Give this setup a name.');
 if(dose==null||dose<5||dose>40)throw new Error('Enter a Basket Dose between 5 and 40 g.');
 if(lo==null||hi==null||lo<0||hi<=lo)throw new Error('Enter a finest and a higher coarsest espresso setting.');
 const basket={id:newId('basket'),name:input.basketName?.trim()||`${dose} g basket`,doseG:dose,archived:false,createdAt:now()};
 const calibrationId=newId('calibration');
 const version={id:newId('version'),createdAt:now(),label:'Original equipment',machine:input.machine?.trim()||'',grinder:input.grinder?.trim()||'',burrs:input.burrs?.trim()||'',grinderMin:lo,grinderMax:hi,calibrationId,calibrations:[{id:calibrationId,min:lo,max:hi,at:now()}],baskets:[basket],defaultBasketId:basket.id,tempUnit:input.tempUnit||'F',advanced:{temperature:false,slowFeed:false,baskets:false},slowFeed:false};
 const setup={id:newId('setup'),name:input.name.trim(),activeVersionId:version.id,versions:[version],workspaces:{[version.id]:blankWorkspace()}};
 s.setups.push(setup);s.activeSetupId=setup.id;logAudit(s,'setup.created',{setupId:setup.id});return setup;
}
export function reviseSetup(s,input) {
 const setup=activeSetup(s), old=activeVersion(s);if(!old)throw new Error('No active setup.');
 if(!input.name?.trim())throw new Error('A setup name is required.');
 const lo=num(input.grinderMin), hi=num(input.grinderMax);
 if(lo==null||hi==null||lo<0||hi<=lo)throw new Error('Check the espresso range. Coarsest must be higher than finest.');
 const dose=num(input.basketDoseG);if(dose==null||dose<5||dose>40)throw new Error('Check Basket Dose (5-40 g).');
 const hardware=['machine','grinder','burrs'].some(k=>norm(input[k])!==norm(old[k]));
 let v=old;
 if(hardware) {
  v=clone(old);v.id=newId('version');v.createdAt=now();v.label=input.versionLabel?.trim()||'Equipment update';
  if(['grinder','burrs'].some(k=>norm(input[k])!==norm(old[k]))) {v.calibrationId=newId('calibration');v.calibrations=[{id:v.calibrationId,min:lo,max:hi,at:now()}];}
  const w=clone(workspace(s));
  for(const c of Object.values(w.coffees)){c.referenceFamilies={...c.currentFamilies};c.currentFamilies={};c.experiments={};}
  setup.workspaces[v.id]=w;setup.versions.push(v);setup.activeVersionId=v.id;
  logAudit(s,'setup.versioned',{setupId:setup.id,from:old.id,to:v.id});
 }
 setup.name=input.name.trim();
 for(const k of ['machine','grinder','burrs'])v[k]=input[k]?.trim()||'';
 v.tempUnit=input.tempUnit||'F';
 for(const k of ['temperature','slowFeed','baskets']) {
  const enabled=!!input[k];
  if(k==='slowFeed' && enabled!==v.advanced[k])v.slowFeed=false;
  v.advanced[k]=enabled;
 }
 if(lo!==v.grinderMin||hi!==v.grinderMax)recalibrate(s,lo,hi);
 v.grinderMin=lo;v.grinderMax=hi;
 // Editing an intended-dose entry versions future snapshots, never past shots.
 const b=v.baskets.find(x=>x.id===v.defaultBasketId)||v.baskets[0];
 if(b.doseG!==dose)correctBasketDose(s,b.id,dose);
}
export function recalibrate(s,min,max) {
 const v=activeVersion(s);min=num(min);max=num(max);
 if(min==null||max==null||min<0||max<=min)throw new Error('Check the new espresso range.');
 const old=v.calibrationId;v.calibrationId=newId('calibration');v.grinderMin=min;v.grinderMax=max;
 v.calibrations.push({id:v.calibrationId,min,max,at:now()});
 logAudit(s,'grinder.recalibrated',{from:old,to:v.calibrationId,min,max});
}
export function addBasket(s,input) {
 const v=activeVersion(s);const dose=num(input.doseG);
 if(dose==null||dose<5||dose>40)throw new Error('Enter a Basket Dose between 5 and 40 g.');
 const b={id:newId('basket'),name:input.name?.trim()||`${dose} g basket`,doseG:dose,archived:false,createdAt:now()};
 v.baskets.push(b);v.advanced.baskets=true;return b;
}
export function correctBasketDose(s,id,value) {
 const v=activeVersion(s),b=v.baskets.find(x=>x.id===id),dose=num(value);
 if(!b)throw new Error('Basket not found.');
 if(dose==null||dose<5||dose>40)throw new Error('Enter a Basket Dose between 5 and 40 g.');
 if(b.doseG===dose)return b;
 b.doseHistory ||= [];b.doseHistory.push({at:now(),before:b.doseG,after:dose});
 logAudit(s,'basket.dose.corrected',{basketId:id,from:b.doseG,to:dose});b.doseG=dose;return b;
}
export function setBasketArchived(s,id,archived) {
 const v=activeVersion(s);const b=v.baskets.find(x=>x.id===id);if(!b)return;
 if(archived&&v.baskets.filter(x=>!x.archived).length<=1)throw new Error('Keep at least one active basket.');
 b.archived=archived;
 if(archived&&v.defaultBasketId===id)v.defaultBasketId=v.baskets.find(x=>!x.archived).id;
 logAudit(s,archived?'basket.archived':'basket.reactivated',{basketId:id});
}
export function restoreVersion(s,id) {
 const set=activeSetup(s);if(!set.versions.some(v=>v.id===id))throw new Error('Version not found.');
 set.activeVersionId=id;logAudit(s,'setup.version.restored',{versionId:id});
}
export function addCoffee(s,data) {
 if(!data.name?.trim()||!data.roaster?.trim())throw new Error('Name and roaster are required.');
 const c={id:newId('coffee'),createdAt:now(),hidden:false,status:'local',bags:[{id:newId('bag'),roastDate:'',frozen:false,archived:false}],...pickCoffee(data)};
 c.activeBagId=c.bags[0].id;s.coffees.push(c);
 if(data.style==='Custom')throw new Error('Custom is retired. Choose an available shot style.');
 if(activeSetup(s))ensureCoffeeState(s,c.id).style=STYLES.includes(data.style)?data.style:'Traditional';
 logAudit(s,'coffee.added',{coffeeId:c.id});return c;
}
export function pickCoffee(d) {
 const obj={};for(const k of ['name','roaster','origin','elevationM','roastLevel','process','variety','producer','tastingNotes','roasterUrl','release','summary','espressoNotes'])obj[k]=String(d[k]??'').trim().slice(0,k==='summary'?2000:1000);
 if(obj.roasterUrl&&!canonicalUrl(obj.roasterUrl))throw new Error('Use an http or https product URL.');
 obj.roastLevel=canonicalRoastLevel(obj.roastLevel);
 obj.roasterRecipe=d.roasterRecipe && num(d.roasterRecipe.ratio)>0?clone(d.roasterRecipe):null;
 if(d.provenance)obj.provenance=clone(d.provenance);
 return obj;
}
export function editCoffee(s,id,data) {
 const c=s.coffees.find(x=>x.id===id);if(!c)throw new Error('Coffee not found.');
 const old=pickCoffee(c);Object.assign(c,pickCoffee(data));logAudit(s,'coffee.details.edited',{coffeeId:id,before:old,after:pickCoffee(c),verification:'local only'});
}
export function duplicateMatches(s,d) {
 const url=canonicalUrl(d.roasterUrl);
 return s.coffees.filter(c=>(url && canonicalUrl(c.roasterUrl)===url && norm(c.release)===norm(d.release))||(norm(c.name)===norm(d.name)&&norm(c.roaster)===norm(d.roaster)&&norm(c.release)===norm(d.release)));
}
export function hideCoffee(s,id,hidden=true) {
 const c=s.coffees.find(x=>x.id===id);if(!c)return;c.hidden=hidden;
 if(hidden)for(const set of s.setups)for(const w of Object.values(set.workspaces))if(w.currentCoffeeId===id){w.currentCoffeeId=Object.entries(w.recent).filter(([cid])=>cid!==id&&s.coffees.some(c=>c.id===cid&&!c.hidden)).sort((a,b)=>b[1].localeCompare(a[1]))[0]?.[0]||null;}
 logAudit(s,hidden?'coffee.hidden':'coffee.restored',{coffeeId:id});
}
export function visibleCoffees(s,sort='recent',search='',temporaryId=null) {
 const w=workspace(s);const query=norm(search);const keys=['name','roaster','origin','elevationM','roastLevel','process','variety','producer','tastingNotes'];
 const rows=s.coffees.filter(c=>!c.hidden&&(!query||keys.some(k=>norm(c[k]).includes(query))));
 rows.sort((a,b)=>sort==='az'?a.name.localeCompare(b.name): (w.recent[b.id]||'').localeCompare(w.recent[a.id]||'') || b.createdAt.localeCompare(a.createdAt));
 const ordered=[];
 const pinned=rows.find(c=>c.id===w.currentCoffeeId);if(pinned)ordered.push(pinned);
 const temp=!query&&rows.find(c=>c.id===temporaryId&&c.id!==w.currentCoffeeId);if(temp)ordered.push(temp);
 return [...ordered,...rows.filter(c=>!ordered.includes(c))];
}
export function snapshot(s,coffeeId,basketId) {
 const set=activeSetup(s),v=activeVersion(s),b=v.baskets.find(b=>b.id===basketId)||selectedBasket(s,coffeeId);
 return {setupId:set.id,setupName:set.name,versionId:v.id,machine:v.machine,grinder:v.grinder,burrs:v.burrs,grinderMin:v.grinderMin,grinderMax:v.grinderMax,calibrationId:v.calibrationId,basketId:b.id,basketName:b.name,basketDoseG:b.doseG,tempUnit:v.tempUnit};
}
export function hasLocalSuccess(s,coffeeId,style) {
 const v=activeVersion(s);return !!v&&s.shots.some(sh=>!sh.hidden&&sh.coffeeId===coffeeId&&sh.setupVersionId===v.id&&sh.style===style&&sh.dialedIn);
}
export function validateShot(d,{allowLegacyCustom=false}={}) {
 const errors=[];
 // PostgreSQL length(text) counts Unicode code points, not UTF-16 units.
 // Reject excess before enqueue/save; never silently discard a member's text.
 if(Array.from(String(d.notes||'')).length>16000)errors.push('Notes must be 16,000 characters or fewer. Your text has not been saved or shortened.');
 for(const field of ['doseG','yieldG','timeS']){const n=num(d[field]),[lo,hi]=CONFIG.bounds[field];if(n==null||n<lo||n>hi)errors.push(`${{doseG:'Dose',yieldG:'Yield',timeS:'Time'}[field]} must be between ${lo} and ${hi}${field==='timeS'?' s':' g'}.`);}
 if(num(d.grindSetting)==null||num(d.grindSetting)<0)errors.push('Enter the actual grind setting (0 or higher).');
 if(d.tempC!==''&&d.tempC!=null){const n=num(d.tempC);if(n==null||n<70||n>100)errors.push('Check temperature (70-100 degrees C).');}
 if(!d.tasteScales||!Object.entries({extraction:3,body:3,clarity:5,sweetness:5,astringency:1}).every(([k])=>Number.isInteger(d.tasteScales[k])&&d.tasteScales[k]>=1&&d.tasteScales[k]<=5))errors.push('Rate all five taste scales.');
 if(!STYLES.includes(d.style)&&!(allowLegacyCustom&&d.style==='Custom'))errors.push('Choose an available shot style.');
 return errors;
}
export function validateBackup(data) {
 if(!data||typeof data!=='object'||data.schemaVersion!==1)throw new Error('This is not a prototype backup.');
 for(const key of ['coffees','shots','setups','families','experiments','audit'])if(!Array.isArray(data[key]))throw new Error(`Backup is missing ${key}.`);
 const ids=new Set();for(const c of data.coffees){if(!c.id||!c.name||!c.roaster||ids.has(c.id))throw new Error('Invalid coffee records.');ids.add(c.id);}
 for(const sh of data.shots){if(!ids.has(sh.coffeeId)||!sh.id||!sh.snapshot)throw new Error('Invalid shot references.');}
 for(const set of data.setups){if(!Array.isArray(set.versions)||!set.versions.some(v=>v.id===set.activeVersionId)||!set.workspaces)throw new Error('Invalid equipment setup.');}
 return clone(data);
}
