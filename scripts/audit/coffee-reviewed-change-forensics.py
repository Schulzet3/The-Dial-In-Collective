#!/usr/bin/env python3
"""Read a pinned failed Candidate 12 artifact for independent source review.

This prints existing public-source evidence and exact review material. It never
approves changes, edits an oracle, fetches roaster pages, extracts archives,
executes archived code, or writes a GitHub reference.
"""
from __future__ import annotations

import argparse
import base64
import contextlib
import difflib
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import selectors
import stat
import subprocess
import sys
import time
import unittest
import warnings
import zipfile

REPO = "Schulzet3/The-Dial-In-Collective"
REPO_ID = 1355472654
BRANCH = "work/issue33-candidate12-full-audit-20261024"
WORKFLOW = ".github/workflows/coffee-frozen-corpus.yml"
FREEZE = "0bd751f68aba81d17204418a6d016a66815afdc82095d7a89c5f856eab05b2cb"
ATTESTATION = "0767e52af1a5483ef31beba01d9fa70666a17de10634bb9cb1cc933a6b105556"
SOURCE_ARCHIVE = "696c011e97e94eb2a9ec1b12c66efdf1ce15636d7df999751279bb0f381cce52"
RECOVERY_ARCHIVE = "728bd52965538879f116d0e384984d7a49becbb9224b092f587a71e24b4e6cce"
C8_FP = "301346616618784a5ff926ddb9302b3be6e2710bea74c3a47e3d476e02ca812c"
C8 = {
    "replay": "d5e3b098c15595a4d03554024f8c57b7d4a1bf7251b4b743f96cb432099bcf12",
    "comparison": "86701191b7a6f7d2e90060a1bcc2d8658d35e66670168a5cdfb1878255694aa3",
    "retention": "8f7b9b25a284ea2f0f06cd43b5d07a21469f1c20a80ad47612ac6a7c31880088",
}
CLIENT_EXPORT = "2c201e75232bba85df667bc1b8a90182b92e3f5c51d6d17cbaf15847718b3469"
MEMBERS = {
    "replay": "candidate12-replay.json", "comparison": "candidate12-comparison.json",
    "retention": "candidate12-retention.json", "report": "candidate12-frozen-audit.html",
    "receipt": "candidate12-benchmark-receipt.json", "review_material": "review-material.json",
    "actual_exports": "actual-exports.json",
}
MAX_ENTRY = 64 * 1024 * 1024
MAX_TOTAL = 256 * 1024 * 1024
MAX_EMIT = 180000
MAX_ALL_EMIT = 4 * 1024 * 1024
EMITTED = 0
STAGE = "startup"
PRIVATE = re.compile(
    r"authorization|bearer\s|password|csrf|session.?token|access.?token|api.?key|"
    r"completion_token|download_url|oaiusercontent\.com|DIC_FROZEN_(?:INPUT|ENCRYPTED)|"
    r"[?&](?:token|sig|secret|key)=", re.I)


def require(condition, message="forensic verification failed"):
    if not condition:
        raise ValueError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def digest(value):
    return isinstance(value, str) and re.fullmatch(r"[0-9a-f]{64}", value) is not None and value != "0" * 64


def exact(value, keys):
    require(isinstance(value, dict) and set(value) == set(keys), "missing or unrecognized config/evidence properties")


def decode_json(data):
    def pairs(items):
        result = {}
        for key, value in items:
            require(key not in result, "duplicate JSON property")
            result[key] = value
        return result
    def constant(_value):
        raise ValueError("nonfinite JSON number")
    return json.loads(data.decode("utf-8"), object_pairs_hook=pairs, parse_constant=constant)


def stable_hash(value):
    return sha(json.dumps(value, ensure_ascii=False, sort_keys=True,
                          separators=(",", ":"), allow_nan=False).encode("utf-8"))


def case_hash(value):
    return stable_hash({key: item for key, item in value.items() if key != "elapsed_ms"})


def inventory_hash(rows):
    return stable_hash([{"case_id": case_id, "sha256": case_hash(rows[case_id])} for case_id in sorted(rows)])


def same(first, second):
    if type(first) in (int, float) and type(second) in (int, float):
        return first == second
    if type(first) is not type(second):
        return False
    if isinstance(first, dict):
        return first.keys() == second.keys() and all(same(value, second[key]) for key, value in first.items())
    if isinstance(first, list):
        return len(first) == len(second) and all(same(a, b) for a, b in zip(first, second))
    return first == second


def safe_public(value, depth=0):
    require(depth <= 40, "public evidence depth limit")
    if isinstance(value, str):
        require(not PRIVATE.search(value), "sensitive-pattern evidence cannot be printed")
        require(len(value.encode("utf-8")) <= 16384, "public evidence string limit")
    elif isinstance(value, dict):
        require(len(value) <= 256, "public evidence object limit")
        for key, item in value.items():
            safe_public(key, depth + 1)
            safe_public(item, depth + 1)
    elif isinstance(value, list):
        require(len(value) <= 4096, "public evidence array limit")
        for item in value:
            safe_public(item, depth + 1)
    else:
        require(value is None or type(value) in (bool, int, float), "unsupported public evidence value")


def emit(kind, value, encoded_bytes=False):
    global EMITTED
    if not encoded_bytes:
        safe_public(value)
    raw = json.dumps({"kind": kind, "evidence": value}, ensure_ascii=True, separators=(",", ":"))
    size = len(raw.encode("utf-8"))
    require(size <= MAX_EMIT and EMITTED + size <= MAX_ALL_EMIT, "forensic output limit; no silent truncation")
    EMITTED += size
    print(raw, flush=True)


def emit_exact_material(raw):
    value = decode_json(raw)
    safe_public(value)
    encoded = base64.b64encode(raw).decode("ascii")
    chunks = [encoded[index:index + 100000] for index in range(0, len(encoded), 100000)]
    require(1 <= len(chunks) <= 32, "exact review-material output limit")
    for index, chunk in enumerate(chunks):
        emit("exact_review_material", {"file": "review-material.json", "bytes": len(raw), "sha256": sha(raw),
                                      "encoding": "base64", "chunk_index": index, "chunk_count": len(chunks),
                                      "content": chunk}, encoded_bytes=True)


def check_config(config):
    exact(config, ("schema_version", "type", "repository", "candidate", "head_sha", "source_tree",
                   "runtime_fingerprint", "run_id", "run_attempt", "artifact_id", "artifact_bytes",
                   "artifact_sha256", "artifact_name", "artifact_manifest", "members"))
    require(type(config["schema_version"]) is int and config["schema_version"] == 1
            and config["type"] == "candidate12_frozen_change_forensics"
            and config["repository"] == REPO and type(config["candidate"]) is int and config["candidate"] == 12,
            "unexpected forensic config identity")
    for key in ("head_sha", "source_tree"):
        value = config[key]
        require(isinstance(value, str) and re.fullmatch(r"[0-9a-f]{40}", value) and value != "0" * 40,
                "missing exact source commit/tree pin")
    require(digest(config["runtime_fingerprint"]) and digest(config["artifact_sha256"]),
            "missing exact runtime/artifact pin")
    for key in ("run_id", "run_attempt", "artifact_id", "artifact_bytes"):
        require(type(config[key]) is int and config[key] > 0, "invalid run/artifact identity")
    require(config["artifact_bytes"] <= MAX_ENTRY, "artifact download limit")
    require(config["artifact_name"] == "dic-frozen603-candidate12-" + str(config["run_id"])
            + "-" + str(config["run_attempt"]), "artifact name does not bind the candidate/run/attempt")
    exact(config["artifact_manifest"], ("file", "bytes", "sha256"))
    require(config["artifact_manifest"]["file"] == "artifact-manifest.json"
            and type(config["artifact_manifest"]["bytes"]) is int
            and 0 < config["artifact_manifest"]["bytes"] <= 2 * 1024 * 1024
            and digest(config["artifact_manifest"]["sha256"]), "missing artifact manifest pin")
    exact(config["members"], MEMBERS)
    for key, name in MEMBERS.items():
        row = config["members"][key]
        exact(row, ("file", "bytes", "sha256"))
        require(row["file"] == name and type(row["bytes"]) is int and 0 < row["bytes"] <= MAX_ENTRY
                and digest(row["sha256"]), "missing exact Candidate12 result member pin")
    return config


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





def validate_remote_identity(config, metadata, run):
    require(metadata.get("id") == config["artifact_id"] and metadata.get("name") == config["artifact_name"]
            and metadata.get("size_in_bytes") == config["artifact_bytes"] and metadata.get("expired") is False
            and metadata.get("digest") == "sha256:" + config["artifact_sha256"], "artifact identity differs")
    source = metadata["workflow_run"]
    require(source["id"] == config["run_id"] and source["repository_id"] == REPO_ID
            and source["head_repository_id"] == REPO_ID and source["head_sha"] == config["head_sha"]
            and source["head_branch"] == BRANCH, "artifact source/run differs")
    require(run["id"] == config["run_id"] and run["run_attempt"] == config["run_attempt"]
            and run["head_sha"] == config["head_sha"] and run["head_branch"] == BRANCH
            and run["path"] == WORKFLOW and run["event"] == "pull_request"
            and run["repository"]["id"] == REPO_ID and run["repository"]["full_name"] == REPO
            and run["head_repository"]["id"] == REPO_ID and run["head_repository"]["full_name"] == REPO
            and run["status"] == "completed" and run["conclusion"] == "failure",
            "expected completed first failed full frozen run is unavailable")


def validate_zip(archive):
    infos = archive.infolist()
    require(0 < len(infos) <= 2048 and len({row.filename for row in infos}) == len(infos),
            "duplicate or excessive ZIP entries")
    require(sum(row.file_size for row in infos) <= MAX_TOTAL, "uncompressed ZIP size limit")
    for row in infos:
        path = PurePosixPath(row.filename)
        mode = stat.S_IFMT(row.external_attr >> 16)
        require(row.filename and not path.is_absolute() and ".." not in path.parts
                and path.as_posix() == row.filename.rstrip("/")
                and "\\" not in row.filename and "\x00" not in row.filename
                and not row.flag_bits & 1 and mode in (0, stat.S_IFREG, stat.S_IFDIR)
                and 0 <= row.file_size <= MAX_ENTRY, "unsafe or excessive ZIP member")


def member(archive, name, expected=None, limit=MAX_ENTRY):
    require(name in archive.namelist(), "required result member is absent")
    info = archive.getinfo(name)
    require(not info.is_dir() and 0 < info.file_size <= limit, "result member size limit")
    with archive.open(info) as stream:
        raw = stream.read(limit + 1)
    require(len(raw) == info.file_size and len(raw) <= limit, "result member expanded beyond its bound")
    if expected is not None:
        require(expected["file"] == name and expected["bytes"] == len(raw) and expected["sha256"] == sha(raw),
                "result member hash or size differs")
    return raw


def manifest_files(archive, raw):
    manifest = decode_json(raw)
    exact(manifest, ("files", "excludes_transfer_manifest_and_original_source_captures"))
    require(manifest["excludes_transfer_manifest_and_original_source_captures"] is True
            and isinstance(manifest["files"], list), "artifact exclusion assertion is absent")
    result = {}
    for row in manifest["files"]:
        exact(row, ("file", "bytes", "sha256"))
        name = row["file"]
        require(isinstance(name, str) and name not in result and name != "artifact-manifest.json"
                and type(row["bytes"]) is int and 0 < row["bytes"] <= MAX_ENTRY and digest(row["sha256"]),
                "invalid artifact manifest record")
        result[name] = row
    actual = {row.filename for row in archive.infolist() if not row.is_dir()} - {"artifact-manifest.json"}
    require(set(result) == actual, "ZIP inventory and exact artifact manifest differ")
    for name, row in result.items():
        require(archive.getinfo(name).file_size == row["bytes"], "manifest member length differs")
    return result


def indexed(document, label):
    rows = document.get("records")
    require(isinstance(rows, list) and all(isinstance(row, dict) for row in rows), "missing full " + label)
    result = {row["case_id"]: row for row in rows}
    require(len(rows) == len(result) == 603, "incomplete or duplicate case inventory")
    return result


def parse_report(raw):
    begin = b'<script id="audit-data" type="application/json">'
    require(raw.count(begin) == 1, "missing unique source-bound report payload")
    start = raw.index(begin) + len(begin)
    end = raw.find(b"</script>", start)
    require(end > start, "incomplete source-bound report payload")
    return decode_json(raw[start:end])


def complete_changes(before, after):
    result = []
    for case_id, old in before.items():
        new = after[case_id]
        first = {key: item for key, item in old.items() if key != "elapsed_ms"}
        second = {key: item for key, item in new.items() if key != "elapsed_ms"}
        if same(first, second):
            continue
        changed = [key for key in sorted(set(first) | set(second))
                   if key not in first or key not in second or not same(first[key], second[key])]
        output_keys = sorted(set(first.get("output", {})) | set(second.get("output", {})))
        result.append({"case_id": case_id, "changed_case_keys": changed,
                       "changed_output_keys": [key for key in output_keys
                           if key not in first.get("output", {}) or key not in second.get("output", {})
                           or not same(first["output"][key], second["output"][key])]})
    return result


def verify_export_rows(archive, files, exports, expected_ids):
    rows = exports["records"]
    require(exports["cases"] == 603 and exports["exports"] == 603 and exports["download_clicks"] == 603
            and exports["client_module_sha256"] == CLIENT_EXPORT and len(rows) == 603,
            "actual current export fidelity is incomplete")
    by_case = {row["case_id"]: row for row in rows}
    require(len(by_case) == 603 and by_case.keys() == expected_ids, "actual export identities differ")
    changed = []
    for case_id, row in by_case.items():
        require(row["file"] == "exports/" + case_id + ".json"
                and row["synthetic_anchor_clicks"] == 1 and type(row["equal"]) is bool
                and digest(row["sha256"]) and digest(row["baseline_sha256"]),
                "actual export receipt differs")
        require(row["equal"] == (row["sha256"] == row["baseline_sha256"]),
                "actual export equality and byte hashes disagree")
        raw = member(archive, row["file"], files[row["file"]])
        require(sha(raw) == row["sha256"] and len(raw) == row["bytes"], "actual Blob bytes differ")
        if not row["equal"]:
            changed.append({"case_id": case_id, "kind": "export_changed"})
    require(exports["equal"] == 603 - len(changed) and same(exports["errors"], changed),
            "actual export errors include more than exact observed changes")
    return by_case


def verify_material(config, material, before, after, export_rows, changes, before_counts, after_counts):
    require(material["type"] == "unapproved_frozen_change_review_material" and material["candidate"] == 12
            and material["status"] == "UNREVIEWED" and material["approval_manifest_generated"] is False
            and material["source_quotes_reviewed"] is False, "material is not the first unapproved result")
    require(material["oracle_freeze_sha256"] == FREEZE
            and material["packet_archive_attestation_sha256"] == ATTESTATION
            and material["source_archive_sha256"] == SOURCE_ARCHIVE
            and material["recovery_archive_sha256"] == RECOVERY_ARCHIVE
            and material["baseline_runtime_fingerprint"] == C8_FP
            and material["baseline_artifacts"] == C8
            and material["candidate_runtime_fingerprint"] == config["runtime_fingerprint"],
            "review material original input/runtime bindings differ")
    require(material["stable_case_projection"] == {
                "format": "python-json-sort-keys-utf8-v1", "ignored_case_properties": ["elapsed_ms"]}
            and material["baseline_stable_cases_sha256"] == inventory_hash(before)
            and material["candidate_stable_cases_sha256"] == inventory_hash(after),
            "complete stable case inventories differ")
    expected_changes = []
    for row in changes:
        case_id = row["case_id"]
        expected_changes.append({**row, "roaster_id": after[case_id]["roaster_id"],
            "source_url": after[case_id]["source_url"], "before_case_sha256": case_hash(before[case_id]),
            "after_case_sha256": case_hash(after[case_id]),
            "before_export_sha256": export_rows[case_id]["baseline_sha256"],
            "after_export_sha256": export_rows[case_id]["sha256"]})
    require(expected_changes and same(material["changes"], expected_changes)
            and same(material["baseline_counts"], before_counts)
            and same(material["candidate_counts"], after_counts)
            and material["actual_export_changed_cases"] == [
                case_id for case_id, row in export_rows.items() if not row["equal"]],
            "review material omits or changes an actual case/export/score difference")
    require(set(material["actual_export_changed_cases"]) <= {row["case_id"] for row in changes},
            "unaccounted export-only difference")


def value_differences(before, after, path=""):
    """Exact changed leaves, retaining explicit absence and ordered array values."""
    if same(before, after):
        return []
    if isinstance(before, dict) and isinstance(after, dict):
        result = []
        for key in sorted(set(before) | set(after)):
            pointer = path + "/" + key.replace("~", "~0").replace("/", "~1")
            if key not in before or key not in after:
                result.append({"path": pointer, "before_present": key in before, "after_present": key in after,
                               **({"before": before[key]} if key in before else {}),
                               **({"after": after[key]} if key in after else {})})
            else:
                result.extend(value_differences(before[key], after[key], pointer))
        return result
    return [{"path": path, "before_present": True, "after_present": True, "before": before, "after": after}]


def fact_projection(fact):
    require(isinstance(fact, dict), "invalid changed source fact")
    value = fact.get("value")
    structured = fact.get("format") == "json"
    if isinstance(value, str) and value.lstrip().startswith(("{", "[")):
        try:
            structured = structured or isinstance(json.loads(value), (dict, list))
        except ValueError:
            pass
    if structured:
        # Do not print whole product/media JSON merely because a surrounding fact changed.
        metadata = {key: item for key, item in fact.items() if key != "value"}
        safe_public(metadata)
        return {"complete": False, "reason": "structured_fact_needs_targeted_field_review",
                "fact_sha256": stable_hash(fact), "value_utf8_bytes": len(value.encode("utf-8")) if isinstance(value, str) else None,
                "metadata": metadata}
    safe_public(fact)
    return {"complete": True, "fact": fact}


def fact_differences(before, after):
    require(isinstance(before, list) and isinstance(after, list) and max(len(before), len(after)) <= 4096,
            "source-fact inventory limit")
    matcher = difflib.SequenceMatcher(a=[stable_hash(row) for row in before],
                                     b=[stable_hash(row) for row in after], autojunk=False)
    result, complete = [], True
    for kind, first, last, start, end in matcher.get_opcodes():
        if kind == "equal":
            continue
        original = [fact_projection(row) for row in before[first:last]]
        current = [fact_projection(row) for row in after[start:end]]
        complete = complete and all(row["complete"] for row in original + current)
        result.append({"operation": kind, "before_span": [first, last], "after_span": [start, end],
                       "before": original, "after": current})
    return result, complete



TARGETED_CONTEXTS = {
    "www-limacoffeeroasters-com__kenya-kichwa-tembo-0224337e": ("Kibugu",),
    "vestacoffee-com__kamwangi-kenya-cbf1ab54": ("New Ngariama",),
    "mauicoffeeroasters-com__fresh-trades-8oz-d0540271": ("cola-like",),
    "www-nunatakcoffee-com__raven-espresso-8fe55e93": ("dark chocolate", "blueberry preserves", "hazelnut liqueur"),
    "larryscoffee-com__coffee-111-4366f999": ("Dehab",),
}


def targeted_original_context(case_id, before, after, report_case):
    """Emit bounded whole plain-text facts that already existed in pinned C8."""
    require(case_id in TARGETED_CONTEXTS and before.get("case_id") == case_id
            and after.get("case_id") == case_id and report_case.get("case_id") == case_id,
            "unexpected targeted context identity")
    require(before.get("source_url") == after.get("source_url") == report_case.get("source_url"),
            "targeted context source differs")
    captures = report_case.get("captures")
    require(isinstance(captures, list) and 0 < len(captures) <= 32
            and len({row["label"] for row in captures}) == len(captures)
            and len({row["file"] for row in captures}) == len(captures),
            "targeted original capture inventory differs")
    for row in captures:
        require(isinstance(row["file"], str) and PurePosixPath(row["file"]).name == row["file"]
                and "\\" not in row["file"] and digest(row["sha256"])
                and type(row["bytes"]) is int and row["bytes"] >= 0,
                "invalid targeted original capture metadata")
    original = before.get("output", {}).get("source_facts", [])
    current = after.get("output", {}).get("source_facts", [])
    require(isinstance(original, list) and isinstance(current, list)
            and max(len(original), len(current)) <= 4096, "targeted fact inventory limit")
    current_indices = {}
    for index, fact in enumerate(current):
        current_indices.setdefault(stable_hash(fact), []).append(index)
    matches, omitted, seen = [], [], set()
    needles = tuple(value.casefold() for value in TARGETED_CONTEXTS[case_id])
    for index, fact in enumerate(original):
        require(isinstance(fact, dict), "invalid original targeted source fact")
        value = fact.get("value")
        if not isinstance(value, str) or not any(needle in value.casefold() for needle in needles):
            continue
        fingerprint = stable_hash(fact)
        if fingerprint in seen:
            continue
        seen.add(fingerprint)
        if fact.get("format") == "html" or re.search(r"</?[A-Za-z][^<>]{0,500}>", value):
            omitted.append({"fact_sha256": fingerprint, "reason": "raw_markup_not_emitted"})
            continue
        projected = fact_projection(fact)
        if not projected["complete"]:
            omitted.append({"fact_sha256": fingerprint, "reason": "structured_product_data_not_emitted"})
            continue
        require(fingerprint in current_indices, "original context fact changed or disappeared")
        require(0 < len(value.encode("utf-8")) <= 12000, "targeted plain-text fact size limit")
        matches.append({"baseline_fact_index": index, "current_fact_indices": current_indices[fingerprint],
                        "fact_sha256": fingerprint, "fact": fact,
                        "complete_stored_value_emitted": True, "unchanged_from_c8": True})
    require(1 <= len(matches) <= 12, "missing or excessive unchanged plain-text context")
    result = {"case_id": case_id, "source_url": before["source_url"],
              "scope": "Fixed targeted whole plain-text facts from hash-bound original C8 replay",
              "original_capture_bindings": captures,
              "matched_original_plain_text_facts": matches, "omitted_structured_matches": omitted,
              "original_source_facts_truncated": before.get("output", {}).get("source_facts_truncated"),
              "current_source_facts_truncated": after.get("output", {}).get("source_facts_truncated"),
              "raw_capture_bytes_read": False, "new_output_used_as_source_evidence": False,
              "literal_capture_validation_still_required_on_reviewed_rerun": True,
              "independent_source_review_completed": False, "approval_generated": False}
    safe_public(result)
    return result



def targeted_context_failure(case_id, before, after, error):
    """Describe a failed fixed selector without echoing any source or exception value."""
    require(case_id in TARGETED_CONTEXTS, "unexpected diagnostic case")
    reasons = {
        "unexpected targeted context identity": "IDENTITY_MISMATCH",
        "targeted context source differs": "SOURCE_MISMATCH",
        "targeted original capture inventory differs": "CAPTURE_INVENTORY",
        "invalid targeted original capture metadata": "CAPTURE_METADATA",
        "targeted fact inventory limit": "FACT_INVENTORY_LIMIT",
        "invalid original targeted source fact": "FACT_TYPE",
        "original context fact changed or disappeared": "CHANGED_OR_MISSING_FACT",
        "targeted plain-text fact size limit": "FACT_SIZE_LIMIT",
        "missing or excessive unchanged plain-text context": "PLAIN_MATCH_COUNT",
        "sensitive-pattern evidence cannot be printed": "PRIVATE_PATTERN",
        "public evidence string limit": "PUBLIC_STRING_LIMIT",
        "public evidence depth limit": "PUBLIC_STRUCTURE_LIMIT",
        "public evidence object limit": "PUBLIC_STRUCTURE_LIMIT",
        "public evidence array limit": "PUBLIC_STRUCTURE_LIMIT",
    }
    # Only the mapped constant is emitted. Unknown exception text is never returned.
    reason = reasons.get(str(error), "UNCLASSIFIED_CONTEXT_FAILURE")
    original = before.get("output", {}).get("source_facts", [])
    current = after.get("output", {}).get("source_facts", [])
    bounded = isinstance(original, list) and isinstance(current, list) and max(len(original), len(current)) <= 4096
    counts = {key: 0 for key in ("unique_matching_facts", "raw_markup_matches", "structured_matches",
                                 "plain_matches", "unchanged_plain_matches", "changed_plain_matches",
                                 "oversized_plain_matches", "private_or_invalid_plain_matches")}
    if bounded:
        needles = tuple(value.casefold() for value in TARGETED_CONTEXTS[case_id])
        current_hashes = {stable_hash(fact) for fact in current}
        seen = set()
        for fact in original:
            if not isinstance(fact, dict):
                continue
            value = fact.get("value")
            if not isinstance(value, str) or not any(needle in value.casefold() for needle in needles):
                continue
            fingerprint = stable_hash(fact)
            if fingerprint in seen:
                continue
            seen.add(fingerprint)
            counts["unique_matching_facts"] += 1
            if fact.get("format") == "html" or re.search(r"</?[A-Za-z][^<>]{0,500}>", value):
                counts["raw_markup_matches"] += 1
                continue
            structured = fact.get("format") == "json"
            if value.lstrip().startswith(("{", "[")):
                try:
                    structured = structured or isinstance(json.loads(value), (dict, list))
                except ValueError:
                    pass
            if structured:
                counts["structured_matches"] += 1
                continue
            counts["plain_matches"] += 1
            counts["unchanged_plain_matches" if fingerprint in current_hashes else "changed_plain_matches"] += 1
            if not 0 < len(value.encode("utf-8")) <= 12000:
                counts["oversized_plain_matches"] += 1
            try:
                safe_public(fact)
            except (ValueError, TypeError):
                counts["private_or_invalid_plain_matches"] += 1
    result = {"case_id": case_id, "reason_code": reason,
              "original_fact_count": len(original) if isinstance(original, list) else None,
              "current_fact_count": len(current) if isinstance(current, list) else None,
              "inventory_within_diagnostic_bound": bounded, "matching_counts": counts,
              "source_values_emitted": False, "exception_values_emitted": False,
              "context_accepted": False, "approval_generated": False}
    safe_public(result)
    return result


def case_projection(case_id, before, after, old_comparison, comparison, old_retention, retention, report_case):
    require(report_case["case_id"] == case_id and report_case["source_url"] == after["source_url"]
            and same(report_case["candidate_output"], after["output"]), "report case output/source differs")
    captures = report_case["captures"]
    require(isinstance(captures, list) and len(captures) <= 32
            and len({row["label"] for row in captures}) == len(captures)
            and len({row["file"] for row in captures}) == len(captures), "original capture inventory differs")
    for row in captures:
        require(isinstance(row["file"], str) and PurePosixPath(row["file"]).name == row["file"]
                and "\\" not in row["file"] and digest(row["sha256"])
                and type(row["bytes"]) is int and row["bytes"] >= 0, "invalid original capture metadata")
    original = {row["field"]: row for row in old_comparison["canonical"]}
    current = {row["field"]: row for row in comparison["canonical"]}
    require(len(original) == len(old_comparison["canonical"])
            and len(current) == len(comparison["canonical"]) and original.keys() == current.keys(),
            "canonical assertion identities differ")
    for field in original:
        require(same(original[field]["expected"], current[field]["expected"])
                and same(original[field]["evidence"], current[field]["evidence"]),
                "original canonical expected value or quote changed")
    require(len(old_retention["checks"]) == len(retention["checks"]), "supplementary assertion count differs")
    retention_changes = []
    for old, new in zip(old_retention["checks"], retention["checks"]):
        require(all(same(old.get(key), new.get(key))
                    for key in ("assertion_index", "label", "expected", "context", "frozen_evidence")),
                "original supplementary expected value or quote changed")
        if old["status"] != new["status"]:
            retention_changes.append({"assertion_index": old["assertion_index"], "label": old["label"],
                                      "expected": old["expected"], "before_status": old["status"],
                                      "after_status": new["status"], "original_source_quotes": old["frozen_evidence"]})
    first_output = {key: item for key, item in before["output"].items() if key != "source_facts"}
    second_output = {key: item for key, item in after["output"].items() if key != "source_facts"}
    facts, complete = fact_differences(before["output"].get("source_facts", []),
                                      after["output"].get("source_facts", []))
    outside_before = {key: item for key, item in before.items() if key not in ("output", "elapsed_ms")}
    outside_after = {key: item for key, item in after.items() if key not in ("output", "elapsed_ms")}
    result = {
        "case_id": case_id, "roaster_id": after["roaster_id"], "source_url": after["source_url"],
        "original_capture_bindings": captures,
        "original_canonical_assertions": [{"field": key, "expected": row["expected"],
                                          "source_quotes": row["evidence"]} for key, row in original.items()],
        "changed_output_values": value_differences(first_output, second_output, "/output"),
        "changed_case_or_call_values": value_differences(outside_before, outside_after),
        "changed_source_facts": facts,
        "canonical_differences": [{"field": key, "before": original[key], "after": current[key]}
                                 for key in original if not same(original[key], current[key])],
        "supplementary_retention_status_changes": retention_changes,
        "additional_literal_status_changes": [
            {"assertion_index": index, "before": old, "after": new}
            for index, (old, new) in enumerate(zip(old_comparison["additional"], comparison["additional"]))
            if not same(old, new)],
        "complete_changed_fact_values_emitted": complete,
        "independent_source_review_completed": False, "approval_generated": False,
    }
    require(len(old_comparison["additional"]) == len(comparison["additional"]),
            "additional literal assertion count differs")
    safe_public(result)
    return result, complete


def derived_score_counts(comparison, retention):
    """Recount existing scorer records without changing their scoring decisions."""
    counts = dict.fromkeys(("cases", "ok_response", "canonical_assertions", "exact_equivalent",
                            "missing", "review_required", "conflict_assertions", "conflict_withheld",
                            "conflict_unresolved", "additional_facts", "additional_literal_present",
                            "additional_unconfirmed", "unexpected_fields"), 0)
    for row in comparison["records"]:
        require(type(row.get("ok")) is bool, "Invalid comparison response status")
        counts["cases"] += 1
        counts["ok_response"] += int(row["ok"])
        for check in row["canonical"]:
            require(check.get("status") in ("exact_equivalent", "missing", "review_required"),
                    "Unknown canonical scorer status")
            counts["canonical_assertions"] += 1
            counts[check["status"]] += 1
        for check in row["ambiguities"]:
            require(check.get("status") in ("withheld", "review_required"),
                    "Unknown conflict scorer status")
            counts["conflict_assertions"] += 1
            counts["conflict_withheld" if check["status"] == "withheld" else "conflict_unresolved"] += 1
        for check in row["additional"]:
            require(check.get("status") in ("literal_present", "unconfirmed"),
                    "Unknown additional-fact scorer status")
            counts["additional_facts"] += 1
            counts["additional_literal_present" if check["status"] == "literal_present"
                   else "additional_unconfirmed"] += 1
        require(isinstance(row["unexpected"], list), "Invalid unexpected-field scorer records")
        counts["unexpected_fields"] += len(row["unexpected"])
    retained = {"cases": 0, "additional_assertions": 0, "truncated_previews": 0}
    for row in retention["records"]:
        require(type(row.get("source_facts_truncated")) is bool, "Invalid retention truncation status")
        retained["cases"] += 1
        retained["truncated_previews"] += int(row["source_facts_truncated"])
        for check in row["checks"]:
            status = check.get("status")
            require(status in ("all_evidence_retained", "some_evidence_retained", "unconfirmed"),
                    "Unknown supplementary-retention scorer status")
            retained["additional_assertions"] += 1
            retained[status] = retained.get(status, 0) + 1
    require(same(counts, comparison["counts"])
            and same(retained, retention["counts"]),
            "Scorer count dictionaries differ from their independently recounted case records")
    return {"canonical": counts, "supplementary_retention": retained}




def canonical_losses(old, current):
    losses = []
    for case_id, prior in old.items():
        after = {row["field"]: row for row in current[case_id]["canonical"]}
        before = {row["field"]: row for row in prior["canonical"]}
        require(len(before) == len(prior["canonical"]) and len(after) == len(current[case_id]["canonical"])
                and before.keys() == after.keys(), "Canonical assertion identity changed")
        for field, row in before.items():
            require(same(row["expected"], after[field]["expected"])
                    and same(row["evidence"], after[field]["evidence"]),
                    "Frozen canonical expectation or evidence changed")
            if row["status"] == "exact_equivalent" and after[field]["status"] != "exact_equivalent":
                losses.append({"case_id": case_id, "field": field,
                               "before": row, "after": after[field]})
    return losses


def retention_losses(old, current):
    losses = []
    for case_id, prior in old.items():
        before, after = prior["checks"], current[case_id]["checks"]
        require(len(before) == len(after), "Supplementary assertion count changed")
        for first, second in zip(before, after):
            for key in ("assertion_index", "label", "expected", "context", "frozen_evidence"):
                require(same(first.get(key), second.get(key)),
                        "Frozen supplementary assertion identity changed")
            if first["status"] == "all_evidence_retained" and second["status"] != "all_evidence_retained":
                losses.append({"case_id": case_id, "assertion_index": first["assertion_index"],
                               "before": first, "after": second})
    return losses




def examine(config, targeted_contexts_only=False):
    global STAGE
    STAGE = "remote_identity"
    prefix = "repos/" + REPO + "/actions/"
    metadata = decode_json(gh(prefix + "artifacts/" + str(config["artifact_id"]), 262144))
    run = decode_json(gh(prefix + "runs/" + str(config["run_id"]), 524288))
    validate_remote_identity(config, metadata, run)
    STAGE = "archive_hash_and_inventory"
    raw = gh(prefix + "artifacts/" + str(config["artifact_id"]) + "/zip", config["artifact_bytes"])
    require(len(raw) == config["artifact_bytes"] and sha(raw) == config["artifact_sha256"],
            "artifact ZIP bytes differ from the independently supplied pin")
    archive = zipfile.ZipFile(io.BytesIO(raw))
    validate_zip(archive)
    raw_manifest = member(archive, "artifact-manifest.json", config["artifact_manifest"], 2 * 1024 * 1024)
    files = manifest_files(archive, raw_manifest)
    for key, name in MEMBERS.items():
        require(same(files.get(name), config["members"][key]), "result pin differs from exact archive manifest")
    def read_file(name, expected_hash=None):
        require(name in files, "required artifact data is absent")
        if expected_hash is not None:
            require(files[name]["sha256"] == expected_hash, "original baseline hash differs")
        return member(archive, name, files[name])
    STAGE = "source_and_score_bindings"
    current = {}
    for role, name in MEMBERS.items():
        if role != "report":
            current[role] = decode_json(read_file(name))
    baseline = {key: decode_json(read_file("baseline/candidate8-" + key + ".json", value))
                for key, value in C8.items()}
    summary = decode_json(read_file("summary.json"))
    helper = decode_json(read_file("offline-helper-all-exports.json"))
    for role in ("replay", "comparison", "retention"):
        document = current[role]
        require(document["source_tree_sha256"] == config["runtime_fingerprint"]
                and document["oracle_freeze_sha256"] == FREEZE, "current source/oracle binding differs")
        require(baseline[role]["source_tree_sha256"] == C8_FP
                and baseline[role]["oracle_freeze_sha256"] == FREEZE, "original baseline binding differs")
        if role != "replay":
            require(document["replay_sha256"] == config["members"]["replay"]["sha256"]
                    and baseline[role]["replay_sha256"] == C8["replay"], "score-to-replay binding differs")
    for document in (current["replay"], current["retention"], baseline["replay"], baseline["retention"]):
        require(document["packet_archive_attestation_sha256"] == ATTESTATION
                and document["source_archive_sha256"] == SOURCE_ARCHIVE,
                "original source archive or packet attestation differs")
    replay = current["replay"]
    require(replay["selected_cases_only"] is False and replay["case_count"] == 603
            and baseline["replay"]["selected_cases_only"] is False
            and baseline["replay"]["case_count"] == 603, "selected-case replay cannot replace the full run")
    source_files = replay["source_files"]
    require(len(source_files) == 32 and len({row["path"] for row in source_files}) == 32
            and sha(json.dumps(source_files, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
            == config["runtime_fingerprint"], "actual 32-file runtime manifest differs")
    before = indexed(baseline["replay"], "baseline replay")
    after = indexed(replay, "current replay")
    require(before.keys() == after.keys() and len({row["roaster_id"] for row in after.values()}) == 201,
            "frozen case/roaster inventory differs")
    for case_id, row in after.items():
        require(row["source_url"] == before[case_id]["source_url"]
                and row["roaster_id"] == before[case_id]["roaster_id"], "frozen case identity differs")
    compared = indexed(current["comparison"], "current comparison")
    retained = indexed(current["retention"], "current retention")
    old_compared = indexed(baseline["comparison"], "baseline comparison")
    old_retained = indexed(baseline["retention"], "baseline retention")
    require(all(rows.keys() == before.keys() for rows in (compared, retained, old_compared, old_retained)),
            "full scorer case coverage differs")
    counts = derived_score_counts(current["comparison"], current["retention"])
    old_counts = derived_score_counts(baseline["comparison"], baseline["retention"])
    require(counts["canonical"]["cases"] == 603 and counts["canonical"]["canonical_assertions"] == 4002
            and counts["canonical"]["additional_facts"] == 6474
            and counts["supplementary_retention"]["additional_assertions"] == 6474,
            "original frozen assertion totals differ")
    scripts = {
        "scripts/audit/coffee-corpus-replay.mjs": baseline["replay"]["harness_sha256"],
        "scripts/audit/coffee-corpus-compare.mjs": baseline["comparison"]["comparison_script_sha256"],
        "scripts/audit/coffee-corpus-normalize.mjs": baseline["comparison"]["comparison_normalizer_sha256"],
        "scripts/audit/coffee-corpus-retention.py": baseline["retention"]["retention_script_sha256"],
        "site/cloud/coffee-url-autofill.js": CLIENT_EXPORT,
    }
    require(replay["harness_sha256"] == scripts["scripts/audit/coffee-corpus-replay.mjs"]
            and current["comparison"]["comparison_script_sha256"] == scripts["scripts/audit/coffee-corpus-compare.mjs"]
            and current["comparison"]["comparison_normalizer_sha256"] == scripts["scripts/audit/coffee-corpus-normalize.mjs"]
            and current["retention"]["retention_script_sha256"] == scripts["scripts/audit/coffee-corpus-retention.py"]
            and current["review_material"]["preserved_script_hashes"] == scripts, "frozen scorer/harness/exporter differs")
    changes = complete_changes(before, after)
    STAGE = "actual_blob_export_verification"
    export_rows = verify_export_rows(archive, files, current["actual_exports"], before.keys())
    require(helper["cases"] == 603 and helper["passed"] == 603 and helper["failures"] == []
            and helper["attempted_external_operations"] == [], "offline export verification did not pass")
    STAGE = "stable_review_material"
    verify_material(config, current["review_material"], before, after, export_rows, changes, old_counts, counts)
    exact_losses = canonical_losses(old_compared, compared)
    full_losses = retention_losses(old_retained, retained)
    receipt = current["receipt"]
    require(summary["status"] == "FAIL" and summary["candidate"] == 12
            and summary["source_commit"] == config["head_sha"] and summary["source_tree"] == config["source_tree"]
            and summary["runtime_fingerprint"] == config["runtime_fingerprint"]
            and same(summary["complete_output_call_changes"], changes)
            and same(summary["review_material_changes"], current["review_material"]["changes"])
            and summary["reviewed_changes"]["status"] == "NOT_PROVIDED"
            and summary["reviewed_changes"]["manifest"] is None
            and summary["canonical_exact_losses"] == len(exact_losses)
            and summary["supplementary_full_retention_losses"] == len(full_losses)
            and summary["expected_values_changed"] is False and summary["scoring_rules_changed"] is False,
            "first unapproved failed summary differs")
    require(same(summary["canonical"], counts["canonical"])
            and same(summary["supplementary_retention"], counts["supplementary_retention"])
            and summary["runtime_and_frozen_inputs_unchanged"] is True,
            "summary scores or runtime preservation differs")
    require(receipt["final_candidate"] == 12 and receipt["source_commit"] == config["head_sha"]
            and receipt["source_tree"] == config["source_tree"]
            and receipt["github_run_id"] == config["run_id"]
            and receipt["extractor_source_fingerprint"] == config["runtime_fingerprint"]
            and same(receipt["extractor_source_files"], source_files)
            and receipt["oracle_freeze_sha256"] == FREEZE
            and receipt["status"] == "FROZEN_BENCHMARK_REVIEW_REQUIRED"
            and same(receipt["canonical"], counts["canonical"])
            and same(receipt["supplementary_retention"], counts["supplementary_retention"])
            and receipt["reviewed_changes"]["status"] == "NOT_PROVIDED"
            and receipt["remote_integration"] is False and receipt["published_or_deployed"] is False,
            "first unapproved benchmark receipt differs")
    require([row["name"] for row in summary["stages"]] == [
        "full603-replay", "strict-comparison", "supplementary-retention", "actual-client-exports", "source-bound-report"]
        and all(row["exit_code"] == 0 for row in summary["stages"]),
        "required complete benchmark stages did not finish")
    require(all(same(summary["artifacts"][key], config["members"][key]) for key in MEMBERS),
            "summary raw artifact pins differ")
    STAGE = "source_bound_report"
    report = parse_report(read_file(MEMBERS["report"]))
    require(report["source_tree_sha256"] == config["runtime_fingerprint"]
            and report["oracle_freeze_sha256"] == FREEZE
            and report["packet_archive_attestation_sha256"] == ATTESTATION
            and report["source_archive_sha256"] == SOURCE_ARCHIVE
            and report["replay_sha256"] == config["members"]["replay"]["sha256"]
            and report["baseline_replay_sha256"] == C8["replay"]
            and report["comparison_sha256"] == config["members"]["comparison"]["sha256"]
            and report["retention_sha256"] == config["members"]["retention"]["sha256"],
            "source-bound report provenance differs")
    report_cases = {row["case_id"]: row for row in report["cases"]}
    require(len(report["cases"]) == len(report_cases) == 603 and report_cases.keys() == before.keys()
            and sum(len(row["captures"]) for row in report_cases.values()) == 1197,
            "report source capture/case inventory differs")
    emit("candidate12_artifact_identity", {
        "run_id": config["run_id"], "run_attempt": config["run_attempt"], "head_sha": config["head_sha"],
        "source_tree": config["source_tree"], "runtime_fingerprint": config["runtime_fingerprint"],
        "artifact_id": config["artifact_id"], "artifact_bytes": config["artifact_bytes"],
        "artifact_sha256": config["artifact_sha256"], "artifact_manifest": config["artifact_manifest"],
        "run_completed_at": run["updated_at"], "artifact_expires_at": metadata["expires_at"],
        "original_baseline_hashes": C8, "projection_is_independent_approval": False})
    emit("candidate12_recounted_summary", {
        "observed_status": summary["status"], "canonical": counts["canonical"],
        "supplementary_retention": counts["supplementary_retention"],
        "changed_case_ids": [row["case_id"] for row in changes],
        "actual_current_exports_verified": 603, "actual_exports_equal_to_c8": current["actual_exports"]["equal"],
        "actual_exports_changed_from_c8": 603 - current["actual_exports"]["equal"],
        "offline_exports_passed": helper["passed"],
        "canonical_exact_losses": [{"case_id": row["case_id"], "field": row["field"]} for row in exact_losses],
        "supplementary_full_retention_losses": [
            {"case_id": row["case_id"], "assertion_index": row["assertion_index"]} for row in full_losses],
        "blockers": summary["blockers"], "approval_generated": False})
    if not targeted_contexts_only:
        emit_exact_material(read_file("review-material.json"))
    STAGE = "exact_changed_public_evidence"
    incomplete = []
    for change in changes:
        case_id = change["case_id"]
        projection, complete = case_projection(case_id, before[case_id], after[case_id],
            old_compared[case_id], compared[case_id], old_retained[case_id], retained[case_id], report_cases[case_id])
        projection["stable_change_hashes"] = next(row for row in current["review_material"]["changes"]
                                                if row["case_id"] == case_id)
        if not targeted_contexts_only:
            emit("candidate12_changed_case", projection)
        if not complete:
            incomplete.append(case_id)
    if targeted_contexts_only:
        STAGE = "targeted_unchanged_original_contexts"
        require(not incomplete, "changed structured facts still require separate source review")
        contexts, failures = [], []
        for case_id in TARGETED_CONTEXTS:
            try:
                contexts.append(targeted_original_context(case_id, before[case_id], after[case_id],
                                                          report_cases[case_id]))
            except (ValueError, KeyError, TypeError) as error:
                failures.append(targeted_context_failure(case_id, before[case_id], after[case_id], error))
        for context in contexts:
            emit("candidate12_original_context", context)
        for failure in failures:
            emit("candidate12_original_context_failure", failure)
        emit("candidate12_unchanged_contexts_complete", {
            "status": "FAIL" if failures else "PASS", "targeted_cases": len(TARGETED_CONTEXTS),
            "contexts_emitted": len(contexts), "failed_case_ids": [row["case_id"] for row in failures],
            "changed_cases_verified": len(changes),
            "all_contexts_from_unchanged_original_c8_facts": not failures,
            "raw_source_captures_extracted_or_uploaded": False,
            "roaster_requests": 0, "production_operations": False, "approval_generated": False})
        archive.close()
        require(not failures, "one or more original context selectors failed; no approval generated")
        return
    emit("candidate12_forensics_complete", {
        "status": "PASS" if not incomplete else "TARGETED_EVIDENCE_STILL_REQUIRED",
        "changed_cases_projected": len(changes), "incomplete_structured_fact_cases": incomplete,
        "original_expectations_changed": False, "approval_generated": False,
        "roaster_requests": 0, "production_operations": False,
        "raw_source_captures_extracted_or_uploaded": False})
    require(not incomplete, "structured changed facts require a bounded targeted review before approval")
    archive.close()




def self_test():
    class ForensicControls(unittest.TestCase):
        def config(self):
            return {"schema_version": 1, "type": "candidate12_frozen_change_forensics", "repository": REPO,
                    "candidate": 12, "head_sha": "a" * 40, "source_tree": "b" * 40,
                    "runtime_fingerprint": "c" * 64, "run_id": 123, "run_attempt": 1,
                    "artifact_id": 456, "artifact_bytes": 100, "artifact_sha256": "d" * 64,
                    "artifact_name": "dic-frozen603-candidate12-123-1",
                    "artifact_manifest": {"file": "artifact-manifest.json", "bytes": 100, "sha256": "e" * 64},
                    "members": {key: {"file": name, "bytes": 100, "sha256": "f" * 64}
                                for key, name in MEMBERS.items()}}

        def test_config_requires_every_exact_future_identity_and_member_pin(self):
            config = self.config()
            self.assertIs(check_config(config), config)
            for key, value in (("candidate", 11), ("run_id", True), ("run_attempt", 0),
                               ("head_sha", "0" * 40), ("artifact_sha256", "0" * 64),
                               ("artifact_name", "dic-frozen603-candidate11-123-1")):
                bad = decode_json(json.dumps(config).encode())
                bad[key] = value
                with self.subTest(key=key), self.assertRaises(ValueError):
                    check_config(bad)
            bad = self.config()
            bad["members"]["replay"]["file"] = "candidate11-replay.json"
            with self.assertRaises(ValueError):
                check_config(bad)
            bad = self.config()
            del bad["members"]["report"]
            with self.assertRaises(ValueError):
                check_config(bad)

        def test_remote_artifact_cannot_be_rebound_to_another_run_head_attempt_or_success(self):
            config = self.config()
            repository = {"id": REPO_ID, "full_name": REPO}
            metadata = {"id": 456, "name": config["artifact_name"], "size_in_bytes": 100, "expired": False,
                        "digest": "sha256:" + "d" * 64,
                        "workflow_run": {"id": 123, "repository_id": REPO_ID, "head_repository_id": REPO_ID,
                                         "head_sha": "a" * 40, "head_branch": BRANCH}}
            run = {"id": 123, "run_attempt": 1, "head_sha": "a" * 40, "head_branch": BRANCH,
                   "path": WORKFLOW, "event": "pull_request", "repository": repository,
                   "head_repository": repository, "status": "completed", "conclusion": "failure"}
            validate_remote_identity(config, metadata, run)
            for key, value in (("id", 124), ("run_attempt", 2), ("head_sha", "b" * 40),
                               ("conclusion", "success"), ("head_branch", "other")):
                with self.subTest(key=key), self.assertRaises(ValueError):
                    validate_remote_identity(config, metadata, {**run, key: value})
            with self.assertRaises(ValueError):
                validate_remote_identity(config, {**metadata, "expired": True}, run)

        def archive(self, names):
            stream = io.BytesIO()
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", UserWarning)
                with zipfile.ZipFile(stream, "w") as archive:
                    for name, value in names:
                        archive.writestr(name, value)
            return zipfile.ZipFile(io.BytesIO(stream.getvalue()))

        def test_zip_is_data_only_and_rejects_path_links_duplicates_and_expansion(self):
            with self.archive([("summary.json", "{}"), ("exports/one.json", "{}")]) as archive:
                validate_zip(archive)
            for names in ([("../outside.json", "{}")], [("/absolute.json", "{}")],
                          [("a\\bad.json", "{}")], [("a//bad.json", "{}")],
                          [("same.json", "{}"), ("same.json", "{}")]):
                with self.subTest(names=names), self.archive(names) as archive, self.assertRaises(ValueError):
                    validate_zip(archive)
            link = zipfile.ZipInfo("linked.json")
            link.create_system = 3
            link.external_attr = (stat.S_IFLNK | 0o777) << 16
            with self.archive([(link, "outside")]) as archive, self.assertRaises(ValueError):
                validate_zip(archive)
            with self.archive([("large.json", "{}")]) as archive:
                archive.getinfo("large.json").file_size = MAX_ENTRY + 1
                with self.assertRaises(ValueError):
                    validate_zip(archive)

        def test_selected_member_requires_its_exact_bytes_and_sha(self):
            raw = b'{"public":true}'
            with self.archive([("summary.json", raw)]) as archive:
                expected = {"file": "summary.json", "bytes": len(raw), "sha256": sha(raw)}
                self.assertEqual(member(archive, "summary.json", expected), raw)
                for patch in ({"bytes": len(raw) + 1}, {"sha256": "a" * 64}):
                    with self.subTest(patch=patch), self.assertRaises(ValueError):
                        member(archive, "summary.json", {**expected, **patch})
                with self.assertRaises(ValueError):
                    member(archive, "summary.json", expected, limit=3)

        def test_json_and_report_payloads_reject_ambiguous_replacement(self):
            for raw in (b'{"a":1,"a":2}', b'{"a":NaN}'):
                with self.subTest(raw=raw), self.assertRaises(ValueError):
                    decode_json(raw)
            marker = b'<script id="audit-data" type="application/json">'
            self.assertEqual(parse_report(marker + b'{"public":true}</script>'), {"public": True})
            with self.assertRaises(ValueError):
                parse_report(marker + b'{}</script>' + marker + b'{}</script>')

        def test_complete_case_hashes_and_deltas_keep_calls_facts_and_types(self):
            old = {"one": {"case_id": "one", "elapsed_ms": 1, "output": {"ok": True, "fields": {"origin": "Brazil"}},
                           "calls": [{"limit": 900000}], "fixture_calls": ["user"]}}
            after = decode_json(json.dumps(old).encode())
            after["one"]["elapsed_ms"] = 20
            self.assertEqual(complete_changes(old, after), [])
            self.assertEqual(inventory_hash(old), inventory_hash(after))
            after["one"]["calls"][0]["limit"] = 2000000
            self.assertEqual(complete_changes(old, after)[0]["changed_case_keys"], ["calls"])
            self.assertNotEqual(inventory_hash(old), inventory_hash(after))
            self.assertFalse(same(True, 1))
            self.assertNotEqual(stable_hash(True), stable_hash(1))

        def test_exact_changed_values_distinguish_absence_and_preserve_order(self):
            result = value_differences({"fields": {"origin": "Brazil", "producer": None}},
                                      {"fields": {"origin": "Minas Gerais, Brazil"}})
            self.assertEqual(result[0]["path"], "/fields/origin")
            self.assertEqual(result[0]["before"], "Brazil")
            self.assertEqual(result[0]["after"], "Minas Gerais, Brazil")
            self.assertFalse(result[1]["after_present"])
            facts, complete = fact_differences([{"value": "old"}], [{"value": "new"}, {"value": "second"}])
            self.assertTrue(complete)
            self.assertEqual(facts[0]["before_span"], [0, 1])
            self.assertEqual(facts[0]["after_span"], [0, 2])
            self.assertEqual(facts[0]["after"][0]["fact"]["value"], "new")

        def test_structured_fact_omission_is_explicit_and_never_complete(self):
            fact = {"label": "Public product JSON", "format": "json", "value": '{"product":{"name":"Coffee"}}'}
            projected = fact_projection(fact)
            self.assertFalse(projected["complete"])
            self.assertNotIn("value", projected["metadata"])
            self.assertNotIn("Coffee", json.dumps(projected))
            _changes, complete = fact_differences([], [fact])
            self.assertFalse(complete)


        def _context_fixture(self, facts):
            case_id = next(iter(TARGETED_CONTEXTS))
            source_url = "https://example.test/products/targeted"
            before = {"case_id": case_id, "source_url": source_url,
                      "output": {"source_facts": facts, "source_facts_truncated": False}}
            after = decode_json(json.dumps(before).encode())
            report_case = {"case_id": case_id, "source_url": source_url,
                           "captures": [{"label": "page", "file": "page.html", "sha256": "a" * 64,
                                         "bytes": 100, "url": source_url}]}
            return case_id, before, after, report_case

        def test_targeted_context_uses_complete_unchanged_original_fact_not_new_output(self):
            fact = {"label": "Published paragraph",
                    "value": "Kibugu Farmers Cooperative Society (FCS) in Embu County owns this station.",
                    "source_type": "html", "source_url": "https://example.test/products/targeted"}
            case_id, before, after, report = self._context_fixture([fact])
            after["output"]["named_producer"] = "Unreviewed new value"
            after["output"]["source_facts"].insert(0, {"value": "Unrelated unchanged prose"})
            result = targeted_original_context(case_id, before, after, report)
            matches = result["matched_original_plain_text_facts"]
            self.assertEqual(len(matches), 1)
            self.assertEqual(matches[0]["fact"], fact)
            self.assertEqual(matches[0]["current_fact_indices"], [1])
            self.assertTrue(matches[0]["unchanged_from_c8"])
            self.assertFalse(result["new_output_used_as_source_evidence"])
            self.assertFalse(result["approval_generated"])

        def test_targeted_context_rejects_changed_absent_unknown_or_rebound_support(self):
            case_id, before, after, report = self._context_fixture([{"value": "Kibugu owns this station."}])
            after["output"]["source_facts"][0]["value"] = "Kibugu has a different role."
            with self.assertRaises(ValueError):
                targeted_original_context(case_id, before, after, report)
            for values in (
                    ("unknown-case", before, before, report),
                    (case_id, before, before, {**report, "source_url": "https://other.test/"}),
                    (case_id, {**before, "output": {"source_facts": []}}, before, report)):
                with self.subTest(identity=values[0]), self.assertRaises(ValueError):
                    targeted_original_context(*values)

        def test_targeted_context_omits_structured_data_without_silently_substituting_it(self):
            plain = {"value": "Kibugu Farmers Cooperative Society runs the station."}
            structured = {"format": "json", "value": '{"producer":"Kibugu","product":{"media":[1,2]}}'}
            markup = {"value": "<div>Kibugu raw page data</div>"}
            case_id, before, after, report = self._context_fixture([plain, structured, markup])
            result = targeted_original_context(case_id, before, after, report)
            self.assertEqual(len(result["matched_original_plain_text_facts"]), 1)
            self.assertEqual(len(result["omitted_structured_matches"]), 2)
            self.assertNotIn("media", json.dumps(result))
            case_id, before, after, report = self._context_fixture([structured, markup])
            with self.assertRaises(ValueError):
                targeted_original_context(case_id, before, after, report)

        def test_targeted_context_bounds_and_sensitive_values_fail_before_printing(self):
            values = [
                [{"value": "Kibugu " + "x" * 12000}],
                [{"value": "Kibugu Bearer PUBLIC_TEST_FIXTURE"}],
                [{"value": "Kibugu source paragraph " + str(index)} for index in range(13)],
            ]
            for facts in values:
                case_id, before, after, report = self._context_fixture(facts)
                with self.subTest(facts=len(facts)), contextlib.redirect_stdout(io.StringIO()) as out:
                    with self.assertRaises(ValueError):
                        targeted_original_context(case_id, before, after, report)
                    self.assertEqual(out.getvalue(), "")


        def test_targeted_failure_diagnostics_use_only_fixed_codes_and_counts(self):
            facts = [{"value": "Kibugu public paragraph " + str(index)} for index in range(13)]
            facts += [{"value": "<div>Kibugu markup</div>"},
                      {"format": "json", "value": '{"name":"Kibugu"}'}]
            case_id, before, after, _report = self._context_fixture(facts)
            result = targeted_context_failure(case_id, before, after,
                                              ValueError("missing or excessive unchanged plain-text context"))
            self.assertEqual(result["reason_code"], "PLAIN_MATCH_COUNT")
            self.assertEqual(result["matching_counts"]["unique_matching_facts"], 15)
            self.assertEqual(result["matching_counts"]["unchanged_plain_matches"], 13)
            self.assertEqual(result["matching_counts"]["raw_markup_matches"], 1)
            self.assertEqual(result["matching_counts"]["structured_matches"], 1)
            self.assertFalse(result["context_accepted"])
            self.assertFalse(result["source_values_emitted"])
            self.assertNotIn("public paragraph", json.dumps(result))

        def test_targeted_failure_diagnostics_never_echo_private_or_unknown_error_values(self):
            facts = [{"value": "Kibugu Bearer PUBLIC_TEST_FIXTURE"},
                     {"value": "Kibugu " + "x" * 12000}]
            case_id, before, after, _report = self._context_fixture(facts)
            for error, code in ((ValueError("sensitive-pattern evidence cannot be printed"), "PRIVATE_PATTERN"),
                                (ValueError("Bearer PUBLIC_TEST_FIXTURE_UNKNOWN"), "UNCLASSIFIED_CONTEXT_FAILURE")):
                result = targeted_context_failure(case_id, before, after, error)
                self.assertEqual(result["reason_code"], code)
                self.assertEqual(result["matching_counts"]["private_or_invalid_plain_matches"], 1)
                self.assertEqual(result["matching_counts"]["oversized_plain_matches"], 1)
                with contextlib.redirect_stdout(io.StringIO()) as out:
                    emit("candidate12_original_context_failure", result)
                self.assertNotIn("PUBLIC_TEST_FIXTURE", out.getvalue())
                self.assertNotIn("Bearer", out.getvalue())
                self.assertFalse(result["exception_values_emitted"])
            after["output"]["source_facts"].pop()
            result = targeted_context_failure(case_id, before, after,
                                              ValueError("original context fact changed or disappeared"))
            self.assertEqual(result["reason_code"], "CHANGED_OR_MISSING_FACT")
            self.assertEqual(result["matching_counts"]["changed_plain_matches"], 1)
            with self.assertRaises(ValueError):
                targeted_context_failure("unknown", before, after, ValueError("private"))


        def test_sensitive_patterns_and_output_overflow_are_never_printed(self):
            global EMITTED
            for value in ("Bearer PUBLIC_TEST_FIXTURE", "https://example.oaiusercontent.com/?sig=fixture",
                          {"completion_token": "fixture"}):
                with self.subTest(value=type(value).__name__), self.assertRaises(ValueError):
                    safe_public(value)
            with contextlib.redirect_stdout(io.StringIO()) as out:
                with self.assertRaises(ValueError):
                    emit("too_large", ["x" * 1024] * 200)
                self.assertEqual(out.getvalue(), "")
            saved = EMITTED
            try:
                EMITTED = MAX_ALL_EMIT
                with contextlib.redirect_stdout(io.StringIO()) as out:
                    with self.assertRaises(ValueError):
                        emit("over_total", {})
                    self.assertEqual(out.getvalue(), "")
            finally:
                EMITTED = saved

    result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(ForensicControls))
    require(result.wasSuccessful(), "forensic reader controls failed")
    print(json.dumps({"forensic_reader_controls_passed": result.testsRun}), flush=True)


def main():
    global STAGE
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--config", type=Path)
    parser.add_argument("--config-sha256")
    parser.add_argument("--targeted-contexts-only", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        if args.targeted_contexts_only:
            parser.error("--targeted-contexts-only requires --config")
        self_test()
        return 0
    try:
        STAGE = "pinned_config"
        require(os.environ.get("GITHUB_REPOSITORY") == REPO, "unexpected forensic execution repository")
        require(digest(args.config_sha256) and args.config.is_file() and not args.config.is_symlink()
                and 0 < args.config.stat().st_size <= 65536, "missing bounded config and SHA-256 pin")
        raw = args.config.read_bytes()
        require(sha(raw) == args.config_sha256, "config SHA-256 differs")
        config = check_config(decode_json(raw))
        emit("forensic_reader_identity", {"script_sha256": sha(Path(__file__).read_bytes()),
                                         "config_sha256": args.config_sha256,
                                         "candidate": 12, "approval_generated": False})
        examine(config, targeted_contexts_only=args.targeted_contexts_only)
        return 0
    except Exception as error:
        # Do not echo exception values, server responses, environment or source bodies.
        print(json.dumps({"kind": "candidate12_forensics_failure",
                          "evidence": {"stage": STAGE, "error_class": type(error).__name__,
                                       "approval_generated": False}}), file=sys.stderr, flush=True)
        return 1


if __name__ == "__main__":
    sys.exit(main())
