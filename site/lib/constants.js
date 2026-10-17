export const APP_VERSION = '0.1.0';
export const SCHEMA_VERSION = 1;
export const STYLES = ['Traditional', 'Turbo', 'Ristretto', 'Lungo', 'Custom'];
// Owner-Locked seven-tier Title Case scale. Original source records remain literal.
export const ROASTS = ['Ultra Light','Very Light','Light','Medium-Light','Medium','Medium-Dark','Dark'];
export function canonicalRoastLevel(value){
 const s=String(value??'').trim();
 return s==='Light-Medium'?'Medium-Light':ROASTS.includes(s)?s:'';
}
export const roastIndex=value=>ROASTS.indexOf(canonicalRoastLevel(value));
export const PROCESSES = ['Washed', 'Natural', 'Honey', 'Anaerobic', 'Other/Unknown'];
export const SCALES = [
  { key: 'extraction', label: 'Extraction', low: 'Sour', high: 'Bitter', ideal: 3, hint: 'Balanced for this coffee and style.' },
  { key: 'body', label: 'Body', low: 'Thin', high: 'Heavy', ideal: 3, hint: 'The texture you want for this style, without hollowness or heaviness.' },
  { key: 'clarity', label: 'Clarity', low: 'Muddled', high: 'Distinct', ideal: 5, hint: 'How clearly you can distinguish the flavors.' },
  { key: 'sweetness', label: 'Sweetness', low: 'None', high: 'Exceptional', ideal: 5, hint: 'The sweetness and balance you taste.' },
  { key: 'astringency', label: 'Astringency / Dryness', low: 'Severe', high: 'None', ideal: 1, reverse: true, hint: 'A drying, papery or puckering finish. Less is better.' }
];
export const STYLE_COPY = {
 Traditional: 'Balanced, conventional espresso. Starting targets vary by roast level: roughly 1:1.8-1:2.5 and 22-32 seconds, then adapt to your coffee, setup, successful shots and preferences.',
 Turbo: 'Fast, high-flow espresso with a relatively long ratio and coarser grind. Typical starting territory: 1:2.2-1:3.0 in 12-18 seconds. Targets adapt from there.',
 Ristretto: 'Shorter, more concentrated espresso. Typical starting territory: 1:1.1-1:1.5 in 18-25 seconds, emphasizing texture and intensity. Ratio matters more than exact time.',
 Lungo: 'Longer-ratio espresso. Typical starting territory: 1:2.5-1:3.2 in 28-40 seconds. A more open, less concentrated cup. Ratio matters more than exact time.',
 Custom: 'Set your own starting windows. Style guidelines never decide whether your shot tastes right.'
};
// Starting priors preserved from the supplied JSX, NOT pass/fail rules.
export const RATIOS = {
 // Until evidence differentiates their targets, two new light tiers inherit
 // the existing Light priors; no invented precision or shifting old targets.
 Traditional: [2.5,2.5,2.5,2.35,2.0,1.9,1.8], Turbo: [3.0,3.0,3.0,2.8,2.6,2.4,2.2],
 Ristretto: [1.5,1.5,1.5,1.4,1.3,1.2,1.1], Lungo: [3.2,3.2,3.2,3.0,2.8,2.6,2.5],
 Custom: [2,2,2,2,2,2,2]
};
export const TIMES = {Traditional: [[25,32],[22,28]], Turbo:[[12,18],[12,18]], Ristretto:[[20,25],[18,23]], Lungo:[[30,40],[28,36]], Custom:[[25,32],[25,32]]};
export const TEMPS = [95,95,95,94,93,91.5,90];
export const CONFIG = {
  // Prototype tuning values. These are application heuristics, not scientific limits.
  ratioFamilyDistance: 0.25,
  robustAt: 12,
  trimFraction: 0.10,
  experiment: { doseG: .5, yieldG: 5, timeS: 5, tempC: 2 },
  grindRangeFraction: .03,
  minGrindStep: .1,
  rangeHalfWidth: .12,
  singleYieldHalfWidth: 1,
  singleTimeHalfWidth: 2,
  // Legacy plausibility limits; basket +/-1g is a warning, never this gate.
  bounds: {doseG:[5,40], yieldG:[5,200], timeS:[1,180], tempC:[70,100]},
  similarity: {grinder:.4, burrs:.3, machine:.2, basket:.1}
};
export const newId = (prefix='id') => prefix + '_' + (globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`);
export const round = (x,n=1) => Math.round((Number(x)+Number.EPSILON)*10**n)/10**n;
export const num = x => x === '' || x == null || typeof x === 'boolean' ? null : (Number.isFinite(Number(x)) ? Number(x) : null);
export const finite = x => typeof x === 'number' && Number.isFinite(x);
export const clamp = (x,lo,hi) => Math.min(hi,Math.max(lo,x));
export const now = () => new Date().toISOString();
export const clone = x => structuredClone(x);
export const goodTaste = () => ({extraction:3,body:3,clarity:5,sweetness:5,astringency:1});
export const emptyTaste = () => Object.fromEntries(SCALES.map(s=>[s.key,null]));
export const tastesComplete = t => !!t && SCALES.every(s=>Number.isInteger(t[s.key]) && t[s.key]>=1 && t[s.key]<=5);
export const isDialed = t => tastesComplete(t) && SCALES.every(s=>t[s.key]===s.ideal);
export const tempDisplay = (c, unit='F') => c == null ? '' : Math.round(unit==='F' ? c*9/5+32 : c);
export const tempInput = (v,unit='F') => num(v)==null ? null : unit==='F' ? (Number(v)-32)*5/9 : Number(v);
export const norm = v => String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function canonicalUrl(raw) {
 if (!raw) return '';
 try {
  const u=new URL(raw);
  if (!['http:','https:'].includes(u.protocol) || u.username || u.password) return '';
  u.hash='';
  for(const k of [...u.searchParams.keys()]) if(/^(utm_|srsltid$|fbclid$|gclid$|_pos$|_sid$|_fid$|_ss$|mc_)/i.test(k)) u.searchParams.delete(k);
  u.hostname=u.hostname.toLowerCase().replace(/^www\./,'');
  return u.toString().replace(/\/$/,'');
 } catch {return '';}
}
export function tasteSeverity(s,v) {return v==null ? null : s.ideal===3 ? Math.abs(v-3)*2 : s.ideal===5 ? 5-v : v-1;}
export function tasteLabel(s,v) {
 if(v==null)return 'Tap to rate';
 if(s.ideal===3)return ['Very '+s.low.toLowerCase(),s.low,'Balanced',s.high,'Very '+s.high.toLowerCase()][v-1];
 if(s.reverse)return ['None','Slight','Moderate','Strong','Severe'][v-1];
 return [s.low,'Low','Moderate','Good',s.high][v-1];
}
