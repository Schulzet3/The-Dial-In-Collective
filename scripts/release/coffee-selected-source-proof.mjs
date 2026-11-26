// Exact, independently reviewed original #3889 coffee source component.
// No live source/queue mutation or readiness/publication authority.
import {createHash} from 'node:crypto';
const verifiedCoffeeProofs=new WeakSet();
function freezeCoffee(value){
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  for(const child of Object.values(value))freezeCoffee(child);Object.freeze(value);
 }
 return value;
}
export const REVIEWED_COFFEE_COMPONENT=freezeCoffee({
  "published": "2d22d448160d428a977f06482323646b92818fcf",
  "baseline": "d9fc859d81a23e10ee2cd0e1a37013b93a4980e5",
  "baseline_queue": "46304f47eb0e78fac8c7845155af86080900b3c4",
  "reference": "947237d17fe3f9d8ee2638c12f9633168e42176f",
  "reference_queue": "af0266a5cb9e56394bf976383adeda9b47653b38",
  "sources": [
    {
      "id": "DIC-Q-33-r311-original63-selected-sourcing-province",
      "merge": "1e326fb0683ee745a76108f38fb3c580141831e9",
      "parent": "db84d03a192da78c1b5ff577ffbdfb400a1ae87a",
      "paths": {
        ".github/workflows/issue33-r311-original63.yml": [
          null,
          "100644:7325da5121afe195dad0b9787ed9198f2c92e0e0"
        ],
        "scripts/audit/issue33-r311-original63-check.mjs": [
          null,
          "100644:23df2a1e9b7ea8d239588103e4edc610adb65866"
        ],
        "src/server/coffee-page-metadata.mjs": [
          "100644:0c317c384406780918612c6c5d58afff24479db6",
          "100644:95e3442af91092390e2d2e6a086a5c8b0c6d2404"
        ],
        "src/server/coffee-selected-published-sourcing-region.mjs": [
          null,
          "100644:5206c073a43fdce048d6b85dcfdd566fbbf43499"
        ],
        "tests/coffee-issue33-r311-original63.test.mjs": [
          null,
          "100644:1fdd17b150dc02430bbf3c3b949738c94977365b"
        ]
      },
      "runs": [
        44419345944,
        44419345886,
        44419345791,
        44419345617
      ]
    },
    {
      "id": "DIC-Q-33-r327-original138-icon-labeled-source",
      "merge": "bc5e03764d37ee97b9e75cb34a2a995a26a57d57",
      "parent": "c646c0c1fdc330cc00a347572181fe3f015ce7f2",
      "paths": {
        ".github/workflows/issue33-r327-original138.yml": [
          null,
          "100644:9e1e18559bfe1f0143e981ccc9c40683821d3c22"
        ],
        "scripts/audit/issue33-r327-original138-check.mjs": [
          null,
          "100644:501803b5587df32039bc5f40eaf2ddca7b96c823"
        ],
        "src/server/coffee-page-metadata.mjs": [
          "100644:05d26d839a1cf04a46fafa4e5ec57f915c4a9fd2",
          "100644:0a56583b970216935dc2031f792ea81808cbaea3"
        ],
        "src/server/coffee-selected-icon-specs.mjs": [
          null,
          "100644:e8943c005181c429eca9a82eae7de6d2d36f1a86"
        ],
        "tests/coffee-issue33-r327-original138.test.mjs": [
          null,
          "100644:abfda824c67e4cc5defc9e01299923f1788f6d75"
        ]
      },
      "runs": [
        44535725044,
        44535729012,
        44535724939,
        44535728531
      ]
    },
    {
      "id": "DIC-Q-33-r342-original249-review-source-roles",
      "merge": "74d0f758e284a2b1909862669900f24ea8fa4f57",
      "parent": "edfda99ed82a56bb1d64597534002de640c2795d",
      "paths": {
        ".github/workflows/issue33-r342-original249-review.yml": [
          null,
          "100644:3f233a6fff494c2e9f1a44e166ed35579b2f9b3c"
        ],
        "scripts/audit/issue33-r342-original249-review-check.mjs": [
          null,
          "100644:dfbca18a6157ef026f1e815ae86487332fdbf810"
        ],
        "src/server/coffee-source-facts.mjs": [
          "100644:1a760a5db212d81e93899c4fedc47320ee949946",
          "100644:3b2a69b6bd8ea10882184ded0ade7481b46de52a"
        ],
        "tests/coffee-issue33-r342-original249-review.test.mjs": [
          null,
          "100644:7bfb95e53b9a9457923df2634ffc6a9ca0904cbc"
        ]
      },
      "runs": [
        44652295060,
        44652295145,
        44652295404,
        44652295243
      ]
    },
    {
      "id": "DIC-Q-33-r352-original298-selected-analogy-and-sensory",
      "merge": "9d13dd2de90f5de4591a250f3ea8c57c0c9a1115",
      "parent": "67cbb36cb1e433675feb5868d617d5af802c869c",
      "paths": {
        ".github/workflows/issue33-r349-original298.yml": [
          null,
          "100644:833f8dfd2cfee926e2853c30e0c9bdaf4696699b"
        ],
        ".github/workflows/issue33-shared-parser-regressions.yml": [
          "100644:4cb69f3cb9767026423c79e3d1915751cbd7a5aa",
          "100644:e976d52a097f2c179e590192114265cb00d91bd3"
        ],
        "scripts/audit/issue33-r349-original298-check.mjs": [
          null,
          "100644:1d20cdf4d5e9d5ec45281c8c4fd2c05b2476280a"
        ],
        "src/server/coffee-flavor-evidence.mjs": [
          "100644:48ae3cc76e45e5324a7a149f59e784ee59ecd25d",
          "100644:4d92c3ac798f4373a74354c1f297c36dd13f8558"
        ],
        "src/server/coffee-page-metadata.mjs": [
          "100644:0a56583b970216935dc2031f792ea81808cbaea3",
          "100644:203d935af543fc6da2aaa4e227b0321cb647d4f2"
        ],
        "tests/coffee-issue33-r349-original298.test.mjs": [
          null,
          "100644:8a43302eeeabe0803162cd9a56d2e725ebd339ad"
        ],
        "tests/coffee-issue33-r352-selected-analogy-tastes.test.mjs": [
          null,
          "100644:aeff67899ebb0c9dd7a83f0e7796b99da7943ed9"
        ],
        "tests/coffee-issue33-shared-ci-trigger.test.mjs": [
          "100644:b59d48ad06f82cb3fb11855c4fd5f47af6ddcb75",
          "100644:d121ded71e1733c351421206b9f5733e1ec392c7"
        ]
      },
      "runs": [
        44734558032,
        44734557910,
        44734561125,
        44734560826
      ]
    },
    {
      "id": "DIC-Q-33-r374-original41-selected-pagefly-sugarcane-method",
      "merge": "84bf75f33918bd1f15f037344aedced15906d6f2",
      "parent": "2a4f8473f21ea57365c72c25fac22aa7336bf9ec",
      "paths": {
        ".github/workflows/issue33-r374-original41.yml": [
          null,
          "100644:c97d6393f478485c59302da6d10ce5ceea08ddce"
        ],
        ".github/workflows/issue33-shared-parser-regressions.yml": [
          "100644:c2f3c0cbcc3c0586f83f26f041e50f0e1856077c",
          "100644:ba789016ab07f0c701c6bb9e10338872d8d96d55"
        ],
        "scripts/audit/issue33-original603-focused-source-review.mjs": [
          "100644:49b50fa3c1a1a07e61943ad98bbb2cc31c119fac",
          "100644:56c5d28a12a2ae00a7ab9941dc7948ec18e2808f"
        ],
        "scripts/audit/issue33-r374-original41-check.mjs": [
          null,
          "100644:a559c28ade3033723f508bf5916d9e596bc058ad"
        ],
        "scripts/audit/issue33-shopify-pagefly-h3.mjs": [
          null,
          "100644:825edd6c8ff2ff73ff65bebbee029924518eca82"
        ],
        "src/server/coffee-decaffeination-method.mjs": [
          "100644:71f36151e92954a869f5e58ca7ae3933a7664c39",
          "100644:7eeea4a9a35cb3f3aca7a6e8f2e0b8595fe2e0dc"
        ],
        "src/server/coffee-direct-product-prose.mjs": [
          "100644:462a7a7f045f534f689cff2836a387fac79472aa",
          "100644:59ad849cf56850850639f68a469c5844e642cef7"
        ],
        "src/server/coffee-pagefly-selected-h3.mjs": [
          null,
          "100644:2ef2f6e659e097001d18c5717264696ad1f29751"
        ],
        "tests/coffee-issue33-r374-original41.test.mjs": [
          null,
          "100644:af76e5cd05e0efcacaa0b3226b077b0e11c990b5"
        ],
        "tests/coffee-issue33-shared-ci-trigger.test.mjs": [
          "100644:243202377546100a7ad28c89e0716f9ec65009c0",
          "100644:f61a25edc3ebbfc4a93721458425800592bfdfea"
        ]
      },
      "runs": [
        44874280318,
        44874280183,
        44874280264,
        44874280314
      ]
    },
    {
      "id": "DIC-Q-33-r380b-original242-woo-conflicting-region",
      "merge": "fea352502587653ae02c99c8a941a76729d60767",
      "parent": "1a36a69add59bc220a94d1e16ffe88081b7ba0e5",
      "paths": {
        "src/server/coffee-page-metadata.mjs": [
          "100644:203d935af543fc6da2aaa4e227b0321cb647d4f2",
          "100644:761e92af185c924b3e4c17cb30ec02eae42c7908"
        ],
        "src/server/coffee-selected-woo-short-origin-conflict.mjs": [
          null,
          "100644:5eddda126a7d09b775a316661e98d58a48d02c30"
        ],
        "tests/coffee-issue33-242-selected-woo-origin-conflict.test.mjs": [
          null,
          "100644:2c88de0388fcd9491fcdbaf70634d69f4af04670"
        ]
      },
      "runs": [
        44899001007,
        44899002278,
        44899001033,
        44899001138
      ]
    },
    {
      "id": "DIC-Q-33-r403-original134-selected-swiss-water-method",
      "merge": "e536ad7b12cb55966e2e1e23ec396d82b1f30f91",
      "parent": "2ef1dd0281be97aa1b067278f52ddc7229cd5196",
      "paths": {
        "src/server/coffee-direct-product-prose.mjs": [
          "100644:0748d9bf284f38f78d1e5cacf95c3233f9215744",
          "100644:2bc22ff9b94f368b81a2a589a89ac145a0b57809"
        ],
        "src/server/coffee-page-metadata.mjs": [
          "100644:761e92af185c924b3e4c17cb30ec02eae42c7908",
          "100644:ff8173ebb3c5a36ed7bb19628e459298c910764d"
        ],
        "src/server/coffee-source-facts.mjs": [
          "100644:3b2a69b6bd8ea10882184ded0ade7481b46de52a",
          "100644:7dd87bf77057f765fec61a20c6b6dcf31c8a9f87"
        ],
        "tests/coffee-issue33-r403-selected-swiss-water-claim.test.mjs": [
          null,
          "100644:2620b36c1fa439880f071795b146a04d9cf54353"
        ]
      },
      "runs": [
        45003858575,
        45003858281,
        45003857100,
        45003857954
      ]
    },
    {
      "id": "DIC-Q-33-r408-original123-producer-farm-roles",
      "merge": "96d8d08ded663012f9a9cfc30b298908b38174ab",
      "parent": "a1b2d2c25dc144f7c6d96d7360cff0e273ef1cd2",
      "paths": {
        ".github/workflows/issue33-r407-original119-123.yml": [
          "100644:491749dd2a478194e1d01e435329753dec5676f8",
          "100644:9d71944d1e8d07a142b547004c7f40793be0292b"
        ],
        "scripts/audit/issue33-r407-original119-123-check.mjs": [
          "100644:f6bc68d5ac8f4fb9603edc2860b019e16b2b9356",
          "100644:1b320d1f673a1439dc0fadc0f37bbf4080504c87"
        ],
        "src/server/coffee-page-metadata.mjs": [
          "100644:ff8173ebb3c5a36ed7bb19628e459298c910764d",
          "100644:29a7eba5e1dfc2e6367b9ffe4c38602ab423573d"
        ],
        "tests/coffee-issue33-r408-producer-farm-caption.test.mjs": [
          null,
          "100644:56715259c6a5e8ed35f93951f28990cac08a2136"
        ]
      },
      "runs": [
        45020841647,
        45020841657,
        45020841681,
        45020842641
      ]
    },
    {
      "id": "DIC-Q-33-r424-kati-selected-h1-free-richtext",
      "merge": "e2e11042c190d6640829f5b6a2a758f5e7645ab0",
      "parent": "7f9f00aba51cbb4016509180add98df58d3e2027",
      "paths": {
        ".github/workflows/issue33-r424-kati173-174.yml": [
          null,
          "100644:4e690437e27e3e3ae16a5546e5131b669fbc86dd"
        ],
        "scripts/audit/issue33-original603-focused-source-review.mjs": [
          "100644:cda89ef1d7fd5bacfde1300c59733d330b8d6819",
          "100644:1cfb8ad340e7095ee3550e0c9fefbaa36e53d7f0"
        ],
        "scripts/audit/issue33-r424-kati173-174-check.mjs": [
          null,
          "100644:2b9181303a15771014a9e3e1bec88929c3fc9e8c"
        ],
        "src/server/coffee-page-metadata.mjs": [
          "100644:29a7eba5e1dfc2e6367b9ffe4c38602ab423573d",
          "100644:491b42d8db03439ac3f9d61271b3eb542088618d"
        ],
        "src/server/coffee-selected-shopify-variant-richtext.mjs": [
          null,
          "100644:e2e00fe1afee5c02a1b6c3fdc98274795e0bcdfd"
        ],
        "tests/issue33-r424-kati173-174.test.mjs": [
          null,
          "100644:8bb0a444d4750f21899b815690f005bf3117e1cc"
        ]
      },
      "runs": [
        45110856925,
        45110855352,
        45110855547,
        45110857171
      ]
    }
  ],
  "runtime_results": {
    "src/server/coffee-page-metadata.mjs": "100644:cdf1b661ad1176bf95e182133190bf9a5a7858cc",
    "src/server/coffee-selected-published-sourcing-region.mjs": "100644:5206c073a43fdce048d6b85dcfdd566fbbf43499",
    "src/server/coffee-selected-icon-specs.mjs": "100644:e8943c005181c429eca9a82eae7de6d2d36f1a86",
    "src/server/coffee-source-facts.mjs": "100644:7dd87bf77057f765fec61a20c6b6dcf31c8a9f87",
    "src/server/coffee-flavor-evidence.mjs": "100644:4d92c3ac798f4373a74354c1f297c36dd13f8558",
    "src/server/coffee-decaffeination-method.mjs": "100644:7eeea4a9a35cb3f3aca7a6e8f2e0b8595fe2e0dc",
    "src/server/coffee-direct-product-prose.mjs": "100644:94a397062e8c72bf451cf772dc7bb4ae6d1adfad",
    "src/server/coffee-pagefly-selected-h3.mjs": "100644:2ef2f6e659e097001d18c5717264696ad1f29751",
    "src/server/coffee-selected-woo-short-origin-conflict.mjs": "100644:5eddda126a7d09b775a316661e98d58a48d02c30",
    "src/server/coffee-selected-shopify-variant-richtext.mjs": "100644:e2e00fe1afee5c02a1b6c3fdc98274795e0bcdfd"
  },
  "r374_correction": {
    "merge": "acf394919bf577c264deaa4d5810b18e02062899",
    "parent": "0e377d1037d22518e7f42bc3935cb1c2d76f000b",
    "paths": {
      "scripts/audit/issue33-r374-original41-check.mjs": [
        "100644:a559c28ade3033723f508bf5916d9e596bc058ad",
        "100644:6b47cfa4736189d91df71ed6867f9455065ce4b3"
      ],
      "tests/coffee-issue33-r374-original41.test.mjs": [
        "100644:af76e5cd05e0efcacaa0b3226b077b0e11c990b5",
        "100644:c1ba8d832cce68fc36b5ce127bc23ed0465b4bd0"
      ]
    }
  },
  "r408_relocation": {
    "kind": "DIC-3889-R408-EXACT-ADDITIONS-RELOCATION-1",
    "merge": "96d8d08ded663012f9a9cfc30b298908b38174ab",
    "parent": "a1b2d2c25dc144f7c6d96d7360cff0e273ef1cd2",
    "path": "src/server/coffee-page-metadata.mjs",
    "original_parent_blob": "ff8173ebb3c5a36ed7bb19628e459298c910764d",
    "original_merge_blob": "29a7eba5e1dfc2e6367b9ffe4c38602ab423573d",
    "selected_eight_blob": "b1f2bd40c8ced51b155b3486ba010b33d0c5e4f4",
    "selected_nine_blob": "cdf1b661ad1176bf95e182133190bf9a5a7858cc",
    "hunks": [
      {
        "hunk": 1,
        "inserted_lines": 28,
        "side": "before_exact_following_published_anchor",
        "anchor": "// Best-effort facts from arbitrary PUBLIC coffee pages. This is NOT official\n// roaster verification and never promotes a canonical record.\nimport {extractRoastVisualEvidence,normalizeRoastLabel,roastLabelHint} from './roast-level-evidence.mjs';\n",
        "insertion": "// A chosen current Producer caption can contain a human farmer and a distinct\n// named farm. Separate roles only with independently supported selected prose.\n// The complete published caption remains unchanged in the source-review facts.\nexport function selectedLabeledPersonFarmRoles({publishedProducer,sourceFacts,selectedProse,existingFarm}={}){\n const literal=String(publishedProducer||'').trim();\n const match=/^(.{6,110}?):\\s*((?:Fazenda|Finca|Hacienda)\\s+[\\p{Lu}][\\p{L}\\p{M}0-9'\u2019.-]{1,45}(?:\\s+[\\p{L}\\p{M}0-9'\u2019.-]{1,45}){0,5})$/u.exec(literal);\n if(!match)return null;\n const person=match[1].trim(),farm=match[2].trim();\n if(!/^[\\p{Lu}][\\p{L}\\p{M}'\u2019-]{1,39}(?:\\s+(?:[\\p{Lu}][\\p{L}\\p{M}'\u2019-]{1,39}|de|da|do|dos|das|del|van|von)){1,5}$/u.test(person)||\n    /\\b(?:coffee|company|export|trading|group|coop|cooperative|station|estate|farm|finca|fazenda|hacienda|roaster)\\b/iu.test(person))return null;\n const key=s=>String(s||'').normalize('NFKD').replace(/\\p{M}/gu,'').toLowerCase().replace(/\\s+/gu,' ').trim();\n if(existingFarm&&key(existingFarm)!==key(farm))return null;\n const direct=Array.isArray(sourceFacts)&&sourceFacts.some(f=>f.field==='producer'&&\n   /^\\s*producer\\s*:?\\s*$/iu.test(String(f.label||''))&&\n   f.source_type==='html'&&f.conflicting!==true&&\n   String(f.section||'')!=='Different coffee in the source'&&key(f.value)===key(literal));\n if(!direct||!Array.isArray(selectedProse))return null;\n const selectedGrowingCredit=selectedProse.some(b=>{\n  if(b.educational||typeof b.text!=='string'||b.text.length>2500||\n     /^\\s*producer\\s*[:\uff1a]/iu.test(b.text))return false;\n  const normalized=key(b.text),at=normalized.indexOf(key(person));\n  if(at<0)return false;\n  const near=normalized.slice(Math.max(0,at-120),at+key(person).length+210);\n  return /\\b(?:coffee\\s+from|coffee\\s+farmers?|farmers?|family\\s+farm|growers?|grows?|grown|cultivat\\w*|harvest\\w*)\\b/iu.test(near);\n });\n return selectedGrowingCredit?{producer:person,farm,literal}:null;\n}\n\n",
        "anchor_occurrences": 1
      },
      {
        "hunk": 2,
        "inserted_lines": 12,
        "side": "after_exact_preceding_published_anchor",
        "anchor": " // count after primary Farm normalization. Respect the published label at\n // FINAL field reconciliation, without suppressing independently labelled\n // Producer collectives or qualified anonymous-growing-group prose.\n const countedSupplier=/^\\d{1,3}(?:,?\\d{3})?\\s+(?:(?:small[ -]?holder|small|family|local|independent|regional)\\s+){0,3}(?:farms?|farmers?|growers?|families|producers?|cooperatives?)$/iu;\n if(fields.producer&&countedSupplier.test(fields.producer)){\n  const same=value=>keyOf(String(value||''))===keyOf(fields.producer);\n  const printedFarm=source_facts.some(f=>\n    f.section!=='Different coffee in the source'&&\n    /^(?:farm|farms|finca)$/i.test(String(f.label||'').trim())&&same(f.value))||\n    productCoffeeProse(canonicalProduct,clean).some(b=>\n     /^farm\\s*[:\uff1a]/i.test(b.text)&&same(b.text.replace(/^farm\\s*[:\uff1a]\\s*/i,'')));\n  const printedProducer=source_facts.some(f=>\n    f.section!=='Different coffee in the source'&&\n    /^(?:producers?|growers?)$/i.test(String(f.label||'').trim())&&same(f.value));\n  if(printedFarm&&!printedProducer){\n   rememberCoffeeReviewCandidate(fields,'producer',fields.producer,\n    'Count-only selected Farm caption; named supplier not published');\n   delete fields.producer;\n  }\n }\n",
        "insertion": " // Direct selected Producer: PERSON: FARM is two roles only if a separate\n // selected own-coffee growing description corroborates the named person.\n const personFarm=!conflicts.has('producer')&&fields.producer\n  ?selectedLabeledPersonFarmRoles({publishedProducer:fields.producer,\n    sourceFacts:source_facts,selectedProse:productCoffeeProse(canonicalProduct,clean),\n    existingFarm:roaster_details.farm}):null;\n if(personFarm){\n  fields.producer=personFarm.producer;\n  if(!roaster_details.farm)roaster_details.farm=personFarm.farm;\n  if(keyOf(roaster_details.named_producer||'')===keyOf(personFarm.literal))\n   roaster_details.named_producer=personFarm.producer;\n }\n",
        "anchor_occurrences": 1
      }
    ],
    "excluded_context_sources": [
      "c9b1bf2a1cecce9a67c84983eb1fd8d379f2d5f2",
      "c1dfa5abc5433d5413b62610089dc98b6cba5b3e"
    ],
    "source_changes": "Two complete original insertion blocks only, no added/removed/reworded runtime statement beyond the selected original patch."
  }
});

const COFFEE_QUEUE='docs/RELEASE_QUEUE.json';
const COFFEE_TRIGGER_TEST='tests/coffee-issue33-shared-ci-trigger.test.mjs';
const coffeeSame=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const coffeeSorted=a=>[...a].sort();
const coffeeObject=text=>{
 const b=Buffer.from(text,'utf8');
 return '100644:'+createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
};
export const REVIEWED_COFFEE_IDS=Object.freeze(REVIEWED_COFFEE_COMPONENT.sources.map(x=>x.id).sort());

// Apply a complete, byte-bound historical diff with exact full hunk context.
// Insertion relocation, fuzz, deleted context and partial hunks are not supported.
export function replayCoffeeSelectedPatch({path,before,after,selected,patch,beforeObject,afterObject}){
 const fail=why=>{throw Error('COFFEE_SELECTED_SOURCE_HOLD: '+path+' '+why);};
 const toLines=t=>{
  if(typeof t!=='string'||!t.endsWith('\n')||/[\r\u0000\ufffd]/.test(t))fail('non-exact LF text');
  return t.slice(0,-1).split('\n');
 };
 if(coffeeObject(before)!==beforeObject||coffeeObject(after)!==afterObject)fail('text/object mismatch');
 const original=toLines(before),expected=toLines(after),target=toLines(selected),diff=toLines(patch);
 if(!coffeeSame(diff.slice(0,4),['diff --git a/'+path+' b/'+path,
  'index '+beforeObject.slice(7)+'..'+afterObject.slice(7)+' 100644','--- a/'+path,'+++ b/'+path]))
  fail('unbound patch header');
 const historical=original.slice();let offset=0,oldEnd=0,targetEnd=0,n=4,count=0;
 const matches=(a,i,b)=>i>=0&&i+b.length<=a.length&&b.every((x,j)=>a[i+j]===x);
 while(n<diff.length){
  const h=/^@@ -([0-9]+)(?:,([0-9]+))? \+([0-9]+)(?:,([0-9]+))? @@(?: .*)?$/.exec(diff[n++]);
  if(!h)fail('invalid hunk header');
  const pos=Number(h[1])-1,aCount=Number(h[2]??1),bPos=Number(h[3])-1,bCount=Number(h[4]??1);
  const a=[],b=[];let context=0,changes=0;
  while(n<diff.length&&!diff[n].startsWith('@@ ')){
   const type=diff[n][0],text=diff[n++].slice(1);
   if(type===' '){a.push(text);b.push(text);context++;}
   else if(type==='+'){b.push(text);changes++;}
   else if(type==='-'){a.push(text);changes++;}
   else fail('unsupported or truncated hunk');
  }
  if(pos<oldEnd||bPos!==pos+offset||!aCount||!bCount||!context||!changes||a.length!==aCount||b.length!==bCount||
   !matches(original,pos,a)||!matches(historical,pos+offset,a))fail('historical preimage/count mismatch');
  historical.splice(pos+offset,a.length,...b);offset+=b.length-a.length;oldEnd=pos+a.length;
  const locations=[];for(let i=0;i<=target.length-a.length;i++)if(matches(target,i,a))locations.push(i);
  if(locations.length!==1||locations[0]<targetEnd)fail('missing/ambiguous selected full context');
  target.splice(locations[0],a.length,...b);targetEnd=locations[0]+b.length;count++;
 }
 if(!count||!coffeeSame(historical,expected))fail('historical postimage mismatch');
 return target.join('\n')+'\n';
}

// One reviewed historical delta has two insertion-only blocks whose original
// surrounding code belongs to excluded items. Reuse every original added byte
// at independently pinned published anchors; never make generic replay fuzzy.
export function relocateCoffeeReviewedAdditions(spec,{before,after,selected,published,patch}){
 const fail=why=>{throw Error('COFFEE_SELECTED_SOURCE_HOLD: reviewed relocation '+why);};
 const {path}=spec;
 if(coffeeObject(before)!=='100644:'+spec.original_parent_blob||
  coffeeObject(after)!=='100644:'+spec.original_merge_blob||
  coffeeObject(selected)!=='100644:'+spec.selected_eight_blob)fail('source or selected preimage mismatch');
 if(replayCoffeeSelectedPatch({path,before,after,selected:before,patch,
  beforeObject:'100644:'+spec.original_parent_blob,afterObject:'100644:'+spec.original_merge_blob})!==after)
  fail('original complete patch mismatch');
 const parts=patch.split(/^@@ .*@@.*\n/m).slice(1);
 if(parts.length!==2||spec.hunks?.length!==2)fail('exact two original insertion blocks required');
 const count=(hay,needle)=>hay.split(needle).length-1;
 let current=selected;
 for(let i=0;i<2;i++){
  const h=spec.hunks[i],lines=parts[i].slice(0,-1).split('\n');
  if(lines.some(l=>!l.startsWith(' ')&&!l.startsWith('+')))fail('non-addition original delta');
  const additions=lines.flatMap((l,n)=>l.startsWith('+')?[n]:[]);
  if(!additions.length||additions.some((n,j)=>n!==additions[0]+j))fail('noncontiguous original insertion');
  const insertion=additions.map(n=>lines[n].slice(1)).join('\n')+'\n';
  if(insertion!==h.insertion||additions.length!==h.inserted_lines||h.hunk!==i+1)fail('original insertion bytes mismatch');
  if(typeof h.anchor!=='string'||!h.anchor.endsWith('\n')||count(published,h.anchor)!==1||count(current,h.anchor)!==1||
   count(current,insertion)!==0)fail('missing or ambiguous published anchor/duplicate insertion');
  const side=i===0?'before_exact_following_published_anchor':'after_exact_preceding_published_anchor';
  if(h.side!==side)fail('unreviewed insertion position');
  const at=current.indexOf(h.anchor)+(i===0?0:h.anchor.length);
  current=current.slice(0,at)+insertion+current.slice(at);
 }
 if(coffeeObject(current)!=='100644:'+spec.selected_nine_blob)fail('reconstructed output mismatch');
 return current;
}

// This exported engine permits small adversarial unit fixtures. The application
// entry point below always supplies the immutable reviewed registry above.
export function reconstructCoffeeSelectedObjects(spec,{developmentSourceSha,sourceObjectAt,sourceTextAt,
 firstParentChangedPaths,firstParentPatch,readParents,isAncestor}={}){
 const fail=why=>{throw Error('COFFEE_SELECTED_SOURCE_HOLD: '+why);};
 if(!/^[a-f0-9]{40}$/.test(developmentSourceSha||'')||
  [sourceObjectAt,sourceTextAt,firstParentChangedPaths,firstParentPatch,readParents,isAncestor].some(x=>typeof x!=='function'))
  fail('exact Git readers/source required');
 const text=(ref,path,expected=sourceObjectAt(ref,path))=>{
  if(!/^100644:[a-f0-9]{40}$/.test(expected||''))fail('missing regular object '+path);
  const raw=sourceTextAt(ref,path);
  if(typeof raw!=='string'||coffeeObject(raw)!==expected)fail('immutable text hash mismatch '+path);
  return raw;
 };
 const all=new Map(),runtime=new Map(),workflow=new Set(),metadataOnly=new Set();
 for(const source of spec.sources){
  if(!coffeeSame(readParents(source.merge),[source.parent])||isAncestor(source.merge,developmentSourceSha)!==true)
   fail('source parent/ancestry mismatch '+source.id);
  const paths=coffeeSorted(Object.keys(source.paths));
  if(!coffeeSame(coffeeSorted(firstParentChangedPaths(source.merge).filter(p=>!p.startsWith('docs/'))),paths))
   fail('complete first-parent inventory mismatch '+source.id);
  for(const path of paths){
   const [before,after]=source.paths[path];
   if(sourceObjectAt(source.parent,path)!==before||sourceObjectAt(source.merge,path)!==after||before===after)
    fail('actual first-parent blob mismatch '+path);
   if(sourceObjectAt(developmentSourceSha,path)!==sourceObjectAt(spec.reference,path))
    fail('unreviewed later development drift '+path);
   const entries=all.get(path)||[];entries.push(source);all.set(path,entries);
   if(path.startsWith('.github/workflows/')){workflow.add(path);continue;}
   if(path===COFFEE_TRIGGER_TEST){metadataOnly.add(path);continue;}
   const afterText=text(source.merge,path,after);
   if(!path.startsWith('src/server/'))continue;
   if(source.merge===spec.r408_relocation?.merge&&path===spec.r408_relocation.path)continue;
   let current=runtime.has(path)?runtime.get(path):
    sourceObjectAt(spec.published,path)===null?null:text(spec.published,path);
   if(before===null){
    if(current!==null)fail('new selected source already exists '+path);
    current=afterText;
   }else current=replayCoffeeSelectedPatch({path,before:text(source.parent,path,before),after:afterText,
    selected:current,patch:firstParentPatch(source.merge,path),beforeObject:before,afterObject:after});
   runtime.set(path,current);
  }
 }
 if(spec.r408_relocation){
  const r=spec.r408_relocation;
  if(!spec.sources.some(s=>s.merge===r.merge&&s.parent===r.parent&&
   coffeeSame(s.paths[r.path],['100644:'+r.original_parent_blob,'100644:'+r.original_merge_blob])))
   fail('relocation original ownership absent');
  runtime.set(r.path,relocateCoffeeReviewedAdditions(r,{before:text(r.parent,r.path),after:text(r.merge,r.path),
   selected:runtime.get(r.path),published:text(spec.published,r.path),patch:firstParentPatch(r.merge,r.path)}));
 }
 const objects={},texts={};
 for(const [path,current] of runtime){
  const hash=coffeeObject(current);
  if(hash!==spec.runtime_results[path])fail('selected-only final object mismatch '+path);
  objects[path]=hash;texts[path]=current;
 }
 if(!coffeeSame(coffeeSorted(Object.keys(spec.runtime_results)),coffeeSorted([...runtime.keys()])))
  fail('runtime proof path inventory mismatch');
 const amended=new Map();
 if(spec.r374_correction){
  const c=spec.r374_correction;
  if(!coffeeSame(readParents(c.merge),[c.parent])||isAncestor(c.merge,developmentSourceSha)!==true||
    !coffeeSame(coffeeSorted(firstParentChangedPaths(c.merge).filter(p=>!p.startsWith('docs/'))),coffeeSorted(Object.keys(c.paths))))
   fail('reviewed QA correction parent/inventory mismatch');
  for(const [path,[before,after]] of Object.entries(c.paths)){
   const owners=all.get(path);
   if(!owners?.length||owners.at(-1).paths[path][1]!==before||sourceObjectAt(c.parent,path)!==before||
    sourceObjectAt(c.merge,path)!==after||sourceObjectAt(developmentSourceSha,path)!==after)
    fail('reviewed QA correction source mismatch '+path);
   amended.set(path,{object:after,text:text(c.merge,path,after)});
  }
 }
 for(const [path,sources] of all){
  if(runtime.has(path))continue;
  const published=sourceObjectAt(spec.published,path);
  if(workflow.has(path)||metadataOnly.has(path)){
   if(published!==null)fail('reviewed workflow/metadata-only exclusion no longer absent in published source '+path);
   objects[path]=null;continue;
  }
  if(amended.has(path)){
   objects[path]=amended.get(path).object;texts[path]=amended.get(path).text;continue;
  }
  // Earlier selected audit support was already included at these exact bytes
  // in the published source. Keep those bytes; never absorb later live drift.
  if(path.startsWith('scripts/audit/')&&published!==null&&sources.some(s=>s.paths[path][1]===published)){
   objects[path]=published;texts[path]=text(spec.published,path,published);continue;
  }
  const final=sources.at(-1).paths[path][1];
  if(sources.length!==1||sourceObjectAt(developmentSourceSha,path)!==final||published!==null)
   fail('unproved selected QA chronology '+path);
  objects[path]=final;texts[path]=text(sources[0].merge,path,final);
 }
 return {objects,texts,runtimeObjects:Object.fromEntries([...runtime].map(([p,t])=>[p,coffeeObject(t)])),
  protectedPaths:coffeeSorted([...all.keys()]),workflowPaths:coffeeSorted([...workflow]),
  metadataOnlyPaths:coffeeSorted([...metadataOnly])};
}

export function proveCoffeeSelectedSource({selectedIds,liveQueue,...readers}={}){
 const wanted=new Set(selectedIds||[]),s=REVIEWED_COFFEE_COMPONENT;
 if(!REVIEWED_COFFEE_IDS.some(id=>wanted.has(id)))return null;
 const fail=why=>{throw Error('COFFEE_SELECTED_SOURCE_HOLD: '+why);};
 if(!REVIEWED_COFFEE_IDS.every(id=>wanted.has(id)))fail('partial reviewed shared component selection');
 const readQueue=(ref,blob)=>{
  if(readers.sourceObjectAt(ref,COFFEE_QUEUE)!=='100644:'+blob)fail('frozen queue object mismatch');
  const raw=readers.sourceTextAt(ref,COFFEE_QUEUE);
  if(coffeeObject(raw)!=='100644:'+blob)fail('frozen queue text mismatch');
  return JSON.parse(raw);
 };
 const original=readQueue(s.baseline,s.baseline_queue),reference=readQueue(s.reference,s.reference_queue);
 if(original.items.filter(x=>x.state==='TESTING').length!==63||liveQueue?.published_base?.tested_source_sha!==s.published||
  !coffeeSame(original.published_base,liveQueue.published_base)||!coffeeSame(reference.published_base,liveQueue.published_base))
  fail('immutable cohort or published base mismatch');
 const reconciledQueue=structuredClone(liveQueue);
 for(const entry of s.sources){
  const originalRows=original.items.filter(x=>x.id===entry.id),referenceRows=reference.items.filter(x=>x.id===entry.id);
  const liveRows=liveQueue.items.filter(x=>x.id===entry.id);
  if(originalRows.length!==1||originalRows[0].state!=='TESTING'||referenceRows.length!==1||liveRows.length!==1||
   !coffeeSame(liveRows[0],referenceRows[0])||liveRows[0].state!=='TESTING'||liveRows[0].merged_source_sha!==entry.merge)
   fail('reviewed selected row/source changed '+entry.id);
  const row=reconciledQueue.items.find(x=>x.id===entry.id);
  const originalRuntime=coffeeSorted(Object.keys(entry.paths).filter(p=>p.startsWith('src/server/')));
  if(entry.id!=='DIC-Q-33-r424-kati-selected-h1-free-richtext'&&!coffeeSame(coffeeSorted(row.scope_paths),originalRuntime))
   fail('runtime ownership mismatch '+entry.id);
  row.scope_paths=originalRuntime;
  row.ci_runs=[...entry.runs];
  row.tests.push('Independent #3889 exact merged-source native approval/validate/cloud/mobile and selected official afterproof verified. Historical failed/prechange receipts remain in prior tests and frozen queue '+s.reference_queue+'. Candidate source is independently reconstructed from the selected actual first-parent deltas; five exact candidate SUCCESS checks remain mandatory.');
 }
 const source=reconstructCoffeeSelectedObjects(s,readers);
 const receipt={kind:'DIC-REVIEWED-COFFEE-SOURCE-COMPONENT-3889-V1',published_source_sha:s.published,
  reference_source_sha:s.reference,reference_queue_blob:s.reference_queue,development_source_sha:readers.developmentSourceSha,
  selected_ids:REVIEWED_COFFEE_IDS,source_merges:s.sources.map(x=>({id:x.id,merge:x.merge,parent:x.parent,paths:x.paths})),
  reviewed_relocations:s.r408_relocation?[s.r408_relocation]:[],
  reconstructed_objects:source.objects,publication_authorized:false,ready_certified:false};
 receipt.identity_sha256=createHash('sha256').update(JSON.stringify(receipt)).digest('hex');
 const proof=freezeCoffee({...source,ids:REVIEWED_COFFEE_IDS,reconciledQueue,receipt,
  originalRows:liveQueue.items.filter(x=>REVIEWED_COFFEE_IDS.includes(x.id)).map(x=>structuredClone(x))});
 verifiedCoffeeProofs.add(proof);
 return proof;
}

// Only an in-process independently recomputed proof can affect staging; a
// receipt deserialized from a manifest has no such authority.
export function checkedCoffeeSourceProof(proof,{developmentSourceSha,publishedSourceSha,selectedIds}={}){
 const fail=()=>{throw Error('COFFEE_SELECTED_SOURCE_HOLD: exact recomputed source proof required');};
 if(!proof){if(REVIEWED_COFFEE_IDS.some(id=>selectedIds?.includes(id)))fail();return null;}
 if(!verifiedCoffeeProofs.has(proof)||proof.receipt.development_source_sha!==developmentSourceSha||
  proof.receipt.published_source_sha!==publishedSourceSha||!proof.ids.every(id=>selectedIds?.includes(id)))fail();
 return proof;
}

export function applyCoffeeReviewedQueueDelta(queue,proof){
 if(!verifiedCoffeeProofs.has(proof))throw Error('COFFEE_SELECTED_SOURCE_HOLD: unverified queue correction');
 const next=structuredClone(queue);
 for(const id of proof.ids){
  const rows=next.items.filter(x=>x.id===id),original=proof.originalRows.find(x=>x.id===id);
  if(rows.length!==1||!coffeeSame(rows[0],original))throw Error('COFFEE_SELECTED_SOURCE_HOLD: queue correction source mismatch '+id);
  next.items[next.items.indexOf(rows[0])]=structuredClone(proof.reconciledQueue.items.find(x=>x.id===id));
 }
 return next;
}

export function assertCoffeeSelectedCandidate(proof,{candidateSha,sourceObjectAt}={}){
 if(!proof)return false;
 if(!/^[a-f0-9]{40}$/.test(candidateSha||'')||typeof sourceObjectAt!=='function')
  throw Error('COFFEE_SELECTED_SOURCE_HOLD: candidate reader missing');
 for(const [path,object] of Object.entries(proof.objects))
  if(sourceObjectAt(candidateSha,path)!==object)
   throw Error('COFFEE_SELECTED_SOURCE_HOLD: candidate byte/absence mismatch '+path);
 return true;
}
