// R318 source-certification helper ONLY; never runtime parser evidence or a roaster allowlist.
export function selectedSellerNativeRoastTag(html,{name,roaster,source_url}={}){
 if(typeof html!=='string'||!name||!roaster||!source_url)return null;
 let slug;try{slug=new URL(source_url).pathname.split('/products/')[1]?.split('/')[0]}catch{return null}
 if(!slug)return null;
 const meta=html.match(/var meta\s*=\s*\{"product":\{"id":(\d{4,24}),([\s\S]{0,1800}?)"handle":"([^"]{1,180})"/);
 const own=html.match(/"product":\{"title":"([^"]{1,180})","vendor":"([^"]{1,180})","id":"(\d{4,24})"/);
 const tag=html.match(/_ALConfig\.product\s*=\s*\{\s*"id":\s*(\d{4,24})\s*,\s*"tags":\s*(\[[^\]]{0,1000}\])/);
 if(!meta||!own||!tag||meta[1]!==own[3]||meta[1]!==tag[1]||
   own[1]!==name||own[2]!==roaster||meta[3]!==slug||
   !meta[2].includes('"vendor":"'+roaster+'"'))return null;
 let tags;try{tags=JSON.parse(tag[2])}catch{return null}
 if(!Array.isArray(tags))return null;
 const roast=tags.filter(t=>/^(?:light|medium|medium-dark|dark)\s+roast$/i.test(String(t||'').trim()));
 if(roast.length!==1)return null;
 const value=roast[0].toLowerCase().replace(/\s+roast$/,'');
 return {value:value==='medium-dark'?'Medium-Dark':value[0].toUpperCase()+value.slice(1),
  product_id:meta[1],source:'exact_selected_shopify_meta_native_id_vendor_handle_and_owned_roast_tag'};
}
