// Issue #33 audit-only: a Shopify selected H2 inside the exact URL-bound purchase form.
// No menu/SEO/related-card identity substitution, automatic field inference, or relaxed failure.
import {coffeeHtmlElements} from '../../src/server/coffee-html-structure.mjs';
import {coffeeHtmlAttributes} from '../../src/server/coffee-product-scope.mjs';
const norm=v=>String(v??'').normalize('NFKC').toLowerCase().replace(/&(?:amp|nbsp);/gi,' ').replace(/[^a-z0-9]+/gu,' ').trim();
const at=n=>coffeeHtmlAttributes(n.attributes);
const cls=(n,c)=>String(at(n).class||'').split(/\s+/u).includes(c);
const within=(p,n)=>n.start>=p.headEnd&&n.end<=p.contentEnd;
const only=x=>x.length===1?x[0]:null;
const visible=s=>String(s).replace(/<[^<>]{0,1200}>/gu,' ').replace(/&(?:amp|nbsp);/gi,' ').replace(/\s+/gu,' ').trim();
export function selectedShopifyMainProductH2Identity(html,{source_url,expected_name,parsed_name}={}){
 if(typeof html!=='string'||html.length>2_000_000||!norm(expected_name)||
   norm(expected_name)!==norm(parsed_name))return null;
 let url;try{url=new URL(source_url)}catch{return null}
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||
   !/^\/products\/[a-z0-9][a-z0-9-]{0,120}$/iu.test(url.pathname))return null;
 const handle=url.pathname.slice('/products/'.length);
 const {nodes,truncated}=coffeeHtmlElements(html);
 if(truncated)return null;
 const root=only(nodes.filter(n=>n.tag==='div'&&cls(n,'main-product--root')));
 if(!root||at(root)['data-handle']!==handle||
   at(root)['data-section-type']!=='product_page'||
   nodes.some(n=>n.tag==='h1'&&within(root,n)))return null;
 const form=only(nodes.filter(n=>n.tag==='form'&&within(root,n)&&cls(n,'main-product--form')&&
   at(n).action==='/cart/add'&&String(at(n).method).toLowerCase()==='post'&&
   /^product_form_[0-9]{1,18}$/u.test(at(n).id||'')));
 if(!form||!String(at(root)['data-product-id']||'')
   .endsWith('_'+at(form).id.slice('product_form_'.length)))return null;
 const formTypes=nodes.filter(n=>n.tag==='input'&&within(form,n)&&at(n).name==='form_type');
 if(formTypes.length!==1||at(formTypes[0]).value!=='product')return null;
 const options=nodes.filter(n=>n.tag==='product-options-element'&&within(root,n)&&
   at(n)['data-main-product']==='true'&&at(n)['data-product-handle']===handle&&
   at(n)['data-product-url']===url.pathname);
 if(options.length!==1)return null;
 const heading=only(nodes.filter(n=>n.tag==='h2'&&within(form,n)&&
   cls(n,'product--block--heading')&&at(n)['data-item']==='section-heading'));
 if(!heading||!nodes.some(n=>n.tag==='div'&&within(form,n)&&cls(n,'product--block')&&
   at(n)['data-block-type']==='heading'&&within(n,heading)))return null;
 const title=visible(html.slice(heading.headEnd,heading.contentEnd));
 if(!title||title.length>220||norm(title)!==norm(expected_name))return null;
 return {method:'shopify_exact_handle_main_product_heading_cart_and_options',
   selected_title:title,official_url:source_url,selected_handle:handle};
}
