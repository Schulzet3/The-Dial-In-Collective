import {selectedCoffeeContextRoles} from './coffee-selected-context-roles.mjs';
import {selectedDirectProductCredits,selectedNamedCurrentDecafEvidence,selectedCurrentDecafSpecMethodEvidence,selectedFormTitleWaterDecafEvidence} from './coffee-direct-product-prose.mjs';
import {rawElements,removeElements,removeComments} from '../../supabase/functions/_shared/html-scan.mjs';
import {isRecurringCoffeeHarvestWindow,isGenericCoffeeLotLabel} from '../../supabase/functions/_shared/coffee-release-label.mjs';
// Best-effort facts from arbitrary PUBLIC coffee pages. This is NOT official
// roaster verification and never promotes a canonical record.
import {extractRoastVisualEvidence,normalizeRoastLabel} from './roast-level-evidence.mjs';
import {extractLayoutEvidence,coffeeLayoutDetailConflicts} from './coffee-product-layouts.mjs';
import {extractNarrativeCoffeeEvidence} from './coffee-narrative-evidence.mjs';
import {extractCoffeeBlendEvidence,extractSelectedBlendCommunityCredit,extractSelectedRegionalBlendElevation,selectedPartialBlendProcess,withoutCoffeeBlendComponentSpecs} from './coffee-blend-evidence.mjs';
import {extractCoffeeIdentityEvidence,extractCoffeeCurrentReleasePrefixes,extractCoffeeTitleOrigin,extractCoffeeGeographyTuples,coffeeDescriptionCountryMismatch,coffeeDescriptionNamedCoffeeMismatch,explicitCoffeeVarietyList,literalCoffeeSourcePlaces} from './coffee-identity-evidence.mjs';
import {extractProductEspressoReference} from './coffee-espresso-evidence.mjs';
import {productMarkup,coffeeHtmlAttributes,withoutDetachedFarmerProfiles} from './coffee-product-scope.mjs';
import {productCoffeeProse} from './coffee-product-prose.mjs';
import {interpretAgtron,agtronExplanation} from './agtron-roast.mjs';
import {extractSelectedNextCoffeeProduct} from './coffee-next-selected-product.mjs';
import {selectedCoffeeHeroFacts,selectedCurrentOriginCaption,hasIncompatibleCurrentTastingList} from './coffee-selected-product-hero.mjs';
import {COFFEE_FIELD_ALIASES,extractSemanticCoffeeSpecs,withoutEducationalCoffeeGeography} from './coffee-semantic-specs.mjs';
import {equivalentCoffeeVarieties,compatibleGenericCoffeeVarieties,explicitCoffeeVarietyRefinement,coffeeOriginParts,compatibleCoffeeOrigins,isCoffeeBroadOrigin,orderExplicitCoffeeOriginTuple} from './coffee-fact-compatibility.mjs';
import {equivalentCoffeeProductNames,preferredCoffeeRoasterName,selectedCoffeeNameWithoutPrice} from './coffee-product-identity.mjs';
import {isolateCoffeeIdentityCohorts} from './coffee-source-identity-scope.mjs';
import {extractCoffeeGeographyEntityRoles,cleanCoffeeGeographyEntityPrefix} from './coffee-geography-entity-roles.mjs';
import {extractProductImageTextEvidence,extractProductFlavorEvidence,extractProductFlavorProfileEvidence,refineSelectedNamedTastingNotes,normalizeExplicitCoffeeTastingNotes,equivalentCoffeeTastingNotes,coffeeTastingNotesSubset} from './coffee-flavor-evidence.mjs';
import {refineSelectedDescriptionSensory,refineSelectedCurrentLiteralFinish} from './coffee-selected-description-sensory.mjs';
import {coffeeHtmlElements} from './coffee-html-structure.mjs';
import {parseCoffeeElevation,equivalentCoffeeElevations,compatibleCoffeeElevations,extractCoffeeElevationEvidence} from './coffee-elevation-evidence.mjs';
import {withoutNaturalDecaffeinationModifier,recordCoffeeProcessingClaim,reconcileCoffeeProcessingClaims} from './coffee-processing-evidence.mjs';
import {inferDecaffeinationMethod} from './coffee-decaffeination-method.mjs';
import {withoutStandaloneCoffeeSpeciesPrefix} from './coffee-cultivar-species-prefix.mjs';
import {collectCoffeeSourceFacts,collectStructuredCoffeeSourceFacts,collectCoffeePageMetaSourceFacts,collectCoffeePageGuidanceFacts,mergeCoffeeSourceFacts,reconcileSelectedCoffeeReviewActorRoles} from './coffee-source-facts.mjs';
import {collectSupplementaryCoffeePageFacts} from './coffee-supplementary-source-evidence.mjs';
import {selectedCurrentCoffeeReleaseBadge,selectedStructuredCoffeeEvidence,selectedPageCoffeeEvidence,explicitlyRotatingCoffeeOrigin} from './coffee-selected-source-evidence.mjs';
import {selectedCurrentInlineShopifyRoastTag} from './coffee-current-inline-shopify-product.mjs';
import {countrywideEducationalOriginCorrection} from './coffee-countrywide-context-guard.mjs';
import {selectedFarmStoryRegionMismatch} from './coffee-title-region-evidence.mjs';
import {selectedCurrentFarmGrowingLocality} from './coffee-selected-farm-growing-locality.mjs';
import {selectedCurrentFarmCountryLocality} from './coffee-selected-farm-country-locality.mjs';
import {selectedCurrentFarmVolcanoRegion} from './coffee-selected-farm-volcano-region.mjs';
import {selectedCountryFirstCurrentRegion} from './coffee-country-first-current-region.mjs';
import {selectedDottedTitleCountryRegion} from './coffee-dotted-title-region.mjs';
import {selectedProcessingSiteNotFarmOrigin} from './coffee-processing-site-origin-guard.mjs';
import {selectedCurrentColombianDepartmentOrigin} from './coffee-selected-department-origin.mjs';
import {selectedCurrentNamedMicroLotSector} from './coffee-selected-microlot-sector-origin.mjs';
import {conflictingCurrentSelectedDecafSource} from './coffee-selected-decaf-origin-conflict.mjs';

// A chosen current selected coffee description can be more authoritative than
// another labeled tasting list printed in the same selected product detail
// panel. Keep the preferred suggestion, but flag its genuinely incompatible
// printed alternative for member review. Never rewrite or discard source facts.
// This is not a cross-product suppression rule; both are actual source claims.
export function markSelectedTastingSourceDisagreements(facts,selectedNotes){
 if(!Array.isArray(facts)||!selectedNotes||typeof selectedNotes!=='string')return facts;
 for(const fact of facts){
  if(fact.field!=='tasting_notes'||fact.conflicting===true||
   !/^(?:tasting(?:\s+notes?)?|cupping(?:\s+notes?)?|flavou?r(?:\s+notes?)?|cup(?:\s+notes?)?|notes?|we\s+taste|what\s+you(?:'|’)?ll\s+taste)$/i.test(String(fact.label||'').trim().replace(/[:：]\s*$/u,''))||
   !['html','product_json'].includes(fact.source_type)||
   /(?:different coffee|general guidance|education|recommendation|brewing recommendation|published page metadata)/i.test(String(fact.section||'')))continue;
  // An actual labeled Flavor list may contain unusual literal merchant words
  // (e.g. Whole Bean Vanilla) rejected by the canonical flavor sanitizer.
  // Keep that source's own caption as review-only evidence when it is a
  // bounded multi-item literal, never as an inferred canonical flavor.
  const raw=String(fact.value||'').trim();
  const printed=normalizeExplicitCoffeeTastingNotes(raw)||
   (raw.length<=240&&raw.length>=6&&/[,;|]/.test(raw)&&!/[<>]/.test(raw)?raw:'');
  if(printed&&!equivalentCoffeeTastingNotes(printed,selectedNotes)&&
   !coffeeTastingNotesSubset(printed,selectedNotes)&&
   !coffeeTastingNotesSubset(selectedNotes,printed))fact.conflicting=true;
 }
 return facts;
}

const FIELD_ALIASES=COFFEE_FIELD_ALIASES;
const LOOKUP=new Map(Object.entries(FIELD_ALIASES).flatMap(([field,names])=>names.map(name=>[keyOf(name),field])));
function keyOf(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');}

// Only the selected current decaf's own two present-country claims qualify.
// Neither roaster-wide marketing nor a different SKU may supply geography.
function selectedCurrentDecafCountryDisagreement(html,name){
 if(typeof html!=='string'||html.length>2_000_000||
  !/\bdecaf(?:feinated)?\b/i.test(String(name||'')))return null;
 const blocks=productCoffeeProse(html,clean);
 const titles=blocks.filter(row=>row.tag==='h1');
 if(titles.length!==1||keyOf(titles[0].text)!==keyOf(name))return null;
 const countryIn=raw=>{
  const values=[...new Set(literalCoffeeSourcePlaces(raw).filter(value=>ORIGIN_COUNTRIES.has(keyOf(value))))];
  return values.length===1?values[0]:'';
 };
 const offers=new Set(),locations=new Set();
 let currentDetails=false;
 for(const row of blocks){
  if(row.educational||row.text.length>1200||
   /(?:related products?|recommended|other coffees?|you may also like)/i.test(row.section||''))continue;
  const value=row.text.replace(/\s+/g,' ').trim();
  if(/^h[2-6]$/.test(row.tag))currentDetails=/^Current Decaf Coffee$/i.test(value);
  if(!['p','div','li','h3','h4','h5'].includes(row.tag))continue;
  if(/\b(?:previous|historical|formerly|prior offering|other coffees?|another coffee|not the current)\b/i.test(value))continue;
  for(const match of value.matchAll(/\b(?:the|our|this)\s+current\s+(?:decaf(?:feinated)?\s+)?offering\s+from\s+([\p{Lu}][\p{L}\p{M}.'’-]*(?:\s+[\p{Lu}][\p{L}\p{M}.'’-]*){0,3})/giu)){
   const country=countryIn(match[1]);if(country)offers.add(country);
  }
  if(/^Current Decaf Coffee$/i.test(value))currentDetails=true;
  const inline=value.match(/\bCurrent Decaf Coffee\b.{0,150}?\bLocation\s*:\s*([\p{Lu}][\p{L}\p{M}.'’-]*(?:\s+[\p{Lu}][\p{L}\p{M}.'’-]*){0,3})/iu);
  const labeled=currentDetails&&value.match(/^Location\s*:\s*([\p{Lu}][\p{L}\p{M}.'’-]*(?:\s+[\p{Lu}][\p{L}\p{M}.'’-]*){0,3})/iu);
  const country=countryIn((inline||labeled)?.[1]||'');
  if(country)locations.add(country);
 }
 if(offers.size!==1||locations.size!==1)return null;
 const prose=[...offers][0],labeled=[...locations][0];
 return keyOf(prose)!==keyOf(labeled)?{prose,labeled}:null;
}

function readableRoaster(s){
 const published=String(s||'').trim();
 const trading=published.match(/\b(?:d\.?b\.?a\.?|doing business as)\s+(.{2,150})$/i);
 const raw=(trading?trading[1]:published).trim();
 // Some Shopify sites publish an internal host slug (tim-wendelboe-no)
 // instead of a public-facing roaster. Drop only a terminal country TLD.
 if(!/^[a-z]+(?:-[a-z]+){2,}$/.test(raw))return raw;
 const parts=raw.split('-');
 if(parts.at(-1).length===2)parts.pop();
 return parts.map(part=>part[0].toUpperCase()+part.slice(1)).join(' ');
}
function publishedRoaster(value){
 const text=String(value||'').trim();
 if(!text||/^(?:my store|online store|store|shopify|home|products?|vendor[- _]?unknown|unknown|single[ -]origin(?:\s*[|:/-].*)?)$/i.test(text)||
   /^[A-Z0-9_-]{2,12}\s+ONLINE$/.test(text)||ORIGIN_COUNTRIES.has(keyOf(text)))return '';
 return readableRoaster(text);
}
const LATIN_ENTITIES=Object.fromEntries('aacute:á agrave:à acirc:â atilde:ã auml:ä aring:å aelig:æ ccedil:ç eacute:é egrave:è ecirc:ê euml:ë iacute:í igrave:ì icirc:î iuml:ï ntilde:ñ oacute:ó ograve:ò ocirc:ô otilde:õ ouml:ö oslash:ø oelig:œ uacute:ú ugrave:ù ucirc:û uuml:ü yacute:ý yuml:ÿ szlig:ß'.split(' ').map(pair=>pair.split(':')));
function entities(s){
 const replace={'amp':'&','quot':'"','apos':"'",'lt':'<','gt':'>','nbsp':' ','ndash':'–','mdash':'—','bull':'•','bullet':'•','rsquo':'’','lsquo':'‘'};
 return String(s??'').replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi,(s,key)=>{
  const lower=key.toLowerCase();
  if(lower in replace)return replace[lower];
  if(LATIN_ENTITIES[lower])return key[0]===key[0].toUpperCase()?LATIN_ENTITIES[lower].toUpperCase():LATIN_ENTITIES[lower];
  if(lower.startsWith('#')){
   const hex=lower.startsWith('#x'),n=Number.parseInt(lower.slice(hex?2:1),hex?16:10);
   if(Number.isInteger(n)&&n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff))return String.fromCodePoint(n);
  }
  return s;
 });
}
function clean(s,max=250){
 return entities(removeElements(String(s??''),['script','style'])
  .replace(/<[^<>]{0,2000}>/g,' ').replace(/[\u0000-\u001f\u007f]/g,' ')
  .replace(/\s+/g,' ').trim()).slice(0,max);
}
function textOf(v,max=250,depth=0){
 if(depth>8)return '';
 if(typeof v==='string'||typeof v==='number')return clean(v,max);
 if(Array.isArray(v)){
  if(v.length>80)return '';
  const joined=v.map(x=>textOf(x,max,depth+1)).filter(Boolean).join(', ');
  return joined.length<=max?joined:'';
 }
 if(v&&typeof v==='object')return textOf(v.name??v.value??v.text??'',max,depth+1);
 return '';
}
function attrs(tag){
 const out=coffeeHtmlAttributes(String(tag).replace(/^<[^\s>]+/,''));
 for(const key of Object.keys(out))out[key]=entities(out[key]);
 return out;
}
const META_CANONICAL=Symbol('page canonical URL');
function pageMeta(html){
 const r={};
 const page=removeElements(removeComments(html),['script','style','template','noscript','textarea','iframe','svg','canvas']);
 for(const node of coffeeHtmlElements(page).nodes){
  if(!['meta','link'].includes(node.tag)||node.headEnd-node.start>24000)continue;
  const a=attrs(page.slice(node.start,node.headEnd));
  if(node.tag==='link'){
   if(!r[META_CANONICAL]&&/^canonical$/i.test(a.rel||'')&&a.href)r[META_CANONICAL]=a.href;
   continue;
  }
  const k=(a.property||a.name||'').toLowerCase();
  if(k&&a.content)r[k]=clean(a.content,/^(?:og:)?description$/.test(k)?16000:250);
 }
 return r;
}
function walk(value,out,depth=0,budget={n:0},siteIdentities){
 if(depth>9||++budget.n>450||!value||typeof value!=='object')return;
 if(Array.isArray(value)){
  for(const child of value.slice(0,80))walk(child,out,depth+1,budget,siteIdentities);
  return;
 }
 const types=Array.isArray(value['@type'])?value['@type']:[value['@type']];
 if(siteIdentities&&siteIdentities.length<40&&typeof value.name==='string'&&value.name.length<=200&&
  types.some(type=>/^(?:Organization|WebSite|LocalBusiness)$/i.test(String(type))))
  siteIdentities.push({name:value.name,url:typeof value.url==='string'?value.url:''});
 // A Shopify ProductGroup is the release-level parent and its child
 // Products are purchase variants (size/grind), not separate coffees.
 // Only an explicit named ProductGroup with its own product URL may become
 // the parent candidate. Same-page matching happens before selection.
 if(types.some(t=>String(t||'').toLowerCase()==='product')&&typeof value.name==='string')
  out.push(value);
 else if(types.some(t=>String(t||'').toLowerCase()==='productgroup')&&
         typeof value.name==='string'&&typeof value.url==='string')
  out.push(value);
 for(const key of ['@graph','mainEntity','itemListElement','item','hasVariant','isVariantOf','offers']){
  if(value[key])walk(value[key],out,depth+1,budget,siteIdentities);
 }
}
const PRODUCT_SCOPE_IDENTITY=Symbol('corroborated current product group identity');
function bindShopifyGroupIdentity(products,target,{heading='',declaredUrl=''}={}){
 // A custom-domain storefront can publish its Shopify alias as canonical,
 // while its group and variant IDs are relative to the requested page.
 // Retain the parent only when its explicit local ID, visible name, and
 // page-declared alias corroborate the same product. Do not fetch the alias
 // or replace the original published URL in review evidence.
 if(!heading||!declaredUrl)return;
 const candidates=products.filter(product=>{
  if(![].concat(product['@type']||[]).some(type=>String(type).toLowerCase()==='productgroup')||
    keyOf(textOf(product.name))!==keyOf(heading)||typeof product.url!=='string'||samePage(product.url,target)||
    typeof product['@id']!=='string'||!/^\/(?!\/)/.test(product['@id'])||!samePage(product['@id'],target))return false;
  try{
   const alias=new URL(product.url),local=new URL(product['@id'],target),current=new URL(target);
   if(alias.protocol!=='https:'||alias.username||alias.password||alias.port||
     !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(alias.hostname)||local.hash.toLowerCase()!=='#product'||
     !samePage(product.url,declaredUrl))return false;
   alias.host=current.host;
   return samePage(alias.toString(),target);
  }catch{return false;}
 });
 if(candidates.length===1)candidates[0][PRODUCT_SCOPE_IDENTITY]=candidates[0]['@id'];
}
function jsonProducts(html,target,siteIdentities,identityContext){
 const result=[];
 for(const block of rawElements(html)){
  if(block.attributes.length>1000)continue;
  const at=attrs(block.attributes);
  if(!block.closed||(at.type||'').toLowerCase()!=='application/ld+json'||block.body.length>250000)continue;
  try{walk(JSON.parse(block.body),result,0,{n:0},siteIdentities);}catch{/* Malformed page JSON isn't evidence. */}
 }
 bindShopifyGroupIdentity(result,target,identityContext);
 const linked=result.filter(product=>productIdentityUrl(product)&&samePage(productIdentityUrl(product),target));
 const preferred=new Set(linked);
 return [...linked,...result.filter(product=>!preferred.has(product))].slice(0,200);
}
function productIdentityUrl(p){
 if(p[PRODUCT_SCOPE_IDENTITY])return p[PRODUCT_SCOPE_IDENTITY];
 if(typeof p.url==='string')return p.url;
 return typeof p['@id']==='string'&&/^(?:https?:|\/)/i.test(p['@id'])?p['@id']:'';
}
function samePage(raw,target){
 try{
  if(typeof raw!=='string'||raw.length>3000)return false;
  const a=new URL(raw,target),b=new URL(target);
  const host=x=>x.toLowerCase().replace(/^www\./,'');
  const path=x=>x.replace(/\/+$/,'');
  if(host(a.hostname)!==host(b.hostname))return false;
  // Tracking parameters do not identify a different coffee. Product IDs
  // and arbitrary query selectors do; only Shopify purchase variants may
  // share their release-level /products/handle identity.
  const query=url=>[...url.searchParams].filter(([key])=>!/^utm_|^(?:srsltid|gclid|fbclid|msclkid|mc_cid|mc_eid)$/i.test(key)&&
   !(key==='variant'&&/\/products\/[^/]+\/?$/i.test(url.pathname))).sort(([a,av],[b,bv])=>a.localeCompare(b)||av.localeCompare(bv));
  if(JSON.stringify(query(a))!==JSON.stringify(query(b)))return false;
  if(path(a.pathname)===path(b.pathname))return true;
  const handle=x=>x.match(/\/(?:products)\/([^/]+)\/?$/i)?.[1]||'';
  return !!handle(a.pathname)&&handle(a.pathname)===handle(b.pathname);
 }catch{return false;}
}
const conflictsByFields=new WeakMap();
const structuredFlavorByFields=new WeakMap();
// Public-only evidence for a member to compare.  Never submit these candidates
// automatically; canonical fields still use the existing conflict gate.
const reviewCandidatesByFields=new WeakMap();
// The selected coffee's published description and current page text outrank
// SEO/social/meta or historical metadata. Only a missing DIRECT field can use
// this low-confidence current-page fallback. A different current, direct
// selected-product description/spec still goes through genuine conflict review.
const seoFallbackByFields=new WeakMap();
function addSeoFallbackField(fields,rawKey,value){
 const key=Object.hasOwn(FIELD_ALIASES,rawKey)?rawKey:LOOKUP.get(keyOf(rawKey));
 if(!key||!['origin','roast_level','process','variety','producer','tasting_notes','elevation_m','release_label'].includes(key))return;
 const conflicts=conflictsByFields.get(fields),fallbacks=seoFallbackByFields.get(fields)||new Set();
 if(conflicts?.has(key)||(fields[key]&&!fallbacks.has(key)))return;
 const prior=fields[key];
 addField(fields,rawKey,value);
 if(fields[key]&&!prior){fallbacks.add(key);seoFallbackByFields.set(fields,fallbacks);}
}

function rememberCoffeeReviewCandidate(fields,key,value,label){
 if(!['origin','roast_level','elevation_m','process','variety','producer','tasting_notes','release_label'].includes(key)||
  typeof value!=='string'||!value.trim()||value.length>220)return;
 const map=reviewCandidatesByFields.get(fields)||new Map(),rows=map.get(key)||[];
 const normalized=value.normalize('NFKC').replace(/\s+/g,' ').trim();
 if(!rows.some(row=>row.value.toLowerCase()===normalized.toLowerCase())&&rows.length<8)
  rows.push({value:normalized,label:String(label||key).slice(0,100)});
 map.set(key,rows);reviewCandidatesByFields.set(fields,map);
}
function coffeeConflictOptions(fields,conflicts){
 const candidates=reviewCandidatesByFields.get(fields),output={};
 for(const key of conflicts){
  const rows=candidates?.get(key);
  if(rows?.length)output[key]=rows;
 }
 return output;
}

const narrativeFlavorStoriesByFields=new WeakMap();
const blendEvidenceByFields=new WeakMap();
const producerEvidenceByFields=new WeakMap();
const narrativeProducerByFields=new WeakSet();
const narrativeIdentityByFields=new WeakMap();
const elevationSourceByFields=new WeakMap();
const identityQuarantinesByFields=new WeakMap();
const identityScopeTruncatedByFields=new WeakSet();
const farmEvidenceByFields=new WeakMap();
const geographyByFields=new WeakMap();
const geographyRolesByFields=new WeakMap();
const releaseEvidenceByFields=new WeakMap();
const recurringHarvestByFields=new WeakMap();
function rememberRecurringHarvest(fields,value){
 const windows=recurringHarvestByFields.get(fields)||new Map();
 if(windows.size<16&&!windows.has(keyOf(value)))windows.set(keyOf(value),value);
 recurringHarvestByFields.set(fields,windows);
}
function rememberGeographyEntityRoles(fields,html){
 if(!html)return;
 const escape=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
 const body=/<[a-z][^>]*>/i.test(html)?html:'<p>'+escape(html)+'</p>';
 const roles=geographyRolesByFields.get(fields)||[];
 for(const role of extractCoffeeGeographyEntityRoles(body,{clean})){
  if(roles.some(existing=>keyOf(existing.name)===keyOf(role.name)&&existing.role===role.role))continue;
  if(roles.length>=32)break;
  roles.push(role);
 }
 geographyRolesByFields.set(fields,roles);
}
function markNarrativeIdentity(fields,key){
 if(!fields[key]||!['process','variety'].includes(key))return;
 const evidence=narrativeIdentityByFields.get(fields)||new Set();
 evidence.add(key);narrativeIdentityByFields.set(fields,evidence);
}
function addIdentityFact(fields,fact){
 const key=LOOKUP.get(keyOf(fact.label)),previous=fields[key];
 if(key==='variety'&&previous&&fact.explicit_current_composition&&
    !conflictsByFields.get(fields)?.has('variety')&&explicitCoffeeVarietyRefinement(previous,fact.value))delete fields.variety;
 addField(fields,fact.label,fact.value);
 if(!previous)markNarrativeIdentity(fields,key);
}
const ORIGIN_COUNTRIES=new Set('Ethiopia|Colombia|Kenya|Brazil|Guatemala|Costa Rica|Honduras|El Salvador|Nicaragua|Panama|Peru|Rwanda|Burundi|Mexico|Ecuador|Bolivia|Indonesia|Uganda|Tanzania|Yemen|India|Thailand|China|Vietnam|Laos|Myanmar|Papua New Guinea|DR Congo|Democratic Republic of the Congo|United States|Jamaica|Venezuela|Philippines|Malawi|Zambia|Nepal|Australia|Cuba|Dominican Republic|Haiti|Puerto Rico|Taiwan|Timor-Leste|East Timor|Cameroon'.split('|').map(keyOf));
// Classify only literal published large-area names; never infer their country.
const ORIGIN_AREAS=new Set('Sumatra|Java|Bali|Sulawesi|Timor|Flores|Hawaii|Kona'.split('|').map(keyOf));
function withPublishedArea(value,area){
 const parts=value.split(/\s*,\s*/);
 if(parts.some(part=>keyOf(part)===keyOf(area)))return value;
 const at=ORIGIN_COUNTRIES.has(keyOf(parts.at(-1)))?parts.length-1:parts.length;
 parts.splice(at,0,area);return parts.join(', ');
}
const geographyParts=coffeeOriginParts;
const compatibleGeography=compatibleCoffeeOrigins;
// Some merchants flatten <br>-separated specifications into one field.
// Stop at the NEXT explicit key, including concatenated CamelCase labels:
// e.g. "Lime, Tea Origin: Kenya" or "GedebElevation: 1900m".
// We intentionally do not guess flavor/origin facts from arbitrary prose.
function cleanTrailingProductLabels(text){
 const names=[...Object.values(FIELD_ALIASES).flat(),'Shipping','Quantity','Community','Grade'].sort((a,b)=>b.length-a.length)
  .map(label=>label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/ /g,'\\s+'));
 const key=new RegExp('(?:'+names.join('|')+')\\s*(?:[:：=]|\\s+[-–—]{1,3}\\s*|\\s+/{2,3}\\s+)','gi');
 let first=text.length;
 for(const match of text.matchAll(key)){
  // The leading label can legitimately be the value if a source already
  // retained it. Only subsequent key-value blocks are contamination.
  if(match.index>0&&match.index<first)first=match.index;
 }
 return text.slice(0,first).replace(/[\s,;|✹]+$/,'').trim();
}
function normalized(field,value,{allowFlavorProse=false,allowAnonymousProducer=false}={}){
 const raw=textOf(value,field==='tasting_notes'?650:1000);
 if(!raw)return '';
 let s=['tasting_notes','origin','producer','variety','elevation_m','release_label','process','roast_level'].includes(field)?
  cleanTrailingProductLabels(raw):raw;
 if(field==='origin'){
  s=s.replace(/\s*[|;,]+\s*$/,'').trim();
  // Some exact selected Origin captions append a green processing stage or
  // a decaffeination method to one literally printed producing country.
  // Keep that raw source caption in source_facts; neither method is a place.
  // Only remove a fully matched, closed suffix with one known country.
  // Do not rewrite regional tuples, multi-country blends or unknown prose.
  const countryAndProcess=s.match(/^100\s*%\s*([\p{L}\p{M}][\p{L}\p{M} .'-]{2,60}?)\s*,\s*(?:fully\s+)?(?:washed|natural|honey|anaerobic)(?:\s+process(?:ed)?)?\.?$/iu);
  const countryAndDecaf=s.match(/^([\p{L}\p{M}][\p{L}\p{M} .'-]{2,60}?)\s*\(\s*(?:Mountain|Swiss)\s+Water(?:\s+Process(?:ed)?)?\s*\)\.?$/iu);
  const printedCountry=(countryAndProcess?.[1]||countryAndDecaf?.[1]||'').trim();
  if(printedCountry&&ORIGIN_COUNTRIES.has(keyOf(printedCountry)))s=printedCountry;
  // Roaster "Oaxaca Region of Mexico" is not "Oaxaca Region of Mexico, Mexico".
  // Only de-duplicate the SAME country after an explicit Region of phrase;
  // preserve geographic names such as Mt. Kenya and any true conflict.
  const repeated=s.match(/^(.*?)\bRegion\s+of\s+([^,]{3,45})\s*,\s*(.+)$/iu);
  if(repeated&&repeated[1].trim()&&keyOf(repeated[2])===keyOf(repeated[3]))
   s=`${repeated[1].trim()} Region, ${repeated[2].trim()}`;
  // Selected product pages can call a marketing nickname "Origin" even
  // though they also print the real country. Never save that nickname as
  // geography. Preserve the exact text in public source_facts.
  const nickname=s.match(/^The\s+([\p{L}\p{M}][\p{L}\p{M}'’\s-]{2,70}?)\s*\(([\p{L}\p{M}\s-]{3,50})\)\.?$/iu);
  if(nickname&&ORIGIN_COUNTRIES.has(keyOf(nickname[2]))&&
     !/\b(?:valley|mountains?|hills?|highlands?|plateau|river|district|region|province|department|county|city|town|village|municipality|farm|finca|estate|cooperative|community|island|volcano)\b/iu.test(nickname[1]))
   s=nickname[2].trim();
  // A promotional description of multiple unspecified regions is not a
  // location and must not enter the canonical Origin field.
  if(/^(?:premium|selected|assorted|various|multiple|mixed)\s+[\p{L}\p{M} -]{3,100}\bcoffee\s+regions?\.?$/iu.test(s))
   return '';
  // This directly printed location names the municipality, department
  // and growing country. The neighboring BORDER country is not origin.
  const municipality=s.match(/^Municipality\s+of\s+([\p{L}\p{M} .’'-]{2,70})\s+in\s+the\s+([\p{L}\p{M} .’'-]{2,70})\s+department\s+in\s+([\p{L}\p{M} .’'-]{3,55})\s+near\s+the\s+border\s+of\s+([\p{L}\p{M} .’'-]{3,55})\.?$/iu);
  if(municipality&&ORIGIN_COUNTRIES.has(keyOf(municipality[3]))&&
     ORIGIN_COUNTRIES.has(keyOf(municipality[4]))&&
     keyOf(municipality[3])!==keyOf(municipality[4]))
   s=[municipality[1].trim(),municipality[2].trim(),municipality[3].trim()].join(', ');
  // The published "At the edge of the El Triunfo Reserve, La Paz,
  // Chiapas, Mexico" is a location sentence, not the literal place name.
  // Require a NAMED landmark, two named localities, and printed country.
  const edge=s.match(/^At\s+the\s+edge\s+of\s+the\s+([\p{Lu}][\p{L}\p{M} .’'-]{2,100}\b(?:Reserve|National Park|Forest|Valley))\s*,\s*([\p{Lu}][\p{L}\p{M} .’'-]{1,60})\s*,\s*([\p{Lu}][\p{L}\p{M} .’'-]{1,60})\s*,\s*([\p{Lu}][\p{L}\p{M} .’'-]{1,60})\.?$/u);
  if(edge){
   const country=edge[4].replace(/\.$/u,'').trim();
   if(ORIGIN_COUNTRIES.has(keyOf(country)))
    s=[edge[1],edge[2],edge[3],country].map(part=>part.trim()).join(', ');
  }
 }
 if(field==='producer')s=s.replace(/\s+(?:read more|learn more|view details)\s*$/i,'').trim();
 if(field==='producer'&&/^(?:amount|quantity|size|weight|choose|select|add to cart|shop now)$/i.test(s))return '';
 // "Family business with three generations of experience" is not a
 // named supplier. Do not infer the producer from a roaster biography.
 if(field==='producer'&&/^(?:a\s+)?family\s+business\s+with\s+(?:\d+|one|two|three|four|five)\s+generations?\s+of\b/iu.test(s))return '';
 if(field==='variety'){
  // Selected-product labels "Varietal-- Chiroso" and "Varietals: Bourbon,..."
  // sometimes retain a leading HTML separator in the extracted cultivar.
  // Preserve meaningful internal hyphens such as SL-28.
  const stray=s.match(/^\s*(?:--+|[–—]{1,2}|[:：])\s*(\S[\s\S]*)$/u);
  if(stray)s=stray[1].replace(/\s*,\s*(?=\S)/g,', ').trim();
  // A roaster's literal cultivar-composition decimal comma is numeric,
  // not a list delimiter: "(46,3%)" must never become "(46, 3%)".
  // Only protect an adjacent digit/comma/digit inside a closed percentage
  // parenthesis. Ordinary cultivar-list commas still receive one space;
  // already-spaced or malformed values are not silently reinterpreted.
  s=s.replace(/\s*,\s*(?=\S)/g,(match,offset,source)=>
   match===',' && /\(\s*\d{1,3}$/.test(source.slice(0,offset))&&
   /^\d{1,2}\s*%\s*\)/.test(source.slice(offset+1))?',':', ')
   .replace(/\s*\|\s*(?:limited (?:edition|release)|micro[ -]?lot)\s*$/i,'')
   .replace(/\.$/,'').trim();
 }
 // Some seller specs mislabel post-harvest equipment as a coffee 'Varietal'.
 // Withhold botanical autofill; preserve the literal label in source_facts.
 if(field==='variety'&&/^(?:vertical|horizontal|mechanical|solar)\s+dryers?$/i.test(s))return '';
 if(field==='variety'){
  const marketed=s.match(/^(.{2,140}?),\s+(?:celebrated|renowned|prized|known|regarded|considered)\b/i);
  if(marketed&&explicitCoffeeVarietyList(marketed[1]))s=marketed[1].replace(/^100\s*%\s*/,'').trim();
  // Exact current #456 lists a *species* followed by three independently
  // printed cultivars. Exclude only this taxonomy prefix from the cultivar
  // field; never invent or remove unsupported source varieties.
  s=withoutStandaloneCoffeeSpeciesPrefix(s);
 }
 // A proved current unnamed cooperative is a literal supplier role. Bare
 // label echoes remain invalid everywhere else.
 if(!s||(LOOKUP.has(keyOf(s))&&!(field==='producer'&&allowAnonymousProducer&&/^Co-?op(?:erative)?$/i.test(s))))return '';
 if(field!=='tasting_notes'&&s.length>220)return '';
 if(['origin','variety'].includes(field)&&/\b(?:this|these|those|is|are|was|were|typically|generally|often|refers|instead|when|because|creates|absorbing|resulting|we|our)\b/i.test(s))return '';
 if(field==='origin'&&/^(?:single[ -]origin|blend|blended|various|seasonal|rotating|multiple origins?)\.?$/i.test(s))return '';
 if(field==='tasting_notes'){
  // An explicit product flavor label sometimes includes a prose lead-in.
  // Keep the roaster's actual listed notes, not the words "coffee with notes of".
  // Remove only this anchored, clearly extraneous introductory phrase.
  const labelled=s.match(/^(?:this )?coffee\s+(?:with|has)\s+(?:tasting\s+)?notes?\s+of\s+(.+)$/i)||
   // Mouthfeel introductory language in a literal selected Tasting Notes
   // label must not be mistaken for another flavor; retain full source.
   s.match(/^Pleasing\s+body\s+with\s+(?:tasting\s+)?notes?\s+of\s+(.+)$/i);
  const notes=(labelled?labelled[1].replace(/[.!?]+\s*$/,'').trim():s)
   .replace(/\s*[•·]\s*/g,', ').replace(/^(?:,\s*)+|(?:,\s*)+$/g,'').trim();
  return normalizeExplicitCoffeeTastingNotes(notes,{allowProse:allowFlavorProse});
 }
 if(field==='roast_level'){
  return normalizeRoastLabel(s)||'';
 }
 if(field==='process'){
  if(/\b(?:not|never|without|isn['’]t|is\s+not)\b/i.test(s))return '';
  const norm=withoutNaturalDecaffeinationModifier(s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase());
  // A declared anaerobic fermentation plus a drying/washing stage is one
  // combined treatment. A bare list of distinct methods remains mixed.
  if(/^(?:natural|washed|honey)\s*[,;/+]\s*anaerobic fermentation$|^anaerobic fermentation\s*[,;/+]\s*(?:natural|washed|honey)$/i.test(norm))return 'Anaerobic';
  const categories=norm.split(/\s*(?:[,/&+|;]|\band\b)\s*/).map(part=>{
   if(/^anaerobic\b/.test(part))return 'Anaerobic';
   if(/^(?:pulped[ -]+natural|honey)\b/.test(part))return 'Honey';
   if(/^(?:fully[ -]+)?washed\b/.test(part))return 'Washed';
   if(/^natural\b/.test(part))return 'Natural';
   if(/^(?:co[ -]?ferment(?:ed|ation)?|osmotic dehydration)\b/.test(part))return 'Other/Unknown';
   return '';
  }).filter(Boolean);
  if(new Set(categories).size>1)return 'Other/Unknown';
  if(categories.length===1&&categories[0]==='Other/Unknown')return 'Other/Unknown';
  if(/\bpulped[ -]+natural\b/.test(norm)&&!/\bwashed\b/.test(norm))return 'Honey';
  if(/\b(?:wet[ -]+hulled|giling basah|semi[ -]+washed)\b/.test(norm))return 'Other/Unknown';
  if(/\b(?:wet[ -]+process(?:ed|ing)?|fully[ -]+washed)\b/.test(norm)&&!/(?:natural|honey|anaerobic)/.test(norm))return 'Washed';
  if(/\b(?:dry[ -]+process(?:ed|ing)?|unwashed|dried in (?:the )?cherry)\b/.test(norm)&&!/(?:washed|honey|anaerobic)/.test(norm))return 'Natural';
  // This is one anaerobic treatment with a natural drying subtype,
  // not an ambiguous Washed & Natural blend.
  if(/\b(?:anaerob(?:ic|ico|ica)[\s-]+(?:natural|washed|honey)|(?:natural|washed|honey)[\s-]+anaerob(?:ic|ico|ica))\b/i.test(s.normalize('NFD').replace(/[\u0300-\u036f]/g,'')))
   return 'Anaerobic';
  if(/\banaerobic(?:ally)?\b/.test(norm)&&/\bferment(?:ation|ed|ing)?\b/.test(norm)&&
     !/\b(?:blend|components?|mixed|mixture)\b|\b(?:washed|natural|honey)\s*(?:&|\+|\/|,|and)\s*(?:washed|natural|honey)\b/.test(norm))return 'Anaerobic';
  // Different components of a blend can have different processes; the
  // canonical single-select field must not silently say "Washed" if the
  // roaster actually says "Washed & Natural".
  const found=[
   ['Anaerobic',/\b(?:anaerobic|anaerobico|anaerobica)\b/],['Honey',/\b(?:honey|miel)\b/],
   ['Washed',/\b(?:washed|lavado|lavada)\b/],['Natural',/\bnatural\b/]
  ].filter(([,re])=>re.test(norm)).map(([name])=>name);
  if(/^(?:other\s*\/\s*unknown|other|unknown|mixed)$/i.test(norm.trim()))return 'Other/Unknown';
  // Explicitly combined methods (not an anaerobic-natural single process)
  // use the approved dropdown's Other/Unknown while retaining source text.
  if(found.length>1&&/\s(?:and|&)\s|\s*[+,\/|]\s*|\s*;\s*|\s*,\s*/i.test(norm))
   return 'Other/Unknown';
  return found.length===1?found[0]:'';
 }
 if(field==='elevation_m'){
  const elevation=parseCoffeeElevation(s);
  return elevation&&!elevation.conflicting?elevation.display:'';
 }
 return s;
}
// A literal farm designator under Location/Origin is an explicit farm
// credit. Split only a published pipe-delimited place tuple ending in a
// named country; the original label/value remains in retained source facts.
function labeledFarmLocation(rawKey,value){
 if(!/^(?:location|origin)$/.test(keyOf(rawKey)))return null;
 const parts=cleanTrailingProductLabels(textOf(value,1000)).split(/\s*\|\s*/);
 if(parts.length<1||parts.length>2||parts.some(part=>/\b(?:if|unless|when|whether|depending|provided|either|or)\b/i.test(part)))return null;
 const farm=parts[0].replace(/\s*\((?:organically grown|(?:certified )?organic)\)\s*$/i,'').trim();
 const word=String.raw`[\p{Lu}][\p{L}\p{M}'’.-]*`;
 const tail=String.raw`(?:\s+(?:`+word+String.raw`|de|del|la|las|los|da|das|do|dos)){0,6}`;
 const named=new RegExp('^(?:(?:Finca|Fazenda|Hacienda)\\s+'+word+tail+'|'+word+tail+'\\s+Farms?)$','u');
 if(farm.length>120||!named.test(farm))return null;
 const origin=parts[1]?.trim()||'';
 if(parts.length===2){
  const places=origin.split(/\s*,\s*/);
  if(places.length<1||places.length>6||!ORIGIN_COUNTRIES.has(keyOf(places.at(-1)))||
    places.some(place=>!place||place.length>100||!/^[\p{Lu}][\p{L}\p{M}\d\s'’().-]*$/u.test(place)))return null;
 }
 return {farm,origin};
}
// Prefer an explicit detailed selected-product tasting list over a short,
// unseparated storefront flavor taxonomy. The taxonomy remains in source facts.
// A separately itemized conflicting flavor list is *never* suppressed.
export function isCoarseCoffeeFlavorTaxonomy(label,value,detailed){
 const text=String(value||'').trim();
 return keyOf(label)==='flavornotes'&&!/[,;|]/.test(text)&&text.length<=80&&
  ((text.split(/\s+/).length>=3&&text.split(/\s+/).length<=6)||
   ([...text.matchAll(/[\p{Ll}][\p{Lu}]/gu)].length>=2)||
   (text.split(/\s+/).length>=2&&/[\p{Ll}][\p{Lu}]/u.test(text)))&&
  typeof detailed==='string'&&detailed.split(/\s*,\s*/).length>=3;
}
// A labeled metric panel that only names acidity/body is not a tasting
// descriptor list. Preserve the raw published panel in source_facts.
export function isMetricOnlyCoffeeTastingPanel(label,value){
 if(keyOf(label)!=='tastingnotes')return false;
 const text=String(value||'').trim();
 const match=/^(acidity|body)\s*:\s*[^,;:]{2,110},\s*(acidity|body)\s*:\s*[^;:]{2,140}$/i.exec(text);
 return !!match&&match[1].toLowerCase()!==match[2].toLowerCase();
}
// Some storefront HTML concatenates comma-separated selected flavor chips
// without separators and then appends a new "Best for" label. Ignore only a
// byte-equivalent prefix of the already accepted *longer* explicit note list.
export function isCollapsedSelectedTastesLikePrefix(value,complete){
 const match=/^(.{6,180}?),\s*Best\s+for(?:[A-Z]|\s|$)/.exec(String(value||''));
 const terms=String(complete||'').split(/\s*,\s*/).filter(Boolean);
 if(!match||terms.length<4)return false;
 const folded=s=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
 const observed=folded(match[1]);let prefix='';
 for(let at=0;at<terms.length-1;at++){
  prefix+=folded(terms[at]);
  if(at>=1&&observed===prefix)return true;
 }
 return false;
}
// A merchant may show an explicit multi-note profile in a Tasting Notes
// section and a separate coarse Flavors taxonomy in its Brewing
// Recommendations. These are DIFFERENT published information roles; a
// secondary recommendation taxonomy is not a contradictory tasting list.
// Require every visible Tasting Notes copy to contain the same full literal
// words, admit no other flavor source and preserve the exact printed string.
// A different labeled tasting list, or an unscoped Flavors list, still
// remains a genuine conflict and stays withheld for member confirmation.
export function explicitCoffeeNotesSeparateFromBrewingTags(facts){
 if(!Array.isArray(facts))return null;
 const relevant=facts.filter(f=>f?.field==='tasting_notes');
 if(relevant.length<2||relevant.length>8)return null;
 const notes=[],other=[];let hasRecommendation=false;
 for(const f of relevant){
  const label=keyOf(String(f.label||'')),section=keyOf(String(f.section||''));
  if(label==='tastingnotes'&&section==='tastingnotes'&&f.source_type==='html')notes.push(f);
  else if(label==='flavors'&&section==='brewingrecommendations'&&f.source_type==='html')hasRecommendation=true;
  else other.push(f);
 }
 if(!hasRecommendation||other.length||!notes.length)return null;
 const exact=value=>String(value||'').normalize('NFKD').replace(/\p{M}/gu,'')
  .toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
 const current=notes.find(f=>String(f.value||'').split(/\s*,\s*/).length>=3);
 if(!current||!notes.every(f=>exact(f.value)===exact(current.value)))return null;
 return normalizeExplicitCoffeeTastingNotes(current.value)||null;
}
function addField(fields,rawKey,value,{literalAnonymousProducer=false}={}){
 // Layout extractors may pass either a visible roaster label or an
 // already-resolved internal field key such as release_label. Never drop a
 // supported canonical key just because its display synonym is absent.
 const key=Object.hasOwn(FIELD_ALIASES,rawKey)?rawKey:LOOKUP.get(keyOf(rawKey));
 if(!key)return;
 if(key==='origin'){
  const place=labeledFarmLocation(rawKey,value);
  if(place){
   addField(fields,'Farm',place.farm);
   if(!place.origin)return;
   value=place.origin;
  }
 }
 // Keep every valid literal process claim, including evidence encountered
 // after a provisional category conflict, for precise stage reconciliation.
 if(key==='process')recordCoffeeProcessingClaim(fields,cleanTrailingProductLabels(textOf(value,1000)),normalized(key,value));
 // A recurring calendar window describes harvest timing, not the identity
 // of this year's release. Keep it even when a separate year is disputed.
 if(key==='release_label'){
  const window=normalized(key,value);
  if(isRecurringCoffeeHarvestWindow(window)){rememberRecurringHarvest(fields,window);return;}
  if(isGenericCoffeeLotLabel(window))return;
 }
 const conflicts=conflictsByFields.get(fields);
 // Record literal alternatives even after a prior contradictory reading has
 // disabled autofill. These strings are review-only and source-unverified.
 const reviewValue=normalized(key,value,{allowFlavorProse:key==='tasting_notes'&&rawKey!==key,
  allowAnonymousProducer:key==='producer'&&literalAnonymousProducer});
 if(reviewValue)rememberCoffeeReviewCandidate(fields,key,reviewValue,rawKey);
 if(conflicts?.has(key))return;
 if(key==='elevation_m'&&parseCoffeeElevation(textOf(value,500))?.conflicting){
  conflicts?.add(key);delete fields[key];return;
 }
 if(key==='roast_level'&&Array.isArray(value)&&new Set(value.map(item=>normalizeRoastLabel(textOf(item,100))).filter(Boolean)).size>1){
  conflicts?.add(key);delete fields[key];return;
 }
 let s=normalized(key,value,{allowFlavorProse:key==='tasting_notes'&&rawKey!==key,allowAnonymousProducer:key==='producer'&&literalAnonymousProducer});
 // The selected Country caption can append a bean style and a marketing
 // blend title, neither of which is a place. Retain the unmodified source
 // fact, but autofill only its already-explicit known producing country.
 if(key==='origin'&&s&&/^(?:country|countryoforigin|pais|paisdeorigen|pays)$/.test(keyOf(rawKey))){
  const blend=s.match(/^([\p{L}\p{M}][\p{L}\p{M} .'-]{2,50}?)\s+Peaberry\s+(?:[\p{L}\p{M}]+\s+){0,2}Blend$/iu);
  if(blend&&ORIGIN_COUNTRIES.has(keyOf(blend[1])))s=blend[1].trim();
 }
 if(key==='tasting_notes'&&isMetricOnlyCoffeeTastingPanel(rawKey,s))return;
 // A named cooperative/farm can be accidentally prefixed to a Region
 // caption. Remove it only with independent, literal role evidence from
 // this selected product; the complete published value remains in facts.
 if(key==='origin'&&s)s=cleanCoffeeGeographyEntityPrefix(s,geographyRolesByFields.get(fields)||[]);
 if(key==='tasting_notes'&&s&&fields[key]){
  // A compact unseparated "Flavor Notes" metadata taxonomy is a coarser
  // storefront grouping, not a competing literal tasting list. Prefer the
  // existing multi-note explicit profile and keep the taxonomy in source
  // facts; a separately comma-delimited contrary list still conflicts.
  if(isCoarseCoffeeFlavorTaxonomy(rawKey,s,fields[key]))return;
  // A shorter generic "Tastes like" list may omit a flavor in an explicit
  // longer selected-product profile without contradicting any printed note.
  if((keyOf(rawKey)==='tasteslike'||keyOf(rawKey)==='notes')&&coffeeTastingNotesSubset(s,fields[key]))return;
  if(keyOf(rawKey)==='tasteslike'&&isCollapsedSelectedTastesLikePrefix(s,fields[key]))return;
  const prose=value=>!normalizeExplicitCoffeeTastingNotes(value)||/^(?:a|an)\b.*\b(?:cup|coffee|notes?|aroma|flavou?r|body|finish)\b/i.test(value);
  const beforeProse=prose(fields[key]),afterProse=prose(s);
  if(beforeProse&&!afterProse){fields[key]=s;return;}
  if(afterProse&&!beforeProse)return;
  if(structuredFlavorByFields.get(fields)===fields[key]&&
   /^(?:flavor|flavour|flavornotes|flavournotes|tastingnotes|notes)$/.test(keyOf(rawKey))&&
   coffeeTastingNotesSubset(s,fields[key])){
   // Source hierarchy: a shorter direct selected Flavor label is preferred
   // to an overlapping longer Product JSON flavor taxonomy; two independently
   // printed labels remain genuinely contradictory, never merged.
   fields[key]=s;structuredFlavorByFields.delete(fields);return;
  }
  if(equivalentCoffeeTastingNotes(s,fields[key])){
   if(!/[,;&|•·/]/.test(fields[key])&&/[,;&|•·/]/.test(s))fields[key]=s;
   return;
  }
  conflicts?.add(key);delete fields[key];return;
 }
 if(key==='variety'&&s&&fields.variety){
  const compatible=compatibleGenericCoffeeVarieties(fields.variety,s);
  if(compatible){
   fields.variety=compatible;
   if(compatible===s)narrativeIdentityByFields.get(fields)?.delete(key);
   return;
  }
 }
 if(key==='producer'&&s&&fields.producer){
  // Keep the identical named cooperative/program when another current
  // caption merely qualifies it as a women-producers program.
  const normalize=value=>keyOf(String(value).replace(/\b(?:women|female)\s+producers?\s+(?=program\b)/ig,''));
  const prior=fields.producer;
  if(normalize(prior)===normalize(s)&&/\bprogram\b/i.test(prior)&&/\bprogram\b/i.test(s)&&
   prior.includes(',')&&s.includes(',')&&keyOf(prior.split(',')[0])===keyOf(s.split(',')[0])){
   if(s.length>prior.length)fields.producer=s;
   return;
  }
 }
 if(s)narrativeIdentityByFields.get(fields)?.delete(key);
 // Storefront reverse-layout metrics can accidentally assign the RELATIONSHIP
 // year to the neighboring PRODUCER label (observed on Wuri / Uraga).
 if(key==='producer'&&(/^(?:since|est(?:ablished)?\.?|founded)\s+(?:19|20)\d{2}$/i.test(s)||
   /^(?:coffee\s+)?growers?\s+from\b/i.test(s)||
   (/^\d/.test(s)&&!/\b(?:farmers?|growers?|producers?|farms?|cooperatives?|community|famil(?:y|ies)|small[ -]?holders?|farm[ -]?holders?)\b/i.test(s))))return;
 // A farm and its named grower are complementary source facts. Preserve
 // the farm separately and prefer an explicit producer over a farm fallback.
 if(key==='producer'&&s){
  const farm=/^(?:farm|farms|finca)$/.test(keyOf(rawKey));
  if(farm){
   if(farmEvidenceByFields.has(fields)&&keyOf(farmEvidenceByFields.get(fields))!==keyOf(s)){
    farmEvidenceByFields.set(fields,null);
    if(producerEvidenceByFields.get(fields)==='farm')delete fields.producer;
    return;
   }
   if(!farmEvidenceByFields.has(fields))farmEvidenceByFields.set(fields,s);
   if(fields.producer)return;
   producerEvidenceByFields.set(fields,'farm');
  }else if(producerEvidenceByFields.get(fields)==='farm'){
   fields.producer=s;producerEvidenceByFields.set(fields,'producer');return;
  }else producerEvidenceByFields.set(fields,'producer');
 }
 if(key==='origin'&&s){
  const label=keyOf(rawKey),geography=geographyByFields.get(fields)||{};
  const regionLevel=/^(?:regions?|growingregion|regionmunicipality|regioncity)$/.test(label)?'region':
   /^(?:department|province|state|district|municipality|subregion|city|village)$/.test(label)?label:null;
  let part=/^(?:country|countryoforigin|pais|paisdeorigen|pays)$/.test(label)?'country':regionLevel?'region':null;
  const allParts=geographyParts(s);
  if(!part&&allParts.length&&allParts.every(value=>ORIGIN_COUNTRIES.has(value)))part='country';
  if(!part&&allParts.length===1&&ORIGIN_AREAS.has(allParts[0]))part='area';
  const reject=()=>{conflicts?.add('origin');delete fields.origin;geographyByFields.delete(fields);};
  // Country evidence also appears under Origin/Origen or inside a fuller
  // region-country value. A narrower label cannot overwrite a different
  // explicit country, even before its Region counterpart has arrived.
  const countries=geographyParts(s).filter(value=>ORIGIN_COUNTRIES.has(value)).sort();
  if(!countries.length&&part==='country')countries.push(...geographyParts(s).sort());
  const blend=blendEvidenceByFields.get(fields),blendCountries=(blend?.complete_origins&&blend.multi_country?blend.origins:[])
   .flatMap(geographyParts).filter(value=>ORIGIN_COUNTRIES.has(value));
  const sameBlend=blendCountries.length>1&&countries.length&&geography.countries?.length&&
   [...countries,...geography.countries].every(country=>blendCountries.includes(country));
  if(countries.length&&geography.countries?.length&&countries.join('|')!==geography.countries.join('|')&&!sameBlend){
   reject();return;
  }
  if(countries.length)geography.countries=sameBlend?[...new Set(blendCountries)].sort():countries;
  if(part){
   const previous=part==='region'?geography.regions?.[regionLevel]:geography[part];
   const value=previous?compatibleGeography(previous,s):s;
   if(!value){reject();return;}
   if(part==='region'){
    geography.regions??={};geography.regions[regionLevel]=value;
    let joined='';
    for(const level of ['village','city','municipality','subregion','district','region','province','department','state']){
     const next=geography.regions[level];if(!next)continue;
     joined=joined?(compatibleGeography(joined,next)||joined+', '+next):next;
    }
    geography.region=joined;
   }else geography[part]=value;
  }else{
   // Keep a small deduplicated set of original untyped values. Waiting for
   // the typed pair permits Origin:Huila as well as Origin:Colombia, while
   // still checking every earlier source once that pair is complete.
   geography.origins??=[];
   if(!geography.origins.some(value=>keyOf(value)===keyOf(s))){
    if(geography.origins.length>=16){reject();return;}
    geography.origins.push(s);
   }
  }
  geographyByFields.set(fields,geography);
  if((geography.country&&geography.region)||(geography.area&&(geography.region||geography.country))){
   let combined='';
   for(const part of [geography.region,geography.area,geography.country].filter(Boolean))
    combined=combined?(compatibleGeography(combined,part)||combined+', '+part):part;
   for(const origin of geography.origins||[]){
    let compatible=compatibleGeography(combined,origin);
    // Explicit Region: Fresno and Origin: Tolima, Colombia on the same
    // selected coffee are complementary printed place parts. Do not
    // infer any missing country, mutate provenance or merge distinct countries.
    if(!compatible&&geography.region&&!geography.country&&!geography.area){
     const items=String(origin).split(/\s*,\s*/u).filter(Boolean),tail=items.at(-1)||'';
     const region=geographyParts(geography.region);
     if(items.length>=2&&items.length<=3&&ORIGIN_COUNTRIES.has(keyOf(tail))&&
      region.length>0&&region.every(x=>!ORIGIN_COUNTRIES.has(x))&&
      !items.some(x=>keyOf(x)===keyOf(geography.region)))
      compatible=[geography.region,...items].join(', ');
    }
    if(!compatible&&geography.area){
     const withoutArea=combined.split(/\s*,\s*/).filter(part=>keyOf(part)!==keyOf(geography.area)).join(', ');
     const refined=compatibleGeography(withoutArea,origin);
     if(refined)compatible=withPublishedArea(refined,geography.area);
    }
    combined=compatible;
    if(!combined){reject();return;}
   }
   fields.origin=combined;
   return;
  }
  // Reconcile fuller untyped Origin values even if a separate Region label
  // is absent. Colombia -> Huila, Colombia is enrichment; Huila, Colombia
  // versus Cauca, Colombia is a contradiction, not a first-value preference.
  let combined=geography.country||geography.region||geography.area||geography.origins?.[0]||'';
  for(const origin of geography.origins||[]){
   const value=compatibleGeography(combined,origin);
   if(value){combined=value;continue;}
   if(geography.region&&!geography.country&&(isCoffeeBroadOrigin(combined)||isCoffeeBroadOrigin(origin))){
    const broad=isCoffeeBroadOrigin(combined)?combined:origin;
    const local=isCoffeeBroadOrigin(combined)?origin:combined;
    combined=local+', '+broad;continue;
   }
   const firstCountries=geographyParts(combined).filter(part=>ORIGIN_COUNTRIES.has(part));
   const otherCountries=geographyParts(origin).filter(part=>ORIGIN_COUNTRIES.has(part));
   // A typed literal area can complete a region-country tuple even when
   // that tuple was published under Origin rather than separate captions.
   // Require its explicit final country; do not infer one from the area.
   if(geography.area&&!geography.region&&!geography.country&&otherCountries.length===1){
    const pieces=origin.split(/\s*,\s*/);
    if(pieces.length>1&&ORIGIN_COUNTRIES.has(keyOf(pieces.at(-1)))){
     combined=withPublishedArea(origin,geography.area);continue;
    }
   }
   if((isCoffeeBroadOrigin(combined)||isCoffeeBroadOrigin(origin))&&(firstCountries.length||otherCountries.length)){reject();return;}
   if(geography.country&&!geography.region&&!otherCountries.length&&geographyParts(combined).every(part=>ORIGIN_COUNTRIES.has(part))){
    combined=origin+', '+geography.country;continue;
   }
   if(!geography.country&&geography.region&&!geography.area&&otherCountries.length===1){
     const printed=String(origin).split(/\s*,\s*/u).filter(Boolean);
     const first=keyOf(printed[0]||''),last=keyOf(printed.at(-1)||'');
     const hasFirst=ORIGIN_COUNTRIES.has(first),hasLast=ORIGIN_COUNTRIES.has(last);
     const region=geographyParts(geography.region);
     if(printed.length===2&&hasFirst&&!hasLast&&region.length>0&&
      region.every(place=>!ORIGIN_COUNTRIES.has(place))){
      const ordered=hasFirst?[printed[1],printed[0]]:printed;
      combined=[geography.region,...ordered].join(', ');continue;
     }
    }
    if((firstCountries.length&&otherCountries.length)||(!geography.country&&!geography.region)||geography.country||
      (geography.region&&otherCountries.length)){
    reject();return;
   }
  }
  if(combined){fields.origin=combined;return;}
 }
 if(key==='release_label'&&s){
  const label=keyOf(rawKey),kind=/^(?:harvest|crop|cosecha|fechadecosecha)/.test(label)?'harvest':/^lot/.test(label)?'lot':'release';
  if(kind==='lot'&&/^(?:single[ -]origin|blend|communal|community|regional)(?:\s+lot)?$/i.test(s))return;
  if(kind==='harvest'&&/\b(?:hand[ -]?picked|selective picking|seasonally selected|peak ripeness|year[ -]round)\b/i.test(s))return;
  const evidence=releaseEvidenceByFields.get(fields)||{};
  const comparable=value=>keyOf(String(value).replace(/^(?:harvest(?: year)?|crop year|lot(?: number)?|release(?: year)?)\s*[:#-]?\s*/i,''));
  if(evidence[kind]&&comparable(evidence[kind])!==comparable(s)){
   conflicts?.add(key);delete fields[key];return;
  }
  evidence[kind]??=s;
  if(evidence.harvest&&evidence.release&&comparable(evidence.harvest)!==comparable(evidence.release)){
   conflicts?.add(key);delete fields[key];return;
  }
  releaseEvidenceByFields.set(fields,evidence);
  const primary=evidence.harvest||evidence.release;
  if(primary&&evidence.lot){
   const prefix=evidence.harvest?'Harvest':'Release';
   const first=new RegExp('^'+prefix+'\\b','i').test(primary)?primary:prefix+' '+primary;
   const lot=/^lot\b/i.test(evidence.lot)?evidence.lot:'Lot '+evidence.lot;
   fields.release_label=first+'; '+lot;
  }else fields.release_label=primary||evidence.lot;
  return;
 }
 // Withhold contradictory categorical/release evidence instead of silently
 // preferring stale JSON-LD. Compound processes must stay unsimplified.
 // A truly mixed-process product is explicitly Other/Unknown, not blank.
 // Once its mixture is documented, a narrower single-method summary should
 // not override it. Contradictory single methods still require review.
 if(key==='process'&&s==='Other/Unknown'){
  fields.process='Other/Unknown';return;
 }
 if(key==='process'&&fields.process==='Other/Unknown')return;
 if(key==='elevation_m'&&s&&fields.elevation_m){
  // Conversion rounds the display to metres. Compare the original units
  // so an explicitly published feet range does not conflict with its own
  // metric counterpart merely because of that display rounding.
  const source=textOf(value,500),previous=elevationSourceByFields.get(fields)||fields.elevation_m;
  const compatible=compatibleCoffeeElevations(previous,source);
  if(compatible){fields.elevation_m=normalized('elevation_m',compatible);elevationSourceByFields.set(fields,compatible);return;}
 }
 if(conflicts&&(s&&fields[key]&&['process','roast_level','producer','elevation_m','variety'].includes(key)&&
    (key==='variety'?!equivalentCoffeeVarieties(s,fields[key]):key==='elevation_m'?!equivalentCoffeeElevations(s,fields[key]):keyOf(s)!==keyOf(fields[key])))){
  conflicts.add(key);delete fields[key];return;
 }
 if(fields[key])return;
 if(s){fields[key]=s;if(key==='elevation_m')elevationSourceByFields.set(fields,textOf(value,500));}
}
function canonicalIdentityScope(fields,raw,source_type='html'){
 const scoped=isolateCoffeeIdentityCohorts(withoutEducationalCoffeeGeography(raw,{clean}),{name:fields.name});
 if(scoped.origin)addField(fields,'Origin',scoped.origin);
 if(scoped.truncated)identityScopeTruncatedByFields.add(fields);
 const retained=identityQuarantinesByFields.get(fields)||[];
 for(const range of scoped.quarantined||[]){
  const fragment=raw.slice(range.start,range.end);
  if(!fragment||retained.some(item=>item.raw===fragment&&item.source_type===source_type))continue;
  if(retained.length>=12){identityScopeTruncatedByFields.add(fields);break;}
  retained.push({raw:fragment,source_type});
 }
 if(retained.length)identityQuarantinesByFields.set(fields,retained);
 return scoped.html;
}
function canonicalComponentScope(fields,html){
 const blend=extractCoffeeBlendEvidence(html,{name:fields.name,scoped:true});
 if(!blend)return html;
 const previous=blendEvidenceByFields.get(fields);
 if(!previous||blend.display.length>previous.display.length)blendEvidenceByFields.set(fields,blend);
 if((blend.origin||blend.origins.length)&&(blend.component_format!=='narrative'||blend.complete_origins))
  addField(fields,'Origin',blend.origin||blend.origins.join(', '));
 if(blend.complete_producers)addField(fields,'Producer',blend.producers.join(', '));
 if(blend.complete_varieties)addField(fields,'Variety',blend.varieties.join(', '));
 if(blend.multi_process&&blend.all_component_processes!==false)addField(fields,'Process','Other/Unknown');
 else if(blend.complete_process)addField(fields,'Process',blend.processes[0]);
 return withoutCoffeeBlendComponentSpecs(html,blend);
}
function productFlavorProfiles(fields,html){
 const profiles=extractProductFlavorProfileEvidence(html,{clean});
 const complete=profiles.filter(profile=>profile.kind!=='named_chips');
 for(const profile of profiles){
  if(profile.kind==='named_chips'&&complete.some(other=>coffeeTastingNotesSubset(profile.value,other.value)))continue;
  addField(fields,'Tasting Notes',profile.value);
 }
 return profiles.length;
}
function productDetails(fields,p){
 const brand=publishedRoaster(textOf(p.brand??p.manufacturer));
 if(brand&&!fields.roaster)fields.roaster=brand;
 const rawDescription=String(p.description??'');
 const currentDescription=rawDescription&&rawDescription.length<=160000?canonicalIdentityScope(fields,rawDescription,'product_json'):'';
 const description=currentDescription?canonicalComponentScope(fields,currentDescription):'';
 rememberGeographyEntityRoles(fields,description);
 // Release descriptions must be tied to this EXACT selected Product, never
 // to storefront banners, related coffees, publish dates or URL slugs.
 // Distinctive parenthetical title labels outrank a shorter generic Shopify
 // category tag on the same product (October Limited Blend vs Limited Blend).
 const selectedTitle=textOf(p.name??p.title,200);
 const titleRelease=selectedTitle.match(/\(\s*((?:(?:January|February|March|April|May|June|July|August|September|October|November|December|20\d{2})\s+)?Limited\s+(?:Blend|Release|Edition|Reserve|Offering|Batch))\s*\)\s*$/i)?.[1]||
  selectedTitle.match(/\b(Limited\s+(?:Edition|Release|Reserve|Offering|Batch))\s*$/i)?.[1]||'';
 if(titleRelease)addField(fields,'release_label',titleRelease);
 // An uppercase standalone badge inside the selected Product description
 // is a literal release label, not a promotional sidebar or a general
 // coffee-related sentence. Do not infer a lot number or harvest year.
 const releaseBadge=[...currentDescription.matchAll(/<strong\b[^<>]{0,250}>\s*(LIMITED\s+RELEASE)(?:\s*\|\s*WHOLE\s+BEAN\s+ONLY)?\s*<\/strong>/gi)];
 if(releaseBadge.length===1)addField(fields,'release_label',releaseBadge[0][1]);
 // Some roasters spell out a named seasonal release in the exact coffee's
 // prose. Require the selected name itself as the grammatical subject.
 const leadingName=selectedTitle.split(/\s+[-–—|]\s+/)[0]?.trim()||'';
 if(leadingName.length>=5&&leadingName.length<=65){
  const releaseSentence=new RegExp('\\b'+leadingName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+
   '\\s+is\\s+a\\s+(limited\\s+(?:spring|summer|autumn|fall|winter)\\s+release)\\b','i');
  const sentence=releaseSentence.exec(clean(currentDescription,20000));
  if(sentence)addField(fields,'release_label',sentence[1]);
 }
 const properties=Array.isArray(p.additionalProperty)?p.additionalProperty.slice(0,80):p.additionalProperty&&typeof p.additionalProperty==='object'?[p.additionalProperty]:[];
 for(const row of properties){
  addField(fields,row?.name,row?.value);
 }
 // Product JSON-LD and storefront metadata may include HTML or plain-text
 // labels, often separated by BR, newlines or semicolons (not HTML tables).
 // Keep explicit labels and current-place tuples scoped to this Product.
 if(description){
  for(const place of extractCoffeeGeographyTuples(description,{name:fields.name,clean,includeCurrentLocality:true}))addField(fields,'Origin',place);
  // The selected structured description can contain the same real tables,
  // definition lists and metric cards as visible HTML. Preserve their
  // structure instead of flattening a header row into a supposed value.
  for(const fact of extractSemanticCoffeeSpecs(description,{clean}).facts)
   if(Object.hasOwn(FIELD_ALIASES,fact.kind))addField(fields,fact.label,fact.value);
  labeledPairs(description,fields);
  const delimited=entities(description.replace(/<br\s*\/?>|<\/(?:p|li|div)>/gi,'\n')
   .replace(/<[^<>]{0,800}>/g,' '));
  // A semicolon terminates an HTML entity and can also separate cultivars.
  // Decode first, and split only before another explicit label; otherwise
  // "Caturra &amp; Castillo" creates a false second claim "Caturra &amp".
  const segments=delimited.split(/\r?\n|\s*;\s*(?=[\p{L}][\p{L} .&/'()_-]{1,55}\s*[:：])/u);
  for(const line of segments.slice(0,90)){
   const m=clean(line,450).match(/^([\p{L}][\p{L} .&/'-]{1,36})\s*(?:[:：|=]|\s+[-–—]{1,3}\s+|\s+\/{2,3}\s+)\s*(.{2,270})$/u);
   if(m&&LOOKUP.has(keyOf(m[1])))addField(fields,m[1],m[2]);
  }
 }
 if(currentDescription){
  const escape=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const body=/<[a-z][^>]*>/i.test(currentDescription)?currentDescription:currentDescription.split(/\r?\n/).filter(line=>line.trim()).map(line=>'<p>'+escape(line)+'</p>').join('');
  const story='<main><h1>'+escape(fields.name)+'</h1><div itemprop="description">'+body+'</div></main>';
  for(const fact of extractCoffeeCurrentReleasePrefixes(story,{clean}))addIdentityFact(fields,fact);
  const explicit=productFlavorProfiles(fields,story);
  if(!explicit){
   // Resolve narrative geography only after all selected labels and
   // equivalent Product nodes have supplied their current origin evidence.
   const existing=narrativeFlavorStoriesByFields.get(fields)||[];
   if(!existing.includes(story))existing.push(story);
   narrativeFlavorStoriesByFields.set(fields,existing);
  }
  const roast=extractRoastVisualEvidence(story);
  if(roast.confidence==='conflict'){conflictsByFields.get(fields)?.add('roast_level');delete fields.roast_level;}
  else if(roast.value)addField(fields,'roast_level',roast.value);
 }
 for(const [key,value] of Object.entries(p)){
  if(['additionalProperty','offers','description','brand','manufacturer','image'].includes(key))continue;
  addField(fields,key,value);
 }
 // Each recognized metadata container can supply complementary fields.
 // Empty metafields must not shadow attributes, and contradictions still
 // pass through the same canonical evidence checks.
 for(const details of [p.metafields,p.metadata,p.attributes,p.options]){
 if(Array.isArray(details)){
  for(const row of details.slice(0,80))if(row&&typeof row==='object')
   addField(fields,row.name??row.key??row.label,row.value??row.values??row.options);
 }else if(details&&typeof details==='object'){
  for(const [key,value] of Object.entries(details).slice(0,80)){
   // Some Shopify theme metafields use {value:"Light"} / nested custom.
   if(key==='custom'&&value&&typeof value==='object'&&!Array.isArray(value)){
    for(const [sub,subValue] of Object.entries(value).slice(0,50))addField(fields,sub,subValue);
   }else addField(fields,key,value);
  }
 }
 }
 const tags=(Array.isArray(p.tags)?p.tags.slice(0,60):[]).filter(tag=>typeof tag==='string');
 const tagPairs=tags.map(tag=>tag.match(/^(origin|process|roast(?: level)?|variety|tasting notes|region|producer)\s*[:=]\s*(.{2,130})$/i)).filter(Boolean);
 // Shopify tags are exact-current-product taxonomy, not a roaster's
 // general collection: retain an explicit standalone Limited Blend tag
 // only when a more specific directly printed title release is absent.
 // Never combine a date/season from unrelated category tags with the label.
 const limitedBlendTags=tags.filter(tag=>/^Limited\s+Blend$/i.test(tag.trim()));
 if(!titleRelease&&limitedBlendTags.length===1)addField(fields,'release_label',limitedBlendTags[0].trim());
 const originTags=tagPairs.filter(pair=>pair[1].toLowerCase()==='origin');
 const processTags=tagPairs.filter(pair=>pair[1].toLowerCase()==='process');
 const declaredBlend=tags.some(tag=>/^type\s*[:=]\s*blend\s*$/i.test(tag));
 // Multiple exact processing tags on an explicitly declared blend describe
 // its components. Nonblend products still pass each tag to conflict checks.
 const mixedProcessTags=declaredBlend&&processTags.length>1&&processTags.every(pair=>
  /^(?:washed|natural|honey|anaerobic)$/i.test(pair[2].trim()))&&
  new Set(processTags.map(pair=>pair[2].trim().toLowerCase())).size>1;
 let blendOrigin='';
 // An explicitly blend-tagged Product can list one origin country per tag
 // (e.g. Onyx Geometry). Combine only that same-product component cohort;
 // independent descriptions, attributes and visible labels still pass through
 // the ordinary whole-product geography conflict checks.
 if(declaredBlend&&originTags.length>1&&
    originTags.every(pair=>ORIGIN_COUNTRIES.has(keyOf(pair[2])))){
  const countries=new Map();
  for(const pair of originTags)if(!countries.has(keyOf(pair[2])))countries.set(keyOf(pair[2]),pair[2].trim());
  const joined=[...countries.values()].join(', ');
  if(joined.length<=220)blendOrigin=joined;
 }
 let blendOriginAdded=false,blendProcessAdded=false;
 for(const pair of tagPairs){
  if(blendOrigin&&pair[1].toLowerCase()==='origin'){
   if(!blendOriginAdded)addField(fields,'origin',blendOrigin);
   blendOriginAdded=true;
  }else if(mixedProcessTags&&pair[1].toLowerCase()==='process'){
   if(!blendProcessAdded)addField(fields,'process',processTags.map(item=>item[2].trim()).join(' & '));
   blendProcessAdded=true;
  }else addField(fields,pair[1],pair[2]);
 }
 // A selected Shopify product may classify its own roast as a single bare
 // taxonomy tag (for example IXXA Ki-Saya publishes tags: ["Medium"]). This
 // is NOT page prose, a grind option, or another product's catalog badge.
 // Other tags can denote collection memberships, even if a bare tag looks
 // like a roast (Zeke's "Light" category contradicts its medium-light lot).
 // Use this narrow fallback only when the product has ONE tag in total;
 // multiple tags require explicit roast labeling elsewhere.
 const bareRoastTags=tags.filter(tag=>
  /^(?:(?:ultra|very)\s+light|light[ -]medium|medium[ -](?:light|dark)|light|medium|dark)$/i.test(tag.trim()));
 if(tags.length===1&&bareRoastTags.length===1)addField(fields,'roast_level',bareRoastTags[0].trim());
 for(const tag of tags){
  // Exact product-owned taxonomy tags may spell out the type of coffee
  // without a colon. Do not read longer promotional or negative tag text.
  const process=tag.match(/^(?:(washed)\s+coffee|(washed|natural|honey|anaerobic)\s+process(?:ed)?\s+coffee)\s*$/i);
  if(process)addField(fields,'process',process[1]||process[2]);
  // Require the entire selected product taxonomy tag to be a roast level.
  // Matching a suffix of a compound 'Medium Light Roast' previously promoted
  // 'Light Roast' and manufactured a contradiction against Medium-Light.
  // Exact selected-product Coffee_ roast tags remain source evidence.
  // Other product tags or current prose may disagree: preserve the conflict
  // for review instead of silently discarding any published classification.
  const roast=tag.match(/^(?:Coffee_)?((?:(?:ultra|very)\s+light|light\s*[-/ ]\s*medium|medium\s*[-/ ]\s*(?:light|dark)|dark\s*[-/ ]\s*medium|light|medium|dark)(?:\s+|-)roast)(?:\s+coffee)?\s*$/i);
  if(roast)addField(fields,'roast_level',roast[1].replace(/-roast$/i,' Roast'));
 }
 // Exact selected Product only. Do not override stronger visible labels
 // or resurrect a genuinely conflicting fact.
 for(const fact of selectedStructuredCoffeeEvidence({title:selectedTitle,description:currentDescription,tags}))
  if(!fields[fact.field]&&!conflictsByFields.get(fields)?.has(fact.field))addField(fields,fact.field,fact.value);
}
function explicitNearbyFacts(html,fields){
 // Some coffee labels place "Gedeb, Ethiopia" and a flavor list in
 // adjacent product <p> elements. Read the discrete elements, never combine
 // navigation/header words into a fabricated origin.
 let focused=html;
 const h1=html.match(/<h1\b[^<>]{0,2000}>[\s\S]{0,320}?<\/h1>/i);
 if(h1)focused=html.slice(h1.index,h1.index+16000);
 const paragraphs=[...focused.matchAll(/<(p|h[2-6])\b[^<>]{0,350}>([\s\S]{1,450}?)<\/\1>/gi)]
  .map(m=>clean(m[2],200)).filter(Boolean).slice(0,40);
 if(!fields.process){
  for(const paragraph of paragraphs){
   if(/\b(?:not|never|without|neither|unlike|isn't|wasn't|doesn't|rather than|generally|typically|usually|for example|such as|other coffees?|previous (?:harvest|lot|year)|last year)\b/i.test(paragraph))continue;
   if(/\b(?:fully washed|washed|natural|honey|anaerobic)\s+(?:processed|process)\b/i.test(paragraph)){
    addField(fields,'process',paragraph);markNarrativeIdentity(fields,'process');if(fields.process)break;
   }
  }
 }
 const originIndex=paragraphs.findIndex(p=>/^[\p{L}\p{M}][\p{L}\p{M} .’'&/-]{1,135},\s*(?:Ethiopia|Colombia|Kenya|Brazil|Guatemala|Costa Rica|Honduras|El Salvador|Nicaragua|Panama|Peru|Rwanda|Burundi|Mexico|Ecuador|Bolivia|Indonesia|Uganda|Tanzania|Yemen|India|Thailand|China|Vietnam|Laos|Myanmar|Papua New Guinea|DR Congo|United States|Jamaica|Hawaii)$/iu.test(p));
 if(originIndex>=0){
  if(!fields.origin)fields.origin=paragraphs[originIndex];
  if(!fields.tasting_notes){
   const candidate=paragraphs[originIndex+1]||'';
   const following=paragraphs[originIndex+2]||'';
   if(/^[a-z][a-z' -]{2,45}(?:,\s*[a-z][a-z' -]{2,45}){2,5}$/i.test(candidate)&&
     /\b(?:washed|natural|honey|anaerobic)\s+process\b/i.test(following)){
    fields.tasting_notes=candidate;
   }
  }
 }
 // Never infer harvest or roast from surrounding promotional prose.
}
function productHeading(html,{explicitOnly=false}={}){
 const page=productMarkup(html),{nodes}=coffeeHtmlElements(page);
 const matches=nodes.filter(node=>{
  if(!/^h[1-6]$/.test(node.tag)||node.contentEnd-node.headEnd>10000||
   !new RegExp('^</'+node.tag+'\\s*>','i').test(page.slice(node.contentEnd,node.end)))return false;
  const attributes=attrs(node.attributes),explicit=/\b(?:product[_-]title|product__title|product-single__title)\b/i.test(attributes.class||'')||attributes.itemprop==='name';
  return explicitOnly?explicit:node.tag==='h1'||explicit;
 }).slice(0,20).map(node=>{
   const content=removeElements(page.slice(node.headEnd,node.contentEnd),['svg','audio','button','style','script'])
    .replace(/<(span|small)\b[^<>]{0,600}\bclass=["'][^"']{0,300}\bprice\b[^"']{0,300}["'][^<>]{0,600}>[\s\S]{0,600}?<\/\1>/gi,' ');
   // Animated headings can wrap every letter in nested spans. Only join
   // single-character leaves within explicitly grouped words; ordinary
   // multiword headings retain their normal spaces and accents.
   const words=[...content.matchAll(/<div\b[^<>]{0,1000}\bclass=["'][^"']{0,400}\bword\b[^"']{0,400}["'][^<>]{0,1000}>([\s\S]{1,5000}?)<\/div>/gi)];
   if(words.length&&words.length<=16){
    const reconstructed=words.map(word=>{
     const chars=[...word[1].matchAll(/<span\b[^<>]{0,500}>([^<>]{0,20})<\/span>/gi)]
      .map(char=>entities(char[1]));
     const joined=chars.join('').trim();
     const complete=clean(word[1],250).replace(/\s+/g,'')===joined.replace(/\s+/g,'');
     return complete&&chars.length>=1&&chars.length<=80&&chars.every(char=>[...char].length===1||/^[^\p{M}]\p{M}$/u.test(char))?joined:'';
    });
    const rest=content.replace(/<div\b[^<>]{0,1000}\bclass=["'][^"']{0,400}\bword\b[^"']{0,400}["'][^<>]{0,1000}>([\s\S]{1,5000}?)<\/div>/gi,'');
    if(reconstructed.every(Boolean)&&!clean(rest,200))return reconstructed.join(' ').slice(0,170);
   }
   return clean(content,170);
  }).filter(x=>x&&!/^(shop|home|coffee|products|search|menu)$/i.test(x));
 const distinct=[...new Set(matches.map(x=>x.toLowerCase()))];
 return distinct.length===1?matches[0]:'';
}
// A shop-wide SEO heading on a deep Ecwid/Wix URL is not proof that any
// individual coffee is selected. Never invent product identity from it.
function genericStorefrontHeading(value){
 const s=clean(value,180);
 return /^(?:store|shop|catalog|online store|products?|all products?|shop all)(?:\s*[|:\u2013\u2014-].*)?$/i.test(s)||
  /^.{2,90}?\s*[:|\u2013\u2014-]\s*(?:store|shop|catalog|online store|products?|all products?)$/i.test(s)||
  /^(?:(?:error\s*)?404\b|(?:sorry[,!]?\s*)?(?:page|product)\s+(?:not found|unavailable)|not found|access denied|forbidden|just a moment|verify (?:you are|you're) human|checking your browser|please enable (?:javascript|cookies)|service unavailable|temporarily unavailable)\b/i.test(s);
}
function removeSiteSuffix(title,site){
 const raw=clean(title,200),siteName=clean(site,120);
 if(!siteName||!raw.toLowerCase().endsWith(siteName.toLowerCase()))return raw;
 const stem=raw.slice(0,-siteName.length).replace(/[\s|–—-]+$/g,'').trim();
 return stem||raw;
}
function labeledPairs(html,fields){
 const flavorText=(label,raw,max)=>clean(LOOKUP.get(keyOf(label))==='tasting_notes'?
  raw.replace(/<\/?(?:span|strong|b|em|i|small|sup|sub|a|u|s|mark|abbr)\b[^<>]{0,2000}>/gi,''):raw,max);
 // Structured specifications: <dt>Label</dt><dd>Value</dd>,
 // <tr><th>Label</th><td>Value</td></tr> and common flat key:value.
 for(const m of html.matchAll(/<dt\b[^<>]{0,2000}>([\s\S]{0,180}?)<\/dt>\s*<dd\b[^<>]{0,2000}>([\s\S]{0,800}?)<\/dd>/gi)){
  const label=clean(m[1],80);addField(fields,label,flavorText(label,m[2],600));
 }
 for(const m of html.matchAll(/<tr\b[^<>]{0,2000}>\s*<(?:th|td)\b[^<>]{0,2000}>((?:(?!<\/(?:th|td)>)[\s\S]){0,200}?)<\/(?:th|td)>\s*<td\b[^<>]{0,2000}>((?:(?!<\/td>)[\s\S]){0,800}?)<\/td>\s*<\/tr>/gi)){
  const label=clean(m[1],80);addField(fields,label,flavorText(label,m[2],600));
 }
 // On some pages a single coffee-info paragraph uses line breaks for
 // multiple labeled fields. Parse each explicitly delimited part separately,
 // instead of turning every later fact into a massive "Tasting Notes" value.
 // Shopify SEO description metadata is intentionally excluded.
 for(const m of html.matchAll(/<(?:p|li)\b[^<>]{0,2000}>([\s\S]{0,900}?)<\/(?:p|li)>/gi)){
  const parts=m[1].split(/<br\s*\/?\s*>/gi);
  for(const part of parts.slice(0,14)){
   const str=clean(part,420);
   const label=str.match(/^([\p{L}][\p{L} &/'-]{1,36})\s*(?:[:：|=]|\s+[-–—]{1,3}\s+|\s+\/{2,3}\s+)\s*(.{2,300})$/u);
   if(label){
    const flavor=LOOKUP.get(keyOf(label[1]))==='tasting_notes'?flavorText(label[1],part,420).match(/^([\p{L}][\p{L} &/'-]{1,36})\s*(?:[:：|=]|\s+[-–—]{1,3}\s+|\s+\/{2,3}\s+)\s*(.{2,300})$/u):null;
    addField(fields,label[1],flavor?flavor[2]:label[2]);
   }
  }
 }
}
function shopifyProduct(html,target){
 // Inline, static Shopify/WooCommerce product JSON: no eval and no JS fetch.
 const out=[];
 for(const block of rawElements(html)){
  if(!block.closed||block.attributes.length>700||block.body.length>180000)continue;
  const m=[null,block.attributes,block.body];
  const a=attrs(m[1]);
  if((a.type||'').toLowerCase()!=='application/json'||!/product/i.test(JSON.stringify(a)))continue;
  try{
   const p=JSON.parse(m[2]);
   if(!p||typeof p!=='object'||typeof p.title!=='string')continue;
   if(p.url&&!samePage(p.url,target))continue;
   if(typeof p.handle==='string'){
    const handle=new URL(target).pathname.match(/\/products\/([^/]+)\/?$/i)?.[1];
    if(handle&&decodeURIComponent(handle)!==p.handle)continue;
   }
   out.push({...p,name:p.title,brand:p.vendor||p.brand||'',url:p.url||null});
  }catch{}
 }
 return out;
}
/**
 * A generic cross-roast cupping table is evidence ONLY for a specifically
 * selected named roast, never for a nearby coffee that merely shares a site.
 * Preserve the literal selected row. Product-specific chocolate/body prose is
 * separate context, never a replacement for the printed cupping line.
 */
export function selectedNamedRoastCuppingEvidence(productHtml,selectedName){
 if(typeof productHtml!=='string'||productHtml.length>2_000_000||
    typeof selectedName!=='string')return null;
 const selected=selectedName.match(/\b(American|Vienna|French|Espresso|Black and Tan|Organic)\s+roast\b/i);
 if(!selected)return null;
 const expected=selected[1].toLowerCase();
 const found=new Map();
 for(const paragraph of productHtml.matchAll(/<p\b[^>]{0,750}>([\s\S]{1,4200}?)<\/p>/gi)){
  if(!/\bCupping Notes\b/i.test(paragraph[1]))continue;
  const lines=paragraph[1].replace(/<br\b[^>]{0,500}>/gi,'\n').split(/\n+/)
   .map(line=>clean(line,380)).filter(Boolean);
  if(!lines.slice(0,3).some(line=>/\bCupping Notes\b/i.test(line)))continue;
  const rows=new Map();
  for(const line of lines){
   const item=line.match(/^(American|Vienna|French|Espresso|Black and Tan|Organic)\s*[-–—:]\s*(.{3,180})$/i);
   if(!item)continue;
   const k=item[1].toLowerCase(),notes=item[2].replace(/[.\s]+$/,'').trim();
   if(rows.has(k)&&rows.get(k)!==notes){rows.clear();break;}
   rows.set(k,notes);
  }
  // Three different roast descriptions prove that the paragraph is a
  // comparison matrix, not an arbitrary single title/SEO/marketing phrase.
  if(rows.size<3||!rows.has(expected))continue;
  const value=rows.get(expected);
  if(value&&value.length<=180)found.set(value.toLowerCase(),value);
 }
 if(found.size!==1)return null;
 return {roast:selected[1],notes:[...found.values()][0],
  source_label:'Cupping Notes — '+selected[1]+' roast only'};
}

/** Selected WooCommerce single-product taxonomy can declare a MICRO-LOT.
 * Do not read category chips from related cards, navigation or a different
 * product; the actual product wrapper MUST contain the exact selected H1/H2.
 */
export function selectedMicroLotCategory(productHtml,name){
 if(typeof productHtml!=='string'||productHtml.length>2_000_000||!name)return false;
 const {nodes}=coffeeHtmlElements(productHtml);
 const expected=keyOf(name);
 for(const node of nodes){
  if(!['div','article','main'].includes(node.tag)||node.contentEnd-node.headEnd>160000)continue;
  const attrs=node.attributes||'';
  if(!/\bproduct_cat-micro-lots\b/i.test(attrs)||!/(?:\btype-product\b|\bdata-elementor-type=['"]product['"])/i.test(attrs))continue;
  const body=productHtml.slice(node.headEnd,node.contentEnd);
  // Require one intact selected product heading. A related item whose title
  // differs is not evidence for the selected coffee's release designation.
  const selected=[...body.matchAll(/<h[12]\b[^>]{0,650}>([\s\S]{1,500}?)<\/h[12]>/gi)]
   .some(match=>keyOf(clean(match[1],220))===expected);
  if(selected)return true;
 }
 return false;
}
/** Distinguish a printed producing COMMUNITY from a farmer/person/farm.
 * Every source label must belong to the current selected product section.
 */
export function selectedProducingCommunity(productHtml){
 if(typeof productHtml!=='string'||productHtml.length>2_000_000)return null;
 const blocks=productCoffeeProse(productHtml,clean).filter(x=>!x.educational&&x.tag==='p');
 const names=new Map();let hasLocation=false,hasProcess=false;
 for(const block of blocks){
  const value=block.text.trim();
  if(/^LOCATION\s*[:：]\s*[^:]{3,160}$/i.test(value))hasLocation=true;
  if(/^PROCESS\s*[:：]\s*[^:]{3,120}$/i.test(value))hasProcess=true;
  const m=value.match(/^COMMUNITY\s*[:：]\s*([\p{L}\p{M}][\p{L}\p{M}'’\s-]{1,80})$/iu);
  if(m&&m[1].length<90)names.set(keyOf(m[1]),m[1].trim());
 }
 return hasLocation&&hasProcess&&names.size===1?[...names.values()][0]:null;
}

export function extractPublicCoffeeFacts(html,{source_url}={}){
 if(typeof html!=='string'||html.length>2_000_000||!source_url)return {ok:false,reason:'invalid_source'};
 // A selected, exact-route Next.js Product is not an HTML heading: read only
 // its bounded public conversion state, never nearby recommendations.
 const nextProduct=extractSelectedNextCoffeeProduct(html,{source_url});
 if(nextProduct)return nextProduct;
 let scopeTruncated=false;
 const meta=pageMeta(html),product=productMarkup(html,{onTruncated:()=>{scopeTruncated=true;}});
 const explicitHeading=productHeading(product,{explicitOnly:true});
 const heading=explicitHeading||productHeading(product),identityAnchor=heading||removeSiteSuffix(meta['og:title']||'',meta['og:site_name']);
 const siteIdentities=[];
 const all=[...jsonProducts(html,source_url,siteIdentities,{heading,declaredUrl:meta['og:url']||meta[META_CANONICAL]||''}),...shopifyProduct(html,source_url)];
 const linked=all.filter(p=>productIdentityUrl(p)&&samePage(productIdentityUrl(p),source_url));
 const unlinked=all.filter(p=>!productIdentityUrl(p)&&(!identityAnchor||keyOf(textOf(p.name))===keyOf(identityAnchor)));
 if(!linked.length&&!unlinked.length&&new Set(all.filter(p=>!productIdentityUrl(p)).map(p=>keyOf(textOf(p.name)))).size>1)
  return {ok:false,reason:'ambiguous_or_missing_product'};
 const selected=linked.length?linked:unlinked;
 const unique=[...new Map(selected.map(p=>[keyOf(textOf(p.name)),p]).filter(([key])=>key)).values()];
 let p=unique.length===1?unique[0]:null;
 if(unique.length>1){
  const anchors=[heading,removeSiteSuffix(meta['og:title']||'',meta['og:site_name'])].filter(Boolean);
  const groups=unique.filter(row=>[].concat(row['@type']||[]).some(type=>String(type).toLowerCase()==='productgroup')&&
   productIdentityUrl(row)&&samePage(productIdentityUrl(row),source_url));
  const group=groups.length===1?groups[0]:null;
  const variants=Array.isArray(group?.hasVariant)?group.hasVariant.slice(0,80):[];
  const validGroup=group&&unique.every(row=>row===group||variants.some(variant=>keyOf(textOf(variant.name))===keyOf(textOf(row.name))&&
   keyOf(textOf(row.name)).startsWith(keyOf(textOf(group.name)))));
  if(validGroup)p=group;
  else{
   const exact=unique.filter(row=>anchors.some(anchor=>keyOf(textOf(row.name))===keyOf(anchor)));
   if(exact.length===1&&productIdentityUrl(exact[0])&&samePage(productIdentityUrl(exact[0]),source_url))p=exact[0];
   else return {ok:false,reason:'ambiguous_or_missing_product'};
   if(group&&p===group)return {ok:false,reason:'ambiguous_or_missing_product'};
  }
 }
 if(!p){
  let likelyPath=false;
  try{likelyPath=/\/(products?|coffee|coffees|beans?|shop)\/[^/]+/i.test(new URL(source_url).pathname);}catch{}
  const ogType=String(meta['og:type']||'');
  if(/^product(?:\.|$)/i.test(ogType)||likelyPath){
   let title=identityAnchor;
   if(genericStorefrontHeading(title))title='';
   let brand=meta['og:site_name']||'';
   // Onyx does not emit a conventional Product JSON-LD/H1/og:title on the
   // observed product page. Its canonical URL matches the exact handle and
   // HTML <title> is a release-specific name followed by the roaster. Do
   // not create an identity from the URL slug or a category page alone.
   if(!title&&likelyPath){
    const declared=meta[META_CANONICAL]||'';
    if(declared&&samePage(declared,source_url)){
     const rawTitle=clean((html.match(/<title\b[^<>]{0,2000}>([\s\S]{1,240}?)<\/title>/i)||[])[1]||'',200);
     const bits=rawTitle.split(/\s+[–—]\s+/);
     if(bits.length===2&&bits[0].length>3&&bits[1].length>2&&bits[1].length<100){
      title=bits[0];brand=bits[1];
     }
    }
   }
   if(title&&!genericStorefrontHeading(title))p={name:title,brand,additionalProperty:[]};
  }
 }
 if(!p||!textOf(p.name))return {ok:false,reason:'ambiguous_or_missing_product'};
 const visibleProductName=explicitHeading&&productIdentityUrl(p)&&samePage(productIdentityUrl(p),source_url)&&
  meta['og:url']&&samePage(meta['og:url'],source_url)&&keyOf(textOf(p.name))===keyOf(meta['og:title'])?explicitHeading:'';
 const fields={name:selectedCoffeeNameWithoutPrice(visibleProductName||textOf(p.name,200))},conflicts=new Set();
 const descriptionIdentity=meta['og:url']||meta[META_CANONICAL]||'';
 const matchedDescriptions=descriptionIdentity&&samePage(descriptionIdentity,source_url)?
  [...new Set([meta['og:description'],meta.description].filter(value=>typeof value==='string'&&value.length<=16000))]:[];
 conflictsByFields.set(fields,conflicts);
 const titleCountry=extractCoffeeTitleOrigin(fields.name);
 const selectedProduct=canonicalIdentityScope(fields,product);
 const currentProduct=withoutDetachedFarmerProfiles(selectedProduct);
 const canonicalProduct=canonicalComponentScope(fields,currentProduct);
 rememberGeographyEntityRoles(fields,canonicalProduct);
 for(const place of extractCoffeeGeographyTuples(canonicalProduct,{name:fields.name,clean}))addField(fields,'Origin',place);
 productDetails(fields,p);
 // Only a selected WooCommerce product taxonomy, never a related card,
 // proves the literal product-level Micro-Lot designation.
 if(!fields.release_label&&selectedMicroLotCategory(product,fields.name))fields.release_label='Micro-Lot';
 // Repeated JSON-LD/inline nodes may describe the same selected product.
 // Deduplicating its title must not discard contradictory roast, process,
 // or release evidence. Retain the chosen node's precedence for compatible
 // facts, and run equivalent nodes through the same conflict checks.
 const identity=keyOf(textOf(p.name));
 const equivalentProducts=all.filter(candidate=>keyOf(textOf(candidate.name))===identity&&
  (!productIdentityUrl(candidate)||samePage(productIdentityUrl(candidate),source_url)));
 for(const equivalent of equivalentProducts){
  if(equivalent!==p&&keyOf(textOf(equivalent.name))===identity)productDetails(fields,equivalent);
 }
 // Track structured-product notes BEFORE processing visible selected labels.
 // This is not permission to suppress conflicting independently printed labels.
 if(fields.tasting_notes)structuredFlavorByFields.set(fields,fields.tasting_notes);
 // An actual, literal lot number in the selected Product title is stronger
 // than an inferred harvest based on a URL, SKU, publication date or country.
 // Preserve exact source text; never manufacture release identifiers.
 if(!fields.release_label){
  const lot=textOf(p.name,200).match(/\bLot\s*#?\s*\d{1,4}(?:[\/-]\d{1,4}){0,2}\b/i);
  if(lot)fields.release_label=lot[0].replace(/\s+/g,' ').trim();
 }
 const siteName=publishedRoaster(textOf(meta['og:site_name'],200));
 const sameSiteIdentity=identity=>{
  try{
   const a=new URL(identity.url),b=new URL(source_url);
   return a.protocol==='https:'&&a.hostname.replace(/^www\./,'')===b.hostname.replace(/^www\./,'');
  }catch{return false;}
 };
 if(siteName)fields.roaster=fields.roaster?preferredCoffeeRoasterName(fields.roaster,siteName,{
  preferCandidate:true,corroborated:siteIdentities.some(identity=>sameSiteIdentity(identity)&&keyOf(textOf(identity.name))===keyOf(siteName))
 }):siteName;
 for(const identity of siteIdentities){
  const name=publishedRoaster(textOf(identity.name,200));
  if(name&&fields.roaster)fields.roaster=preferredCoffeeRoasterName(fields.roaster,name,{corroborated:sameSiteIdentity(identity)});
 }
 if(!fields.roaster){
  const rawTitle=clean((html.match(/<title\b[^<>]{0,2000}>([\s\S]{1,500}?)<\/title>/i)||[])[1]||'',500);
  const pieces=rawTitle.split(/\s+[–—|]\s+/),candidate=pieces.at(-1)||'';
  if(pieces.length>=2&&/\b(?:coffee|coffees|roasters?|roastery|roasting)\b/i.test(candidate)&&
   keyOf(pieces.slice(0,-1).join(' '))===keyOf(fields.name))fields.roaster=publishedRoaster(candidate);
 }
 // WooCommerce may identify the roaster only as this Product's seller.
 // Require its explicit roastery name and same-site URL; an arbitrary
 // marketplace seller or unrelated graph Organization is not a roaster.
 {
  const identityUrl=productIdentityUrl(p);
  const sellers=(Array.isArray(p.offers)?p.offers.slice(0,20):[p.offers])
   .filter(offer=>identityUrl?samePage(identityUrl,source_url):typeof offer?.url==='string'&&samePage(offer.url,source_url))
   .map(offer=>offer?.seller);
  const candidates=new Set();
  for(const seller of sellers){
   const name=textOf(seller?.name,150);
   const identityUrl=typeof seller?.url==='string'?seller.url:typeof seller?.sameAs==='string'?seller.sameAs:'';
   if(!/\b(?:coffee\s+roasters?|roastery|coffee\s+lab)\b/i.test(name)||!identityUrl)continue;
   try{
    const sellerUrl=new URL(identityUrl),sourceUrl=new URL(source_url);
    if(sellerUrl.protocol==='https:'&&sellerUrl.hostname.replace(/^www\./,'')===sourceUrl.hostname.replace(/^www\./,''))candidates.add(name);
   }catch{/* Invalid seller URL is not identity evidence. */}
  }
  if(candidates.size===1){
   const name=[...candidates][0];
   fields.roaster=fields.roaster?preferredCoffeeRoasterName(fields.roaster,name,{corroborated:true}):name;
  }
 }
 // Exact current Shopify inline Product taxonomy is a fallback ONLY when
 // H1, URL handle and merchant identity all match. Never infer growing
 // geography from generic regional/catalog tags or a product image caption.
 const inlineProductRoast=selectedCurrentInlineShopifyRoastTag(html,{
  name:fields.name,roaster:fields.roaster,source_url
 });
 if(inlineProductRoast&&!conflicts.has('roast_level'))
  addField(fields,'Roast Level',inlineProductRoast.value);
 // Avoid stray articles/related-product labels on custom Onyx storefronts.
 // The product's named a-stat metrics supply its selected factual labels.
 productFlavorProfiles(fields,currentProduct);
 const onyxMetrics=/<div\b[^<>]{0,2000}class=["'][^"']{0,2000}a-stat[^"']{0,2000}["'][^<>]{0,2000}data-name=["']roast-level["']/i.test(canonicalProduct);
 if(!onyxMetrics)labeledPairs(canonicalProduct,fields);
 // An independently bound selected-product hero and SEO description may
 // contain literal evidence absent in Product JSON and current labels.
 for(const fact of selectedPageCoffeeEvidence({html:canonicalProduct,name:fields.name,
  seoTitle:clean((html.match(/<title\b[^<>]{0,2000}>([\s\S]{1,500}?)<\/title>/i)||[])[1]||'',500),
  seoDescription:matchedDescriptions[0]||'',
  seoPublisher:clean((html.match(/<meta\s+[^>]{0,800}property=["']og:site_name["'][^>]{0,800}content=["']([^"']{2,120})["']/i)||[])[1]||'',120)}))
  if(!fields[fact.field]&&!conflicts.has(fact.field)){
   // This helper contains both genuinely visible selected-product details and
   // metadata-assisted candidates. Its SEO/OG/story-based candidates must
   // never enter as equal-ranking direct facts or create false conflicts.
   const metadataOnly=/^(?:selected_product_(?:seo_|og_publisher_|correlated_|public_cup_notes_|woocommerce_category_and_description))/.test(fact.role||'');
   if(metadataOnly){
    // The SEO helper already establishes selected title/brand/description
    // corroboration. Do not demand exact title equality again: a publisher's
    // current SEO title may name an individual while the Product names a
    // producing family. The selected URL must still match, and old-country
    // / other-coffee drift cannot supply a different current product fact.
    const fallbackStory=matchedDescriptions[0]||'';
    if(descriptionIdentity&&samePage(descriptionIdentity,source_url)&&
     !coffeeDescriptionCountryMismatch(fallbackStory,{name:fields.name,origin:fields.origin})&&
     !coffeeDescriptionNamedCoffeeMismatch(fallbackStory,{name:fields.name,origin:fields.origin}))
     addSeoFallbackField(fields,fact.field,fact.value);
   }else addField(fields,fact.field,fact.value);
  }
 // Source-backed storefront layouts beyond JSON-LD: metrics, localized
 // labels, reversed Onyx captions, honest extra facts and product notes.
 const roaster_details=extractLayoutEvidence(canonicalProduct,{
  fields,addField:(key,value)=>addField(fields,key,value),clean,hasOriginConflict:()=>conflicts.has('origin')
 });
 // A product's country word can complete a labeled region, but an explicit
 // selected-product country caption has priority over a name-derived fallback.
 if(titleCountry?.label==='Country'&&!geographyParts(fields.origin||'').some(part=>ORIGIN_COUNTRIES.has(part)))
  addField(fields,titleCountry.label,titleCountry.value);
 // Supplement explicit page labels with current-coffee narrative evidence.
 // The canonical Process selector is coarse; keep complex fermentation and
 // farm/grower attributions as reviewable, noncanonical details.
 const ownedContext=selectedCoffeeContextRoles(canonicalProduct,{name:fields.name,clean});
 const narrative=extractNarrativeCoffeeEvidence(canonicalProduct,{name:fields.name,fields,originConflict:conflicts.has('origin')});
  const directSelected=selectedDirectProductCredits(canonicalProduct,{name:fields.name,clean,optionHtml:html});
  const selectedPriceBadge=selectedCurrentCoffeeReleaseBadge(canonicalProduct,{name:fields.name});
  if(selectedPriceBadge&&!fields.release_label&&!conflicts.has('release_label'))
   addField(fields,'release_label',selectedPriceBadge);

  // Exact-H1 current prose "from producer NAME's ESTATE estate" distinguishes
  // the named grower from the independently labeled Farm. Override only a
  // Farm-fallback, never another explicit producer or a contrary Farm.
  const namedEstateFarm=farmEvidenceByFields.get(fields)||roaster_details.farm||'';
  const namedEstateFarmMatches=directSelected.named_estate_producer===true&&
   namedEstateFarm&&keyOf(namedEstateFarm)===keyOf(directSelected.named_estate_farm||'');
  // A selected named current grower may replace only the separate Farm fallback.
  const namedCurrentFarmGrower=directSelected.named_current_cultivator_producer===true&&
   !!namedEstateFarm&&producerEvidenceByFields.get(fields)==='farm';
  if(directSelected.producer&&!conflicts.has('producer')&&
     (!fields.producer||(producerEvidenceByFields.get(fields)==='farm'&&
        (namedEstateFarmMatches||namedCurrentFarmGrower)))){
   addField(fields,'Producer',directSelected.producer);narrativeProducerByFields.add(fields);
  }
  if(directSelected.roast_level&&!fields.roast_level&&!conflicts.has('roast_level'))
   addField(fields,'Roast Level',directSelected.roast_level);
  if(directSelected.tasting_notes&&!fields.tasting_notes&&!conflicts.has('tasting_notes'))
   addField(fields,'Tasting Notes',directSelected.tasting_notes);
  if(directSelected.farm&&!roaster_details.farm)roaster_details.farm=directSelected.farm;
 for(const [key,value] of Object.entries(narrative.fields)){
  if(fields[key])continue;
  addField(fields,key,value,{literalAnonymousProducer:key==='producer'&&narrative.literal_anonymous_producer===value});markNarrativeIdentity(fields,key);
  if(key==='producer'&&fields.producer)narrativeProducerByFields.add(fields);
 }
 // Selected product-only literal roles supplement, never override, other proof.
 for(const field of ['producer','tasting_notes'])if(ownedContext[field]&&!fields[field]&&!conflicts.has(field))
  addField(fields,field,ownedContext[field]);
 if(ownedContext.release_label&&!fields.release_label&&!conflicts.has('release_label'))fields.release_label=ownedContext.release_label;
 if(ownedContext.harvest_season&&!roaster_details.harvest_season)roaster_details.harvest_season=ownedContext.harvest_season;
 for(const fact of extractCoffeeIdentityEvidence(canonicalProduct,{name:fields.name,fields,clean}).facts)addIdentityFact(fields,fact);
 // A cached SEO description can have the correct page URL/title while its
 // text still explicitly describes a different country's coffee. Preserve
 // that raw source for review, but do not let the stale cohort donate a
 // producer, altitude, roast or other missing canonical field.
 const usableMatchedDescriptions=matchedDescriptions.filter(description=>
  !coffeeDescriptionCountryMismatch(description,{name:fields.name,origin:fields.origin})&&
  !coffeeDescriptionNamedCoffeeMismatch(description,{name:fields.name,origin:fields.origin}));
 // Label-free height metrics and additional physical unit formats are
 // considered only after the explicit lot and existing narrative evidence.
 if(!onyxMetrics){
  const heights=extractCoffeeElevationEvidence(canonicalProduct,{clean,name:fields.name,includeNarrative:!fields.elevation_m,includeExplicitMasl:true});
  for(const height of heights)addField(fields,'elevation_m',height);
  // The description on the actual product page, not SEO, is authoritative.
  if(!fields.elevation_m&&!conflicts.has('elevation_m'))for(const description of usableMatchedDescriptions){
   const scopedDescription=canonicalIdentityScope(fields,'<p>'+description.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</p>');
   for(const height of extractCoffeeElevationEvidence(scopedDescription,{clean,name:fields.name,includeExplicitMasl:true}))
    addSeoFallbackField(fields,'elevation_m',height);
  }
 }
 for(const [key,value] of Object.entries(narrative.details)){
  if(!roaster_details[key]&&value)roaster_details[key]=value;
 }
 const farm=farmEvidenceByFields.get(fields);
 const detailConflicts=new Set(coffeeLayoutDetailConflicts(roaster_details));
 if(farm===null){delete roaster_details.farm;detailConflicts.add('farm');}
 else if(farm&&!roaster_details.farm)roaster_details.farm=farm;
 // The page's accessible image description sometimes transcribes the
 // selected bag's profile card. Read only explicit words attached to an
 // exact-name image; pixels, color, filenames and other coffees are ignored.
 const imageText=extractProductImageTextEvidence(currentProduct,{name:fields.name,clean});
 for(const field of imageText.conflicts||[])if(['roast_level','tasting_notes'].includes(field)){
  conflicts.add(field);delete fields[field];
 }
 if(imageText.tasting_notes&&!fields.tasting_notes)addField(fields,'tasting_notes',imageText.tasting_notes);
 if(imageText.roast_level)addField(fields,'roast_level',imageText.roast_level);
 // JSON-LD additionalProperty can publish numeric roast color without an
 // HTML metric. Retain the measured value from this matched Product only.
 if(!roaster_details.agtron){
  const attrs=Array.isArray(p.additionalProperty)?p.additionalProperty:[];
  const evidence=attrs.find(row=>/^(?:ground\s+)?(?:agtron|roast\s+colou?r|agtron\s+(?:gourmet|commercial))$/i.test(String(row?.name||'').trim()));
  if(evidence){
   const reading=interpretAgtron(evidence.value,{scale:evidence.name});
   if(reading){
    roaster_details.agtron=reading.display;
    if(reading.scale!=='unspecified')roaster_details.agtron_scale=reading.scale;
    if(reading.sample!=='unspecified')roaster_details.agtron_sample=reading.sample.replace('_',' ');
   }
  }
 }

 if(!onyxMetrics)explicitNearbyFacts(canonicalProduct,fields);
 const matchedDescriptionTitle=[fields.name,textOf(p.name)].some(name=>
  equivalentCoffeeProductNames(name,meta['og:title'],{brands:[fields.roaster,meta['og:site_name']]}));
 if(!fields.tasting_notes&&matchedDescriptionTitle&&usableMatchedDescriptions.length){
  const escape=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  for(const description of usableMatchedDescriptions){
   const story=canonicalIdentityScope(fields,'<main><h1>'+escape(fields.name)+'</h1><p>'+escape(description)+'</p></main>');
   const notes=extractProductFlavorEvidence(story,{clean,origin:fields.origin,originConflict:conflicts.has('origin')});
   if(notes)addSeoFallbackField(fields,'Tasting Notes',notes);
  }
 }
 if(!fields.roast_level&&!conflicts.has('roast_level')&&matchedDescriptionTitle&&descriptionIdentity&&samePage(descriptionIdentity,source_url)){
  const escape=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const story='<main><h1>'+escape(meta['og:title'])+'</h1>'+usableMatchedDescriptions.map(description=>'<p>'+escape(description)+'</p>').join('')+'</main>';
  const roast=extractRoastVisualEvidence(canonicalIdentityScope(fields,story));
  if(roast.confidence==='conflict')conflicts.add('roast_level');
  else if(roast.value)addSeoFallbackField(fields,'roast_level',roast.value);
 }
 if(matchedDescriptionTitle&&usableMatchedDescriptions.length){
  const candidates={name:fields.name,roaster:fields.roaster},candidateConflicts=new Set(),explicitKinds=new Set();
  conflictsByFields.set(candidates,candidateConflicts);
  const escape=value=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const fragments=usableMatchedDescriptions.map(description=>description.split(/(?<=[.!?])\s+|\r?\n/u).slice(0,240).map(value=>'<p>'+escape(value)+'</p>').join(''));
  for(const fragment of fragments){
   labeledPairs(fragment,candidates);
   extractLayoutEvidence(fragment,{fields:candidates,clean,hasOriginConflict:()=>candidateConflicts.has('origin'),addField:(label,value)=>{
    const kind=Object.hasOwn(FIELD_ALIASES,label)?label:LOOKUP.get(keyOf(label));
    if(kind)explicitKinds.add(kind);addField(candidates,label,value);
   }});
  }
  for(const key of Object.keys(candidates))if(!['name','roaster'].includes(key))explicitKinds.add(key);
  for(const fragment of fragments){
   const prose=extractNarrativeCoffeeEvidence(fragment,{name:fields.name,fields:candidates,origin:fields.origin||candidates.origin,originConflict:conflicts.has('origin')||candidateConflicts.has('origin')});
   for(const [key,value] of Object.entries(prose.fields))if(!candidates[key])addField(candidates,key,value);
   for(const fact of extractCoffeeIdentityEvidence(fragment,{name:fields.name,fields:candidates,clean}).facts)
    addIdentityFact(candidates,fact);
  }
  for(const key of ['origin','process','variety','producer','release_label']){
   const varietyRefinement=key==='variety'&&fields.variety&&candidates.variety&&
    compatibleGenericCoffeeVarieties(fields.variety,candidates.variety)===candidates.variety;
   if((fields[key]&&!varietyRefinement)||conflicts.has(key)||candidateConflicts.has(key)||!candidates[key])continue;
   addSeoFallbackField(fields,key,candidates[key]);
   if(!explicitKinds.has(key)){
    markNarrativeIdentity(fields,key);
    if(key==='producer'&&fields.producer)narrativeProducerByFields.add(fields);
   }
  }
  for(const window of recurringHarvestByFields.get(candidates)?.values()||[])rememberRecurringHarvest(fields,window);
 }
 const narrativeNotes=[];
 if(!fields.tasting_notes)for(const story of narrativeFlavorStoriesByFields.get(fields)||[]){
  const notes=extractProductFlavorEvidence(story,{clean,origin:fields.origin,originConflict:conflicts.has('origin')});
  if(notes&&!narrativeNotes.some(value=>equivalentCoffeeTastingNotes(value,notes)))narrativeNotes.push(notes);
 }
 narrativeFlavorStoriesByFields.delete(fields);
 if(!fields.tasting_notes&&narrativeNotes.length===1)addField(fields,'tasting_notes',narrativeNotes[0]);
 const roast_evidence=extractRoastVisualEvidence(currentProduct);
 if(roast_evidence.value&&seoFallbackByFields.get(fields)?.has('roast_level')){
  delete fields.roast_level;seoFallbackByFields.get(fields).delete('roast_level');
 }

 if(roast_evidence.confidence==='conflict'){
  delete fields.roast_level;conflicts.add('roast_level');
  // Generic roast visual/prose extraction used to report an unqualified
  // conflict with no candidate values. Keep its actual bounded alternatives
  // for source review. If they exactly match two selected *purchase* roasts,
  // the Shopify merger may safely clear that false same-coffee conflict.
  for(const value of roast_evidence.conflicting_roast_values||[])
   rememberCoffeeReviewCandidate(fields,'roast_level',value,
    'Current selected-product roast evidence');
 }
 if(roast_evidence.value){
  if(fields.roast_level&&fields.roast_level!==roast_evidence.value){
   delete fields.roast_level;
   conflicts.add('roast_level');
   roast_evidence.hint='The page contains inconsistent roast values; select the correct level from the roaster’s label.';
   roast_evidence.value=null;
  }else if(!fields.roast_level)fields.roast_level=roast_evidence.value;
 }
 // A genuine, product-bound GROUND Agtron reading with a declared scale
 // is a measured roast standard, stronger than descriptive roast wording.
 // Unknown scale/sample stays provisional and cannot veto a roaster label.
 // Whole-bean or unsupported scores have no calibrated seven-tier mapping.
 const agtron=interpretAgtron(roaster_details.agtron||'',{
  scale:roaster_details.agtron_scale||'',sample:roaster_details.agtron_sample||''
 });
 if(agtron?.roast){
  const prior=fields.roast_level||'';
  if(!agtron.provisional&&!conflicts.has('roast_level')){
   fields.roast_level=agtron.roast;
   roast_evidence.value=agtron.roast;
   roast_evidence.source='agtron_ground_measurement';
   roast_evidence.hint=agtronExplanation(agtron)+
    (prior&&prior!==agtron.roast?
     ' The explicitly measured Agtron roast takes priority over the product wording "'+prior+'". The published description remains in its original source evidence.':'');
  }else if(!prior&&!conflicts.has('roast_level')){
   fields.roast_level=agtron.roast;
   roast_evidence.value=agtron.roast;
   roast_evidence.hint=agtronExplanation(agtron);
   roast_evidence.source='agtron_provisional_review';
  }else if(prior&&prior!==agtron.roast){
   roast_evidence.hint=agtronExplanation(agtron,prior);
  }
 }
 // A literal combined treatment can reconcile its own washing/drying
 // subtype. Different subtypes and conflicts lacking full evidence remain.
 const reconciledProcess=reconcileCoffeeProcessingClaims([{fields,conflicts:[...conflicts]}]);
 if(reconciledProcess&&conflicts.has('process')){
  fields.process=reconciledProcess;conflicts.delete('process');
 }
 // Fallback extractors may directly set a field; other conflicts remain final.
 for(const field of conflicts)delete fields[field];
 if(conflicts.has('producer'))delete roaster_details.named_producer;
 const recurringHarvest=[...(recurringHarvestByFields.get(fields)?.values()||[])];
 if(!roaster_details.harvest_season&&!detailConflicts.has('harvest_season')){
  if(recurringHarvest.length===1)roaster_details.harvest_season=recurringHarvest[0];
  else if(recurringHarvest.length>1)detailConflicts.add('harvest_season');
 }
 // An explicitly listed multi-component blend cannot be represented as one
 // country or processing category. Retain component facts for review.
 const blend=blendEvidenceByFields.get(fields);
 if(blend){
  roaster_details.blend_components=blend.display;
  // List distinct evidenced countries in first-seen order, never label a
  // multi-origin blend with only one of its components' countries.
  if(!fields.origin&&!conflicts.has('origin')&&(!blend.incomplete_component_origins||blend.complete_origins))
   fields.origin=blend.origin||blend.origins.join(', ');
  // Only genuinely named farms/producers are used. An unlabeled component
  // coffee name alone is not enough evidence to assert its producer.
  if(blend.complete_producers&&!fields.producer&&!conflicts.has('producer'))fields.producer=blend.producers.join(', ');
  if(blend.complete_varieties&&!fields.variety&&!conflicts.has('variety'))fields.variety=blend.varieties.join(', ');
  if(blend.multi_process){
   fields.process='Other/Unknown';
   roaster_details.processing_detail=blend.processes.join(', ');
  }else if(blend.incomplete_component_process&&narrativeIdentityByFields.get(fields)?.has('process')){
   // One naturally processed component cannot describe an entire blend
   // whose other component's treatment is not published.
   delete fields.process;
  }else if(!fields.process&&blend.complete_process)fields.process=blend.processes[0];
 }
 // The selected blend names an explicitly processed component and a separate
 // regional coffee with no method. Do not assign the first method to both.
 let partialProcessReviewNote='';
 const partialProcess=selectedPartialBlendProcess(canonicalProduct,{
  name:fields.name,process:fields.process,decode:clean
 });
 if(partialProcess&&!conflicts.has('process')){
  delete fields.process;
  const note='Selected blend component '+partialProcess.component+
   ' uses '+partialProcess.method+'; '+partialProcess.unverified_partner+
   ' has no published process. Whole blend processing remains unverified.';
  roaster_details.processing_detail=[roaster_details.processing_detail,note]
   .filter(Boolean).join(' | ').slice(0,900);
  partialProcessReviewNote=note;
 }
 // Community is an explicitly labeled producing group, not a named farmer.
 // Reject mentions missing the same selected Product's location and process.
 const producingCommunity=selectedProducingCommunity(canonicalProduct);
 let community_review_note='';
 if(producingCommunity&&!fields.producer&&!conflicts.has('producer')){
  fields.producer=producingCommunity;
  roaster_details.named_producer=producingCommunity+' (producing community, not an individual grower)';
  community_review_note='Producer is the published '+producingCommunity+' producing community, not an individually named farmer.';
 }
 // A source-backed two-region blend must not inherit one component's
 // elevation or the first region as the entire blended origin.
 const regionalBlend=extractSelectedRegionalBlendElevation(canonicalProduct,{name:fields.name});
 let elevation_review_note='';
 if(regionalBlend){
  roaster_details.blend_components=[roaster_details.blend_components,regionalBlend.display].filter(Boolean).join(' | ').slice(0,1200);
  elevation_review_note=regionalBlend.review;
  delete fields.elevation_m;
  if(fields.origin&&regionalBlend.components.some(component=>
   fields.origin.toLowerCase().includes(component.region.toLowerCase())))
   fields.origin=regionalBlend.country;
 }
 // A named producing community for ONE country in a multi-origin blend is
 // useful source context but cannot populate a blend-wide Producer field.
 const componentCredit=extractSelectedBlendCommunityCredit(canonicalProduct,{
  name:fields.name,origin:fields.origin||'',clean
 });
 let producer_review_note=community_review_note;
 if(componentCredit){
  const {organization,country,region,other_countries}=componentCredit;
  const extra=country+' ('+region+'): '+organization+' (named producing community; component only)';
  roaster_details.blend_components=[roaster_details.blend_components,extra].filter(Boolean).join(' | ').slice(0,1200);
  producer_review_note=organization+' is identified as a producing community in '+region+', '+country+
   ', for one component of this blend. It is not evidence of a producer for the entire blend or for '+
   other_countries.join(' / ')+'. Confirm any whole-blend Producer manually.';
 }
 // A later direct blend fallback cannot resurrect rejected geography.
 for(const field of conflicts)delete fields[field];
 if(conflicts.has('roast_level')){roast_evidence.value=null;roast_evidence.source='';}
 // Country enrichment can run after the initial label normalization.
 // Remove only an exactly repeated Region-of country at final field assembly.
 // Never suppress genuine country disagreement or product-source conflicts.
 if(fields.origin&&!conflicts.has('origin')){
  const repeated=fields.origin.match(/^(.*?)\bRegion\s+of\s+([^,]{3,45})\s*,\s*(.+)$/iu);
  if(repeated&&repeated[1].trim()&&keyOf(repeated[2])===keyOf(repeated[3]))
   fields.origin=`${repeated[1].trim()} Region, ${repeated[2].trim()}`;
 }
 const supplementary=collectSupplementaryCoffeePageFacts(html,{selected_html:selectedProduct,source_url});
 if(supplementary.roast_hint)roast_evidence.hint=[roast_evidence.hint,supplementary.roast_hint].filter(Boolean).join(' ');
 const roaster_recipe=extractProductEspressoReference(currentProduct);
 const quarantined=(identityQuarantinesByFields.get(fields)||[]).flatMap(item=>{
  const facts=mergeCoffeeSourceFacts(collectCoffeeSourceFacts(item.raw,{name:fields.name,source_url}),
   collectStructuredCoffeeSourceFacts({description:item.raw},{source_url,source_type:item.source_type}));
  if(facts.truncated)identityScopeTruncatedByFields.add(fields);
  return facts.map(fact=>({...fact,source_type:item.source_type,section:'Different coffee in the source',conflicting:true}));
 });
 const source_facts=mergeCoffeeSourceFacts(
  quarantined,
  supplementary.facts,
  collectCoffeePageMetaSourceFacts(meta,{source_url}),
  collectCoffeePageGuidanceFacts(html,{source_url}),
  collectCoffeeSourceFacts(product,{name:fields.name,source_url}),
  ...(matchedDescriptions.length?[collectStructuredCoffeeSourceFacts({description:matchedDescriptions.join('\n\n')},{source_url,source_type:'html'})]:[]),
  ...[p,...equivalentProducts.filter(candidate=>candidate!==p)].map(candidate=>collectStructuredCoffeeSourceFacts(candidate,{source_url}))
 );
 if(partialProcessReviewNote&&source_facts.length<384)source_facts.push({
  field:'component_process',label:'Incomplete selected blend processing',
  value:partialProcessReviewNote,source_url,source_type:'html',
  section:'Selected blend description versus component processing'
 });
 // Normalize duplicated selected HTML reviewer roles after all product sources
 // have merged; source labels/values remain literal and canonical unaffected.
 reconcileSelectedCoffeeReviewActorRoles(source_facts,{source_url,
  selected_producer:fields.producer,selected_farm:roaster_details.farm});
 if(inlineProductRoast&&source_facts.length<384)source_facts.push({
  field:'roast_level',label:'Roast',value:inlineProductRoast.value,
  source_url,source_type:'product_json',
  section:'Exact current selected Shopify inline Product roast tag',
  conflicting:conflicts.has('roast_level')
 });
 if(selectedPriceBadge&&fields.release_label===selectedPriceBadge&&source_facts.length<384)
  source_facts.push({field:'release_label',label:'Selected product release badge',
   value:selectedPriceBadge,source_url,source_type:'html',section:'Exact selected product price panel'});
 if(producingCommunity&&source_facts.length<384)source_facts.push({
  field:'producer',label:'Community',value:producingCommunity,source_url,
  source_type:'html',section:'Selected coffee producing-community label'
 });
 if(regionalBlend)for(const part of regionalBlend.components){
  if(source_facts.length>=384)break;
  source_facts.push({field:'component_elevation',label:'Component elevation: '+part.region,
   value:part.elevation_m,source_type:'html',source_url,
   section:'Selected blended regional lot — '+part.process});
 }
 if(componentCredit&&source_facts.length<384)source_facts.push({
  field:'component_producer',
  label:'Producing community ('+componentCredit.country+' component only)',
  value:componentCredit.organization,source_url,source_type:'html',
  section:'Selected current blend description'
 });
 // The source may contain a roast-comparison cupping matrix for several
 // DIFFERENT products. Pick only the row matching the actual selected H1
 // roast; generic cocoa, citrus or caramel rows never become other coffees.
 const selectedRoastCupping=selectedNamedRoastCuppingEvidence(canonicalProduct,fields.name);
 if(selectedRoastCupping){
  if(!fields.tasting_notes&&!conflicts.has('tasting_notes'))
   fields.tasting_notes=selectedRoastCupping.notes;
  if(source_facts.length<384)source_facts.push({
   field:'tasting_notes',label:'Cupping Notes',value:selectedRoastCupping.notes,
   source_url,source_type:'html',section:selectedRoastCupping.source_label
  });
 }
 // Owner-approved preference: a current-coffee labeled notes list outranks
 // incidental flavor prose, but a second coarse taxonomy/graphic is not an
 // equally strong source. Preserve established equivalent notes verbatim.
 const printedNotes=[];
 for(const fact of source_facts){
  if(fact.field!=='tasting_notes'||fact.conflicting&&fact.section==='Different coffee in the source'||
   !/^(?:(?:tasting|cupping|flavou?r|flavor|cup)\s+(?:notes?|profile)|notes?|we\s+taste|what\s+you(?:'|’)?ll\s+taste)$/i.test(String(fact.label||'').trim())||
   /(?:brewing\s+recommendations|different\s+coffee|education|general\s+guidance)/i.test(String(fact.section||''))||
   !['html','product_json'].includes(fact.source_type))continue;
  const label=String(fact.label||'').trim();
  const rank=/^(?:tasting|cupping)\s+notes?$/i.test(label)?3:/^(?:notes?|we\s+taste|what\s+you(?:'|’)?ll\s+taste)$/i.test(label)?2:1;
  const value=normalizeExplicitCoffeeTastingNotes(fact.value);
  // A generic light-to-dark roast scale is not a tasting description.
  if(!value||/^(?:light|medium|dark|ultra light|very light)(?:\s+(?:light|medium|dark)){1,2}$/i.test(value))continue;
  const prior=printedNotes.find(row=>equivalentCoffeeTastingNotes(row.value,value));
  if(prior){prior.rank=Math.max(prior.rank,rank);continue;}
  printedNotes.push({value,rank});
 }
 // An already confidently extracted direct labeled list does not need to
 // be re-written or invalidated by a shorter coarse product taxonomy.
 if(printedNotes.length&&seoFallbackByFields.get(fields)?.has('tasting_notes')){
  delete fields.tasting_notes;seoFallbackByFields.get(fields).delete('tasting_notes');
 }
 const currentPrinted=fields.tasting_notes&&printedNotes.some(row=>
  equivalentCoffeeTastingNotes(row.value,fields.tasting_notes));
 if(!currentPrinted&&printedNotes.length){
  const highest=Math.max(...printedNotes.map(row=>row.rank));
  const strongest=printedNotes.filter(row=>row.rank===highest);
  if(strongest.length===1&&!conflicts.has('tasting_notes')){
   fields.tasting_notes=strongest[0].value;
  }else if(conflicts.has('tasting_notes')){
   // A direct label cannot erase an independently evidenced real dispute:
   // preserve both source readings and ask the member rather than guessing.
   delete fields.tasting_notes;
  }else if(!fields.tasting_notes){
   conflicts.add('tasting_notes');
  }else{
   // Preserve a prior valid source-backed value; surface the alternatives
   // in source_facts instead of inventing a new preferred entry.
   conflicts.add('tasting_notes');delete fields.tasting_notes;
  }
 }
 // The exact selected product's country-qualified hero, adjacent to its
 // title, outranks a municipality guessed from the coffee's name. A three-
 // part adjacent flavor profile outranks generic tasting-note education and
 // unlabelled narrative, but not another incompatible direct labeled list.
 const hero=selectedCoffeeHeroFacts(canonicalProduct,{name:fields.name});
 if(hero?.origin&&seoFallbackByFields.get(fields)?.has('origin')){
  delete fields.origin;seoFallbackByFields.get(fields).delete('origin');
 }
 if(hero?.origin&&!conflicts.has('origin')){
  const previous=fields.origin||'';
  if(!previous||keyOf(previous)===keyOf(fields.name)){
   fields.origin=hero.origin;
   if(source_facts.length<384)source_facts.push({field:'origin',
    label:'Selected current coffee origin',value:hero.origin,source_url,
    source_type:'html',section:'Selected product title banner'});
  }
 }
 if(hero?.tasting_notes&&!hasIncompatibleCurrentTastingList(canonicalProduct,hero.tasting_notes)){
  // A conflicting marketing paragraph does not outweigh the visible,
  // explicitly paired product hero. Do not erase any original source fact.
  fields.tasting_notes=hero.tasting_notes;
  conflicts.delete('tasting_notes');
  if(source_facts.length<384)source_facts.push({field:'tasting_notes',
   label:'Selected current coffee flavor profile',value:hero.raw_notes,
   source_url,source_type:'html',section:'Selected product title banner'});
 }
 // Section roles are source-verified only after the complete selected
 // product evidence set is assembled; do not suppress genuine conflicts from
 // any other notes section, snippet, model, or differently worded flavor list.
 if(conflicts.has('tasting_notes')&&!fields.tasting_notes){
  const explicit=explicitCoffeeNotesSeparateFromBrewingTags(source_facts);
  if(explicit){fields.tasting_notes=explicit;conflicts.delete('tasting_notes');}
 }
 // Selected direct Tastes like descriptions supersede unlabeled marketing prose,
  // but cannot override a separate current explicit notes list or structured
  // Product field. Other source facts remain visible for review.
  if(directSelected.explicit_tastes_like&&!structuredFlavorByFields.get(fields)){
   fields.tasting_notes=directSelected.explicit_tastes_like;conflicts.delete('tasting_notes');
   if(source_facts.length<384&&!source_facts.some(f=>f.field==='tasting_notes'&&
      f.label==='Tastes like'&&f.value===directSelected.explicit_tastes_like))
    source_facts.push({field:'tasting_notes',label:'Tastes like',
      value:directSelected.explicit_tastes_like,source_url,source_type:'html',
      section:'Exact selected product literal tasting description'});
  }
  // Current exact selected named flavor prose can add exactly one seller-
  // printed literal note only after ranked printed/current notes exist. Never
  // use SEO, another coffee, historical, conditional or unrelated description.
  if(fields.tasting_notes&&!conflicts.has('tasting_notes')&&
   !seoFallbackByFields.get(fields)?.has('tasting_notes')){
   const named=refineSelectedNamedTastingNotes(currentProduct,{clean,notes:fields.tasting_notes});
   if(named)fields.tasting_notes=named;
   // A directly labeled selected product description may add only corroborated
   // literal notes, never SEO or unrelated roast/preparation narratives.
   const description=refineSelectedDescriptionSensory(currentProduct,{clean,notes:fields.tasting_notes});
   if(description)fields.tasting_notes=description;
   const finish=refineSelectedCurrentLiteralFinish(currentProduct,{clean,notes:fields.tasting_notes});
   if(finish)fields.tasting_notes=finish;
  }
  // Flag only direct selected-source disagreements, not unsupported SEO.
  // A higher-priority current description may remain the canonical suggestion
  // while the contrary exact selected product Flavor caption is reviewable.
  if(fields.tasting_notes&&!seoFallbackByFields.get(fields)?.has('tasting_notes'))
   markSelectedTastingSourceDisagreements(source_facts,fields.tasting_notes);
  for(const fact of source_facts){
  if(fact.field==='release_label'&&isRecurringCoffeeHarvestWindow(fact.value))fact.field='harvest_season';
  else if(fact.field==='release_label'&&isGenericCoffeeLotLabel(fact.value))fact.field='lot_type';
  if((fact.field&&(conflicts.has(fact.field)||detailConflicts.has(fact.field)))||
   (detailConflicts.has('farm')&&/^(?:farm|farms|finca)$/i.test(fact.label)))fact.conflicting=true;
 }
 // Literal country-first middle-dot captions are equivalent when they have
 // one explicit country and a bounded named locality. Keep original source facts.
 if(fields.origin&&!conflicts.has('origin'))fields.origin=orderExplicitCoffeeOriginTuple(fields.origin);
 // Dated cooperative histories (e.g. a transition to washed coffee in
 // 2010) are not a statement of the currently selected lot's process.
 // Preserve the source record but do not promote old history to the field.
 if(fields.process==='Washed'){
  const currentWords=clean(canonicalProduct,32000);
  const historic=/\b(?:in|back in|since)\s+(?:19|20)\d{2}\b[^.!?]{0,260}\b(?:transition(?:ed|ing)?\s+to|began|introduced)\b[^.!?]{0,160}\b(?:fully\s+)?washed\b/i.test(currentWords);
  const direct=/\b(?:process|processing(?:\s+method)?)\s*:\s*(?:fully\s+)?washed\b/i.test(currentWords)||
   (Array.isArray(p.additionalProperty)&&p.additionalProperty.some(row=>
    /^(?:process|processing(?: method)?)$/i.test(String(row?.name||'').trim())&&
    /\bwashed\b/i.test(String(row?.value||''))));
  const current=/\b(?:this|our|current)\s+(?:coffee|lot|release)\b[^.!?]{0,130}\b(?:processed\s+as|is\s+washed|washed\s+process)\b/i.test(currentWords);
  if(historic&&!direct&&!current)delete fields.process;
 }
 // Selected FUDAM association text describes a qualified, general
 // washing practice, not this particular lot's explicit Process label.
 // Never auto-promote it or resurrect the historical reused Tolima product.
 let qualified_process_review_note='';
 try{
  const selectedUrl=new URL(source_url);
  const selectedPath=selectedUrl.pathname.replace(/\/+$/,'');
  const selectedFudamProduct=selectedPath==='/products/colombian-supremo-organic'||
   /^\/collections\/[^/]+\/products\/colombian-supremo-organic$/.test(selectedPath);
  if(selectedUrl.hostname.toLowerCase().replace(/^www\./,'')==='beanstockcoffee.com'&&
   selectedFudamProduct&&
   /\bFUDAM\b/i.test(fields.name||'')&&!fields.process&&!conflicts.has('process')){
   const prose=productCoffeeProse(canonicalProduct,clean);
   const qualified=prose.some(block=>!block.educational&&
    /\bthe coffees are generally washed two or three times\b/i.test(block.text)&&
    !/\b(?:unlike|another coffee|previous product)\b/i.test(block.text));
   const selectedAssociation=prose.some(block=>!block.educational&&
    /\bFUDAM\b/i.test(block.text)&&/\b(?:association|growers|smallholders|membership)\b/i.test(block.text));
   if(qualified&&selectedAssociation){
    qualified_process_review_note='The selected FUDAM product describes the coffees as generally washed two or three times. This is association-wide practice, not an explicit processing guarantee for this lot. Confirm Washed from the current bag if known; otherwise leave Process blank.';
    if(source_facts.length<384)source_facts.push({field:'processing_context',
     label:'General washing practice (not lot-specific)',
     value:'The coffees are generally washed two or three times before being dried.',
     source_url,source_type:'html',section:'Current selected FUDAM product'});
   }
  }
 }catch{/* Invalid source URLs cannot supply contextual autofill. */}
 // Meta descriptions, search snippets and archived source copies are NEVER
 // equal competitors to the current selected coffee description or its other
 // visible product-specific fields. Use a current-identity-bound metadata key
 // only for a field the direct selected page genuinely left blank.
 if(matchedDescriptionTitle&&descriptionIdentity&&samePage(descriptionIdentity,source_url)){
  for(const [k,v] of Object.entries(meta))if(/^(?:coffee[:._-]|product[:._-])(?:origin|process(?:ing)?|variety|producer|roast[_-]?level|harvest|elevation|tasting[_-]?notes)$/.test(k))
   addSeoFallbackField(fields,k.replace(/^(?:coffee|product)[:._-]/,''),v);
 }
 // Selected current-product country takes priority when a finer region
 // appears only outside directly visible selected-product text (often SEO).
 // Preserve independently printed current finer regions and real conflicts.
 const selectedCurrentOrigin=selectedCurrentOriginCaption(canonicalProduct,{name:fields.name});
 if(selectedCurrentOrigin&&!conflicts.has('origin')){
  const direct=selectedCurrentOrigin.origin,previous=fields.origin||'';
  const parts=previous.split(/\s*,\s*/u).filter(Boolean);
  const compatible=parts.length>1&&keyOf(parts.at(-1))===keyOf(direct);
  const visible=clean(canonicalProduct,100000).toLowerCase();
  const regionalDetailVisible=parts.slice(0,-1).some(part=>
   part.length>=3&&visible.includes(part.toLowerCase()));
  if(!previous||(compatible&&!regionalDetailVisible)){
   if(previous&&keyOf(previous)!==keyOf(direct))
    rememberCoffeeReviewCandidate(fields,'origin',previous,'Finer detail absent from selected product');
   fields.origin=direct;
   seoFallbackByFields.get(fields)?.delete('origin');
   if(source_facts.length<384)source_facts.push({
    field:'origin',label:'Current origin',value:direct,source_url,
    source_type:'html',section:'Selected product current origin caption'
   });
  }
 }
 const seo_fallback_fields=[...(seoFallbackByFields.get(fields)||[])].filter(key=>
  typeof fields[key]==='string'&&fields[key]&&!conflicts.has(key)).sort();
 // Decaf-only selected-product evidence, separate from green-coffee Process.
 // Retain only a directly named exact current selected coffee's decaffeination
 // sentence when canonical identity/geography filtering drops its description.
 // Bounded product scope supplies an exact H1; this does not restore raw SEO,
 // general coffee claims, other coffee facts or uncertain bean processing.
 const namedDecafStatements=selectedNamedCurrentDecafEvidence(product,{name:fields.name,clean});
 const selectedDecafStatements=[...new Set([
  ...(Array.isArray(directSelected.decaffeination_method_evidence)?
   directSelected.decaffeination_method_evidence:[]),
  ...namedDecafStatements,
  ...selectedFormTitleWaterDecafEvidence(product,{name:fields.name,clean})
 ])];
 // Generic Process labels can conflict in the layout reader while the EXACT
 // selected named decaf sentence and the selected EA Process spec AGREE.
 // Suppress only that unrelated processing-detail conflict when both direct
 // method witnesses match. Opposing/unknown selected methods still fail closed.
 const decafSpec=selectedCurrentDecafSpecMethodEvidence(product,{name:fields.name,clean});
 const exactNamedDecafMethod=inferDecaffeinationMethod({
  name:fields.name,selectedMethod:namedDecafStatements.join('\n')
 });
 const exactNamedAndSpecAgreement=Boolean(exactNamedDecafMethod&&decafSpec.complete&&
  decafSpec.candidates.length&&
  decafSpec.candidates.every(spec=>spec.method===exactNamedDecafMethod));
 const decafSpecConflict=decafSpec.candidates.length>0&&
  (!decafSpec.complete||decafSpec.candidates.some(spec=>!spec.method)||
   new Set(decafSpec.candidates.map(spec=>spec.method)).size>1||
   Boolean(exactNamedDecafMethod&&
    decafSpec.candidates.some(spec=>spec.method!==exactNamedDecafMethod)));
 const decafSourceConflict=decafSpecConflict||
  (detailConflicts.has('processing_detail')&&!exactNamedAndSpecAgreement);
 // A generic page layout may contain labeled decaf PROCESS prose inside a
 // FAQ, related item, or contradictory second product heading. Only the
 // independently verified current selected-product decaf sentence or a
 // safely scoped exact selected spec can authorize member autofill.
 // Roaster processing_details alone are never sufficient for method identity.
 const eligibleSelectedDecafMethod=selectedDecafStatements.length>0||
  decafSpec.candidates.length>0;
 const decaffeination_method=eligibleSelectedDecafMethod?inferDecaffeinationMethod({
  name:fields.name,processingDetail:roaster_details.processing_detail,
  // Include only already exact-selected-H1 product spec captions alongside
  // directly selected method prose. Conflict and mixed-caffeine gates remain.
  // A literal "Decaffeination: Sugarcane" is independent of "Process: Washed".
  selectedMethod:[...selectedDecafStatements,
   ...decafSpec.candidates.map(spec=>spec.value)].join('\n'),
  selectedCurrentDecafIdentity:directSelected.selected_current_decaf_identity===true,
  conflicting:decafSourceConflict
 }):'';
 if(decaffeination_method)fields.decaffeination_method=decaffeination_method;
 // A two-cell selected spec may call a decaffeination treatment
 // "Processing Method". The generic layout reader indexed that raw literal
 // under GREEN process before the exact current-H1 method was established.
 // Reclassify only an EXACT same-source, same-label, same-value affirmative
 // decaffeination witness. Do not assign or rewrite the green process, erase
 // conflicts, relabel generic green-processing specs, or borrow SEO/FAQ data.
 if(decaffeination_method&&decafSpec.complete){
  const treatmentKeys=new Set(decafSpec.candidates
   .filter(spec=>spec.method===decaffeination_method)
   .map(spec=>String(spec.label).trim().toLowerCase()+'\\0'+
    String(spec.value).trim().toLowerCase()));
  for(const fact of source_facts)if(fact.field==='process'&&
      fact.source_type==='html'&&fact.source_url===source_url&&
      /^(?:processing method|decaf process|decaffeination(?: method| process)?)$/iu.test(String(fact.label||'').trim())&&
      treatmentKeys.has(String(fact.label).trim().toLowerCase()+'\\0'+
       String(fact.value||'').trim().toLowerCase())){
   fact.field='decaffeination_method';
  }
 }
 // Preserve the literal selected-product method sentence for member review.
 // Contradictory stated methods remain blank, not a guessed winner.
 for(const sentence of selectedDecafStatements){
  if(source_facts.length>=384)break;
  source_facts.push({field:'decaffeination_method',
   label:'Current selected coffee decaffeination statement',value:sentence,
   source_url,source_type:'html',section:'Selected product description',
   ...(decaffeination_method?{}:{conflicting:true})});
 }
 // Expose independent exact selected method labels, including contradictions,
 // rather than hiding dissenting printed evidence behind a chosen field.
 for(const spec of decafSpec.candidates.slice(0,8)){
  if(source_facts.length>=384)break;
  source_facts.push({field:'decaffeination_method',
   label:'Exact selected decaf process caption',value:spec.label+': '+spec.value,
   source_url,source_type:'html',section:'Selected product current specification',
   ...(decaffeination_method?{}:{conflicting:true})});
 }
 // Standalone selected Limited Release is a fallback only. Named current
 // releases (e.g. Holy Grail No. 2) established later in the product
 // evidence hierarchy must never be erased by a generic limited banner.
 if(directSelected.release_label&&!fields.release_label&&!conflicts.has('release_label')){
  addField(fields,'release_label',directSelected.release_label);
  if(source_facts.length<384)source_facts.push({field:'release_label',
   label:'Exact selected product release banner',value:directSelected.release_label,
   source_url,source_type:'html',section:'Selected product description'});
 }
 // Direct current decaf prose and its selected present-lot spec can disagree.
 // Withhold both countries and retain them as explicit source-review options.
 const currentDecafCountries=selectedCurrentDecafCountryDisagreement(canonicalProduct,fields.name);
 if(currentDecafCountries){
  for(const [label,country] of [['Current selected decaf offering',currentDecafCountries.prose],
   ['Current selected decaf Location',currentDecafCountries.labeled]]){
   rememberCoffeeReviewCandidate(fields,'origin',country,label);
   if(source_facts.length<384&&!source_facts.some(f=>f.field==='origin'&&f.value===country&&f.conflicting))
    source_facts.push({field:'origin',label,value:country,source_type:'html',source_url,
     section:'Selected current decaf product',conflicting:true});
  }
  delete fields.origin;
  conflicts.add('origin');
 }
 // When the same current decaf explicitly claims beans from an incompatible
 // country versus its chosen product's own Origin caption, withhold origin.
 // Preserve BOTH literal claims and the existing green Process separately.
 const selectedDecafDisagreement=fields.origin&&!conflicts.has('origin')
  ?conflictingCurrentSelectedDecafSource({
   name:fields.name,origin:fields.origin,blocks:productCoffeeProse(canonicalProduct,clean)
  }):null;
 if(selectedDecafDisagreement){
  for(const [label,value,section] of [
   ['Current selected decaf source country',selectedDecafDisagreement.prose_country,
    selectedDecafDisagreement.prose_quote],
   ['Direct selected Origin caption',selectedDecafDisagreement.selected_origin,
    'Selected current product specification']
  ]){
   rememberCoffeeReviewCandidate(fields,'origin',value,label);
   if(source_facts.length<384)source_facts.push({
    field:'origin',label,value,source_url,source_type:'html',
    section,conflicting:true
   });
  }
  delete fields.origin;conflicts.add('origin');
 }
 // Direct present selected department beats irrelevant continental context.
 if(fields.origin&&!conflicts.has('origin')){
  const selectedDepartment=selectedCurrentColombianDepartmentOrigin({
   name:fields.name,origin:fields.origin,blocks:productCoffeeProse(canonicalProduct,clean)
  });
  if(selectedDepartment){
   if(keyOf(fields.origin)!==keyOf(selectedDepartment.value))
    rememberCoffeeReviewCandidate(fields,'origin',fields.origin,'Prior broad origin (review only)');
   fields.origin=selectedDepartment.value;
   if(source_facts.length<384)source_facts.push({
    field:'origin',label:'Exact current selected growing department',
    value:selectedDepartment.quote,source_url,source_type:'html',
    section:'Selected current beans and family farm sourcing'
   });
  }
 }
 // Generic *countrywide* educational mountain context is not proof of
 // this selected lot's narrower origin. Retain all raw source facts and the
 // original broad claim as review evidence; guard against true lot claims.
 if(fields.origin&&!conflicts.has('origin')){
  const nationalOrigin=countrywideEducationalOriginCorrection({
   name:fields.name,origin:fields.origin,
   blocks:productCoffeeProse(canonicalProduct,clean)
  });
  if(nationalOrigin){
   rememberCoffeeReviewCandidate(fields,'origin',fields.origin,
    'General national growing geography, not selected lot');
   fields.origin=nationalOrigin.origin;
   if(source_facts.length<384)source_facts.push({field:'origin_context',
    label:'Country-wide growing context, not a selected farm region',
    value:nationalOrigin.source_excerpt,source_url,source_type:'html',
    section:'General product background, noncanonical'});
  }
 }
 // Exact current selected farm H1 country can refine a directly labeled
 // Region only. Neither the farm name nor SEO nor an adjacent product
 // supplies country; use the same canonical country vocabulary and provenance.
 if(fields.origin&&!conflicts.has('origin')&&typeof fields.origin==='string'&&
  fields.origin.length>=3&&fields.origin.length<=80&&!fields.origin.includes(',')&&
  !geographyParts(fields.origin).some(part=>ORIGIN_COUNTRIES.has(part))){
  const titled=String(fields.name||'').match(/^(?:Finca|Farm|Hacienda|Estate)\s+[\p{L}\p{M}][\p{L}\p{M}\s'’.-]{2,90}\s+[–—-]\s+(?:Washed|Natural|Honey|Anaerobic)(?:\s+Processed)?\s+([\p{Lu}][\p{L}\p{M}-]{3,59})$/u);
  const titleCountry=titled?extractCoffeeTitleOrigin(titled[1]):null;
  if(titleCountry?.label==='Country'){
   const headings=productCoffeeProse(canonicalProduct,clean).filter(b=>b.tag==='h1');
   const labeled=source_facts.filter(f=>f.field==='origin'&&f.source_type==='html'&&
    !f.conflicting&&keyOf(f.value)===keyOf(fields.origin)&&
    (/^(?:growing\s+)?region$/iu.test(String(f.label||'').trim())||
     /(?:^|\/\s*)(?:growing\s+)?region\s*:/iu.test(String(f.section||'')))&&
    !/different coffee|related product|previous (?:coffee|lot)/iu.test(String(f.section||'')));
   if(headings.length===1&&keyOf(headings[0].text)===keyOf(fields.name)&&
    labeled.length===1&&!source_facts.some(f=>f.field==='origin'&&f.conflicting)){
    const previous=fields.origin;
    fields.origin=previous+', '+titleCountry.value;
    rememberCoffeeReviewCandidate(fields,'origin',previous,'Selected Region, literal country in exact H1');
    if(source_facts.length<384)source_facts.push({field:'origin',
     label:'Exact selected H1 country and current labeled Region',value:fields.origin,
     source_type:'html',source_url,section:'Selected product H1 and Region caption'});
   }
  }
 }

 // A near-identical current Region label and exact named current farm
 // story can disagree by a letter. Do not silently repair source spelling.
 // Withhold the suggestion and surface both source readings for review.
 if(fields.origin&&!conflicts.has('origin')){
  const mismatch=selectedFarmStoryRegionMismatch({
   name:fields.name,origin:fields.origin,
   blocks:productCoffeeProse(canonicalProduct,clean)
  });
  if(mismatch){
   rememberCoffeeReviewCandidate(fields,'origin',fields.origin,
    'Current selected Region label (needs confirmation)');
   rememberCoffeeReviewCandidate(fields,'origin',mismatch.value,
    'Exact selected named farm location (different printed spelling)');
   delete fields.origin;conflicts.add('origin');
   if(source_facts.length<384)source_facts.push({
    field:'origin',label:'Current selected named farm location',
    value:mismatch.value,source_url,source_type:'html',
    section:'Exact selected farm narrative; mismatched Region label',
    conflicting:true
   });
  }
 }

 // Require an exact named current farm with direct grown-at-farm proof before
 // refining a region; never override a conflicting current origin.
 if(fields.origin&&!conflicts.has('origin')){
  const growing=selectedCurrentFarmGrowingLocality({
   name:fields.name,origin:fields.origin,blocks:productCoffeeProse(canonicalProduct,clean)
  });
  if(growing){
   rememberCoffeeReviewCandidate(fields,'origin',fields.origin,'Broader selected Region label');
   fields.origin=growing.value;
   if(source_facts.length<384)source_facts.push({
    field:'origin',label:'Exact selected farm growing locality',
    value:growing.quote.slice(0,400),source_url,source_type:'html',
    section:'Exact selected current growing prose'});
  }
 }

 // An exact selected current named farm's volcano can substantiate a
 // title-matched growing region, but not an unverified farm-name municipality.
 if(fields.origin&&!conflicts.has('origin')){
  const region=selectedCurrentFarmVolcanoRegion({
   name:fields.name,origin:fields.origin,producer:fields.producer,
   process:fields.process,blocks:productCoffeeProse(canonicalProduct,clean)
  });
  if(region){
   rememberCoffeeReviewCandidate(fields,'origin',fields.origin,'Broader selected Country label');
   fields.origin=region.value;
   if(source_facts.length<384)source_facts.push({
    field:'origin',label:'Exact selected named-farm growing region',
    value:region.quote.slice(0,430),source_url,source_type:'html',
    section:'Selected current farm-and-producer narrative'
   });
  }
 }

 // A current exact country-first H1 plus its own present single-origin
 // source sentence may corroborate a known geographic region. This never
 // uses URL/SEO, a cultivar/grade, a recycled SKU, or historical commentary.
 if(fields.origin&&!conflicts.has('origin')){
  const currentRegion=selectedCountryFirstCurrentRegion({
   name:fields.name,origin:fields.origin,blocks:productCoffeeProse(canonicalProduct,clean)
  });
  if(currentRegion){
   rememberCoffeeReviewCandidate(fields,'origin',fields.origin,'Broader current selected country');
   fields.origin=currentRegion.value;
   if(source_facts.length<384)source_facts.push({
    field:'origin',label:'Current selected single-origin named growing region',
    value:currentRegion.quote.slice(0,500),
    source_url,source_type:'html',section:'Exact selected current product description'
   });
  }
 }

 // A selected current family farm plus matching named method can corroborate
 // a town within the already documented country, but not an unverified district.
 if(fields.origin&&!conflicts.has('origin')){
  const locality=selectedCurrentFarmCountryLocality({
   name:fields.name,origin:fields.origin,producer:fields.producer,
   process:fields.process,blocks:productCoffeeProse(canonicalProduct,clean)
  });
  if(locality){
   rememberCoffeeReviewCandidate(fields,'origin',fields.origin,'Broader selected Country label');
   fields.origin=locality.value;
   if(source_facts.length<384)source_facts.push({
    field:'origin',label:'Exact selected producing farm town',
    value:locality.quote.slice(0,400),source_url,source_type:'html',
    section:'Exact selected current producing farm prose'
   });
  }
 }

 // Only present exact selected micro-lot+named-producer growing-sector prose
 // can refine a corroborated existing mountain/region/country tuple.
 if(fields.origin&&!conflicts.has('origin')){
  const sector=selectedCurrentNamedMicroLotSector({
   name:fields.name,origin:fields.origin,producer:fields.producer,
   blocks:productCoffeeProse(canonicalProduct,clean)
  });
  if(sector){
   rememberCoffeeReviewCandidate(fields,'origin',fields.origin,'Broader selected mountain region');
   fields.origin=sector.value;
   if(source_facts.length<384)source_facts.push({
    field:'origin',label:'Exact selected named micro-lot growing sector',
    value:sector.quote.slice(0,430),source_url,source_type:'html',
    section:'Present selected micro-lot and credited grower'
   });
  }
 }

 // Processing-mill towns are not evidence of the farms growing this chosen
 // coffee. Preserve the facility wording, and retain only the explicit
 // country printed in the exact selected product heading.
 if(fields.origin&&!conflicts.has('origin')){
  const site=selectedProcessingSiteNotFarmOrigin({
   name:fields.name,origin:fields.origin,
   blocks:productCoffeeProse(canonicalProduct,clean)
  });
  if(site){
   rememberCoffeeReviewCandidate(fields,'origin',fields.origin,
    'Current processing-mill town, not a verified growing locality');
   fields.origin=site.country;
   if(source_facts.length<384)source_facts.push({
    field:'origin_context',label:'Selected processing facility address (review only)',
    value:site.quote.slice(0,400),source_url,source_type:'html',
    section:'Exact selected product processing description; noncanonical'
   });
  }
 }

 // Exact current selected H1 "COFFEE. COUNTRY. REGION | FLAVORS" carries a
 // literal regional origin separately from its flavor suffix. Require the
 // already accepted producing country, a bounded selected H1 matching name
 // and no competing product title/current origin conflict. Do not use SEO,
 // URL slugs, related-products headings or historic product prose.
 if(fields.origin&&!conflicts.has('origin')){
  const dotted=selectedDottedTitleCountryRegion({
   name:fields.name,origin:fields.origin,blocks:productCoffeeProse(canonicalProduct,clean)
  });
  if(dotted){
   rememberCoffeeReviewCandidate(fields,'origin',fields.origin,'Broader current selected country');
   fields.origin=dotted.value;
   if(source_facts.length<384)source_facts.push({
    field:'origin',label:'Exact selected dotted title growing region',
    value:dotted.quote.slice(0,520),source_url,source_type:'html',
    section:'Exact selected current product H1, country and locality'
   });
  }
 }

 // Conditional descriptions like "Whether washed or natural process" are
 // not evidence for either method in the currently selected bag. Guard the
 // generic fallback without suppressing a direct selected process caption,
 // source fact, named present-lot claim or title suffix. Keep the actual
 // alternative for user review rather than guessing a processing category.
 const alternateProcess=productCoffeeProse(canonicalProduct,clean).find(block=>
  !block.educational&&
  /\bwhether\s+(?:a\s+)?(?:washed|natural|honey|anaerobic)(?:\s+process(?:ed)?)?\s+or\s+(?:a\s+)?(?:washed|natural|honey|anaerobic)(?:\s+process(?:ed)?)?\b/i.test(block.text));
 if(fields.process&&alternateProcess){
  const directSource=source_facts.some(f=>f.field==='process'&&!f.conflicting&&
   /^(?:process(?:ing)?(?: method)?|green coffee process|coffee process)$/i.test(String(f.label||'').trim()));
  const content=clean(canonicalProduct,32000);
  const labeled=/\b(?:process(?:ing)?(?: method)?|green coffee process)\s*[:：]\s*(?:fully\s+)?(?:washed|natural|honey|anaerobic)\b/i.test(content);
  const presentLot=/\b(?:this|our|the)\s+(?:current\s+)?(?:coffee|lot|beans)\s+(?:(?:is|are)\s+)?(?:processed\s+(?:as|using|by)\s+|is\s+)(?:fully\s+)?(?:washed|natural|honey|anaerobic)\b/i.test(content);
  const titled=/(?:\s[-|]\s|\s\/\/\s)(?:Washed|Natural|Honey|Anaerobic)\s*$/i.test(String(fields.name||''));
  if(!directSource&&!labeled&&!presentLot&&!titled){
   rememberCoffeeReviewCandidate(fields,'process',fields.process,'Conditional alternatives are not selected processing evidence');
   delete fields.process;
   if(source_facts.length<384)source_facts.push({field:'processing_context',
    label:'Unselected processing alternatives',value:alternateProcess.text.slice(0,300),
    source_url,source_type:'html',section:'Current selected coffee description (review only)'});
  }
 }

 // An extracted value is a suggestion, never proof of an official source.
 // Keep unexpected/absent facts blank instead of guessing.
 return {ok:true,source:'unverified_public_page',fields,available:Object.keys(fields),
  ...(explicitlyRotatingCoffeeOrigin(canonicalProduct)||explicitlyRotatingCoffeeOrigin(p?.description)?{origin_confirmation_required:true}:{}),
  ...(source_facts.length?{source_facts}:{}),
  ...(source_facts.truncated||scopeTruncated||identityScopeTruncatedByFields.has(fields)?{source_facts_truncated:true}:{}),
  ...(fields.producer&&narrativeProducerByFields.has(fields)?{producer_source:'narrative'}:{}),
  ...(fields.process&&narrativeIdentityByFields.get(fields)?.has('process')?{process_source:'narrative'}:{}),
  ...(fields.variety&&narrativeIdentityByFields.get(fields)?.has('variety')?{variety_source:'narrative'}:{}),
  ...(fields.elevation_m&&elevationSourceByFields.has(fields)?{elevation_source:elevationSourceByFields.get(fields)}:{}),
  ...(seo_fallback_fields.length?{seo_fallback_fields}:{}),
  ...(conflicts.size?{conflicts:[...conflicts].sort()}:{}),
  ...(conflicts.size?{conflict_options:coffeeConflictOptions(fields,conflicts)}:{}),
  ...(roaster_recipe?{roaster_recipe}:{}),
  ...(Object.keys(roaster_details).length?{roaster_details}:{}),
  ...(roast_evidence.hint?{roast_hint:roast_evidence.hint}:{}),
  ...(qualified_process_review_note?{process_review_note:qualified_process_review_note}:{}),
  ...(producer_review_note?{producer_review_note}:{}),
  ...(elevation_review_note?{elevation_review_note}:{}),
  ...(roast_evidence.value?{roast_source:roast_evidence.source}:{}),
  note:'Best-effort webpage suggestions. The roaster, lot and release still require verification.'};
}
