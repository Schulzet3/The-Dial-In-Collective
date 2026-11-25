// Shared exact reviewed QA registry; no Git writes or publication authority.
// #3889 arbitrary-cohort compatibility. Preserve the original READY1/READY2
// proof exactly, and only use the new merged support after independent
// prospective-plan replay. Never use an untrusted manifest to select QA paths.
const GENERAL_BATCH_QA_FIX='b58c1a4c856fc65a56bf27b2a0ded20245f6351b';
export const GENERAL_BATCH_PRIOR='0317f0ac5b627dff27180acfcb9c014a4c1ef0e5';
const GENERAL_BATCH_SUPPORT=[
 ['tests/helpers/release-published-restoration.mjs','7a13c4b9a76a9fb03a491d33e559fc4cd9709e1c','8ba8fd6f41cb5193a892868efd0c87840af24d90'],
 ['tests/preflight-contract.test.mjs','77f41ca1c434271a1100dfc3e27fa18ef110800d','f2aab94820d72d5c9f51cefa46137d5593b3a276'],
 ['tests/required-check-workflows.test.mjs','50d74fa8ef9e39043b11c467a519aa8a70573835','50d74fa8ef9e39043b11c467a519aa8a70573835']
];
// #3936: the new exact merged QA repair is a separate reviewed generation.
// Keep the previous generation verifiable for immutable READY8 evidence; reject
// mixed/unknown generations instead of accepting arbitrary current QA bytes.
const GENERAL_BATCH_QA_FIX_V2='85ece2e2b4e38b3445e5125045748dd212e421d4';
const GENERAL_BATCH_SUPPORT_V2=[
 ['tests/helpers/release-published-restoration.mjs','241d2013e3a0c6473e68c7c738592d71428b6f0a','7a13c4b9a76a9fb03a491d33e559fc4cd9709e1c'],
 ['tests/preflight-contract.test.mjs','5317e8d96e14a4d1fc4e7b668f13c342f9cb335d','77f41ca1c434271a1100dfc3e27fa18ef110800d'],
 ['tests/required-check-workflows.test.mjs','50d74fa8ef9e39043b11c467a519aa8a70573835','50d74fa8ef9e39043b11c467a519aa8a70573835']
];
// #3940 independently verified selected-only first-parent QA, exact merged bytes.
// Historical generations remain independently verifiable; mixed support HOLDS.
const GENERAL_BATCH_QA_FIX_V3='c4b3f2c10d54a4790cc0cd0b2b3b190dc46e501a';
const GENERAL_BATCH_SUPPORT_V3=[
 ['tests/helpers/release-published-restoration.mjs','cdfe549202ef91d917476968de3567a66c6113c2','241d2013e3a0c6473e68c7c738592d71428b6f0a'],
 ['tests/preflight-contract.test.mjs','13f7b9da15639ce131ce82ef7a6e7e9ea2d26baf','5317e8d96e14a4d1fc4e7b668f13c342f9cb335d'],
 ['tests/required-check-workflows.test.mjs','50d74fa8ef9e39043b11c467a519aa8a70573835','50d74fa8ef9e39043b11c467a519aa8a70573835']
];
// #3942 exact selected-test and direct-child independent QA.
const GENERAL_BATCH_QA_FIX_V4='22254f501af8c0d5f6f89763ea5387b755fdd0bf';
const GENERAL_BATCH_SUPPORT_V4=[
 ['tests/helpers/release-published-restoration.mjs','61a2010c1726b5c719eebf3afe933194ee8bed10','cdfe549202ef91d917476968de3567a66c6113c2'],
 ['tests/preflight-contract.test.mjs','76904dbfe1e57df278601c4bf846f2f02a69a754','13f7b9da15639ce131ce82ef7a6e7e9ea2d26baf'],
 ['tests/required-check-workflows.test.mjs','50d74fa8ef9e39043b11c467a519aa8a70573835','50d74fa8ef9e39043b11c467a519aa8a70573835']
];
// #3947 independently reviewed R405 published test guard.
const GENERAL_BATCH_QA_FIX_V5='542949c23fbbf481de00acdbd77e6c926ebde879';
const GENERAL_BATCH_SUPPORT_V5=[
 ['tests/helpers/release-published-restoration.mjs','04f6010a7c2ca781b3e9c0eca3bf18d83e623826','61a2010c1726b5c719eebf3afe933194ee8bed10'],
 ['tests/preflight-contract.test.mjs','24518329594e4937675c4c30a0d82c73e2882215','76904dbfe1e57df278601c4bf846f2f02a69a754'],
 ['tests/required-check-workflows.test.mjs','50d74fa8ef9e39043b11c467a519aa8a70573835','50d74fa8ef9e39043b11c467a519aa8a70573835']
];
// #3949 reviewed exact shared SQL support and published amended fixture.
const GENERAL_BATCH_QA_FIX_V6='09c45de5063e1d743ce497aea2557974c86f52ca';
const GENERAL_BATCH_SUPPORT_V6=[
 ['tests/helpers/release-published-restoration.mjs','03ea670669ec6ebd14c23106d55c33aea56d5220','04f6010a7c2ca781b3e9c0eca3bf18d83e623826'],
 ['tests/preflight-contract.test.mjs','dc947f96e3d3f7efd7f74f8709db5b988791bb71','24518329594e4937675c4c30a0d82c73e2882215'],
 ['tests/required-check-workflows.test.mjs','50d74fa8ef9e39043b11c467a519aa8a70573835','50d74fa8ef9e39043b11c467a519aa8a70573835']
];
// #3960: independently tested recommendation-context direct-child correction.
const GENERAL_BATCH_QA_FIX_V7='37d5dae3002490d71580dc5cfa26ff8e4622daf3';
const GENERAL_BATCH_SUPPORT_V7=[
 ['tests/helpers/release-published-restoration.mjs','fce0d1efadd78d3dceb453c0a70f385c600bcc43','03ea670669ec6ebd14c23106d55c33aea56d5220'],
 ['tests/preflight-contract.test.mjs','dc947f96e3d3f7efd7f74f8709db5b988791bb71','dc947f96e3d3f7efd7f74f8709db5b988791bb71'],
 ['tests/required-check-workflows.test.mjs','50d74fa8ef9e39043b11c467a519aa8a70573835','50d74fa8ef9e39043b11c467a519aa8a70573835'],
 ['tests/issue3889-context-amendment.test.mjs','4828fc6099dbbbe9a751182aa9c62ca411d91725',null]
];
// #3968: independent two-original-merge stale-family source/fixture proof.
const GENERAL_BATCH_QA_FIX_V8='3661913e21808ebb4205e8c804c2bb231b2ad41a';
const GENERAL_BATCH_SUPPORT_V8=[
 ['tests/helpers/release-published-restoration.mjs','1a46bc915f7e9b544e21f53cb5f5da6f6402774a','fce0d1efadd78d3dceb453c0a70f385c600bcc43'],
 ['tests/preflight-contract.test.mjs','dcaacd46244189696e9b5ba04b418d13ae63070f','dc947f96e3d3f7efd7f74f8709db5b988791bb71'],
 ['tests/required-check-workflows.test.mjs','50d74fa8ef9e39043b11c467a519aa8a70573835','50d74fa8ef9e39043b11c467a519aa8a70573835'],
 ['tests/issue3889-context-amendment.test.mjs','4828fc6099dbbbe9a751182aa9c62ca411d91725','4828fc6099dbbbe9a751182aa9c62ca411d91725']
];
export function generalBatchQaGeneration(developmentSourceSha,sourceObjectAt){
 const generations=[
  {fix:GENERAL_BATCH_QA_FIX_V8,prior:GENERAL_BATCH_QA_FIX_V7,support:GENERAL_BATCH_SUPPORT_V8},
  {fix:GENERAL_BATCH_QA_FIX_V7,prior:GENERAL_BATCH_QA_FIX_V6,support:GENERAL_BATCH_SUPPORT_V7},
  {fix:GENERAL_BATCH_QA_FIX_V6,prior:GENERAL_BATCH_QA_FIX_V5,support:GENERAL_BATCH_SUPPORT_V6},
  {fix:GENERAL_BATCH_QA_FIX_V5,prior:GENERAL_BATCH_QA_FIX_V4,support:GENERAL_BATCH_SUPPORT_V5},
  {fix:GENERAL_BATCH_QA_FIX_V4,prior:GENERAL_BATCH_QA_FIX_V3,support:GENERAL_BATCH_SUPPORT_V4},
  {fix:GENERAL_BATCH_QA_FIX_V3,prior:GENERAL_BATCH_QA_FIX_V2,support:GENERAL_BATCH_SUPPORT_V3},
  {fix:GENERAL_BATCH_QA_FIX_V2,prior:GENERAL_BATCH_QA_FIX,support:GENERAL_BATCH_SUPPORT_V2},
  {fix:GENERAL_BATCH_QA_FIX,prior:GENERAL_BATCH_PRIOR,support:GENERAL_BATCH_SUPPORT}
 ];
 const matched=generations.filter(g=>g.support.every(([path,blob,prior])=>
  sourceObjectAt(developmentSourceSha,path)==='100644:'+blob&&
  sourceObjectAt(g.fix,path)==='100644:'+blob&&
  sourceObjectAt(g.prior,path)===(prior===null?null:'100644:'+prior)));
 if(matched.length!==1)throw Error('Prospective generalized batch QA restoration HOLD: exact reviewed QA generation missing or mixed');
 return matched[0];
}
