#!/usr/bin/env python3
"""Read exact existing CI artifacts; print bounded audit evidence, never publish."""
import base64
import hashlib
import io
import json
import os
import re
import selectors
import stat
import subprocess
import sys
import time
import zipfile
from html.parser import HTMLParser
from pathlib import PurePosixPath
from urllib.parse import parse_qsl, urljoin, urlsplit

REPO = "Schulzet3/The-Dial-In-Collective"
REPO_ID = 1355472654
HEAD = "2eb32b247e2c47bd1646a234717a23d5cd14b6fc"
BRANCH = "work/issue33-candidate11-live-diagnostics-20261024"
FP = "4974710994bcd9660200e2f983c5510dd9973b62ac66011cfc851559a2febca2"
SOURCE = "https://nomadcoffee.es/products/centroamericano-natural-anaerobico"
CONFIG = {
    "live": (12549488376, 40066955938, 344226,
             "2fb8fab1cda096a99b1ce73416e9da3fabba58f28c24d86ff12e9b92362f563d",
             ".github/workflows/coffee-completeness.yml"),
    "frozen": (12549831914, 40066959055, 15135077,
               "58b16366a01377347d28cdcc8399bf94f5de95c9f9ed7fc1a54ad591ce891f8d",
               ".github/workflows/coffee-frozen-corpus.yml"),
}
HASHES = {
    "artifact-manifest.json": "614da85044d77d01fb51aea5ac5cda99df6b2f39f25b78188b248238c9f726f0",
    "candidate11-benchmark-receipt.json": "0eb526d90c4d580c9487faf8a1f1a53206652eeb3f092502e8fc08b90ef56e6e",
    "candidate11-replay.json": "2d394c7d60a370079d7128d499cf005155354c8a53458a2b805cf82058819d98",
    "candidate11-comparison.json": "9343a920bcb83682cf93a0de1db5fab108893c3f8c60a4b9c1ef31294813f31b",
}
CASE_IDS = [
    "onyxcoffeelab-com__mexico-finca-santa-cruz-gesha-bd946347",
    "www-altaroasters-com__kirima-batian-othaya-nyeri-kenya-12oz-bag-b814c94e",
    "www-altaroasters-com__nevado-gona-colombia-12oz-bag-1aa5407f",
    "mapscoffee-com__scarlet-macaw-d7315aa3",
    "contemporoast-com__1201-blend-63a831d5",
    "www-vailcoffee-com__ethiopian-yirgacheff-d46602a2",
    "www-nunatakcoffee-com__blends-1d496695",
    "www-nunatakcoffee-com__raven-espresso-8fe55e93",
    "www-nunatakcoffee-com__early-bird-df6ad855",
]
RELEVANT = re.compile(r"Tolima|Gona|Kirima|\bAA\b|Batian|Excellence|award|Santa.?Cruz|Silvestre|Vasquez|Joel|Lopez|Pacavita|Regions|1201|Kochere|Chelelektu|Buku|Sayasa|Nunatak|finish|aroma|component|Jammy|blueberry|sweet pepper|ginger|hazelnut|medjool|Minas Gerais|Pitalito|Sierra Nevada|Las Flores|Chiapas|Othaya|Nyeri", re.I)
PRIVATE = re.compile(r"authorization|bearer\s|password|csrf|session.?token|api.?key|[?&](?:token|sig|secret|key)=", re.I)
STAGE = "startup"


def require(condition):
    if not condition:
        raise ValueError("forensic verification failed")


def sha(data):
    return hashlib.sha256(data).hexdigest()


def emit(kind, value):
    encoded = json.dumps({"kind": kind, "evidence": value}, ensure_ascii=True, separators=(",", ":"))
    require(len(encoded) <= 180000)
    print(encoded, flush=True)


def decode_json(data):
    def pairs(items):
        result = {}
        for key, value in items:
            require(key not in result)
            result[key] = value
        return result
    return json.loads(data.decode("utf-8"), object_pairs_hook=pairs)


def gh(endpoint, limit):
    # gh owns authenticated GitHub redirects. Never manually forward GH_TOKEN.
    require(endpoint.startswith("repos/" + REPO + "/actions/"))
    process = subprocess.Popen(["gh", "api", "--method", "GET", endpoint],
                               stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    result = bytearray()
    deadline = time.monotonic() + 75
    try:
        with selectors.DefaultSelector() as selector:
            selector.register(process.stdout, selectors.EVENT_READ)
            while True:
                remaining = deadline - time.monotonic()
                require(remaining > 0)
                ready = selector.select(min(remaining, 1))
                if not ready:
                    continue
                chunk = os.read(process.stdout.fileno(), min(65536, limit + 1 - len(result)))
                if not chunk:
                    break
                result.extend(chunk)
                require(len(result) <= limit)
        require(process.wait(timeout=max(0.1, deadline - time.monotonic())) == 0)
        return bytes(result)
    finally:
        if process.poll() is None:
            process.kill()
        process.wait(timeout=5)
        process.stdout.close()


def artifact(label):
    global STAGE
    STAGE = label + "_artifact_identity"
    artifact_id, run_id, size, digest, workflow = CONFIG[label]
    prefix = "repos/" + REPO + "/actions/"
    metadata = decode_json(gh(prefix + "artifacts/" + str(artifact_id), 262144))
    run = decode_json(gh(prefix + "runs/" + str(run_id), 524288))
    require(metadata["id"] == artifact_id and metadata["size_in_bytes"] == size
            and metadata["expired"] is False and metadata.get("digest") == "sha256:" + digest)
    if label == "live":
        require(metadata["name"] == "dic-coffee-completeness-40066955938")
    identity = metadata["workflow_run"]
    require(identity["id"] == run_id and identity["repository_id"] == REPO_ID
            and identity["head_repository_id"] == REPO_ID and identity["head_sha"] == HEAD)
    require(run["id"] == run_id and run["head_sha"] == HEAD and run["path"] == workflow
            and run["repository"]["id"] == REPO_ID and run["repository"]["full_name"] == REPO
            and run["head_repository"]["id"] == REPO_ID
            and run["head_repository"]["full_name"] == REPO
            and run["status"] == "completed"
            and run["conclusion"] == ("failure" if label == "live" else "success"))
    STAGE = label + "_download_hash"
    data = gh(prefix + "artifacts/" + str(artifact_id) + "/zip", size)
    require(len(data) == size and sha(data) == digest)
    archive = zipfile.ZipFile(io.BytesIO(data))
    members = archive.infolist()
    require(len(members) <= 2048 and len({x.filename for x in members}) == len(members))
    require(sum(x.file_size for x in members) <= 256 * 1024 * 1024)
    for info in members:
        path = PurePosixPath(info.filename)
        mode = stat.S_IFMT(info.external_attr >> 16)
        require(not path.is_absolute() and ".." not in path.parts
                and "\\" not in info.filename and "\x00" not in info.filename
                and not info.flag_bits & 1 and mode in (0, stat.S_IFREG, stat.S_IFDIR)
                and info.file_size <= 64 * 1024 * 1024)
    emit("artifact_identity", {"label": label, "artifact_id": artifact_id, "run_id": run_id,
                              "head_sha": HEAD, "bytes": size, "sha256": digest})
    return archive


def member(archive, name, limit, digest=None):
    require(name in archive.namelist())
    info = archive.getinfo(name)
    require(not info.is_dir() and info.file_size <= limit)
    with archive.open(info) as stream:
        data = stream.read(limit + 1)
    require(len(data) == info.file_size and len(data) <= limit)
    if digest:
        require(sha(data) == digest)
    return data


def word(value):
    return value if isinstance(value, str) and re.fullmatch(r"[A-Za-z0-9_@.-]{1,100}", value) else "other"


def scalar(value, depth=0):
    if depth > 5:
        return {"omitted_depth": True}
    if value is None or isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, str):
        if PRIVATE.search(value):
            return {"omitted_sensitive_pattern": True}
        raw = value.encode("utf-8")
        text = raw[:2000].decode("utf-8", errors="ignore")
        return text if len(raw) <= 2000 else {"text": text, "truncated": True, "bytes": len(raw)}
    if isinstance(value, list):
        return [scalar(item, depth + 1) for item in value[:32]]
    if isinstance(value, dict):
        return {word(key): scalar(item, depth + 1) for key, item in list(value.items())[:40]
                if not PRIVATE.search(str(key))}
    return {"type": type(value).__name__}


def public_url(value):
    if not isinstance(value, str) or len(value) > 3000:
        return None
    try:
        url = urlsplit(value)
        if url.scheme != "https" or not url.hostname or url.username or url.password:
            return None
        return url._replace(query="", fragment="").geturl()
    except ValueError:
        return None


def url_shape(value):
    shape = {"present": value is not None, "string": isinstance(value, str)}
    variant = None
    if not isinstance(value, str) or len(value) > 3000:
        return shape, variant
    try:
        raw = urlsplit(value)
        url = urlsplit(urljoin(SOURCE, value))
        query = parse_qsl(url.query, keep_blank_values=True, max_num_fields=100)
        variants = [v for k, v in query if k == "variant"]
        valid = len(variants) == 1 and bool(re.fullmatch(r"[1-9][0-9]{0,29}", variants[0]))
        variant = variants[0] if valid else None
        shape.update({"absolute": bool(raw.scheme), "https": url.scheme == "https",
                      "has_credentials": bool(url.username or url.password),
                      "same_origin": url.scheme == "https" and url.hostname == "nomadcoffee.es" and url.port in (None, 443),
                      "same_product_path": url.path.rstrip("/") == urlsplit(SOURCE).path,
                      "root_path": url.path in ("", "/"),
                      "fragment_schema_product": bool(re.fullmatch(r"/schema/Product/[A-Za-z0-9._~-]{1,200}", url.fragment, re.I)),
                      "fragment_schema_offer": bool(re.fullmatch(r"/schema/Offer/[A-Za-z0-9._~-]{1,200}", url.fragment, re.I)),
                      "query_keys": sorted({word(k) for k, v in query}),
                      "variant_count": len(variants), "single_numeric_variant": valid,
                      "fragment_class": "none" if not url.fragment else "exact_offer" if url.fragment.lower() == "offer" else "other"})
    except ValueError:
        shape["invalid"] = True
    return shape, variant


def typed(value, kind):
    types = value.get("@type", []) if isinstance(value, dict) else []
    return kind in [str(item).lower() for item in (types if isinstance(types, list) else [types])]


class JsonScripts(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.active = False
        self.parts = []
        self.documents = []
    def handle_starttag(self, tag, attrs):
        if tag == "script":
            kind = dict(attrs).get("type", "").lower()
            self.active = kind in ("application/json", "application/ld+json")
            self.parts = []
    def handle_data(self, data):
        if self.active:
            self.parts.append(data)
    def handle_endtag(self, tag):
        if tag == "script" and self.active:
            self.active = False
            value = "".join(self.parts)
            require(len(value) <= 4 * 1024 * 1024)
            try:
                self.documents.append(json.loads(value))
            except (ValueError, RecursionError):
                pass


def shapes(documents):
    rows = []
    stack = [(document, "script[" + str(i) + "]", 0, None) for i, document in enumerate(documents)]
    visited = 0
    while stack:
        item, path, depth, parent = stack.pop()
        visited += 1
        require(visited <= 20000 and depth <= 32)
        if isinstance(item, dict):
            product = typed(item, "product") or typed(item, "productgroup")
            offer = typed(item, "offer")
            context = parent
            if product or offer:
                u, uv = url_shape(item.get("url"))
                ident, iv = url_shape(item.get("@id"))
                row = {"path": path, "kind": "Product" if product else "Offer",
                       "url": u, "id": ident, "own_url_key": "url" in item,
                       "own_id_key": "@id" in item, "parent_product": parent,
                       "url_and_id_variants_equal": bool(uv and iv and uv == iv),
                       "checkout_template_present": "checkoutPageURLTemplate" in item}
                rows.append(row)
                require(len(rows) <= 120)
                if product:
                    context = {"path": path, "own_url_key": "url" in item, "own_id_key": "@id" in item,
                               "url_same_product": bool(u.get("same_origin") and u.get("same_product_path")),
                               "id_same_product": bool(ident.get("same_origin") and ident.get("same_product_path"))}
            for key, value in item.items():
                if isinstance(value, (dict, list)):
                    stack.append((value, path + "." + word(key), depth + 1, context))
        elif isinstance(item, list):
            require(len(item) <= 2000)
            for i, value in enumerate(item):
                if isinstance(value, (dict, list)):
                    stack.append((value, path + "[" + str(i) + "]", depth + 1, parent))
    return rows


def live():
    global STAGE
    with artifact("live") as archive:
        STAGE = "nomad_structural_projection"
        result = decode_json(member(archive, "results.json", 2 * 1024 * 1024))
        require(result["source_sha"] == HEAD and result["source_worktree_dirty"] is False
                and result["workflow_sha"] == HEAD)
        rows = [x for x in result["results"] if x["id"] == "nomad-centroamericano"]
        require(len(rows) == 1)
        target = rows[0]
        allowed = ("kind", "original_sha256", "sanitized_sha256", "bytes", "sanitized_bytes",
                   "sanitization_preserves_html_extraction", "parity_differences", "parity_field_differences",
                   "parity_conflicts_original", "parity_conflicts_replay", "parity_source_fact_counts",
                   "parity_missing_source_fact_examples", "parity_changed_product_attributes",
                   "parity_offer_key_differences")
        captures = []
        for capture in target["captures"]:
            captures.append({key: scalar(capture[key]) for key in allowed if key in capture})
            if capture.get("fixture", "").endswith(".fixture.html"):
                name = capture["fixture"]
                require(re.fullmatch(r"nomad-centroamericano-[0-9]+\.fixture\.html", name))
                data = member(archive, name, 8 * 1024 * 1024, capture["sanitized_sha256"])
                parser = JsonScripts()
                parser.feed(data.decode("utf-8"))
                parser.close()
                emit("nomad_product_offer_shapes", {"fixture": name, "sha256": sha(data),
                                                  "json_scripts": len(parser.documents),
                                                  "objects": shapes(parser.documents)})
        emit("nomad_structural_parity", {"id": target["id"], "captures": captures})



def clipped_text(value, limit):
    if not isinstance(value, str):
        return scalar(value)
    if PRIVATE.search(value):
        return {"omitted_sensitive_pattern": True}
    raw = value.encode("utf-8")
    if len(raw) <= limit:
        return value
    return {"text": raw[:limit].decode("utf-8", errors="ignore"),
            "truncated": True, "original_bytes": len(raw)}


def plain_fact_value(fact):
    value = fact.get("value")
    if not isinstance(value, str) or not value.strip() or PRIVATE.search(value):
        return None
    if fact.get("format") == "json" or value.lstrip().startswith(("{", "[")):
        return None
    if re.search(r"product (?:attributes|media|variants|offers)", str(fact.get("label", "")), re.I):
        return None
    return value


def missing_projection(index, compare, comparison):
    # These are the historical 2eb/C11 rows, not assertions about later repairs.
    grouped = {}
    total = 0
    normalize = lambda text: re.sub(r"\s+", " ", text).strip().casefold()
    for case_id in sorted(compare):
        output = index[case_id].get("output", {})
        source_facts = output.get("source_facts", [])
        for canonical in compare[case_id]["canonical"]:
            if canonical.get("status") != "missing":
                continue
            field = canonical["field"]
            require(re.fullmatch(r"[a-z_]{1,60}", field))
            expected = canonical.get("expected")
            expected_text = expected if isinstance(expected, str) else ""
            quotes = canonical.get("evidence", [])
            require(isinstance(quotes, list))
            quote_texts = [item.get("quote") for item in quotes if isinstance(item, dict)
                           and isinstance(item.get("quote"), str)]
            query_quotes = [normalize(value) for value in quote_texts if len(value) >= 6]
            query_expected = normalize(expected_text)
            words = {value for value in re.findall(r"[^\W_]{3,}", query_expected)
                     if value not in {"coffee", "with", "from", "this", "that", "and", "the", "our", "other"}}
            matches = []
            for position, fact in enumerate(source_facts):
                value = plain_fact_value(fact)
                if value is None:
                    continue
                normalized = normalize(value)
                score, basis, at = 0, None, 0
                for quote in query_quotes:
                    where = normalized.find(quote)
                    if where >= 0:
                        score, basis, at = 4, "frozen_quote", where
                        break
                if not score and fact.get("field") == field:
                    score, basis = 3, "explicit_field"
                if not score and query_expected and len(query_expected) >= 3:
                    where = normalized.find(query_expected)
                    if where >= 0:
                        score, basis, at = 2, "expected_phrase", where
                if not score and len(words) >= 2:
                    hits = [word for word in words if re.search(r"\b" + re.escape(word) + r"\b", normalized)]
                    if len(hits) >= min(2, len(words)):
                        score, basis, at = 1, "expected_word_overlap", normalized.find(hits[0])
                if not score:
                    continue
                # Use a bounded literal excerpt around the match. The original
                # value length and clipping are explicit; no text is invented.
                plain = re.sub(r"\s+", " ", value).strip()
                excerpt_start = max(0, at - 180) if len(plain.encode("utf-8")) > 750 else 0
                excerpt = plain[excerpt_start:]
                projected = {"source_fact_index": position, "match_basis": basis,
                             "field": word(fact.get("field")), "label": clipped_text(fact.get("label"), 120),
                             "source_type": word(fact.get("source_type")), "section": clipped_text(fact.get("section"), 120),
                             "source_url": public_url(fact.get("source_url")),
                             "context": clipped_text(excerpt, 750),
                             "normalized_excerpt_starts_at_character": excerpt_start,
                             "context_whitespace_normalized": True,
                             "source_value_bytes": len(value.encode("utf-8"))}
                matches.append((score, position, projected))
            matches.sort(key=lambda row: (-row[0], row[1]))
            selected = []
            seen = set()
            for _, _, projected in matches:
                tag = json.dumps(projected["context"], sort_keys=True)
                if tag in seen:
                    continue
                seen.add(tag)
                selected.append(projected)
                if len(selected) == 2:
                    break
            evidence = [{"capture_id": word(item.get("capture_id")),
                         "quote": clipped_text(item.get("quote"), 500)}
                        for item in quotes[:3] if isinstance(item, dict)]
            row = {"case_id": case_id, "field": field, "expected": clipped_text(expected, 600),
                   "status_at_original_source": "missing",
                   "explicit_conflict": field in (output.get("conflicts") or []),
                   "frozen_evidence": evidence, "frozen_evidence_count": len(quotes),
                   "source_facts_truncated": bool(output.get("source_facts_truncated")),
                   "matching_plain_context_count": len(matches), "context": selected}
            grouped.setdefault(field, []).append(row)
            total += 1
    require(total == 167 == comparison["counts"]["missing"])
    require(all(len(rows) == comparison["by_field"][field]["missing"] for field, rows in grouped.items()))
    emit("missing_canonical_inventory", {"source_commit": HEAD, "runtime_fingerprint": FP,
        "comparison_sha256": HASHES["candidate11-comparison.json"], "replay_sha256": HASHES["candidate11-replay.json"],
        "rows": total, "by_field": {field: len(rows) for field, rows in sorted(grouped.items())},
        "scope": "Original 2eb/C11 missing rows; classify later improvements from their separate full-run deltas.",
        "automatic_adjudication": False})
    for field, rows in sorted(grouped.items()):
        for start in range(0, len(rows), 20):
            emit("missing_canonical_group", {"source_commit": HEAD, "field": field,
                "total_in_field": len(rows), "start_index": start, "rows": rows[start:start + 20]})


def frozen():
    global STAGE
    with artifact("frozen") as archive:
        STAGE = "frozen_manifest_and_receipt"
        manifest_bytes = member(archive, "artifact-manifest.json", 125937, HASHES["artifact-manifest.json"])
        require(len(manifest_bytes) == 125937)
        manifest = decode_json(manifest_bytes)
        require(manifest["excludes_transfer_manifest_and_original_source_captures"] is True)
        entries = {row["file"]: row for row in manifest["files"]}
        require(len(entries) == len(manifest["files"]))
        def verified(name):
            row = entries[name]
            require(isinstance(row["bytes"], int) and 0 <= row["bytes"] <= 64 * 1024 * 1024
                    and re.fullmatch(r"[0-9a-f]{64}", row["sha256"]))
            if name in HASHES:
                require(row["sha256"] == HASHES[name])
            data = member(archive, name, row["bytes"], row["sha256"])
            require(len(data) == row["bytes"])
            return data
        receipt_bytes = verified("candidate11-benchmark-receipt.json")
        require(len(receipt_bytes) == 8018)
        emit("exact_frozen_receipt", {"file": "candidate11-benchmark-receipt.json",
                                    "bytes": len(receipt_bytes), "sha256": sha(receipt_bytes),
                                    "encoding": "base64", "content": base64.b64encode(receipt_bytes).decode("ascii")})
        summary = decode_json(verified("summary.json"))
        require(summary["source_commit"] == HEAD and summary["runtime_fingerprint"] == FP
                and summary["status"] == "PASS")
        allowed = ("status", "candidate", "source_commit", "source_tree", "runtime_fingerprint",
                   "corpus", "canonical", "supplementary_retention", "complete_output_call_changes",
                   "canonical_exact_losses", "supplementary_full_retention_losses", "actual_client_exports",
                   "offline_helper", "blockers", "expected_values_changed", "scoring_rules_changed",
                   "production_or_member_operations", "new_api_keys_or_paid_services")
        emit("frozen_summary", {key: scalar(summary[key]) for key in allowed if key in summary})
        STAGE = "frozen_nine_case_projection"
        replay = decode_json(verified("candidate11-replay.json"))
        comparison = decode_json(verified("candidate11-comparison.json"))
        index = {row["case_id"]: row for row in replay["records"]}
        compare = {row["case_id"]: row for row in comparison["records"]}
        require(len(index) == len(replay["records"]) == 603
                and len(compare) == len(comparison["records"]) == 603
                and set(index) == set(compare) and set(CASE_IDS) <= set(index))
        emit("comparison_totals", {"counts": scalar(comparison["counts"]), "by_field": scalar(comparison["by_field"])})
        missing_projection(index, compare, comparison)
        for case_id in CASE_IDS:
            record = index[case_id]
            output = record.get("output", {})
            facts = []
            relevant_count = 0
            for fact in output.get("source_facts", []):
                value = fact.get("value")
                if not isinstance(value, str) or not RELEVANT.search(value):
                    continue
                if fact.get("format") == "json" or re.search(r"product (?:attributes|media|variants|offers)", str(fact.get("label", "")), re.I) or value.lstrip().startswith(("{", "[")) or PRIVATE.search(value):
                    continue
                relevant_count += 1
                if len(facts) >= 12:
                    continue
                row = {key: scalar(fact.get(key)) for key in ("field", "label", "source_type", "section")}
                row["value"] = scalar(value)
                row["source_url"] = public_url(fact.get("source_url"))
                facts.append(row)
            canonical = [{key: scalar(row[key]) for key in
                          ("field", "expected", "actual", "status", "evidence", "missing_tokens", "extra_tokens")
                          if key in row} for row in compare[case_id]["canonical"]]
            emit("frozen_selected_case", {"case_id": case_id, "roaster_id": word(record.get("roaster_id")),
                                         "source_url": public_url(record.get("source_url")),
                                         "fields": scalar(output.get("fields")),
                                         "conflicts": scalar(output.get("conflicts")),
                                         "canonical": canonical, "facts": facts,
                                         "matching_public_text_facts": relevant_count,
                                         "facts_omitted_by_count": max(0, relevant_count - len(facts))})


def main():
    require(os.environ.get("GITHUB_REPOSITORY") == REPO
            and os.environ.get("GITHUB_REF_NAME") == BRANCH
            and os.environ.get("GITHUB_EVENT_NAME") == "push"
            and re.fullmatch(r"[0-9a-f]{40}", os.environ.get("GITHUB_SHA", ""))
            and bool(os.environ.get("GH_TOKEN")))
    emit("diagnostic_source", {"sha": os.environ["GITHUB_SHA"], "input_source_sha": HEAD,
                               "network_scope": "fixed same-repository GitHub Actions artifact reads only",
                               "production_or_member_operations": False})
    live()
    frozen()
    emit("forensics_complete", {"status": "PASS", "expected_values_changed": False})


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        emit("forensics_failure", {"status": "FAIL", "stage": STAGE, "error_class": type(error).__name__})
        sys.exit(1)
