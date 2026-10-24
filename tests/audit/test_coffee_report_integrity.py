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


if __name__ == '__main__':
    unittest.main()
