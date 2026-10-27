#!/usr/bin/env python3
"""Review explicitly selected coffee images using installed, local OCR only.

The input is the application's coffee_source_review export, not a backup. This
tool never fetches its URLs, imports application code, changes coffee fields, or
uploads anything. OCR and the association between a selected image and a coffee
remain unverified. Requires Python 3, Pillow, Tesseract and POSIX resource limits.
"""
from __future__ import annotations

import argparse
import base64
import csv
from datetime import datetime, timezone
import hashlib
import html
import io
import json
import math
import os
from pathlib import Path
import re
import resource
import shutil
import signal
import stat
import subprocess
import sys
import tempfile
from urllib.parse import urlsplit
import warnings

from PIL import Image, ImageOps, __version__ as PILLOW_VERSION

LIMITS = {
    # The expanded public evidence allowance can exceed the former byte cap
    # through valid UTF-8 text and repeated source URLs alone. This remains
    # an explicit local-file limit; no URL is fetched by the helper.
    "source_json_bytes": 6_000_000,
    "images": 4,
    "image_bytes": 12_000_000,
    "image_pixels": 16_000_000,
    "image_side": 10_000,
    "ocr_pixels": 4_000_000,
    "ocr_side": 3_000,
    "ocr_seconds_per_image": 40,
    "ocr_cpu_seconds": 35,
    "ocr_memory_bytes": 768 * 1024 * 1024,
    "ocr_file_bytes": 4_000_000,
    "ocr_text_bytes": 100_000,
    "ocr_tsv_bytes": 1_000_000,
    "ocr_words": 5_000,
    "output_json_bytes": 8_000_000,
    "output_html_bytes": 12_000_000,
}
FIELDS = frozenset(("name", "roaster", "release_label", "origin", "roast_level",
                    "elevation_m", "process", "variety", "producer", "tasting_notes"))
SOURCE_KEYS = frozenset(("schema_version", "type", "source_url", "checked_at", "verification",
    "field_suggestions", "published_source_information", "roaster_details", "roaster_espresso_reference",
    "conflicts", "source_information_truncated", "roast_review_note", "limitations"))
FACT_STRINGS = {"label": 100, "value": 1600, "section": 100, "source_type": 30,
                "source_url": 3000, "source_path": 301, "source_locator": 200, "format": 10, "field": 71}
MAX_SOURCE_FACTS = 384
FORBIDDEN_KEYS = frozenset(("__proto__", "prototype", "constructor"))
TRUST_NOTICE = ("Unverified local OCR for human review. Selecting an image does not prove that it "
    "belongs to this coffee or its current release. Confidence scores measure OCR recognition, "
    "not factual correctness. No canonical fields were generated, applied, approved or saved.")


class ReviewError(ValueError):
    """An input or bounded-processing failure safe to report to the operator."""


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def local_path(value: str | Path) -> Path:
    raw = str(value)
    if (not raw or len(raw) > 4096 or re.search(r"[\x00-\x1f\x7f]", raw)
            or re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", raw) or raw.startswith("//")):
        raise ReviewError("Only explicit local file paths are accepted; URLs and device paths are not.")
    return Path(raw).expanduser().absolute()


def read_bounded_file(value: str | Path, maximum: int) -> tuple[Path, bytes]:
    path = local_path(value)
    flags = os.O_RDONLY | os.O_CLOEXEC | os.O_NONBLOCK | os.O_NOFOLLOW
    try:
        fd = os.open(path, flags)
        with os.fdopen(fd, "rb") as stream:
            info = os.fstat(stream.fileno())
            if not stat.S_ISREG(info.st_mode):
                raise ReviewError("Input must be a regular local file, not a link or device.")
            if info.st_size > maximum:
                raise ReviewError(f"Input exceeds its {maximum:,}-byte limit: {path.name}")
            data = stream.read(maximum + 1)
    except OSError as exc:
        raise ReviewError(f"Cannot read local file {path.name}: {exc.strerror}") from exc
    if len(data) > maximum:
        raise ReviewError(f"Input exceeds its {maximum:,}-byte limit: {path.name}")
    return path, data


def bounded_text(value, maximum: int, label: str, *, nonempty: bool = False) -> str:
    if (not isinstance(value, str) or len(value) > maximum
            or re.search(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", value)
            or re.search(r"[\ud800-\udfff]", value)
            or (nonempty and not value.strip())):
        raise ReviewError(f"Invalid or oversized {label}.")
    return value


def checked_object(value, keys, label):
    if not isinstance(value, dict) or set(value) - set(keys):
        raise ReviewError(f"Unexpected fields in {label}.")
    return value


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        bounded_text(key, 100, "JSON property", nonempty=True)
        if key in result or key in FORBIDDEN_KEYS:
            raise ReviewError("Duplicate or reserved JSON property.")
        result[key] = value
    return result


def source_reference(value):
    url = bounded_text(value, 3000, "source URL", nonempty=True)
    try:
        parsed = urlsplit(url)
        if (parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password
                or re.search(r"\s", url)):
            raise ValueError("invalid source URL")
        parsed.port
    except ValueError as exc:
        raise ReviewError("Source URL must be HTTPS without credentials; it will not be fetched.") from exc
    return url


def source_review(value: str | Path) -> tuple[dict, dict]:
    path, data = read_bounded_file(value, LIMITS["source_json_bytes"])
    try:
        source = json.loads(data.decode("utf-8"), object_pairs_hook=unique_object,
            parse_constant=lambda _: (_ for _ in ()).throw(ReviewError("Non-finite JSON number.")))
    except (UnicodeError, json.JSONDecodeError, RecursionError) as exc:
        raise ReviewError("Source Review must be bounded UTF-8 JSON.") from exc
    checked_object(source, SOURCE_KEYS, "source review")
    if (type(source.get("schema_version")) is not int or source["schema_version"] != 1
            or source.get("type") != "coffee_source_review"
            or source.get("verification") != "unverified_public_source_suggestions"):
        raise ReviewError("Use an original coffee_source_review schema 1 export, not a backup or approval.")
    source_reference(source.get("source_url"))
    for key, cap in (("checked_at", 100), ("limitations", 2000), ("roast_review_note", 2000)):
        if key in source:
            bounded_text(source[key], cap, key)
    fields = checked_object(source.get("field_suggestions"), FIELDS, "original field suggestions")
    for key, val in fields.items():
        bounded_text(val, 2000, key)
    facts = source.get("published_source_information")
    if not isinstance(facts, list) or len(facts) > MAX_SOURCE_FACTS:
        raise ReviewError(f"Source information must contain at most {MAX_SOURCE_FACTS} records.")
    for fact in facts:
        checked_object(fact, set(FACT_STRINGS) | {"part", "conflicting", "supporting_sources"}, "source information")
        for key, cap in FACT_STRINGS.items():
            if key in fact:
                bounded_text(fact[key], cap, f"source {key}")
        if not fact.get("label") or not fact.get("value"):
            raise ReviewError("Each source record needs a label and value.")
        if "source_url" in fact:
            source_reference(fact["source_url"])
        if "supporting_sources" in fact:
            sources = fact["supporting_sources"]
            if not isinstance(sources, list) or len(sources) > 3:
                raise ReviewError("At most three supporting sources may be recorded.")
            for item in sources:
                checked_object(item, {"source_url", "source_type"}, "supporting source")
                source_reference(item.get("source_url"))
                if item.get("source_type") not in ("html", "product_json", "image_text"):
                    raise ReviewError("Invalid supporting source type.")
        if "conflicting" in fact and type(fact["conflicting"]) is not bool:
            raise ReviewError("Invalid conflict marker.")
        if "part" in fact and (type(fact["part"]) is not int or not 0 <= fact["part"] < 128):
            raise ReviewError("Invalid source part number.")
    for key, cap, allow_number in (("roaster_details", 4000, False),
                                   ("roaster_espresso_reference", 500, True)):
        record = source.get(key)
        if not isinstance(record, dict) or len(record) > 40:
            raise ReviewError(f"Invalid {key}.")
        for name, val in record.items():
            if not re.fullmatch(r"[a-z_]{1,60}", name):
                raise ReviewError(f"Invalid {key} property.")
            if allow_number and type(val) in (int, float) and math.isfinite(val):
                continue
            bounded_text(val, cap, key)
    conflicts = source.get("conflicts")
    if (not isinstance(conflicts, list) or len(conflicts) > len(FIELDS)
            or any(not isinstance(x, str) or x not in FIELDS for x in conflicts)):
        raise ReviewError("Invalid source conflicts.")
    if type(source.get("source_information_truncated")) is not bool:
        raise ReviewError("Invalid source truncation marker.")
    receipt = {"filename": path.name, "sha256": sha256(data), "bytes": len(data),
               "source_url_fetched": False}
    return source, receipt


def prepared_image(value: str | Path) -> dict:
    path, data = read_bounded_file(value, LIMITS["image_bytes"])
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data)) as raw:
                format_name = raw.format
                width, height = raw.size
                if format_name not in {"PNG", "JPEG", "WEBP"}:
                    raise ReviewError("Only PNG, JPEG and single-frame WebP images are accepted.")
                if (min(width, height) < 8 or max(width, height) > LIMITS["image_side"]
                        or width * height > LIMITS["image_pixels"]):
                    raise ReviewError("Image exceeds dimension/pixel limits or is too small.")
                if getattr(raw, "n_frames", 1) != 1:
                    raise ReviewError("Animated or multi-frame images are not accepted.")
                raw.verify()
            with Image.open(io.BytesIO(data)) as raw:
                raw.load()
                upright = ImageOps.exif_transpose(raw)
                rgba = upright.convert("RGBA")
                flat = Image.alpha_composite(Image.new("RGBA", rgba.size, "white"), rgba).convert("RGB")
                ratio = min(1.0, LIMITS["ocr_side"] / max(flat.size),
                            math.sqrt(LIMITS["ocr_pixels"] / (flat.width * flat.height)))
                if ratio < 1:
                    flat = flat.resize((max(1, int(flat.width * ratio)), max(1, int(flat.height * ratio))),
                                       Image.Resampling.LANCZOS)
                png = io.BytesIO()
                flat.save(png, format="PNG", optimize=False)
                thumbnail = flat.copy()
                thumbnail.thumbnail((1000, 1000))
                jpeg = io.BytesIO()
                thumbnail.save(jpeg, format="JPEG", quality=82)
                dimensions = list(flat.size)
    except ReviewError:
        raise
    except (OSError, ValueError, SyntaxError, Image.DecompressionBombError,
            Image.DecompressionBombWarning) as exc:
        raise ReviewError(f"Invalid or unsafe image: {path.name}") from exc
    png_bytes, preview_bytes = png.getvalue(), jpeg.getvalue()
    if len(png_bytes) > 16_000_000 or len(preview_bytes) > 1_000_000:
        raise ReviewError("Prepared image exceeds its output limit.")
    return {"receipt": {"filename": path.name, "sha256": sha256(data), "bytes": len(data),
            "format": format_name, "original_dimensions": [width, height],
            "ocr_dimensions": dimensions, "ocr_input_sha256": sha256(png_bytes),
            "preprocessing": "EXIF orientation; transparent pixels on white; RGB; bounded downsample; metadata removed",
            "image_to_source_association": "user_selected_only_not_verified",
            "current_release_verified": False}, "png": png_bytes, "preview": preview_bytes}


def child_limits():
    resource.setrlimit(resource.RLIMIT_AS, (LIMITS["ocr_memory_bytes"], LIMITS["ocr_memory_bytes"]))
    resource.setrlimit(resource.RLIMIT_CPU, (LIMITS["ocr_cpu_seconds"], LIMITS["ocr_cpu_seconds"] + 1))
    resource.setrlimit(resource.RLIMIT_FSIZE, (LIMITS["ocr_file_bytes"], LIMITS["ocr_file_bytes"]))
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))


def local_process(args: list[str], directory: Path, timeout: int) -> bytes:
    # Discard inherited proxy/config/model-path settings. No shell, URL input,
    # download command or user-provided executable/configuration is accepted.
    env = {"PATH": os.defpath, "HOME": str(directory), "LANG": "C.UTF-8",
           "LC_ALL": "C.UTF-8", "OMP_THREAD_LIMIT": "1"}
    output = directory / "process.stdout"
    errors = directory / "process.stderr"
    with output.open("wb") as stdout, errors.open("wb") as stderr:
        process = subprocess.Popen(args, cwd=directory, env=env, stdin=subprocess.DEVNULL,
            stdout=stdout, stderr=stderr, start_new_session=True, preexec_fn=child_limits)
        try:
            process.wait(timeout=timeout)
        except subprocess.TimeoutExpired as exc:
            os.killpg(process.pid, signal.SIGKILL)
            process.wait()
            raise ReviewError("Local OCR timed out; no text from this image was accepted.") from exc
    if process.returncode:
        raise ReviewError("Local Tesseract failed or exceeded a resource limit.")
    return read_bounded_file(output, LIMITS["ocr_file_bytes"])[1]


def local_engine(directory: Path, language: str) -> dict:
    if not re.fullmatch(r"[a-z]{3}(?:_[a-z]{2,8})?(?:\+[a-z]{3}(?:_[a-z]{2,8})?)?", language):
        raise ReviewError("Choose one or two installed Tesseract language codes.")
    binary = shutil.which("tesseract")
    if not binary:
        raise ReviewError("Tesseract is not installed. This helper never installs or downloads software.")
    # Resolve the installed executable, then invoke that exact local file.
    executable = Path(binary).resolve(strict=True)
    executable_bytes = read_bounded_file(executable, 64_000_000)[1]
    version = local_process([str(executable), "--version"], directory, 5).decode("utf-8", "replace")
    listing = local_process([str(executable), "--list-langs"], directory, 5).decode("utf-8", "replace")
    installed = set(listing.splitlines()[1:])
    requested = language.split("+")
    if any(code not in installed or code == "osd" for code in requested):
        raise ReviewError("Requested text language is not installed. No download was attempted.")
    models = []
    match = re.search(r'List of available languages in "([^"]+)"', listing)
    for code in requested:
        record = {"language": code}
        if match:
            model_path = (local_path(match[1]) / f"{code}.traineddata").resolve(strict=True)
            _, model = read_bounded_file(model_path, 64_000_000)
            record.update(sha256=sha256(model), bytes=len(model))
        models.append(record)
    return {"executable": str(executable), "receipt": {"name": "tesseract",
        "version": bounded_text(version.splitlines()[0], 200, "Tesseract version"),
        "executable_sha256": sha256(executable_bytes), "languages": models,
        "pillow_version": PILLOW_VERSION}}


def parse_words(tsv: str, width: int, height: int) -> list[dict]:
    reader = csv.DictReader(io.StringIO(tsv), delimiter="\t", quoting=csv.QUOTE_NONE)
    expected = ["level", "page_num", "block_num", "par_num", "line_num", "word_num",
                "left", "top", "width", "height", "conf", "text"]
    if reader.fieldnames != expected:
        raise ReviewError("Unexpected local OCR word format.")
    words = []
    for row in reader:
        if row.get("level") != "5" or not row.get("text", "").strip():
            continue
        if None in row or len(words) >= LIMITS["ocr_words"]:
            raise ReviewError("OCR word count/format limit exceeded.")
        text = bounded_text(row["text"], 1000, "OCR word")
        try:
            left, top, box_width, box_height = (int(row[key]) for key in ("left", "top", "width", "height"))
            confidence = float(row["conf"])
            line = [int(row[key]) for key in ("block_num", "par_num", "line_num")]
        except (TypeError, ValueError) as exc:
            raise ReviewError("Invalid OCR word coordinates/confidence.") from exc
        if (not math.isfinite(confidence) or not -1 <= confidence <= 100
                or min(left, top, box_width, box_height, *line) < 0
                or left + box_width > width or top + box_height > height):
            raise ReviewError("Out-of-range OCR word coordinates/confidence.")
        words.append({"text": text, "confidence": confidence if confidence >= 0 else None,
                      "box": [left, top, box_width, box_height], "line": line})
    return words


def run_tesseract(prepared: dict, engine: dict, directory: Path, language: str, psm: int) -> dict:
    input_file = directory / "input.png"
    input_file.write_bytes(prepared["png"])
    output_base = directory / "recognition"
    local_process([engine["executable"], str(input_file), str(output_base), "-l", language,
                   "--psm", str(psm), "txt", "tsv"], directory, LIMITS["ocr_seconds_per_image"])
    raw_text = read_bounded_file(directory / "recognition.txt", LIMITS["ocr_text_bytes"])[1]
    raw_tsv = read_bounded_file(directory / "recognition.tsv", LIMITS["ocr_tsv_bytes"])[1]
    try:
        text, tsv = raw_text.decode("utf-8"), raw_tsv.decode("utf-8")
    except UnicodeError as exc:
        raise ReviewError("OCR returned invalid UTF-8.") from exc
    # Form-feed is a normal Tesseract page separator, preserved in raw output.
    bounded_text(text.replace("\f", "\n"), LIMITS["ocr_text_bytes"], "OCR text")
    words = parse_words(tsv, *prepared["receipt"]["ocr_dimensions"])
    scores = [word["confidence"] for word in words if word["confidence"] is not None]
    return {"status": "ocr_completed" if words else "no_text_detected", "raw_text": text,
            "raw_text_sha256": sha256(raw_text), "raw_tsv_sha256": sha256(raw_tsv),
            "word_count": len(words), "mean_word_confidence": round(sum(scores) / len(scores), 2) if scores else None,
            "low_confidence_word_count": sum(score < 60 for score in scores),
            "words": words, "human_review_required": True, "_raw_tsv": raw_tsv, "_raw_text": raw_text}


def review_html(record: dict, previews: list[bytes]) -> str:
    escape = lambda value: html.escape(str(value), quote=True)
    source = record["original_source_review"]
    sections = []
    for image, preview in zip(record["images"], previews):
        ocr = image["ocr"]
        words = "".join(f"<tr><td>{escape(word['text'])}</td><td>{escape(word['confidence'])}</td>"
                        f"<td>{escape(word['box'])}</td></tr>" for word in ocr.get("words", []))
        sections.append(f"<section><h2>Image {image['number']}: {escape(image['filename'])}</h2>"
            f"<p>Association with this coffee and its current release: <strong>unverified</strong>.</p>"
            f"<p>Original SHA-256: <code>{escape(image['sha256'])}</code></p>"
            f"<img src='data:image/jpeg;base64,{base64.b64encode(preview).decode('ascii')}' "
            f"alt='Locally selected image {image['number']}; inspect the original alongside the OCR transcript'>"
            f"<h3>OCR transcript — requires review</h3><p>Status: {escape(ocr['status'])}. "
            f"Words: {ocr.get('word_count', 0)}. Mean recognition confidence: {escape(ocr.get('mean_word_confidence'))}.</p>"
            f"<pre>{escape(ocr.get('raw_text', ocr.get('error', '')))}</pre>"
            f"<details><summary>Word recognition confidences and boxes</summary><table><thead><tr>"
            f"<th>Word</th><th>Confidence, 0–100</th><th>Box [x, y, width, height]</th></tr></thead>"
            f"<tbody>{words}</tbody></table></details></section>")
    original_fields = "".join(f"<dt>{escape(key)}</dt><dd>{escape(value)}</dd>"
                              for key, value in source["field_suggestions"].items())
    return ("<!doctype html><html lang='en'><meta charset='utf-8'>"
        "<meta name='viewport' content='width=device-width, initial-scale=1'>"
        "<meta name='referrer' content='no-referrer'>"
        "<meta http-equiv='Content-Security-Policy' content=\"default-src 'none'; img-src data:; "
        "style-src 'unsafe-inline'; script-src 'none'; connect-src 'none'; base-uri 'none'; form-action 'none'\">"
        "<title>Local coffee source review</title><style>body{font:17px/1.5 system-ui;margin:2rem auto;"
        "max-width:80rem;padding:0 1rem;color:#17231e;background:#fff}section{border-top:2px solid #aaa;"
        "margin-top:2rem;padding-top:1rem}img{max-width:100%;max-height:50rem}pre,code{white-space:pre-wrap;"
        "overflow-wrap:anywhere}pre{background:#f2f4f3;padding:1rem}dt{font-weight:bold}dd{margin-bottom:.6rem}"
        "td,th{text-align:left;border-bottom:1px solid #bbb;padding:.5rem}summary{cursor:pointer}"
        "p{overflow-wrap:anywhere}</style><h1>Local coffee source review</h1>"
        f"<p><strong>{escape(TRUST_NOTICE)}</strong></p><p>Source URL (not fetched): "
        f"{escape(source['source_url'])}</p><p>Original export SHA-256: "
        f"<code>{escape(record['source_export']['sha256'])}</code></p>"
        "<h2>Original exported suggestions</h2><p>These are unchanged from the input file, not OCR-derived.</p>"
        f"<dl>{original_fields}</dl><p>Original conflicts: {escape(', '.join(source['conflicts']) or 'none recorded')}</p>"
        + "".join(sections) + "<h2>Review checklist</h2><ol><li>Confirm each image actually shows this "
        "coffee and release.</li><li>Compare the transcript with the visible label, including accents, "
        "numbers, ranges and units.</li><li>Resolve contradictions with the current roaster page or bag. "
        "Leave uncertain details blank.</li><li>Enter reviewed facts manually in the app if appropriate.</li></ol>"
        "<details><summary>Original source export — complete validated input</summary><pre>"
        + escape(json.dumps(source, ensure_ascii=False, indent=2))
        + "</pre></details><p>This self-contained report contains selected image previews and source information. "
        "It makes no network requests or application changes. Share it only intentionally.</p></html>")


def write_exclusive(path: Path, data: bytes):
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, "wb") as stream:
        stream.write(data)


def create_review(source_path, image_paths, output_path, *, language="eng", psm=11) -> dict:
    if os.name != "posix":
        raise ReviewError("This bounded helper requires POSIX resource limits (Linux, macOS or WSL).")
    if not 1 <= len(image_paths) <= LIMITS["images"]:
        raise ReviewError("Select between one and four explicit local images.")
    if psm not in (6, 11):
        raise ReviewError("Only page segmentation 6 (text block) or 11 (sparse label) is supported.")
    destination = local_path(output_path)
    if destination.exists() or destination.is_symlink() or not destination.parent.is_dir():
        raise ReviewError("Output must be a new directory within an existing local directory; nothing is overwritten.")
    source, source_receipt = source_review(source_path)
    prepared = [prepared_image(image) for image in image_paths]
    if len({image["receipt"]["sha256"] for image in prepared}) != len(prepared):
        raise ReviewError("Duplicate image bytes were selected; supply distinct images.")
    record = {"schema_version": 1, "type": "coffee_local_image_review",
        "created_at": datetime.now(timezone.utc).isoformat(), "verification": "unverified_local_image_ocr",
        "notice": TRUST_NOTICE, "network_requests_made_by_helper": False,
        "canonical_fields_generated": False, "application_writes": False,
        "source_export": source_receipt, "original_source_review": source, "limits": LIMITS,
        "images": [], "review": {"status": "pending_human_review", "image_identity_verified": False}}
    artifacts = {}
    with tempfile.TemporaryDirectory(prefix="coffee-local-review-") as temp:
        working = Path(temp)
        engine = local_engine(working, language)
        record["engine"] = {**engine["receipt"], "language": language, "page_segmentation_mode": psm}
        for number, image in enumerate(prepared, 1):
            folder = working / f"image-{number:02d}"
            folder.mkdir(mode=0o700)
            try:
                ocr = run_tesseract(image, engine, folder, language, psm)
            except ReviewError as exc:
                ocr = {"status": "unreviewed_processing_failed", "error": str(exc), "human_review_required": True}
            stem = f"image-{number:02d}"
            for internal, suffix in (("_raw_text", ".ocr.txt"), ("_raw_tsv", ".ocr.tsv")):
                if internal in ocr:
                    artifacts[stem + suffix] = ocr.pop(internal)
            artifacts[stem + ".ocr.png"] = image["png"]
            row = {"number": number, **image["receipt"], "ocr_input_file": stem + ".ocr.png", "ocr": ocr}
            record["images"].append(row)
    json_bytes = (json.dumps(record, ensure_ascii=False, allow_nan=False, indent=2) + "\n").encode("utf-8")
    html_bytes = review_html(record, [image["preview"] for image in prepared]).encode("utf-8")
    if len(json_bytes) > LIMITS["output_json_bytes"] or len(html_bytes) > LIMITS["output_html_bytes"]:
        raise ReviewError("Combined review exceeds its output limits; select fewer/smaller images.")
    artifacts["review.json"], artifacts["review.html"] = json_bytes, html_bytes
    destination.mkdir(mode=0o700, exist_ok=False)
    for name, data in artifacts.items():
        write_exclusive(destination / name, data)
    return record


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--review", required=True, help="Local coffee_source_review JSON downloaded from the app")
    parser.add_argument("--image", action="append", required=True, help="Explicit local PNG/JPEG/WebP; repeat up to four times")
    parser.add_argument("--output", required=True, help="New local output directory; never overwrite an existing directory")
    parser.add_argument("--language", default="eng", help="One/two already installed language codes; no downloads")
    parser.add_argument("--psm", type=int, choices=(6, 11), default=11, help="11 for sparse labels (default), 6 for a text block")
    args = parser.parse_args(argv)
    try:
        result = create_review(args.review, args.image, args.output, language=args.language, psm=args.psm)
    except (ReviewError, OSError) as exc:
        print(f"Local review stopped: {exc}", file=sys.stderr)
        return 2
    statuses = [image["ocr"]["status"] for image in result["images"]]
    print(json.dumps({"output": str(local_path(args.output)), "images": len(statuses), "statuses": statuses,
                      "human_review_required": True, "application_writes": False}))
    return 0 if all(status in {"ocr_completed", "no_text_detected"} for status in statuses) else 1


if __name__ == "__main__":
    raise SystemExit(main())
