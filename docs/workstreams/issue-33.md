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
