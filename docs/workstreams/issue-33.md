# Issue #33: selected-product extraction completeness

## October 23, 2026: active development, not published

Owner reported missing Bourbon Ají variety on Sweet Bloom Arbey Cordoba and
authorized comprehensive extractor improvements, testing, integration and READY
queue preparation. Existing deterministic-only decisions govern; no AI, browser
execution, paid service, publication, hosted SQL or member-data mutation.

Recovery: application `72cf330d4105a050d2789077720e64f958950ba3`, private repository
ownership confirmed as Schulzet3. Source transferred through authenticated GitHub
tools and all 472 original blobs plus root tree independently hash-verified.
Current production independently remains Netlify READY/current
`6adb71e2a2e52cd3bbeef5e5`, release `99ad6148e1a540619d67adb07b18f32c93dee9db`.
Earlier central checkpoint's Issue96 unpublished paragraph is historical; the
latest CURRENT_STATUS and queue deployment receipt supersede it.

Confirmed failures: compound variety suffix, heading/caption and multiline fact
layouts; five available fields suppressing missing-variety endpoint enrichment;
sparse catalog masking richer warm source; contradictory variety metadata being
silently retained. Representative fixtures also expose multilingual aliases and
product sections after recommendation blocks.

First source-evidence commit adds only the credential-free opt-in public probe
and its read-only workflow. It exercises the actual handler with local backend
stubs, bounded public sources, exact Sweet Bloom field assertions and sanitized
fixtures. A baseline failure is expected until the implementation commit. Local
network could not retrieve public pages; it returned source_fetch_failed and was
not counted as acceptance. Probe syntax passed. Local security subprocess tests
run successfully with the authorized normal runtime; no limits were removed.

The first detailed issue comment was rejected by automatic approval review.
Ownership/private visibility was verified, and a task-only comment succeeded at
Issue33 comment6373371567. No duplicate ambiguous write was retried.

Next: inspect actual public source artifacts, complete and review in-scope source
repairs, run full applicable CI, integrate non-force and record exact READY source.
No completed implementation, live signed-in acceptance or publication is claimed.


## Implementation candidate: semantic completeness and integrity

Paths: `src/server/coffee-semantic-specs.mjs`, fact compatibility and bounded HTML
structure helpers; page metadata/layout/scope/flavor/narrative parsers; Shopify
merging, nested Woo endpoint matching; Netlify preview handler; catalog provenance
UI; focused semantic/acceptance/integrity/captured-source/enrichment/scope tests;
public probe/workflow and canonical status/ledger/matrix/queue records.

Baseline live probe40014705373 at c6ec5edc08e689d64e305c1821cecb9268d7b1a1 reproduced
the original missing variety on both tracked and canonical Sweet Bloom URLs.
Downloaded artifact12528590212 passed independent SHA256 verification. It made14
public requests, zero real backend requests, quota claims, production writes or
deployments. Original Manhattan sanitization parity was false because the form
subtree was removed; source capture now strips only the form shell and controls.
The historical parity failure stays recorded, not relabeled as passing.

Repairs include full unfamiliar cultivar names, explicit accents/Spanish/French
labels, reversed/nested/multiline metric cards and full bounded page scan; later
product sections survive recommendation removal. Farm/grower and country/region
are retained separately/fully. Exact-name accessible image text recovers explicit
notes and roast without OCR. Animated per-letter H1s recover product identity;
source seller identity is accepted only for an explicitly named same-site roastery.
Every fresh eligible product read uses the same existing bounded endpoint budget,
including full core-field HTML. Merge preserves conflicts, provisional roast
cautions, mixed-process details and compatible recipe evidence. Sparse catalog
records cannot suppress a richer source; truthful fallback and free complete
catalog/warm paths preserve admission, cooldown and charging rules.

Review caught and repaired recommendation-card Espresso resumption, nested-block
truncation and scanner-overflow leakage; the added10 scope cases pass. Review also
caught a new malformed-H1 regex CPU issue (400000 unclosed H1 tags exceeded2.5s);
identity now uses the bounded structural scan (local reproduction14ms). Existing
Tim origin expectation changed from Kenya to Nyeri, Kenya because both explicit
source labels must survive; this is an intended correctness improvement. Original
combined Washed/Natural expectation now honors existing Other/Unknown policy.

Focused runs include semantic/acceptance155/155, enrichment22/22, current
pipeline77/77, source fragments8/8, and isolated auth/quota/SSRF/resources82/82
(before only the final endpoint gate extension). Full local run743 cases had742
pass and the sole stale Kenya expectation; that assertion is now repaired. All
successful security subprocess runs used the permitted isolated runtime; no
security tests were disabled to accommodate sandbox restrictions.

Queue remains TESTING. Next commit/source must pass full Node22, lint/build,
applicable browser tests, all ten live-source cases and sanitized replay parity,
then nonforce integration with exact-source readback. No publication, hosted SQL,
Edge deploy, Auth/provider change or personal-record mutation. Physical-device
and authenticated production acceptance are not claimed. Universal perfection is
not claimed; all facts retain the existing review/save workflow.


Final local validation initially751 cases/749pass exposed two documentation-only
contract failures: the new coverage entry needed the established
RETIRED_NOT_REQUIRED device-policy marker, and the reconciliation test froze the
entire current matrix to its15 historical contracts. Both are corrected: all15
historical contracts and66 assertions remain exact; later approved contracts may
be appended and still must pass the independent current approval coverage audit.
No historical baseline, production receipt or safety gate was removed.

Final candidate local complete suite: **751/751 PASS**, zero skipped/cancelled/todo,
8.15s. Approval source coverage and queue schema pass. This is Node24 local evidence;
required Node22/lint/build and public-source acceptance still run on exact GitHub
source before READY.


## Final evidence audit follow-up, before integration

Candidate262d00a1e7ab7f4af58c5a9a94c76ca488a7b437 / tree
151b650b0b4bc641722011a93ddc5bb3fd30e23f passed all seven workflows:
approval40016226504, Node22/lint/build40016226478 (751/751,zero skips),
security40016226510, isolated SQL40016226565, cloud/browser40016226456,
visual/offline/built-app40016226507, live public acceptance40016188539.
The live probe passed all10cases/64assertions with19public requests, no backend
quota/data writes, and all10sanitized HTML replays identical, including Manhattan.
Artifact12528053140 SHA256de86570a81bff0754d66c35d8e42099b4c44175ec6d222466b2d50996df3e27e
was downloaded and independently verified. PR99 is open, not yet integrated.

A final read-only field audit found four clear omissions outside those original
assertions. Added source-bound extraction and regressions for SEY's named
coffeeTitle_producer/country components (never AA SEPARATION as a farm), Manhattan's
country immediately adjacent to its product H1, and NOMAD's explicitly named farm
owner under Sobre la finca. Those6new positive/negative cases pass and actual-source
replay recovers Ruarai/Nyeri,Kenya; Cauca,Colombia; Aquiares/DiegoRobelo y su familia.
The same follow-up adds Onyx's exact tab-matched espresso20g/47g as a partial review
reference; pressure-stage durations and neighboring filter data must not become
an invented total time or temperature. Expanded live assertions cover these facts.

Scope now includes coffee-espresso-evidence.mjs and partial-reference UI. Existing
source limits remain explicit in the acceptance record, including contradictory
Circulor facts and Sweet Bloom's unlabeled roast-position ordinal. No universal
100% coverage or publication claim. Re-run affected/full validation, exact-sourceCI
and expanded live acceptance, then integrate nonforce and record READY receipts.

Final follow-up local validation: **766/766 tests pass**, zero skipped/cancelled,
including 9 new exact-tab espresso tests and 6 final source-detail cases. Combined
espresso/enrichment/auth/resource checks pass 123/123. Actual Onyx source replay
returns only 20 g / 47 g and no total time, temperature or inferred ratio. Queue
schema and approval coverage pass; exact GitHub checks remain the final gate.

## Independent final conflict review

Source 0954e07332a2628816f67e37df05612ee3a816c6 passed 766/766 Node 22.23.3
cases, lint/build, and the expanded live run 40017300314: all 10 required targets,
72 assertions, zero gaps, 19 public requests and all 10 HTML sanitization parity
checks. Artifact 12529026834 was independently downloaded and SHA256 verified:
64f73d9fca4468333c0dcef679e79dcbbb0c0672ff7fdfacc8216733051af9fd.
The final read-only reviewer then found one concrete case outside those live
assertions: structured Origin: Ethiopia could be overwritten by visible Country:
Colombia and Region: Huila. Repair the cross-alias conflict and preserve compatible
country/region detail before integration. The queue remains TESTING until the
repaired source passes its exact checks.

A separate cache audit confirmed the public preview cache is handler-local memory;
updated handlers start empty. No persistent cache invalidation or version change
is needed. Incomplete catalog entries proceed to fresh extraction, and existing
warm-result/auth/cooldown behavior stays intact. No provider or member data writes
were performed during these reviews.

The final conflict repair changes only coffee-page-metadata.mjs and the new
coffee-geography-conflicts.test.mjs beyond these evidence/queue records. Exact
country segments now agree across Origin/Country aliases; compatible accented,
reordered and more detailed geography survives. A bounded set of 16 untyped
origins is checked against the explicit country/region pair. Rejected origin
cannot return through nearby, metadata, endpoint or blend fallbacks. All 8 new
regressions pass (6 failed before repair); the combined focused run passes 107/107.
The complete local Node 24.19.0 suite now passes **774/774**, zero failed, skipped,
cancelled or todo, in 10.53 seconds. Approval coverage, queue schema and diff
whitespace pass. Final exact-source Node 22 and live checks precede integration;
no publication or member-data change has occurred.

Fresh live run 40018240406 at e24eef8215392b0f42f9fe9771029c6f528ad4c1 caught
a real regression: the stricter geography rule withheld Onyx Geometry's two-country
origin. The other 9 required cases still passed. Artifact 12528189967 was
independently verified with SHA256
3f0f4ede60148b158ffdc7722f34166348a32b6c87d81ddb9f305b04a32d49dd.
This failed run is retained as evidence, not relabeled or weakened. Trace the
exact source occurrence and repair the distinction between component/blend data
and genuine cross-source disagreement before another final acceptance run.

The failed live case was traced to exact same-product Shopify tags:
origin:Colombia, origin:Ethiopia, type:blend. HTML already gave the whole blend
correctly. Only explicitly blend-marked cohorts whose origin tags are all exact
recognized countries now aggregate before normal conflict checking. The existing
60-tag/220-character limits remain. Independent attributes, descriptions and
visible-label contradictions cannot be combined or restored by a blend marker.
Four regressions were added (two positive cases failed before repair); all 111
focused cases pass. Fresh failed-run source now passes the complete handler:
Colombia, Ethiopia; no conflicts; one HTML and one JSON read; Unverified remains.
Final local suite: **778/778 PASS**, zero failures, skips, cancellations or todo,
Node 24.19.0, 11.54 seconds. Approval coverage and diff checks pass. Exact-source
hosted and live acceptance precede integration and READY; no publication.

## Final integrated receipt — READY, not deployed

Final tested source `df9956fa269c705e98bc509a62146f491ce83c99`, synthetic merge
`4999b835030ccde9828ee08e3b38d8384f82152b`, and non-force PR99 merge
`126304178bf255894af44633587052c7ef3b56d5` all have tree `cf3023ec7b1a47ea278f06c511b2a0a5845ef885`.
All 36 changed/new local source blobs were independently verified against the
GitHub tree before the final code commit. The integration and branch were read
back. Final PR workflows passed: 40018972019, 40018972022, 40018972061, 40018972023, 40018972060, 40018972080, 40018964681.
Applicable merged-source workflows passed: 40019580174, 40019580251, 40019580211, 40019580226.

Final Node 22.23.3 validation is 778/778 with zero failures, skips, cancellations
or todo; lint/build/dist privacy checks pass. Browser/mobile, visual/offline,
packaged-app, isolated SQL/signed HTTP/recovery, security and approval/continuity
steps actually ran and passed. No optimized skipped check is reported as a test.

Live source run 40018964681 passes all 10 required cases and 72 assertions, with
zero observed gaps and all 10 sanitized HTML comparisons identical. Artifact
12528679791 was independently downloaded and its SHA256 verified:
dc44c8677fdce8e84bb8369b64ad19a52420171d87b3ac2e019152802d669845.
The clean source and workflow SHAs both equal the final tested source. The run
made 19 public requests, consumed no member quota, and made no real backend
requests, production writes or deployments. Earlier failed assertions and their repairs
remain recorded above and in the audit; their failures are not relabeled.

Canonical status, ledger, coverage and release queue are synchronized in this
documentation-only receipt. The queue covers exactly all 13 unpublished app
paths and is READY with no scoped blockers. Production release
99ad6148e1a540619d67adb07b18f32c93dee9db and Netlify READY/current
6adb71e2a2e52cd3bbeef5e5 were read back unchanged. No hosted SQL/Edge/Auth,
member records or publication changes. Existing saved coffees are not rewritten.
Source development is complete; a future separately authorized release must
use the existing scoped one-command publication process.
