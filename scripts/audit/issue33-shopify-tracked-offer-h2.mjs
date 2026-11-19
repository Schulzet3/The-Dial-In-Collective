// #33 audit-only. A Shopify product can have a purchasable H2 rather than H1.
// Prove the exact current selected coffee with independent URL, Shopify tracker,
// analytics product, a unique visible purchase H2 and matching cart variant.
// Never certify a generic H2, SEO/meta-only or a related product.
import {coffeeHtmlElements} from '../../src/server/coffee-html-structure.mjs';
import {coffeeHtmlAttributes} from '../../src/server/coffee-product-scope.mjs';

const norm=value=>String(value||'').normalize('NFKC').toLowerCase()
 .replace(/&(?:amp|nbsp);/gi,' ').replace(/[^a-z0-9]+/g,' ').trim();
const attr=node=>coffeeHtmlAttributes(node.attributes);
const cls=(node,name)=>String(attr(node).class||'').split(/\s+/).includes(name);
const within=(outer,inner)=>inner.start>=outer.headEnd&&inner.end<=outer.contentEnd;
const only=items=>items.length===1?items[0]:null;
const selectedUrl=url=>{
 try{
  const u=new URL(url);
  if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||
   !/^\/products\/[a-z0-9][a-z0-9-]{0,120}$/i.test(u.pathname))return null;
  return {u,handle:u.pathname.split('/').at(-1)};
 }catch{return null}
};
const cleanText=value=>String(value||'').replace(/<[^>]{0,1200}>/g,' ')
 .replace(/&(?:amp|nbsp);/gi,' ').replace(/\s+/g,' ').trim();

export function selectedShopifyTrackedOfferH2Identity(html,{source_url,expected_name,parsed_name}={}){
 if(typeof html!=='string'||html.length>2_000_000)return null;
 const selected=selectedUrl(source_url);
 if(!selected||!norm(expected_name)||norm(expected_name)!==norm(parsed_name))return null;
 const {nodes,truncated}=coffeeHtmlElements(html);
 if(truncated)return null;
 const st=only(nodes.filter(n=>n.tag==='script'&&attr(n).id==='__st'&&
  n.contentEnd-n.headEnd<2500));
 if(!st)return null;
 let tracker;
 try{
  const raw=html.slice(st.headEnd,st.contentEnd);
  tracker=JSON.parse(raw.match(/^\s*var\s+__st\s*=\s*(\{[^<>]{5,2000}\})\s*;?\s*$/)?.[1]||'');
 }catch{return null}
 if(tracker.p!=='product'||tracker.rtyp!=='product'||!Number.isSafeInteger(tracker.rid)||
   tracker.rid<1)return null;
 try{
  const t=new URL('https://'+tracker.pageurl);
  if(t.origin!==selected.u.origin||t.pathname!==selected.u.pathname||t.search||t.hash)return null;
 }catch{return null}
 const analytics=nodes.filter(n=>n.tag==='script'&&n.contentEnd-n.headEnd<100000&&
  /\bvar\s+meta\s*=\s*\{\s*"product"\s*:/u.test(html.slice(n.headEnd,n.contentEnd)));
 const metaScript=only(analytics);
 if(!metaScript)return null;
 let product;
 try{
  const script=html.slice(metaScript.headEnd,metaScript.contentEnd);
  product=JSON.parse(script.match(/\bvar\s+meta\s*=\s*(\{[^<>]{20,80000}\})\s*;/u)?.[1]||'').product;
 }catch{return null}
 if(product?.id!==tracker.rid||product?.handle!==selected.handle||
  !Array.isArray(product.variants)||!product.variants.length)return null;
 const variantIds=new Set(product.variants.filter(v=>Number.isSafeInteger(v.id)&&v.id>0)
  .map(v=>String(v.id)));
 if(!variantIds.size)return null;
 const section=only(nodes.filter(n=>n.tag==='div'&&attr(n).id==='shopify-section-product-template'));
 if(!section)return null;
 const root=only(nodes.filter(n=>n.tag==='div'&&cls(n,'product')&&
  /^https?:\/\/schema\.org\/Product$/.test(String(attr(n).itemtype||''))&&within(section,n)));
 if(!root)return null;
 const productUrl=only(nodes.filter(n=>n.tag==='meta'&&attr(n).itemprop==='url'&&within(root,n)));
 if(!productUrl||attr(productUrl).content!==source_url)return null;
 const titleHeads=nodes.filter(n=>n.tag==='h2'&&attr(n).itemprop==='name'&&within(root,n));
 const titleNode=only(titleHeads);
 if(!titleNode)return null;
 const header=nodes[titleNode.parent];
 if(!header||header.tag!=='header'||!cls(header,'product-title')||!within(root,header))return null;
 const title=cleanText(html.slice(titleNode.headEnd,titleNode.contentEnd));
 if(norm(title)!==norm(expected_name)||title.length>220)return null;
 const form=only(nodes.filter(n=>n.tag==='form'&&within(root,n)&&
   attr(n).id==='add-to-cart-form'&&cls(n,'shopify-product-form')&&
   attr(n).action==='/cart/add'&&String(attr(n).method).toLowerCase()==='post'));
 if(!form)return null;
 const validForm=nodes.some(n=>n.tag==='input'&&within(form,n)&&
  attr(n).name==='form_type'&&attr(n).value==='product');
 if(!validForm)return null;
 const select=only(nodes.filter(n=>n.tag==='select'&&within(form,n)&&
  attr(n).name==='id'&&attr(n).id==='product-selectors'));
 if(!select)return null;
 const ids=nodes.filter(n=>n.tag==='option'&&within(select,n)).map(n=>attr(n).value);
 if(!ids.length||ids.some(id=>!variantIds.has(String(id))))return null;
 // One current product root, not a selected-looking title pasted into a recommendation.
 if(nodes.filter(n=>n.tag==='div'&&cls(n,'product')&&
  /^https?:\/\/schema\.org\/Product$/.test(String(attr(n).itemtype||''))&&within(section,n)).length!==1)return null;
 return {method:'shopify_analytics_tracker_visible_h2_schema_url_and_cart_variants',
  selected_title:title,verified_product_id:String(tracker.rid),official_url:source_url};
}
