# Exact Hambela Test Shot Purge Verified October 17 2026 UTC

**Result: COMMITTED and independently verified.** The owner explicitly authorized permanently purging only Sweet Bloom Hambela test shot `799509a3-a16d-4380-a439-8de2a5d880e2` from production Supabase, removing its note/data, handling detailed audit and mutation receipts safely, correcting affected recency/feed timestamps, preserving every other shot/community contribution and all historical backups, and recording results in CURRENT_STATUS.

This is a specific owner-requested production data cleanup, not a product-policy change or general deletion authorization. Prior documentation-only/no-production-write scope applied to the preceding continuity task. Every unrelated Locked requirement remains unchanged.

## Production identity and dependency preflight

Project: `azviqqejypsefzilgonr`, The Dial In Collective, provider status ACTIVE_HEALTHY, PostgreSQL 17.11.

Matched the exact UUID to canonical **Sweet Bloom / Hambela**, hidden at `2026-10-17T02:14:59.991207Z`, **nonlegacy**, **18 g / 48.8 g / 25.2 s**, Traditional, Slow Feed, not Dialed In, revision 2. Legacy ID was NULL; no experiment or personal-family assignment existed. The original row's SHA-256, owner, coffee identity, revision and expected dependencies were asserted inside the transaction before any write.

Catalogued live foreign keys and triggers, then scanned all 42 public/private application tables for the exact UUID:

| Location | Before | Action |
| --- | --- | --- |
| public.shots | Exactly 1 target | DELETE exact UUID/owner/revision with hidden/nonlegacy guards. |
| public.shot_notes | Exactly 1 matching owner note, empty string | DELETE that note only. |
| private.shot_audit | Exactly 2 rows, IDs 177 and 179, containing full before/after shot snapshots | Clear before_values and after_values to SQL NULL; preserve both original metadata rows. |
| private.mutation_receipts | Exactly 2 responses containing the target shot record | Replace response payloads with record_purged tombstones; preserve owner/mutation ID, request hash and creation time. |
| private.contribution_links | 0 target references | No changes. |
| public.recipe_preferences | 0 favorite-shot references | No changes. |
| Other application tables | 0 target UUID references | No target-dependent writes. |

The shot-note FK is ON DELETE CASCADE; it was still deleted explicitly with a one-row assertion. The community-link FK would SET NULL on shot deletion, but the target had **no** contribution link, so no shared row needed alteration. The favorite-shot FK is deferred; there were no matching favorites. No DELETE trigger or rewrite rule on the affected data introduced side effects; existing INSERT/UPDATE projection logic was not invoked by deleting the shot. No triggers, constraints or policies were disabled.

## Transaction and verification sequence

1. Captured SHA-256 row-set fingerprints over **42 protected table scopes**, including all 15 other shots/notes, all community records and the unaffected portions of the six changed tables.
2. Executed the exact guarded purge, payload scrubbing and timestamp corrections inside a transaction, with a 2-second lock timeout and 25-second statement timeout, then **ROLLBACK**.
3. Independently verified rollback restored the target hash, note, two audit snapshots and two original cached response payloads; all 42 baseline fingerprints still matched.
4. Executed the same guarded SQL with **COMMIT**. The in-transaction report timestamp was **2026-10-17T04:23:35.732675+00:00** (October 16, 2026 at approximately 22:23:35 America/Denver).
5. Issued separate post-commit read queries. Data/count verification timestamp: **2026-10-17T04:24:15.0808+00:00**. All 42 protected fingerprint scopes matched the pre-purge baseline.

The transaction used the existing per-owner mutation advisory lock and brief SHARE ROW EXCLUSIVE locks on the 42 first-party tables, allowing reads and preventing concurrent writes during the guarded comparison. It refused to proceed if the inspected target, affected preferences, receipt metadata or protected records differed from the baseline. All deferred constraints were checked before commit. No persistent schema, Auth, RLS, Edge Function or release configuration changed.

## Detailed audit and receipt handling

**Audit:** the two original metadata rows remain at IDs 177 and 179, with their owner, shot UUID, insert/update action and creation time unchanged. Both before_values and after_values are **NULL**; no detailed shot snapshot remains in them. Their original metadata was compared before and after.

**Receipts:** both original idempotency records remain with the same mutation IDs, request hashes and timestamps. Their only response is:

```json
{"ok":false,"code":"record_purged","message":"This test shot was permanently deleted by its owner."}
```

Neither response contains a record or shot measurements. Deleting these receipts would allow old request IDs to be treated as new work; preserving them prevents that replay route. The existing mutation handler returns the stored response when the original request hash matches and rejects a reused ID with a different payload.

**Actual replay check:** replayed the original hide request with its existing mutation ID and exact original request hash, using only transaction-local authenticated owner claims. It returned **record_purged**, and no shot, audit event or receipt was recreated. Both the rollback dry run and committed transaction passed this check. This does not claim a permanent new-ID tombstone API or that arbitrary fabricated new mutation IDs are globally banned; no new application policy was introduced.

A final exact-UUID scan across all 42 application tables found it **only in the two payload-free audit metadata rows**. No shot, note or cached detailed receipt response still references it.

## Timestamp corrections and preserved preferences

| Affected field | Before | Verified after |
| --- | --- | --- |
| Hambela workspace last_logged_at | 2026-10-16T16:51:29.486671Z | NULL: there are no remaining shots for that exact owner/setup/version/Hambela library context. |
| Hambela workspace revision | 2 | 3, by normal revision trigger. |
| Setup last_feed_shot_at | 2026-10-16T16:51:29.392Z | 2026-10-16T16:50:19.242Z. |
| Setup slow_feed | true | true, supported by the latest remaining eligible nonlegacy visible shot. |
| Setup preference revision | 4 | 5, by normal revision trigger. |

The feed source is existing shot `48ad9363-8313-47b1-837f-a26d2ac4c1f7`, not the removed sample. All other fields in both preference rows were compared excluding only authorized timestamps/Slow Feed and normal revision/updated_at metadata. Setup IDs, equipment, selected style, basket, tracking choices and created_at remained unchanged.

The current-coffee workspace pin was left unchanged. No unrelated preference, library, coffee, family or historical record was rewritten.

## Independently verified final state

| Check | Result |
| --- | --- |
| Target shot / target note | **0 / 0** live rows. |
| Other stored shots | **15**, exact full-row fingerprints unchanged. |
| Visible shots | **15**, unchanged from pre-purge visible count. |
| Legacy shots | **14**, unchanged. |
| Notes | **15**, all other note rows unchanged. |
| Target audit rows | **2 metadata-only**, **0 detailed payloads**. |
| Target mutation receipts | **2 payload-free record_purged tombstones**, identity/hash/time preserved. |
| Community shots | **1**, exact full-row fingerprint unchanged. |
| Community contribution links | **1**, exact full-row fingerprint unchanged. |
| Remaining protected table scopes | **42 / 42 PASS** before/after, including unrelated audit/receipt rows. |
| Frontend release | Existing ready deploy `6ad2c872ad7a8fa78dc410dc` unchanged on provider read-back; no deployment requested. |
| Historical backups | No archive/file deletion, backup workflow edit, restore or retention change performed. Database backup tracking rows were fingerprinted unchanged. |

### Protected fingerprint scopes

For shots/notes/audit, the scope excludes only the target shot's rows. For mutation receipts it excludes only the two target-related receipt keys. For workspace_coffees/setup_preferences it excludes only the precisely affected context row. The other **36 tables** were compared in full. Separate guards verified the allowed changes and preserved metadata in those excluded rows.

Fingerprints are SHA-256 over sorted per-row SHA-256 digests of complete JSONB rows. Each hash below matched before the purge, inside the committed transaction, and in a separate post-commit read. Counts refer to these **protected scopes**, not necessarily whole-table counts.

| Protected table scope | Rows | Unchanged SHA-256 |
| --- | --- | --- |
| private.app_admins | 1 | `14275c251ed3eaa0a891f8fa1d99d009ca8296c74b59135f399c86ea0bc08c35` |
| private.backup_runs | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| private.beta_invites | 2 | `8153f4b5ff3a289c6d18d5a1143f164aa6fc4520961fa7d1deb9e32c50fa287c` |
| private.beta_members | 2 | `f5e13da4aec6a5eceb87f04fd74564f41631dc52a48cc97f4d4e89922ed2848a` |
| private.contribution_links | 1 | `2f4a9da36c44c95c0a2156118865867de85a8b52bbe33f048c10b4b0c56606cf` |
| private.contributors | 3 | `76c985c248a0a6c804c8711e9d6aa8d63241dbfce6cb593447d5d285f7aca244` |
| private.dic_coffee_aliases | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| private.dic_coffee_audit | 4 | `26332697f14ba0711c71170c1d76afef5524885d07786f618ada17c4819b5298` |
| private.dic_coffee_first_entry | 4 | `b836848e3e7f29f60ff98eef35bfa18a9de112039ed43ad24074ae69eca78fba` |
| private.dic_roaster_aliases | 4 | `631c43d7375b6d86b12e84324a9786a636b52211c4cf0480564b16ab658d4fc4` |
| private.dic_roaster_directory | 4 | `b708856368ad9c873f9445878651fd0fb489cd636620809f148e4d9615dfdecd` |
| private.dic_source_attempts | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| private.dic_url_preview_attempts | 1 | `410e74e53429b3f25e3fcc38241ab27b5e8868f5699ef73a6a2701ab0818a733` |
| private.import_batches | 1 | `2e4c33497b0accb8163b092a3de4eed5f6db25d81cc3928735f7b440e8c91916` |
| private.import_control | 1 | `346f9d8fc2af9ca93072de733a2d8763a57acb479e9cd0bcf782a777dadf6c6c` |
| private.invite_attempts | 2 | `9862cc84b07fe397c7932cdda5354fbee0608971925f123fc60605c318f7dd44` |
| private.invite_redemptions | 2 | `794e86de71d799358228fc1bfb4c0c8f1c5b14518080554fca552491e64e3101` |
| private.mutation_receipts | 19 | `da103cdd98e311e4db0b63dd58d424b62a775e3ccde5ac56c9b90f2f90516198` |
| private.shot_audit | 31 | `a0faa09f4f60c951abae20a86b7c97700219eaccf58b5345cd345bc52a9a08c2` |
| public.account_preferences | 2 | `f684e1782d069e3a480d32c6046dc75a9aa473c7d98dc903e3b1ab364c80670e` |
| public.admin_reviews | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| public.bags | 4 | `09bdac7d03ce9398900b7a026147ef07855370e63bc786f8c574598c9876f9f7` |
| public.basket_versions | 2 | `cdf12be2fa5e57db612c9e887d03a68b4ea6684d702f8cd41b3040e8739b6d90` |
| public.baskets | 2 | `f6c19a3a7c5129945d216b723495f3b598f732ea3960c0eb5996d979ba719a1a` |
| public.coffee_groups | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| public.coffee_sources | 7 | `ed4335aa7db5551225654916835643b655470fbea318f3246ae4299dd6332951` |
| public.coffee_submissions | 5 | `6d676ce857b2512d848308ab9295534093eb6744b817b359dd929f8c19223e89` |
| public.coffees | 4 | `bdd20e20975bda28490994fd48b1edd768f1c614a9203fa9d6a446be90b37b1b` |
| public.community_shots | 1 | `a84c10613d83d23de75df823d45e2568e171f23f3bbb480d3720f3bf47c9eaba` |
| public.experiments | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| public.grinder_calibrations | 2 | `7d7a2740c5fe6cec54348b40ca0d23afeb23e5b2b5c15d635fe6af2541ae8984` |
| public.library_entries | 5 | `a5f7f21523861e96020cec6a5029b75240037b01b7b8098f360094584876b3b2` |
| public.personal_recipe_families | 4 | `ab95ea41ffe3c8d4e39672a18cf632cb30eb86cbf36da74421472839cec6059d` |
| public.recipe_families | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| public.recipe_preferences | 4 | `b4ab8f9bf1af7691915c1b78b9eaf6794f75c65ce7e7bce2bed07d5adad05790` |
| public.setup_preferences | 1 | `1c34da1b0b0f741eb03cf95cbb50855bef20db3a7c24d4fe79f6174293e1c2e0` |
| public.setup_versions | 2 | `41e238005d92c24f2bf4708c3cb02b068a8810243f89cf0bf3d61e26e1c16c83` |
| public.setups | 2 | `c322fe88fbc03393ba3d3635ea7997c686df59e06441620945ca75c71bb69413` |
| public.shot_notes | 15 | `315db74c64b206fccb5561a78200222f56e8660c5d2735d406018ca037140734` |
| public.shots | 15 | `d8f029cb614828f3ec6fb16e198918fc19bc898687f309d6f60425b2a9978198` |
| public.workspace_coffees | 3 | `f2cc694fe350f08e9b64d6e6af4f2034fe331f2be14886c7ca3d9b1cfe3762b3` |
| public.workspace_state | 2 | `78a58c3a5a057fe96f294152b312f4269ad85618ce2674b6df40eb93c5f46b4c` |

## Preservation and limits

- Original historical imports, all other shots/notes, library entries, canonical coffees, families, community contribution, unrelated audit/receipts and backup tracking records are unchanged by the verified comparisons.
- Historical encrypted backups, Drive copies and original recovery evidence remain untouched, as explicitly requested.
- This is logical removal from the live application tables, with minimal audit/idempotency metadata retained. It does not scrub historical backups, provider WAL/log retention or already-held client caches.
- No full application test suite was needed for this exact data operation; validation used actual transaction rollback, committed SQL assertions, original-request replay and independent post-commit fingerprints.
- Canonical product requirements were not changed. Future deletion requests still require their own scope and identity/dependency validation.

## Concurrent documentation preservation

The branch received independent gap-audit commit `d0b0eadebc020d4ae26eb4a6df7dcfa3e8c96100` while this purge report was being saved. The purge documentation was rebuilt on that latest head, preserving its complete gap-audit file and added CURRENT_STATUS/index sections. No force update or application merge was used.
