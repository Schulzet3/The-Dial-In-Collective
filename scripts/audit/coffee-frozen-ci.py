#!/usr/bin/env python3
"""Run the unchanged frozen 603-coffee benchmark with original archived inputs.

This runner never creates an oracle, changes a scorer, executes archived code,
or accepts a changed frozen output automatically. Transfer credentials remain
only in the captured GitHub event and helper stdin, never in retained artifacts.
"""
from __future__ import annotations

import argparse
import base64
import contextlib
from datetime import datetime, timezone
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import runpy
import shutil
import socket
import stat
import subprocess
import sys
import tarfile
import tempfile
import time
import urllib.parse
import urllib.request
import unittest
from unittest import mock
import zipfile

REPOSITORY = "Schulzet3/The-Dial-In-Collective"
AUDIT_BRANCH = "work/issue33-candidate11-recovery-20261024"
FREEZE_SHA256 = "0bd751f68aba81d17204418a6d016a66815afdc82095d7a89c5f856eab05b2cb"
ATTESTATION_SHA256 = "0767e52af1a5483ef31beba01d9fa70666a17de10634bb9cb1cc933a6b105556"
C8_FINGERPRINT = "301346616618784a5ff926ddb9302b3be6e2710bea74c3a47e3d476e02ca812c"
CLIENT_EXPORT_SHA256 = "2c201e75232bba85df667bc1b8a90182b92e3f5c51d6d17cbaf15847718b3469"
ARCHIVES = {
    "source_archive": {
        "file_name": "coffee-extractor-source-evidence.tar.gz",
        "library_file_id": "libfile_42c72c3915588191aba4aad2c7d8f15f",
        "file_id": "file_00000000623c81f7a3e3f18643e23efd",
        "size_bytes": 113755359,
        "sha256": "696c011e97e94eb2a9ec1b12c66efdf1ce15636d7df999751279bb0f381cce52",
        "current_version_number": 0,
        "mime_type": "application/x-tar",
        "transfer_id": "materialize-1",
    },
    "recovery_archive": {
        "file_name": "coffee-extractor-audit-recovery-2026-10-24.zip",
        "library_file_id": "libfile_868871db2d748191aba068d075b818d0",
        "file_id": "file_000000003ed881f5876ec76d2e5551a0",
        "size_bytes": 88577532,
        "sha256": "728bd52965538879f116d0e384984d7a49becbb9224b092f587a71e24b4e6cce",
        "current_version_number": 1,
        "mime_type": "application/zip",
        "transfer_id": "materialize-2",
    },
}
HELPERS = {
    "library_file_transfer.py": {
        "blob": "3ca9a61105c80639763742a4b37e86cfbdf91660",
        "sha256": "8c7f5663d04ab4eb651c89c1b012014c8fe12b579a1069a72a677c67750a3e8b",
        "bytes": 15513,
    },
    "library_hosted_apps.py": {
        "blob": "6273dafa0426c0cadd5f0edbdbdeeb59530a0507",
        "sha256": "7958642b88cde925aaca036989de1028c0864eb6d82a9cb175ebf9380cb9677b",
        "bytes": 15837,
    },
}
C8_ARTIFACTS = {
    "replay": "d5e3b098c15595a4d03554024f8c57b7d4a1bf7251b4b743f96cb432099bcf12",
    "comparison": "86701191b7a6f7d2e90060a1bcc2d8658d35e66670168a5cdfb1878255694aa3",
    "retention": "8f7b9b25a284ea2f0f06cd43b5d07a21469f1c20a80ad47612ac6a7c31880088",
}
MAX_FILES = 50000
MAX_MEMBER_BYTES = 256 * 1024 * 1024
MAX_EXTRACTED_BYTES = 4 * 1024 * 1024 * 1024
MAX_COMMAND_SECONDS = 1200


def require(condition, message):
    if not condition:
        raise ValueError(message)


def file_hash(path):
    result = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()


def json_bytes(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {"file": path.name, "bytes": path.stat().st_size, "sha256": file_hash(path)}


def load_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def mask(value):
    if isinstance(value, str) and value:
        escaped = value.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
        print("::add-mask::" + escaped, flush=True)


def check_transfer(label, transfer):
    expected = ARCHIVES[label]
    keys = {"transfer_id", "file_id", "library_file_id", "file_name", "suggested_path",
            "completion_token", "download_url", "current_version_number", "xattrs",
            "workspace_path", "method", "headers", "mime_type", "size_bytes"}
    require(isinstance(transfer, dict) and set(transfer) == keys,
            "Unexpected prepared transfer schema for " + label)
    for key in ("transfer_id", "file_id", "library_file_id", "file_name", "mime_type"):
        require(transfer[key] == expected[key], "Prepared transfer identity differs: " + label + " " + key)
    for key in ("size_bytes", "current_version_number"):
        require(type(transfer[key]) is int and transfer[key] == expected[key],
                "Prepared transfer numeric metadata differs: " + label + " " + key)
    require(transfer["suggested_path"] == expected["file_name"],
            "Unexpected prepared destination name for " + label)
    require(transfer["workspace_path"] is None and transfer["method"] == "GET"
            and transfer["headers"] == {}, "Unexpected prepared transfer transport for " + label)
    require(transfer["xattrs"] == [{"name": "user.library-file-version",
                                  "value": str(expected["current_version_number"])}],
            "Unexpected prepared transfer version attributes for " + label)
    token, url = transfer["completion_token"], transfer["download_url"]
    require(isinstance(token, str) and 0 < len(token) <= 16384,
            "Missing completion token for " + label)
    require(isinstance(url, str) and 0 < len(url) <= 16384,
            "Missing signed download URL for " + label)
    try:
        parsed = urllib.parse.urlsplit(url)
        valid = (parsed.scheme == "https" and parsed.hostname
                 and parsed.hostname.endswith(".oaiusercontent.com")
                 and parsed.username is None and parsed.password is None
                 and parsed.port is None and not parsed.fragment)
    except ValueError:
        valid = False
    require(valid, "Unexpected prepared transfer host for " + label)


def materialize_from_event(work):
    """Use the current unmodified Library helper; never raw-download Library bytes."""
    require(os.environ.get("GITHUB_REPOSITORY") == REPOSITORY, "Unexpected repository")
    event = load_json(os.environ["GITHUB_EVENT_PATH"])
    pr = event.get("pull_request", {})
    require(pr.get("head", {}).get("ref") == AUDIT_BRANCH
            and pr.get("head", {}).get("repo", {}).get("full_name") == REPOSITORY,
            "Frozen inputs are restricted to the authorized same-repository audit PR")
    body = pr.get("body") or ""
    matches = re.findall(r"<!--\s*DIC_FROZEN_INPUT_TRANSFERS\s*\n([\s\S]*?)\n-->", body)
    require(len(matches) == 1, "Exactly one prepared frozen-input marker is required")
    try:
        manifest = json.loads(matches[0])
    except (ValueError, TypeError):
        raise ValueError("Prepared frozen-input marker is not valid JSON") from None
    require(isinstance(manifest, dict) and set(manifest) ==
            {"schema_version", "source_archive", "recovery_archive"}
            and type(manifest["schema_version"]) is int and manifest["schema_version"] == 1,
            "Unexpected frozen-input marker schema")
    for label in ARCHIVES:
        transfer = manifest[label]
        if isinstance(transfer, dict):
            mask(transfer.get("download_url"))
            mask(transfer.get("completion_token"))
            for value in (transfer.get("headers") or {}).values():
                mask(value)
        check_transfer(label, transfer)
    token = os.environ.get("GH_TOKEN", "")
    require(token, "Read-only GitHub token is unavailable for the pinned helper blobs")
    mask(token)
    work.mkdir(parents=True, exist_ok=True, mode=0o700)
    helper_dir, inputs = work / "library-helper", work / "inputs"
    helper_dir.mkdir(mode=0o700)
    inputs.mkdir(mode=0o700)
    for name, expected in HELPERS.items():
        endpoint = "https://api.github.com/repos/" + REPOSITORY + "/git/blobs/" + expected["blob"]
        request = urllib.request.Request(endpoint, headers={
            "Authorization": "Bearer " + token, "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "dic-frozen-audit",
        })
        with urllib.request.urlopen(request, timeout=60) as response:
            raw = response.read(100000)
        record = json.loads(raw)
        require(record.get("sha") == expected["blob"] and record.get("encoding") == "base64",
                "Pinned Library helper Git blob differs")
        content = base64.b64decode(record["content"].replace("\n", ""), validate=True)
        require(len(content) == expected["bytes"]
                and hashlib.sha256(content).hexdigest() == expected["sha256"],
                "Pinned Library helper hash differs")
        destination = helper_dir / name
        with destination.open("xb") as target:
            target.write(content)
        destination.chmod(0o600)
    child_env = dict(os.environ)
    child_env.pop("GH_TOKEN", None)
    child_env.pop("GITHUB_TOKEN", None)
    for label, expected in ARCHIVES.items():
        destination = (inputs / expected["file_name"]).absolute()
        result = subprocess.run(
            [sys.executable, str(helper_dir / "library_file_transfer.py"),
             "materialize", str(destination)],
            input=json.dumps(manifest[label]), text=True, capture_output=True,
            timeout=600, env=child_env, check=False,
        )
        if result.returncode:
            missing = re.search(r"ModuleNotFoundError: No module named '([A-Za-z0-9_.]+)'",
                                result.stderr or "")
            reason = "; missing local helper module " + missing[1] if missing else ""
            raise ValueError("Library materialization failed for " + label
                             + " with exit " + str(result.returncode) + reason)
        require(destination.is_file() and not destination.is_symlink(),
                "Materialized archive is not a regular file: " + label)
        require(destination.stat().st_size == expected["size_bytes"]
                and file_hash(destination) == expected["sha256"],
                "Materialized original archive differs: " + label)
        print(json.dumps({"materialized": label, "bytes": expected["size_bytes"],
                          "sha256": expected["sha256"]}), flush=True)
    # No event, transfer manifest, URL, header, completion token or raw helper
    # output is written into the retained artifact directory.
    return inputs


def safe_parts(name):
    require(isinstance(name, str) and 0 < len(name) <= 2048
            and "\x00" not in name and "\\" not in name,
            "Invalid archive member name")
    raw = PurePosixPath(name)
    require(not raw.is_absolute() and ".." not in raw.parts
            and len(raw.parts) <= 64 and all(":" not in part for part in raw.parts),
            "Unsafe archive member path")
    parts = tuple(part for part in raw.parts if part != ".")
    require(parts and all(part not in ("", "..") for part in parts),
            "Empty archive member path")
    return parts


def is_data(parts):
    # Frozen source captures are data even when a publisher used a script-like
    # extension. They are placed outside the checkout and are never executed.
    return parts[-1].lower().endswith(".json") or "cases" in parts[:-1]


def extract_data(archive, destination, label):
    destination.mkdir(parents=True, mode=0o700)
    records, seen, total = [], set(), 0

    def copy(name, size, stream, regular=True):
        nonlocal total
        parts = safe_parts(name)
        if not is_data(parts):
            return
        require(regular, "Selected archive data is a link or special file")
        require(type(size) is int and 0 <= size <= MAX_MEMBER_BYTES,
                "Archive data member exceeds its bound")
        relative = "/".join(parts)
        require(relative not in seen, "Duplicate selected archive member")
        seen.add(relative)
        total += size
        require(len(seen) <= MAX_FILES and total <= MAX_EXTRACTED_BYTES,
                "Archive data extraction exceeds its bounds")
        target = destination.joinpath(*parts)
        target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        digest, actual = hashlib.sha256(), 0
        with target.open("xb") as output:
            while True:
                chunk = stream.read(1024 * 1024)
                if not chunk:
                    break
                actual += len(chunk)
                require(actual <= size, "Archive member exceeded its declared size")
                output.write(chunk)
                digest.update(chunk)
        require(actual == size, "Archive member ended before its declared size")
        target.chmod(0o400)
        records.append({"archive": label, "member": relative, "path": target,
                        "bytes": actual, "sha256": digest.hexdigest()})

    if zipfile.is_zipfile(archive):
        with zipfile.ZipFile(archive) as package:
            require(len(package.infolist()) <= MAX_FILES, "Archive has too many members")
            for item in package.infolist():
                name = item.filename.rstrip("/")
                if item.is_dir():
                    if name not in ("", "."):
                        safe_parts(name)
                    continue
                parts = safe_parts(name) if name else ()
                if not parts or not is_data(parts):
                    continue
                mode = (item.external_attr >> 16) & 0o170000
                regular = mode in (0, stat.S_IFREG) and not (item.flag_bits & 1)
                require(regular, "Selected ZIP data is a link, special or encrypted file")
                with package.open(item) as stream:
                    copy(item.filename, item.file_size, stream, regular)
    else:
        with tarfile.open(archive, "r:*") as package:
            count = 0
            for item in package:
                count += 1
                require(count <= MAX_FILES, "Archive has too many members")
                name = item.name.rstrip("/")
                if item.isdir():
                    if name not in ("", "."):
                        safe_parts(name)
                    continue
                parts = safe_parts(name) if name else ()
                if not parts or not is_data(parts):
                    continue
                require(item.isfile(), "Selected TAR data is a link or special file")
                with package.extractfile(item) as stream:
                    copy(item.name, item.size, stream)
    return records


def find_original(index, expected_hash, label, suffix=None):
    matches = index.get(expected_hash, [])
    if suffix is not None:
        matches = [row for row in matches
                   if tuple(PurePosixPath(row["member"]).parts[-len(suffix):]) == tuple(suffix)]
    require(matches, "Required original data is unavailable: " + label)
    return sorted(matches, key=lambda row: (row["archive"] != "source_archive",
                                           len(row["member"]), row["member"]))[0]


def copy_original(record, destination):
    destination.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    require(not destination.exists(), "Repeated reconstructed corpus destination")
    shutil.copyfile(record["path"], destination)
    require(destination.stat().st_size == record["bytes"]
            and file_hash(destination) == record["sha256"], "Original data copy differs")
    destination.chmod(0o400)


def assemble_corpus(repo, work, index):
    corpus = work / "corpus"
    corpus.mkdir(mode=0o700)
    freeze_record = find_original(index, FREEZE_SHA256, "oracle-freeze.json")
    attestation_record = find_original(index, ATTESTATION_SHA256, "original packet attestation")
    copy_original(freeze_record, corpus / "oracle-freeze.json")
    copy_original(attestation_record, corpus / "original-archive-packet-attestation.json")
    freeze, attestation = load_json(corpus / "oracle-freeze.json"), load_json(
        corpus / "original-archive-packet-attestation.json")
    require(attestation.get("source_archive_sha256") == ARCHIVES["source_archive"]["sha256"]
            and attestation.get("attestation_created_after_oracle_freeze") is True,
            "Original packet attestation provenance differs")
    oracle, frozen_files, manifest, captures = [], [], None, None
    occupied = {"oracle-freeze.json", "original-archive-packet-attestation.json"}
    for entry in freeze["files"]:
        basename = PurePosixPath(entry["path"]).name
        require(basename not in ("", ".", ".."), "Invalid frozen evidence basename")
        if entry["kind"] == "source_oracle":
            location = repo / "docs/audits" / basename
            require(location.is_file() and file_hash(location) == entry["sha256"],
                    "Checked-out frozen oracle differs: " + basename)
            oracle.extend(load_json(location))
        else:
            require(basename not in occupied, "Duplicate frozen corpus basename")
            occupied.add(basename)
            original = find_original(index, entry["sha256"], basename)
            location = corpus / basename
            copy_original(original, location)
            if entry["kind"] == "selection_manifest":
                require(manifest is None, "Duplicate selection manifest")
                manifest = load_json(location)
            if entry["kind"] == "source_hash_index":
                require(captures is None, "Duplicate capture hash index")
                captures = load_json(location)
        frozen_files.append({"path": location, "sha256": entry["sha256"]})
    require(isinstance(manifest, dict) and isinstance(captures, list),
            "Original selection or capture index is unavailable")
    expected = {row["case_id"]: row for row in oracle}
    require(len(oracle) == len(expected) == 603 and manifest["coffee_count"] == 603,
            "Frozen corpus must contain exactly 603 unique cases")
    require(len(manifest["roasters"]) == 201
            and len({row["id"] for row in manifest["roasters"]}) == 201,
            "Frozen corpus must contain exactly 201 unique roasters")
    owners = {}
    for roaster in manifest["roasters"]:
        urls = roaster["selected_urls"]
        require(len(urls) == len(set(urls)) == 3, "Each frozen roaster must have three distinct products")
        for url in urls:
            require(url not in owners, "Duplicate frozen selected product")
            owners[url] = roaster["id"]
    require(len(owners) == 603 and all(owners.get(row["source_url"]) == row["roaster_id"]
                                     for row in oracle), "Frozen selection and oracle differ")
    packets = {}
    for row in attestation["packets"]:
        case_id = row.get("id") or row.get("case_id")
        if case_id not in expected:
            continue
        require(case_id not in packets
                and row["path"] == "extractor-600/cases/" + case_id + "/source-packet.json",
                "Original packet identity differs")
        packets[case_id] = row
    require(packets.keys() == expected.keys(), "Original packet coverage differs")
    for case_id, packet in packets.items():
        require(safe_parts(case_id) == (case_id,), "Invalid frozen case path")
        row = find_original(index, packet["sha256"], "packet " + case_id,
                            ("cases", case_id, "source-packet.json"))
        require(row["bytes"] == packet["bytes"], "Original packet size differs")
        copy_original(row, corpus / "cases" / case_id / "source-packet.json")
    seen_captures = set()
    for capture in captures:
        case_id, name = capture["case_id"], capture["file"]
        require(case_id in expected and safe_parts(name) == (name,)
                and (case_id, name) not in seen_captures, "Invalid frozen capture identity")
        seen_captures.add((case_id, name))
        original = find_original(index, capture["sha256"], "capture " + case_id + "/" + name,
                                 ("cases", case_id, name))
        require(original["bytes"] == capture["bytes"], "Original capture size differs")
        copy_original(original, corpus / "cases" / case_id / name)
    require(len(seen_captures) == 1197, "Frozen source capture count differs")
    return corpus, expected, frozen_files, {
        "coffees": 603, "roasters": 201, "captures": len(seen_captures),
        "oracle_freeze_sha256": FREEZE_SHA256,
        "packet_archive_attestation_sha256": ATTESTATION_SHA256,
        "source_archive_sha256": ARCHIVES["source_archive"]["sha256"],
        "recovery_archive_sha256": ARCHIVES["recovery_archive"]["sha256"],
        "frozen_repo_oracles_replaced": False,
        "archived_code_executed": False,
    }


NODE_GUARD = r"""
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import dns from 'node:dns';
import dgram from 'node:dgram';
import child from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
const attempts=[];
const deny=name=>(..._args)=>{attempts.push(name);throw new Error('Offline audit denied '+name);};
globalThis.fetch=deny('fetch');
globalThis.WebSocket=class {constructor(){deny('WebSocket')();}};
for(const [object,names,prefix] of [
 [http,['request','get'],'http'],[https,['request','get'],'https'],
 [net,['connect','createConnection'],'net'],[tls,['connect'],'tls'],
 [dns,['lookup','lookupService','resolve','resolve4','resolve6','resolveAny','resolveCname','resolveMx','resolveNaptr','resolveNs','resolvePtr','resolveSoa','resolveSrv','resolveTxt','reverse'],'dns'],
 [dns.promises,['lookup','lookupService','resolve','resolve4','resolve6','resolveAny','resolveCname','resolveMx','resolveNaptr','resolveNs','resolvePtr','resolveSoa','resolveSrv','resolveTxt','reverse'],'dns.promises'],
 [dgram,['createSocket'],'dgram'],
 [child,['exec','execSync','execFile','execFileSync','spawn','spawnSync','fork'],'child_process']
])for(const name of names)if(typeof object[name]==='function')object[name]=deny(prefix+'.'+name);
net.Socket.prototype.connect=deny('net.Socket.connect');
syncBuiltinESMExports();
process.on('exit',()=>{
 const output=process.env.DIC_OFFLINE_ATTEMPTS_FILE;
 if(output)fs.writeFileSync(output,JSON.stringify({attempts},null,2));
});
"""

EXPORT_CHECK = r"""
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
const [repo,currentPath,baselinePath,outputDir,expectedModuleHash]=process.argv.slice(2);
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const modulePath=path.join(repo,'site/cloud/coffee-url-autofill.js');
const moduleBytes=await fs.readFile(modulePath);
if(hash(moduleBytes)!==expectedModuleHash)throw new Error('Actual client exporter differs from preserved C8 source');
const {coffeeSourceReviewSnapshot,downloadCoffeeSourceReview}=await import(pathToFileURL(modulePath));
const current=JSON.parse(await fs.readFile(currentPath,'utf8'));
const baseline=JSON.parse(await fs.readFile(baselinePath,'utf8'));
const previous=new Map(baseline.records.map(row=>[row.case_id,row]));
const directory=path.join(outputDir,'exports');
await fs.mkdir(directory,{recursive:true});
const checkedAt='2026-10-24T00:00:00.000Z';
let intercepted=null,clicks=0,downloadName='';
globalThis.document={createElement(tag){
 if(tag!=='a')throw new Error('Unexpected download element');
 const anchor={href:'',download:'',click(){clicks++;downloadName=anchor.download;}};
 return anchor;
}};
URL.createObjectURL=blob=>{intercepted=blob;return 'blob:offline-frozen-export';};
URL.revokeObjectURL=()=>{};
globalThis.setTimeout=()=>0;
const records=[],errors=[],responseBytes=[],factCounts=[],contentUnits=[],elapsed=[];
for(const row of current.records){
 const prior=previous.get(row.case_id);
 if(!prior)throw new Error('Missing baseline export identity');
 responseBytes.push(Buffer.byteLength(JSON.stringify(row.output)));
 const facts=row.output?.source_facts||[];
 factCounts.push(facts.length);
 contentUnits.push(facts.reduce((sum,fact)=>sum+(typeof fact.value==='string'?fact.value.length:0),0));
 elapsed.push(row.elapsed_ms);
 try{
  const actual=coffeeSourceReviewSnapshot(row.output,{checkedAt});
  const old=coffeeSourceReviewSnapshot(prior.output,{checkedAt});
  if(!actual||!old)throw new Error('Actual source review export unavailable');
  const equal=isDeepStrictEqual(actual,old);
  if(!equal)errors.push({case_id:row.case_id,kind:'export_changed'});
  intercepted=null;const before=clicks;
  if(!downloadCoffeeSourceReview(actual)||!intercepted||clicks!==before+1)
   throw new Error('Actual client download did not emit exactly one Blob');
  const text=await intercepted.text();
  if(text!==JSON.stringify(actual,null,2))throw new Error('Actual download bytes differ from snapshot');
  const filename=row.case_id+'.json';
  await fs.writeFile(path.join(directory,filename),text,{mode:0o600});
  records.push({case_id:row.case_id,file:'exports/'+filename,bytes:Buffer.byteLength(text),
   sha256:hash(text),baseline_sha256:hash(JSON.stringify(old,null,2)),equal,
   synthetic_anchor_clicks:clicks-before,download_name:downloadName});
 }catch(error){errors.push({case_id:row.case_id,kind:'export_failed',error:String(error.message)});}
}
const stats=values=>{
 const sorted=[...values].sort((a,b)=>a-b);
 return {min:sorted[0],median:sorted[Math.floor(sorted.length/2)],
  p95:sorted[Math.floor((sorted.length-1)*.95)],max:sorted.at(-1)};
};
const result={type:'actual_client_snapshot_and_download_verification',
 source_tree_sha256:current.source_tree_sha256,client_module_sha256:hash(moduleBytes),
 checked_at:checkedAt,checked_at_is_fixture:true,cases:current.records.length,
 exports:records.length,download_clicks:clicks,equal:records.filter(row=>row.equal).length,
 errors,records,measurements:{response_utf8_bytes:stats(responseBytes),
 fact_count:stats(factCounts),source_fact_value_utf16_units:stats(contentUnits),fixture_elapsed_ms:stats(elapsed)},
 browser_or_device_acceptance:false,network_permitted:false};
await fs.writeFile(path.join(outputDir,'actual-exports.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({cases:result.cases,exports:result.exports,equal:result.equal,
 errors:errors.length,measurements:result.measurements}));
"""


@contextlib.contextmanager
def deny_python_external_operations(attempts):
    def denied(name):
        def stop(*_args, **_kwargs):
            attempts.append(name)
            raise RuntimeError("Offline audit denied " + name)
        return stop
    with contextlib.ExitStack() as stack:
        for module, names in (
            (socket, ("socket", "create_connection", "getaddrinfo", "gethostbyname", "gethostbyname_ex")),
            (subprocess, ("Popen", "run", "call", "check_call", "check_output")),
            (os, ("system", "popen", "spawnl", "spawnle", "spawnlp", "spawnlpe",
                  "spawnv", "spawnve", "spawnvp", "spawnvpe")),
        ):
            for name in names:
                if hasattr(module, name):
                    stack.enter_context(mock.patch.object(module, name, denied(module.__name__ + "." + name)))
        yield


def offline_python_script(script, arguments, attempts_file):
    attempts = []
    try:
        sys.argv = [str(script), *arguments]
        with deny_python_external_operations(attempts):
            runpy.run_path(str(script), run_name="__main__")
    finally:
        write_json(attempts_file, {"attempts": attempts})


def run_command(name, command, output, repo, timeout=MAX_COMMAND_SECONDS):
    log = output / "logs" / (name + ".log")
    log.parent.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    env = dict(os.environ)
    for key in ("GH_TOKEN", "GITHUB_TOKEN", "NODE_OPTIONS", "GITHUB_EVENT_PATH"):
        env.pop(key, None)
    env["DIC_OFFLINE_ATTEMPTS_FILE"] = str(output / (name + "-external-attempts.json"))
    with log.open("w", encoding="utf-8") as stream:
        result = subprocess.run(command, cwd=repo, env=env, stdout=stream,
                                stderr=subprocess.STDOUT, timeout=timeout, check=False)
    receipt = {"name": name, "exit_code": result.returncode,
               "elapsed_seconds": round(time.monotonic() - started, 3),
               "log": "logs/" + log.name, "log_sha256": file_hash(log)}
    print(json.dumps(receipt), flush=True)
    require(result.returncode == 0, "Benchmark stage failed: " + name + "; see retained stage log")
    attempts_file = output / (name + "-external-attempts.json")
    require(attempts_file.is_file(), "Missing offline-operation receipt: " + name)
    require(load_json(attempts_file).get("attempts") == [],
            "External operation was attempted during " + name)
    return receipt


def typed_equal(left, right):
    if type(left) in (int, float) and type(right) in (int, float):
        return left == right
    if type(left) is not type(right):
        return False
    if isinstance(left, dict):
        return left.keys() == right.keys() and all(typed_equal(value, right[key])
                                                  for key, value in left.items())
    if isinstance(left, list):
        return len(left) == len(right) and all(typed_equal(a, b) for a, b in zip(left, right))
    return left == right


def indexed_records(document, expected_ids, label):
    rows = document.get("records")
    require(isinstance(rows, list), "Missing records: " + label)
    indexed = {row["case_id"]: row for row in rows}
    require(len(rows) == len(indexed) == 603 and indexed.keys() == expected_ids,
            "Incomplete or duplicate case identities: " + label)
    return indexed


def compare_complete_cases(old, current):
    changes = []
    for case_id, before in old.items():
        after = current[case_id]
        prior = {key: value for key, value in before.items() if key != "elapsed_ms"}
        actual = {key: value for key, value in after.items() if key != "elapsed_ms"}
        if not typed_equal(prior, actual):
            keys = sorted(set(prior) | set(actual))
            changed = [key for key in keys if key not in prior or key not in actual
                       or not typed_equal(prior[key], actual[key])]
            output_keys = sorted(set(prior.get("output", {})) | set(actual.get("output", {})))
            changes.append({"case_id": case_id, "changed_case_keys": changed,
                            "changed_output_keys": [
                                key for key in output_keys
                                if key not in prior.get("output", {})
                                or key not in actual.get("output", {})
                                or not typed_equal(prior["output"][key], actual["output"][key])
                            ]})
    return changes


def canonical_losses(old, current):
    losses = []
    for case_id, prior in old.items():
        after = {row["field"]: row for row in current[case_id]["canonical"]}
        before = {row["field"]: row for row in prior["canonical"]}
        require(len(before) == len(prior["canonical"]) and len(after) == len(current[case_id]["canonical"])
                and before.keys() == after.keys(), "Canonical assertion identity changed")
        for field, row in before.items():
            require(typed_equal(row["expected"], after[field]["expected"])
                    and typed_equal(row["evidence"], after[field]["evidence"]),
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
                require(typed_equal(first.get(key), second.get(key)),
                        "Frozen supplementary assertion identity changed")
            if first["status"] == "all_evidence_retained" and second["status"] != "all_evidence_retained":
                losses.append({"case_id": case_id, "assertion_index": first["assertion_index"],
                               "before": first, "after": second})
    return losses


def verify_offline_exports(repo, output, exports):
    spec = importlib.util.spec_from_file_location(
        "frozen_ci_local_review", repo / "scripts/audit/coffee-source-review-local.py")
    helper = importlib.util.module_from_spec(spec)
    attempts, failures, verified = [], [], []
    with deny_python_external_operations(attempts):
        spec.loader.exec_module(helper)
        for row in exports["records"]:
            location = output / row["file"]
            require(location.is_file() and file_hash(location) == row["sha256"],
                    "Actual client export bytes changed")
            try:
                value, receipt = helper.source_review(location)
                require(typed_equal(value, load_json(location)), "Offline helper changed exported data")
                require(receipt.get("source_url_fetched") is False,
                        "Offline helper did not record its no-fetch boundary")
                verified.append({"case_id": row["case_id"], "sha256": receipt["sha256"]})
            except Exception as error:
                failures.append({"case_id": row["case_id"],
                                 "error": type(error).__name__ + ": " + str(error)})
    result = {"cases": exports["cases"], "passed": len(verified), "failures": failures,
              "attempted_external_operations": attempts, "images_selected": 0,
              "ocr_run": False, "application_writes": False,
              "helper_sha256": file_hash(repo / "scripts/audit/coffee-source-review-local.py"),
              "records": verified}
    write_json(output / "offline-helper-all-exports.json", result)
    return result


def artifact_inventory(output):
    files = []
    for path in sorted(output.rglob("*")):
        if path.is_file() and path.name != "artifact-manifest.json":
            files.append({"file": path.relative_to(output).as_posix(),
                          "bytes": path.stat().st_size, "sha256": file_hash(path)})
    receipt = write_json(output / "artifact-manifest.json", {"files": files,
               "excludes_transfer_manifest_and_original_source_captures": True})
    return {**receipt, "retained_files": len(files), "retained_bytes": sum(row["bytes"] for row in files)}


def run_benchmark(args):
    repo = Path(__file__).resolve().parents[2]
    require(args.repo.resolve() == repo, "Benchmark must run the checked-out repository scripts")
    require(re.fullmatch(r"[0-9a-f]{64}", args.expected_fingerprint or "")
            and args.expected_fingerprint != "0" * 64, "A reviewed runtime fingerprint is required")
    work, output = args.work.resolve(), args.output.resolve()
    require(work != repo and repo not in work.parents and output == work / "output",
            "Benchmark output must be the dedicated output directory outside the application checkout")
    work.mkdir(parents=True, exist_ok=True, mode=0o700)
    output.mkdir(parents=True, exist_ok=True, mode=0o700)
    inputs = work / "inputs"
    originals, extraction = {}, []
    for label, expected in ARCHIVES.items():
        archive = inputs / expected["file_name"]
        require(archive.is_file() and not archive.is_symlink()
                and archive.stat().st_size == expected["size_bytes"]
                and file_hash(archive) == expected["sha256"],
                "Required original archive is unavailable or changed: " + label)
        originals[label] = {"file": expected["file_name"], "bytes": expected["size_bytes"],
                            "sha256": expected["sha256"]}
        extraction.extend(extract_data(archive, work / ("data-" + label), label))
    index = {}
    for record in extraction:
        index.setdefault(record["sha256"], []).append(record)
    print(json.dumps({"original_archives_verified": originals,
                      "data_files_enumerated": len(extraction)}), flush=True)
    corpus, expected, frozen_files, corpus_receipt = assemble_corpus(repo, work, index)
    baseline_dir = output / "baseline"
    baseline_dir.mkdir()
    baseline_paths, baseline = {}, {}
    for name, expected_hash in C8_ARTIFACTS.items():
        record = find_original(index, expected_hash, "candidate8 " + name)
        location = baseline_dir / ("candidate8-" + name + ".json")
        copy_original(record, location)
        baseline_paths[name], baseline[name] = location, load_json(location)
        require(baseline[name].get("source_tree_sha256") == C8_FINGERPRINT
                and baseline[name].get("oracle_freeze_sha256") == FREEZE_SHA256,
                "Original candidate8 artifact binding differs: " + name)
        indexed_records(baseline[name], expected.keys(), "candidate8 " + name)
    require(baseline["comparison"]["replay_sha256"] == C8_ARTIFACTS["replay"]
            and baseline["retention"]["replay_sha256"] == C8_ARTIFACTS["replay"],
            "Original candidate8 results bind to another replay")
    require(baseline["replay"].get("selected_cases_only") is False
            and baseline["replay"].get("case_count") == 603,
            "Original candidate8 artifact is not the full frozen benchmark")
    for name in ("replay", "retention"):
        require(baseline[name].get("packet_archive_attestation_sha256") == ATTESTATION_SHA256
                and baseline[name].get("source_archive_sha256") == ARCHIVES["source_archive"]["sha256"],
                "Original candidate8 archive binding differs: " + name)
    preserved_scripts = {
        "scripts/audit/coffee-corpus-replay.mjs": baseline["replay"]["harness_sha256"],
        "scripts/audit/coffee-corpus-compare.mjs": baseline["comparison"]["comparison_script_sha256"],
        "scripts/audit/coffee-corpus-normalize.mjs": baseline["comparison"]["comparison_normalizer_sha256"],
        "scripts/audit/coffee-corpus-retention.py": baseline["retention"]["retention_script_sha256"],
        "site/cloud/coffee-url-autofill.js": CLIENT_EXPORT_SHA256,
    }
    for name, expected_hash in preserved_scripts.items():
        require(file_hash(repo / name) == expected_hash,
                "Preserved harness, scorer or client exporter changed: " + name)
    write_json(output / "original-input-verification.json", {
        **corpus_receipt, "archives": originals,
        "candidate8_artifacts": C8_ARTIFACTS,
        "preserved_script_hashes": preserved_scripts,
        "data_only_extraction": True, "scorers_changed": False, "expected_values_changed": False,
    })
    guard, export_script = work / "deny-external-operations.mjs", work / "actual-client-exports.mjs"
    guard.write_text(NODE_GUARD, encoding="utf-8")
    export_script.write_text(EXPORT_CHECK, encoding="utf-8")
    replay_path, comparison_path, retention_path = [
        output / name for name in ("candidate11-replay.json", "candidate11-comparison.json",
                                  "candidate11-retention.json")]
    stages = []
    stages.append(run_command("full603-replay", [
        "node", "--import", str(guard), str(repo / "scripts/audit/coffee-corpus-replay.mjs"),
        str(corpus), str(replay_path), str(repo),
    ], output, repo))
    replay = load_json(replay_path)
    require(replay.get("source_tree_sha256") == args.expected_fingerprint,
            "Actual replay runtime differs from the reviewed candidate")
    require(replay.get("selected_cases_only") is False and replay.get("case_count") == 603
            and replay.get("oracle_freeze_sha256") == FREEZE_SHA256,
            "Replay is not the complete original frozen benchmark")
    require(len(replay.get("source_files", [])) == 32, "Unexpected extractor runtime file inventory")
    current_rows = indexed_records(replay, expected.keys(), "candidate11 replay")
    old_rows = indexed_records(baseline["replay"], expected.keys(), "candidate8 replay")
    for case_id, row in current_rows.items():
        require(row.get("source_url") == expected[case_id]["source_url"]
                and row.get("roaster_id") == expected[case_id]["roaster_id"],
                "New replay case identity differs")
    complete_changes = compare_complete_cases(old_rows, current_rows)
    write_json(output / "complete-output-equivalence.json", {
        "cases": 603, "baseline_fingerprint": C8_FINGERPRINT,
        "candidate_fingerprint": replay["source_tree_sha256"],
        "ignored_case_properties": ["elapsed_ms"],
        "changes": complete_changes, "all_complete_case_outputs_calls_equal": not complete_changes,
        "automatic_adjudication_performed": False,
    })
    stages.append(run_command("strict-comparison", [
        "node", "--import", str(guard), str(repo / "scripts/audit/coffee-corpus-compare.mjs"),
        str(corpus), str(replay_path), str(comparison_path),
    ], output, repo))
    stages.append(run_command("supplementary-retention", [
        sys.executable, str(Path(__file__).resolve()), "offline-python",
        str(repo / "scripts/audit/coffee-corpus-retention.py"),
        str(output / "supplementary-retention-external-attempts.json"),
        str(corpus), str(replay_path), str(retention_path),
    ], output, repo))
    comparison, retention = load_json(comparison_path), load_json(retention_path)
    compared = indexed_records(comparison, expected.keys(), "candidate11 comparison")
    retained = indexed_records(retention, expected.keys(), "candidate11 retention")
    before_compared = indexed_records(baseline["comparison"], expected.keys(), "candidate8 comparison")
    before_retained = indexed_records(baseline["retention"], expected.keys(), "candidate8 retention")
    for name, result in (("comparison", comparison), ("retention", retention)):
        require(result.get("source_tree_sha256") == replay["source_tree_sha256"]
                and result.get("oracle_freeze_sha256") == FREEZE_SHA256
                and result.get("replay_sha256") == file_hash(replay_path),
                "New result binding differs: " + name)
    exact_losses = canonical_losses(before_compared, compared)
    full_losses = retention_losses(before_retained, retained)
    write_json(output / "canonical-and-retention-deltas.json", {
        "canonical_exact_losses": exact_losses, "supplementary_full_retention_losses": full_losses,
        "baseline_canonical": baseline["comparison"]["counts"], "candidate_canonical": comparison["counts"],
        "baseline_retention": baseline["retention"]["counts"], "candidate_retention": retention["counts"],
        "canonical_counts_unchanged": typed_equal(comparison["counts"], baseline["comparison"]["counts"]),
        "retention_counts_unchanged": typed_equal(retention["counts"], baseline["retention"]["counts"]),
    })
    stages.append(run_command("actual-client-exports", [
        "node", "--import", str(guard), str(export_script), str(repo),
        str(replay_path), str(baseline_paths["replay"]), str(output), CLIENT_EXPORT_SHA256,
    ], output, repo))
    exports = load_json(output / "actual-exports.json")
    helper = verify_offline_exports(repo, output, exports)
    blockers = []
    if complete_changes:
        blockers.append("Complete frozen case output/call changes require independent source review")
    if exact_losses:
        blockers.append("A prior canonical exact match was lost")
    if full_losses:
        blockers.append("A prior fully retained supplementary assertion was lost")
    if not typed_equal(comparison["counts"], baseline["comparison"]["counts"]):
        blockers.append("Canonical counts differ from the unchanged-output expectation")
    if not typed_equal(retention["counts"], baseline["retention"]["counts"]):
        blockers.append("Retention counts differ from the unchanged-output expectation")
    if exports["exports"] != 603 or exports["equal"] != 603 or exports["errors"]:
        blockers.append("Actual client snapshot/download equality did not pass all603 cases")
    if helper["passed"] != 603 or helper["failures"] or helper["attempted_external_operations"]:
        blockers.append("Offline helper validation did not pass all603 actual exports without external operations")
    require(comparison["counts"]["canonical_assertions"] == 4002
            and comparison["counts"]["additional_facts"] == 6474
            and retention["counts"]["additional_assertions"] == 6474,
            "Frozen assertion totals changed")
    limits = ("Strict matches are frozen normalized equality, not semantic accuracy. "
              "Missing, review-required, partial and unconfirmed results remain explicit. "
              "Original ambiguous namespaces and malformed source flags are not automatically adjudicated. "
              "The replay uses captured public bytes and isolated authentication/quota fixtures; "
              "it is not production-network, member-session, browser or device acceptance.")
    runtime_files = replay["source_files"]
    for row in runtime_files:
        location = repo / row["path"]
        require(location.is_file() and location.stat().st_size == row["bytes"]
                and file_hash(location) == row["sha256"], "Runtime changed after full replay")
    for row in frozen_files:
        require(file_hash(row["path"]) == row["sha256"], "Frozen evidence changed during benchmark")
    require(file_hash(corpus / "oracle-freeze.json") == FREEZE_SHA256
            and file_hash(corpus / "original-archive-packet-attestation.json") == ATTESTATION_SHA256,
            "Original lock or attestation changed")
    for name, expected_hash in preserved_scripts.items():
        require(file_hash(repo / name) == expected_hash, "Harness/scorer/exporter changed during benchmark")
    git_sha = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repo, text=True).strip()
    git_tree = subprocess.check_output(["git", "rev-parse", "HEAD^{tree}"], cwd=repo, text=True).strip()
    run_id = os.environ.get("GITHUB_RUN_ID", "")
    ci_runs = [int(run_id)] if run_id.isdigit() and int(run_id) > 0 else []
    receipt = {
        "schema_version": 4, "type": "actual_github_frozen_corpus_benchmark",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "FROZEN_BENCHMARK_REVIEW_REQUIRED" if blockers else "FROZEN_BENCHMARK_PASS",
        "final_candidate": 11, "extractor_source_fingerprint": replay["source_tree_sha256"],
        "extractor_source_files": runtime_files,
        "oracle_freeze_sha256": FREEZE_SHA256, "canonical": comparison["counts"],
        "supplementary_retention": retention["counts"],
        "remaining_source_limit": limits,
        "source_commit": git_sha, "source_tree": git_tree,
        "github_run_id": int(run_id) if run_id.isdigit() else None,
        "expected_values_changed": False, "scoring_rules_changed": False,
        "complete_case_equivalence": {"cases": 603, "changed_cases": len(complete_changes),
                                      "ignored": ["elapsed_ms"]},
        "actual_client_exports_equal": exports["equal"],
        "offline_helper_exports_passed": helper["passed"],
        "canonical_exact_losses": len(exact_losses),
        "supplementary_full_retention_losses": len(full_losses),
        "runtime_and_frozen_inputs_unchanged": True,
        "remote_integration": False, "hosted_ci_dispatched": True,
        "published_or_deployed": False, "production_sql_auth_edge_or_member_writes": False,
        "new_api_keys_or_paid_services": False,
        "integration_continuation": {
            "state": "TESTING", "github_ci": "IN_PROGRESS", "ci_runs": ci_runs,
            "merged_source_sha": None,
            "blockers": blockers + ["Premerge benchmark; complete integration and applicable final checks remain required"],
        },
    }
    receipt_path = output / "candidate11-benchmark-receipt.json"
    write_json(receipt_path, receipt)
    report_path = output / "candidate11-frozen-audit.html"
    stages.append(run_command("source-bound-report", [
        sys.executable, str(Path(__file__).resolve()), "offline-python",
        str(repo / "scripts/audit/coffee-corpus-report.py"),
        str(output / "source-bound-report-external-attempts.json"),
        "--corpus", str(corpus),
        "--baseline", str(baseline_paths["comparison"]),
        "--baseline-replay", str(baseline_paths["replay"]),
        "--comparison", str(comparison_path), "--retention", str(retention_path),
        "--replay", str(replay_path), "--output", str(report_path),
        "--audit-receipt", str(receipt_path),
    ], output, repo))
    summary = {
        "status": "FAIL" if blockers else "PASS",
        "candidate": 11, "source_commit": git_sha, "source_tree": git_tree,
        "runtime_fingerprint": replay["source_tree_sha256"],
        "corpus": corpus_receipt, "canonical": comparison["counts"],
        "supplementary_retention": retention["counts"],
        "complete_output_call_changes": complete_changes,
        "canonical_exact_losses": len(exact_losses),
        "supplementary_full_retention_losses": len(full_losses),
        "actual_client_exports": {"cases": exports["cases"], "exports": exports["exports"],
                                  "equal": exports["equal"], "errors": exports["errors"]},
        "offline_helper": {"passed": helper["passed"], "failures": helper["failures"],
                           "attempted_external_operations": helper["attempted_external_operations"]},
        "measurements": exports["measurements"],
        "artifacts": {name: {"file": path.name, "bytes": path.stat().st_size, "sha256": file_hash(path)}
                      for name, path in (("replay", replay_path), ("comparison", comparison_path),
                                         ("retention", retention_path), ("report", report_path),
                                         ("receipt", receipt_path))},
        "stages": stages, "blockers": blockers,
        "expected_values_changed": False, "scoring_rules_changed": False,
        "runtime_and_frozen_inputs_unchanged": True,
        "production_or_member_operations": False, "new_api_keys_or_paid_services": False,
        "limits": limits,
    }
    write_json(output / "summary.json", summary)
    print(json.dumps({key: summary[key] for key in (
        "status", "candidate", "source_commit", "source_tree", "runtime_fingerprint",
        "canonical", "supplementary_retention", "canonical_exact_losses",
        "supplementary_full_retention_losses", "actual_client_exports", "offline_helper",
        "corpus", "artifacts", "measurements", "blockers")}), flush=True)
    require(not blockers, "Frozen benchmark requires independent review; see retained summary and raw artifacts")
    return summary



def self_test():
    """Exercise the runner's failure boundaries without original archives or network."""
    class RunnerControls(unittest.TestCase):
        def test_safe_archive_paths(self):
            self.assertEqual(safe_parts("./data/cases/case-one/source.json"),
                             ("data", "cases", "case-one", "source.json"))
            for name in ("", "/", "../outside.json", "data/../../outside.json",
                         "/tmp/outside.json", "C:/outside.json", "a\\outside.json",
                         "bad\x00name", "./"):
                with self.subTest(path=repr(name)), self.assertRaises(ValueError):
                    safe_parts(name)

        def test_zip_extracts_only_data(self):
            with tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                archive = root / "data.zip"
                with zipfile.ZipFile(archive, "w") as package:
                    package.writestr("repo/tool.py", "raise RuntimeError('never execute')")
                    package.writestr("repo/manifest.json", '{"original":true}')
                    package.writestr("bundle/cases/one/source.html", "<p>Captured data</p>")
                rows = extract_data(archive, root / "selected", "test")
                self.assertEqual(len(rows), 2)
                self.assertFalse((root / "selected/repo/tool.py").exists())
                self.assertEqual((root / "selected/repo/manifest.json").read_text(), '{"original":true}')
                self.assertTrue(all(file_hash(row["path"]) == row["sha256"] for row in rows))

        def test_zip_rejects_traversal_and_links(self):
            with tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                traversal = root / "traversal.zip"
                with zipfile.ZipFile(traversal, "w") as package:
                    package.writestr("../outside.json", "{}")
                with self.assertRaises(ValueError):
                    extract_data(traversal, root / "one", "test")
                self.assertFalse((root / "outside.json").exists())
                linked = root / "linked.zip"
                with zipfile.ZipFile(linked, "w") as package:
                    entry = zipfile.ZipInfo("cases/one/source.json")
                    entry.create_system = 3
                    entry.external_attr = (stat.S_IFLNK | 0o777) << 16
                    package.writestr(entry, "../../outside.json")
                with self.assertRaises(ValueError):
                    extract_data(linked, root / "two", "test")

        def test_zip_rejects_duplicate_normalized_paths(self):
            with tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                archive = root / "duplicate.zip"
                with zipfile.ZipFile(archive, "w") as package:
                    package.writestr("manifest.json", "{}")
                    package.writestr("./manifest.json", '{"changed":true}')
                with self.assertRaises(ValueError):
                    extract_data(archive, root / "selected", "test")

        def test_tar_root_and_regular_data(self):
            with tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                archive = root / "original.tar.gz"
                content = b'{"frozen":true}'
                with tarfile.open(archive, "w:gz") as package:
                    directory = tarfile.TarInfo(".")
                    directory.type = tarfile.DIRTYPE
                    package.addfile(directory)
                    entry = tarfile.TarInfo("./corpus/manifest.json")
                    entry.size = len(content)
                    package.addfile(entry, io.BytesIO(content))
                rows = extract_data(archive, root / "selected", "test")
                self.assertEqual(len(rows), 1)
                self.assertEqual(rows[0]["path"].read_bytes(), content)

        def test_tar_rejects_selected_links(self):
            with tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                archive = root / "linked.tar"
                with tarfile.open(archive, "w") as package:
                    entry = tarfile.TarInfo("cases/one/source.json")
                    entry.type = tarfile.SYMTYPE
                    entry.linkname = "../../outside.json"
                    package.addfile(entry)
                with self.assertRaises(ValueError):
                    extract_data(archive, root / "selected", "test")

        def test_complete_equality_ignores_only_elapsed(self):
            original = {"one": {"case_id": "one", "elapsed_ms": 10.0, "status": 200,
                                "output": {"fields": {"name": "Coffee"},
                                           "source_facts": [{"value": "Original"}]},
                                "calls": [{"url": "https://example.test/coffee", "limit": 900000}],
                                "fixture_calls": ["user", "dic_preview_complete"]}}
            changed = json.loads(json.dumps(original))
            changed["one"]["elapsed_ms"] = 500
            self.assertEqual(compare_complete_cases(original, changed), [])
            changed["one"]["output"]["source_facts"][0]["value"] = "Changed"
            delta = compare_complete_cases(original, changed)
            self.assertEqual(delta[0]["changed_case_keys"], ["output"])
            self.assertEqual(delta[0]["changed_output_keys"], ["source_facts"])
            changed = json.loads(json.dumps(original))
            changed["one"]["calls"][0]["limit"] = 2000000
            self.assertEqual(compare_complete_cases(original, changed)[0]["changed_case_keys"], ["calls"])
            changed = json.loads(json.dumps(original))
            changed["one"]["fixture_calls"].reverse()
            self.assertTrue(compare_complete_cases(original, changed))

        def test_typed_json_equality(self):
            self.assertTrue(typed_equal({"number": 1}, {"number": 1.0}))
            self.assertFalse(typed_equal({"number": True}, {"number": 1}))
            self.assertFalse(typed_equal(["a", "b"], ["b", "a"]))
            self.assertFalse(typed_equal({"a": None}, {}))
            self.assertTrue(typed_equal({"a": [None, False]}, {"a": [None, False]}))

        def test_transfer_identity_and_transport_fail_closed(self):
            expected = ARCHIVES["source_archive"]
            valid = {key: expected[key] for key in ("transfer_id", "file_id", "library_file_id",
                     "file_name", "current_version_number", "mime_type", "size_bytes")}
            valid.update(suggested_path=expected["file_name"], completion_token="fixture-only",
                         download_url="https://example.oaiusercontent.com/data?sig=fixture",
                         xattrs=[{"name": "user.library-file-version", "value": "0"}],
                         workspace_path=None, method="GET", headers={})
            check_transfer("source_archive", valid)
            invalid = [
                {"download_url": "http://example.oaiusercontent.com/file"},
                {"download_url": "https://example.oaiusercontent.com.evil.test/file"},
                {"download_url": "https://user@example.oaiusercontent.com/file"},
                {"download_url": "https://example.oaiusercontent.com:443/file"},
                {"headers": {"Authorization": "fixture"}},
                {"workspace_path": "/tmp/alternate"},
                {"file_id": "wrong-original"},
                {"current_version_number": False},
                {"xattrs": []},
                {"extra_key": "unrecognized"},
            ]
            for patch in invalid:
                with self.subTest(patch=patch), self.assertRaises(ValueError):
                    check_transfer("source_archive", {**valid, **patch})

        def test_canonical_and_retention_losses(self):
            first = {"field": "origin", "expected": "Peru", "actual": "Peru",
                     "status": "exact_equivalent", "evidence": [{"quote": "Peru"}]}
            after = {**first, "actual": None, "status": "missing"}
            old, new = {"one": {"canonical": [first]}}, {"one": {"canonical": [after]}}
            self.assertEqual(len(canonical_losses(old, new)), 1)
            new["one"]["canonical"] = [{**after, "expected": "Changed"}]
            with self.assertRaises(ValueError):
                canonical_losses(old, new)
            retained = {"assertion_index": 0, "label": "Story", "expected": "Peru",
                        "context": None, "frozen_evidence": [{"quote": "Peru"}],
                        "status": "all_evidence_retained"}
            lost = {**retained, "status": "unconfirmed"}
            old, new = {"one": {"checks": [retained]}}, {"one": {"checks": [lost]}}
            self.assertEqual(len(retention_losses(old, new)), 1)
            new["one"]["checks"] = [{**lost, "frozen_evidence": []}]
            with self.assertRaises(ValueError):
                retention_losses(old, new)

        def test_python_external_operations_are_denied_and_recorded(self):
            attempts = []
            with deny_python_external_operations(attempts):
                with self.assertRaises(RuntimeError):
                    socket.create_connection(("example.test", 443))
                with self.assertRaises(RuntimeError):
                    subprocess.run(["never-run"])
            self.assertEqual(attempts, ["socket.create_connection", "subprocess.run"])

    suite = unittest.defaultTestLoader.loadTestsFromTestCase(RunnerControls)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    require(result.wasSuccessful(), "Frozen runner adversarial controls failed")
    print(json.dumps({"runner_controls_passed": result.testsRun}), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    materialize = commands.add_parser("materialize", help="Materialize the exact original prepared Library inputs")
    materialize.add_argument("--work", type=Path, required=True)
    benchmark = commands.add_parser("run", help="Run the original frozen corpus and retain sanitized evidence")
    benchmark.add_argument("--work", type=Path, required=True)
    benchmark.add_argument("--output", type=Path, required=True)
    benchmark.add_argument("--repo", type=Path, required=True)
    benchmark.add_argument("--expected-fingerprint", required=True)
    offline = commands.add_parser("offline-python", help=argparse.SUPPRESS)
    offline.add_argument("script", type=Path)
    offline.add_argument("attempts_file", type=Path)
    offline.add_argument("arguments", nargs=argparse.REMAINDER)
    commands.add_parser("self-test", help="Run data-extraction and evidence-integrity controls")
    args = parser.parse_args()
    if args.command == "offline-python":
        repo = Path(__file__).resolve().parents[2]
        allowed = {repo / "scripts/audit/coffee-corpus-retention.py",
                   repo / "scripts/audit/coffee-corpus-report.py"}
        require(args.script.resolve() in allowed, "Only the checked-out retention and report scripts are allowed")
        offline_python_script(args.script.resolve(), args.arguments, args.attempts_file.resolve())
        return 0
    if args.command == "self-test":
        self_test()
        return 0
    output = (args.work / "output").resolve() if args.command == "materialize" else args.output.resolve()
    try:
        if args.command == "materialize":
            materialize_from_event(args.work.resolve())
        else:
            run_benchmark(args)
    except Exception as error:
        # Do not include tracebacks, response bodies or raw helper stderr here:
        # materialization exceptions can contain signed-transfer information.
        reason = str(error) if isinstance(error, ValueError) else type(error).__name__
        failure = {"status": "FAIL", "stage": args.command, "reason": reason,
                   "exception_type": type(error).__name__,
                   "created_at": datetime.now(timezone.utc).isoformat(),
                   "original_expectations_modified": False,
                   "new_api_keys_or_paid_services": False,
                   "published_or_deployed": False}
        output.mkdir(parents=True, exist_ok=True, mode=0o700)
        write_json(output / "failure-summary.json", failure)
        print(json.dumps(failure), file=sys.stderr, flush=True)
        return 1
    finally:
        if output.is_dir():
            print(json.dumps({"artifact_manifest": artifact_inventory(output)}), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
