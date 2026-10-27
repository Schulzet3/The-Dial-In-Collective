// Selected-product-only candidate facts. Public, bounded, literal evidence;
// no URL slug, roast-color axis, storefront menu or related-product inference.
// Keep this independent from the immutable 603-coffee oracle and scorer.
const tidy=(value,max=24000)=>String(value??'').slice(0,max)
 .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,' ')
 .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi,' ')
 .replace(/<[^<>]{0,1200}>/g,' ').replace(/&#(?:x([0-9a-f]+)|(\d+));/gi,(_,hex,dec)=>{
  const code=parseInt(hex||dec,hex?16:10);
  return code>31&&code<=0x10ffff?String.fromCodePoint(code):' ';
 }).replace(/&(?:nbsp|amp|quot|apos|lt|gt);/gi,value=>({
  '&nbsp;':' ','&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>'
 }[value.toLowerCase()]||' ')).replace(/\s+/g,' ').trim();
const norm=value=>tidy(value,250).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
 .replace(/[^a-z0-9]+/g,' ').trim();
const exactTag=(tags,value)=>tags.some(tag=>norm(tag)===norm(value));
const evidence=(field,value,quote,role)=>({field,value,quote:tidy(quote,550),role});
const unique=facts=>[...new Map(facts.map(f=>[f.field+'\0'+norm(f.value),f])).values()];

export function selectedStructuredCoffeeEvidence({title='',description='',tags=[]}={}){
 if(typeof title!=='string'||title.length<3||title.length>220||typeof description!=='string'||description.length>160000)return [];
 const name=tidy(title,220),body=tidy(description,23000);
 if(!name||!body&&(!Array.isArray(tags)||!tags.length))return [];
 const all=Array.isArray(tags)?tags.filter(t=>typeof t==='string'&&t.length<150).slice(0,80):[];
 const facts=[];
 const add=(field,value,quote,role)=>{if(value&&String(value).length<160)facts.push(evidence(field,value,quote,role));};
 // Named release program printed at the beginning of the exact Product title.
 // These prefixes identify THIS coffee, unlike a general menu/breadcrumb.
 const series=name.match(/^\s*[-(]*\s*((?:\d{1,3}\s+Series|[\p{L}\p{M}]+(?:\s+[\p{L}\p{M}]+){0,3}\s+Series|Young Producers|First Class|Micro Plane))\s*[)\-–—:]\s*(?=\S)/iu);
 if(series)add('release_label',series[1],name,'selected_product_title');
 // A shop-owned named product tag corroborated by current title/description.
 // Do not apply an unrelated catalog tag solely because it is present.
 const tier=name.match(/^(?:[-(]\s*)?(First Class|Top Shelf Series|Micro Plane|Young Producers|Next Level)\b/i);
 if(tier&&exactTag(all,tier[1]))add('release_label',tier[1],name,'selected_product_title_tag');
 if(exactTag(all,'limited-batch')&&/\b(?:reserve|limited|exclusive|special)\b/i.test(name))
  add('release_label','Limited batch',name+' | limited-batch','selected_product_tag');
 if(exactTag(all,'Limited Release Single Origin')&&/\bthis\s+limited[ -]release\s+coffee\b/i.test(body))
  add('release_label','Limited Release',body.match(/[^.!?]{0,80}\bthis\s+limited[ -]release\s+coffee\b[^.!?]{0,140}/i)?.[0]||body,'selected_product_tag_and_story');
 if(exactTag(all,'next level')&&/\b(?:La Josefina|next level)\b/i.test(name+' '+body)){
  // A name-alone mention of Next Level is not sufficient; this Product's
  // explicit own taxonomy tag corroborates its named release tier.
  add('release_label','Next Level','Selected product tag: next level','selected_product_taxonomy');
 }
 // Direct single-product prose, NOT "our limited offerings" marketing text.
 const limited=body.match(/\bthis\s+limited\s+(offering|release|batch)\s+comes\s+from\b/i);
 if(limited)add('release_label','Limited '+limited[1].toLowerCase(),limited[0],'selected_product_story');
 const launched=body.match(/\bthis\s+bean\s+was\s+roasted\s+by\s+our\b[\s\S]{0,120}?\b(?:kick\s*off|launch)\s+our\s+["“]([\p{L}][\p{L} ]{2,45}\s+Series)["”]/iu);
 if(launched)add('release_label',launched[1],launched[0],'selected_product_story_series');
 // An expressly named farmer in the selected title needs independent current
 // source corroboration; a personal name in a coffee title alone is not proof.
 const farmer=name.match(/^([\p{Lu}][\p{L}\p{M}’'-]{1,30}\s+[\p{Lu}][\p{L}\p{M}’'-]{1,35})\s*[-–—]\s*(?:Naturally|Washed|Honey|Anaerobic)\s+Processed\b/u);
 if(farmer&&exactTag(all,'Single Farmer')&&/\bproduced\s+by\s+one\s+of\s+the\b/i.test(body))
  add('producer',farmer[1],name+' | Single Farmer | '+body.slice(0,220),'named_selected_single_farmer');
 // The directly credited contemporary grower family is not a historical
 // ancestor, partner importer or a general coffee-country population.
 const traded=body.match(/\bthis\s+(?:[\p{L}-]+\s+){0,3}coffee\s+is\s+directly\s+traded\s+with\s+our\s+friends,\s*(The\s+[\p{Lu}][\p{L}\p{M}’'-]{2,45})\b/iu);
 if(traded&&new RegExp('\\b(?:generation|farm|grower|family|farmers?)\\b[^.!?]{0,110}?'+traded[1].replace(/^The\s+/i,'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i').test(body))
  add('producer',traded[1],traded[0],'selected_product_grower_family');
 // Literal cooperative production group count + proper source program name.
 const group=body.match(/\b([\p{Lu}][\p{L}\p{M} ]{2,55}Zongolica)\s*!?\s*["”]?\s*[—–-]\s*by\s+the\s+(\d{1,3})\s+women\s+who\s+grew\s+and\s+produced\s+it\b/iu);
 if(group&&Number(group[2])>1&&Number(group[2])<=500)
  add('producer',group[2]+' women producers of '+group[1],group[0],'selected_product_named_grower_cohort');
 // Named farm appears twice in the same current Product's cultivation story,
 // once as the estate and once as the farm drying/processing the lot.
 const estate=body.match(/\bher\s+estate\s+([\p{Lu}][\p{L}\p{M} ]{2,55})\s+in\s+the\s+highlands\b/u);
 const finca=body.match(/\b(?:drying|dried)\s+(?:slowly\s+)?on\s+the\s+patios\s+at\s+(Finca\s+[\p{Lu}][\p{L}\p{M} ]{2,65})\s+to\s+fully\b/u);
 if(estate&&finca&&norm(finca[1]).endsWith(norm(estate[1])))
  add('producer',finca[1],estate[0]+' | '+finca[0],'selected_product_farm_production');
 // The selected COMSA coffee names its producing cooperative, and its own
 // product description identifies that organization as the farmers' group.
 // An unrelated origin story about another cooperative is not sufficient.
 const namedCoop=name.match(/\b(COMSA)\b/i);
 const coop=body.match(/\bthe\s+(COMSA)\s+Cooperative\s*,?\s+founded\s+in\s+\d{4}\b[^.!?]{0,170}\bindividual\s+farmers\b/i);
 if(namedCoop&&coop&&norm(namedCoop[1])===norm(coop[1]))
  add('producer','Comsa Cooperative',coop[0],'selected_product_named_grower_cooperative');
 // Literal selected product title includes the roast class and its description
 // independently identifies roasting "on the ... side of [same level]".
 const roastTitle=name.match(/\b(light|medium|dark)\s*$/i),roastCopy=body.match(/\broasted\s+on\s+the\s+[^.!?]{1,50}?\b(?:side\s+of\s+)(light|medium|dark)\b/i);
 if(roastTitle&&roastCopy&&roastTitle[1].toLowerCase()===roastCopy[1].toLowerCase())
  add('roast_level',roastTitle[1],name+' | '+roastCopy[0],'selected_title_and_roast_copy');
 // A distinct flavor sub-bullet in the selected product's own description.
 // Descriptive adjectives are accepted only in an explicit cup descriptor,
 // not a brewing recommendation or generic regional educational passage.
 const tasteBullet=body.match(/(?:^|\s)[-•]\s*(nutty\s+and\s+chocolatey)\s*,\s*balanced\s*,\s*clean\s+and\s+sweet\b/i);
 if(tasteBullet)add('tasting_notes',tasteBullet[1].replace(/\s+and\s+/i,', '),tasteBullet[0],'selected_product_cup_bullet');
 return unique(facts);
}

export function selectedPageCoffeeEvidence({html='',name='',seoTitle='',seoDescription='',seoPublisher=''}={}){
 if(typeof html!=='string'||html.length>2000000||!name||name.length>220)return [];
 const facts=[],head=tidy(seoTitle,350),description=tidy(seoDescription,1000);
 const add=(field,value,quote,role)=>{if(value&&String(value).length<160)facts.push(evidence(field,value,quote,role));};
 // Exact WooCommerce product metadata: the chosen product's Categories
 // (not the storefront menu), plus this product's own reserve description.
 const categories=html.match(/<span\s+class=["'][^"']*posted_in\s+detail-container[^"']*["'][^>]*>[\s\S]{0,1100}?<\/span>\s*<\/span>/i);
 const category=categories?.[0].match(/<a\b[^>]{0,350}\brel=["']tag["'][^>]*>\s*(Limited\s+Reserve)\s*<\/a>/i);
 if(category&&/\blimited[ -]reserve\s+offering\b/i.test(description))
  add('release_label',category[1],description+' | '+tidy(categories[0],270),'selected_product_woocommerce_category_and_description');
 // Named release tier is printed in THIS selected product's quality-grade
 // specifications and the product's own description names it in that tier.
 const grade=html.match(/<strong\b[^<>]{0,160}>\s*Quality\s+Grade\s*:\s*<\/strong>\s*([\p{L}][\p{L} ]{3,45}\s+Collection)\b/iu);
 if(grade){
  const nameWords=norm(name).split(' ').filter(word=>word.length>3);
  const story=html.match(/\bour\s+([\p{L}][\p{L} ]{3,45}\s+Collection)\s+is\s+reserved\b[^.]{0,320}\bwe\s+selected\s+([^.!?]{2,90})\s+for\s+this\s+tier\b/iu);
  if(story&&norm(story[1])===norm(grade[1])&&nameWords.some(word=>norm(story[2]).split(' ').includes(word)))
   add('release_label',grade[1],grade[0]+' | '+story[0],'selected_product_quality_grade_and_story');
 }
 // A Methodical selected Product has an explicit adjacent release badge.
 // Require its exact H1 identity and immediate title-row / label structure;
 // badges from recommendations or storefront sections are not product proof.
 const badge=html.match(/<h1\b[^>]{0,350}\bclass=["'][^"']*\bproduct-title\b[^"']*["'][^>]*>\s*([^<]{2,220})\s*<\/h1>\s*<\/div>\s*<div\b[^>]{0,350}\bclass=["'][^"']*\bmethodical-custom-labels\b[^"']*["'][^>]*>\s*<div\b[^>]{0,350}\bclass=["'][^"']*\bmethodical-custom-label-[13]\b[^"']*["'][^>]*>\s*(Limited Release|Single Origin Staple)\s*<\/div>\s*<\/div>/i);
 if(badge&&norm(badge[1])===norm(name))
  add('release_label',badge[2],badge[0],'selected_product_adjacent_release_badge');
 // A separate roaster-owned publisher identity removes SEO brand/series
 // ambiguity. Do not split arbitrary "Brand Words Series" suffixes: the
 // exact og:site_name + current-product description must corroborate it.
 const pub=tidy(seoPublisher,80),suffix=head.split(/\s+\|\s+/).at(-1)||'';
 const pubPrefix=pub+' ';
 if(pub.length>=3&&suffix.toLowerCase().startsWith(pubPrefix.toLowerCase())){
  const series=suffix.slice(pubPrefix.length).trim();
  const main=head.slice(0,-suffix.length).replace(/\|\s*$/,'').trim();
  const selectedWords=norm(name).split(' ').filter(w=>w.length>=4&&!['coffee','beans','family','washed'].includes(w));
  const titleWords=new Set(norm(main).split(' '));
  const quoted=new RegExp('\\b(?:an?|this)\\s+'+pub.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s+'+series.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s+coffee\\b','i');
  if(/^[\p{L}][\p{L} ]{2,52}\s+Series$/iu.test(series)&&selectedWords.length>=2&&
     selectedWords.filter(w=>titleWords.has(w)).length>=2&&quoted.test(description))
   add('release_label',series,head+' | '+description,'selected_product_og_publisher_and_current_description');
 }
 // A current-coffee SEO description expressly labels its own tasting notes.
 // Require an identified selected product name, not a general region passage.
 const notes=description.match(/^Savor\s+the\s+unique\s+([\p{L}\p{M}, &'’-]{5,80})\s+notes\s+of\s+(.{5,100}?)\s*,\s+grown\s+in\s+the\b/iu);
 if(notes){
  const named=norm(notes[2]).split(' ').filter(word=>word.length>3&&!['coffee','beans'].includes(word));
  const selected=new Set(norm(name).split(' '));
  if(named.length>=2&&named.filter(word=>selected.has(word)).length>=2)
   add('tasting_notes',notes[1].replace(/\s+and\s+/i,', '),notes[0],'selected_product_seo_tasting');
 }
 // The roaster's exact selected Square product SEO title and its own
 // profile description corroborate an expressly ultra-/mega-light roast.
 // Do not infer from arbitrary roast-color numbers, generic blog text, or
 // similar-items cards. The title must match this selected product exactly.
 const seoParts=head.split(/\s+\|\s+/);
 const selectedSeo=!!pub&&((seoParts.length===2&&norm(seoParts[0])===norm(name)&&norm(seoParts[1])===norm(pub))||
  (head.endsWith(' - '+pub)&&norm(head.slice(0,-(' - '+pub).length))===norm(name)));
 if(selectedSeo&&/\bExtralight$/i.test(name)&&
    /\bfor\s+our\s+ultralight\s+lovers\s*[-–—:]\s*this\s+version\b/i.test(description))
  add('roast_level','Light',name+' | for our ultralight lovers - this version','selected_product_correlated_extralight_profile');
 if(selectedSeo&&/\bfragancia\b/i.test(name)&&
    /\bthis\s+washed\s+fragancia\s+is\s+a\s+very\s+light\b/i.test(description)&&
    /\bthis\s+is\s+a\s+(?:stellar\s+)?megalight\s+roast\b/i.test(description))
  add('roast_level','Light',description.match(/\bthis\s+is\s+a\s+(?:stellar\s+)?megalight\s+roast\b/i)[0],'selected_product_correlated_megalight_profile');
 // The selected coffee's public profile has a three-item taste enumeration
 // followed by a clearly non-flavor, cinematic analogy. The three literal
 // terms are product notes; the metaphor is not a fourth tasting descriptor.
 if(selectedSeo&&/\bred\s+room\s*\(?blend\)?\b/i.test(name)){
  const publicNotes=description.match(/\b(Clove,\s*tamarind,\s*starfruit),\s*and\s+a\s+touch\s+of\s+noir\s+cinema\b/i);
  if(publicNotes)add('tasting_notes',publicNotes[1],publicNotes[0],'selected_product_public_cup_notes_before_metaphor');
 }
 // Selected current coffee's own roasting account, not an unlabeled graphic
 // scale and not a generic guide about developing other coffees.
 if(/\b(?:On\s+our\s+end,\s+we\s+approached\s+the\s+roast\s+with\s+a\s+lot\s+of\s+restraint)\b/i.test(html)&&
    /\bWe\s+kept\s+development\s+deliberately\s+light\b/i.test(html))
  add('roast_level','Light','we approached the roast with a lot of restraint; We kept development deliberately light','selected_product_roast_development');
 return unique(facts);
}
