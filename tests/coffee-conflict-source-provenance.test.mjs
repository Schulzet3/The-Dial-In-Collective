import test from 'node:test';
import assert from 'node:assert/strict';
import {coffeeConflictReviewOptions,coffeeSourceReviewSnapshot,coffeeUrlPreviewMarkup,applyCoffeeUrlFields} from '../site/cloud/coffee-url-autofill.js';
const url='https://roaster.example/products/current-lot';
const conflict={ok:true,source_url:url,fields:{name:'Current Lot'},conflicts:['origin'],
 conflict_options:{origin:[{value:'Brazil',label:'Selected product specification',source_url:url},{value:'Mexico',label:'Selected product SEO',source_url:url}]},
 source_facts:[{field:'origin',label:'Origin',value:'Brazil',source_url:url,source_type:'html'},
  {field:'origin',label:'SEO description',value:'Mexico',source_url:url,source_type:'html'}]};
test('both conflicting options retain safe public-source provenance in preview and export',()=>{
 const groups=coffeeConflictReviewOptions(conflict);
 assert.deepEqual(groups.map(g=>g.field),['origin']);
 assert.deepEqual(groups[0].options.map(o=>o.value),['Brazil','Mexico']);
 assert.ok(groups[0].options.every(o=>o.source_url===url));
 const html=coffeeUrlPreviewMarkup(conflict);
 assert.match(html,/Tap the correct option to autofill, or type a value in the field/);
 assert.equal((html.match(/View Original Source/g)||[]).length,2);
 assert.equal((html.match(/rel="noopener noreferrer"/g)||[]).length,2);
 assert.ok(html.includes('href="'+url+'"'));
 const snapshot=coffeeSourceReviewSnapshot(conflict,{checkedAt:'2026-10-27T00:00:00Z'});
 assert.deepEqual(snapshot.conflict_options[0].options.map(o=>o.source_url),[url,url]);
 assert.equal(snapshot.conflicts[0],'origin');
});
test('structured options missing URL inherit exact public provenance from matching facts',()=>{
 const source={...conflict,conflict_options:{origin:[{value:'Brazil',label:'Selected spec'},{value:'Mexico',label:'Selected SEO'}]}};
 const options=coffeeConflictReviewOptions(source)[0].options;
 assert.deepEqual(options.map(o=>o.source_url),[url,url]);
 assert.deepEqual(options.map(o=>o.label),['Selected spec','Selected SEO']);
});
test('private query arguments are removed from links, conflicts and downloaded review',()=>{
 const input=url+'?access_token=never-export&variant=123456&utm_source=campaign#access_secret';
 const source={ok:true,source_url:input,fields:{name:'Current Lot'},conflicts:['origin'],
  conflict_options:{origin:[{value:'Brazil',label:'Current spec',source_url:input}]},
  source_facts:[{field:'origin',label:'Origin',value:'Brazil',source_url:input,source_type:'html'}]};
 const clean=url+'?variant=123456';
 const group=coffeeConflictReviewOptions(source)[0];
 assert.equal(group.options[0].source_url,clean);
 const html=coffeeUrlPreviewMarkup(source);
 assert.ok(html.includes('href="'+clean+'"'));
 assert.doesNotMatch(html,/never-export|access_secret|utm_source/);
 const saved=coffeeSourceReviewSnapshot(source);
 assert.equal(saved.source_url,clean);
 assert.equal(saved.conflict_options[0].options[0].source_url,clean);
 assert.equal(saved.published_source_information[0].source_url,clean);
 assert.doesNotMatch(JSON.stringify(saved),/never-export|access_secret|utm_source/);
});
test('untrusted off-product and non-HTTPS links never become actionable',()=>{
 const source={ok:true,source_url:url,fields:{},conflicts:['origin'],
  conflict_options:{origin:[{value:'<img src=x onerror=alert(1)>',label:'<script>bad</script>',source_url:'javascript:alert(1)'},
   {value:'Brazil',label:'Other domain',source_url:'https://other.example/products/cross-coffee'}]},
  source_facts:[{field:'origin',label:'Unrelated page',value:'Brazil',source_url:'https://other.example/products/cross-coffee',source_type:'html'}]};
 const options=coffeeConflictReviewOptions(source)[0].options;
 assert.ok(options.every(x=>!x.source_url));
 const html=coffeeUrlPreviewMarkup(source);
 assert.doesNotMatch(html,/<img|<script|javascript:|other\.example/);
 assert.match(html,/&lt;img/);
 assert.equal(coffeeSourceReviewSnapshot({...source,source_url:'https://user:password@roaster.example/products/current-lot'}),null);
 assert.equal(coffeeSourceReviewSnapshot({...source,source_url:'http://roaster.example/products/current-lot'}),null);
});
test('conflicting source values never prefill or replace member entries',()=>{
 const field={value:'My confirmed origin',tagName:'INPUT',dispatchEvent(){}};
 const form={elements:{namedItem(key){return key==='origin'?field:null;}}};
 assert.deepEqual(applyCoffeeUrlFields(form,conflict),{filled:0,skipped:0});
 assert.equal(field.value,'My confirmed origin');
});
