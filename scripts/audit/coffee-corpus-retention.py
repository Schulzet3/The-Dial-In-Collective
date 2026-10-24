#!/usr/bin/env python3
"""Measure source retention separately from canonical field correctness.

The frozen oracle is never edited. A retained quote is evidence only, not a
claim that its meaning, coffee identity, variant or recipe context is correct.
JSON assertions require the original typed value at its published pointer.
Unconfirmed means this conservative verifier cannot establish retention.
"""
import collections
import hashlib
import html
import json
import pathlib
import re
import sys
import unicodedata
from urllib.parse import urlsplit

PACKET_ATTESTATION_SHA256 = '0767e52af1a5483ef31beba01d9fa70666a17de10634bb9cb1cc933a6b105556'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha256(raw):
    return hashlib.sha256(raw).hexdigest()

def normalized(value):
    text = unicodedata.normalize('NFKC', html.unescape(str(value)))
    # Keep numbers, accents and wording. Ignore layout whitespace and common
    # typographic punctuation only; do not use token overlap as a pass.
    text = text.translate(str.maketrans({'’': "'", '‘': "'", '“': '"', '”': '"', '–': '-', '—': '-', '\u00ad': ''}))
    return re.sub(r'\s+', ' ', text).strip().casefold()


def pointer(value, path):
    try:
        if not isinstance(path, str) or (path and not path.startswith('/')):
            return False, None
        for key in path[1:].split('/') if path else []:
            if re.search(r'~(?![01])', key):
                return False, None
            key = key.replace('~1', '/').replace('~0', '~')
            if isinstance(value, list):
                if not re.fullmatch(r'0|[1-9]\d*', key):
                    return False, None
                value = value[int(key)]
            elif isinstance(value, dict):
                value = value[key]
            else:
                return False, None
        return True, value
    except (KeyError, IndexError, ValueError, TypeError):
        return False, None


def equal(left, right):
    # JSON has one number type. Python's int/float distinction is incidental,
    # but its True == 1 behavior must not conflate booleans and numbers.
    if type(left) in (int, float) and type(right) in (int, float):
        return left == right
    if type(left) is not type(right):
        return False
    if isinstance(left, dict):
        return left.keys() == right.keys() and all(equal(v, right[k]) for k, v in left.items())
    if isinstance(left, list):
        return len(left) == len(right) and all(equal(a, b) for a, b in zip(left, right))
    return left == right


def pointer_path(locator):
    if locator.startswith('/'):
        return locator
    # The independent cohorts used both JSON Pointer and a simple literal
    # JSONPath notation. Resolve only named properties and array indices.
    if not re.fullmatch(r'\$(?:(?:\.[A-Za-z_][A-Za-z0-9_]*)|(?:\[\d+\]))+', locator):
        return ''
    return ''.join('/' + (name or index) for name, index in re.findall(r'\.([A-Za-z_][A-Za-z0-9_]*)|\[(\d+)\]', locator))


def structured_records(facts):
    """Decode lossless document records; original typed comparison is later.

    Projections are incomplete until every explicit direct child can be read.
    References stay in the same observed URL namespace. HTML attribute paths
    are deliberately excluded because they are not document-root pointers.
    """
    groups = collections.defaultdict(list)
    for fact in facts:
        if fact.get('format') in {'json', 'projection', 'reference'} and fact.get('source_path') and not fact.get('source_locator'):
            groups[(fact.get('source_url'), fact['source_path'])].append(fact)
    decoded, encoded = {}, {}
    for (url, path), chunks in groups.items():
        if not isinstance(path, str) or not path.startswith('/') or len(path) > 301 or re.search(r'~(?![01])', path):
            continue
        if any(type(x.get('part', 0)) is not int or x.get('part', 0) < 0 or x.get('part', 0) >= 128 for x in chunks):
            continue
        if len({x.get('format') for x in chunks}) != 1:
            continue
        chunks.sort(key=lambda x: x.get('part', 0))
        if [x.get('part', 0) for x in chunks] != list(range(len(chunks))):
            continue
        try:
            raw = ''.join(x['value'] for x in chunks)
            value = json.loads(raw)
        except (ValueError, KeyError, TypeError):
            continue
        decoded[(url, path)] = (chunks[0]['format'], value)
        encoded[(url, path)] = raw

    # A bounded list of explicit destinations shares one complete JSON child.
    # This is a lossless encoding, never a wildcard or inferred path. Validate
    # the whole group before expanding it, and retain invalid child identities
    # in `groups` so an incomplete projection cannot silently become complete.
    aliases, rejected = {}, set()

    def variant_child(path):
        if (not isinstance(path, str) or len(path) > 301
                or re.search(r'[\x00-\x20\x7f\ud800-\udfff]|~(?![01])', path)):
            return None
        match = re.fullmatch(r'(/(?:variants|hasVariant))?/(0|[1-9]\d*)/([A-Za-z0-9_.-]{1,80})', path)
        return (match[1] or '', match[3]) if match and int(match[2]) < 128 else None

    for key, (kind, value) in list(decoded.items()):
        if kind != 'reference' or not isinstance(value, dict) or 'destinations' not in value:
            continue
        destinations, target = value.get('destinations'), value.get('source_path')
        family = variant_child(target)
        valid = (set(value) == {'source_path', 'destinations'} and family is not None
                 and isinstance(destinations, list) and 2 <= len(destinations) <= 128
                 and all(variant_child(dest) == family for dest in destinations)
                 and len(set(destinations)) == len(destinations)
                 and destinations[0] == key[1] and target not in destinations
                 and len(groups[key]) == 1 and groups[key][0].get('part', 0) == 0
                 and decoded.get((key[0], target), (None,))[0] == 'json')
        try:
            valid = valid and len(encoded[key].encode('utf-16-le')) // 2 <= 1600
        except UnicodeEncodeError:
            valid = False
        if not valid:
            rejected.add(key)
            continue
        for destination in destinations:
            alias = (key[0], destination)
            if alias in aliases:
                rejected.update((key, aliases[alias][0], alias))
            if alias in groups and alias != key:
                rejected.update((key, alias))
            aliases[alias] = (key, target)

    for alias, (owner, target) in aliases.items():
        # Include aliases even when their group is rejected; parent projections
        # must fail if any published child cannot be resolved unambiguously.
        groups.setdefault(alias, [])
        if owner not in rejected and alias not in rejected:
            decoded[alias] = ('reference', {'source_path': target})
        else:
            decoded.pop(alias, None)
    for key in rejected:
        decoded.pop(key, None)

    missing, cache = object(), {}

    def resolve(key, seen=()):
        if key in seen or len(seen) >= 32:
            return missing
        if key in cache:
            return cache[key]
        if key not in decoded:
            return missing
        kind, value = decoded[key]
        if kind == 'json':
            return value
        if kind == 'reference':
            if not isinstance(value, dict) or set(value) != {'source_path'} or not isinstance(value['source_path'], str):
                return missing
            result = resolve((key[0], value['source_path']), (*seen, key))
        elif kind == 'projection' and isinstance(value, dict):
            result = dict(value)
            prefix = key[1] + '/'
            # Use the complete group index, including invalid/incomplete
            # children, so a dropped fragment cannot silently disappear.
            children = [child for child in groups if child[0] == key[0] and
                        isinstance(child[1], str) and child[1].startswith(prefix) and
                        '/' not in child[1][len(prefix):]]
            for child in children:
                name = child[1][len(prefix):].replace('~1', '/').replace('~0', '~')
                if name in result:
                    return missing
                item = resolve(child, (*seen, key))
                if item is missing:
                    return missing
                result[name] = item
        else:
            return missing
        if result is not missing:
            cache[key] = result
        return result

    records = []
    for key in decoded:
        value = resolve(key)
        if value is not missing:
            records.append({'source_url': key[0], 'path': key[1], 'value': value})
    return records


def text_records(facts):
    """Individual evidence, plus only explicitly numbered continuous chunks."""
    records, groups = [], collections.defaultdict(list)

    def public_url(value):
        if not isinstance(value, str) or len(value) > 3000 or re.search(r'[\x00-\x20\x7f]', value):
            return False
        try:
            parsed = urlsplit(value)
            return parsed.scheme == 'https' and bool(parsed.hostname) and parsed.username is None and parsed.password is None
        except ValueError:
            return False

    for fact in facts:
        if fact.get('format') in {'json', 'projection', 'reference'} or not isinstance(fact.get('value'), str):
            continue
        primary, label, value = fact.get('source_url'), fact.get('label', ''), fact['value']
        sources = [(primary, fact.get('source_type'))]
        supporting = fact.get('supporting_sources')
        if public_url(primary) and isinstance(supporting, list) and len(supporting) <= 3:
            for source in supporting:
                if isinstance(source, dict) and set(source) == {'source_url', 'source_type'} and public_url(source['source_url']) and source['source_type'] in {'html', 'product_json', 'image_text'}:
                    pair = (source['source_url'], source['source_type'])
                    if pair not in sources:
                        sources.append(pair)
        continuation = re.fullmatch(r'(.+) \(continued ([2-9]|[1-9]\d+)\)', label)
        base, ordinal = (continuation[1], int(continuation[2])) if continuation else (label, 1)
        # Each chunk enters only its own explicitly declared source contexts.
        # A later chunk cannot lend its provenance to an earlier one.
        for url, kind in sources:
            records.append({'source_url': url, 'primary_source_urls': [primary], 'text': normalized(value)})
            if isinstance(label, str) and label and not re.search(r' \(continued \d+\)$', label):
                for separator in [': ', ' ']:
                    records.append({'source_url': url, 'primary_source_urls': [primary], 'text': normalized(label + separator + value)})
            groups[(url, kind, base, fact.get('section'), fact.get('field'))].append((ordinal, value, primary))
    for (url, _kind, _label, _section, _field), chunks in groups.items():
        if len(chunks) < 2:
            continue
        chunks.sort()
        if [ordinal for ordinal, _value, _primary in chunks] != list(range(1, len(chunks) + 1)):
            continue
        records.append({'source_url': url, 'primary_source_urls': list(dict.fromkeys(primary for _ordinal, _value, primary in chunks)),
                        'text': normalized(' '.join(value for _ordinal, value, _primary in chunks))})
    return records


def retained_evidence(item, captures, structured, texts):
    locator = pointer_path(item.get('locator', ''))
    quote, capture_id = item.get('quote'), item.get('capture_id')
    source_captures = [capture for capture in captures if capture['label'] == capture_id]
    urls = {url for capture in source_captures for url in capture['urls']}
    is_json = item.get('quote_format') == 'json_value' or (locator.startswith('/') and capture_id == 'product-endpoint')
    status, matched = 'unconfirmed', []
    if is_json and locator:
        for capture in source_captures:
            if 'json' not in capture:
                continue
            exists, target = pointer(capture['json'], locator)
            # A quote, scalar expectation, or invalid pointer cannot replace
            # the original hash-verified typed node at this exact locator.
            if not exists:
                continue
            eligible = [record for record in structured if record['source_url'] in capture['urls']]
            for record in eligible:
                if locator == record['path'] or locator.startswith(record['path'] + '/'):
                    present, value = pointer(record['value'], locator[len(record['path']):])
                    if present and equal(value, target):
                        matched.append({'source_url': record['source_url'], 'path': record['path']})
            if not matched and isinstance(target, list) and target:
                for url in capture['urls']:
                    members = {record['path'][len(locator) + 1:]: record['value'] for record in eligible
                               if record['source_url'] == url and record['path'].startswith(locator + '/')
                               and '/' not in record['path'][len(locator) + 1:]}
                    # Full cardinality and original indices are required;
                    # arbitrary supersets or reordered members do not pass.
                    if set(members) == {str(i) for i in range(len(target))} and all(equal(value, members[str(i)]) for i, value in enumerate(target)):
                        matched.append({'source_url': url, 'path': locator, 'reconstructed_members': len(target)})
        if matched:
            status = 'typed_json_retained'
    elif not is_json and isinstance(quote, str) and len(normalized(quote)) >= 8:
        needle = normalized(quote)
        observed_urls = {url for capture in captures for url in capture['urls']}
        matched = [{'source_url': record['source_url']} for record in texts
                   if record['source_url'] in urls and needle in record['text'] and
                   all(url in observed_urls for url in record.get('primary_source_urls', [record['source_url']]))]
        if matched:
            status = 'source_quote_retained'
    return {'capture_id': capture_id, 'locator': locator or None,
            'quote': quote, 'status': status, 'matched': matched[:3]}


def run(corpus, replay_path, output_path):
    repo = pathlib.Path(__file__).resolve().parents[2]
    script_bytes = pathlib.Path(__file__).read_bytes()
    freeze_bytes = (corpus / 'oracle-freeze.json').read_bytes()
    freeze = json.loads(freeze_bytes)
    oracle, frozen_files = [], []
    captures_index, manifest = None, None
    for item in freeze['files']:
        file = ((repo / 'docs/audits') if item['kind'] == 'source_oracle' else corpus) / pathlib.Path(item['path']).name
        raw = file.read_bytes()
        require(sha256(raw) == item['sha256'], 'Changed frozen evidence: ' + str(file))
        frozen_files.append((file, item['sha256']))
        if item['kind'] == 'source_oracle':
            oracle.extend(json.loads(raw))
        elif item['kind'] == 'source_hash_index':
            require(captures_index is None, 'Duplicate frozen capture index')
            captures_index = json.loads(raw)
        elif item['kind'] == 'selection_manifest':
            require(manifest is None, 'Duplicate frozen selection manifest')
            manifest = json.loads(raw)
    expected_cases = {row['case_id']: row for row in oracle}
    require(oracle and len(expected_cases) == len(oracle), 'Frozen case identities must be unique')
    require(isinstance(captures_index, list) and isinstance(manifest, dict), 'Missing frozen source or selection index')
    selected = {url: roaster['id'] for roaster in manifest['roasters'] for url in roaster['selected_urls']}
    require(len(selected) == len(oracle) and all(selected.get(row['source_url']) == row['roaster_id'] for row in oracle),
            'Frozen selection and oracle identity differ')
    original_captures = {}
    captures_per_case = collections.Counter()
    for row in captures_index:
        key = (row['case_id'], row['file'])
        require(row['case_id'] in expected_cases and key not in original_captures and
                pathlib.Path(row['file']).name == row['file'], 'Invalid or duplicate frozen capture identity')
        original_captures[key] = row
        captures_per_case[row['case_id']] += 1
    attestation_bytes = (corpus / 'original-archive-packet-attestation.json').read_bytes()
    require(sha256(attestation_bytes) == PACKET_ATTESTATION_SHA256, 'Original archive packet attestation changed')
    attestation = json.loads(attestation_bytes)
    original_packets = {}
    for row in attestation['packets']:
        case_id = row.get('id') or row.get('case_id')
        if case_id not in expected_cases:
            continue
        require(case_id not in original_packets and row['path'] == f'extractor-600/cases/{case_id}/source-packet.json',
                'Invalid original archive packet identity')
        original_packets[case_id] = row
    require(len(original_packets) == len(expected_cases) and attestation.get('attestation_created_after_oracle_freeze') is True,
            'Incomplete original archive packet attestation')
    replay_bytes = replay_path.read_bytes()
    replay = json.loads(replay_bytes)
    require(replay.get('oracle_freeze_sha256') == sha256(freeze_bytes), 'Replay belongs to a different oracle freeze')
    actual = {row['case_id']: row for row in replay['records']}
    require(len(actual) == len(replay['records']) == len(expected_cases) and actual.keys() == expected_cases.keys(),
            'Full retention comparison requires every unique frozen case exactly once')
    for case_id, row in actual.items():
        expected = expected_cases[case_id]
        require(row.get('roaster_id') == expected['roaster_id'] and row.get('source_url') == expected['source_url'],
                'Replay case identity differs from frozen oracle: ' + case_id)

    counts = collections.Counter()
    by_label = collections.defaultdict(collections.Counter)
    rows = []
    for expected in oracle:
        preview = actual[expected['case_id']]['output']
        facts = preview.get('source_facts', [])
        structured = structured_records(facts)
        captures = []
        case_id = expected['case_id']
        packet_bytes = (corpus / 'cases' / case_id / 'source-packet.json').read_bytes()
        packet = json.loads(packet_bytes)
        require(packet.get('id') == case_id and packet.get('roaster_id') == expected['roaster_id'] and
                packet.get('source_url') == expected['source_url'], 'Frozen packet identity mismatch: ' + case_id)
        original_packet = original_packets[case_id]
        require(len(packet_bytes) == original_packet['bytes'] and sha256(packet_bytes) == original_packet['sha256'],
                'Original archive packet changed: ' + case_id)
        seen_files, seen_labels = set(), set()
        for request in packet.get('requests', []):
            original = original_captures.get((case_id, request.get('file')))
            require(request.get('file') not in seen_files and request.get('label') not in seen_labels, 'Duplicate source capture')
            require(original is not None and all(request.get(key) == original[key] for key in ['sha256', 'bytes', 'status']),
                    'Capture differs from frozen source: ' + case_id)
            seen_files.add(request['file'])
            seen_labels.add(request['label'])
            raw = (corpus / 'cases' / case_id / original['file']).read_bytes()
            require(sha256(raw) == original['sha256'] and len(raw) == original['bytes'], 'Frozen source capture changed: ' + case_id)
            if request['status'] != 200:
                continue
            capture = {'label': request['label'], 'urls': {request.get('url'), request.get('final_url')} - {None, ''}}
            try:
                capture['json'] = json.loads(raw)
            except (ValueError, UnicodeDecodeError):
                pass
            captures.append(capture)
        require(len(seen_files) == captures_per_case[case_id], 'Missing frozen source capture: ' + case_id)
        texts = text_records(facts)
        checks = []
        for assertion_index, fact in enumerate(expected.get('additional_facts', [])):
            evidence = [retained_evidence(item, captures, structured, texts) for item in fact.get('evidence', [])]
            retained = sum(x['status'] != 'unconfirmed' for x in evidence)
            status = 'all_evidence_retained' if evidence and retained == len(evidence) else 'some_evidence_retained' if retained else 'unconfirmed'
            counts[status] += 1
            by_label[fact['label']][status] += 1
            checks.append({'assertion_index': assertion_index, 'label': fact['label'], 'expected': fact.get('value'),
                           'context': fact.get('context'), 'frozen_evidence': fact.get('evidence', []),
                           'status': status, 'evidence': evidence})
        counts['cases'] += 1
        counts['additional_assertions'] += len(checks)
        counts['truncated_previews'] += bool(preview.get('source_facts_truncated'))
        rows.append({'case_id': expected['case_id'], 'roaster_id': expected['roaster_id'], 'source_url': expected['source_url'],
                     'source_facts_truncated': bool(preview.get('source_facts_truncated')), 'checks': checks})
    result = {'type': 'independent_source_evidence_retention_comparison', 'created_from_replay': str(replay_path),
              'source_tree_sha256': replay.get('source_tree_sha256'),
              'oracle_freeze_sha256': sha256(freeze_bytes), 'replay_sha256': sha256(replay_bytes),
              'retention_script_sha256': sha256(script_bytes), 'packet_archive_attestation_sha256': sha256(attestation_bytes),
              'source_archive_sha256': attestation['source_archive_sha256'], 'packet_attestation_created_after_oracle_freeze': True,
              'not_a_canonical_accuracy_score': True, 'unconfirmed_is_not_proven_missing': True,
              'no_semantic_or_variant_context_pass_claim': True, 'counts': dict(counts),
              'by_label': {k: dict(v) for k, v in by_label.items()}, 'records': rows}
    for file, expected_hash in frozen_files:
        require(sha256(file.read_bytes()) == expected_hash, 'Frozen evidence changed during retention comparison')
    require(sha256((corpus / 'oracle-freeze.json').read_bytes()) == sha256(freeze_bytes), 'Oracle freeze changed during retention comparison')
    require(sha256(replay_path.read_bytes()) == sha256(replay_bytes), 'Replay changed during retention comparison')
    output_path.write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n')
    print(json.dumps(result['counts'], indent=2))


if __name__ == "__main__":
    run(*map(pathlib.Path, sys.argv[1:4]))
