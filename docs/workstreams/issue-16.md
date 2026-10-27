# Issue #16 — owner-retired basket/equipment version management (October 26, 2026)

**Owner authority.** "I don't want to include basket or equipment versions. Let's remove this and close issue #16." This supersedes the original active lifecycle acceptance, not a claim it was implemented. Keep the current strictly >2 g new-shot-only dismissible dose advisory and independent mandatory outlier review.

**Recovered GitHub source.** Private GitHub Free; application development SHA `71017050a8d43b8fda418f08befe4535478e43c2`, tree `db37aabde81d1f9b8ce8dbf079d9e601e231cd13` after merged Issue15 PR157, main `d4f50a7213de614823256b34d207e9f2c71c5dd4`. Independent extractor PR158 is draft and untouched. Reviewed AGENTS, active checkpoint, status, both canonical Locked files, approval coverage, release queue, Issue16 and its previous October23 comment, current CI and actual cloud/model/database/offline paths. The cloud UI only provides New Setup, one Basket Dose, Add Another Setup, Rename/Choose Setup, and existing optional temperature/Slow Feed. No member-facing basket lifecycle or equipment-version screens exist.

**Retirement without data damage.** Do not delete `public.setup_versions`, `public.baskets`, `public.basket_versions`, `public.grinder_calibrations`, `shots.equipment_snapshot` or owner-bound shot foreign keys. Their records distinguish historical machine, grinder, basket and calibration state even when member-facing version management is retired. Preserve old notes, personal and Community recipe contexts, offline pending changes, replay receipts, private account isolation and old import compatibility. No live SQL/schema/member-data/Netlify operation authorized or performed.

**Same-commit changes.** Document `UX-RETIRE-BASKET-EQUIPMENT-VERSION-MANAGEMENT-20261026` in both canonicals; add coverage contract, focused Node tests, this indexed journal, current status, and a queue **history** record (not an active READY/deployable feature). No runtime app changes or migration: screens never existed. CI tests must be verified on the exact source before closure and cannot substitute for an unperformed device/hosted test.

**Release boundary.** Cancel Issue16 as `not_planned` after non-force source integration/CI readback. Do not publish or alter any unrelated Extractor, UI or Backend source and queued READY work.

## Parallel development reconciliation

Concurrent development advanced to dbe389e3a0255907d328edcb654f77282cc5ba4f during this work. The issue retirement was carefully re-applied on the newer tree, preserving every later application/release-queue entry and unrelated source. No publication.
