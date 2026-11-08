import {removeElements,removeComments} from '../../supabase/functions/_shared/html-scan.mjs';
import {coffeeHtmlElements} from './coffee-html-structure.mjs';
const OTHER=/^(?:you (?:may|might) also like|related (?:products|coffees|items)|more coffees?|our current (?:coffee )?offerings|keep exploring|customer reviews|\d+\s+reviews?\s+for|recently viewed|shop similar|recommended for you|customers? also (?:bought|viewed)|you may also enjoy|goes with it|frequently bought together)\b/i;
const PRODUCT_SECTION=/^(?:our story|the story|about this coffee|about the coffee|coffee story|product details|coffee details|brewing|brew it|brew guide|ways to brew|espresso (?:recipe|brewing|guide)|transparency|ingredients?|allergen (?:info(?:rmation)?|details)|directions)\b/i;
const CONTAINER=new Set(['section','div','ul','ol','article','aside','product-recommendations','recommendations']);
const DECORATION=new Set(['svg','canvas','audio','button']);
// Consume each complete attribute, including its quoted value. Searching for
// an attribute name inside raw markup can mistake title="hidden ..." for an
// actual visibility or identity attribute.
export function coffeeHtmlAttributes(source){
 const out=Object.create(null),text=String(source||'');let at=0;
 const space=character=>/[\t\n\f\r ]/.test(character);
 while(at<text.length){
  while(at<text.length&&space(text[at]))at++;
  if(at>=text.length||text[at]==='>')break;
  if(text[at]==='/'){at++;continue;}
  // HTML keeps a leading equals sign in an unusual attribute name. Consume
  // that first character before recognizing a later equals/value separator.
  const start=at++;
  while(at<text.length&&!/[\t\n\f\r =/>]/.test(text[at]))at++;
  const name=text.slice(start,at).toLowerCase();
  while(at<text.length&&space(text[at]))at++;
  let value='';
  if(text[at]==='='){
   at++;while(at<text.length&&space(text[at]))at++;
   if(text[at]==='"'||text[at]==="'"){
    const close=text.indexOf(text[at],at+1);
    if(close<0)break;
    value=text.slice(at+1,close);at=close+1;
   }else{
    const valueStart=at;while(at<text.length&&!/[\t\n\f\r >]/.test(text[at]))at++;
    value=text.slice(valueStart,at);
   }
  }
  // Unusual names still consume their entire value before deciding whether
  // this reader recognizes the key. Quoted class-like text is never a key.
  if(/^[a-z_:][a-z0-9_:.-]*$/.test(name)&&!Object.hasOwn(out,name))out[name]=value;
 }
 return out;
}
const isHidden=attrs=>Object.hasOwn(attrs,'hidden')||/^true$/i.test(attrs['aria-hidden']||'');
const isNavigation=(node,attrs)=>/^(?:navigation|menubar|menu)$/i.test(attrs.role||'')||
 /^(?:full-menu|mobile-menu|site-navigation)$/.test(node.tag)||/^(?:nav|navigation|site-nav)$/i.test(attrs.id||'')||
 /(?:^|\s)(?:header__navigation|site-navigation|dropdown_column__menu)(?:\s|$)/i.test(attrs.class||'')||
 Object.keys(attrs).some(key=>/^data-meganav(?:-|$)/.test(key));
const isProductCostAside=(node,attrs)=>node.tag==='aside'&&
 [attrs.class,attrs.id,attrs['aria-label']].some(value=>/(?:^|[\s_-])(?:costs?|transparency)(?:$|[\s_-])/i.test(value||''));
const isRelated=(node,attrs)=>CONTAINER.has(node.tag)&&(node.tag==='product-recommendations'||node.tag==='recommendations'||
 ['js-recommendations-target','data-product-recommendations','data-recommendations'].some(key=>Object.hasOwn(attrs,key))||
 /^(?:reviews|comments)$/i.test(attrs.id||'')||/(?:^|\s)woocommerce-Reviews(?:\s|$)/i.test(attrs.class||'')||
 /(?:^|\s)(?:jdgm-(?:rev(?:__|[-\s])|widget)|testimonials?(?:__|[-_]))/i.test(attrs.class||'')||
 /(?:^|\s)(?:elementor-widget-)?eael-woo-product-carousel(?:-container|-wrapper)?(?:\s|$)/i.test(attrs.class||'')||
 [attrs.class,attrs.id,attrs['aria-label']].some(value=>/\b(?:recommendations|product[-_ ]+recommendations|complementary[-_ ]products|related[-_ ](?:products|coffees|items)|recently[-_ ]viewed|upsells|cross-sells|quick[-_ ]view|mega[-_ ]menu|meganav)\b/i.test(
  // Brewing recommendations belong to this coffee. Product recommendations
  // remain excluded even when both markers appear on the same component.
  String(value||'').replace(/\b(?:brew(?:ing)?|espresso|filter)[-_ ]+recommendations\b/gi,''))));
function withoutRelatedProducts(page,onTruncated){
 const {nodes,scannedEnd,truncated}=coffeeHtmlElements(page),ranges=[];
 if(truncated)onTruncated?.();
 page=page.slice(0,scannedEnd);
 const headings=nodes.filter(node=>/^h[2-6]$/.test(node.tag)&&node.contentEnd-node.headEnd<=1000)
  .map(node=>({...node,level:Number(node.tag[1]),title:page.slice(node.headEnd,node.contentEnd).replace(/<[^<>]{0,2000}>/g,' ').replace(/\s+/g,' ').trim()}));
 const firstAfter=(items,at)=>{let low=0,high=items.length;while(low<high){const mid=(low+high)>>>1;if(items[mid].start<=at)low=mid+1;else high=mid;}return items[low];};
 const contentAfter=(heading,container)=>{
  let cursor=heading.end;
  // A heading wrapper often ends with an SVG arrow or accessibility-hidden
  // icon. Skip entire decorative subtrees, including long SVG attributes,
  // before deciding whether this block actually contains recommendations.
  for(let step=0;step<16&&cursor<container.contentEnd;step++){
   const following=firstAfter(nodes,cursor-1),end=Math.min(following?.start??container.contentEnd,container.contentEnd);
   if(page.slice(cursor,Math.min(end,cursor+4000)).replace(/<[^<>]{0,2000}>/g,' ').trim())return true;
   if(!following||following.start>=container.contentEnd)return false;
   const collectionLink=following.tag==='a'&&following.contentEnd-following.headEnd<=500&&
    /^(?:shop all|(?:view|explore|browse) all(?: coffees?|products?)?)$/i.test(page.slice(following.headEnd,following.contentEnd).replace(/<[^<>]{0,500}>/g,' ').trim());
   if(!DECORATION.has(following.tag)&&!collectionLink&&!/\baria-hidden\s*=\s*["']true["']/i.test(following.attributes))return true;
   cursor=following.end;
  }
  return false;
 };
 // Prefer a named recommendation component. Removing its bounded element
 // preserves genuine product sections appearing later on the same page.
 const controlled=new Set(),guideIds=new Set(),attributes=nodes.map(node=>coffeeHtmlAttributes(node.attributes)),blockedControls=new Set();
 // A malformed outer recommendation wrapper can end before its cards.
 // Require both a real WooCommerce product LI and its own loop-link anchor;
 // generic product classes or class-like attribute values are insufficient.
 const loopCards=new Set(),hasClass=(attrs,name)=>String(attrs.class||'').split(/[\t\n\f\r ]+/).includes(name);
 for(const [index,node] of nodes.entries()){
  if(node.tag!=='a'||!hasClass(attributes[index],'woocommerce-LoopProduct-link'))continue;
  let parent=node.parent;
  for(let depth=0;parent!==null&&depth<8;depth++){
   const candidate=nodes[parent];
   if(candidate.tag==='li'){
    if(hasClass(attributes[parent],'product')&&hasClass(attributes[parent],'type-product'))loopCards.add(parent);
    break;
   }
   parent=candidate.parent;
  }
 }
 for(const [index,node] of nodes.entries()){
  if(blockedControls.has(node.parent)||isHidden(attributes[index])||isNavigation(node,attributes[index])||isRelated(node,attributes[index])||loopCards.has(index))blockedControls.add(index);
 }
 for(const [index,node] of nodes.entries()){
  if(blockedControls.has(index))continue;
  if(!['button','a','summary'].includes(node.tag)||node.contentEnd-node.headEnd>1000)continue;
  const label=page.slice(node.headEnd,node.contentEnd).replace(/<[^<>]{0,2000}>/g,' ').replace(/\s+/g,' ').trim();
  if(!PRODUCT_SECTION.test(label)&&!/^(?:description|details|specifications?|coffee info(?:rmation)?|variet(?:y|ies)|cultivars?|origin|process(?:ing)?|tasting notes|flavo[u]?r profile|espresso(?:\s*[-–:]\s*\w+)?|filter(?:\s*[-–:]\s*\w+)?)$/i.test(label))continue;
  const attrs=attributes[index];
  for(const value of [attrs['aria-controls'],attrs['data-target'],attrs['data-bs-target'],attrs.href]){
   if(typeof value==='string'&&/^#?[A-Za-z][\w:.-]{0,150}$/.test(value))controlled.add(value.replace(/^#/,''));
  }
  if(attrs['data-guide']&&/^[\w:.-]{1,160}$/.test(attrs['data-guide']))guideIds.add(attrs['data-guide']);
 }
 const withinControlled=new Set();
 for(const [index,node] of nodes.entries()){
  const attrs=attributes[index];
  const hidden=isHidden(attrs);
  const directOwner=controlled.has(attrs.id)||guideIds.has(attrs['data-guide']);
  if(directOwner||withinControlled.has(node.parent))withinControlled.add(index);
  // Some storefront controls reference the accordion wrapper rather than
  // its nested hidden content element. Only its named panel may inherit
  // ownership; unrelated hidden fragments inside that wrapper stay hidden.
  const nestedPanel=withinControlled.has(node.parent)&&
   (/^(?:tabpanel|region)$/i.test(attrs.role||'')||/(?:^|\s)(?:accordion|collapsible|collapse|tab)[_-]+(?:content|panel|body)(?:$|[\s_-])/i.test(attrs.class||''));
  const ownedPanel=directOwner||nestedPanel;
  if(hidden&&!ownedPanel)ranges.push([node.start,node.end]);
  // Product pages can present a review/testimonial carousel immediately
  // after the selected bag. A review about a DIFFERENT roast is not a second
  // current-roast label. Require a bounded review-card group with explicit
  // review ratings, never a generic `stars` class or coffee description.
  if(node.tag==='div'&&String(attrs.class||'').split(/[\t\n\f\r ]+/).includes('rcards')&&
     node.contentEnd-node.headEnd<=120000){
   const body=page.slice(node.headEnd,node.contentEnd);
   if(/<div\b[^<>]{0,800}class=["'][^"']*\brcard\b/i.test(body)&&
      /aria-label=["'][0-5]\s+out\s+of\s+5\s+stars["']/i.test(body))
    ranges.push([node.start,node.end]);
  }
  if(node.tag==='aside'&&!isProductCostAside(node,attrs))ranges.push([node.start,node.end]);
  if(isNavigation(node,attrs))ranges.push([node.start,node.end]);
  if(loopCards.has(index))ranges.push([node.start,node.end]);
  if(!CONTAINER.has(node.tag))continue;
  const explicit=isRelated(node,attrs);
  if(explicit)ranges.push([node.start,node.end]);
 }
 const namedRanges=[];
 for(const [start,end] of ranges){
  const last=namedRanges.at(-1);if(last&&start<=last[1])last[1]=Math.max(last[1],end);else namedRanges.push([start,end]);
 }
 // A resume marker must be a peer or higher-level product section. A nested
 // recommendation's "Product Details" and a coffee named "Espresso" are
 // still recommendations. Index the bounded heading levels per parent so
 // repeated recommendation blocks never rescan the remaining page.
 const productByParent=new Map();let productNamedAt=0;
 for(const node of headings){
  if(!PRODUCT_SECTION.test(node.title))continue;
  while(productNamedAt<namedRanges.length&&namedRanges[productNamedAt][1]<=node.start)productNamedAt++;
  if(namedRanges[productNamedAt]&&node.start>=namedRanges[productNamedAt][0]&&node.start<namedRanges[productNamedAt][1])continue;
  const levels=productByParent.get(node.parent)||Array.from({length:7},()=>[]);
  for(let level=node.level;level<=6;level++)levels[level].push(node);
  productByParent.set(node.parent,levels);
 }
 const nextProduct=(parent,level,start)=>firstAfter(productByParent.get(parent)?.[level]||[],start);
 let namedAt=0,coveredUntil=0;
 for(const node of headings){
  if(!OTHER.test(node.title)||node.start<coveredUntil)continue;
  while(namedAt<namedRanges.length&&namedRanges[namedAt][1]<=node.start)namedAt++;
  if(namedRanges[namedAt]&&node.start>=namedRanges[namedAt][0]&&node.end<=namedRanges[namedAt][1])continue;
  let parent=node.parent,container=null,resume=null,removeStart=node.start;
  // Only an enclosing block that begins with this heading can be discarded;
  // never discard the entire main product or a preceding description.
  for(let level=0;parent!==null&&level<5;level++){
   const candidate=nodes[parent];
   if(!CONTAINER.has(candidate.tag)||node.start-candidate.headEnd>4000)break;
   const before=page.slice(candidate.headEnd,node.start).replace(/<[^<>]{0,2000}>/g,' ').trim();
   if(before)break;
   const next=nextProduct(parent,node.level,node.start);
   if(next&&next.start<candidate.contentEnd){resume=next;removeStart=candidate.headEnd;break;}
   // Skip a heading-only wrapper. Once its actual recommendation container
   // is found, stop climbing: its outer layout may also hold the real story.
   if(contentAfter(node,candidate)||candidate.tag==='section'){container=candidate;break;}
   removeStart=candidate.start;parent=candidate.parent;
  }
  if(container){ranges.push([container.start,container.end]);coveredUntil=container.end;continue;}
  // Unwrapped recommendations have no closing container. Resume only at an
  // explicitly named product section; an arbitrary next coffee heading does
  // not establish that the selected coffee has resumed.
  const next=resume||nextProduct(node.parent,node.level,node.start);
  const end=next?.start??page.length;
  ranges.push([removeStart,end]);coveredUntil=end;
 }
 if(!ranges.length)return page;
 // Some real WooCommerce pages close a `section.related.products` too
 // early, leaving subsequent <li class=product> cards as orphan siblings.
 // Their flavor tags must not become selected-product evidence. Extend a
 // known related section only when the *very next* sibling is explicitly
 // another product card, and stop at the next named genuine product section
 // (e.g. "Our Story"). Do not trim subsequent selected-product content.
 const nodeIndexByStart=new Map(nodes.map((node,index)=>[node.start,index]));
 const completeRanges=ranges.map(([start,end])=>{
  const sectionIndex=nodeIndexByStart.get(start),section=nodes[sectionIndex];
  const actualRelated=section?.tag==='section'&&/\brelated\b[\s\S]*\bproducts?\b/i.test(attributes[sectionIndex]?.class||'');
  if(!actualRelated)return [start,end];
  const next=firstAfter(nodes,end-1);
  if(!next||next.tag!=='li'||next.start-end>1200||
     !hasClass(attributes[nodeIndexByStart.get(next.start)],'product')||
     !/^(?:\s*<\/(?:li|ul|div)>){0,5}\s*$/.test(page.slice(end,next.start)))return [start,end];
  const resume=headings.find(item=>item.start>=end&&item.start-end<125000&&PRODUCT_SECTION.test(item.title));
  return [start,resume?.start??Math.min(page.length,end+125000)];
 });
 const chunks=[];let cursor=0;
 for(const [start,end] of completeRanges.sort((a,b)=>a[0]-b[0])){
  if(end<=cursor)continue;
  if(start>cursor)chunks.push(page.slice(cursor,start));
  chunks.push(' ');cursor=end;
 }
 chunks.push(page.slice(cursor));return chunks.join('');
}
export function withoutDetachedFarmerProfiles(page){
 // Suppress only explicitly identified external farmer-profile widgets from
 // canonical product facts. A generic "MEET" heading may describe the actual
 // selected producer or precede real bean specifications on other storefronts;
 // never truncate the remainder of a product at that heading.
 const {nodes}=coffeeHtmlElements(page),ranges=[];
 for(const node of nodes){
  if(node.tag!=='div'||node.contentEnd-node.headEnd>120000)continue;
  const a=coffeeHtmlAttributes(node.attributes);
  if(a.id!=='meet-farmers-inline')continue;
  const html=page.slice(node.headEnd,node.contentEnd);
  if(!/<h[2-6]\b[^<>]{0,1000}\bclass=["'][^"']*\bmf-meet-kicker\b[^"']*["'][^<>]{0,1000}>/i.test(html))continue;
  ranges.push([node.start,node.end]);
 }
 if(!ranges.length)return page;
 let cursor=0,result='';
 for(const [start,end] of ranges.sort((a,b)=>a[0]-b[0])){
  if(start<cursor)continue;
  result+=page.slice(cursor,start)+' ';cursor=end;
 }
 return result+page.slice(cursor);
}

function escapeAttributeAngles(page,onTruncated){
 // Preserve literal attribute text without letting downstream legacy text
 // regexes reinterpret title="<p>Origin: ...</p>" as a visible paragraph.
 const pieces=[];let cursor=0;
 for(const node of coffeeHtmlElements(page).nodes){
  if(node.start<cursor)continue;
  const head=page.slice(node.start,node.headEnd);
  const safe=head.replace(/(=\s*)("[^"]*"|'[^']*')/g,(_,prefix,value)=>prefix+value.replace(/</g,'&lt;').replace(/>/g,'&gt;'));
  if(safe!==head){pieces.push(page.slice(cursor,node.start),safe);cursor=node.headEnd;}
 }
 if(!cursor)return page;
 pieces.push(page.slice(cursor));const output=pieces.join('');
 if(output.length>2_000_000){onTruncated?.();return '';}
 return output;
}
// Text parsers must share the same product scope. Structured JSON is read
// separately; scripts, navigation and recommendation cards are never facts.
export function productMarkup(html,{onTruncated}={}){
 if(typeof html!=='string'||html.length>2_000_000)return '';
 let page=removeElements(removeComments(html),['script','style','nav','footer','template','noscript','select','textarea','iframe']);
 // Keep product specifications before the H1, which some storefronts use.
 // A custom element such as <main-product-selector> is NOT a <main>.
 // This function is called twice in the extraction flow; false matching
 // would discard the selected coffee's heading and flavor fields.
 const scan=coffeeHtmlElements(page);if(scan.truncated)onTruncated?.();
 const main=scan.nodes.find(node=>node.tag==='main');
 if(main)page=page.slice(main.headEnd,main.contentEnd);
 page=withoutRelatedProducts(page,onTruncated);
 // Retain public linked profile for supplemental review; canonical parser applies a separate boundary.
 // The remaining asides are narrowly identified selected-product cost or
 // transparency panels. Expose their content to shared text collectors as
 // an ordinary product div; generic promotional/sidebar asides stay removed.
 const replacements=[];
 for(const node of coffeeHtmlElements(page).nodes){
  if(node.tag!=='aside'||!isProductCostAside(node,coffeeHtmlAttributes(node.attributes)))continue;
  replacements.push([node.start,node.headEnd,page.slice(node.start,node.headEnd).replace(/^<aside\b/i,'<div data-coffee-product-aside="cost"')]);
  if(/^<\/aside\b/i.test(page.slice(node.contentEnd,node.end)))
   replacements.push([node.contentEnd,node.end,page.slice(node.contentEnd,node.end).replace(/^<\/aside\b/i,'</div')]);
 }
 if(replacements.length){
  let cursor=0;const parts=[];
  for(const [start,end,value] of replacements.sort((a,b)=>a[0]-b[0])){
   if(start<cursor)continue;parts.push(page.slice(cursor,start),value);cursor=end;
  }
  parts.push(page.slice(cursor));page=parts.join('');
 }
 if(page.length>2_000_000){onTruncated?.();return '';}
 return escapeAttributeAngles(page,onTruncated);
}
