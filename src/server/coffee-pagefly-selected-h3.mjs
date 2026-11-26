// #33 audit-only: purchase-bound PageFly H3, not SEO or unrelated H3/card.
// Require current URL-bound first-party product tracker, exact product-id/form
// and unique, non-related current PageFly ProductBox/H3 before original identity.
import {coffeeHtmlElements} from './coffee-html-structure.mjs';
import {coffeeHtmlAttributes} from './coffee-product-scope.mjs';
const norm=x=>String(x||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const attrs=n=>coffeeHtmlAttributes(n.attributes);
const inside=(outer,node)=>node.start>=outer.headEnd&&node.end<=outer.contentEnd;
function relatedAncestor(nodes,n){
 let i=n.parent;
 for(let d=0;i!==null&&d<100;d++){
  const parent=nodes[i];if(!parent)return true;
  const a=attrs(parent),label=[a['data-pf-type'],a.class,a.id,a.role].join(' ');
  if(['aside','nav','header','footer'].includes(parent.tag)||
    /ProductList2|related|upsell|recommend|carousel|sidebar|slider/i.test(label))return true;
  i=parent.parent;
 }
 return false;
}
export function selectedShopifyPageFlyH3Identity(html,{source_url='',expected_name='',parsed_name=''}={}){
 if(typeof html!=='string'||html.length>2_000_000||/<h1\b/i.test(html)||!norm(parsed_name))return null;
 let target;try{target=new URL(source_url)}catch{return null}
 if(target.protocol!=='https:'||target.username||target.password||target.search||target.hash||
   !/^\/products\/[a-z0-9][a-z0-9-]{0,120}$/.test(target.pathname))return null;
 const tree=coffeeHtmlElements(html);if(tree.truncated)return null;
 const nodes=tree.nodes;
 const scripts=nodes.filter(n=>n.tag==='script'&&attrs(n).id==='__st'&&n.contentEnd-n.headEnd<=1800);
 if(scripts.length!==1)return null;
 let tracker;try{
  const raw=html.slice(scripts[0].headEnd,scripts[0].contentEnd);
  tracker=JSON.parse(raw.match(/^\s*var\s+__st\s*=\s*(\{[^<>]{5,1500}\})\s*;?\s*$/)?.[1]||'');
 }catch{return null}
 if(tracker?.p!=='product'||tracker?.rtyp!=='product'||!Number.isSafeInteger(tracker.rid)||tracker.rid<=0)return null;
 try{
  const check=new URL('https://'+tracker.pageurl);
  if(check.origin!==target.origin||check.pathname!==target.pathname||check.search||check.hash)return null;
 }catch{return null}
 const id=String(tracker.rid);
 const direct=nodes.filter(n=>n.tag==='div'&&attrs(n)['data-pf-type']==='ProductBox'&&
   attrs(n)['data-product-id']===id&&!attrs(n)['data-href']&&!relatedAncestor(nodes,n));
 if(direct.length!==1)return null;
 const forms=nodes.filter(n=>n.tag==='form'&&inside(direct[0],n)&&
  attrs(n).id==='product_form_'+id&&attrs(n).action==='/cart/add'&&
  String(attrs(n).class||'').split(/\s+/).includes('pf-product-form'));
 if(forms.length!==1)return null;
 const inputs=nodes.filter(n=>n.tag==='input'&&inside(forms[0],n));
 const value=name=>{const found=inputs.filter(n=>attrs(n).name===name);return found.length===1?attrs(found[0]).value:null};
 if(value('form_type')!=='product'||value('product-id')!==id)return null;
 const headings=nodes.filter(n=>n.tag==='h3'&&inside(forms[0],n)&&
  attrs(n)['data-pf-type']==='ProductTitle'&&attrs(n)['data-product-type']==='title'&&
  attrs(n)['data-product-id']===id&&!attrs(n)['data-href']&&n.contentEnd-n.headEnd<400);
 if(headings.length!==1)return null;
 const title=html.slice(headings[0].headEnd,headings[0].contentEnd).replace(/<[^<>]{0,200}>/g,' ').trim();
 if(expected_name&&norm(title)!==norm(expected_name))return null;
 // SEO title may append taxonomy to the actual printed H3. It is a consistency
 // check only, never a positive source or standalone selected identity.
 if(norm(parsed_name)!==norm(title)){
  const tags=[...html.matchAll(/<meta\b[^>]{0,500}\bproperty=["']og:title["'][^>]{0,500}>/gi)];
  const metadata=tags.length===1?tags[0][0].match(/\bcontent=["']([^"']{3,220})["']/i)?.[1]:'';
  if(norm(metadata)!==norm(parsed_name)||!norm(parsed_name).startsWith(norm(title)+' '))return null;
 }
 return {selected_scope_start:direct[0].start,selected_scope_end:direct[0].end,
  method:'shopify_pagefly_current_tracker_productbox_cart_form_and_H3',
  selected_title:title,verified_product_id:id,official_url:source_url};
}
