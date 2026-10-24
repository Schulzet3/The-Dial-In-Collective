// Review-only evidence that needs its own selected-product link or visual
// marker. These helpers never assign canonical coffee fields or fetch content.
import {removeElements,removeComments} from '../../supabase/functions/_shared/html-scan.mjs';
import {coffeeHtmlElements} from './coffee-html-structure.mjs';
import {coffeeHtmlAttributes,productMarkup} from './coffee-product-scope.mjs';

const MAX_HTML=2_000_000,MAX_FRAGMENT=32_000,MAX_PROFILE_HTML=64_000;
const MAX_ROWS=64,MAX_CHARS=16_000,MAX_VALUE=1600;
const OMIT=['script','style','template','noscript','iframe','svg','canvas'];
const BLOCKED=new Set([...OMIT,'nav','footer','header','form','input','select','option','textarea']);
const ENTITIES={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',ndash:'–',mdash:'—',rsquo:'’',lsquo:'‘'};
const normalized=value=>String(value||'').normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
const hasClass=(attrs,name)=>String(attrs.class||'').split(/\s+/).includes(name);
const safeUrl=value=>{
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&String(value).length<=3000?url.toString():'';}catch{return '';}
};
function decoded(value){
 return String(value).replace(/&(#x[0-9a-f]{1,8}|#[0-9]{1,8}|[a-z]{1,24});/gi,(whole,key)=>{
  const lower=key.toLowerCase();if(Object.hasOwn(ENTITIES,lower))return ENTITIES[lower];
  if(lower[0]==='#'){
   const point=Number.parseInt(lower.slice(lower[1]==='x'?2:1),lower[1]==='x'?16:10);
   if(point>0&&point<=0x10ffff&&!(point>=0xd800&&point<=0xdfff))return String.fromCodePoint(point);
  }
  return whole;
 });
}
function clipped(value,length){
 let end=Math.min(length,value.length);
 if(end>0&&end<value.length&&/[\uD800-\uDBFF]/.test(value[end-1])&&/[\uDC00-\uDFFF]/.test(value[end]))end--;
 return value.slice(0,end);
}
function collector(source_url,source_type='html'){
 const facts=[];let truncated=false,characters=0;
 const add=(label,value,section,extra={})=>{
  if(!value)return;
  label=String(label).replace(/\s+/g,' ').trim();value=String(value).replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
  if(!label||!value)return;
  if(label.length>100||section.length>100)truncated=true;
  label=clipped(label,100);section=clipped(section,100);
  let at=0,part=0;
  while(at<value.length){
   let end=at+clipped(value.slice(at),MAX_VALUE).length;
   if(end<value.length){const space=value.lastIndexOf(' ',end);if(space>at+MAX_VALUE/2)end=space;}
   const chunk=value.slice(at,end).trim(),partLabel=part?clipped(label,78)+' (continued '+(part+1)+')':label;
   if(facts.length>=MAX_ROWS||characters+partLabel.length+chunk.length+section.length>MAX_CHARS){truncated=true;break;}
   facts.push({label:partLabel,value:chunk,section,source_url,source_type,...extra});
   characters+=partLabel.length+chunk.length+section.length;at=end;while(value[at]===' ')at++;part++;
  }
 };
 return {add,limit:()=>{truncated=true;},finish:()=>{
  Object.defineProperty(facts,'truncated',{value:truncated,enumerable:false});return facts;
 }};
}
// Attribute parsing consumes quoted values whole. Duplicate relevant attributes
// are ambiguous rather than evidence of either of their possible renderings.
function attributes(source){
 const attrs=coffeeHtmlAttributes(source),seen=new Set();
 for(const match of String(source||'').matchAll(/(?:^|\s)([A-Za-z_:][A-Za-z0-9_:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)){
  const key=match[1].toLowerCase();
  if(seen.has(key))attrs.ambiguous=true;seen.add(key);
 }
 return attrs;
}
function styleValue(attrs,key){
 if(attrs.ambiguous||typeof attrs.style!=='string'||attrs.style.length>1000||/[{}<>\\]|\/\*/.test(attrs.style))return '';
 const values=[];
 for(const declaration of attrs.style.split(';')){
  const split=declaration.indexOf(':');if(split<0)continue;
  if(declaration.slice(0,split).trim().toLowerCase()===key)values.push(declaration.slice(split+1).trim());
 }
 return values.length===1?values[0]:'';
}
const hidden=attrs=>attrs.ambiguous||Object.hasOwn(attrs,'hidden')||/^true$/i.test(String(attrs['aria-hidden']||'').trim())||
 /(?:^|;)\s*display\s*:\s*none\s*(?:!important\s*)?(?:;|$)/i.test(attrs.style||'')||
 /(?:^|;)\s*visibility\s*:\s*(?:hidden|collapse)\s*(?:!important\s*)?(?:;|$)/i.test(attrs.style||'')||
 /(?:^|\s)(?:sr-only|visually-hidden|hidden)(?:\s|$)/.test(attrs.class||'');
const unrelated=attrs=>/^(?:navigation|menubar|menu)$/i.test(attrs.role||'')||
 /(?:^|[\s_-])(?:recommendations|related[-_ ](?:products|coffees)|complementary[-_ ]products|quick[-_ ]view|customer[-_ ]reviews|jdgm-widget)(?:$|[\s_-])/i.test([attrs.class,attrs.id].filter(Boolean).join(' '));
function context(html){
 const source=removeElements(removeComments(html),OMIT),scan=coffeeHtmlElements(source);
 const nodes=scan.nodes,attrs=nodes.map(node=>attributes(node.attributes)),children=new Map(),ids=new Map(),blocked=new Set();
 for(const [index,node] of nodes.entries()){
  const siblings=children.get(node.parent)||[];siblings.push(index);children.set(node.parent,siblings);
  if(attrs[index].id){const matches=ids.get(attrs[index].id)||[];matches.push(index);ids.set(attrs[index].id,matches);}
  if(blocked.has(node.parent)||BLOCKED.has(node.tag)||hidden(attrs[index])||unrelated(attrs[index]))blocked.add(index);
 }
 const text=(index,max=MAX_FRAGMENT)=>{
  if(blocked.has(index))return '';
  const node=nodes[index];if(node.contentEnd-node.headEnd>MAX_FRAGMENT)return '';
  const chunks=[];let at=node.headEnd;
  for(const child of children.get(index)||[]){
   const next=nodes[child];chunks.push(source.slice(at,next.start));
   if(!blocked.has(child)&&!['button','img'].includes(next.tag))chunks.push(text(child,max));
   at=next.end;
  }
  chunks.push(source.slice(at,node.contentEnd));
  return clipped(decoded(chunks.join(' ')).replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim(),max);
 };
 const within=(child,parent)=>nodes[child].start>=nodes[parent].headEnd&&nodes[child].end<=nodes[parent].contentEnd;
 const descendants=(index,predicate)=>{
  const found=[],end=nodes[index].contentEnd;
  for(let i=index+1;i<nodes.length&&nodes[i].start<end;i++)if(!blocked.has(i)&&predicate(nodes[i],attrs[i],i))found.push(i);
  return found;
 };
 return {source,nodes,attrs,children,ids,blocked,text,within,descendants,truncated:scan.truncated};
}
function uniqueId(ctx,id){const matches=ctx.ids.get(id)||[];return matches.length===1?matches[0]:undefined;}
function one(items){return items.length===1?items[0]:undefined;}
function visiblePreview(ctx,target,wrapper){
 const preview=uniqueId(ctx,target+'-preview');
 if(preview===undefined||ctx.blocked.has(preview)||!ctx.within(preview,wrapper)||!hasClass(ctx.attrs[preview],'mf-preview-block'))return null;
 const triggers=ctx.descendants(preview,(node,attrs)=>node.tag==='button'&&attrs['data-mf-open']===target&&hasClass(attrs,'mf-open-btn'));
 const titles=ctx.descendants(preview,(node,attrs)=>/^h[2-4]$/.test(node.tag)&&hasClass(attrs,'mf-meet-kicker'));
 if(triggers.length!==1||titles.length!==1)return null;
 const title=ctx.text(titles[0],200),match=title.match(/^MEET\s+(.+)$/i);
 if(!match||match[1].length>80||match[1].length<2)return null;
 return {name:match[1],index:preview};
}
function linkedProfiles(raw,selected,result){
 const wrapper=uniqueId(selected,'meet-farmers-inline');
 if(wrapper===undefined||selected.blocked.has(wrapper))return;
 const triggers=selected.descendants(wrapper,(node,attrs)=>node.tag==='button'&&hasClass(attrs,'mf-open-btn')&&/^mf-[A-Za-z0-9-]{1,100}$/.test(attrs['data-mf-open']||''));
 if(!triggers.length)return;
 if(triggers.length>4)result.limit();
 const original=context(raw);if(original.truncated){result.limit();return;}
 const originalWrapper=uniqueId(original,'meet-farmers-inline');
 if(originalWrapper===undefined||original.blocked.has(originalWrapper))return;
 let total=0;
 for(const trigger of triggers.slice(0,4)){
  const target=selected.attrs[trigger]['data-mf-open'];
  if(triggers.filter(index=>selected.attrs[index]['data-mf-open']===target).length!==1)continue;
  const preview=visiblePreview(selected,target,wrapper),originalPreview=visiblePreview(original,target,originalWrapper);
  if(!preview||!originalPreview||normalized(preview.name)!==normalized(originalPreview.name))continue;
  const modal=uniqueId(original,target+'-modal');
  if(modal===undefined||!original.within(modal,originalWrapper)||!hasClass(original.attrs[modal],'mf-modal')||original.attrs[modal].ambiguous)continue;
  // Only the linked outer modal may be hidden. Its ancestors must be visible,
  // and opening it does not open arbitrary nested hidden panels or forms.
  let ancestor=original.nodes[modal].parent,permitted=true;
  while(ancestor!==null){if(original.blocked.has(ancestor)){permitted=false;break;}ancestor=original.nodes[ancestor].parent;}
  if(!permitted)continue;
  const length=original.nodes[modal].contentEnd-original.nodes[modal].headEnd;
  if(length>MAX_FRAGMENT||total+length>MAX_PROFILE_HTML){result.limit();continue;}
  total+=length;
  const opened=context(original.source.slice(original.nodes[modal].headEnd,original.nodes[modal].contentEnd));
  if(opened.truncated){result.limit();continue;}
  const dialog=one(opened.nodes.flatMap((node,index)=>!opened.blocked.has(index)&&node.tag==='aside'&&opened.attrs[index].role==='dialog'&&hasClass(opened.attrs[index],'mf-dialog')?[index]:[]));
  if(dialog===undefined)continue;
  const headings=opened.descendants(dialog,node=>node.tag==='h2');
  if(headings.length!==1||normalized(opened.text(headings[0],200))!==normalized(preview.name))continue;
  const panels=opened.descendants(dialog,(_node,attrs)=>hasClass(attrs,'mf-fields-panel'));
  if(panels.length!==1)continue;
  const section='Supplementary page panel / Linked farmer profile / '+preview.name;
  result.add('Farmer profile name',preview.name,section);
  for(const item of opened.descendants(panels[0],(_node,attrs)=>hasClass(attrs,'mf-item'))){
   const labels=opened.descendants(item,node=>node.tag==='h3'),values=opened.descendants(item,node=>node.tag==='p');
   if(labels.length===1&&values.length===1)result.add(opened.text(labels[0],101),opened.text(values[0]),section);
  }
  for(const item of opened.descendants(dialog,(node,attrs)=>node.tag==='details'&&hasClass(attrs,'mf-acc'))){
   const labels=opened.descendants(item,node=>node.tag==='summary'),values=opened.descendants(item,(_node,attrs)=>hasClass(attrs,'mf-acc-body'));
   if(labels.length===1&&values.length===1)result.add(opened.text(labels[0],101),opened.text(values[0]),section);
  }
 }
}
function visualMarkers(selected,result){
 const roast=[];
 for(const [index,node] of selected.nodes.entries()){
  if(selected.blocked.has(index))continue;
  const attrs=selected.attrs[index];
  const range=hasClass(attrs,'product-ranges__item'),comparison=hasClass(attrs,'product-block-comparative-scale');
  if(!range&&!comparison)continue;
  if(node.contentEnd-node.headEnd>12_000){result.limit();continue;}
  if(range){
   const title=one(selected.descendants(index,n=>n.tag==='h2')),
    left=one(selected.descendants(index,(_n,a)=>hasClass(a,'product-ranges__left'))),
    right=one(selected.descendants(index,(_n,a)=>hasClass(a,'product-ranges__right'))),
    marker=one(selected.descendants(index,(_n,a)=>hasClass(a,'product-ranges__middle')));
   if([title,left,right,marker].includes(undefined))continue;
   const heading=selected.text(title,101),a=selected.text(left,101),b=selected.text(right,101),level=styleValue(selected.attrs[marker],'--level');
   if(!/^(?:Experience|Roast Level)$/i.test(heading)||!a||!b||a.length>100||b.length>100||
    !/^-?(?:0|[1-9]\d{0,3})(?:\.\d{1,8})?$/.test(level))continue;
   result.add(heading+' graphic marker','--level: '+level+'; printed endpoints: '+a+' / '+b,'Published product graphic');
  }
  if(comparison){
   const chart=one(selected.descendants(index,(_n,a)=>hasClass(a,'comparison-chart')));if(chart===undefined)continue;
   const labels=selected.descendants(chart,(n,_a,i)=>['div','span','p'].includes(n.tag)&&/^(?:Light Roast|Dark Roast)$/i.test(selected.text(i,101)));
   const leaves=labels.filter(i=>!labels.some(j=>i!==j&&selected.within(j,i)));
   if(leaves.length!==2||!/^Light Roast$/i.test(selected.text(leaves[0]))||!/^Dark Roast$/i.test(selected.text(leaves[1])))continue;
   const markers=selected.descendants(chart,(n,a)=>['div','span'].includes(n.tag)&&!!styleValue(a,'left')&&
    !/(?:^|\s)(?:w-0|tick|legend)(?:\s|$)/.test(a.class||'')&&
    (/(?:^|[\s_-])(?:indicator|marker|thumb|handle|selected)(?:$|[\s_-])/.test(a.class||'')||
     hasClass(a,'rounded-full')&&hasClass(a,'-translate-x-1/2')));
   if(markers.length!==1)continue;
   const position=styleValue(selected.attrs[markers[0]],'left');
   if(!/^(?:0|[1-9]\d?|100)(?:\.\d{1,8})?%$/.test(position)||Number.parseFloat(position)>100)continue;
   roast.push({position,left:selected.text(leaves[0]),right:selected.text(leaves[1])});
  }
 }
 if(roast.length>4){result.limit();return '';}
 const distinct=new Set(roast.map(item=>item.position+'\0'+item.left+'\0'+item.right));
 for(const item of roast)result.add('Roast comparison marker','left: '+item.position+'; printed endpoints: '+item.left+' / '+item.right,
  'Published product graphic',distinct.size>1?{conflicting:true}:{});
 if(distinct.size!==1)return '';
 const item=roast[0];
 return 'The roaster’s graphic places its marker at left: '+item.position+' between “'+item.left+'” and “'+item.right+'”. This is a published position, not a supported roast category.';
}

export function collectSupplementaryCoffeePageFacts(rawHtml,{selected_html,source_url}={}){
 const url=safeUrl(source_url),result=collector(url);
 if(!url||typeof rawHtml!=='string'||typeof selected_html!=='string')return {facts:result.finish(),roast_hint:''};
 if(rawHtml.length>MAX_HTML||selected_html.length>MAX_HTML){result.limit();return {facts:result.finish(),roast_hint:''};}
 const selected=context(productMarkup(selected_html,{onTruncated:result.limit}));
 if(selected.truncated){result.limit();return {facts:result.finish(),roast_hint:''};}
 linkedProfiles(rawHtml,selected,result);
 const roast_hint=visualMarkers(selected,result);
 return {facts:result.finish(),roast_hint};
}

export function collectSupplementaryStructuredCoffeeFacts(data,{source_url,source_type='product_json'}={}){
 const url=safeUrl(source_url),result=collector(url,source_type==='html'?'html':'product_json');
 if(!url||!data||typeof data!=='object'||Array.isArray(data))return result.finish();
 for(const length of [8,12,14]){
  const key='gtin'+length,value=Object.hasOwn(data,key)?data[key]:null;
  if(typeof value==='string'&&new RegExp('^\\d{'+length+'}$').test(value))
   result.add('GTIN-'+length,value,'Published product identifier',{source_path:'/'+key});
 }
 for(const key of ['type','product_type']){
  if(!Object.hasOwn(data,key)||typeof data[key]!=='string')continue;
  const value=data[key].trim();
  if(value.length>1600){result.limit();continue;}
  if(!value||/[<>\u0000-\u001f\u007f]/.test(value))continue;
  result.add('Published catalog category ('+key+')',value,'Published catalog category',{source_path:'/'+key});
 }
 return result.finish();
}
