import {productCoffeeProse,NONCURRENT_COFFEE_PROSE} from './coffee-product-prose.mjs';

// Altitude is a physical measurement, not a bag weight or a year. One parser
// supplies validation and compatibility for HTML and exact-product JSON.
// Keep ranges and lower/upper bounds; never invent an average elevation.
const NUMBER=String.raw`(?:\d{1,2}(?:[, .]\d{3})+|\d{1,5}(?:\.\d+)?)`;
const UNIT=String.raw`(?:m\.?\s*a\.?\s*s\.?\s*l\.?|m\.?\s*s\.?\s*n\.?\s*m\.?|met(?:er|re)s?(?:\s+(?:above\s+sea\s+level|a\.?s\.?l\.?))?|m(?:\s+(?:above\s+sea\s+level|a\.?s\.?l\.?))?|(?:feet|foot|ft\.?)(?:\s+above\s+sea\s+level)?)`;
const MEASURE=new RegExp('^('+NUMBER+')(\\+)?\\s*('+UNIT+')?(?:\\s*([-–—]|to|and|&)\\s*('+NUMBER+')(\\+)?\\s*('+UNIT+')?)?(?=$|[\\s,;:.()/–—-])','i');
const LABEL=/^["“]?(?:altitudes?(?:\s*\/\s*elevations?)?|elevations?(?:\s*\/\s*altitudes?)?|(?:coffee\s+)?growing (?:altitude|elevation)|grown at|altura|altitud|masl|msnm)(?:\s*\(?\s*(?:masl|msnm|m|meters?|metres?)\s*\)?)?\s*(?:[:：|=]|\/{2,}|\s?[-–—]{1,3}\s*|(?=\d))\s*/i;
const GENERAL_CROP_HEIGHT=/\b(?:(?:most|much)(?:\s+of)?|the majority of)\s+(?:the\s+)?coffee\b/i;
const GENERAL_CLASS_HEIGHT=/^(?!(?:this|these|our|the)\b)[\p{L}\p{M}'’ -]{2,80}\s+coffees\s+are\s+(?:exclusively|generally|typically|usually)\b/iu;
const COMPONENT_HEIGHT=/\b(?:one of the coffees|the other (?:is|coffee)|another component)\b/i;
const ADDITIONAL_PROPERTY=/\b(?:in addition(?:\s+to\s+(?:this|these|those))?|also)\b[^.!?]{0,160}\b(?:owns?|operates?|purchased|bought)\b[^.!?]{0,180}\b(?:farms?|plantations?|estates?)\b/i;
const number=value=>Number(value.replace(/[ ,]/g,'').replace(/^(\d{1,2})\.(\d{3})$/,'$1$2'));
const unit=value=>/^(?:feet|foot|ft)/i.test(value||'')?'ft':'m';
const format=value=>String(Math.round(value));

function comparable(a,b,{conversion=false}={}){
 const tolerance=conversion?Math.min(a.approximate||b.approximate?150:50,
  Math.max(1,Math.max(a.high,b.high)*(a.approximate||b.approximate?0.1:0.03))):0.51;
 return a.operator===b.operator&&Math.abs(a.low-b.low)<=tolerance&&Math.abs(a.high-b.high)<=tolerance;
}
function one(value,{allowBare=true,allowTrailing=false}={}){
 let text=value.trim(),operator='',approximate=false;
 const approximatePrefix=text.match(/^(?:approximately|approx\.?|about|around|on average|~)\s*/i);
 if(approximatePrefix){approximate=true;text=text.slice(approximatePrefix[0].length);}
 if(/\s+(?:on average|approximately)\s*[.;]?$/i.test(text)){
  approximate=true;text=text.replace(/\s+(?:on average|approximately)\s*[.;]?$/i,'');
 }
 const bound=text.match(/^(>=|<=|>|<|≥|≤|at least|over|above|more than|greater than|higher than|surpass(?:es)?|less than|under|below|up to)\s*/i);
 if(bound){
  const token=bound[1].toLowerCase();operator=/^(?:>=|≥|at least)$/.test(token)?'>=':
   /^(?:<=|≤|up to)$/.test(token)?'<=':/^(?:<|less than|under|below)$/.test(token)?'<':'>';
  text=text.slice(bound[0].length);
 }
 text=text.replace(/^between\s+/i,'');
 text=text.replace(new RegExp('^('+NUMBER+')\\s*('+UNIT+')\\s*\\+(?=$|[\\s.;,])','i'),'$1+ $2');
 const match=text.match(MEASURE);
 if(!match)return null;
 const firstUnit=match[3],secondUnit=match[7];
 if(!allowBare&&!firstUnit&&!secondUnit)return null;
 if(firstUnit&&secondUnit&&unit(firstUnit)!==unit(secondUnit))return null;
 if((match[2]||match[6])&&(match[5]||operator))return null;
 if(match[2])operator='>=';
 if(match[5]&&operator)return null;
 const measurementUnit=unit(secondUnit||firstUnit),factor=measurementUnit==='ft'?0.3048:1;
 const low=number(match[1])*factor,high=number(match[5]||match[1])*factor;
 if(!Number.isFinite(low)||!Number.isFinite(high)||low<50||high>6000||high<low)return null;
 const rest=text.slice(match[0].length).trim();
 if(rest&&!allowTrailing&&!/^[.;,]$/.test(rest))return null;
 if(rest&&allowTrailing&&!firstUnit&&!secondUnit)return null;
 const point=low===high;
 const source=value.trim().slice(0,value.trim().length-rest.length).trim().replace(/[.;,]$/,'');
 const display=measurementUnit==='ft'?(approximate?'approximately ':'')+
  (operator&&operator!=='>='?operator+' ':'')+format(low)+(point?'':'–'+format(high))+
  (operator==='>='?'+':'')+' m':source;
 return {low,high,operator:operator||(match[4]==='&'?'set':point?'point':'range'),
  unit:measurementUnit,explicitUnit:!!(firstUnit||secondUnit),approximate,display,source,rest};
}

export function parseCoffeeElevation(value,{allowBare=true,allowTrailing=false}={}){
 if(typeof value!=='string'||value.length>500)return null;
 let text=value.normalize('NFKC').replace(/\s+/g,' ').trim().replace(/^[✹•▪●*]\s*/,'').replace(LABEL,'');
 // A spelled-out unit followed by its acronym is one unit, not a second
 // contradictory measurement. Only a literal bean grade is nonmetric text.
 text=text.replace(/\b(masl|msnm)\s+met(?:er|re)s?(?:\s+above\s+sea\s+level)?\b/gi,'$1')
  .replace(/\s*\((?:m\.?\s*a\.?\s*s\.?\s*l\.?|msnm)\)\s*[.;]?$/i,'')
  .replace(/\s*\(SHB\s*[-–—]\s*Strictly Hard Beans?\)\s*[.;]?$/i,'');
 // A small written-number form occurs in public growing-height descriptions.
 text=text.replace(/\b(one|two|three|four|five|six|seven|eight|nine)\s+thousand\b/gi,
  (_,word)=>String(['one','two','three','four','five','six','seven','eight','nine'].indexOf(word.toLowerCase())*1000+1000));
 if(!text)return null;
 // A parenthetical second unit is the same measurement, not a second farm.
 const dual=text.match(/^(.{1,170}?)\s*\(\s*(.{1,170}?)\s*\)\s*[.;]?$/i)||
  text.match(/^(.{1,170}?)\s*\[\s*(.{1,170}?)\s*\]\s*[.;]?$/i)||
  text.match(/^(.{1,170}?)\s*\/\s*(.{1,170}?)\s*[.;]?$/i);
 if(dual){
  const a=one(dual[1],{allowBare}),b=one(dual[2],{allowBare:false});
  if(!a||!b||!a.explicitUnit||a.unit===b.unit)return null;
  if(!comparable(a,b,{conversion:true}))return {conflicting:true};
  return a.unit==='m'?a:b;
 }
 return one(text,{allowBare,allowTrailing});
}

export function equivalentCoffeeElevations(first,second){
 const a=parseCoffeeElevation(String(first||'')),b=parseCoffeeElevation(String(second||''));
 return !!a&&!a.conflicting&&!!b&&!b.conflicting&&comparable(a,b,{conversion:a.unit!==b.unit});
}

// A finite point/range can refine a compatible published upper/lower bound.
// Never turn two ranges, strict inequalities, or two farms into their union.
export function compatibleCoffeeElevations(first,second){
 const a=parseCoffeeElevation(String(first||'')),b=parseCoffeeElevation(String(second||''));
 if(!a||a.conflicting||!b||b.conflicting)return null;
 if(comparable(a,b,{conversion:a.unit!==b.unit})){
  // An inline label may end before a neighboring unit span. The complete
  // current-product sentence can then supply that literal unit without
  // changing the measurement or its qualifier. Keep it instead of letting
  // the earlier bare number erase the published unit.
  if(a.unit===b.unit&&a.approximate===b.approximate&&a.explicitUnit!==b.explicitUnit)
   return a.explicitUnit?first:second;
  return a.unit==='m'?first:second;
 }
 const finite=value=>value.operator==='point'||value.operator==='range';
 const bound=value=>['>','>=','<','<='].includes(value.operator);
 const narrower=finite(a)&&bound(b)?a:finite(b)&&bound(a)?b:null;
 const wider=narrower===a?b:a;
 if(!narrower)return null;
 const compatible=wider.operator==='>'?narrower.low>wider.low:
  wider.operator==='>='?narrower.low>=wider.low:
  wider.operator==='<'?narrower.high<wider.high:narrower.high<=wider.high;
 return compatible?(narrower===a?first:second):null;
}

export function extractCoffeeElevationEvidence(html,{clean,name='',includeNarrative=true,includeExplicitMasl=false}={}){
 const result=[],seen=new Set();
 const add=value=>{
  const parsed=parseCoffeeElevation(value,{allowBare:false});
  if(parsed&&!parsed.conflicting&&!seen.has(parsed.display)&&result.length<48){seen.add(parsed.display);result.push(parsed.unit==='ft'?parsed.source:parsed.display);}
 };
 for(const block of productCoffeeProse(html,clean)){
  if(block.educational)continue;
  for(const raw of block.html.split(/<br\b[^<>]{0,2000}>/i).slice(0,40)){
   const line=clean(raw,6000);if(!line||line.length>6000)continue;
   // A comma before an explicit label separates specification columns; an
   // ordinary cultivar list does not. Only the altitude column is consumed.
   for(const segment of line.split(/\s*[,;]\s*(?=[\p{L}][\p{L} &/'()_-]{1,55}\s*[:：=])/u).slice(0,40)){
    if(segment.length>500||!LABEL.test(segment.replace(/^[✹•▪●*]\s*/,'')))continue;
    const parsed=parseCoffeeElevation(segment);
    if(parsed&&!parsed.conflicting&&!seen.has(parsed.display)){seen.add(parsed.display);result.push(parsed.unit==='ft'?parsed.source:parsed.display);}
   }
   // Explicit short metrics, including numbers followed immediately by m.
   // Delimiters are structural specification separators, not arbitrary prose.
   if(line.length<=260){
    if(LABEL.test(line.replace(/^[✹•▪●*]\s*/,''))){
     const parsed=parseCoffeeElevation(line);
     if(parsed&&!parsed.conflicting&&!seen.has(parsed.display)){seen.add(parsed.display);result.push(parsed.unit==='ft'?parsed.source:parsed.display);}
    }else if(includeNarrative||includeExplicitMasl){
     for(const segment of line.split(/\s*(?:\|+|\/{2,}|•)\s*/).slice(0,8))add(segment);
    }
   }
   // A discrete MASL item in a current specification sentence can follow
   // processing/drying facts. A comma within a thousands group is not a
   // boundary, and an educational/other-coffee paragraph grants no scope.
   let additionalProperty=false;
   for(const sentence of line.split(/(?<=[.!?])\s+|(?<=[.!?])(?=[A-Z])/u).slice(0,30)){
    // A producer biography can mention another property and then describe
    // "its altitude". Keep that measurement as source prose, but do not use
    // it for the selected lot unless a later sentence explicitly returns to
    // this coffee. Track only this paragraph; a later labeled specification
    // remains independent evidence.
    if(ADDITIONAL_PROPERTY.test(sentence))additionalProperty=true;
    const currentLot=/\b(?:this|these)\s+(?:[\p{L}'’-]+\s+){0,3}(?:coffee|lot|crop|beans|cherries|berries|selection)\b/iu.test(sentence)||
     (name.length>=5&&sentence.toLocaleLowerCase().includes(name.toLocaleLowerCase()));
    if(currentLot&&!NONCURRENT_COFFEE_PROSE.test(sentence))additionalProperty=false;
    if(additionalProperty||GENERAL_CLASS_HEIGHT.test(sentence))continue;
    if(includeExplicitMasl&&!NONCURRENT_COFFEE_PROSE.test(sentence)&&!GENERAL_CROP_HEIGHT.test(sentence)&&!COMPONENT_HEIGHT.test(line)){
     const metric=new RegExp('(?:^|(?<!\\d)[,;])\\s*('+NUMBER+'(?:\\s*[-–—]\\s*'+NUMBER+')?\\s*(?:masl|msnm))(?=$|[\\s,.;])','gi');
     for(const match of sentence.matchAll(metric))add(match[1]);
    }
    if(!includeNarrative)continue;
    if(sentence.length>1800||NONCURRENT_COFFEE_PROSE.test(sentence)||GENERAL_CROP_HEIGHT.test(sentence)||COMPONENT_HEIGHT.test(sentence)||
      /\b(?:roastery|roasting facility|our (?:cafe|shop)|warehouse|shipping|brew(?:ing)?|mountain peak|summit)\b/i.test(sentence)||
      /\b(?:can|could|may|might)\s+(?:be\s+)?(?:grown|grow|cultivated)\b/i.test(sentence))continue;
    const current=/\b(?:this|these|our|the)\s+(?:[\p{L}'’-]+\s+){0,3}(?:coffee|lot|crop|beans|cherries|berries|selection)\b/iu.test(sentence)||
     /\b(?:coffee|beans|cherries|berries|varietals?|cultivars?|farms?|estates?|farming|plots?)\b/i.test(sentence)&&/\b(?:grown|grows?|growing|cultivated|planted|sitting|located|farming|elevations?|altitudes?)\b/i.test(sentence)||
     (name.length>=5&&sentence.toLocaleLowerCase().includes(name.toLocaleLowerCase()))||
     /^(?:Origin\s*&\s*Producer\s*:\s*)?(?:Grown|Cultivated|Planted)\s+(?:at\b|between\b|\d)/i.test(sentence);
    if(!current)continue;
    const heights=[...sentence.matchAll(/\b(?:altitude|elevation)s?\s+(?:(?:ranging|range)\s+)?(?:of\s+|from\s+|between\s+|that\s+)?((?:surpass(?:es)?|up to|over|above|higher than|at least|approximately|about|\d).{1,180})/gi)];
    if(!heights.length)heights.push(...sentence.matchAll(/\b(?:at|between|grown|grows?|cultivated|planted)\s+((?:approximately\s+|about\s+|around\s+|over\s+|above\s+)?\d.{1,180})/gi));
    for(const height of heights.slice(0,8)){
    const parsed=parseCoffeeElevation(height[1],{allowBare:false,allowTrailing:true});
    if(!parsed||parsed.conflicting)continue;
    if(/^(?:from\s+(?:the\s+)?(?:town|village|road|river|coast)|away|long|tall|deep|wide)\b/i.test(parsed.rest))continue;
    const prefix=parsed.operator==='>'?'> ':parsed.operator==='<'?'< ':parsed.operator==='<='?'≤ ':'';
    const display=parsed.unit==='ft'?parsed.source:(parsed.approximate?'approximately ':'')+prefix+
     format(parsed.low)+(parsed.high===parsed.low?'':(parsed.operator==='set'?' & ':'–')+format(parsed.high))+(parsed.operator==='>='?'+':'')+' masl';
    add(display);
    }
   }
  }
  if(result.length>=48)break;
 }
 return result;
}
