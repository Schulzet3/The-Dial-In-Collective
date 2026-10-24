#!/usr/bin/env python3
"""Freeze the independently annotated corpus before executing the extractor.

This script only reads source captures and manual oracles. It imports no
application code and cannot produce expectations from extractor output.
"""
import collections
import datetime
import hashlib
import json
import pathlib
import sys

root = pathlib.Path(sys.argv[1]).resolve()
repo = pathlib.Path(sys.argv[2]).resolve()
target = root / 'oracle-freeze.json'
if target.exists():
    raise SystemExit('A global freeze already exists; preserve it rather than refreezing after a replay.')
sha = lambda data: hashlib.sha256(data).hexdigest()
manifest_path = root / 'manifest.json'
manifest = json.loads(manifest_path.read_text())
expected = {url: row['id'] for row in manifest['roasters'] for url in row['selected_urls']}
assert len(manifest['roasters']) >= 200
assert all(len(set(row['selected_urls'])) == 3 for row in manifest['roasters'])
assert len(expected) == len(manifest['roasters']) * 3
files = [{'path': str(manifest_path), 'sha256': sha(manifest_path.read_bytes()), 'kind': 'selection_manifest'}]
records = []
for cohort in ['a', 'b', 'c', 'root', 'root-extra-c']:
    p = repo / f'docs/audits/extractor-600-oracle-{cohort}.json'
    raw = p.read_bytes()
    rows = json.loads(raw)
    assert isinstance(rows, list)
    assert all(row['review']['extractor_outputs_seen'] is False for row in rows)
    records.extend(rows)
    files.append({'path': str(p), 'sha256': sha(raw), 'kind': 'source_oracle', 'cohort': cohort, 'case_count': len(rows)})
assert len({row['case_id'] for row in records}) == len(records) == len(expected)
assert {row['source_url']: row['roaster_id'] for row in records} == expected
assert all(n == 3 for n in collections.Counter(row['roaster_id'] for row in records).values())
sources = []
for row in records:
    case = root / 'cases' / row['case_id']
    packet = json.loads((case / 'source-packet.json').read_text())
    assert packet['source_url'] == row['source_url']
    for request in packet['requests']:
        if request.get('file'):
            raw = (case / request['file']).read_bytes()
            assert sha(raw) == request['sha256'], (row['case_id'], request['file'])
            sources.append({'case_id': row['case_id'], 'file': request['file'], 'sha256': request['sha256'], 'bytes': len(raw), 'status': request['status']})
capture_index = root / 'frozen-source-hashes.json'
capture_index.write_text(json.dumps(sources, indent=2) + '\n')
files.append({'path': str(capture_index), 'sha256': sha(capture_index.read_bytes()), 'kind': 'source_hash_index'})
receipt = {
    'locked_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'protocol': 'independent manual text-source oracle, locked before any per-case handler replay',
    'extractor_outputs_seen': False,
    'media_supplements_are_separate': True,
    'roaster_count': len(manifest['roasters']), 'case_count': len(records),
    'canonical_assertions': sum(len(row['canonical']) for row in records),
    'additional_facts': sum(len(row['additional_facts']) for row in records),
    'ambiguity_records': sum(len(row['ambiguities']) for row in records),
    'raw_source_hashes_verified': len(sources), 'files': files,
}
target.write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps({k: v for k, v in receipt.items() if k != 'files'}, indent=2))
print('freeze_sha256=' + sha(target.read_bytes()))
