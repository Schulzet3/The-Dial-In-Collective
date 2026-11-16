// Issue #33 audit-only: prove a Shopify selected product when its visible
// purchasable title is H3, not H1/H2. Neither SEO nor slug alone is evidence.
import {coffeeHtmlElements} from '../../src/server/coffee-html-structure.mjs';
import {coffeeHtmlAttributes} from '../../src/server/coffee-product-scope.mjs';

const norm=value=>String(value||'').normalize('NFKC').toLowerCase()
 .replace(/&(?:amp|nbsp);/gi,' ').replace(/[^a-z0-9]+/g,' ').trim();
const attrs=node=>coffeeHtmlAttributes(node.attributes);
const cls=(node,name)=>String(attrs(node).class||'').split(/\s+/).includes(name);
const inNode=(outer,inner)=>inner.start>=outer.headEnd&&inner.end<=outer.contentEnd;
function exactSource(source_url){
 try{
  const u=new URL(source_url);
  const path=u.pathname;
  if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||
     !/^\/products\/[a-z0-9][a-z0-9-]{0,120}$/.test(path))return null;
  return {url:u,handle:decodeURIComponent(path.split('/').at(-1))};
 }catch{return null}
}
function one(list){return list.length===1?list[0]:null}
export function selectedShopifyPurchaseH3Identity(html,{source_url,expected_name,parsed_name}={}){
 if(typeof html!=='string'||html.length>2_000_000||/<h1\b/i.test(html))return null;
 const selected=exactSource(source_url);
 if(!selected||!norm(expected_name)||norm(expected_name)!==norm(parsed_name))return null;
 const {nodes,truncated}=coffeeHtmlElements(html);
 if(truncated)return null;
 // Independent current URL-bound Shopify tracker must match the selected
 // JSON product, the direct selected purchase form, and the visible H3.
 const trackerScript=one(nodes.filter(n=>n.tag==='script'&&attrs(n).id==='__st'&&
  n.contentEnd-n.headEnd<=1800));
 if(!trackerScript)return null;
 let tracker;
 try{
  const content=html.slice(trackerScript.headEnd,trackerScript.contentEnd);
  const match=content.match(/^\s*var\s+__st\s*=\s*(\{[^<>]{5,1500}\})\s*;?\s*$/);
  tracker=JSON.parse(match?.[1]||'');
 }catch{return null}
 if(tracker?.p!=='product'||tracker?.rtyp!=='product'||
   !Number.isSafeInteger(tracker.rid)||tracker.rid<1)return null;
 try{
  const trackingUrl=new URL('https://'+tracker.pageurl);
  if(trackingUrl.origin!==selected.url.origin||
     trackingUrl.pathname!==selected.url.pathname||
     trackingUrl.search||trackingUrl.hash)return null;
 }catch{return null}
 const root=one(nodes.filter(n=>n.tag==='div'&&attrs(n).id==='ProductSection'&&
   /^https?:\/\/schema\.org\/Product$/.test(String(attrs(n).itemtype||''))));
 if(!root)return null;
 const hero=one(nodes.filter(n=>n.tag==='div'&&cls(n,'product-single__hero')&&
   inNode(root,n)&&n.contentEnd-n.headEnd<180000));
 if(!hero)return null;
 const h3=one(nodes.filter(n=>n.tag==='h3'&&cls(n,'product-single__title')&&
   attrs(n).itemprop==='name'&&inNode(hero,n)&&n.contentEnd-n.headEnd<300));
 if(!h3)return null;
 const title=html.slice(h3.headEnd,h3.contentEnd).replace(/<[^<>]{0,200}>/g,' ').trim();
 if(norm(title)!==norm(expected_name))return null;
 const forms=nodes.filter(n=>n.tag==='form'&&inNode(hero,n)&&
  cls(n,'product-form--wide')&&attrs(n).action==='/cart/add'&&
  attrs(n).id==='product_form_'+tracker.rid);
 const form=one(forms);
 if(!form)return null;
 const inputs=nodes.filter(n=>n.tag==='input'&&inNode(form,n));
 const value=name=>{
  const values=inputs.filter(n=>attrs(n).name===name).map(n=>attrs(n).value||'');
  return values.length===1?values[0]:null;
 };
 if(value('form_type')!=='product'||value('product-id')!==String(tracker.rid))return null;
 const section=value('section-id');
 if(!section||!/^[a-z0-9-]{3,80}$/i.test(section))return null;
 const jsonScript=one(nodes.filter(n=>n.tag==='script'&&
  attrs(n).id==='ProductJson-'+section&&attrs(n).type==='application/json'&&
  n.contentEnd-n.headEnd<100000));
 if(!jsonScript)return null;
 let product;
 try{product=JSON.parse(html.slice(jsonScript.headEnd,jsonScript.contentEnd))}
 catch{return null}
 if(product?.id!==tracker.rid||product?.handle!==selected.handle||
  norm(product?.title)!==norm(expected_name))return null;
 // The chosen root, title and purchase form live inside one current product
 // section. A second competing identity is never silently certified.
 if(nodes.filter(n=>n.tag==='h3'&&cls(n,'product-single__title')&&
  attrs(n).itemprop==='name').length!==1)return null;
 return {method:'shopify_current_tracker_product_json_visible_h3_and_cart_form',
  selected_title:title,verified_product_id:String(tracker.rid),
  official_url:source_url};
}
