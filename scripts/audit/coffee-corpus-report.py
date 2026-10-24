#!/usr/bin/env python3
"""Build a self-contained, source-linked review of every frozen coffee case.

This presents existing receipts. It does not alter an oracle, run extraction,
convert post-replay adjudications into passes, or request any remote resource.
"""
import argparse
import collections
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path


def read(path):
    return json.loads(Path(path).read_text())


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def build(args):
    manifest_path = args.corpus / 'manifest.json'
    manifest = read(manifest_path)
    freeze_path = args.corpus / 'oracle-freeze.json'
    freeze = read(freeze_path)
    frozen = {}
    for entry in freeze['files']:
        if entry['kind'] == 'selection_manifest':
            assert digest(manifest_path) == entry['sha256'], 'Frozen manifest changed'
        if entry['kind'] == 'source_oracle':
            file = Path(__file__).resolve().parents[2] / 'docs' / 'audits' / Path(entry['path']).name
            assert digest(file) == entry['sha256'], 'Frozen oracle changed'
            for row in read(file):
                assert row['case_id'] not in frozen, 'Duplicate frozen case'
                frozen[row['case_id']] = row
    baseline, candidate, retention, replay = map(read, [args.baseline, args.comparison, args.retention, args.replay])
    baseline_replay = read(args.baseline_replay)
    case_ids = {row['case_id'] for row in candidate['records']}
    assert len(case_ids) == len(candidate['records']) == manifest['coffee_count']
    for receipt in [baseline, retention, replay, baseline_replay]:
        assert len(receipt['records']) == len(case_ids)
        assert case_ids == {row['case_id'] for row in receipt['records']} == set(frozen)
        assert receipt['oracle_freeze_sha256'] == digest(freeze_path), 'Receipt oracle lock differs'
    assert candidate['oracle_freeze_sha256'] == digest(freeze_path)
    assert candidate['source_tree_sha256'] == retention['source_tree_sha256'] == replay['source_tree_sha256']
    assert baseline['source_tree_sha256'] == baseline_replay['source_tree_sha256']
    assert candidate['replay_sha256'] == retention['replay_sha256'] == digest(args.replay)
    assert baseline['replay_sha256'] == digest(args.baseline_replay)
    assert baseline['comparison_script_sha256'] == candidate['comparison_script_sha256']
    assert baseline['comparison_normalizer_sha256'] == candidate['comparison_normalizer_sha256']
    assert retention['packet_archive_attestation_sha256'] == replay['packet_archive_attestation_sha256']
    assert retention['source_archive_sha256'] == replay['source_archive_sha256']
    archive_attestation = args.corpus / 'original-archive-packet-attestation.json'
    assert digest(archive_attestation) == replay['packet_archive_attestation_sha256']
    original_packets = {row['id'] or row['case_id']: row for row in read(archive_attestation)['packets']}
    roasters = {row['id']: {key: row.get(key) for key in ['name', 'city', 'state', 'location_source_url', 'location_quote', 'platform_hint', 'selected_urls']} for row in manifest['roasters']}
    assert len(roasters) == 201 and len(case_ids) == 603
    assert all(len(row['selected_urls']) == len(set(row['selected_urls'])) == 3 for row in roasters.values())
    by_base = {row['case_id']: row for row in baseline['records']}
    by_base_output = {row['case_id']: row for row in baseline_replay['records']}
    by_retention = {row['case_id']: row for row in retention['records']}
    by_output = {row['case_id']: row for row in replay['records']}
    reviews = collections.defaultdict(list)
    review_files = []
    for file in args.adjudication:
        data = read(file)
        review_files.append({'filename': file.name, 'sha256': digest(file), 'type': data.get('type')})
        for row in data.get('records', data.get('rows', [])):
            if row.get('case_id') in case_ids:
                reviews[row['case_id']].append(row)
    cases = []
    for case in candidate['records']:
        expected = frozen[case['case_id']]
        assert case['roaster_id'] == expected['roaster_id'] and case['source_url'] == expected['source_url']
        assert case['source_url'] in roasters[case['roaster_id']]['selected_urls']
        baseline_case = by_base[case['case_id']]
        previous = {row['field']: row for row in baseline_case['canonical']}
        source = args.corpus / 'cases' / case['case_id'] / 'source-packet.json'
        assert digest(source) == original_packets[case['case_id']]['sha256'], 'Original archive packet changed'
        packet = read(source)
        captures = [{key: item.get(key) for key in ['label', 'url', 'final_url', 'status', 'bytes', 'file', 'sha256']} for item in packet['requests']]
        current = by_output[case['case_id']]['output']
        assert packet['id'] == case['case_id'] and packet['source_url'] == case['source_url']
        assert len(case['canonical']) == len(previous) == len(expected['canonical'])
        for field in case['canonical']:
            key = field['field']
            assert field['expected'] == expected['canonical'][key]['value'] == previous[key]['expected']
            assert field['evidence'] == expected['canonical'][key]['evidence']
            assert field['actual'] == current.get('fields', {}).get(key)
            assert previous[key]['actual'] == by_base_output[case['case_id']]['output'].get('fields', {}).get(key)
        retention_checks = by_retention[case['case_id']]['checks']
        additional = expected.get('additional_facts', [])
        assert len(retention_checks) == len(case['additional']) == len(additional)
        for index, (fact, checked, shown) in enumerate(zip(additional, retention_checks, case['additional'])):
            assert checked['assertion_index'] == index
            assert checked['label'] == shown['label'] == fact['label']
            assert checked['expected'] == shown['expected'] == fact['value']
            assert checked.get('context') == shown.get('context') == fact.get('context')
            assert checked['frozen_evidence'] == fact['evidence']
        cases.append({**case, 'canonical': [{**field, 'baseline': previous[field['field']]['actual'],
            'baseline_status': previous[field['field']]['status']} for field in case['canonical']],
            'roaster': roasters[case['roaster_id']], 'name': current.get('fields', {}).get('name') or case['case_id'],
            'retention': by_retention[case['case_id']]['checks'], 'candidate_output': current,
            'adjudications': reviews[case['case_id']], 'captures': captures})
    timings = sorted(row['elapsed_ms'] for row in replay['records'])
    payload = {'generated_at': datetime.now(timezone.utc).isoformat(), 'baseline_counts': baseline['counts'],
        'counts': candidate['counts'], 'baseline_by_field': baseline['by_field'], 'by_field': candidate['by_field'],
        'retention_counts': retention['counts'], 'roaster_count': len(roasters), 'cases': cases,
        'source_tree_sha256': replay['source_tree_sha256'], 'oracle_freeze_sha256': replay['oracle_freeze_sha256'],
        'replay_sha256': digest(args.replay), 'comparison_sha256': digest(args.comparison), 'retention_sha256': digest(args.retention),
        'baseline_replay_sha256': digest(args.baseline_replay), 'baseline_comparison_sha256': digest(args.baseline),
        'comparison_normalizer_sha256': candidate['comparison_normalizer_sha256'],
        'packet_archive_attestation_sha256': replay['packet_archive_attestation_sha256'],
        'source_archive_sha256': replay['source_archive_sha256'],
        'node_version': replay['node_version'], 'replay_created_at': replay['created_at'],
        'local_replay_timing_ms': {'median': timings[len(timings)//2], 'p95': timings[int((len(timings)-1)*.95)], 'max': timings[-1]},
        'post_replay_review_files': review_files, 'not_a_perfect_extraction_claim': True,
        'repair_summary': [
            {'area': 'Product identity and page scope', 'change': 'Match the selected product across HTML, structured metadata and exact public product endpoints. Keep unrelated coffees, historical lots, hidden recommendations and generic educational claims separate.'},
            {'area': 'Coffee specifications', 'change': 'Read more table, caption, reversed-card, inline and multiline layouts; retain compound and named cultivars, explicit producer roles, full geographic claims and original physical units.'},
            {'area': 'Flavor, roast and processing', 'change': 'Preserve complete formal tasting profiles and supported narrative details. Distinguish roast indicators from generic scales, fermentation stages from conflicting methods, and decaffeination from green-coffee processing.'},
            {'area': 'Harvest and release identity', 'change': 'Preserve recurring month/season windows as harvest information and generic lot categories as source details. Neither alone proves a distinct annual release; named and numbered releases remain subject to existing source verification.'},
            {'area': 'Published information beyond the ten fields', 'change': 'Keep bounded source text, unfamiliar specifications, purchase options, prices, units, quantities, recipes, metadata, catalog categories and exact GTIN strings. Preserve uniquely linked farmer profiles and literal graphic marker positions as review-only evidence; never infer current-lot fields or roast categories from them.'},
            {'area': 'Traceable structured records', 'change': 'Retain exact typed JSON, source paths and product-form namespaces. Preserve up to 128 selected variants; reduce repeated purchase summaries and share complete children through bounded explicit reference destinations. Require exact source reconstruction and visible truncation within the limits recorded for the audited candidate.'},
            {'area': 'Import, saved records and freshness', 'change': 'Download public source evidence for review; preserve imported details when reusing an existing coffee; retry acknowledged-save reads without another add; provide an explicit current-page refresh under the existing quota.'},
            {'area': 'No-key image review', 'change': 'Use existing local browser rendering and Tesseract as separate inspection tools. The local OCR companion reads explicitly selected files, records hashes and confidence, and never approves or writes coffee facts.'},
            {'area': 'Regression and measurement integrity', 'change': 'Replay immutable source snapshots through the real handler using captured bytes and isolated fixtures. Keep the independent expected-value lock, strict comparison rules, original source hashes and post-output reviews separate.'}
        ],
        'integration_status': 'Local implementation and evidence only. The recorded GitHub create_tree write returned isError:true and “user rejected MCP tool call”; no more specific reason was supplied. That rejection remains a blocker. No retry, alternative remote write route or publication was used.',
        'cost_boundary': 'This audit used no new API keys or paid/model APIs and dispatched no hosted CI. No publication, production deployment or real member-data mutation occurred. Tests use local resources, public captures and nonfunctional fixtures.',
        'limitations': ['Strict comparisons use frozen accepted values, with Unicode/accent/case and layout punctuation normalization. Numeric qualifiers, decimals, ranges and ratios are preserved. They do not use token overlap as a pass.',
            'A review difference may be a valid unit, name or granularity difference, a source contradiction, or a defect. Separate post-replay notes do not change the strict score.',
            'A missing canonical expectation is a blank output, including intentional withholding for conflict or schema limits. It is not automatically an unsafe omission.',
            'Supplementary retention verifies exact captured-source quotes or typed JSON at their original source pointers. Unconfirmed is not proof that information is missing; retention is not semantic or variant-context accuracy.',
            'The conservative text verifier does not pass quotes shorter than eight characters. Exact short values such as a published USD currency can be present in the extracted preview while remaining unconfirmed by this metric; separate source reviews identify these cases.',
            'The handler used frozen public captures and isolated nonfunctional authentication/quota fixtures. These are not production-network, signed-in-account or deployed-site results.',
            'Three Iowa Coffee Roasters HTML pages were wholesale-gated. Their captured public product endpoints were usable, and their previews succeeded; the gated HTML evidence remains recorded on those cases.',
            'Original packet metadata is separately bound to its preserved source archive by a post-freeze attestation. That attestation is not represented as part of the original oracle lock.',
            'The corpus is deliberately diverse but dominated by Shopify. Three distinct selected products per roaster are tested; this is not a random statistical sample of all U.S. coffee sites.',
            'Rendered states and OCR are independent inspection evidence. Every image pixel, dynamic state and linked document has not been manually verified. Some source claims contradict current labels or describe older lots.',
            'Bounded extraction reports truncation. No universal guarantee, complete source coverage, exhausted-options claim or production deployment is implied.']}
    if getattr(args, 'audit_receipt', None):
        audit = read(args.audit_receipt)
        assert audit['extractor_source_fingerprint'] == replay['source_tree_sha256'], 'Final audit source differs'
        assert audit['oracle_freeze_sha256'] == replay['oracle_freeze_sha256'], 'Final audit oracle differs'
        assert audit['canonical'] == candidate['counts'] and audit['supplementary_retention'] == retention['counts'], 'Final audit scores differ'
        payload['final_audit_summary'] = 'Candidate ' + str(audit['final_candidate']) + ': local audit complete; integration BLOCKED. ' + audit['remaining_source_limit']
        payload['final_audit_receipt'] = {'filename': args.audit_receipt.name, 'sha256': digest(args.audit_receipt), 'status': audit['status']}
        payload['repair_summary'].extend(audit.get('continuation_improvements', []))
        payload['limitations'].insert(0, audit['remaining_source_limit'])
    encoded = json.dumps(payload, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c').replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')
    output = TEMPLATE.replace('__PAYLOAD__', encoded)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(output)
    print(json.dumps({'file': str(args.output), 'bytes': args.output.stat().st_size, 'sha256': digest(args.output), 'cases': len(cases), 'roasters': len(roasters)}))


TEMPLATE = r'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'"><title>Coffee extractor · 603-case audit</title><style>
:root{color-scheme:light;--ink:#22332c;--muted:#54635a;--paper:#f6f3eb;--card:#fffef9;--line:#d4dbd1;--ok:#206449;--warn:#855820;--bad:#9a3434}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.55 system-ui,sans-serif}main{max-width:1320px;margin:auto;padding:32px 24px 80px}h1{font-size:clamp(28px,4vw,44px);line-height:1.1;margin:10px 0 18px}h2{font-size:24px;margin-top:32px}h3{font-size:19px}p{max-width:90ch}.eyebrow{letter-spacing:.13em;font-size:12px;font-weight:750;text-transform:uppercase}.muted,small{color:var(--muted)}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.stat{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:18px}.stat strong{display:block;font-size:30px;line-height:1.2}.stat span{font-size:13px}.notice{border-left:4px solid #a57a40;background:#eee6d7;padding:14px 18px;border-radius:0 8px 8px 0}.scroll{overflow:auto;max-width:100%}table{border-collapse:collapse;width:100%;font-size:14px}th,td{padding:10px 12px;text-align:left;border-bottom:1px solid var(--line);vertical-align:top}th{background:#e9eee5}td{overflow-wrap:anywhere}thead th{white-space:nowrap}.controls{display:flex;gap:12px;align-items:end;flex-wrap:wrap;margin:18px 0}label{font-size:13px;font-weight:650;display:block}input,select,button{font:inherit;padding:10px 12px;border:1px solid #98a89b;border-radius:7px;background:white;color:var(--ink)}input{width:min(450px,80vw)}button{cursor:pointer}button:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:3px solid #367559;outline-offset:3px}details.case{border:1px solid var(--line);background:var(--card);border-radius:9px;margin:10px 0}summary{cursor:pointer;padding:14px 16px}.case-title{font-weight:650}.case-meta{display:block;font-size:13px;color:var(--muted);margin:3px 0 0 18px}.body{padding:0 18px 18px}.bad{color:var(--bad)}.review{color:var(--warn)}.good{color:var(--ok)}code,pre{font:12px/1.5 ui-monospace,monospace;overflow-wrap:anywhere;white-space:pre-wrap}pre{background:#f0f2eb;padding:12px;border-radius:6px;max-height:460px;overflow:auto}.quote{border-left:3px solid var(--line);padding-left:12px;margin:8px 0;font-size:14px}.pill{display:inline-block;border:1px solid var(--line);padding:1px 7px;border-radius:12px;font-size:12px;white-space:nowrap;margin-right:5px}a{color:#15583d}footer{font-size:13px;border-top:1px solid var(--line);margin-top:36px;padding-top:18px}@media(max-width:650px){main{padding:22px 12px 60px}.grid{grid-template-columns:1fr 1fr}.stat{padding:12px}.stat strong{font-size:25px}th,td{padding:8px}.body{padding:0 10px 14px}.case-meta{margin-left:0}.field-table{min-width:0}.field-table thead{display:none}.field-table tbody,.field-table tr,.field-table td{display:block}.field-table tr{border-bottom:1px solid var(--line);padding:10px 0}.field-table td{display:grid;grid-template-columns:88px minmax(0,1fr);gap:10px;border:0;padding:4px 0}.field-table td::before{content:attr(data-label);font-weight:650;color:var(--muted)}}
</style></head><body><main><header><div class="eyebrow">The Dial In Collective · independent source audit</div><h1>Every selected coffee.<br>Every comparison visible.</h1><p>603 coffees from 201 U.S. roasters, three distinct products each. This report keeps the frozen expected values, original-source evidence, baseline results, repaired candidate, and remaining questions together.</p><div class="notice"><strong>Successful preview is not complete extraction.</strong> Strict field comparisons, supplementary evidence retention, ambiguity handling, and post-replay source reviews are separate measures. The candidate is local; this report does not establish deployment or perfect coverage.</div></header><section><h2>Measured results</h2><div id="stats" class="grid"></div><p class="muted" id="run"></p><div class="scroll"><table id="field-results"><thead><tr><th>Field</th><th>Expected</th><th>Baseline exact</th><th>Candidate exact</th><th>Candidate blank</th><th>Needs review</th></tr></thead><tbody></tbody></table></div><p id="retention-summary"></p><details><summary>How to interpret these numbers</summary><ul id="limits"></ul></details></section><section><h2>Implemented improvements</h2><div id="repair-summary"></div><p id="cost-boundary" class="muted"></p><p id="integration-status" class="notice"></p></section><section><h2>Inspect all 603 cases</h2><p>Search by coffee, roaster, state or source URL. Open any case to compare the original expected value with both versions and inspect the source quotes, supplementary facts and capture hashes.</p><div class="controls"><div><label for="search">Coffee, roaster, state or URL</label><input id="search" type="search" placeholder="e.g. Arbey, Onyx, CO" autocomplete="off"></div><div><label for="status">Show</label><select id="status"><option value="all">All cases</option><option value="missing">Has blank expected fields</option><option value="review">Has review differences</option><option value="unexpected">Has unexpected fields</option><option value="truncated">Source evidence truncated</option></select></div><button id="reset" type="button">Reset filters</button></div><p id="results-count" aria-live="polite"></p><div id="cases"></div></section><section><h2>Reproducibility</h2><p>The original expected values were locked before per-case outputs were opened. Separate post-replay reviews identify repairs, equivalences, disagreements and oracle omissions without rewriting that independent lock.</p><pre id="provenance"></pre></section><footer>This self-contained report loads no remote scripts, images or data. Clicking an explicit roaster source link opens that website. Sources can change after capture; the recorded bytes and hashes are the audit evidence.</footer></main><script id="audit-data" type="application/json">__PAYLOAD__</script><script>
'use strict';
const data=JSON.parse(document.getElementById('audit-data').textContent);
const labels={name:'Coffee name',roaster:'Roaster',release_label:'Release / harvest',origin:'Origin',process:'Process',roast_level:'Roast level',elevation_m:'Elevation',variety:'Variety',producer:'Producer',tasting_notes:'Tasting notes'};
const statusName={exact_equivalent:'Same normalized value',missing:'Blank output',review_required:'Needs source review',all_evidence_retained:'All cited evidence retained',some_evidence_retained:'Some cited evidence retained',unconfirmed:'Retention unconfirmed'};
const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=typeof text==='string'?text:JSON.stringify(text);if(cls)node.className=cls;return node;};
const readable=value=>value===null||value===undefined?'—':typeof value==='object'?JSON.stringify(value,null,2):String(value);
const link=(url,text)=>{const a=el('a',text||url);try{const parsed=new URL(url);if(parsed.protocol==='https:'&&!parsed.username&&!parsed.password){a.href=parsed.href;a.target='_blank';a.rel='noopener noreferrer';}}catch{}return a;};
const count=(rows,status)=>rows.filter(row=>row.status===status).length;
if(data.final_audit_summary){const notice=el('p',data.final_audit_summary,'notice');notice.id='known-omissions';document.querySelector('header').append(notice);}
const metrics=[['603 / '+data.counts.cases,'candidate previews returned'],[data.roaster_count,'verified U.S. roasters'],[data.counts.exact_equivalent+' / '+data.counts.canonical_assertions,'same normalized canonical values'],[data.counts.missing,'blank canonical expectations']];
metrics[0][0]=data.counts.ok_response+' / '+data.counts.cases;
for(const [value,title] of metrics){const card=el('div',undefined,'stat');card.append(el('strong',value),el('span',title));document.getElementById('stats').append(card);}
document.getElementById('run').textContent='Candidate captured-byte replay: '+data.replay_created_at+' · '+data.node_version+'. Baseline previews: '+data.baseline_counts.ok_response+'/'+data.baseline_counts.cases+'. Candidate differences requiring review: '+data.counts.review_required+'.';
for(const [key,row] of Object.entries(data.by_field)){const tr=el('tr');for(const value of [labels[key]||key,row.expected,data.baseline_by_field[key]?.exact,row.exact,row.missing,row.review_required])tr.append(el('td',readable(value)));document.querySelector('#field-results tbody').append(tr);}
const rc=data.retention_counts;document.getElementById('retention-summary').textContent='Supplementary evidence: '+(rc.all_evidence_retained||0)+' of '+rc.additional_assertions+' assertions have all cited evidence retained; '+(rc.some_evidence_retained||0)+' have some; '+(rc.unconfirmed||0)+' remain unconfirmed. '+rc.truncated_previews+' previews report truncated source information. These are evidence-retention results, not additional canonical passes.';
for(const value of data.limitations)document.getElementById('limits').append(el('li',value));
for(const item of data.repair_summary){const d=el('details');d.append(el('summary',item.area),el('p',item.change));document.getElementById('repair-summary').append(d);}
document.getElementById('cost-boundary').textContent=data.cost_boundary;
document.getElementById('integration-status').textContent=data.integration_status;
document.getElementById('provenance').textContent=JSON.stringify({candidate_source_tree_sha256:data.source_tree_sha256,oracle_freeze_sha256:data.oracle_freeze_sha256,replay_sha256:data.replay_sha256,comparison_sha256:data.comparison_sha256,retention_sha256:data.retention_sha256,baseline_replay_sha256:data.baseline_replay_sha256,baseline_comparison_sha256:data.baseline_comparison_sha256,comparison_normalizer_sha256:data.comparison_normalizer_sha256,packet_archive_attestation_sha256:data.packet_archive_attestation_sha256,source_archive_sha256:data.source_archive_sha256,packet_attestation_created_after_oracle_freeze:true,post_replay_review_files:data.post_replay_review_files,local_replay_timing_ms:data.local_replay_timing_ms,timing_limit:'Local parsing/orchestration only, not production network latency',generated_at:data.generated_at},null,2);
function caseBody(item){
 const body=el('div',undefined,'body'),source=el('p');source.append(link(item.source_url,'Open roaster product page'));body.append(source);
 const location=el('p',undefined,'muted');location.append(el('span',(item.roaster.city||'')+(item.roaster.state?', '+item.roaster.state:'')+' · '+(item.roaster.platform_hint||'platform unclassified')+'. '));if(item.roaster.location_source_url)location.append(link(item.roaster.location_source_url,'U.S. location evidence'));if(item.roaster.location_quote)location.append(el('span',' — '+item.roaster.location_quote));body.append(location);
 const wrap=el('div',undefined,'scroll'),table=el('table',undefined,'field-table'),head=el('thead'),hr=el('tr');for(const text of ['Field','Frozen expected','Baseline','Candidate','Strict comparison'])hr.append(el('th',text));head.append(hr);table.append(head);const tbody=el('tbody');for(const f of item.canonical){const tr=el('tr');[labels[f.field]||f.field,readable(f.expected),readable(f.baseline),readable(f.actual)].forEach((value,index)=>{const td=el('td',value);td.dataset.label=['Field','Expected','Baseline','Candidate'][index];tr.append(td);});const outcome=el('td',statusName[f.status]||f.status,f.status==='missing'?'bad':f.status==='review_required'?'review':'good');outcome.dataset.label='Result';tr.append(outcome);tbody.append(tr);}table.append(tbody);wrap.append(table);body.append(wrap);
 const evidence=el('details');evidence.append(el('summary','Frozen canonical source quotes'));for(const f of item.canonical){evidence.append(el('h3',labels[f.field]||f.field));for(const q of f.evidence||[])evidence.append(el('p',(q.capture_id||'source')+(q.locator?' '+q.locator:'')+': '+readable(q.quote),'quote'));}body.append(evidence);
 const output=el('details');output.append(el('summary','Complete extracted preview, source information and recipes'),el('p','This is the actual bounded handler output for this coffee. Extracted suggestions do not verify or update a shared coffee record.'),el('pre',JSON.stringify(item.candidate_output,null,2)));body.append(output);
 if(item.ambiguities.length||item.unexpected.length){const d=el('details');d.append(el('summary','Ambiguities and unexpected values'),el('pre',JSON.stringify({ambiguities:item.ambiguities,unexpected:item.unexpected},null,2)));body.append(d);}
 const extra=el('details');extra.append(el('summary','Supplementary assertions and retention ('+item.additional.length+')'));item.additional.forEach((f,index)=>{const checked=item.retention[index]||{};extra.append(el('h3',f.label),el('p',readable(f.expected)),el('p',f.context||'','muted'),el('p',statusName[checked.status]||'Unconfirmed','pill'));for(const q of checked.evidence||[])extra.append(el('p',(q.capture_id||'source')+(q.locator?' '+q.locator:'')+': '+readable(q.quote)+' ['+q.status+']','quote'));});body.append(extra);
 if(item.adjudications.length){const d=el('details');d.append(el('summary','Separate post-replay source review ('+item.adjudications.length+')'),el('p','These notes retain their original reviewed candidate values and do not change the strict score. Check the value and source before applying a note to this candidate.'),el('pre',JSON.stringify(item.adjudications,null,2)));body.append(d);}
 if(item.unreviewed_sources?.length){const limits=el('details');limits.append(el('summary','Source-inspection limits for this case'),el('pre',JSON.stringify(item.unreviewed_sources,null,2)));body.append(limits);}
 const captures=el('details');captures.append(el('summary','Captured source files and SHA-256 hashes'),el('pre',JSON.stringify(item.captures,null,2)));body.append(captures);if(item.source_facts_truncated)body.prepend(el('p','This preview explicitly reports that bounded source evidence was truncated.','notice'));return body;
}
function render(){const query=document.getElementById('search').value.trim().toLocaleLowerCase(),status=document.getElementById('status').value;const selected=data.cases.filter(item=>{const text=[item.name,item.roaster.name,item.roaster.city,item.roaster.state,item.source_url].join(' ').toLocaleLowerCase();if(query&&!text.includes(query))return false;return status==='missing'?item.canonical.some(x=>x.status==='missing'):status==='review'?item.canonical.some(x=>x.status==='review_required'):status==='unexpected'?item.unexpected.length>0:status==='truncated'?item.source_facts_truncated:true;});document.getElementById('results-count').textContent=selected.length+' of '+data.cases.length+' cases shown.';const container=document.getElementById('cases');container.replaceChildren();const fragment=document.createDocumentFragment();for(const item of selected){const d=el('details',undefined,'case'),s=el('summary'),title=el('span',item.roaster.name+' · '+item.name,'case-title'),meta=el('span',count(item.canonical,'exact_equivalent')+'/'+item.canonical.length+' strict matches · '+count(item.canonical,'missing')+' blank · '+count(item.canonical,'review_required')+' review'+(item.source_facts_truncated?' · evidence truncated':''),'case-meta');s.append(title,meta);d.append(s);d.addEventListener('toggle',()=>{if(d.open&&!d.dataset.loaded){d.append(caseBody(item));d.dataset.loaded='true';}});fragment.append(d);}container.append(fragment);}
document.getElementById('search').addEventListener('input',render);document.getElementById('status').addEventListener('change',render);document.getElementById('reset').addEventListener('click',()=>{document.getElementById('search').value='';document.getElementById('status').value='all';render();});render();
</script></body></html>'''


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ['corpus', 'baseline', 'baseline-replay', 'comparison', 'retention', 'replay', 'output']:
        parser.add_argument('--'+name, type=Path, required=True)
    parser.add_argument('--adjudication', type=Path, action='append', default=[])
    parser.add_argument('--audit-receipt', type=Path)
    build(parser.parse_args())
