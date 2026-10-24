#!/usr/bin/env python3
"""Run the unchanged frozen 603-coffee benchmark with original archived inputs.

This runner never creates an oracle, changes a scorer, executes archived code,
or accepts a changed frozen output automatically. Transfer credentials remain
only in process memory and helper stdin, never in repository history or artifacts.
"""
from __future__ import annotations

import argparse
import base64
import contextlib
from datetime import datetime, timezone
import hashlib
import hmac
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
AUDIT_BRANCH = "work/issue33-candidate12-full-audit-20261024"
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
CANDIDATE = 12
CANDIDATE_PREFIX = "candidate" + str(CANDIDATE)


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



CHANNEL_ALGORITHM = "x25519-xsalsa20-poly1305"
CHANNEL_MARKER = "DIC_FROZEN_INPUT_ENCRYPTED"
CHANNEL_SECONDS = 1200
PUBLIC_INTEROP = {
    "sender_secret_key": "77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a",
    "sender_public_key": "8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a",
    "receiver_secret_key": "5dab087e624a8a4b79e17f8b83800ee66f3bb1292618b6fd1c2f8b27ff88e0eb",
    "receiver_public_key": "de9edb7d7b7dc1b4d35b61c2ece435373f8343c85b78674dadfc7e146f882b4f",
    "nonce": "69696ee955b62b73cd62bda875fc73d68219e0036b7a0b37",
    "message": "DIC frozen archive channel interoperability v1",
    "ciphertext": "a8eca2ae0cff9b9fa4355c1199c084d074d7277a129b8fdc68ec63cdab7412dc6c7ecbee324e331e69651c373bf132e44a431ea1ca03f40d3e14a1e5c415",
    "tweetnacl_source_sha256": "6bcd37a3b20dce913f82d4b23e4e2b661058b4b953df8a3f8c45d56ac4f72447",
}


def crypto_classes():
    # Ubuntu's free PyNaCl/libsodium package; no application dependency or key.
    from nacl.public import Box, PrivateKey, PublicKey
    return Box, PrivateKey, PublicKey


def verify_public_interop():
    Box, PrivateKey, PublicKey = crypto_classes()
    vector = PUBLIC_INTEROP
    sender = PrivateKey(bytes.fromhex(vector["sender_secret_key"]))
    receiver = PrivateKey(bytes.fromhex(vector["receiver_secret_key"]))
    require(bytes(sender.public_key).hex() == vector["sender_public_key"]
            and bytes(receiver.public_key).hex() == vector["receiver_public_key"],
            "Public RFC7748 key interoperability control failed")
    nonce, message = bytes.fromhex(vector["nonce"]), vector["message"].encode("ascii")
    encrypted = Box(sender, receiver.public_key).encrypt(message, nonce).ciphertext
    require(encrypted.hex() == vector["ciphertext"],
            "Public TweetNaCl/PyNaCl ciphertext interoperability control failed")
    require(Box(receiver, PublicKey(bytes.fromhex(vector["sender_public_key"]))).decrypt(
            encrypted, nonce) == message, "Public channel decrypt control failed")
    # Independent standard-library HMAC/HKDF check against the public jsSHA
    # vector. Only public test bytes are used; no transfer seed reaches CI.
    hmac_expected = ("87aa7cdea5ef619d4ff0b4241a1d6cb02379f4e2ce4ec2787ad0b30545e17cde"
                     "daa833b7d6b8a702038b274eaea3f4e4be9d914eeb61f1702e696c203a126854")
    require(hmac.new(bytes([11]) * 20, b"Hi There", hashlib.sha512).hexdigest() == hmac_expected,
            "RFC4231 HMAC-SHA512 public control failed")
    salt = b"DIC frozen input transfer HKDF salt v1"
    info = b"DIC public HKDF compatibility v1"
    prk = hmac.new(salt, bytes(range(64)), hashlib.sha512).digest()
    okm = hmac.new(prk, info + bytes([1]), hashlib.sha512).digest()[:56]
    require(prk.hex() == "0cdc8aaaec22a2e9a78241fbf5472dd8c6f73b3013f63fba0ac1f2b4397ba94ec793720d70970af9d9f0056f089916f4ff7c2e1a96127212fc3bc288fc8349fb"
            and okm.hex() == "1a68f3d4ab70a17ba545f31346054ce03fbe06bf13d58e811985d6967aaace104ec5b8a045bdf78a3707d1766bb0b25885c3d4b28a741ee9",
            "Public jsSHA/Python HKDF-SHA512 compatibility control failed")
    return {"algorithm": CHANNEL_ALGORITHM, "public_vector_pass": True,
            "hmac_sha512_public_vector_pass": True, "hkdf_sha512_public_vector_pass": True,
            "tweetnacl_source_sha256": vector["tweetnacl_source_sha256"],
            "public_vector_ciphertext_sha256": hashlib.sha256(encrypted).hexdigest()}


def current_run_context():
    require(os.environ.get("GITHUB_REPOSITORY") == REPOSITORY
            and os.environ.get("GITHUB_EVENT_NAME") == "pull_request", "Unexpected repository or event")
    event = load_json(os.environ["GITHUB_EVENT_PATH"])
    pr = event.get("pull_request", {})
    require(pr.get("head", {}).get("ref") == AUDIT_BRANCH
            and pr.get("head", {}).get("repo", {}).get("full_name") == REPOSITORY
            and pr.get("base", {}).get("ref") == "development/backend-foundation",
            "Frozen inputs are restricted to the authorized same-repository audit PR")
    number, head = event.get("number"), pr.get("head", {}).get("sha")
    require(type(number) is int and number > 0 and number == pr.get("number")
            and isinstance(head, str) and re.fullmatch(r"[0-9a-f]{40}", head),
            "Invalid pull-request identity")
    repo = Path(__file__).resolve().parents[2]
    actual_head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repo, text=True).strip()
    require(actual_head == head, "Frozen input channel must bind to the actual checked-out PR head")
    run_id, attempt = os.environ.get("GITHUB_RUN_ID", ""), os.environ.get("GITHUB_RUN_ATTEMPT", "")
    require(run_id.isdigit() and int(run_id) > 0 and attempt.isdigit() and int(attempt) > 0,
            "Invalid workflow run identity")
    return {"repository": REPOSITORY, "pr_number": number, "head_sha": head,
            "run_id": run_id, "run_attempt": attempt}


def write_private(path, value):
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "wb") as stream:
        stream.write(value)


def prepare_channel(work):
    context = current_run_context()
    interop = verify_public_interop()
    _Box, PrivateKey, _PublicKey = crypto_classes()
    work.mkdir(parents=True, exist_ok=True, mode=0o700)
    private_dir, public_dir = work / "channel-private", work / "channel-public"
    private_dir.mkdir(mode=0o700)
    public_dir.mkdir(mode=0o700)
    receiver = PrivateKey.generate()
    context.update(receiver_public_key=bytes(receiver.public_key).hex(),
                   expires_unix=int(time.time()) + CHANNEL_SECONDS)
    write_private(private_dir / "receiver.key", bytes(receiver))
    write_json(private_dir / "context.json", context)
    (private_dir / "context.json").chmod(0o600)
    write_json(public_dir / "public-key.json", {"schema_version": 1, "context": context,
                                               "interoperability": interop})
    name = "dic-frozen-channel-v1-{run_id}-{run_attempt}-{pr_number}-{head_sha}-{expires_unix}-{receiver_public_key}".format(**context)
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as stream:
            stream.write("artifact_name=" + name + "\n")
    print(json.dumps({"public_channel": context, "interoperability": interop,
                      "artifact_name": name}), flush=True)
    return context


def encrypted_marker(body):
    require(isinstance(body, str), "Invalid pull-request body")
    require(not re.search(r"<!--\s*DIC_FROZEN_INPUT_TRANSFERS\b", body),
            "Plaintext frozen-input transfer markers are not permitted")
    matches = re.findall(r"<!--\s*" + CHANNEL_MARKER + r"\s*\n([\s\S]*?)\n-->", body)
    require(len(matches) <= 1, "Multiple encrypted input envelopes are not permitted")
    if not matches:
        return None
    try:
        return json.loads(matches[0])
    except (ValueError, TypeError):
        raise ValueError("Encrypted input envelope is not valid JSON") from None


def decrypt_envelope(envelope, context, private_bytes, now=None):
    now = time.time() if now is None else now
    require(type(context.get("expires_unix")) is int and now < context["expires_unix"],
            "Private input channel expired")
    require(isinstance(envelope, dict) and set(envelope) ==
            {"schema_version", "algorithm", "context", "sender_public_key", "nonce", "ciphertext"}
            and type(envelope["schema_version"]) is int and envelope["schema_version"] == 1
            and envelope["algorithm"] == CHANNEL_ALGORITHM,
            "Invalid encrypted input envelope schema")
    require(typed_equal(envelope["context"], context),
            "Encrypted input envelope belongs to another repository, PR, head, run, attempt or key")
    for key, length in (("sender_public_key", 64), ("nonce", 48)):
        require(isinstance(envelope[key], str) and len(envelope[key]) == length
                and re.fullmatch(r"[0-9a-f]+", envelope[key]), "Invalid encrypted input " + key)
    ciphertext = envelope["ciphertext"]
    require(isinstance(ciphertext, str) and 32 <= len(ciphertext) <= 131072
            and len(ciphertext) % 2 == 0 and re.fullmatch(r"[0-9a-f]+", ciphertext),
            "Invalid encrypted input ciphertext")
    Box, PrivateKey, PublicKey = crypto_classes()
    receiver = PrivateKey(private_bytes)
    require(bytes(receiver.public_key).hex() == context["receiver_public_key"],
            "Private input key does not match the public channel")
    try:
        plaintext = Box(receiver, PublicKey(bytes.fromhex(envelope["sender_public_key"]))).decrypt(
            bytes.fromhex(ciphertext), bytes.fromhex(envelope["nonce"]))
        payload = json.loads(plaintext)
    except Exception:
        raise ValueError("Encrypted input authentication or payload decoding failed") from None
    require(isinstance(payload, dict) and set(payload) == {"schema_version", "context", "transfers"}
            and type(payload["schema_version"]) is int and payload["schema_version"] == 1
            and typed_equal(payload["context"], context), "Encrypted payload context differs")
    manifest = payload["transfers"]
    require(isinstance(manifest, dict) and set(manifest) ==
            {"schema_version", "source_archive", "recovery_archive"}
            and type(manifest["schema_version"]) is int and manifest["schema_version"] == 1,
            "Unexpected encrypted frozen-input manifest schema")
    return manifest


def consume_envelope(work, envelope, context):
    private_dir, key_file = work / "channel-private", work / "channel-private/receiver.key"
    require(key_file.is_file() and not key_file.is_symlink()
            and not (private_dir / "consumed.json").exists(), "Private input channel is unavailable or consumed")
    try:
        write_private(private_dir / "consumed.json", json_bytes({
            "envelope_sha256": hashlib.sha256(json_bytes(envelope)).hexdigest(),
            "consumed_at": int(time.time())}))
        return decrypt_envelope(envelope, context, key_file.read_bytes())
    finally:
        key_file.unlink(missing_ok=True)


def read_encrypted_transfers(work):
    context = load_json(work / "channel-private/context.json")
    current = current_run_context()
    require(all(typed_equal(context.get(key), value) for key, value in current.items()),
            "Private channel belongs to another checked-out workflow run")
    require(type(context.get("expires_unix")) is int
            and 0 < context["expires_unix"] - time.time() <= CHANNEL_SECONDS,
            "Private input channel is expired or has an invalid deadline")
    token = os.environ.get("GH_TOKEN", "")
    require(token, "Read-only GitHub token is unavailable for encrypted input polling")
    mask(token)
    endpoint = "https://api.github.com/repos/" + REPOSITORY + "/pulls/" + str(context["pr_number"])
    request = urllib.request.Request(endpoint, headers={
        "Authorization": "Bearer " + token, "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "dic-frozen-audit",
    })
    try:
        while time.time() < context["expires_unix"]:
            with urllib.request.urlopen(request, timeout=30) as response:
                raw = response.read(1024 * 1024 + 1)
            require(len(raw) <= 1024 * 1024, "Pull-request metadata exceeds the channel bound")
            pr = json.loads(raw)
            require(pr.get("state") == "open"
                    and pr.get("number") == context["pr_number"]
                    and pr.get("head", {}).get("sha") == context["head_sha"]
                    and pr.get("head", {}).get("ref") == AUDIT_BRANCH
                    and pr.get("head", {}).get("repo", {}).get("full_name") == REPOSITORY
                    and pr.get("base", {}).get("ref") == "development/backend-foundation",
                    "Pull request changed while awaiting private inputs")
            envelope = encrypted_marker(pr.get("body") or "")
            if envelope is not None:
                manifest = consume_envelope(work, envelope, context)
                print(json.dumps({"encrypted_input_decryption_verified": True,
                                  "sender_identity_verified_by_channel": False,
                                  "run_id": context["run_id"], "run_attempt": context["run_attempt"],
                                  "head_sha": context["head_sha"],
                                  "private_receiver_key_deleted": True}), flush=True)
                return manifest
            time.sleep(10)
        raise ValueError("Private input channel expired before an encrypted envelope arrived")
    finally:
        (work / "channel-private/receiver.key").unlink(missing_ok=True)


def materialize_from_event(work):
    """Decrypt one run-bound envelope before the unmodified Library helper."""
    manifest = read_encrypted_transfers(work)
    return materialize_transfers(work, manifest)


def materialize_transfers(work, manifest):
    """Use the unmodified Library helper with the complete decrypted objects."""
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
    # No plaintext manifest, URL, header, completion token or raw helper
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


def failure_diagnostics(log):
    """Expose only bounded exception names and source locations, never messages."""
    with Path(log).open("rb") as stream:
        stream.seek(max(0, Path(log).stat().st_size - 65536))
        lines = stream.read().decode("utf-8", errors="replace").splitlines()[-100:]
    errors, frames = [], []
    for line in lines:
        error = re.match(r"^\s*([A-Za-z_][A-Za-z0-9_.]*(?:Error|Exception)|Error|AssertionError)"
                         r"(?: \[([A-Z0-9_]{1,80})\])?:", line)
        if error:
            record = {"type": error[1]}
            if error[2]:
                record["code"] = error[2]
            if record not in errors:
                errors.append(record)
        frame = re.match(r'^\s*File ["\']([^"\']+)["\'], line ([0-9]+)', line)
        if frame:
            name, number = Path(frame[1]).name, frame[2]
        elif line.lstrip().startswith(("at ", "file://")):
            frame = re.search(r"([A-Za-z0-9_.-]+\.(?:mjs|cjs|js|py)):([0-9]+)(?::[0-9]+)?", line)
            if not frame:
                continue
            name, number = frame[1], frame[2]
        else:
            continue
        if re.fullmatch(r"[A-Za-z0-9_.-]{1,100}", name):
            record = {"source_file": name, "line": int(number)}
            if record not in frames:
                frames.append(record)
    return {"exception_types": errors[-10:], "source_locations": frames[-20:],
            "raw_exception_messages_omitted": True, "complete_log_retained_in_artifact": True}


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
    if result.returncode != 0:
        receipt["failure_diagnostics"] = failure_diagnostics(log)
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



REVIEWED_CHANGE_TYPE = "independently_reviewed_frozen_case_changes"
STABLE_CASE_FORMAT = "python-json-sort-keys-utf8-v1"
MAX_REVIEW_MANIFEST_BYTES = 4 * 1024 * 1024


def stable_json_sha256(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True,
                                    separators=(",", ":"), allow_nan=False).encode("utf-8")).hexdigest()


def stable_case_sha256(row):
    return stable_json_sha256({key: value for key, value in row.items() if key != "elapsed_ms"})


def stable_case_inventory_sha256(rows):
    return stable_json_sha256([{"case_id": case_id, "sha256": stable_case_sha256(rows[case_id])}
                               for case_id in sorted(rows)])


def valid_sha256(value):
    return isinstance(value, str) and re.fullmatch(r"[0-9a-f]{64}", value) is not None and value != "0" * 64


def exact_object(value, keys, message):
    require(isinstance(value, dict) and set(value) == set(keys), message)


def reject_duplicate_json_keys(pairs):
    value = {}
    for key, item in pairs:
        require(key not in value, "Duplicate reviewed-change JSON property")
        value[key] = item
    return value


def read_reviewed_changes(repo, path, pinned_sha256):
    if path is None and pinned_sha256 is None:
        return None, None
    require(path is not None and valid_sha256(pinned_sha256),
            "Reviewed changes require both a repository path and a nonzero SHA-256 workflow pin")
    location = repo / path
    require(location.absolute() == location.resolve()
            and location.resolve().parent == (repo / "docs/audits").resolve()
            and location.suffix == ".json" and location.is_file() and not location.is_symlink(),
            "Reviewed-change manifest must be a regular JSON file directly under checked-out docs/audits")
    require(0 < location.stat().st_size <= MAX_REVIEW_MANIFEST_BYTES
            and file_hash(location) == pinned_sha256,
            "Reviewed-change manifest bytes do not match the explicit workflow pin")
    def invalid_constant(_value):
        raise ValueError("Nonfinite number in reviewed-change manifest")
    document = json.loads(location.read_text(encoding="utf-8"),
                          object_pairs_hook=reject_duplicate_json_keys, parse_constant=invalid_constant)
    return document, {"file": location.relative_to(repo).as_posix(),
                      "bytes": location.stat().st_size, "sha256": pinned_sha256}


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
    require(typed_equal(counts, comparison["counts"])
            and typed_equal(retained, retention["counts"]),
            "Scorer count dictionaries differ from their independently recounted case records")
    return {"canonical": counts, "supplementary_retention": retained}


def frozen_review_evidence_index(corpus, expected):
    require(file_hash(corpus / "oracle-freeze.json") == FREEZE_SHA256
            and file_hash(corpus / "original-archive-packet-attestation.json") == ATTESTATION_SHA256,
            "Reviewed-change evidence needs the unchanged original freeze and packet attestation")
    freeze = load_json(corpus / "oracle-freeze.json")
    entries = [row for row in freeze["files"] if row["kind"] == "source_hash_index"]
    require(len(entries) == 1, "Missing unique frozen capture index for reviewed changes")
    location = corpus / PurePosixPath(entries[0]["path"]).name
    require(file_hash(location) == entries[0]["sha256"], "Frozen review capture index changed")
    captures = load_json(location)
    by_capture = {(row["case_id"], row["file"]): row for row in captures}
    require(len(captures) == len(by_capture) == 1197
            and {row["case_id"] for row in captures} == expected.keys(),
            "Frozen review capture coverage changed")
    packet_rows = load_json(corpus / "original-archive-packet-attestation.json")["packets"]
    selected_packets = [row for row in packet_rows if (row.get("id") or row.get("case_id")) in expected]
    packets = {(row.get("id") or row.get("case_id")): row for row in selected_packets}
    require(len(selected_packets) == len(packets) and packets.keys() == expected.keys(),
            "Frozen review packet coverage changed")
    return {"captures": by_capture, "packets": packets}


def oracle_has_quote(value, capture_id, quote):
    if isinstance(value, dict):
        if value.get("capture_id") == capture_id and value.get("quote") == quote:
            return True
        return any(oracle_has_quote(item, capture_id, quote) for item in value.values())
    if isinstance(value, list):
        return any(oracle_has_quote(item, capture_id, quote) for item in value)
    return False


def verify_reviewed_source_quote(corpus, expected, evidence_index, case_id, evidence):
    exact_object(evidence, ("capture_id", "capture_file", "capture_sha256", "capture_source_url",
                            "quote", "quote_basis"), "Invalid reviewed source-evidence properties")
    require(case_id in expected and safe_parts(case_id) == (case_id,),
            "Reviewed source evidence names an unknown case")
    name = evidence["capture_file"]
    require(isinstance(name, str) and safe_parts(name) == (name,),
            "Reviewed source capture must remain inside its original frozen case")
    require(isinstance(evidence["capture_id"], str) and evidence["capture_id"]
            and valid_sha256(evidence["capture_sha256"])
            and evidence["quote_basis"] in ("literal_capture", "frozen_oracle")
            and isinstance(evidence["quote"], str)
            and 0 < len(evidence["quote"].encode("utf-8")) <= 8192,
            "Invalid reviewed source quote or original capture binding")
    original = evidence_index["captures"].get((case_id, name))
    require(original is not None and original["sha256"] == evidence["capture_sha256"],
            "Reviewed quote points to a capture outside the original frozen hash index")
    case_directory = corpus / "cases" / case_id
    require(corpus.absolute() == corpus.resolve() and case_directory.absolute() == case_directory.resolve(),
            "Reviewed source evidence cannot traverse a linked corpus directory")
    packet_path = case_directory / "source-packet.json"
    packet_proof = evidence_index["packets"].get(case_id)
    require(packet_proof is not None and packet_path.is_file() and not packet_path.is_symlink()
            and packet_path.stat().st_size == packet_proof["bytes"]
            and file_hash(packet_path) == packet_proof["sha256"],
            "Reviewed quote's original source packet changed")
    packet = load_json(packet_path)
    require(packet.get("id") == case_id
            and packet.get("source_url") == expected[case_id]["source_url"]
            and packet.get("roaster_id") == expected[case_id]["roaster_id"],
            "Reviewed quote's source identity differs")
    requests = [row for row in packet["requests"]
                if row.get("label") == evidence["capture_id"] and row.get("file") == name]
    require(len(requests) == 1
            and all(requests[0].get(key) == original[key] for key in ("sha256", "bytes", "status"))
            and requests[0]["status"] == 200
            and isinstance(evidence["capture_source_url"], str)
            and evidence["capture_source_url"] in (requests[0].get("url"), requests[0].get("final_url")),
            "Reviewed quote's URL or capture identity differs from the original packet")
    location = corpus / "cases" / case_id / name
    require(location.is_file() and not location.is_symlink()
            and location.resolve().parent == (corpus / "cases" / case_id).resolve()
            and location.stat().st_size == original["bytes"] and file_hash(location) == original["sha256"],
            "Reviewed quote's original source bytes changed")
    if evidence["quote_basis"] == "literal_capture":
        require(evidence["quote"].encode("utf-8") in location.read_bytes(),
                "Reviewed literal quote is absent from the original capture bytes")
    else:
        require(oracle_has_quote(expected[case_id], evidence["capture_id"], evidence["quote"]),
                "Reviewed oracle quote is absent from the unchanged frozen source oracle")


def export_inventory(exports, expected_ids):
    require(exports.get("cases") == 603 and exports.get("exports") == 603
            and exports.get("download_clicks") == 603
            and exports.get("client_module_sha256") == CLIENT_EXPORT_SHA256,
            "Actual client snapshot/Blob verification is incomplete or uses a different exporter")
    rows = exports.get("records")
    require(isinstance(rows, list) and all(isinstance(row, dict) for row in rows),
            "Missing actual client export records")
    indexed = {row["case_id"]: row for row in rows}
    require(len(rows) == len(indexed) == 603 and indexed.keys() == expected_ids,
            "Actual client exports have missing, duplicate or unknown cases")
    changes = []
    for case_id, row in indexed.items():
        require(row.get("file") == "exports/" + case_id + ".json"
                and type(row.get("bytes")) is int and row["bytes"] > 0
                and row.get("synthetic_anchor_clicks") == 1
                and valid_sha256(row.get("sha256")) and valid_sha256(row.get("baseline_sha256"))
                and type(row.get("equal")) is bool,
                "Invalid actual client snapshot/Blob export receipt")
        require(row["equal"] == (row["sha256"] == row["baseline_sha256"]),
                "Actual client equality and complete export byte hashes disagree")
        if not row["equal"]:
            changes.append({"case_id": case_id, "kind": "export_changed"})
    require(exports.get("equal") == 603 - len(changes)
            and typed_equal(exports.get("errors"), changes),
            "Actual client export has failures or an unaccounted change")
    return indexed


def review_material(old_rows, current_rows, complete_changes, exports,
                    baseline_counts, candidate_counts, preserved_scripts, candidate_fingerprint):
    export_rows = export_inventory(exports, current_rows.keys())
    changes = []
    for change in complete_changes:
        case_id = change["case_id"]
        row = export_rows[case_id]
        changes.append({**change, "roaster_id": current_rows[case_id]["roaster_id"],
                        "source_url": current_rows[case_id]["source_url"],
                        "before_case_sha256": stable_case_sha256(old_rows[case_id]),
                        "after_case_sha256": stable_case_sha256(current_rows[case_id]),
                        "before_export_sha256": row["baseline_sha256"], "after_export_sha256": row["sha256"]})
    return {
        "schema_version": 1, "type": "unapproved_frozen_change_review_material", "candidate": CANDIDATE,
        "status": "UNREVIEWED" if changes else "UNCHANGED",
        "oracle_freeze_sha256": FREEZE_SHA256,
        "packet_archive_attestation_sha256": ATTESTATION_SHA256,
        "source_archive_sha256": ARCHIVES["source_archive"]["sha256"],
        "recovery_archive_sha256": ARCHIVES["recovery_archive"]["sha256"],
        "baseline_runtime_fingerprint": C8_FINGERPRINT,
        "baseline_artifacts": C8_ARTIFACTS,
        "candidate_runtime_fingerprint": candidate_fingerprint,
        "preserved_script_hashes": preserved_scripts,
        "stable_case_projection": {"format": STABLE_CASE_FORMAT, "ignored_case_properties": ["elapsed_ms"]},
        "baseline_stable_cases_sha256": stable_case_inventory_sha256(old_rows),
        "candidate_stable_cases_sha256": stable_case_inventory_sha256(current_rows),
        "baseline_counts": baseline_counts, "candidate_counts": candidate_counts,
        "changes": changes,
        "actual_export_changed_cases": [case_id for case_id, row in export_rows.items() if not row["equal"]],
        "source_quotes_reviewed": False, "approval_manifest_generated": False,
    }


def verify_reviewed_changes(manifest, material, corpus, expected, evidence_index, run_id):
    exact_object(manifest, (
        "schema_version", "type", "repository", "candidate", "review", "first_observed_run",
        "oracle_freeze_sha256", "packet_archive_attestation_sha256", "source_archive_sha256",
        "recovery_archive_sha256", "baseline_runtime_fingerprint", "baseline_artifacts",
        "candidate_runtime_fingerprint", "preserved_script_hashes", "stable_case_projection",
        "baseline_stable_cases_sha256", "candidate_stable_cases_sha256", "expected_counts", "changes"),
        "Unrecognized or missing reviewed-change manifest properties")
    require(type(manifest["schema_version"]) is int and manifest["schema_version"] == 1
            and manifest["type"] == REVIEWED_CHANGE_TYPE and manifest["repository"] == REPOSITORY,
            "Reviewed-change manifest type or repository differs")
    for key in ("candidate", "oracle_freeze_sha256", "packet_archive_attestation_sha256", "source_archive_sha256",
                "recovery_archive_sha256", "baseline_runtime_fingerprint", "baseline_artifacts",
                "candidate_runtime_fingerprint", "preserved_script_hashes", "stable_case_projection",
                "baseline_stable_cases_sha256", "candidate_stable_cases_sha256"):
        require(typed_equal(manifest[key], material[key]), "Reviewed-change binding differs: " + key)
    exact_object(manifest["expected_counts"], ("canonical", "supplementary_retention"),
                 "Reviewed score dictionaries are incomplete")
    require(typed_equal(manifest["expected_counts"], material["candidate_counts"]),
            "Actual recounted scores differ from the independently reviewed exact score dictionaries")
    review = manifest["review"]
    exact_object(review, ("reviewer", "reviewed_at", "decision", "independent_source_review"),
                 "Incomplete independent source-review decision")
    require(isinstance(review["reviewer"], str) and 0 < len(review["reviewer"]) <= 200
            and "\n" not in review["reviewer"] and "\r" not in review["reviewer"]
            and review["decision"] == "approve_exact_source_supported_changes"
            and review["independent_source_review"] is True,
            "Reviewed changes require an explicit independent source-review decision")
    try:
        reviewed_at = datetime.fromisoformat(review["reviewed_at"])
    except (ValueError, TypeError):
        raise ValueError("Invalid independent review timestamp") from None
    require(reviewed_at.tzinfo is not None and reviewed_at <= datetime.now(timezone.utc),
            "Independent review timestamp must be an actual past UTC-offset timestamp")
    observed = manifest["first_observed_run"]
    exact_object(observed, ("run_id", "run_attempt", "source_commit", "source_tree", "workflow_path",
                            "completed_at", "conclusion", "benchmark_status", "artifact", "artifacts"),
                 "Missing first failed full-run provenance")
    require(type(observed["run_id"]) is int and observed["run_id"] > 0
            and str(observed["run_id"]) != str(run_id)
            and type(observed["run_attempt"]) is int and observed["run_attempt"] > 0
            and observed["conclusion"] == "FAILURE" and observed["benchmark_status"] == "FAIL"
            and observed["workflow_path"] == ".github/workflows/coffee-frozen-corpus.yml",
            "Review must refer to a distinct already failed full frozen workflow run")
    for key in ("source_commit", "source_tree"):
        require(isinstance(observed[key], str) and re.fullmatch(r"[0-9a-f]{40}", observed[key])
                and observed[key] != "0" * 40, "Invalid source identity for the first failed full run")
    try:
        completed_at = datetime.fromisoformat(observed["completed_at"])
    except (ValueError, TypeError):
        raise ValueError("Invalid first failed-run completion timestamp") from None
    require(completed_at.tzinfo is not None and completed_at <= reviewed_at,
            "Source review must follow completion of the first failed full frozen run")
    exact_object(observed["artifact"], ("id", "bytes", "sha256"), "Missing original failed-run artifact identity")
    require(type(observed["artifact"]["id"]) is int and observed["artifact"]["id"] > 0
            and type(observed["artifact"]["bytes"]) is int and observed["artifact"]["bytes"] > 0
            and valid_sha256(observed["artifact"]["sha256"]), "Invalid original failed-run artifact binding")
    filenames = {"replay": CANDIDATE_PREFIX + "-replay.json", "comparison": CANDIDATE_PREFIX + "-comparison.json",
                 "retention": CANDIDATE_PREFIX + "-retention.json", "exports": "actual-exports.json",
                 "review_material": "review-material.json", "summary": "summary.json",
                 "manifest": "artifact-manifest.json"}
    exact_object(observed["artifacts"], filenames, "Missing raw first-run evidence hashes")
    for key, name in filenames.items():
        row = observed["artifacts"][key]
        exact_object(row, ("file", "bytes", "sha256"), "Invalid first-run raw artifact properties")
        require(row["file"] == name and type(row["bytes"]) is int and row["bytes"] > 0
                and valid_sha256(row["sha256"]), "Invalid first-run raw artifact hash")
    stable_material_bytes = (json.dumps(material, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    require(observed["artifacts"]["review_material"]["bytes"] == len(stable_material_bytes)
            and observed["artifacts"]["review_material"]["sha256"]
            == hashlib.sha256(stable_material_bytes).hexdigest(),
            "Actual stable review material differs from the pinned first failed-run artifact")
    approvals = manifest["changes"]
    actual = {row["case_id"]: row for row in material["changes"]}
    require(isinstance(approvals, list) and approvals
            and all(isinstance(row, dict) and isinstance(row.get("case_id"), str) for row in approvals),
            "Reviewed-change manifest must enumerate a nonempty exact changed-case inventory")
    approved = {row["case_id"]: row for row in approvals}
    require(len(approved) == len(approvals) and approved.keys() == actual.keys()
            and set(material["actual_export_changed_cases"]) <= approved.keys(),
            "Reviewed-change manifest has duplicate, missing, extra or unreviewed output/export cases")
    for case_id, change in approved.items():
        exact_object(change, tuple(actual[case_id]) + ("decision", "rationale", "source_evidence"),
                     "Unrecognized or missing per-case review properties")
        for key, value in actual[case_id].items():
            require(typed_equal(change[key], value), "Reviewed whole-case/export hash or change descriptor differs")
        require(change["decision"] == "source_supported_improvement"
                and isinstance(change["rationale"], str) and 20 <= len(change["rationale"]) <= 4000,
                "Each changed case needs an explicit source-supported review rationale")
        evidence = change["source_evidence"]
        require(isinstance(evidence, list) and 1 <= len(evidence) <= 32,
                "Each changed case needs bounded original source-quote evidence")
        require(len({stable_json_sha256(row) for row in evidence}) == len(evidence),
                "Duplicate reviewed source evidence")
        for row in evidence:
            verify_reviewed_source_quote(corpus, expected, evidence_index, case_id, row)
    return {"status": "ACCEPTED", "reviewed_cases": len(approved),
            "reviewed_export_changes": len(material["actual_export_changed_cases"]),
            "first_observed_run_id": observed["run_id"],
            "first_run_authentication": "Exact offline pins supplied by the independent review; no live artifact re-fetch.",
            "reviewer": review["reviewer"], "reviewed_at": review["reviewed_at"],
            "unlisted_case_changes_permitted": False, "zero_loss_requirements_waived": False}


def benchmark_change_blockers(material, review_gate, exact_losses, full_losses, exports, helper):
    """Approval can replace only the unchanged-output/count expectation, never safety checks."""
    blockers = []
    reviewed = review_gate.get("status") == "ACCEPTED"
    if material["changes"] and not reviewed:
        blockers.append("Complete frozen case output/call changes require independent source review")
    if exact_losses:
        blockers.append("A prior canonical exact match was lost")
    if full_losses:
        blockers.append("A prior fully retained supplementary assertion was lost")
    if not reviewed and not typed_equal(material["candidate_counts"]["canonical"],
                                        material["baseline_counts"]["canonical"]):
        blockers.append("Canonical counts differ from the unchanged-output expectation")
    if not reviewed and not typed_equal(material["candidate_counts"]["supplementary_retention"],
                                        material["baseline_counts"]["supplementary_retention"]):
        blockers.append("Retention counts differ from the unchanged-output expectation")
    if exports.get("cases") != 603 or exports.get("exports") != 603 or exports.get("download_clicks") != 603:
        blockers.append("Actual client snapshot/Blob download did not pass every frozen case")
    if any(row.get("kind") != "export_changed" for row in exports.get("errors", [])):
        blockers.append("An actual client export failed; review cannot waive export fidelity")
    if not reviewed and (exports["exports"] != 603 or exports["equal"] != 603 or exports["errors"]):
        blockers.append("Actual client snapshot/download equality did not pass all603 cases")
    if review_gate.get("status") == "REJECTED":
        blockers.append("Pinned reviewed-change manifest did not validate")
    if helper["passed"] != 603 or helper["failures"] or helper["attempted_external_operations"]:
        blockers.append("Offline helper validation did not pass all603 actual exports without external operations")
    return blockers


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
    reviewed_manifest, reviewed_manifest_info = read_reviewed_changes(
        repo, args.reviewed_changes, args.reviewed_changes_sha256)
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
        output / name for name in (CANDIDATE_PREFIX + "-replay.json", CANDIDATE_PREFIX + "-comparison.json",
                                  CANDIDATE_PREFIX + "-retention.json")]
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
    current_rows = indexed_records(replay, expected.keys(), CANDIDATE_PREFIX + " replay")
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
    compared = indexed_records(comparison, expected.keys(), CANDIDATE_PREFIX + " comparison")
    retained = indexed_records(retention, expected.keys(), CANDIDATE_PREFIX + " retention")
    before_compared = indexed_records(baseline["comparison"], expected.keys(), "candidate8 comparison")
    before_retained = indexed_records(baseline["retention"], expected.keys(), "candidate8 retention")
    for name, result in (("comparison", comparison), ("retention", retention)):
        require(result.get("source_tree_sha256") == replay["source_tree_sha256"]
                and result.get("oracle_freeze_sha256") == FREEZE_SHA256
                and result.get("replay_sha256") == file_hash(replay_path),
                "New result binding differs: " + name)
    candidate_counts = derived_score_counts(comparison, retention)
    baseline_counts = derived_score_counts(baseline["comparison"], baseline["retention"])
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
    material = review_material(old_rows, current_rows, complete_changes, exports,
                               baseline_counts, candidate_counts, preserved_scripts,
                               replay["source_tree_sha256"])
    material_path = output / "review-material.json"
    write_json(material_path, material)
    review_gate = {"status": "NOT_PROVIDED", "mode": "strict_c8_equality",
                   "manifest": None, "unlisted_case_changes_permitted": False,
                   "zero_loss_requirements_waived": False}
    if reviewed_manifest is not None:
        try:
            evidence_index = frozen_review_evidence_index(corpus, expected)
            review_gate = {**verify_reviewed_changes(
                reviewed_manifest, material, corpus, expected, evidence_index,
                os.environ.get("GITHUB_RUN_ID", "")),
                "mode": "pinned_independent_review", "manifest": reviewed_manifest_info}
            shutil.copyfile(repo / reviewed_manifest_info["file"], output / "reviewed-changes-manifest.json")
            (output / "reviewed-changes-manifest.json").chmod(0o600)
        except (ValueError, KeyError, TypeError) as error:
            review_gate = {"status": "REJECTED", "mode": "pinned_independent_review",
                           "manifest": reviewed_manifest_info,
                           "reason": str(error) if isinstance(error, ValueError) else type(error).__name__,
                           "unlisted_case_changes_permitted": False, "zero_loss_requirements_waived": False}
    write_json(output / "reviewed-changes-validation.json", review_gate)
    blockers = benchmark_change_blockers(material, review_gate, exact_losses, full_losses, exports, helper)
    require(comparison["counts"]["cases"] == 603 and comparison["counts"]["ok_response"] == 603
            and retention["counts"]["cases"] == 603
            and comparison["counts"]["canonical_assertions"] == 4002
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
    if reviewed_manifest_info is not None:
        require(file_hash(repo / reviewed_manifest_info["file"]) == reviewed_manifest_info["sha256"],
                "Pinned reviewed-change manifest changed during the benchmark")
    git_sha = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repo, text=True).strip()
    git_tree = subprocess.check_output(["git", "rev-parse", "HEAD^{tree}"], cwd=repo, text=True).strip()
    run_id = os.environ.get("GITHUB_RUN_ID", "")
    ci_runs = [int(run_id)] if run_id.isdigit() and int(run_id) > 0 else []
    receipt = {
        "schema_version": 4, "type": "actual_github_frozen_corpus_benchmark",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": ("FROZEN_BENCHMARK_REVIEW_REQUIRED" if blockers else
                   "FROZEN_BENCHMARK_PASS_WITH_REVIEWED_CHANGES" if review_gate["status"] == "ACCEPTED"
                   else "FROZEN_BENCHMARK_PASS"),
        "final_candidate": CANDIDATE, "extractor_source_fingerprint": replay["source_tree_sha256"],
        "extractor_source_files": runtime_files,
        "oracle_freeze_sha256": FREEZE_SHA256, "canonical": comparison["counts"],
        "supplementary_retention": retention["counts"],
        "remaining_source_limit": limits,
        "source_commit": git_sha, "source_tree": git_tree,
        "github_run_id": int(run_id) if run_id.isdigit() else None,
        "expected_values_changed": False, "scoring_rules_changed": False,
        "complete_case_equivalence": {"cases": 603, "changed_cases": len(complete_changes),
                                      "ignored": ["elapsed_ms"]},
        "reviewed_changes": review_gate,
        "reviewed_change_cases": material["changes"],
        "all_complete_case_outputs_calls_equal": not complete_changes,
        "actual_client_exports_equal": exports["equal"],
        "export_verification": {
            "cases": exports["cases"], "current_snapshot_download_passed": exports["exports"],
            "snapshot_blob_bytes_verified": True, "client_module_sha256": exports["client_module_sha256"],
            "unchanged_from_c8": exports["equal"], "changed_from_c8": exports["exports"] - exports["equal"],
            "offline_exports_passed": helper["passed"],
        },
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
    receipt_path = output / (CANDIDATE_PREFIX + "-benchmark-receipt.json")
    write_json(receipt_path, receipt)
    report_path = output / (CANDIDATE_PREFIX + "-frozen-audit.html")
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
        "status": ("FAIL" if blockers else "PASS_WITH_REVIEWED_CHANGES"
                   if review_gate["status"] == "ACCEPTED" else "PASS"),
        "candidate": CANDIDATE, "source_commit": git_sha, "source_tree": git_tree,
        "runtime_fingerprint": replay["source_tree_sha256"],
        "corpus": corpus_receipt, "canonical": comparison["counts"],
        "supplementary_retention": retention["counts"],
        "complete_output_call_changes": complete_changes,
        "reviewed_changes": review_gate,
        "review_material_changes": material["changes"],
        "score_count_deltas": {
            metric: {key: candidate_counts[metric].get(key, 0) - baseline_counts[metric].get(key, 0)
                     for key in sorted(set(candidate_counts[metric]) | set(baseline_counts[metric]))}
            for metric in ("canonical", "supplementary_retention")
        },
        "canonical_exact_losses": len(exact_losses),
        "supplementary_full_retention_losses": len(full_losses),
        "actual_client_exports": {"cases": exports["cases"], "exports": exports["exports"],
                                  "equal": exports["equal"], "errors": exports["errors"],
                                  "current_snapshot_download_passed": exports["exports"],
                                  "changed_from_c8": exports["exports"] - exports["equal"]},
        "offline_helper": {"passed": helper["passed"], "failures": helper["failures"],
                           "attempted_external_operations": helper["attempted_external_operations"]},
        "measurements": exports["measurements"],
        "artifacts": {name: {"file": path.name, "bytes": path.stat().st_size, "sha256": file_hash(path)}
                      for name, path in (("replay", replay_path), ("comparison", comparison_path),
                                         ("retention", retention_path), ("report", report_path),
                                         ("receipt", receipt_path), ("review_material", material_path),
                                         ("actual_exports", output / "actual-exports.json"))},
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
        "corpus", "artifacts", "measurements", "complete_output_call_changes", "reviewed_changes",
        "review_material_changes", "score_count_deltas", "blockers")}), flush=True)
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



        def _review_exports(self, old, current):
            rows, errors = [], []
            for case_id, row in current.items():
                first = stable_json_sha256(old[case_id]["output"])
                second = stable_json_sha256(row["output"])
                equal = first == second
                rows.append({"case_id": case_id, "file": "exports/" + case_id + ".json",
                             "bytes": 100, "sha256": second, "baseline_sha256": first,
                             "equal": equal, "synthetic_anchor_clicks": 1, "download_name": "review.json"})
                if not equal:
                    errors.append({"case_id": case_id, "kind": "export_changed"})
            return {"cases": 603, "exports": 603, "download_clicks": 603,
                    "client_module_sha256": CLIENT_EXPORT_SHA256,
                    "equal": 603 - len(errors), "errors": errors, "records": rows}

        def _review_fixture(self, corpus):
            old = {}
            expected = {}
            quote = "Regions: Minas Gerais, Brazil"
            for number in range(603):
                case_id = "case-" + str(number).zfill(4)
                source_url = "https://example.test/products/" + case_id
                old[case_id] = {"case_id": case_id, "roaster_id": "fixture-roaster",
                                "source_url": source_url, "elapsed_ms": 1,
                                "status": 200, "output": {"ok": True, "fields": {"name": case_id, "origin": "Brazil"},
                                                       "source_facts": [{"label": "Published text", "value": quote}]},
                                "calls": [{"url": source_url, "limit": 900000}],
                                "fixture_calls": ["user", "dic_preview_complete"]}
                expected[case_id] = {"case_id": case_id, "source_url": source_url,
                                     "roaster_id": "fixture-roaster",
                                     "canonical": {"origin": {"value": "Minas Gerais, Brazil",
                                                  "evidence": [{"capture_id": "page", "quote": quote}]}}}
            current = json.loads(json.dumps(old))
            case_id = "case-0000"
            current[case_id]["output"]["fields"]["origin"] = "Minas Gerais, Brazil"
            exports = self._review_exports(old, current)
            baseline_counts = {
                "canonical": {"cases": 603, "ok_response": 603, "canonical_assertions": 4002,
                              "exact_equivalent": 3024, "missing": 167, "review_required": 811,
                              "conflict_assertions": 115, "conflict_withheld": 65, "conflict_unresolved": 50,
                              "additional_facts": 6474, "additional_literal_present": 1526,
                              "additional_unconfirmed": 4948, "unexpected_fields": 19},
                "supplementary_retention": {"cases": 603, "additional_assertions": 6474,
                                           "all_evidence_retained": 5458, "some_evidence_retained": 337,
                                           "unconfirmed": 679, "truncated_previews": 3}}
            counts = json.loads(json.dumps(baseline_counts))
            counts["canonical"]["exact_equivalent"] += 1
            counts["canonical"]["review_required"] -= 1
            preserved = {"scripts/audit/coffee-corpus-replay.mjs": "a" * 64,
                         "scripts/audit/coffee-corpus-compare.mjs": "b" * 64,
                         "scripts/audit/coffee-corpus-normalize.mjs": "c" * 64,
                         "scripts/audit/coffee-corpus-retention.py": "d" * 64,
                         "site/cloud/coffee-url-autofill.js": CLIENT_EXPORT_SHA256}
            material = review_material(old, current, compare_complete_cases(old, current), exports,
                                       baseline_counts, counts, preserved, "e" * 64)
            folder = corpus / "cases" / case_id
            folder.mkdir(parents=True)
            capture = folder / "page.html"
            capture.write_text("<p>" + quote + "</p>", encoding="utf-8")
            original = {"case_id": case_id, "file": "page.html", "sha256": file_hash(capture),
                        "bytes": capture.stat().st_size, "status": 200}
            packet = {"id": case_id, "source_url": expected[case_id]["source_url"],
                      "roaster_id": expected[case_id]["roaster_id"],
                      "requests": [{**{key: original[key] for key in ("file", "bytes", "sha256", "status")},
                                    "label": "page", "url": expected[case_id]["source_url"],
                                    "final_url": expected[case_id]["source_url"]}]}
            packet_path = folder / "source-packet.json"
            write_json(packet_path, packet)
            index = {"captures": {(case_id, "page.html"): original},
                     "packets": {case_id: {"bytes": packet_path.stat().st_size, "sha256": file_hash(packet_path)}}}
            evidence = {"capture_id": "page", "capture_file": "page.html", "capture_sha256": original["sha256"],
                        "capture_source_url": expected[case_id]["source_url"], "quote": quote,
                        "quote_basis": "literal_capture"}
            bindings = ("candidate", "oracle_freeze_sha256", "packet_archive_attestation_sha256", "source_archive_sha256",
                        "recovery_archive_sha256", "baseline_runtime_fingerprint", "baseline_artifacts",
                        "candidate_runtime_fingerprint", "preserved_script_hashes", "stable_case_projection",
                        "baseline_stable_cases_sha256", "candidate_stable_cases_sha256")
            manifest = {"schema_version": 1, "type": REVIEWED_CHANGE_TYPE, "repository": REPOSITORY,
                        **{key: material[key] for key in bindings},
                        "expected_counts": counts,
                        "review": {"reviewer": "Independent public test fixture", "reviewed_at": "2020-01-02T00:00:00+00:00",
                                   "decision": "approve_exact_source_supported_changes", "independent_source_review": True},
                        "first_observed_run": {"run_id": 123, "run_attempt": 1, "source_commit": "a" * 40,
                                               "source_tree": "b" * 40,
                                               "workflow_path": ".github/workflows/coffee-frozen-corpus.yml",
                                               "completed_at": "2020-01-01T00:00:00+00:00",
                                               "conclusion": "FAILURE", "benchmark_status": "FAIL",
                                               "artifact": {"id": 456, "bytes": 100, "sha256": "f" * 64},
                                               "artifacts": {}},
                        "changes": [{**change, "decision": "source_supported_improvement",
                                     "rationale": "Original public capture directly supplies this missing locality.",
                                     "source_evidence": [evidence]} for change in material["changes"]]}
            names = {"replay": CANDIDATE_PREFIX + "-replay.json", "comparison": CANDIDATE_PREFIX + "-comparison.json",
                     "retention": CANDIDATE_PREFIX + "-retention.json", "exports": "actual-exports.json",
                     "review_material": "review-material.json", "summary": "summary.json",
                     "manifest": "artifact-manifest.json"}
            for key, name in names.items():
                manifest["first_observed_run"]["artifacts"][key] = {"file": name, "bytes": 100, "sha256": "a" * 64}
            raw = (json.dumps(material, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
            manifest["first_observed_run"]["artifacts"]["review_material"] = {
                "file": "review-material.json", "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}
            return manifest, material, expected, index, old, current, exports

        def test_reviewed_changes_accept_only_exact_source_supported_case_and_export(self):
            with tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary).resolve()
                manifest, material, expected, index, _old, _current, exports = self._review_fixture(root)
                result = verify_reviewed_changes(manifest, material, root, expected, index, "789")
                self.assertEqual(result["status"], "ACCEPTED")
                self.assertEqual(result["reviewed_cases"], 1)
                self.assertEqual(result["reviewed_export_changes"], 1)
                helper = {"passed": 603, "failures": [], "attempted_external_operations": []}
                self.assertEqual(benchmark_change_blockers(material, result, [], [], exports, helper), [])
                self.assertFalse(result["zero_loss_requirements_waived"])
                self.assertFalse(material["approval_manifest_generated"])
                self.assertEqual(material["status"], "UNREVIEWED")


        def test_reviewed_changes_reject_previous_candidate_artifact_names(self):
            self.assertEqual(CANDIDATE, 12)
            with tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary).resolve()
                manifest, material, expected, index, *_rest = self._review_fixture(root)
                self.assertEqual(material["candidate"], 12)
                for key in ("replay", "comparison", "retention"):
                    bad = json.loads(json.dumps(manifest))
                    bad["first_observed_run"]["artifacts"][key]["file"] = "candidate11-" + key + ".json"
                    with self.subTest(artifact=key), self.assertRaises(ValueError):
                        verify_reviewed_changes(bad, material, root, expected, index, "789")

        def test_reviewed_changes_missing_manifest_remains_strict(self):
            with tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary).resolve()
                _manifest, material, _expected, _index, old, _current, exports = self._review_fixture(root)
                helper = {"passed": 603, "failures": [], "attempted_external_operations": []}
                absent = {"status": "NOT_PROVIDED"}
                failures = benchmark_change_blockers(material, absent, [], [], exports, helper)
                self.assertTrue(any("output/call changes" in message for message in failures))
                self.assertTrue(any("Canonical counts" in message for message in failures))
                self.assertTrue(any("snapshot/download equality" in message for message in failures))
                unchanged_exports = self._review_exports(old, old)
                unchanged = review_material(old, old, [], unchanged_exports, material["baseline_counts"],
                                            material["baseline_counts"], material["preserved_script_hashes"],
                                            material["candidate_runtime_fingerprint"])
                self.assertEqual(benchmark_change_blockers(unchanged, absent, [], [], unchanged_exports, helper), [])

        def test_reviewed_manifest_path_pin_and_strict_json(self):
            with tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary).resolve()
                folder = root / "docs/audits"
                folder.mkdir(parents=True)
                path = folder / "review.json"
                path.write_text('{"public_fixture":true}', encoding="utf-8")
                pin = file_hash(path)
                document, info = read_reviewed_changes(root, Path("docs/audits/review.json"), pin)
                self.assertEqual(document, {"public_fixture": True})
                self.assertEqual(info["sha256"], pin)
                self.assertEqual(read_reviewed_changes(root, None, None), (None, None))
                for supplied, digest in ((None, pin), (Path("docs/audits/review.json"), None),
                                         (Path("docs/audits/review.json"), "0" * 64),
                                         (Path("docs/audits/review.json"), "1" * 64)):
                    with self.subTest(path=supplied, pin=digest), self.assertRaises(ValueError):
                        read_reviewed_changes(root, supplied, digest)
                outside = root / "outside.json"
                outside.write_text("{}", encoding="utf-8")
                with self.assertRaises(ValueError):
                    read_reviewed_changes(root, outside, file_hash(outside))
                linked = folder / "linked.json"
                linked.symlink_to(outside)
                with self.assertRaises(ValueError):
                    read_reviewed_changes(root, linked, file_hash(outside))
                for content in ('{"same":1,"same":2}', '{"bad":NaN}'):
                    path.write_text(content, encoding="utf-8")
                    with self.subTest(content=content), self.assertRaises(ValueError):
                        read_reviewed_changes(root, path, file_hash(path))

        def test_reviewed_changes_reject_stale_or_changed_source_and_scorer_bindings(self):
            with tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary).resolve()
                manifest, material, expected, index, *_rest = self._review_fixture(root)
                keys = ("oracle_freeze_sha256", "packet_archive_attestation_sha256", "source_archive_sha256",
                        "recovery_archive_sha256", "baseline_runtime_fingerprint", "candidate_runtime_fingerprint",
                        "baseline_stable_cases_sha256", "candidate_stable_cases_sha256")
                for key in keys:
                    bad = json.loads(json.dumps(manifest))
                    bad[key] = "f" * 64
                    with self.subTest(binding=key), self.assertRaises(ValueError):
                        verify_reviewed_changes(bad, material, root, expected, index, "789")
                for key in ("baseline_artifacts", "preserved_script_hashes"):
                    bad = json.loads(json.dumps(manifest))
                    bad[key][next(iter(bad[key]))] = "f" * 64
                    with self.subTest(binding=key), self.assertRaises(ValueError):
                        verify_reviewed_changes(bad, material, root, expected, index, "789")
                bad = json.loads(json.dumps(manifest))
                bad["stable_case_projection"]["ignored_case_properties"].append("calls")
                with self.assertRaises(ValueError):
                    verify_reviewed_changes(bad, material, root, expected, index, "789")

        def test_reviewed_changes_reject_missing_extra_duplicate_and_wildcard_approvals(self):
            with tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary).resolve()
                manifest, material, expected, index, *_rest = self._review_fixture(root)
                for mutation in ("empty", "duplicate", "extra", "wildcard", "extra_property"):
                    bad = json.loads(json.dumps(manifest))
                    if mutation == "empty":
                        bad["changes"] = []
                    elif mutation == "duplicate":
                        bad["changes"].append(json.loads(json.dumps(bad["changes"][0])))
                    elif mutation == "extra":
                        bad["changes"].append({**bad["changes"][0], "case_id": "case-0001"})
                    elif mutation == "wildcard":
                        bad["changes"][0]["case_id"] = "*"
                    else:
                        bad["allow_other_changes"] = True
                    with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                        verify_reviewed_changes(bad, material, root, expected, index, "789")

        def test_reviewed_changes_reject_different_whole_case_and_export_hashes(self):
            with tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary).resolve()
                manifest, material, expected, index, *_rest = self._review_fixture(root)
                for key in ("before_case_sha256", "after_case_sha256", "before_export_sha256", "after_export_sha256"):
                    bad = json.loads(json.dumps(manifest))
                    bad["changes"][0][key] = "f" * 64
                    with self.subTest(hash=key), self.assertRaises(ValueError):
                        verify_reviewed_changes(bad, material, root, expected, index, "789")
                for key in ("changed_case_keys", "changed_output_keys"):
                    bad = json.loads(json.dumps(manifest))
                    bad["changes"][0][key].append("unreviewed")
                    with self.subTest(descriptor=key), self.assertRaises(ValueError):
                        verify_reviewed_changes(bad, material, root, expected, index, "789")

        def test_reviewed_changes_reject_unexpected_facts_calls_and_extra_case_even_with_better_counts(self):
            with tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary).resolve()
                manifest, material, expected, index, old, current, _exports = self._review_fixture(root)
                for mutation in ("facts", "calls", "fixture_calls", "extra_case"):
                    after = json.loads(json.dumps(current))
                    if mutation == "facts":
                        after["case-0000"]["output"]["source_facts"].append({"value": "Unreviewed text"})
                    elif mutation == "calls":
                        after["case-0000"]["calls"][0]["limit"] = 2000000
                    elif mutation == "fixture_calls":
                        after["case-0000"]["fixture_calls"].append("unreviewed_endpoint")
                    else:
                        after["case-0001"]["fixture_calls"].reverse()
                    actual = review_material(old, after, compare_complete_cases(old, after),
                                             self._review_exports(old, after), material["baseline_counts"],
                                             material["candidate_counts"], material["preserved_script_hashes"],
                                             material["candidate_runtime_fingerprint"])
                    with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                        verify_reviewed_changes(manifest, actual, root, expected, index, "789")

        def test_reviewed_changes_require_exact_all_score_dictionaries(self):
            with tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary).resolve()
                manifest, material, expected, index, *_rest = self._review_fixture(root)
                for metric in ("canonical", "supplementary_retention"):
                    for mutation in ("value", "missing", "extra", "boolean"):
                        bad = json.loads(json.dumps(manifest))
                        if mutation == "value":
                            bad["expected_counts"][metric]["cases"] -= 1
                        elif mutation == "missing":
                            del bad["expected_counts"][metric]["cases"]
                        elif mutation == "extra":
                            bad["expected_counts"][metric]["unknown"] = 0
                        else:
                            bad["expected_counts"][metric]["cases"] = True
                        with self.subTest(metric=metric, mutation=mutation), self.assertRaises(ValueError):
                            verify_reviewed_changes(bad, material, root, expected, index, "789")

        def test_reviewed_changes_reject_missing_or_nonfailed_prior_run_provenance(self):
            with tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary).resolve()
                manifest, material, expected, index, *_rest = self._review_fixture(root)
                mutations = (
                    ("run_id", 789), ("run_id", True), ("run_attempt", 0), ("conclusion", "SUCCESS"),
                    ("benchmark_status", "PASS"), ("source_commit", "0" * 40),
                    ("workflow_path", ".github/workflows/other.yml"),
                    ("completed_at", "2020-01-03T00:00:00+00:00"))
                for key, value in mutations:
                    bad = json.loads(json.dumps(manifest))
                    bad["first_observed_run"][key] = value
                    with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                        verify_reviewed_changes(bad, material, root, expected, index, "789")
                for mutation in ("missing_artifact", "changed_material_hash", "changed_material_size", "not_independent"):
                    bad = json.loads(json.dumps(manifest))
                    if mutation == "missing_artifact":
                        del bad["first_observed_run"]["artifacts"]["exports"]
                    elif mutation == "changed_material_hash":
                        bad["first_observed_run"]["artifacts"]["review_material"]["sha256"] = "f" * 64
                    elif mutation == "changed_material_size":
                        bad["first_observed_run"]["artifacts"]["review_material"]["bytes"] += 1
                    else:
                        bad["review"]["independent_source_review"] = False
                    with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                        verify_reviewed_changes(bad, material, root, expected, index, "789")

        def test_reviewed_changes_require_original_literal_or_frozen_oracle_quotes(self):
            with tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary).resolve()
                manifest, material, expected, index, *_rest = self._review_fixture(root)
                evidence = manifest["changes"][0]["source_evidence"][0]
                oracle_evidence = {**evidence, "quote_basis": "frozen_oracle"}
                verify_reviewed_source_quote(root, expected, index, "case-0000", oracle_evidence)
                for key, value in (("capture_file", "../page.html"), ("capture_id", "wrong"),
                                   ("capture_sha256", "f" * 64), ("quote", "Absent source quotation"),
                                   ("capture_source_url", "https://other.test/product"),
                                   ("quote_basis", "new_current_web_page")):
                    with self.subTest(key=key), self.assertRaises(ValueError):
                        verify_reviewed_source_quote(root, expected, index, "case-0000", {**evidence, key: value})
                with self.assertRaises(ValueError):
                    verify_reviewed_source_quote(root, expected, index, "case-0000",
                                                 {**oracle_evidence, "quote": "Not in frozen oracle"})
                for evidence_list in ([], [evidence, evidence]):
                    bad = json.loads(json.dumps(manifest))
                    bad["changes"][0]["source_evidence"] = evidence_list
                    with self.subTest(quote_count=len(evidence_list)), self.assertRaises(ValueError):
                        verify_reviewed_changes(bad, material, root, expected, index, "789")

        def test_reviewed_source_quote_rejects_mutated_capture_packet_and_linked_directory(self):
            for mutation in ("capture", "packet", "linked_directory"):
                with tempfile.TemporaryDirectory() as temporary:
                    root = Path(temporary).resolve()
                    manifest, _material, expected, index, *_rest = self._review_fixture(root)
                    folder = root / "cases/case-0000"
                    if mutation == "capture":
                        (folder / "page.html").write_text("Mutated original source", encoding="utf-8")
                    elif mutation == "packet":
                        (folder / "source-packet.json").write_text("{}", encoding="utf-8")
                    else:
                        moved = root / "linked-source"
                        folder.rename(moved)
                        folder.symlink_to(moved, target_is_directory=True)
                    with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                        verify_reviewed_source_quote(root, expected, index, "case-0000",
                                                     manifest["changes"][0]["source_evidence"][0])

        def test_reviewed_changes_cannot_waive_losses_exports_or_offline_failures(self):
            with tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary).resolve()
                manifest, material, expected, index, _old, _current, exports = self._review_fixture(root)
                accepted = verify_reviewed_changes(manifest, material, root, expected, index, "789")
                helper = {"passed": 603, "failures": [], "attempted_external_operations": []}
                for exact, retained in (([{"case_id": "case-0000"}], []), ([], [{"case_id": "case-0000"}])):
                    self.assertTrue(benchmark_change_blockers(material, accepted, exact, retained, exports, helper))
                for patch in ({"exports": 602}, {"download_clicks": 602},
                              {"errors": [{"case_id": "case-0000", "kind": "export_failed"}]}):
                    self.assertTrue(benchmark_change_blockers(material, accepted, [], [], {**exports, **patch}, helper))
                for patch in ({"passed": 602}, {"failures": [{"case_id": "case-0000"}]},
                              {"attempted_external_operations": ["socket.connect"]}):
                    self.assertTrue(benchmark_change_blockers(material, accepted, [], [], exports, {**helper, **patch}))

        def test_actual_export_inventory_rejects_missing_duplicate_unknown_or_mismatched_downloads(self):
            with tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary).resolve()
                _manifest, _material, _expected, _index, _old, current, exports = self._review_fixture(root)
                for mutation in ("missing", "duplicate", "unknown", "clicks", "hash", "errors", "exporter"):
                    bad = json.loads(json.dumps(exports))
                    if mutation == "missing":
                        bad["records"].pop()
                    elif mutation == "duplicate":
                        bad["records"][-1] = bad["records"][0]
                    elif mutation == "unknown":
                        bad["records"][-1]["case_id"] = "unknown-case"
                    elif mutation == "clicks":
                        bad["records"][0]["synthetic_anchor_clicks"] = 2
                    elif mutation == "hash":
                        bad["records"][0]["sha256"] = bad["records"][0]["baseline_sha256"]
                    elif mutation == "errors":
                        bad["errors"].append({"case_id": "case-0001", "kind": "export_failed"})
                    else:
                        bad["client_module_sha256"] = "f" * 64
                    with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                        export_inventory(bad, current.keys())

        def test_stable_case_hash_ignores_only_elapsed_and_inventory_order(self):
            first = {"case_id": "one", "elapsed_ms": 1, "output": {"ok": True, "source_facts": ["original"]},
                     "calls": [1, 2], "fixture_calls": ["a", "b"]}
            changed = {**first, "elapsed_ms": 999}
            self.assertEqual(stable_case_sha256(first), stable_case_sha256(changed))
            for key in ("output", "calls", "fixture_calls", "unrecognized"):
                self.assertNotEqual(stable_case_sha256(first), stable_case_sha256({**first, key: ["new"]}))
            self.assertEqual(stable_case_inventory_sha256({"one": first, "two": changed}),
                             stable_case_inventory_sha256({"two": changed, "one": first}))
            self.assertNotEqual(stable_case_sha256({"value": True}), stable_case_sha256({"value": 1}))

        def test_count_dictionaries_are_recounted_from_all_scorer_records(self):
            comparison = {
                "records": [
                    {"ok": True, "canonical": [{"status": "exact_equivalent"}, {"status": "missing"}],
                     "ambiguities": [{"status": "withheld"}, {"status": "review_required"}],
                     "additional": [{"status": "literal_present"}, {"status": "unconfirmed"}],
                     "unexpected": [{"field": "origin"}, {"field": "producer"}]},
                    {"ok": False, "canonical": [{"status": "review_required"}],
                     "ambiguities": [], "additional": [], "unexpected": []}],
                "counts": {"cases": 2, "ok_response": 1, "canonical_assertions": 3, "exact_equivalent": 1,
                           "missing": 1, "review_required": 1, "conflict_assertions": 2, "conflict_withheld": 1,
                           "conflict_unresolved": 1, "additional_facts": 2, "additional_literal_present": 1,
                           "additional_unconfirmed": 1, "unexpected_fields": 2}}
            retention = {
                "records": [{"source_facts_truncated": True,
                             "checks": [{"status": "all_evidence_retained"}, {"status": "some_evidence_retained"},
                                        {"status": "unconfirmed"}]},
                            {"source_facts_truncated": False, "checks": []}],
                "counts": {"cases": 2, "additional_assertions": 3, "truncated_previews": 1,
                           "all_evidence_retained": 1, "some_evidence_retained": 1, "unconfirmed": 1}}
            result = derived_score_counts(comparison, retention)
            self.assertEqual(result, {"canonical": comparison["counts"], "supplementary_retention": retention["counts"]})
            changed = json.loads(json.dumps(comparison))
            changed["counts"]["exact_equivalent"] += 1
            with self.assertRaises(ValueError):
                derived_score_counts(changed, retention)
            changed = json.loads(json.dumps(retention))
            changed["records"][0]["checks"][0]["status"] = "auto_approved"
            with self.assertRaises(ValueError):
                derived_score_counts(comparison, changed)


        def _channel_fixture(self, payload_patch=None):
            Box, PrivateKey, _PublicKey = crypto_classes()
            sender = PrivateKey(bytes.fromhex(PUBLIC_INTEROP["sender_secret_key"]))
            receiver = PrivateKey(bytes.fromhex(PUBLIC_INTEROP["receiver_secret_key"]))
            context = {"repository": REPOSITORY, "pr_number": 116, "head_sha": "1" * 40,
                       "run_id": "12345", "run_attempt": "1",
                       "receiver_public_key": bytes(receiver.public_key).hex(),
                       "expires_unix": 4102444800}
            payload = {"schema_version": 1, "context": context,
                       "transfers": {"schema_version": 1,
                                     "source_archive": {"fixture": True},
                                     "recovery_archive": {"fixture": True}}}
            if payload_patch:
                payload.update(payload_patch)
            nonce = bytes.fromhex(PUBLIC_INTEROP["nonce"])
            ciphertext = Box(sender, receiver.public_key).encrypt(json_bytes(payload), nonce).ciphertext
            envelope = {"schema_version": 1, "algorithm": CHANNEL_ALGORITHM,
                        "context": context, "sender_public_key": bytes(sender.public_key).hex(),
                        "nonce": nonce.hex(), "ciphertext": ciphertext.hex()}
            return context, envelope, bytes(receiver), payload

        def test_channel_public_tweetnacl_pynacl_interoperability(self):
            self.assertTrue(verify_public_interop()["public_vector_pass"])

        def test_channel_valid_ciphertext_preserves_the_complete_manifest(self):
            context, envelope, receiver, payload = self._channel_fixture()
            actual = decrypt_envelope(envelope, context, receiver)
            self.assertTrue(typed_equal(actual, payload["transfers"]))
            body = "<!-- " + CHANNEL_MARKER + "\n" + json.dumps(envelope) + "\n-->"
            self.assertEqual(encrypted_marker(body), envelope)

        def test_channel_rejects_tampering_wrong_nonce_and_wrong_sender(self):
            context, envelope, receiver, _payload = self._channel_fixture()
            for key in ("ciphertext", "nonce", "sender_public_key"):
                altered = dict(envelope)
                raw = bytearray.fromhex(altered[key])
                raw[0] ^= 1
                altered[key] = raw.hex()
                with self.subTest(key=key), self.assertRaises(ValueError):
                    decrypt_envelope(altered, context, receiver)

        def test_channel_rejects_expiry_and_cross_context_replay(self):
            context, envelope, receiver, _payload = self._channel_fixture()
            with self.assertRaises(ValueError):
                decrypt_envelope(envelope, context, receiver, now=context["expires_unix"])
            changes = {"repository": "other/repository", "pr_number": 117,
                       "head_sha": "2" * 40, "run_id": "54321", "run_attempt": "2",
                       "receiver_public_key": "1" * 64, "expires_unix": 4102444900}
            for key, value in changes.items():
                altered = {**envelope, "context": {**context, key: value}}
                with self.subTest(key=key), self.assertRaises(ValueError):
                    decrypt_envelope(altered, context, receiver)

        def test_channel_rejects_inner_context_and_plaintext_fallback(self):
            context, envelope, receiver, _payload = self._channel_fixture(payload_patch={
                "context": {"head_sha": "different"}})
            with self.assertRaises(ValueError):
                decrypt_envelope(envelope, context, receiver)
            with self.assertRaises(ValueError):
                encrypted_marker("<!-- DIC_FROZEN_INPUT_TRANSFERS\n{}\n-->")
            with self.assertRaises(ValueError):
                encrypted_marker("<!-- " + CHANNEL_MARKER + "\nnot-json\n-->")
            self.assertIsNone(encrypted_marker("A clean pull request has no transfer material."))

        def test_channel_is_single_use_and_erases_key_after_failure(self):
            context, envelope, receiver, payload = self._channel_fixture()
            with tempfile.TemporaryDirectory() as temporary:
                work = Path(temporary)
                private = work / "channel-private"
                private.mkdir(mode=0o700)
                key = private / "receiver.key"
                write_private(key, receiver)
                self.assertEqual(stat.S_IMODE(key.stat().st_mode), 0o600)
                self.assertEqual(consume_envelope(work, envelope, context), payload["transfers"])
                self.assertFalse(key.exists())
                with self.assertRaises(ValueError):
                    consume_envelope(work, envelope, context)
            with tempfile.TemporaryDirectory() as temporary:
                work = Path(temporary)
                (work / "channel-private").mkdir(mode=0o700)
                key = work / "channel-private/receiver.key"
                write_private(key, receiver)
                bad = {**envelope, "ciphertext": "00" * (len(envelope["ciphertext"]) // 2)}
                with self.assertRaises(ValueError):
                    consume_envelope(work, bad, context)
                self.assertFalse(key.exists())

        def test_failure_diagnostics_omit_exception_values(self):
            with tempfile.TemporaryDirectory() as temporary:
                log = Path(temporary) / "failed.log"
                log.write_text('Traceback (most recent call last):\n'
                               '  File "/temporary/private/code.py", line 41, in run\n'
                               'ValueError: PRIVATE_CAPTURE_VALUE https://private.invalid/token\n'
                               '    at run (file:///temporary/actual-client-exports.mjs:8:3)\n'
                               'Error [ERR_MODULE_NOT_FOUND]: PRIVATE_CAPTURE_VALUE\n',
                               encoding="utf-8")
                result = failure_diagnostics(log)
                encoded = json.dumps(result)
                self.assertNotIn("PRIVATE_CAPTURE_VALUE", encoded)
                self.assertNotIn("private.invalid", encoded)
                self.assertNotIn("/temporary/", encoded)
                self.assertEqual(result["source_locations"],
                                 [{"source_file": "code.py", "line": 41},
                                  {"source_file": "actual-client-exports.mjs", "line": 8}])
                self.assertEqual(result["exception_types"],
                                 [{"type": "ValueError"},
                                  {"type": "Error", "code": "ERR_MODULE_NOT_FOUND"}])

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
    channel = commands.add_parser("prepare-channel", help="Prepare a private ephemeral receiver and public announcement")
    channel.add_argument("--work", type=Path, required=True)
    materialize = commands.add_parser("materialize", help="Decrypt and materialize the exact original prepared Library inputs")
    materialize.add_argument("--work", type=Path, required=True)
    benchmark = commands.add_parser("run", help="Run the original frozen corpus and retain sanitized evidence")
    benchmark.add_argument("--work", type=Path, required=True)
    benchmark.add_argument("--output", type=Path, required=True)
    benchmark.add_argument("--repo", type=Path, required=True)
    benchmark.add_argument("--expected-fingerprint", required=True)
    benchmark.add_argument("--reviewed-changes", type=Path,
                           help="Optional exact independently reviewed changes in checked-out docs/audits")
    benchmark.add_argument("--reviewed-changes-sha256",
                           help="Required explicit workflow SHA-256 pin when --reviewed-changes is present")
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
    output = ((args.work / "output").resolve()
              if args.command in ("materialize", "prepare-channel") else args.output.resolve())
    try:
        if args.command == "prepare-channel":
            prepare_channel(args.work.resolve())
        elif args.command == "materialize":
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
