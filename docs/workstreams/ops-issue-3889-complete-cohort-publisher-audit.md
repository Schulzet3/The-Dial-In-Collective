# #3889 — actual publisher evidence audit for the complete original cohort

DIC_PREFLIGHT_VERIFIED development_sha=948d1dd33c5ffa2888867acc8f1edf2bce1ad5b2 preflight_blob_sha=c59d7d5097a2224fcd254d6a4133c2cf01ee3a0f

This input requests the existing approved read-only publisher evidence verifier on one immutable nonpublishing candidate. It does not promote the development queue, certify READY by itself, create a release request or grant, or authorize publication.

## Exact source

- Approved main source: #3978, `ec5480944447ab80d78270be15f68e5d7af636a2`, tree `1b2a86541e0da3aeb93eb262b915fd358dd24302`.
- Native main controller `45730444103`: validation `139610834324` and event verification `139610834724` SUCCESS, including 363 passed acceptance tests and isolated snapshot adversarial checks. Existing 52-item publisher evidence was reverified successfully before the new source receipt.
- Native source receipt `45730444050 / 139610834390` SUCCESS. Downloaded artifact `15076418299` independently rehashed to SHA256 `a0da5376e6c5c3b10ace420a230754cd2462ae26288b54d295ad5cf940ef46ee`. Its complete manifest, 436 delta entries and journal match independently reproduced local source.
- Frozen candidate: `6372df32405212fa3459d9bcec25df5029c5e21a`, branch `release-candidates/prospectbatch3889-3a4762b20de6096c7a00`, sole parent `948d1dd33c5ffa2888867acc8f1edf2bce1ad5b2`, exact tree `b90d59443d787a1f91f0e637ace6454bbb3ef6e2`.
- Candidate queue: `a816976d2c53e88724323d9c90370c7151bd3c84`; manifest: `e5ed00d0f40c5b6f0e498ae7d40e12b569612bd5`; canonical selection SHA256: `9d9ad00ee2fa31259815c2d2dc54560bc52596af0a9e0e71b6c116945460f6b9`.
- Selection: exactly the 63 original TESTING IDs in immutable baseline `d9fc859d81a23e10ee2cd0e1a37013b93a4980e5`, queue `46304f47eb0e78fac8c7845155af86080900b3c4`. The candidate retains all 52 certified runtime sources, adds the remaining 11 compatible source components, preserves all 404 DEPLOYED and six separate IN_PROGRESS rows, and records the #3472 member-vault dependency separately from the original cohort.
- Published tested source `2d22d448160d428a977f06482323646b92818fcf` and production `5b256f1fc0717d3635f7148b934a1f91f8991685` remain unchanged.

## Exact native candidate inputs

| Required job | Native PUSH run | Job |
| --- | --- | --- |
| approval | 45731136826 | 139613125641 |
| validate | 45731136963 | 139613126181 |
| cloud-tests | 45731136850 | 139613126144 |
| mobile-browser-qa | 45731136850 | 139613125808 |
| sql | 45731136919 | 139613125799 |

The merge condition for this input is a fresh readback of all five exact native SUCCESS jobs and unchanged refs. The actual publisher audit then independently reloads the run/check evidence; pending, failed, skipped, missing, nonnative, PR-head, mismatched or moved evidence is HOLD. Internal targeted-suite NOT_APPLICABLE is not represented as an executed PASS; high-risk full Node coverage is assessed from the validate job. No app build, full suite, specialist capture or candidate is duplicated by this audit input.

## Cheap source checks and limits

The complete source wrapper passed on actual immutable Git objects before candidate creation. The existing static graph proof was reused; only nine changed JavaScript modules, their dependency exports and the new member fixture needed an incremental check. There were no missing imports/exports, syntax errors, removed exports or changed package dependencies/engines/lockfile. Independent candidate-owned replay again matched all 38 coffee source/test/workflow objects and original nine source inventories, including the narrowly bounded R408 relocation.

Historical R380b evidence retains its documented limitation: the expired raw-HTML artifact was not independently redownloaded. Exact historical native collector/checker control flow and scoped acceptance were reviewed; no recovered artifact hash, full603 acceptance, live member/handset acceptance or publication is claimed. The under-15-minute request-to-READY target remains unverified.

## Required next action

Consume the actual audit's successful native job and independently verified artifact. Require its verified-ID list to equal all original 63 IDs and its candidate/parent/published source/four-run identities to match. Only then copy the exact frozen queue blob with its certificate, per-ID evidence ledger, CURRENT_STATUS and scoped journal to development, nonforce integrate, and read back the merged files and #3889 checklist. No release/production, Netlify, live provider/DB/member, backup/visibility, secret, spending, force, Publish, grant or release-request mutation occurs.
