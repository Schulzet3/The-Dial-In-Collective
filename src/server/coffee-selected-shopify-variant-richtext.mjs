// Shopify no-H1 seller facts: only the current purchase Product and variant
// on the exact canonical URL. Never trust SEO or review/related coffee fields.
import {coffeeHtmlElements} from './coffee-html-structure.mjs';
import {coffeeHtmlAttributes,productMarkup} from './coffee-product-scope.mjs';
import {extractCoffeeTitleOrigin} from './coffee-identity-evidence.mjs';
const at=n=>coffeeHtmlAttributes(n.attributes);
const within=(p,n)=>n.start>=p.headEnd&&n.end<=p.contentEnd;
const text=s=>String(s||'').replace(/<[^<>]{0,600}>/gu,' ')
 .replace(/&(?:amp|nbsp);/giu,' ').replace(/\s+/gu,' ').trim();
export function selectedShopifyMainRichTextCoffee(html,{source_url,expected_name}={}){
 if(typeof html!=='string'||html.length>2_000_000)return null;
 let u;try{u=new URL(source_url)}catch{return null}
 const path=u.pathname.replace(/\/$/u,''),handle=path.match(/^\/products\/([a-z0-9][a-z0-9-]{3,155})$/iu)?.[1];
 if(!handle||u.protocol!=='https:'||u.search||u.hash)return null;
 const samePage=raw=>{try{
  const x=new URL(raw);return x.origin===u.origin&&x.pathname.replace(/\/$/u,'')===path&&!x.search&&!x.hash
 }catch{return false}};
 const link=[...html.matchAll(/<link\b(?=[^>]{0,900}\brel=["']canonical["'])(?=[^>]{0,900}\bhref=["']([^"']{1,400})["'])[^>]{0,900}>/giu)];
 const og=[...html.matchAll(/<meta\b(?=[^>]{0,900}\bproperty=["']og:url["'])(?=[^>]{0,900}\bcontent=["']([^"']{1,400})["'])[^>]{0,900}>/giu)];
 if(link.length!==1||og.length!==1||!samePage(link[0][1])||!samePage(og[0][1]))return null;
 const scoped=productMarkup(html);
 if(!scoped||/<h1\b/iu.test(scoped))return null;
 const scan=coffeeHtmlElements(scoped);
 if(scan.truncated)return null;
 const nodes=scan.nodes;
 const roots=nodes.filter(n=>n.tag==='product-info'&&at(n)['data-url']===path&&
  /^\d{8,18}$/u.test(at(n)['data-product-id']||''));
 if(roots.length!==1)return null;
 const root=roots[0],ra=at(root);
 const variants=nodes.filter(n=>n.tag==='variant-selects'&&within(root,n)&&
  at(n)['data-product-handle']===handle&&at(n)['data-product-id']===ra['data-product-id']&&
  at(n)['data-section']===ra['data-section']&&
  String(at(n)['data-product-title']||'').trim().length>=4);
 if(variants.length!==1)return null;
 const name=String(at(variants[0])['data-product-title']).trim();
 if(name.length>150||/[<>]/u.test(name))return null;
 // Historical original603 certification is separate from ordinary current
 // preview. A repurposed URL may still have matching URL/variant IDs, but
 // it MUST NOT certify the archived coffee or transfer its old facts.
 if(expected_name!==undefined&&(
   typeof expected_name!=='string'||
   name.normalize('NFKC').toLocaleLowerCase('en-US')!==expected_name.normalize('NFKC').toLocaleLowerCase('en-US')
 ))return null;
 const captions=nodes.filter(n=>n.tag==='h3'&&n.end<=root.start&&root.start-n.end<22_000&&
  n.contentEnd-n.headEnd<500).map(n=>scoped.slice(n.headEnd,n.contentEnd)).map(s=>
  s.match(/^\s*<strong\b[^<>]{0,300}>\s*(Roast Level|Tasting Notes)\s*:\s*<\/strong>\s*([^<>]{1,250})\s*$/iu)).filter(Boolean);
 const roast=captions.filter(m=>m[1].toLowerCase()==='roast level');
 const notes=captions.filter(m=>m[1].toLowerCase()==='tasting notes');
 if(roast.length!==1||notes.length!==1)return null;
 const literal=text(roast[0][2]),flavor=text(notes[0][2]);
 if(!/^(?:lighter|darker|light|medium[ -]light|medium|medium[ -]dark|dark)$/iu.test(literal)||
  flavor.length<10||flavor.length>240||!flavor.includes(','))return null;
 const site=[...html.matchAll(/<meta\b(?=[^>]{0,900}\bproperty=["']og:site_name["'])(?=[^>]{0,900}\bcontent=["']([^"']{2,140})["'])[^>]{0,900}>/giu)];
 const brand=site.length===1&&/\bcoffee\b|\broast(?:ers?|ery|ing)\b/iu.test(site[0][1])?text(site[0][1]):'';
 const country=extractCoffeeTitleOrigin(name);
 const fields={name,...(brand?{roaster:brand}:{}),
  ...(country?.label==='Country'?{origin:country.value}:{}),tasting_notes:flavor};
 const absolute={'light':'Light','medium-light':'Medium-Light','medium light':'Medium-Light',
  'medium':'Medium','medium-dark':'Medium-Dark','medium dark':'Medium-Dark','dark':'Dark'}[literal.toLowerCase()];
 if(absolute)fields.roast_level=absolute;
 const facts=[
  {label:'Selected merchant main product tasting notes',field:'tasting_notes',value:flavor,source_url,source_type:'html',section:'Main current selected product'},
  {label:'Selected merchant main product roast literal',field:'roast_level',value:literal,source_url,source_type:'html',section:'Seller direct label'}
 ];
 if(country?.label==='Country')facts.push({label:'Selected product title country',field:'origin',
  value:country.value,source_url,source_type:'html',section:'Current variant title'});
 return {ok:true,fields,source_url,source_facts:facts,
  ...(absolute?{}:{roast_hint:'Merchant prints relative '+literal+'; absolute roast level is unpublished.'}),
  selected_product_identity:{method:'shopify_main_product_variant_h3_own_richtext',
   selected_title:name,handle,product_id:ra['data-product-id'],roast_literal:literal},
  note:'Best-effort roaster information; verify the current coffee and release before saving.'};
}
