// Literal processing evidence shared by the page reader and its exact-product
// endpoint merge. Fermentation and a washing/drying subtype can describe the
// same treatment; an unsupported category or a different subtype still cannot.
const evidenceByFields=new WeakMap();
const categories=new Set(['Washed','Natural','Honey','Anaerobic','Other/Unknown']);
const folded=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();

export function withoutNaturalDecaffeinationModifier(value){
 return String(value||'').replace(/\bnatural(?:ly)?\s+(?=(?:sugar[ -]?cane|ethyl[ -]?acetate|e\.?a\.?|swiss[ -]?water|mountain[ -]?water|decaf(?:feinat(?:ion|ed|ing)?)?)\b)/gi,'');
}

// A pure EA decaffeination caption and an explicit "Washed process before
// EA decaffeination" caption are complementary stages. Prefer the complete
// published caption; do not synthesize a combined sentence or conflate water
// methods, sugar-process nicknames, or different green-coffee treatments.
export function compatibleEADecaffeinationDetail(first,second){
 const parse=raw=>{
  const value=folded(withoutNaturalDecaffeinationModifier(raw))
   .replace(/\bea\s*\(ethyl acetate\)/g,'ethyl acetate');
  const method=String.raw`(?:e\.?a\.?|ethyl[ -]+acetate)\s+decaf(?:feination|feinated)?`;
  if(new RegExp('^'+method+'$','i').test(value))return {raw,stage:''};
  const stage=value.match(new RegExp('^((?:washed|natural|honey)\\s+process\\s+(?:before|after|prior to))\\s+'+method+'$','i'));
  return stage?{raw,stage:stage[1]}:null;
 };
 const a=parse(first),b=parse(second);
 if(!a||!b||(a.stage&&b.stage&&a.stage!==b.stage))return '';
 if(a.stage||b.stage)return a.stage?a.raw:b.raw;
 return a.raw.length>=b.raw.length?a.raw:b.raw;
}

export function recordCoffeeProcessingClaim(fields,raw,category){
 if(!fields||!categories.has(category))return;
 const value=String(raw||'').trim();
 const entry=evidenceByFields.get(fields)||{claims:[],complete:true};
 if(!value||value.length>1000)entry.complete=false;
 else if(!entry.claims.some(claim=>claim.category===category&&folded(claim.raw)===folded(value))){
  if(entry.claims.length>=64)entry.complete=false;
  else entry.claims.push({raw:value,category});
 }
 evidenceByFields.set(fields,entry);
}

function processingSubtypes(raw){
 const value=folded(withoutNaturalDecaffeinationModifier(raw));
 if(/\b(?:mixed|blend|mixture|components?|separate|not|never|without|other|unknown|wet[ -]hulled|semi[ -]washed)\b/.test(value))return null;
 const honey=/\bpulped[ -]+natural\b/.test(value);
 const words=value.replace(/\bpulped[ -]+natural\b/g,'honey');
 return new Set([
  ...(/\bwashed\b|\bwet[ -]+process(?:ed|ing)?\b/.test(words)?['Washed']:[]),
  ...(/\bnatural\b|\bdry[ -]+process(?:ed|ing)?\b/.test(words)?['Natural']:[]),
  ...(honey||/\bhoney\b/.test(words)?['Honey']:[])
 ]);
}

// A combined claim must literally include both the oxygen-limited treatment
// and its particular washing/drying subtype. A bare Anaerobic claim cannot
// repair a Washed/Natural contradiction, and published mixtures are excluded.
function combinedSubtype(claim){
 if(claim.category!=='Anaerobic')return '';
 const raw=folded(claim.raw),subtypes=processingSubtypes(raw);
 if(!subtypes||subtypes.size!==1||!/\banaerob(?:ic|ico|ica)(?:ally)?\b/.test(raw))return '';
 if(!/\banaerob(?:ic|ico|ica)[ -]+(?:natural|washed|honey)\b|\b(?:natural|washed|honey)[ -]+anaerob(?:ic|ico|ica)\b|\bferment(?:ation|ed|ing)?\b/.test(raw))return '';
 return [...subtypes][0];
}

export function reconcileCoffeeProcessingClaims(previews){
 const claims=[];
 for(const preview of previews){
  const fields=preview?.fields,entry=fields&&evidenceByFields.get(fields);
  const needsEvidence=!!fields?.process||preview?.conflicts?.includes('process');
  // Hand-created/cached conflicts with no complete original claim ledger
  // remain final. No category-only fallback may make them disappear.
  if(needsEvidence&&(!entry?.complete||!entry.claims.length))return '';
  if(fields?.process==='Other/Unknown'||entry?.complete===false)return '';
  if(entry)claims.push(...entry.claims);
 }
 if(!claims.length||claims.some(claim=>claim.category==='Other/Unknown'))return '';
 const witnesses=new Set(claims.map(combinedSubtype).filter(Boolean));
 if(witnesses.size!==1)return '';
 const subtype=[...witnesses][0];
 for(const claim of claims){
  if(!['Anaerobic',subtype].includes(claim.category))return '';
  const subtypes=processingSubtypes(claim.raw);
  if(!subtypes||[...subtypes].some(value=>value!==subtype))return '';
 }
 return 'Anaerobic';
}

export function mergeCoffeeProcessingClaims(fields,previews){
 const claims=[];let complete=true;
 for(const preview of previews){
  const source=preview?.fields,entry=source&&evidenceByFields.get(source);
  if((source?.process||preview?.conflicts?.includes('process'))&&!entry)complete=false;
  if(entry){complete&&=entry.complete;claims.push(...entry.claims);}
 }
 if(!claims.length)return;
 const merged={claims:[],complete};
 for(const claim of claims){
  if(merged.claims.some(existing=>existing.category===claim.category&&folded(existing.raw)===folded(claim.raw)))continue;
  if(merged.claims.length>=64){merged.complete=false;break;}
  merged.claims.push(claim);
 }
 evidenceByFields.set(fields,merged);
}
