// ESLint is installed only on a disposable GitHub Actions runner.
 // This static audit deliberately avoids imposing style formatting on the
 // owner-approved compact UI and historical SQL/source records.
const knownGlobals=`
 AbortController AbortSignal AggregateError Array ArrayBuffer Atomics BigInt BigInt64Array
 BigUint64Array Blob Boolean BroadcastChannel Buffer CSS CSSStyleSheet CustomEvent
 DataView Date DOMException Document Element Error Event EventTarget File FileReader
 Float32Array Float64Array FormData Function Headers HTMLElement IDBDatabase
 IDBFactory IDBKeyRange Image Infinity Intl Int16Array Int32Array Int8Array JSON Map
 Math MutationObserver NaN Number Object PerformanceObserver Promise Proxy Range
 ReadableStream ReferenceError Reflect RegExp Request Response Set SharedArrayBuffer
 String Symbol SyntaxError TextDecoder TextEncoder TextEncoderStream TypeError
 Uint16Array Uint32Array Uint8Array URIError URL URLSearchParams WeakMap WeakRef
 WeakSet WebSocket Window XMLHttpRequest XMLSerializer
 addEventListener atob btoa clearInterval clearTimeout confirm console crypto
 document fetch global globalThis indexedDB isFinite isNaN localStorage location
 matchMedia navigator parseFloat parseInt performance process queueMicrotask
 removeEventListener screen sessionStorage setInterval setTimeout structuredClone
 undefined window
 `.trim().split(/\s+/);
const globals=Object.fromEntries(knownGlobals.map(name=>[name,'readonly']));
export default [
 {ignores:['dist/**','qa_artifacts/**','node_modules/**']},
 {
  files:['site/**/*.js','tests/**/*.js','tests/**/*.mjs','scripts/**/*.mjs','build_cloud.mjs','supabase/functions/**/*.mjs'],
  languageOptions:{ecmaVersion:'latest',sourceType:'module',globals},
  rules:{
   'no-undef':'error',
   'no-unused-vars':['warn',{argsIgnorePattern:'^_',varsIgnorePattern:'^_',caughtErrors:'all'}],
   'no-unreachable':'error','no-constant-condition':['error',{checkLoops:false}],
   'no-dupe-args':'error','no-duplicate-imports':'warn',
   'no-unsafe-optional-chaining':'error','no-prototype-builtins':'error',
   'no-self-assign':'error','no-compare-neg-zero':'error','valid-typeof':'error'
  }
 }
];
