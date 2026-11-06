// Linear raw-block scanning for untrusted HTML. This is NOT an HTML sanitizer.
// Each search resumes AFTER the last consumed block; missing closes consume the
// remainder instead of retrying a lazy whole-document regex at every opener.
// HTML attributes may quote '>' (including in JSON-LD script openers).
// A closing delimiter inside quotes is not the end of the opening tag.
function openingTagEnd(html,from){
 let quote='';
 for(let i=from;i<html.length;i++){
  const char=html[i];
  if(quote){if(char===quote)quote='';}
  else if(char==='"'||char==="'")quote=char;
  else if(char==='>')return i;
 }
 return -1;
}
export function* rawElements(html,names=['script']){
 if(typeof html!=='string')return;
 if(!names.length||names.some(n=>!/^[a-z][a-z0-9]{0,31}$/.test(n)))throw new TypeError('Invalid tag names');
 const open=new RegExp('<('+names.join('|')+')(?=[\\s/>])','gi');
 let match;
 while((match=open.exec(html))){
  const name=match[1].toLowerCase(),start=match.index,headEnd=openingTagEnd(html,open.lastIndex);
  if(headEnd<0){yield {start,end:html.length,attributes:'',body:'',closed:false,name};return;}
  const close=new RegExp('</'+name+'\\s*>','gi');close.lastIndex=headEnd+1;
  const end=close.exec(html);
  if(!end){yield {start,end:html.length,attributes:html.slice(open.lastIndex,headEnd),body:'',closed:false,name};return;}
  const stop=end.index+end[0].length;
  yield {start,end:stop,attributes:html.slice(open.lastIndex,headEnd),body:html.slice(headEnd+1,end.index),closed:true,name};
  open.lastIndex=stop;
 }
}
export function removeElements(html,names){
 const chunks=[];let cursor=0;
 for(const block of rawElements(html,names)){chunks.push(html.slice(cursor,block.start),' ');cursor=block.end;}
 chunks.push(html.slice(cursor));return chunks.join('');
}
export function removeComments(html){
 const chunks=[];let cursor=0,start;
 while((start=html.indexOf('<!--',cursor))>=0){
  chunks.push(html.slice(cursor,start),' ');
  const end=html.indexOf('-->',start+4);if(end<0)return chunks.join('');
  cursor=end+3;
 }
 chunks.push(html.slice(cursor));return chunks.join('');
}
