// Audit's fail-closed Elementor/WooCommerce H1-free selected-product H2 identity.
import {coffeeHtmlElements} from '../../src/server/coffee-html-structure.mjs';
import {coffeeHtmlAttributes} from '../../src/server/coffee-product-scope.mjs';
const decode=s=>String(s||'').replace(/&#(?:x([0-9a-f]+)|([0-9]+));/giu,(_,hex,dec)=>{
 const n=Number.parseInt(hex||dec,hex?16:10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';
}).replace(/&(?:ndash|mdash);/giu,'–').replace(/&amp;/giu,'&').replace(/&nbsp;/giu,' ');
const urlKey=s=>{try{const u=new URL(s);return u.protocol==='https:'?u.origin+u.pathname.replace(/\/+$/u,''):'';}catch{return '';}};
export function selectedElementorWooCommerceH2(html,{source_url}={}){
 if(typeof html!=='string'||html.length>2_000_000||!urlKey(source_url))return [];
 const {nodes,truncated}=coffeeHtmlElements(html);if(truncated)return [];
 const attrs=nodes.map(n=>coffeeHtmlAttributes(n.attributes));
 const classes=i=>String(attrs[i]?.class||'').split(/\s+/u);
 const has=(i,s)=>classes(i).includes(s),inside=(a,b)=>b.start>=a.headEnd&&b.end<=a.contentEnd;
 const roots=nodes.map((n,i)=>({n,i})).filter(({n,i})=>n.tag==='div'&&attrs[i]['data-elementor-type']==='product'&&
  has(i,'elementor-location-single')&&has(i,'product')&&classes(i).some(c=>/^post-\d+$/u.test(c)));
 if(roots.length!==1)return [];
 const {n:root,i:ri}=roots[0],ids=classes(ri).filter(s=>/^post-\d+$/u.test(s));
 if(ids.length!==1||nodes.some(n=>n.tag==='h1'&&inside(root,n)))return [];
 const safe=n=>{let j=n.parent;for(let k=0;j!==null&&k<128;k++){
  if(j===ri)return true;
  const a=nodes[j],p=attrs[j]||{};
  if(!a||['nav','aside','header','footer'].includes(a.tag)||
   /\b(?:related|recommendations?|upsells?|cross[-_ ]sells?|carousel|swiper-slide|sidebar|hidden)\b/iu.test(
   [p.class,p.id,p.role,p['aria-label']].join(' ')))return false;
  j=a.parent;
 }return false;};
 const titles=nodes.map((n,i)=>({n,i})).filter(({n,i})=>n.tag==='h2'&&inside(root,n)&&safe(n)&&has(i,'product_title')&&has(i,'entry-title'));
 if(titles.length!==1)return [];
 const title=titles[0].n;let j=title.parent,owned=false;
 for(let k=0;j!==null&&j!==ri&&k<24;k++){
  if(has(j,'elementor-widget-woocommerce-product-title')&&attrs[j]['data-widget_type']==='woocommerce-product-title.default'){owned=true;break;}
  j=nodes[j]?.parent??null;
 }
 if(!owned)return [];
 const descriptions=nodes.map((n,i)=>({n,i})).filter(({n,i})=>n.tag==='div'&&inside(root,n)&&safe(n)&&
  has(i,'elementor-widget-woocommerce-product-content')&&attrs[i]['data-widget_type']==='woocommerce-product-content.default'&&n.contentEnd-n.headEnd>15);
 if(descriptions.length!==1)return [];
 const forms=nodes.map((n,i)=>({n,i})).filter(({n,i})=>n.tag==='form'&&inside(root,n)&&safe(n)&&
  has(i,'cart')&&urlKey(attrs[i].action)===urlKey(source_url)&&
  nodes.filter((b,k)=>b.tag==='button'&&inside(n,b)&&safe(b)&&has(k,'single_add_to_cart_button')&&
   attrs[k].name==='add-to-cart'&&attrs[k].value===ids[0].slice(5)).length===1);
 if(forms.length!==1)return [];
 const name=decode(html.slice(title.headEnd,title.contentEnd).replace(/<[^>]{0,1200}>/gu,' ')).replace(/\s+/gu,' ').trim();
 return name&&name.length<=220?[name]:[];
}
