"""Offline adversarial checks for report binding; no original oracle is read or edited."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
from types import SimpleNamespace
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[2] / 'scripts/audit/coffee-corpus-report.py'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value))
    return path


class CoffeeReportIntegrityTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='coffee-report-integrity-')
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.corpus = self.root / 'corpus'
        script = self.root / 'repo/scripts/audit/coffee-corpus-report.py'
        script.parent.mkdir(parents=True)
        shutil.copyfile(SCRIPT, script)
        spec = importlib.util.spec_from_file_location('isolated_coffee_report', script)
        self.report = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.report)
        # The binding code is unchanged. JSON output makes the result inspectable
        # without copying the visual report template into each test artifact.
        self.report.TEMPLATE = '__PAYLOAD__'
        roasters, oracle, packets, output, comparison, retention = [], [], [], [], [], []
        for index in range(201):
            roaster_id = f'roaster-{index}'
            urls = [f'https://roaster-{index}.example/products/coffee-{slot}' for slot in range(3)]
            roasters.append({'id': roaster_id, 'name': roaster_id, 'city': 'Original City',
                             'state': 'CO', 'selected_urls': urls})
            for slot, url in enumerate(urls):
                identity = {'case_id': f'{roaster_id}-{slot}', 'roaster_id': roaster_id, 'source_url': url}
                name = f'Coffee {index} {slot}'
                evidence = [{'capture_id': 'page', 'locator': 'h1', 'quote': name}]
                extra_evidence = [{'capture_id': 'page', 'locator': 'p', 'quote': 'Published lot details'}]
                extra = {'label': 'Lot details', 'value': 'Published lot details', 'evidence': extra_evidence}
                oracle.append({**identity, 'canonical': {'name': {'value': name, 'evidence': evidence}},
                               'additional_facts': [extra]})
                packet_path = write(self.corpus / 'cases' / identity['case_id'] / 'source-packet.json',
                                    {'id': identity['case_id'], 'roaster_id': roaster_id,
                                     'source_url': url, 'requests': [{'label': 'page', 'url': url,
                                     'final_url': url, 'status': 200, 'file': 'page.html',
                                     'bytes': 1, 'sha256': 'a' * 64}]})
                packets.append({'id': identity['case_id'], 'sha256': digest(packet_path)})
                output.append({**identity, 'elapsed_ms': 1, 'output': {'ok': True, 'fields': {'name': name}}})
                comparison.append({**identity, 'canonical': [{'field': 'name', 'expected': name, 'actual': name,
                                     'status': 'exact_equivalent', 'evidence': evidence}],
                                   'additional': [{'label': extra['label'], 'expected': extra['value'],
                                                   'context': None, 'status': 'unconfirmed'}],
                                   'ambiguities': [], 'unexpected': [], 'unreviewed_sources': []})
                retention.append({**identity, 'checks': [{'assertion_index': 0, 'label': extra['label'],
                                  'expected': extra['value'], 'context': None, 'frozen_evidence': extra_evidence,
                                  'status': 'unconfirmed', 'evidence': []}]})
        manifest = write(self.corpus / 'manifest.json', {'coffee_count': 603, 'roasters': roasters})
        oracle_path = write(self.root / 'repo/docs/audits/oracle.json', oracle)
        freeze = write(self.corpus / 'oracle-freeze.json', {'files': [
            {'kind': 'selection_manifest', 'path': 'manifest.json', 'sha256': digest(manifest)},
            {'kind': 'source_oracle', 'path': 'oracle.json', 'sha256': digest(oracle_path)}]})
        attestation = write(self.corpus / 'original-archive-packet-attestation.json', {'packets': packets})
        common = {'oracle_freeze_sha256': digest(freeze), 'source_tree_sha256': 'b' * 64}
        bound = {'packet_archive_attestation_sha256': digest(attestation), 'source_archive_sha256': 'c' * 64}
        replay = write(self.root / 'replay.json', {**common, **bound, 'records': output,
                       'node_version': 'isolated-fixture', 'created_at': '2026-10-24T00:00:00Z'})
        compared = {**common, 'replay_sha256': digest(replay), 'comparison_script_sha256': 'd' * 64,
                    'comparison_normalizer_sha256': 'e' * 64, 'records': comparison,
                    'counts': {'cases': 603, 'ok_response': 603, 'canonical_assertions': 603,
                               'exact_equivalent': 603, 'missing': 0, 'review_required': 0}, 'by_field': {}}
        baseline = write(self.root / 'baseline.json', compared)
        candidate = write(self.root / 'candidate.json', copy.deepcopy(compared))
        retained = write(self.root / 'retention.json', {**common, **bound, 'replay_sha256': digest(replay),
                         'records': retention, 'counts': {'additional_assertions': 603, 'unconfirmed': 603}})
        self.args = SimpleNamespace(corpus=self.corpus, baseline=baseline, baseline_replay=replay,
                                    comparison=candidate, retention=retained, replay=replay,
                                    output=self.root / 'report.json', adjudication=[])

    def test_original_source_bound_603_case_report_builds(self):
        self.report.build(self.args)
        data = json.loads(self.args.output.read_text())
        self.assertEqual(len(data['cases']), 603)
        self.assertEqual(data['roaster_count'], 201)

    def test_changed_location_proof_cannot_reuse_the_frozen_manifest(self):
        path = self.corpus / 'manifest.json'
        changed = json.loads(path.read_text())
        changed['roasters'][0]['city'] = 'Unverified Replacement'
        write(path, changed)
        with self.assertRaisesRegex(AssertionError, 'Frozen manifest changed'):
            self.report.build(self.args)

    def test_changed_capture_metadata_cannot_reuse_original_packet_attestation(self):
        path = self.corpus / 'cases/roaster-0-0/source-packet.json'
        changed = json.loads(path.read_text())
        changed['requests'][0]['final_url'] = 'https://roaster-0.example/products/unrelated'
        write(path, changed)
        with self.assertRaisesRegex(AssertionError, 'Original archive packet changed'):
            self.report.build(self.args)

    def test_replaced_packet_attestation_cannot_reuse_the_replay(self):
        path = self.corpus / 'original-archive-packet-attestation.json'
        changed = json.loads(path.read_text())
        changed['packets'][0]['sha256'] = 'f' * 64
        write(path, changed)
        with self.assertRaises(AssertionError):
            self.report.build(self.args)

    def test_changed_replay_output_cannot_reuse_comparison_and_retention(self):
        changed = json.loads(self.args.replay.read_text())
        changed['records'][0]['output']['fields']['name'] = 'Another Coffee'
        write(self.args.replay, changed)
        with self.assertRaises(AssertionError):
            self.report.build(self.args)

    def test_shifted_retention_assertion_cannot_be_attached_to_original_fact(self):
        changed = json.loads(self.args.retention.read_text())
        changed['records'][0]['checks'][0]['assertion_index'] = 1
        write(self.args.retention, changed)
        with self.assertRaises(AssertionError):
            self.report.build(self.args)

    def audit_fixture(self):
        compared = json.loads(self.args.comparison.read_text())
        retained = json.loads(self.args.retention.read_text())
        return {
            'status': 'FULL_AUDIT_COMPLETE',
            'final_candidate': 10,
            'extractor_source_fingerprint': compared['source_tree_sha256'],
            'oracle_freeze_sha256': compared['oracle_freeze_sha256'],
            'canonical': compared['counts'],
            'supplementary_retention': retained['counts'],
            'remaining_source_limit': 'Synthetic report fixture; no production acceptance.',
            'remote_integration': True,
            'hosted_ci_dispatched': True,
            'published_or_deployed': False,
            'new_api_keys_or_paid_services': False,
            'integration_continuation': {
                'state': 'READY',
                'github_ci': 'PASS',
                'merged_source_sha': 'a' * 40,
                'ci_runs': [123456789],
                'blockers': [],
            },
        }

    def render_audit(self, audit):
        self.args.audit_receipt = write(self.root / 'audit.json', audit)
        self.report.build(self.args)
        return json.loads(self.args.output.read_text())

    def test_missing_integration_receipt_does_not_invent_an_old_block_or_unused_ci(self):
        self.report.build(self.args)
        result = json.loads(self.args.output.read_text())
        self.assertEqual(result['integration_state'], 'UNKNOWN')
        self.assertFalse(result['integration_ready'])
        self.assertNotIn('user rejected', result['integration_status'])
        self.assertNotIn('dispatched no hosted CI', result['cost_boundary'])
        self.assertIn('Hosted CI use is not recorded', result['cost_boundary'])

    def test_complete_ready_receipt_supersedes_historical_write_rejection_without_deployment_claim(self):
        audit = self.audit_fixture()
        audit['historical_remote_write_block'] = 'user rejected MCP tool call'
        result = self.render_audit(audit)
        self.assertTrue(result['integration_ready'])
        self.assertEqual(result['integration_state'], 'READY')
        self.assertIn('a' * 40, result['integration_status'])
        self.assertIn('123456789', result['integration_status'])
        self.assertNotIn('integration BLOCKED', result['final_audit_summary'])
        self.assertNotIn('user rejected', result['integration_status'])
        self.assertIn('not proof of production deployment', result['integration_status'])
        self.assertIn('records hosted GitHub CI', result['cost_boundary'])
        self.assertIn('records no publication or deployment', result['cost_boundary'])

    def test_pending_current_ci_is_not_promoted_by_a_recorded_merge(self):
        audit = self.audit_fixture()
        audit['integration_continuation'].update(state='TESTING', github_ci='PENDING')
        result = self.render_audit(audit)
        self.assertFalse(result['integration_ready'])
        self.assertEqual(result['integration_state'], 'TESTING')
        self.assertIn('PENDING', result['integration_status'])
        self.assertIn('records hosted GitHub CI', result['cost_boundary'])

    def test_ready_label_requires_complete_typed_merge_and_ci_evidence(self):
        invalid = [
            ('remote integration missing', 'root', 'remote_integration', None),
            ('remote integration is a string', 'root', 'remote_integration', 'true'),
            ('merge missing', 'continuation', 'merged_source_sha', None),
            ('merge shortened', 'continuation', 'merged_source_sha', 'abcdef0'),
            ('merge placeholder', 'continuation', 'merged_source_sha', '0' * 40),
            ('merge is not hex', 'continuation', 'merged_source_sha', 'g' * 40),
            ('CI status missing', 'continuation', 'github_ci', None),
            ('CI runs missing', 'continuation', 'ci_runs', None),
            ('CI runs empty', 'continuation', 'ci_runs', []),
            ('CI run zero', 'continuation', 'ci_runs', [0]),
            ('CI run negative', 'continuation', 'ci_runs', [-1]),
            ('CI run boolean', 'continuation', 'ci_runs', [True]),
            ('CI run string', 'continuation', 'ci_runs', ['123456789']),
            ('blockers missing', 'continuation', 'blockers', None),
            ('blocker remains', 'continuation', 'blockers', ['Fresh-source acceptance failed']),
        ]
        for label, container, key, value in invalid:
            with self.subTest(label=label):
                audit = self.audit_fixture()
                target = audit if container == 'root' else audit['integration_continuation']
                target[key] = value
                result = self.render_audit(audit)
                self.assertFalse(result['integration_ready'])
                self.assertNotEqual(result['integration_state'], 'READY')
                self.assertIn('not established', result['integration_status'])

    def test_failed_current_ci_and_blockers_remain_visible(self):
        audit = self.audit_fixture()
        audit['integration_continuation'].update(
            github_ci='FAILED', blockers=['Public-source parity failed'])
        result = self.render_audit(audit)
        self.assertFalse(result['integration_ready'])
        self.assertEqual(result['integration_state'], 'BLOCKED')
        self.assertIn('FAILED', result['integration_status'])
        self.assertIn('Public-source parity failed', result['integration_status'])

    def test_legacy_or_malformed_status_container_cannot_establish_ready(self):
        for continuation in (None, [], 'READY', {'state': 'READY'}):
            with self.subTest(continuation=continuation):
                audit = self.audit_fixture()
                audit['status'] = 'READY'
                audit['integration_continuation'] = continuation
                result = self.render_audit(audit)
                self.assertFalse(result['integration_ready'])
                self.assertNotEqual(result['integration_state'], 'READY')

    def test_cost_and_publication_statements_follow_explicit_flags_only(self):
        audit = self.audit_fixture()
        audit['new_api_keys_or_paid_services'] = True
        audit['published_or_deployed'] = True
        del audit['hosted_ci_dispatched']
        result = self.render_audit(audit)
        self.assertIn('records new API keys or paid services', result['cost_boundary'])
        self.assertIn('records publication or deployment', result['cost_boundary'])
        self.assertIn('does not independently verify it', result['cost_boundary'])
        self.assertIn('Hosted CI use is not recorded', result['cost_boundary'])
        self.assertNotIn('records no new API', result['cost_boundary'])
        self.assertNotIn('records no publication', result['cost_boundary'])

    def test_ready_receipt_still_requires_original_source_oracle_and_score_bindings(self):
        for key, changed, message in (
            ('extractor_source_fingerprint', 'f' * 64, 'Final audit source differs'),
            ('oracle_freeze_sha256', 'f' * 64, 'Final audit oracle differs'),
            ('canonical', {'cases': 0}, 'Final audit scores differ'),
            ('supplementary_retention', {'additional_assertions': 0}, 'Final audit scores differ'),
        ):
            with self.subTest(key=key):
                audit = self.audit_fixture()
                audit[key] = changed
                with self.assertRaisesRegex(AssertionError, message):
                    self.render_audit(audit)


    def review_receipt_fixture(self):
        before = json.loads(self.args.baseline_replay.read_text())['records']
        after = copy.deepcopy(before)
        after[0]['output']['source_facts'] = [{'value': 'Source-supported additional locality'}]
        def case_hash(row):
            return hashlib.sha256(json.dumps({key: value for key, value in row.items() if key != 'elapsed_ms'},
                                             ensure_ascii=False, sort_keys=True,
                                             separators=(',', ':')).encode('utf-8')).hexdigest()
        case_id = before[0]['case_id']
        audit = self.audit_fixture()
        audit.update({
            'status': 'FROZEN_BENCHMARK_PASS_WITH_REVIEWED_CHANGES',
            'final_candidate': 12,
            'complete_case_equivalence': {'cases': 603, 'changed_cases': 1, 'ignored': ['elapsed_ms']},
            'all_complete_case_outputs_calls_equal': False,
            'actual_client_exports_equal': 602, 'offline_helper_exports_passed': 603,
            'export_verification': {'cases': 603, 'current_snapshot_download_passed': 603,
                                    'snapshot_blob_bytes_verified': True, 'client_module_sha256': 'c' * 64,
                                    'unchanged_from_c8': 602, 'changed_from_c8': 1, 'offline_exports_passed': 603},
            'reviewed_changes': {'status': 'ACCEPTED', 'reviewed_cases': 1, 'reviewed_export_changes': 1,
                                 'unlisted_case_changes_permitted': False, 'zero_loss_requirements_waived': False,
                                 'manifest': {'file': 'docs/audits/reviewed-fixture.json', 'sha256': 'd' * 64}},
            'reviewed_change_cases': [{'case_id': case_id, 'before_case_sha256': case_hash(before[0]),
                                      'after_case_sha256': case_hash(after[0]),
                                      'before_export_sha256': 'a' * 64, 'after_export_sha256': 'b' * 64}]})
        return audit, before, after

    def test_reviewed_change_summary_separates_current_export_fidelity_from_c8_equality(self):
        audit, before, after = self.review_receipt_fixture()
        result = self.report.benchmark_review_evidence(audit, before, after)
        self.assertIn('603 / 603 valid current client snapshot and Blob downloads', result['summary'])
        self.assertIn('602 exports are unchanged from C8 and 1 differ', result['summary'])
        self.assertIn('1 complete case outputs/call records', result['summary'])
        self.assertIn('d' * 64, result['summary'])
        self.assertFalse(result['all_complete_case_records_equal'])
        self.assertEqual(len(result['reviewed_case_hashes']), 1)
        self.assertNotIn('603 exports are unchanged', result['summary'])

    def test_reviewed_change_report_rejects_omitted_cases_changed_hashes_and_inflated_equal_count(self):
        audit, before, after = self.review_receipt_fixture()
        for mutation in ('omit', 'hash', 'equal', 'wildcard', 'waive', 'missing_pin'):
            bad = copy.deepcopy(audit)
            if mutation == 'omit':
                bad['reviewed_change_cases'] = []
            elif mutation == 'hash':
                bad['reviewed_change_cases'][0]['after_case_sha256'] = 'f' * 64
            elif mutation == 'equal':
                bad['actual_client_exports_equal'] = 603
            elif mutation == 'wildcard':
                bad['reviewed_change_cases'][0]['case_id'] = '*'
            elif mutation == 'waive':
                bad['reviewed_changes']['zero_loss_requirements_waived'] = True
            else:
                del bad['reviewed_changes']['manifest']['sha256']
            with self.subTest(mutation=mutation), self.assertRaises(AssertionError):
                self.report.benchmark_review_evidence(bad, before, after)

    def test_unreviewed_changed_receipt_is_not_presented_as_accepted(self):
        audit, before, after = self.review_receipt_fixture()
        audit['reviewed_changes'] = {'status': 'NOT_PROVIDED'}
        audit['status'] = 'FROZEN_BENCHMARK_REVIEW_REQUIRED'
        result = self.report.benchmark_review_evidence(audit, before, after)
        self.assertIn('no reviewed-change manifest is accepted', result['summary'])
        self.assertEqual(result['reviewed_case_hashes'], [])
        self.assertEqual(result['observed_changed_case_ids'], [before[0]['case_id']])
        self.assertEqual(result['recorded_benchmark_status'], 'FROZEN_BENCHMARK_REVIEW_REQUIRED')

    def test_reviewed_report_rejects_actual_unreviewed_source_fact_or_call_changes(self):
        audit, before, after = self.review_receipt_fixture()
        for key, value in (('calls', ['unreviewed']), ('fixture_calls', ['unreviewed']),
                           ('output', {'ok': True, 'source_facts': [{'value': 'different unreviewed source'}]})):
            current = copy.deepcopy(after)
            current[0][key] = value
            with self.subTest(key=key), self.assertRaisesRegex(AssertionError, 'whole-case hashes'):
                self.report.benchmark_review_evidence(audit, before, current)

    def test_report_does_not_invent_export_fidelity_from_missing_legacy_receipt_fields(self):
        audit = self.audit_fixture()
        result = self.report.benchmark_review_evidence(audit)
        self.assertIn('not recorded', result['summary'])
        audit['actual_client_exports_equal'] = 603
        result = self.report.benchmark_review_evidence(audit)
        self.assertIn('603 client exports equal to C8', result['summary'])
        self.assertIn('not separately summarized', result['summary'])
        self.assertIsNone(result['recorded_export_fidelity'])



    def test_complete_report_build_keeps_reviewed_deltas_and_current_export_fidelity_visible(self):
        audit, before, after = self.review_receipt_fixture()
        original_replay = json.loads(self.args.replay.read_text())
        self.args.baseline_replay = write(self.root / 'baseline-replay-distinct.json',
                                         {**original_replay, 'records': before})
        write(self.args.replay, {**original_replay, 'records': after})
        for path, replay_path in ((self.args.baseline, self.args.baseline_replay),
                                  (self.args.comparison, self.args.replay),
                                  (self.args.retention, self.args.replay)):
            value = json.loads(path.read_text())
            value['replay_sha256'] = digest(replay_path)
            write(path, value)
        result = self.render_audit(audit)
        review = result['benchmark_review']
        self.assertEqual(review['observed_changed_case_ids'], [before[0]['case_id']])
        self.assertEqual(len(review['reviewed_case_hashes']), 1)
        self.assertIn('603 / 603 valid current client snapshot and Blob downloads', review['summary'])
        self.assertIn('602 exports are unchanged from C8 and 1 differ', review['summary'])
        self.assertIn('not proof of production deployment', result['integration_status'])



if __name__ == '__main__':
    unittest.main()
