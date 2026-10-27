// Import review is independent of active app state. No records are changed here.
import {e} from '../lib/ui.js';
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
const STYLES = new Set(['Traditional','Turbo','Ristretto','Lungo','Custom']);
const secretKeys = new Set(['apikey','password','accesstoken','refreshtoken','servicerolekey','secretkey']);
const fail = message => { throw new Error(message); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function scan(value, depth=0) {
 if (depth>40) fail('This backup is nested too deeply. Nothing was imported.');
 if (!value || typeof value!=='object') return;
 for (const [key,part] of Object.entries(value)) {
  if (['__proto__','constructor','prototype'].includes(key)) fail('This file contains an unsafe object key.');
  if (secretKeys.has(key.replaceAll('_','').toLowerCase()) && part!==null && part!=='') fail('This backup contains a credential field. Export a credentials-free backup first.');
  scan(part,depth+1);
 }
}
const id = (x,kind) => {if(typeof x!=='string'||!x.length||x.length>200)fail(`A ${kind} source ID is missing or invalid.`);return x;};
function index(rows,kind) {
 if(!Array.isArray(rows))fail(`The backup is missing its ${kind} list.`);
 const result=new Map();
 for(const row of rows){if(!object(row))fail(`Invalid ${kind} record.`);const key=id(row.id,kind);if(result.has(key))fail(`Duplicate ${kind} source IDs. Nothing was imported.`);result.set(key,row);}
 return result;
}
const date = (value,label) => {if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))fail(`Missing or invalid ${label}.`);};
const numeric = (value,min,max,label,optional=false) => {if(optional && value==null)return;if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)fail(`Invalid ${label}. Values must be recorded numbers${optional?' or null':''}.`);};
export function parseImport(text) {
 if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_IMPORT_BYTES)fail('Choose a JSON backup no larger than 2 MB.');
 let doc;try{doc=JSON.parse(text.replace(/^\uFEFF/,''));}catch{fail('This file is not valid JSON. Keep the original file and export it again.');}
 scan(doc);
 if(!object(doc)||doc.format!=='the-dial-in-collective-prototype-backup'||doc.data?.schemaVersion!==1||doc.data.mode!=='personal')fail('Choose a personal local prototype or reviewed migration backup. Original-app text exports need conversion first.');
 const d=doc.data;
 const setups=index(d.setups,'setup'),coffees=index(d.coffees,'coffee'),shots=index(d.shots,'shot'),families=index(d.families,'recipe family');
 if(setups.size!==1||coffees.size<1||coffees.size>100||shots.size>2000||families.size>500)fail('This first importer supports one setup, up to 100 coffees and 2000 shots. Other files are kept unchanged.');
 if(d.experiments!==undefined&&(!Array.isArray(d.experiments)||d.experiments.length))fail('Retired Experiment records cannot be imported without loss. Keep the original backup; nothing was imported.');
 if(!['system','light','dark'].includes(d.theme))fail('Unknown appearance setting.');
 const setup=d.setups[0],versions=index(setup.versions,'equipment version');
 if(versions.size!==1)fail('Multiple equipment versions need the next migration adapter. Nothing was imported.');
 const v=setup.versions[0],w=setup.workspaces?.[v.id];
 if(setup.activeVersionId!==v.id||d.activeSetupId!==setup.id||!object(w)||!object(w.coffees))fail('The active setup/workspace references are incomplete.');
 date(v.createdAt,'equipment version date');
 const baskets=index(v.baskets,'basket'),calibrations=index(v.calibrations,'calibration');
 if(!baskets.has(v.defaultBasketId)||!calibrations.has(v.calibrationId))fail('The selected basket or calibration is missing.');
 for(const b of baskets.values())numeric(b.doseG,5,40,'Basket Dose');
 for(const g of calibrations.values()){numeric(g.min,0,Number.MAX_VALUE,'finest grind setting');numeric(g.max,g.min+Number.EPSILON,Number.MAX_VALUE,'coarsest grind setting');if(g.max<=g.min)fail('The coarsest setting must exceed the finest setting.');}
 const legacyIds=new Set(),bagsByCoffee=new Map();
 for(const c of coffees.values()){
  if(typeof c.name!=='string'||!c.name.trim()||c.name.length>200||typeof c.roaster!=='string'||!c.roaster.trim()||c.roaster.length>200)fail('Each coffee needs a name and roaster.');
  date(c.createdAt,'coffee date');bagsByCoffee.set(c.id,index(c.bags,'archived bag'));
  const pref=w.coffees[c.id];if(!object(pref)||!STYLES.has(pref.style))fail('A coffee is missing its saved style preference.');
 }
 for(const f of families.values()){if(!coffees.has(f.coffeeId)||!STYLES.has(f.style))fail('A recipe family has a missing coffee or style.');date(f.createdAt,'recipe family date');}
 for(const sh of shots.values()){
  const legacy=id(sh.legacyId||sh.id,'legacy shot');if(legacyIds.has(legacy))fail('Duplicate legacy shot IDs. Nothing was imported.');legacyIds.add(legacy);
  if(!coffees.has(sh.coffeeId)||sh.setupId!==setup.id||sh.setupVersionId!==v.id||!STYLES.has(sh.style))fail('A shot has an invalid coffee, setup or style reference.');
  if(sh.bagId!=null&&!bagsByCoffee.get(sh.coffeeId)?.has(sh.bagId))fail('A historical shot references a missing legacy bag. Keep the original backup; nothing was imported.');
  date(sh.timestamp,'shot timestamp');
  numeric(sh.doseG,5,40,'shot dose');numeric(sh.yieldG,5,200,'shot yield');numeric(sh.timeS,1,180,'shot time');
  numeric(sh.grindSetting,0,Number.MAX_VALUE,'grind setting',true);numeric(sh.tempC,70,100,'temperature',true);
  if(![null,undefined,'unknown','standard','slow'].includes(sh.feedMode))fail('Unknown feed condition.');
  for(const key of ['extraction','body','clarity','sweetness','astringency']){numeric(sh.tasteScales?.[key],1,5,'taste rating');if(!Number.isInteger(sh.tasteScales[key]))fail('Taste ratings must be whole numbers.');}
  if(sh.experimentId!=null)fail('This shot has a retired Experiment link. Keep the original backup; nothing was imported.');
  const b=baskets.get(sh.basketId),g=calibrations.get(sh.calibrationId),s=sh.snapshot;
  if(!b||!g||!object(s)||s.basketDoseG!==b.doseG||s.grinderMin!==g.min||s.grinderMax!==g.max||['machine','grinder','burrs'].some(k=>(s[k]||'')!==(v[k]||'')))fail('A historical equipment snapshot differs from its version. The whole file is kept unchanged for review.');
  if(sh.familyId!=null){const f=families.get(sh.familyId);if(!f||f.coffeeId!==sh.coffeeId||f.style!==sh.style)fail('A shot has a mismatched recipe family.');}
 }
 if(w.currentCoffeeId!=null && !d.shots.some(sh=>sh.coffeeId===w.currentCoffeeId))fail('An unlogged coffee cannot be Current after import.');
 return {document:doc,summary:summarizeImport(doc)};
}
export function summarizeImport(doc){
 const d=doc.data,w=d.setups[0].workspaces[d.setups[0].activeVersionId];
 return {coffees:d.coffees.map(c=>({name:c.name,roaster:c.roaster,shots:d.shots.filter(s=>s.coffeeId===c.id).length,estimated:c.roastLevelSource==='estimated',current:c.id===w.currentCoffeeId})),
  shots:d.shots.length,setups:d.setups.length,families:d.families.length,
  missingGrind:d.shots.filter(s=>s.grindSetting==null).length,unknownFeed:d.shots.filter(s=>s.feedMode==null||s.feedMode==='unknown').length,
  currentCoffee:d.coffees.find(c=>c.id===w.currentCoffeeId)?.name||'None',
  archive:!!(d.legacyArchive||d.legacyEnrichment)};
}
export function previewMarkup(summary,result=null){
 const rows=summary.coffees.map(c=>`<tr><td><strong>${e(c.name)}</strong><br><span class=helper>${e(c.roaster)}${c.estimated?' · Roast estimate':''}${c.current?' · Current':''}</span></td><td>${c.shots}</td></tr>`).join('');
 return `<div class=import-counts><div><strong>${summary.coffees.length}</strong><span>Coffees</span></div><div><strong>${summary.shots}</strong><span>Shots</span></div><div><strong>${summary.setups}</strong><span>Setup</span></div></div>
 <table class=import-table><thead><tr><th>Coffee</th><th>Shots</th></tr></thead><tbody>${rows}</tbody></table>
 <p class="helper space-top">${e(summary.currentCoffee)} stays Current. Unlogged coffees are not pinned. ${summary.missingGrind} missing grind value(s) and ${summary.unknownFeed} unknown feed condition(s) stay unknown.</p>
 <details class=inline-disclosure><summary>What Is Preserved?</summary><p class=helper>Original dates, measurements, ratings, notes, equipment snapshots and recipe-family references. The complete source file is retained privately after an import. Legacy community totals, old suggestions and Custom targets are archived, not counted as new shots or activated as new recommendations.</p></details>
 ${result?.alreadyImported?'<p class=warning-box>This exact file was already imported. No duplicate records will be created.</p>':result?.ok?`<p class=success-box>Server validation passed. No changes have been saved.</p>${!result.canImport?`<p class=warning-box>${e(result.blockReason||'Cloud backup and recovery verification is pending. Preview changes nothing.')}</p>`:''}`:''}`;
}
