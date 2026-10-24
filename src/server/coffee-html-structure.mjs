// Small, bounded structural scan for evidence scoping, not an HTML renderer or
// sanitizer. No remote code runs. Character positions always refer to input.
const VOID=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
export function coffeeHtmlElements(html){
 if(typeof html!=='string'||html.length>2_000_000)return {nodes:[],scannedEnd:0,truncated:true};
 const nodes=[],stack=[],tag=/<\/?([a-z][a-z0-9:-]{0,60})(?=[\s/>])/gi;
 let match,scannedEnd=html.length,truncated=false,recoveredMalformedTags=0;
 while((match=tag.exec(html))){
  const start=match.index;
  let headEnd=tag.lastIndex,quote='';
  // Advance once through each opening tag, including long decorative SVG
  // attributes. A quoted > does not end a tag; broken markup cannot conceal
  // a recommendation heading from the structural scan.
  for(;headEnd<html.length;headEnd++){
   const character=html[headEnd];
   if(quote){if(character===quote)quote='';}
   else if(character==='"'||character==="'")quote=character;
   else if(character==='>'||character==='<')break;
  }
  const name=match[1].toLowerCase(),closing=html[start+1]==='/';
  const recovered=!closing&&html[headEnd]==='<'&&!quote&&recoveredMalformedTags<32&&
   /["']\s+$/.test(html.slice(start,headEnd))&&/^<[a-z][a-z0-9:-]{0,60}(?=[\s/>])/i.test(html.slice(headEnd,headEnd+80));
  if(html[headEnd]!=='>'&&!recovered){scannedEnd=start;truncated=true;break;}
  if(recovered)recoveredMalformedTags++;
  const openingEnd=headEnd+(recovered?0:1);
  tag.lastIndex=openingEnd;
  if(closing){
   let at=stack.length-1;
   while(at>=0&&nodes[stack[at]].tag!==name)at--;
   if(at>=0){
    for(let i=stack.length-1;i>=at;i--){nodes[stack[i]].end=headEnd+1;nodes[stack[i]].contentEnd=start;}
    stack.length=at;
   }
   continue;
  }
  if(nodes.length>=40_000||stack.length>=128){scannedEnd=start;truncated=true;break;}
  const node={tag:name,start,headEnd:openingEnd,end:html.length,contentEnd:html.length,
   parent:stack.length?stack[stack.length-1]:null,
   attributes:headEnd-start<=2400?html.slice(start+match[0].length,headEnd):''};
  const index=nodes.push(node)-1;
  if(VOID.has(name)||html[headEnd-1]==='/'){node.end=openingEnd;node.contentEnd=openingEnd;}
  else stack.push(index);
 }
 // Unclosed elements end at the last inspected boundary, never in source
 // that a later text parser would otherwise see without product scoping.
 for(const index of stack){nodes[index].end=scannedEnd;nodes[index].contentEnd=scannedEnd;}
 return {nodes,scannedEnd,truncated,recoveredMalformedTags};
}
