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
const NONCURRENT_DECAF_METHOD=/\b(?:previous(?:ly)?|formerly|historically|typically|generally|other coffees?|another coffee|last year|prior (?:lot|harvest))\b/iu;
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
 const organizations=new Set(),farms=new Set(),sensory=new Set(),literals=new Set(),roasts=new Set();
 const releases=new Set(),decafEvidence=new Set();
 let decafEvidenceOverflow=false;
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
 let anotherExplicitList=false;
 for(const b of body){
  const line=b.text.replace(/\s+/g,' ').trim();
  // A decaf identity plus a current selected-product sentence is required.
  // Reuse the conservative method classifier; if multiple incompatible
  // methods are printed, the caller withholds autofill and keeps both sources.
  if(decafOnlyCoffee(name)&&line.length<=360&&
     (CURRENT_DECAF_METHOD.test(line)||currentNamedDecafMethod(name,line)||selectedNamedSourceDecafProcess(name,line))&&
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
 if(!out.producer&&farms.size===1){
  const farm='Finca '+[...farms][0];
  if(body.some(b=>b.text.includes(farm))){out.producer=farm;out.farm=farm;}
 }
 if(roasts.size===1)out.roast_level=[...roasts][0];
 if(releases.size===1)out.release_label=[...releases][0];
 if(sensory.size===1)out.tasting_notes=[...sensory][0];
 if(literals.size===1&&!anotherExplicitList)out.explicit_tastes_like=[...literals][0];
 if(decafEvidence.size&&!decafEvidenceOverflow)out.decaffeination_method_evidence=[...decafEvidence];
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
 const faqStart=blocks.find(b=>b.tag==='h1'&&fold(b.text)==='frequently asked questions')?.start??Infinity;
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
   let hit=caption.text.trim().match(/^(Decaffeination(?:\s+(?:Method|Process))?|Process(?:ing)?(?:\s+Method)?)\s*[:：]\s*(.{3,180})$/iu);
   if(!hit){
    const structured=caption.html.trim().match(/^<strong\b[^>]{0,240}>\s*(Decaffeination(?:\s+(?:Method|Process))?|Process(?:ing)?(?:\s+Method)?)\s*<\/strong>\s*(.{3,250})$/iu);
    const splitLabel=caption.splitStrong?caption.html.trim().match(/^(Decaffeination(?:\s+(?:Method|Process))?|Process(?:ing)?(?:\s+Method)?)\s*<\/strong>\s*(.{3,250})$/iu):null;
    const selected=structured||splitLabel;
    if(selected)hit=[selected[0],selected[1],clean(selected[2],180)];
   }
   if(!hit)continue;
   const value=hit[2].trim();
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
