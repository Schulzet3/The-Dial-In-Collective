// Issue #33: audit-only visible merchant label; excludes metadata/script/related-product scope upstream.
// A Shopify strong Farm tag followed by colon renders as "Farm : Value" when stripped.
export function selectedCurrentVisibleLabeledFact(visibleText,label,literal) {
 const text=String(visibleText||'').replace(/\s+/g,' ').trim();
 const key=String(label||'').trim(), value=String(literal||'').trim();
 if(!/^[A-Za-z][A-Za-z ]{1,40}$/.test(key)||!value||value.length>120)return false;
 const escape=s=>s.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&');
 return new RegExp('(?:^|[^a-z0-9])'+escape(key)+'\\s*:\\s*'+escape(value)+
   '(?=$|[^a-z0-9])','i').test(text);
}
