// Issue #33: audit-only exact selected storefront identity where no H1/form H2 exists.
// Require TWO matching independent on-page product proofs plus the actual visible product hero.
// Never substitute generic OG/SEO, a slug, related products or another release for selected identity.
const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const text=html=>String(html||'').replace(/<[^<>]{0,600}>/g,' ').replace(/&(?:amp|nbsp);/gi,' ').replace(/\s+/g,' ').trim();
const attr=(s,k)=>{
 const match=String(s||'').match(new RegExp('\\b'+k+'\\s*:\\s*"([^"\\\\\\n]{1,250})"','i'));
 return match?.[1]||'';
};
const urlEquals=(candidate,source)=>{
 try{
  const a=new URL(candidate),b=new URL(source);
  return a.protocol==='https:'&&b.protocol==='https:'&&a.hostname===b.hostname&&
   a.pathname===b.pathname&&!a.search&&!a.hash;
 }catch{return false;}
};
export function selectedShopifyCurrentVisibleIdentity(html,{source_url,expected_name,parsed_name}={}){
 if(typeof html!=='string'||html.length>2_000_000||/<h1\b/i.test(html))return null;
 if(!urlEquals(source_url,source_url))return null;
 const stScripts=[...html.matchAll(/<script\b[^>]{0,450}\bid=(['"])__st\1[^>]{0,450}>([\s\S]{0,1700}?)<\/script>/gi)];
 if(stScripts.length!==1)return null;
 let tracker;
 try{
  const match=stScripts[0][2].match(/\bvar\s+__st\s*=\s*(\{[^<>]{5,1300}\})\s*;?/);
  tracker=JSON.parse(match?.[1]||'');
 }catch{return null;}
 if(tracker?.p!=='product'||tracker?.rtyp!=='product'||
  !Number.isSafeInteger(tracker.rid)||tracker.rid<1||
  !urlEquals('https://'+tracker.pageurl,source_url))return null;
 const items=[...html.matchAll(/\bvar\s+item\s*=\s*\{([\s\S]{0,2100}?)\}\s*;/gi)];
 if(items.length!==1)return null;
 const data=items[0][1],name=attr(data,'Name'),brand=attr(data,'Brand');
 const productId=Number((data.match(/\bProductID\s*:\s*(\d{1,18})\b/i)||[])[1]);
 const official=attr(data,'URL');
 if(!name||name.length>200||!brand||brand.length>100||!Number.isSafeInteger(productId)||
  productId!==tracker.rid||!urlEquals(official,source_url)||
  norm(name)!==norm(expected_name))return null;
 const parsed=norm(parsed_name),selected=norm(name),vendor=norm(brand),prefix=parsed.endsWith(' '+selected)?
  parsed.slice(0,-selected.length).trim():'';
 const recognizedBrandPrefix=prefix.length>=3&&
  (prefix===vendor||prefix===vendor.split(' ')[0]);
 if(parsed!==selected&&!recognizedBrandPrefix)return null;
 // The chosen product is rendered visibly as a paired mobile/desktop hero.
 // Repeated identical producer+country can be one selected product; incompatible panels fail closed.
 const panes=[...html.matchAll(/<div\b[^>]{0,400}\bclass=(['"])([^'"]{1,180})\1[^>]{0,250}>([\s\S]{0,1600}?)<\/div>/gi)]
  .filter(m=>/\bcoffee_title\b/.test(m[2])&&/\bcoffee_title(?:Mobile|Desktop)\b/.test(m[2]));
 if(panes.length!==2)return null;
 const observations=panes.map(m=>{
  const a=m[2].split(/\s+/),producer=(m[3].match(/<span\b[^>]{0,250}\bclass=(['"])coffeeTitle_producer\1[^>]{0,200}>([\s\S]{0,220}?)<\/span>/i)||[])[2],
  country=(m[3].match(/<span\b[^>]{0,250}\bclass=(['"])coffeeTitle_country\1[^>]{0,200}>([\s\S]{0,150}?)<\/span>/i)||[])[2];
  return {which:a.includes('coffee_titleMobile')?'mobile':a.includes('coffee_titleDesktop')?'desktop':'',
   producer:text(producer),country:text(country)};
 });
 if(observations.map(x=>x.which).sort().join(',')!=='desktop,mobile')return null;
 const [one,two]=observations;
 if(!one.producer||!one.country||one.producer.length>100||one.country.length>80||
  norm(one.producer)!==norm(two.producer)||norm(one.country)!==norm(two.country)||
  !(' '+selected+' ').includes(' '+norm(one.producer)+' ')||
  !(' '+selected+' ').includes(' '+norm(one.country)+' '))return null;
 return {method:'shopify_product_tracker_and_matching_visible_mobile_desktop_hero',
  selected_title:name,visible_producer:one.producer,visible_country:one.country,
  verified_product_id:String(productId),official_url:official};
}
