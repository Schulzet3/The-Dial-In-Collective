// Direct exact-selected-product prose credits. No network access, no roaster-specific rules.
// Exact official 77-page selected-source replay gate: never equate a parsed HTML page with a certified owner field.
import {productCoffeeProse} from './coffee-product-prose.mjs';
import {normalizeRoastLabel} from './roast-level-evidence.mjs';
import {inferDecaffeinationMethod,decafOnlyCoffee} from './coffee-decaffeination-method.mjs';
import {coffeeHtmlElements} from './coffee-html-structure.mjs';
import {coffeeHtmlAttributes} from './coffee-product-scope.mjs';
const fold=v=>String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\d]+/gu,' ').trim();
// A current decaf's actual product description sometimes states its method in
// a prose sentence rather than a labeled spec (Leap Coffee's Swiss Water page).
// Accept direct, selected-product usage or a narrow current decaf process
// description; never scan site-wide education, menus, other products or SEO.
const CURRENT_DECAF_METHOD=/^(?:(?:this|our)\s+(?:decaf(?:feinated)?\s+)?coffee\s+(?:is|was|has been)\s+decaffeinated\s+(?:using|with|via|through|by)\s+(?:the\s+)?(?:swiss[\s-]?water|mountain[\s-]?water|sugar(?:[\s-]?cane|[\s-]?process)|ethyl\s+acetate|natural[\s-]?ea|(?:supercritical\s+)?carbon[\s-]?dioxide|co\s*[- ]?[2\u2082])\b|the\s+(?:swiss[\s-]?water|mountain[\s-]?water|sugar[\s-]?cane|carbon[\s-]?dioxide)\s*[\u00ae\u2122]?\s+(?:process|method)\s+is\s+(?:an?\s+)?[^.!?]{0,150}\bdecaffeination\s+process\b[^.!?]{0,160}\bcaffeine[\s-]?free\b)/iu;
// These two direct current-product decaf descriptions have a different subject
// or syntax from "this coffee is decaffeinated". Both require the selected H1,
// a wholly decaffeinated chosen coffee, bounded product prose and a named
// water treatment. Never derive method from an old lot, site SEO or water
// merely used for processing equipment.
const CURRENT_SELECTED_BEANS_WATER_DECAF=/^(?:these|our|this)\s+(?:(?:[\p{L}\p{M}-]+|&)\s+){0,12}beans\s+(?:are|were)\s+(?:naturally\s+)?decaffeinated\s+(?:using|with|via|through|by)\s+(?:the\s+)?['"‘’]?(?:swiss|mountain)[\s-]?water['"‘’]?(?:\s+process)?\b/iu;
const CURRENT_SELECTED_OUR_WATER_DECAF=/(?:^|[.!?]\s+)using\s+the\s+(?:swiss|mountain)[\s-]?water\s+process,\s+our\s+decaf\s+uses\b(?:[^.!?]|\d\.\d){0,240}\bcaffeine[\s-]?free\b/iu;
const NONCURRENT_DECAF_METHOD=/\b(?:previous(?:ly)?|formerly|historically|typically|generally|other coffees?|another coffee|last year|prior (?:lot|harvest))\b/iu;
// Same selected-product highlight can state GREEN processing and a distinct
// decaffeination treatment in one short line, without a "Decaf method:" label.
// Exact chosen H1 and product-scoped paragraph are required by the caller.
// Neither "Honey Sweet" notes nor green Natural processing imply a treatment.
const CURRENT_SELECTED_GREEN_AND_DECAF_CAPTION=/^(?:(?:extended[- ]fermentation\s+)?(?:wet|washed|natural|honey|anaerobic)\s+process(?:ed|ing)?)\s*(?:&|and)\s*(?:sugar[ -]?cane(?:\s+ethyl[ -]?acetate)?|ethyl[ -]?acetate|swiss[ -]?water|mountain[ -]?water|carbon[ -]?dioxide|co\s*[- ]?2)\s+decaffeination$/iu;

// Accept short current treatment only with the directly selected self-decaf
// paragraph and exact H1; never infer from roaster identity or site SEO.
// A present selected decaf bean can be referred to as "it" after the same
// paragraph explicitly introduced "this [adjective] bean/coffee". Require
// an antecedent before the method sentence; the H1, product prose and all
// other-coffee/history/contradiction guards remain in force.
const CURRENT_SELECTED_BEAN_PRONOUN_METHOD=/(?:^|[.!?]\s+)(it|this\s+coffee)\s+is\s+decaffeinated\s+(?:using|with|via|through|by)\s+(?:the\s+)?(?:swiss[ -]?water(?:\s+process)?|mountain[ -]?water(?:\s+process)?|sugar(?:[ -]?cane|[ -]?process)|ethyl[ -]?acetate|(?:supercritical\s+)?carbon[ -]?dioxide|co\s*[- ]?[2\u2082])\b/giu;
const CURRENT_SELECTED_DECAF_WAY=/^(?:[\p{L}\p{M}]{3,24}['’]d|(?:this|our)\s+coffee\s+(?:is|was)\s+decaffeinated)\s+by\s+way\s+of\s+(?:the\s+)?(?:swiss[\s-]?water|mountain[\s-]?water|sugar[\s-]?cane|ethyl[\s-]?acetate|(?:supercritical\s+)?carbon[\s-]?dioxide|co\s*[- ]?[2\u2082])\b/iu;
// An exact selected decaf's single product paragraph can locate its current
// decaffeination at a named facility and immediately name that facility's
// sugar-cane ethyl acetate solvent, even without a "Method:" specification.
// Both clauses must be contiguous in the SAME paragraph, describe this coffee,
// and remain inside the independently selected H1 product scope. Pure water
// used at the plant is NOT itself a Swiss/Mountain Water decaf method.
// The selected decaf can describe caffeine removal directly rather than with
// "this coffee is decaffeinated" syntax. Require a whole current product prose
// paragraph, literal EA and sugarcane in one affirmative contiguous claim.
// No general page/roaster education, other products, former lots or vague EA.
const CURRENT_SELECTED_DIRECT_EA_REMOVAL=/^(?:(?:then|next)\s+the\s+sugar[ -]?cane\s+(?:part|step)\.\s+)?(?:the|its)\s+caffeine\s+is\s+removed\s+(?:with|using|via|through|by)\s+ethyl\s+acetate\b[^.!?]{0,220}\b(?:fermented\s+)?(?:[\p{L}\p{M}-]+\s+){0,3}sugar[ -]?cane\b/iu;
const CURRENT_SELECTED_FACILITY_EA=/^(?:the|this|our)\s+coffee\s+is\s+(?:then\s+)?decaffeinated\s+at\s+[\p{Lu}][\p{L}\p{M}\d'’-]{2,70}(?:\s+[\p{Lu}][\p{L}\p{M}\d'’-]{2,70}){0,3},\s+[^.!?]{6,160}\.\s+(?:the|this)\s+(?:plant|facility)\s+relies\b[^.!?]{0,310}\bnatural\s+ethyl\s+acetate\s+from\s+sugar\s+cane\b/iu;
// A selected current decaf may identify its treatment as a roaster-translated
// method, after an explicit at-origin decaffeination clause. This is not a
// growing origin, green-bean process, or a general country method inference.
// Admit only the complete current "this/our coffee ... is decaffeinated ...
// translate as '<method>'" sentence, never a historical/negated/other product.
const CURRENT_TRANSLATED_DECAF_METHOD=/^(?:this|our)\s+(?:decaf(?:feinated)?\s+)?coffee\b[^.!?]{0,100}?\bis\s+decaffeinated\s+at\s+origin\b[^.!?]{0,180}?\b(?:translate(?:d)?\s+as|refer(?:s|red)?\s+to\s+as|described\s+as|known\s+as|called(?:\s+as)?)\s*[\u201c\u2018"'\u2018]?\s*(?:sugar[ -]?process|sugar[ -]?cane|swiss[ -]?water|mountain[ -]?water|ethyl\s+acetate|(?:supercritical\s+)?carbon[ -]?dioxide|co\s*[- ]?2)\s*[\u201d\u2019"']?\s*[.!?]?$/iu;
const TRANSLATED_DECAF_NEGATION=/\b(?:not|never|without|rather\s+than|instead\s+of|unlike|incorrectly|misleadingly|erroneously)\b/iu;

// Some exact selected decafs describe a named source coffee as "Colombia made
// with the sugarcane decaffeination process", without "is decaffeinated".
// The capitalized grammatical subject must be a non-generic token of the
// selected H1; a different coffee, education or a tasting-only sugar note
// never supplies a method. This recognizes the METHOD, not cherry processing.
const DIRECT_NAMED_SOURCE_DECAF_PROCESS=/\b([A-Z][\p{L}\p{M}'’-]{3,40})\s+made\s+with\s+(?:the\s+)?(?:swiss[ -]?water|mountain[ -]?water|sugar[ -]?cane|ethyl[ -]?acetate|carbon[ -]?dioxide|co[- ]?2)\s+decaffeination\s+process\b/gu;
const GENERIC_DECAF_SOURCE_SUBJECT=/^(?:coffee|beans?|roast|medium|dark|light|espresso|decaf|decaffeinated|blend|process|natural|sugarcane|water|method|organic|product)$/iu;
function selectedNamedSourceDecafProcess(name,line){
 if(!decafOnlyCoffee(name)||NONCURRENT_DECAF_METHOD.test(line))return false;
 const words=new Set(fold(name).split(' '));
 return [...String(line).matchAll(DIRECT_NAMED_SOURCE_DECAF_PROCESS)]
  .some(match=>!GENERIC_DECAF_SOURCE_SUBJECT.test(match[1])&&
   words.has(fold(match[1]))&&
   inferDecaffeinationMethod({name,selectedMethod:match[0]})!=='');
}

// Current selected coffee names can be longer than the grammatical subject
// printed in their own description: e.g. "TRANQUILO, Decaffeinated, 12 oz"
// prints "Tranquilo is decaffeinated using the natural Sugar Cane Process".
// Require an exact name-prefix subject, direct current-product prose, and an
// explicit decaffeination verb. Never infer decaf from a regional or roaster
// sentence, generic product titles, site-wide education or tasting notes.
const SELECTED_NAME_DECAF_SENTENCE=/^([\p{L}\p{M}\d][\p{L}\p{M}\d'’ -]{2,100}?)\s+(?:is|has been)\s+decaffeinated\s+(?:using|with|via|through|by)\s+(?:the\s+)?(?:natural\s+)?(?:swiss[\s-]?water|mountain[\s-]?water|sugar(?:[\s-]?cane|[\s-]?process)|ethyl[\s-]?acetate|natural[\s-]?ea|(?:supercritical\s+)?carbon[\s-]?dioxide|co\s*[- ]?[2\u2082])\b/iu;
function currentNamedDecafMethod(name,line){
 const subject=String(name||'').split(/[,;|]/u)[0].trim();
 if(subject.length<4||subject.length>90||!decafOnlyCoffee(name))return false;
 return String(line).split(/(?<=[.!?])\s+/u).slice(0,8).some(sentence=>{
  const claim=sentence.trim().match(SELECTED_NAME_DECAF_SENTENCE);
  return Boolean(claim&&fold(claim[1])===fold(subject));
 });
}
// Some Shopify product-only accordions put their current treatment title
// inside <summary><span class="accordion__title"> rather than a <p>.
// Require the SAME selected product info container to hold an exact current
// H1, a self-described decaf paragraph and the method title. No catalog,
// sidebar, unrelated product, educational or historical inheritance.
function selectedProductAccordionDecafMethods(html,name,clean){
 const tree=coffeeHtmlElements(html);
 if(tree.truncated)return [];
 const nodes=tree.nodes,selected=fold(name),containers=new Set(),methods=[];
 const attrs=i=>coffeeHtmlAttributes(nodes[i].attributes);
 const ancestorWalk=(i,fn)=>{
  let at=nodes[i].parent;
  for(let depth=0;at!==null&&depth<128;depth++){
   if(fn(at,nodes[at],attrs(at))===false)break;
   at=nodes[at].parent;
  }
 };
 for(let i=0;i<nodes.length;i++){
  const node=nodes[i];if(node.tag!=='h1')continue;
  if(fold(clean(html.slice(node.headEnd,node.contentEnd),220))!==selected)continue;
  ancestorWalk(i,(idx,parent,attributes)=>{
   if(/\bproduct__info-container\b/iu.test(attributes.class||''))containers.add(idx);
  });
 }
 if(!containers.size)return [];
 for(const container of containers){
  let hasSelectedDecaf=false;
  const captions=[];
  for(let i=0;i<nodes.length;i++){
   const node=nodes[i];if(!['p','span'].includes(node.tag)||node.contentEnd-node.headEnd>1200)continue;
   const attributes=attrs(i),chain=new Set(),state={summary:false,unsafe:false};
   ancestorWalk(i,(idx,parent,a)=>{
    chain.add(idx);
    const context=[a.class,a.id,a.role,a['aria-label']].join(' ');
    if(parent.tag==='summary')state.summary=true;
    if(['nav','aside','footer','header'].includes(parent.tag)||
       /\b(?:related|recommended|you-may-also-like|other-products|upsell|crosssell|carousel|menu)\b/iu.test(context))
     state.unsafe=true;
    if(idx===container)return false;
   });
   if(!chain.has(container)||state.unsafe)continue;
   const value=clean(html.slice(node.headEnd,node.contentEnd),600).trim();
   if(node.tag==='p'&&value.length<=550&&
      /\bthis\s+(?:[\p{L}\p{M}-]+\s+){0,8}decaf(?:feinated)?\s+coffee\b/iu.test(value)&&
      !NONCURRENT_DECAF_METHOD.test(value))
    hasSelectedDecaf=true;
   if(node.tag==='span'&&state.summary&&
      (attributes.class||'').split(/\s+/u).includes('accordion__title')&&
      value.length<=240&&CURRENT_SELECTED_DECAF_WAY.test(value)&&
      !NONCURRENT_DECAF_METHOD.test(value))
    captions.push(value);
  }
  if(hasSelectedDecaf)methods.push(...captions);
 }
 return [...new Set(methods)];
}


// The exact selected H1 may name a human cultivator while the product
// explicitly labels their distinct estate as Farm. Require a present-tense
// cultivation clause and continued current purchases, never H1/name alone.
function selectedCurrentContinuingCultivator(name,line){
 if(typeof name!=='string'||typeof line!=='string'||line.length>650)return '';
 const named=name.match(/(?:^|[\s,;|:–—-])([\p{Lu}][\p{L}\p{M}’'-]{2,30})\s+([\p{Lu}][\p{L}\p{M}’'-]{2,40})$/u);
 if(!named)return '';
 const first=named[1];
 if(/\b(?:other|different|formerly|historically|previously|prior\s+(?:year|lot|harvest)|last\s+(?:year|season)|no\s+longer|not\s+our|unrelated|former)\b/iu.test(line))return '';
 const credited=new RegExp("\\b(?:we\\s+)?(?:first\\s+)?(?:purchased|sourced|bought)\\s+"+first+"['’]s\\s+coffee\\b",'iu').test(line);
 const continued=/\b(?:we['’]ve\s+continued\s+to\s+do\s+so\s+every\s+year\s+since|we\s+(?:still|continue\s+to)\s+(?:buy|purchase|source)\b)/iu.test(line);
 const cultivated=new RegExp("\\b"+first+"\\s+(?:cultivates|grows|farms)\\b",'iu').test(line);
 return credited&&continued&&cultivated?named[1]+' '+named[2]:'';
}

export function selectedDirectProductCredits(html,{name='',clean,optionHtml=html}={}){
 if(typeof html!=='string'||html.length>2_000_000||!name||typeof clean!=='function')return {};
 const blocks=productCoffeeProse(html,clean);
 const headings=blocks.filter(x=>x.tag==='h1').map(x=>fold(x.text));
 // Responsive storefronts can render the same selected product heading in
 // desktop and mobile shells. Accept repeats ONLY when every in-scope H1
 // identifies that same exact coffee; a missing or different H1 still
 // blocks every direct product credit and prevents cross-coffee leakage.
 const selected=fold(name);
 // A generic catalog/shop H1 can become the provisional parsed name. That
 // is not a selected purchasable coffee, even when a nearby tile has a
 // one-option roast selector. Fail closed rather than attribute the tile's
 // roast to a nonexistent selected product.
 if(/^(?:(?:our|the)\s+)?(?:catalog(?:ue)?|collections?|all\s+(?:coffees?|products?)|shop\s+(?:all|coffees?)|coffees?|products?|store|home)$/u.test(selected))return {};
 if(!headings.length||headings.some(heading=>heading!==selected))return {};
 const body=blocks.filter(x=>!x.educational&&x.text.length<=1200&&
  ['p','div','h4','h5','li'].includes(x.tag)&&
  !/\b(?:related products?|you may also like|recommended|more coffees?|other coffees?)\b/i.test(x.section));
 // The product H1 need not contain "Decaf" if its own selected description
 // unambiguously says "this ... decaf coffee"; exclude half-caf products.
 const selectedUnnamedDecafIdentity=!/\b(?:half[ -]?caf|quarter[ -]?caf|semi[ -]?decaf|partially[ -]?decaf)\b/i.test(name)&&
  body.some(b=>b.tag==='p'&&b.text.length<=550&&
   /\bthis\s+(?:[\p{L}\p{M}-]+\s+){0,8}decaf(?:feinated)?\s+coffee\b/iu.test(b.text)&&
   !NONCURRENT_DECAF_METHOD.test(b.text));
 const organizations=new Set(),farms=new Set(),sensory=new Set(),literals=new Set(),roasts=new Set();
 const namedEstateGrowers=new Map(),namedCurrentCultivators=new Set();
 const releases=new Set(),decafEvidence=new Set();
 let decafEvidenceOverflow=false;
 // A current selected coffee's exact H1 can itself identify the water
 // decaffeination treatment (e.g., "Honduran Decaf | Swiss Water® Processed").
 // Require a full-decaf identity and a complete named-method suffix after a
 // product-title delimiter; never credit SEO, other coffees, navigation or
 // a bare educational mention of Swiss Water. Multiple incompatible exact
 // current methods are still reconciled and withheld by the caller.
 if(decafOnlyCoffee(name)&&
    /\bdecaf(?:feinated)?\b/iu.test(name)&&
    /[|–—]\s*(?:Swiss|Mountain)[ -]?Water\s*[®™]?\s+Process(?:ed|ing)?\s*$/iu.test(name)&&
    inferDecaffeinationMethod({name,selectedMethod:name})==='Water Process')
  decafEvidence.add(name);
 const selectedTitleTier=String(name).match(/\s+[—–-]\s+(Ultra Light|Very Light|Light|Medium[- ]Light|Medium|Medium[- ]Dark|Dark)$/iu);
 if(selectedTitleTier)roasts.add(normalizeRoastLabel(selectedTitleTier[1]));
 // A single current Product 'Coffee roast' option is a product-specific fixed tier,
 // unlike a default option among multiple roast choices or an unrelated grind menu.
 // Read only a single fixed variant from the current selected product form.
 // Reject recommendation/navigation/hidden menus, other products, conflicting
 // or compound variants, and any cropped/structurally malformed source.
 if(typeof optionHtml==='string'&&optionHtml.length<=2_000_000){
  const tree=coffeeHtmlElements(optionHtml);
  const candidates=[];
  let eligibleRoastControls=0;
  if(!tree.truncated)for(const node of tree.nodes){
   if(node.tag!=='select')continue;
   const attrs=coffeeHtmlAttributes(node.attributes);
   if(String(attrs.name||'').toLowerCase()!=='options[coffee roast]')continue;
   let parent=node.parent,unselected=false;
   for(let depth=0;parent!==null&&depth<128;depth++){
    const ancestor=tree.nodes[parent],a=coffeeHtmlAttributes(ancestor.attributes);
    const ctx=[a.class,a.id,a.role,a['aria-label']].join(' ');
    if(['nav','header','footer','aside'].includes(ancestor.tag)||
       /\b(?:product[-_ ]?recommendations?|related[-_ ]?(?:products?|coffees?)|recently[-_ ]?viewed|upsell|crosssell|carousel|site[-_ ]?nav|menu)\b/i.test(ctx)){
     unselected=true;break;
    }
    parent=ancestor.parent;
   }
   if(unselected||node.contentEnd-node.headEnd>3500)continue;
   // A second eligible roast menu may contain an unsupported purchase option.
   // Never treat the sole recognized tier as the selected product's only
   // available roast when another menu's value cannot be classified.
   eligibleRoastControls++;
   const content=optionHtml.slice(node.headEnd,node.contentEnd);
   const options=[...content.matchAll(/<option\b([^>]{0,500})>([\s\S]{0,180}?)<\/option>/giu)];
   if(options.length!==1||!/\bselected(?:\s*=|\s|$)/i.test(options[0][1]))continue;
   const oa=coffeeHtmlAttributes(options[0][1]);
   const value=String(oa.value||options[0][2]).trim();
   // A blend of roast descriptions is not one selected tier. A hyphenated
   // Medium-Light tier is distinct from the ambiguous "Light/Medium" label.
   if(/[\/&+]/.test(value)||/\b(?:white coffee|lighter|darker|custom|medium to dark)\b/i.test(value))continue;
   const tier=normalizeRoastLabel(value);if(tier)candidates.push(tier);
  }
  if(eligibleRoastControls===1&&candidates.length===1)roasts.add(candidates[0]);
 }
 // Product-only accordions are parsed ONCE, not once per prose block.
 // The same current selected product-info ancestor must hold the exact H1,
 // explicit decaf identity and process title; never related offerings.
 if(selectedUnnamedDecafIdentity)for(const statement of selectedProductAccordionDecafMethods(html,name,clean)){
  if(inferDecaffeinationMethod({name,selectedMethod:statement,selectedCurrentDecafIdentity:true})&&
     !decafEvidence.has(statement)){
   if(decafEvidence.size<4)decafEvidence.add(statement);
   else decafEvidenceOverflow=true;
  }
 }
 let anotherExplicitList=false;
 for(const b of body){
  const line=b.text.replace(/\s+/g,' ').trim();
  if(b.tag==='p'){
   const grower=selectedCurrentContinuingCultivator(name,line);
   if(grower)namedCurrentCultivators.add(grower);
  }
  // An unambiguous same-paragraph current selected bean antecedent makes
  // the subsequent pronoun refer to THIS named decaf, not another offering.
  // Reject site/educational context, historical alternatives and missing H1.
  for(const pronoun of line.matchAll(CURRENT_SELECTED_BEAN_PRONOUN_METHOD)){
   if(decafOnlyCoffee(name)&&b.tag==='p'&&line.length<=650&&
     !NONCURRENT_DECAF_METHOD.test(line)&&
     /\b(?:this|our)\s+(?:[\p{L}\p{M}-]+\s+){0,4}(?:beans?|coffee)\b/iu.test(line.slice(0,pronoun.index))&&
     inferDecaffeinationMethod({name,selectedMethod:pronoun[0]})&&
     !decafEvidence.has(pronoun[0])){
   if(decafEvidence.size<4)decafEvidence.add(pronoun[0]);
   else decafEvidenceOverflow=true;
   }
  }
  // Direct selected decaf evidence, never general educational background.
  if(selectedUnnamedDecafIdentity&&line.length<=240&&
     CURRENT_SELECTED_DECAF_WAY.test(line)&&!NONCURRENT_DECAF_METHOD.test(line)&&
     inferDecaffeinationMethod({name,selectedMethod:line,selectedCurrentDecafIdentity:true})&&
     !decafEvidence.has(line)){
   if(decafEvidence.size<4)decafEvidence.add(line);
   else decafEvidenceOverflow=true;
  }
  // Product-only current highlight: "Wet Process & SugarCane Ethyl Acetate
  // Decaffeination" is two distinct treatments, not a single green process.
  // Require a whole bounded selected-product P and its exact current H1;
  // descriptions of other coffees, SEO, FAQs and negated statements do not
  // enter this evidence tier. Incompatible current methods fail closed later.
  if(decafOnlyCoffee(name)&&b.tag==='p'&&line.length<=180&&
     CURRENT_SELECTED_GREEN_AND_DECAF_CAPTION.test(line)&&
     !NONCURRENT_DECAF_METHOD.test(line)&&
     inferDecaffeinationMethod({name,selectedMethod:line})&&
     !decafEvidence.has(line)){
   if(decafEvidence.size<4)decafEvidence.add(line);
   else decafEvidenceOverflow=true;
  }
  // Exact current, one-paragraph facility + solvent provenance. A plant's
  // plain water supply cannot become a Water Process method; named sugar-cane
  // EA applies only to this directly selected, wholly decaffeinated coffee.
  if(decafOnlyCoffee(name)&&b.tag==='p'&&line.length<=650&&
     CURRENT_SELECTED_FACILITY_EA.test(line)&&
     !NONCURRENT_DECAF_METHOD.test(line)&&
     inferDecaffeinationMethod({name,selectedMethod:line})&&
     !decafEvidence.has(line)){
   if(decafEvidence.size<4)decafEvidence.add(line);
   else decafEvidenceOverflow=true;
  }
  // Exactly selected current decaf: direct EA caffeine-removal prose with
  // specific sugarcane provenance; NOT site education, another coffee or a
  // negated/unspecified solvent. Current conflicting methods still fail closed.
  const eaClaim=line.match(CURRENT_SELECTED_DIRECT_EA_REMOVAL)?.[0]||'';
  if(decafOnlyCoffee(name)&&b.tag==='p'&&!b.educational&&
     !/^(?:faq|frequently asked questions|decaf process education)$/iu.test(b.section||'')&&
     line.length<=650&&eaClaim&&
     !/\b(?:not|never|without|rather than|instead of|unlike)\b/iu.test(eaClaim)&&
     !NONCURRENT_DECAF_METHOD.test(line)&&
     inferDecaffeinationMethod({name,selectedMethod:eaClaim})==='Sugar Process'&&
     !decafEvidence.has(eaClaim)){
    if(decafEvidence.size<4)decafEvidence.add(eaClaim);
    else decafEvidenceOverflow=true;
  }
  // A decaf identity plus a current selected-product sentence is required.
  // Reuse the conservative method classifier; if multiple incompatible
  // methods are printed, the caller withholds autofill and keeps both sources.
  if(decafOnlyCoffee(name)&&line.length<=360&&
     (CURRENT_DECAF_METHOD.test(line)||CURRENT_SELECTED_BEANS_WATER_DECAF.test(line)||CURRENT_SELECTED_OUR_WATER_DECAF.test(line)||currentNamedDecafMethod(name,line)||selectedNamedSourceDecafProcess(name,line))&&
     !NONCURRENT_DECAF_METHOD.test(line)&&
     inferDecaffeinationMethod({name,selectedMethod:line})&&!decafEvidence.has(line)){
   if(decafEvidence.size<4)decafEvidence.add(line);
   else decafEvidenceOverflow=true;
  }
  // Split only the same exact selected-product paragraph, never site-wide
  // description. Whole paragraphs can exceed the 360-character direct-method
  // limit while carrying one short, literal translated-method sentence.
  if(decafOnlyCoffee(name)&&line.length<=1200)for(const sentence of line.split(/(?<=[.!?])\s+/u).slice(0,8)){
   const statement=sentence.trim();
   if(statement.length<40||statement.length>360||
      !CURRENT_TRANSLATED_DECAF_METHOD.test(statement)||
      NONCURRENT_DECAF_METHOD.test(statement)||TRANSLATED_DECAF_NEGATION.test(statement)||
      !inferDecaffeinationMethod({name,selectedMethod:statement})||
      decafEvidence.has(statement))continue;
   if(decafEvidence.size<4)decafEvidence.add(statement);
   else decafEvidenceOverflow=true;
  }
  // Literal current selected-product release declaration, not a site-wide
  // 'Limited Releases' collection or a historical release quoted in prose.
  if(b.tag==='p'&&/^limited release\s*[|·]\s*(?:whole bean only|single origin)\.?$/iu.test(line))
   releases.add(/^LIMITED RELEASE(?:\b|[|·])/u.test(line)?'LIMITED RELEASE':'Limited Release');
  // A full current selected coffee name directly credited as "is roasted"
  // can identify a standard tier. Reject another coffee, older harvest,
  // incidental brewing prose, and relative language such as "lighter".
  // Current selected WHOLE blend roast, not City + Full City components.
  // Require exact selected H1 above, direct product paragraph, one roast label.
  if(b.tag==='p'&&/\bblend\b/iu.test(name)&&
     /^(?:A|An|Our|This)\s+[^.!?]{0,175}\bblend\.\s+Full\s+City\s+Roast\b/iu.test(line)&&
     !/\b(?:formerly|previous|previously|prior|historically|typically|generally|another\s+coffee|other\s+coffees?|components?|some\s+beans|roast\s+options?|roast\s+range)\b/iu.test(line)){
   const labels=[...line.matchAll(/\b(?:full\s+city|ultra\s+light|very\s+light|medium(?:[ -](?:light|dark))?|light|dark|city|french|italian)\s+roast\b/giu)];
   if(labels.length===1&&normalizeRoastLabel(labels[0][0])==='Medium-Dark')roasts.add('Medium-Dark');
  }
  const namedRoast=line.match(/\b(.{3,200}?)\s+is\s+roasted\s+(light|medium|dark)\b/iu);
  if(namedRoast&&fold(namedRoast[1]).includes(fold(name))&&
     !/\b(?:formerly|previously|previous|prior|former|last (?:season|harvest|year)|historically|typically|generally|another coffee|other coffee)\b/i.test(line))
   roasts.add(namedRoast[2].slice(0,1).toUpperCase()+namedRoast[2].slice(1).toLowerCase());
  // A direct selected product can name both its GROWER and separately named
  // estate. The explicit human producer wins over a Farm-label fallback only
  // when the same exact current H1 names that person; never copy other lots.
  if(b.tag==='p'&&line.length<=600&&
     !/\b(?:formerly|previously|historically|prior (?:harvest|lot|owner)|other coffees?|another (?:producer|offering|lot|product|coffee)|other (?:producers?|offerings?|lots?|products?)|different (?:coffee|lot|offering|product)|unrelated (?:coffee|offering|lot)|no longer|not the producer|former producer|hypothetical|might have)\b/iu.test(line)){
   const claims=line.matchAll(/\bfrom\s+producer\s+([\p{Lu}][\p{L}\p{M}'’-]{1,35}(?:\s+[\p{Lu}][\p{L}\p{M}'’-]{1,35}){1,3})['’]s\s+([\p{Lu}][\p{L}\p{M}'’-]{1,35}(?:\s+[\p{Lu}][\p{L}\p{M}'’-]{1,35}){0,3})\s+estate\b/gu);
   for(const claim of claims){
    const producer=claim[1],estate=claim[2];
    if(!(' '+selected+' ').includes(' '+fold(producer)+' '))continue;
    namedEstateGrowers.set(fold(producer)+'|'+fold(estate),{producer,estate});
   }
  }
  const organization=line.match(/^(?:Single[- ]Origin\s+)?(?:Organic\s+)?([\p{L}\p{M}' -]{3,70}?)\s+coffee\s+from\s+([A-Z][A-Z\d-]{2,18})\s+in\s+([\p{L}\p{M}'’,. -]{3,90})(?:[.!]|$)/iu);
  if(organization&&fold(name).includes(fold(organization[1]))&&
     !/\b(?:blends?|rotating|mixed)\b/i.test(name))organizations.add(organization[2]);
  const farm=line.match(/\b(?:working|work)\s+directly\s+with\s+(?:the\s+)?([\p{Lu}][\p{L}\p{M}'’-]{1,30}(?:\s+[\p{Lu}][\p{L}\p{M}'’-]{1,30}){0,4})\s+farm\b/u);
  if(farm&&fold(name).includes(fold(farm[1])))farms.add(farm[1]);
  const directFlavor=line.match(/^(?:A|An|This|Our)\s+[^.!?]{0,100}\bcoffee\b[^.!?]{0,100}\bit\s+has\s+([\p{L}\p{M},\s-]{4,110}?)\s+notes?\s+that\s+are\s+sometimes\s+described\b/iu);
  if(directFlavor){
   const value=directFlavor[1].replace(/\s*,\s*/g,', ').trim();
   if(value.length>=4&&!/\b(?:roaster|brew|process|coffee|origin)\b/i.test(value))sensory.add(value);
  }
  const explicit=line.match(/^Tastes\s+like\s*:\s*(.{5,170})$/iu);
  if(explicit){
   const value=explicit[1].trim().replace(/[.;]+$/,'').trim();
   if(value&&!/\b(?:generally|typically|other coffee|previous lot|education)\b/i.test(value))literals.add(value);
  }
  if(/^(?:(?:Tasting|Cupping|Flavor|Flavour|Cup)\s+Notes?|Notes?)\s*:\s*\S/i.test(line))anotherExplicitList=true;
 }
 // The normalized identity scope can omit visual-only product blocks. The
 // unmodified selected product section can still supply an EXACT standalone
 // release banner. Never accept site-wide collection navigation text.
 for(const b of productCoffeeProse(optionHtml,clean)){
  const val=b.text.replace(/\s+/g,' ').trim();
  if(b.tag==='p'&&/^limited release\s*[|·]\s*(?:whole bean only|single origin)\.?$/iu.test(val))
   releases.add(/^LIMITED RELEASE(?:\b|[|·])/u.test(val)?'LIMITED RELEASE':'Limited Release');
 }
 const out={};
 if(organizations.size===1)out.producer=[...organizations][0];
 if(!out.producer&&namedEstateGrowers.size===1){
  const pair=[...namedEstateGrowers.values()][0];
  out.producer=pair.producer;
  out.named_estate_producer=true;
  out.named_estate_farm=pair.estate;
 }
 if(!out.producer&&namedCurrentCultivators.size===1){
  out.producer=[...namedCurrentCultivators][0];
  out.named_current_cultivator_producer=true;
 }
 if(!out.producer&&farms.size===1){
  const farm='Finca '+[...farms][0];
  if(body.some(b=>b.text.includes(farm))){out.producer=farm;out.farm=farm;}
 }
 if(roasts.size===1)out.roast_level=[...roasts][0];
 if(releases.size===1)out.release_label=[...releases][0];
 if(sensory.size===1)out.tasting_notes=[...sensory][0];
 if(literals.size===1&&!anotherExplicitList)out.explicit_tastes_like=[...literals][0];
 if(decafEvidence.size&&!decafEvidenceOverflow){
   out.decaffeination_method_evidence=[...decafEvidence];
   if(selectedUnnamedDecafIdentity)out.selected_current_decaf_identity=true;
  }
 return out;
}


// The current selected coffee's direct named decaffeination sentence must not
// be lost when a stricter identity/geography cohort filter drops prose about
// where decaffeination happened. Only the matched current coffee as grammatical
// subject qualifies from the already-bounded product H1/description. Never
// restore generic "our coffee" claims, unrelated items, historic lots, SEO,
// cultivation origins or green-bean processing from the broader product scope.
export function selectedNamedCurrentDecafEvidence(productHtml,{name,clean}={}){
 if(!decafOnlyCoffee(name)||typeof clean!=='function')return [];
 const direct=selectedDirectProductCredits(productHtml,{name,clean,optionHtml:productHtml});
 return (direct.decaffeination_method_evidence||[])
  .filter(statement=>currentNamedDecafMethod(name,statement));
}

// Exact selected decaf product specs may independently corroborate its named
// current decaffeination sentence, even if generic green-processing layout
// comparisons disagree. Unknown/contrary method captions remain blockers.
export function selectedCurrentDecafSpecMethodEvidence(productHtml,{name,clean}={}){
 const empty={candidates:[],complete:false};
 if(!decafOnlyCoffee(name)||typeof clean!=='function'||
    typeof productHtml!=='string'||productHtml.length>2_000_000)return empty;
 const blocks=productCoffeeProse(productHtml,clean),headings=blocks.filter(b=>b.tag==='h1').map(b=>fold(b.text));
 const selected=fold(name);
 // Some product descriptions use H1 for editorial subsections. Allow only
 // these generic selected-product headings after the exact product H1.
 // Any competing product H1, missing selected H1 or generic shop H1 fails closed.
 const editorial=/^(?:tasting notes?|origin notes?|why you ll love this coffee|frequently asked questions)$/u;
 if(!headings.length||headings[0]!==selected||
    headings.some((heading,i)=>i>0&&heading!==selected&&!editorial.test(heading))||
    /^(?:all|shop|catalog|collection)\s+(?:decaf|coffee)/iu.test(String(name)))return empty;
 // FAQ and educational examples are not actual selected-product specs.
 const faqStart=blocks.find(b=>/^h[1-6]$/.test(b.tag)&&fold(b.text)==='frequently asked questions')?.start??Infinity;
 const seen=new Map();
 for(const block of blocks){
  if(block.start>=faqStart||block.educational||!['li','p','div','span'].includes(block.tag)||
     block.text.length>300||
     /\b(?:related products?|you may also like|recommended|more coffees?|education|educational|decaf guide|decaf faq)\b/i.test(block.section))continue;
  // A selected product's printed spec card may use BR-separated labels in
  // a single paragraph. Inspect individual explicit label lines, never
  // freeform descriptions, hidden markup or a generic title/SEO match.
  const captions=[{text:block.text,html:block.html}];
  if(/<br\b/iu.test(block.html)){
   const parts=block.html.split(/<br\b[^>]{0,150}>/giu);
   captions.push(...parts.map((part,i)=>({text:clean(part,300),html:part,
    splitStrong:i>0&&/<strong\b[^>]{0,240}>\s*$/iu.test(parts[i-1])})));
  }
  for(const caption of captions){
   // Some selected product spec cards separate a strong label from its
   // literal value without a colon: <strong>Processing</strong>Washed:
   // Mountain Water Decaf. Require an actual adjacent strong label in a
   // bounded product BR segment, not a freeform prose or FAQ substring.
   let hit=caption.text.trim().match(/^(Decaffeination(?:\s+(?:Method|Process))?|Decaf\s+Process|Process(?:ing)?(?:\s+Method)?)\s*[:：]\s*(.{3,180})$/iu);
   if(!hit){
    const structured=caption.html.trim().match(/^<strong\b[^>]{0,240}>\s*(Decaffeination(?:\s+(?:Method|Process))?|Decaf\s+Process|Process(?:ing)?(?:\s+Method)?)\s*<\/strong>\s*(.{3,250})$/iu);
    const splitLabel=caption.splitStrong?caption.html.trim().match(/^(Decaffeination(?:\s+(?:Method|Process))?|Decaf\s+Process|Process(?:ing)?(?:\s+Method)?)\s*<\/strong>\s*(.{3,250})$/iu):null;
    const selected=structured||splitLabel;
    if(selected)hit=[selected[0],selected[1],clean(selected[2],180)];
   }
   if(!hit)continue;
   const value=hit[2].trim();
   // "Decaf Process" is itself an affirmative decaffeination label, but
   // its VALUE must still be a complete named treatment, not generic water
   // rinsing/washing or equipment use. A vague label never licenses a guess.
   // Other existing Process/Decaffeination captions retain their own guards.
   if(/^Decaf\s+Process$/iu.test(hit[1])&&
      !/^(?:(?:swiss|mountain)[ -]?water|water[ -]?process|sugar(?:[ -]?cane|[ -]?process)|ethyl[ -]?acetate|co[ -]?2|(?:supercritical[ -]?)?carbon[ -]?dioxide)(?:\s+\(co\s*2\))?(?:\s+(?:ea|decaf(?:feination)?|method|process)){0,2}\.?$/iu.test(value))continue;
   // Process: Washed is green processing; Process: Washed + EA Sugarcane
   // Decaffeination explicitly supplies an independent decaf treatment.
   if(!/^decaffeination/i.test(hit[1])&&
      !/\b(?:decaf(?:feinat(?:ed|ion|ing))?|caffeine[- ]?free|swiss[- ]?water|mountain[- ]?water|sugar[- ]?cane|ethyl[- ]?acetate|carbon[- ]?dioxide|co[- ]?2)\b/iu.test(value))continue;
   const key=fold(hit[1]+' '+value);
   if(!seen.has(key)){
    seen.set(key,{label:hit[1],value,
     method:inferDecaffeinationMethod({name,selectedMethod:value})||null});
    if(seen.size>8)return {candidates:[...seen.values()],complete:false};
   }
  }
 }
 return {candidates:[...seen.values()],complete:true};
}
