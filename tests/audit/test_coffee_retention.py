import importlib.util
import hashlib
import io
import json
import pathlib
import tempfile
import unittest
from unittest import mock

SCRIPT = pathlib.Path(__file__).resolve().parents[2] / 'scripts/audit/coffee-corpus-retention.py'
SPEC = importlib.util.spec_from_file_location('coffee_retention', SCRIPT)
audit = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(audit)


class RetentionVerifierTest(unittest.TestCase):
    def score(self, evidence, facts, source=None, capture='product-endpoint', mutate=None, receipt=False):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            repo, corpus = root / 'repo', root / 'corpus'
            directory = corpus / 'cases/case'
            directory.mkdir(parents=True)
            (repo / 'docs/audits').mkdir(parents=True)
            (repo / 'scripts/audit').mkdir(parents=True)
            (repo / 'scripts/audit/coffee-corpus-retention.py').write_bytes(SCRIPT.read_bytes())
            source = {'price': 12, 'variants': [{'price': 12}, {'price': 15}]} if source is None else source
            raw = json.dumps(source).encode()
            (directory / 'source.json').write_bytes(raw)
            request = {'label': capture, 'url': 'https://r.example/current.js',
                       'final_url': 'https://r.example/observed-final.js', 'status': 200,
                       'file': 'source.json', 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}
            packet = {'id': 'case', 'roaster_id': 'roaster', 'source_url': request['url'], 'requests': [request]}
            packet_path = directory / 'source-packet.json'
            packet_path.write_text(json.dumps(packet))
            oracle = [{'case_id': 'case', 'roaster_id': 'roaster', 'source_url': request['url'],
                       'additional_facts': [{'label': 'Test source fact', 'value': 12, 'evidence': [evidence]}]}]
            raw = json.dumps(oracle).encode()
            (repo / 'docs/audits/oracle.json').write_bytes(raw)
            frozen = [{'kind': 'source_oracle', 'path': 'oracle.json', 'sha256': hashlib.sha256(raw).hexdigest()}]
            documents = [('manifest.json', 'selection_manifest', {'roasters': [{'id': 'roaster', 'selected_urls': [request['url']]}]}),
                         ('frozen-source-hashes.json', 'source_hash_index', [{**{k: request[k] for k in ['file', 'sha256', 'bytes', 'status']}, 'case_id': 'case'}])]
            for name, kind, data in documents:
                raw = json.dumps(data).encode()
                (corpus / name).write_bytes(raw)
                frozen.append({'kind': kind, 'path': name, 'sha256': hashlib.sha256(raw).hexdigest()})
            freeze_path = corpus / 'oracle-freeze.json'
            freeze_path.write_text(json.dumps({'files': frozen}))
            attestation = {'source_archive_sha256': 'a' * 64, 'attestation_created_after_oracle_freeze': True,
                'packets': [{'id': 'case', 'path': 'extractor-600/cases/case/source-packet.json',
                    'bytes': packet_path.stat().st_size, 'sha256': hashlib.sha256(packet_path.read_bytes()).hexdigest()}]}
            attestation_path = corpus / 'original-archive-packet-attestation.json'
            attestation_path.write_text(json.dumps(attestation))
            attestation_sha = hashlib.sha256(attestation_path.read_bytes()).hexdigest()
            replay, output = root / 'replay.json', root / 'output.json'
            replay_data = {'oracle_freeze_sha256': hashlib.sha256(freeze_path.read_bytes()).hexdigest(),
                'source_tree_sha256': 'b' * 64, 'records': [{'case_id': 'case', 'roaster_id': 'roaster',
                    'source_url': request['url'], 'output': {'source_facts': facts}}]}
            replay.write_text(json.dumps(replay_data))
            if mutate:
                mutate({'replay': replay, 'replay_data': replay_data, 'packet': packet, 'packet_path': packet_path,
                        'request': request, 'source_path': directory / 'source.json'})
            with mock.patch.object(audit, '__file__', str(repo / 'scripts/audit/coffee-corpus-retention.py')), \
                 mock.patch.object(audit, 'PACKET_ATTESTATION_SHA256', attestation_sha, create=True), \
                 mock.patch('sys.stdout', new_callable=io.StringIO):
                audit.run(corpus, replay, output)
            result = json.loads(output.read_text())
            return result if receipt else result['records'][0]['checks'][0]['status']

    def test_json_numbers_and_booleans_have_correct_type_semantics(self):
        self.assertTrue(audit.equal({'aspect_ratio': 1.0, 'price': 2495}, {'price': 2495.0, 'aspect_ratio': 1}))
        self.assertFalse(audit.equal(True, 1))
        self.assertFalse(audit.equal(False, 0))
        self.assertFalse(audit.equal('2495', 2495))
        self.assertFalse(audit.equal({'price': 2495, 'available': False}, {'price': 2495}))

    def test_literal_pointer_and_jsonpath_resolve_the_same_source_node(self):
        self.assertEqual(audit.pointer_path('$.variants[2].price'), '/variants/2/price')
        self.assertEqual(audit.pointer_path('/variants/2/price'), '/variants/2/price')
        self.assertEqual(audit.pointer({'variants': [{'price': 0}]}, '/variants/0/price'), (True, 0))
        self.assertEqual(audit.pointer({'a/b': {'~': None}}, '/a~1b/~0'), (True, None))
        self.assertEqual(audit.pointer({'': {'price': 12}}, '//price'), (True, 12))
        for path in ['$..price', '$.variants[*]', '$.x[?(@.price)]', 'eval("x")']:
            self.assertEqual(audit.pointer_path(path), '')

    def test_chunks_reconstruct_only_with_complete_sequence_and_one_source(self):
        rows = [
            {'source_url': 'https://r.example/p.js', 'source_path': '/variants/0', 'format': 'json', 'part': 0, 'value': '{"price":'},
            {'source_url': 'https://r.example/p.js', 'source_path': '/variants/0', 'format': 'json', 'part': 1, 'value': '0,"available":false}'},
        ]
        self.assertEqual(audit.structured_records(rows)[0]['value'], {'price': 0, 'available': False})
        self.assertEqual(audit.structured_records(rows[:1]), [])
        self.assertEqual(audit.structured_records([rows[1]]), [])
        self.assertEqual(audit.structured_records([rows[0], {**rows[1], 'source_url': 'https://different.example/p.js'}]), [])
        self.assertEqual(audit.structured_records(rows + [rows[0]]), [])

    def test_text_normalization_preserves_numbers_and_different_words(self):
        self.assertEqual(audit.normalized('Bourbon&nbsp;Ají — 1,500 m'), 'bourbon ají - 1,500 m')
        self.assertNotEqual(audit.normalized('1,500 m'), audit.normalized('1,600 m'))
        self.assertNotEqual(audit.normalized('Bourbon'), audit.normalized('Bourbon Ají'))

    def test_json_retention_requires_the_exact_observed_capture_url(self):
        evidence = {'capture_id': 'product-endpoint', 'locator': '/price', 'quote': '12', 'quote_format': 'json_value'}
        fact = {'label': 'Price', 'format': 'json', 'source_path': '/price', 'value': '12'}
        for url in ['https://r.example/other.js', 'https://unrelated.example/current.js', None]:
            self.assertEqual(self.score(evidence, [{**fact, 'source_url': url}]), 'unconfirmed')
        for url in ['https://r.example/current.js', 'https://r.example/observed-final.js']:
            self.assertEqual(self.score(evidence, [{**fact, 'source_url': url}]), 'all_evidence_retained')

    def test_missing_or_invalid_original_pointer_never_passes_from_a_matching_quote(self):
        for locator in ['/weight', '$..price', '/variants/-1/price']:
            evidence = {'capture_id': 'product-endpoint', 'locator': locator, 'quote': '12', 'quote_format': 'json_value'}
            fact = {'label': 'Unproven source value', 'format': 'json', 'source_path': locator,
                    'value': '12', 'source_url': 'https://r.example/current.js'}
            self.assertEqual(self.score(evidence, [fact]), 'unconfirmed')
        self.assertEqual(audit.pointer({'variants': [12, 15]}, '/variants/-1'), (False, None))

    def test_text_cannot_stitch_unrelated_fields_or_cross_capture_urls(self):
        evidence = {'capture_id': 'page', 'quote': 'washed for 48 hours'}
        facts = [{'label': 'Description', 'value': 'washed for', 'source_url': 'https://r.example/current.js'},
                 {'label': 'Shipping', 'value': '48 hours', 'source_url': 'https://r.example/current.js'}]
        self.assertEqual(self.score(evidence, facts, capture='page'), 'unconfirmed')
        other = [{'label': 'Description', 'value': evidence['quote'], 'source_url': 'https://r.example/other.js'}]
        self.assertEqual(self.score(evidence, other, capture='page'), 'unconfirmed')

    def test_structured_projections_and_references_cannot_pass_as_literal_text(self):
        evidence = {'capture_id': 'page', 'quote': 'washed for 48 hours'}
        for format_name in ['json', 'projection', 'reference']:
            fact = {'label': 'Published purchase data', 'format': format_name,
                    'source_path': '/variants/0', 'value': '{"note":"washed for 48 hours"}',
                    'source_url': 'https://r.example/current.js'}
            with self.subTest(format_name=format_name):
                self.assertEqual(self.score(evidence, [fact], capture='page'), 'unconfirmed')

    def test_html_attribute_json_namespace_cannot_replace_an_original_document_pointer(self):
        evidence = {'capture_id': 'product-endpoint', 'locator': '/price',
                    'quote': '12', 'quote_format': 'json_value'}
        fact = {'label': 'Price', 'format': 'json', 'source_path': '/price', 'value': '12',
                'source_url': 'https://r.example/current.js',
                'source_locator': 'form[data-product_variations][data-product_id="123"]'}
        self.assertEqual(self.score(evidence, [fact]), 'unconfirmed')
        projection = {**fact, 'format': 'projection'}
        self.assertEqual(self.score(evidence, [projection]), 'unconfirmed')

    def projected_variants(self):
        source = {'variants': [
            {'title': 'Whole', 'price': 12, 'available': False, 'plans': [{'price': 0, 'maximum': None}]},
            {'title': 'Ground', 'price': 15, 'available': True, 'plans': [{'price': 0, 'maximum': None}]},
        ]}
        facts = []
        for index, variant in enumerate(source['variants']):
            facts.append({'label': 'Variant fields', 'format': 'projection', 'source_path': '/variants/' + str(index),
                          'value': json.dumps({k: v for k, v in variant.items() if k != 'plans'}),
                          'source_url': 'https://r.example/current.js'})
        facts += [
            {'label': 'First plans', 'format': 'json', 'source_path': '/variants/0/plans',
             'value': json.dumps(source['variants'][0]['plans']), 'source_url': 'https://r.example/current.js'},
            {'label': 'Second plans', 'format': 'reference', 'source_path': '/variants/1/plans',
             'value': json.dumps({'source_path': '/variants/0/plans'}), 'source_url': 'https://r.example/current.js'},
        ]
        return source, facts

    def test_lossless_projection_children_and_references_require_exact_original_typed_objects(self):
        source, facts = self.projected_variants()
        for locator in ['/variants/0', '/variants/1', '/variants']:
            evidence = {'capture_id': 'product-endpoint', 'locator': locator, 'quote_format': 'json_value'}
            self.assertEqual(self.score(evidence, facts, source=source), 'all_evidence_retained')
        evidence = {'capture_id': 'product-endpoint', 'locator': '/variants/1', 'quote_format': 'json_value'}
        changed = [{**fact, 'value': fact['value'].replace('15', '999')} for fact in facts]
        self.assertEqual(self.score(evidence, changed, source=source), 'unconfirmed')

    def test_partial_projection_and_incomplete_child_chunks_never_pass_as_whole_original(self):
        source, facts = self.projected_variants()
        evidence = {'capture_id': 'product-endpoint', 'locator': '/variants/1', 'quote_format': 'json_value'}
        for changed in [facts[:2], facts[:3],
                        [facts[0], facts[1], {**facts[2], 'part': 1}, facts[3]],
                        [*facts, facts[2]],
                        [facts[0], {**facts[1], 'value': '[]'}, facts[2], facts[3]]]:
            self.assertEqual(self.score(evidence, changed, source=source), 'unconfirmed')

    def grouped_variants(self):
        source, facts = self.projected_variants()
        source['variants'].append({**source['variants'][1], 'title': 'Third', 'price': 18})
        facts.insert(2, {**facts[1], 'source_path': '/variants/2',
                        'value': json.dumps({k: v for k, v in source['variants'][2].items() if k != 'plans'})})
        facts[-1]['value'] = json.dumps({'source_path': '/variants/0/plans',
                                        'destinations': ['/variants/1/plans', '/variants/2/plans']})
        return source, facts

    def test_grouped_references_reconstruct_only_the_exact_explicit_original_destinations(self):
        source, facts = self.grouped_variants()
        for locator in ['/variants', '/variants/0', '/variants/1', '/variants/2', '/variants/2/plans']:
            evidence = {'capture_id': 'product-endpoint', 'locator': locator, 'quote_format': 'json_value'}
            self.assertEqual(self.score(evidence, facts, source=source), 'all_evidence_retained')
        source['variants'][2]['plans'] = [{'price': True, 'maximum': None}]
        evidence = {'capture_id': 'product-endpoint', 'locator': '/variants/2', 'quote_format': 'json_value'}
        self.assertEqual(self.score(evidence, facts, source=source), 'unconfirmed')

    def test_grouped_reference_invalid_shape_bounds_and_alias_namespaces_are_not_retention(self):
        source, facts = self.grouped_variants()
        evidence = {'capture_id': 'product-endpoint', 'locator': '/variants', 'quote_format': 'json_value'}
        target = '/variants/0/plans'
        invalid = [
            {'source_path': target, 'destinations': ['/variants/1/plans']},
            {'source_path': target, 'destinations': ['/variants/2/plans', '/variants/1/plans']},
            {'source_path': target, 'destinations': ['/variants/1/plans', '/variants/1/plans']},
            {'source_path': target, 'destinations': ['/variants/1/plans', target]},
            {'source_path': target, 'destinations': ['/variants/1/plans', '/hasVariant/2/plans']},
            {'source_path': target, 'destinations': ['/variants/1/plans', '/variants/2/image']},
            {'source_path': target, 'destinations': ['/variants/1/plans', '/variants/128/plans']},
            {'source_path': target, 'destinations': ['/variants/1/plans', '/variants/02/plans']},
            {'source_path': target, 'destinations': ['/variants/1/plans', {'path': '/variants/2/plans'}]},
            {'source_path': target, 'destinations': ['/variants/1/plans', '/variants/2/plans'], 'source_url': 'https://other.example/'},
            {'source_path': target, 'destinations': ['/variants/1/plans', '/variants/2/plans'], 'extra': 1},
        ]
        for value in invalid:
            with self.subTest(value=value):
                changed = [*facts[:-1], {**facts[-1], 'value': json.dumps(value)}]
                self.assertEqual(self.score(evidence, changed, source=source), 'unconfirmed')

    def test_grouped_references_require_complete_literal_target_and_no_alias_collisions(self):
        source, facts = self.grouped_variants()
        evidence = {'capture_id': 'product-endpoint', 'locator': '/variants', 'quote_format': 'json_value'}
        target, group = facts[-2:]
        collisions = [
            [*facts[:-2], {**target, 'source_url': 'https://r.example/other.js'}, group],
            [*facts[:-2], {**target, 'source_locator': 'form[data-product_id="9"]'}, group],
            [*facts[:-2], {**target, 'part': 1}, group],
            [*facts[:-2], {**target, 'format': 'projection'}, group],
            [*facts, {**target, 'source_path': '/variants/2/plans'}],
            [*facts, group],
            [*facts, {**group, 'source_path': '/variants/2/plans', 'value': json.dumps({
                'source_path': '/variants/0/plans', 'destinations': ['/variants/2/plans', '/variants/3/plans']})}],
        ]
        for changed in collisions:
            self.assertEqual(self.score(evidence, changed, source=source), 'unconfirmed')

    def test_reference_namespace_cycles_wrong_paths_and_conflicting_children_fail_closed(self):
        source, facts = self.projected_variants()
        evidence = {'capture_id': 'product-endpoint', 'locator': '/variants/1', 'quote_format': 'json_value'}
        cases = [
            [facts[0], facts[1], {**facts[2], 'source_url': 'https://r.example/other.js'}, facts[3]],
            [facts[0], facts[1], {**facts[2], 'source_locator': 'form[data-product_variations][data-product_id="1"]'}, facts[3]],
            [facts[0], facts[1], facts[2], {**facts[3], 'value': '{"source_path":"/missing"}'}],
            [facts[0], facts[1], facts[2], {**facts[3], 'value': '{"source_path":"/variants/0/plans","source_url":"https://other.example/"}'}],
            [facts[0], facts[1], {**facts[2], 'format': 'reference', 'value': '{"source_path":"/variants/1/plans"}'}, facts[3]],
            [facts[0], {**facts[1], 'value': json.dumps(source['variants'][1])}, facts[2], facts[3]],
        ]
        for changed in cases:
            self.assertEqual(self.score(evidence, changed, source=source), 'unconfirmed')

    def supported_text_status(self, facts, quote='washed for 48 hours'):
        captures = [{'label': 'page', 'urls': {'https://r.example/product'}},
                    {'label': 'product-endpoint', 'urls': {'https://r.example/product.js'}}]
        return audit.retained_evidence({'capture_id': 'page', 'quote': quote}, captures, [], audit.text_records(facts))['status']

    def test_explicit_supporting_text_sources_preserve_exact_observed_capture_attribution(self):
        fact = {'label': 'Product description', 'value': 'washed for 48 hours',
                'source_type': 'product_json', 'source_url': 'https://r.example/product.js',
                'supporting_sources': [{'source_url': 'https://r.example/product', 'source_type': 'html'}]}
        self.assertEqual(self.supported_text_status([fact]), 'source_quote_retained')
        without = {k: v for k, v in fact.items() if k != 'supporting_sources'}
        self.assertEqual(self.supported_text_status([without]), 'unconfirmed')
        for support in [[], [{'source_url': 'https://r.example/other', 'source_type': 'html'}],
                        [{'source_url': 'https://unobserved.example/product', 'source_type': 'html'}],
                        [{'source_url': 'http://r.example/product', 'source_type': 'html'}],
                        [{'source_url': 'https://user:secret@r.example/product', 'source_type': 'html'}],
                        [{'source_url': 'https://r.example/product', 'source_type': 'invented'}],
                        {'source_url': 'https://r.example/product', 'source_type': 'html'}]:
            self.assertEqual(self.supported_text_status([{**fact, 'supporting_sources': support}]), 'unconfirmed')
        self.assertEqual(self.supported_text_status([{**fact, 'source_url': 'https://invented.example/product'}]), 'unconfirmed')
        self.assertEqual(self.supported_text_status([{**fact, 'source_url': None}]), 'unconfirmed')

    def test_support_cannot_be_borrowed_across_differently_attributed_continuation_chunks(self):
        support = [{'source_url': 'https://r.example/product', 'source_type': 'html'}]
        first = {'label': 'Product description', 'value': 'washed for', 'source_type': 'product_json',
                 'source_url': 'https://r.example/product.js', 'supporting_sources': support}
        second = {'label': 'Product description (continued 2)', 'value': '48 hours', 'source_type': 'product_json',
                  'source_url': 'https://r.example/product.js'}
        self.assertEqual(self.supported_text_status([first, second]), 'unconfirmed')
        self.assertEqual(self.supported_text_status([first, {**second, 'supporting_sources': support}]), 'source_quote_retained')
        self.assertEqual(self.supported_text_status([first, {**second, 'supporting_sources': support, 'section': 'Other recipe'}]), 'unconfirmed')

    def test_explicit_continuous_text_chunks_and_direct_label_value_pairs_are_retained(self):
        evidence = {'capture_id': 'page', 'quote': 'washed for 48 hours'}
        facts = [{'label': 'Published product text', 'value': 'washed for', 'source_url': 'https://r.example/current.js'},
                 {'label': 'Published product text (continued 2)', 'value': '48 hours', 'source_url': 'https://r.example/current.js'}]
        self.assertEqual(self.score(evidence, facts, capture='page'), 'all_evidence_retained')
        self.assertEqual(self.score(evidence, [facts[0], {**facts[1], 'label': 'Published product text (continued 3)'}], capture='page'), 'unconfirmed')
        self.assertEqual(self.score(evidence, [facts[0], {**facts[1], 'section': 'Different coffee'}], capture='page'), 'unconfirmed')
        label = {'capture_id': 'page', 'quote': 'Fermentation: 48 hours'}
        self.assertEqual(self.score(label, [{'label': 'Fermentation', 'value': '48 hours', 'source_url': 'https://r.example/current.js'}], capture='page'), 'all_evidence_retained')

    def test_complete_array_members_keep_original_order_cardinality_and_capture(self):
        evidence = {'capture_id': 'product-endpoint', 'locator': '/variants', 'quote': '[]', 'quote_format': 'json_value'}
        facts = [{'label': 'Variant', 'format': 'json', 'source_path': '/variants/'+str(i),
                  'value': json.dumps({'price': price}), 'source_url': 'https://r.example/current.js'} for i, price in enumerate([12, 15])]
        self.assertEqual(self.score(evidence, facts), 'all_evidence_retained')
        self.assertEqual(self.score(evidence, facts[:1]), 'unconfirmed')
        self.assertEqual(self.score(evidence, [facts[0], {**facts[1], 'source_url': 'https://r.example/other.js'}]), 'unconfirmed')
        self.assertEqual(self.score(evidence, [*facts, {**facts[1], 'source_path': '/variants/2'}]), 'unconfirmed')

    def test_duplicate_or_wrong_identity_replay_rows_are_rejected(self):
        evidence = {'capture_id': 'product-endpoint', 'locator': '/price', 'quote': '12', 'quote_format': 'json_value'}
        for kind in ['duplicate', 'roaster_id', 'source_url']:
            def drift(fixture):
                data = fixture['replay_data']
                if kind == 'duplicate':
                    data['records'].append(data['records'][0])
                else:
                    data['records'][0][kind] = 'different'
                fixture['replay'].write_text(json.dumps(data))
            with self.subTest(kind=kind), self.assertRaisesRegex(ValueError, 'identity|unique'):
                self.score(evidence, [], mutate=drift)

    def test_replay_from_a_different_oracle_freeze_is_rejected(self):
        def drift(fixture):
            fixture['replay_data']['oracle_freeze_sha256'] = '0' * 64
            fixture['replay'].write_text(json.dumps(fixture['replay_data']))
        with self.assertRaisesRegex(ValueError, 'oracle freeze'):
            self.score({}, [], mutate=drift)

    def test_joint_packet_and_capture_replacement_cannot_change_frozen_source(self):
        def drift(fixture):
            changed = b'{"price":999}'
            fixture['source_path'].write_bytes(changed)
            fixture['request'].update(sha256=hashlib.sha256(changed).hexdigest(), bytes=len(changed))
            fixture['packet_path'].write_text(json.dumps(fixture['packet']))
        with self.assertRaisesRegex(ValueError, 'frozen|archive'):
            self.score({}, [], mutate=drift)

    def test_packet_url_metadata_requires_the_original_archive_attestation(self):
        def drift(fixture):
            fixture['request']['final_url'] = 'https://other.example/changed.js'
            fixture['packet_path'].write_text(json.dumps(fixture['packet']))
        with self.assertRaisesRegex(ValueError, 'archive packet'):
            self.score({}, [], mutate=drift)

    def test_receipt_identifies_the_exact_frozen_assertion_and_inputs(self):
        evidence = {'capture_id': 'product-endpoint', 'locator': '/price', 'quote': '12', 'quote_format': 'json_value'}
        result = self.score(evidence, [], receipt=True)
        for key in ['oracle_freeze_sha256', 'replay_sha256', 'retention_script_sha256', 'packet_archive_attestation_sha256']:
            self.assertRegex(result[key], r'^[a-f0-9]{64}$')
        check = result['records'][0]['checks'][0]
        self.assertEqual(check['assertion_index'], 0)
        self.assertEqual(check['expected'], 12)
        self.assertEqual(check['frozen_evidence'], [evidence])
        self.assertTrue(result['packet_attestation_created_after_oracle_freeze'])


if __name__ == '__main__':
    unittest.main()
