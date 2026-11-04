# Issue #267 — bounded audit-diagnostics privacy remediation (2026-11-04)

## Source and authority
- Development parent commit: `e36a98bd0ea5e1a7eff4a100fde77638a62e8d1a` (tree `a3ddcae2ec5a1df3c76a62bb1e2126243399dafc`).
- Edited current source: `scripts/audit/coffee-frozen-ci.py`, original blob `926bfd49aed1e4426c2aa818b85ef7546d853a4f`, candidate blob `e3e7f378d66fa90c1e5db65904bc90c1440a00aa`.
- Scope is **current audit diagnostic summaries and focused regression only**, not the immutable frozen 603-coffee oracle/scorer/captures, historical V2 inventory, production SQL/Auth, member data, or extractor #33 code.
- Separate #267 strict line-1 inventory/coverage ledgers remain unchanged; this code fix does not count as direct semantic reviewed-line credit and does not resolve post-pin drift review.

## Reproduced defect and patch
- A synthetic failed log could echo untrusted `PRIVATE_CAPTURE_VALUEError` into `exception_types[].type`, bracketed `PRIVATE_CAPTURE_VALUE` into `exception_types[].code`, and `PRIVATE_CAPTURE_VALUE.py`/`.mjs` into `source_locations[].source_file` (see issue #267 finding 2026-11-04).
- Fail closed to a fixed safe type/code allowlist; unknown types become `OtherError`, unknown codes are omitted, non-allowlisted basenames become an extension-only `source.py`/`source.mjs`/etc. Keep line numbers, safe known fixture names, and retained private artifact log unchanged. No actual production secret was used or compromised in the synthetic reproduction.
- Add focused adversarial regression to the **same source file** for malicious type/code/basenames, oversized type, and legitimate `ValueError`; preserve existing safe-location regression.

## Acceptance, results, next action
- Standalone exact-function Python 3.13.5 synthetic tests: **2/2 PASS** locally on 2026-11-04, including safe legacy fixture output and malicious type/code/file/length. This is not a full runner, Node, frozen603, Auth, SQL, or GitHub CI result.
- Required before integration: exact candidate GitHub runner-controls and applicable CI SUCCESS, source/PR-head SHA proof, nonforce merge, merged-source CI readback and documented finding disposition. Existing PR #616 S2-090 strict receipt remains separately pending; never overwrite its ledger/journal.
- GitHub Actions startup jobs on PR #616 failed with no steps on 2026-11-04; GitHub's public status recorded an Actions incident resolved 18:16 UTC, but the incident **does not independently prove** why this repo's jobs failed after 18:16. If checks fail or remain pending, do not merge or promote READY.
- No deployment, account/member/provider write, purchase, force push or production publication authorized or performed by this code change.
