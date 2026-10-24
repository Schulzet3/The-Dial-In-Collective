"""Local-only limits, provenance and trust tests; no app/provider operations."""
import hashlib
import importlib.util
from html.parser import HTMLParser
import io
import json
import os
from pathlib import Path
import shutil
import socket
import sys
import tempfile
import time
import unittest
from unittest import mock

from PIL import Image, ImageDraw, ImageFont

MODULE = Path(__file__).resolve().parents[1] / "scripts/audit/coffee-source-review-local.py"
spec = importlib.util.spec_from_file_location("coffee_source_review_local", MODULE)
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)


def source_fixture(**changes):
    return {"schema_version": 1, "type": "coffee_source_review",
        "source_url": "https://no-network.invalid/products/current-coffee",
        "checked_at": "2026-10-24T00:00:00.000Z", "verification": "unverified_public_source_suggestions",
        "field_suggestions": {"name": "Current Coffee", "roaster": "Example Roaster"},
        "published_source_information": [{"label": "Variety", "value": "Bourbon Ají"}],
        "roaster_details": {}, "roaster_espresso_reference": {}, "conflicts": ["variety"],
        "source_information_truncated": False, "limitations": "Review the original source.", **changes}


class Tags(HTMLParser):
    def __init__(self, markup):
        super().__init__()
        self.tags = []
        self.feed(markup)

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))


class LocalReviewTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="local-coffee-review-test-")
        self.root = Path(self.temp.name)
        self.source = self.root / "source.json"
        self.source.write_text(json.dumps(source_fixture()), encoding="utf-8")
        self.image = self.root / "label.png"
        image = Image.new("RGB", (900, 250), "white")
        font = ImageFont.truetype("DejaVuSans.ttf", 44)
        ImageDraw.Draw(image).multiline_text((30, 25), "VARIETY BOURBON AJI\nROAST LIGHT", fill="black", font=font, spacing=25)
        image.save(self.image)

    def tearDown(self):
        self.temp.cleanup()

    def test_original_export_identity_and_conflict_are_preserved_without_approval(self):
        source, receipt = helper.source_review(self.source)
        self.assertEqual(source, source_fixture())
        self.assertEqual(receipt["sha256"], hashlib.sha256(self.source.read_bytes()).hexdigest())
        self.assertFalse(receipt["source_url_fetched"])
        self.assertEqual(source["conflicts"], ["variety"])

    def test_expanded_public_evidence_keeps_the_last_record_and_source_identity(self):
        facts = [{"label": f"Published fact {i}", "value": f"Source value {i}",
                  "source_url": "https://no-network.invalid/products/current-coffee",
                  "source_type": "html"} for i in range(384)]
        expected = source_fixture(published_source_information=facts)
        self.source.write_text(json.dumps(expected), encoding="utf-8")
        actual, receipt = helper.source_review(self.source)
        self.assertEqual(actual, expected)
        self.assertEqual(actual["published_source_information"][-1]["value"], "Source value 383")
        self.assertFalse(receipt["source_url_fetched"])
        self.assertEqual(actual["verification"], "unverified_public_source_suggestions")

    def test_expanded_multibyte_source_review_round_trips_without_fetching_urls(self):
        facts = [{"label": f"Published fact {i}", "value": "咖啡" * 795,
                  "source_url": "https://no-network.invalid/products/current-coffee",
                  "source_type": "html"} for i in range(118)]
        expected = source_fixture(published_source_information=facts)
        self.source.write_text(json.dumps(expected, ensure_ascii=False), encoding="utf-8")
        self.assertGreater(self.source.stat().st_size, 512_000)
        actual, receipt = helper.source_review(self.source)
        self.assertEqual(actual, expected)
        self.assertFalse(receipt["source_url_fetched"])

    def test_inline_json_locator_and_projection_remain_unverified_source_evidence(self):
        facts = [{"label": "Purchase variant public fields", "value": '{"variation_id":1,"display_price":0}',
            "source_url": "https://no-network.invalid/products/current-coffee", "source_path": "/0",
            "source_locator": 'form[data-product_variations][data-product_id="123"]',
            "format": "projection", "part": 0}]
        self.source.write_text(json.dumps(source_fixture(published_source_information=facts)), encoding="utf-8")
        source, receipt = helper.source_review(self.source)
        self.assertEqual(source["published_source_information"], facts)
        self.assertFalse(receipt["source_url_fetched"])
        self.assertEqual(source["verification"], "unverified_public_source_suggestions")

    def test_wrong_schema_trusted_claims_and_private_backup_are_rejected(self):
        for change in ({"type": "the-dial-in-collective-prototype-backup"}, {"schema_version": True},
                       {"verification": "approved"}, {"approved": True}, {"session": "secret"}):
            with self.subTest(change=change):
                self.source.write_text(json.dumps(source_fixture(**change)), encoding="utf-8")
                with self.assertRaises(helper.ReviewError):
                    helper.source_review(self.source)

    def test_grouped_reference_strings_remain_exact_unverified_evidence_without_network(self):
        facts = [{"label": "Repeated purchase plans", "value": json.dumps({
            "source_path": "/variants/0/plans", "destinations": ["/variants/1/plans", "/variants/2/plans"]}),
            "source_url": "https://no-network.invalid/products/current-coffee", "source_path": "/variants/1/plans",
            "source_type": "product_json", "format": "reference", "part": 0}]
        self.source.write_text(json.dumps(source_fixture(published_source_information=facts)), encoding="utf-8")
        with mock.patch.object(socket, "socket", side_effect=AssertionError("No network allowed")):
            source, receipt = helper.source_review(self.source)
        self.assertEqual(source["published_source_information"], facts)
        self.assertFalse(receipt["source_url_fetched"])
        self.assertEqual(source["verification"], "unverified_public_source_suggestions")

    def test_supporting_public_sources_are_preserved_without_fetching(self):
        fact = {"label": "Description", "value": "Selected public coffee information.",
            "supporting_sources": [{"source_url": "https://no-network.invalid/p.js", "source_type": "product_json"}]}
        self.source.write_text(json.dumps(source_fixture(published_source_information=[fact])), encoding="utf-8")
        source, receipt = helper.source_review(self.source)
        self.assertEqual(source["published_source_information"], [fact])
        self.assertFalse(receipt["source_url_fetched"])
        for invalid in ([{"source_url": "https://user:secret@example.com/", "source_type": "html"}],
                        [{"source_url": "https://example.com/", "source_type": "html", "private": "secret"}],
                        [{"source_url": "https://example.com/", "source_type": "unknown"}],
                        [{"source_url": "https://example.com/", "source_type": "html"}] * 4):
            with self.subTest(invalid=invalid):
                self.source.write_text(json.dumps(source_fixture(published_source_information=[{**fact, "supporting_sources": invalid}])), encoding="utf-8")
                with self.assertRaises(helper.ReviewError):
                    helper.source_review(self.source)

    def test_duplicate_reserved_nonfinite_and_oversized_json_are_rejected(self):
        examples = ['{"type":"coffee_source_review","type":"other"}',
                    '{"nested":{"__proto__":{}}}', '{"number":NaN}', "[" * 2000 + "]" * 2000]
        for text in examples:
            self.source.write_text(text, encoding="utf-8")
            with self.assertRaises(helper.ReviewError):
                helper.source_review(self.source)
        self.source.write_bytes(b" " * 200)
        with mock.patch.dict(helper.LIMITS, source_json_bytes=100):
            with self.assertRaises(helper.ReviewError):
                helper.source_review(self.source)

    def test_export_chunk_boundary_surrogates_fail_with_review_error(self):
        # Captured from the actual app exporter before its UTF-16 chunk-boundary
        # repair: an emoji was divided between two source-information records.
        fixture = MODULE.parents[2] / "tests/fixtures/coffee-source-review-split-surrogate.json"
        with self.assertRaisesRegex(helper.ReviewError, "Invalid or oversized source value"):
            helper.source_review(fixture)
        for value in ("\ud83c", "\udf53"):
            with self.subTest(value=repr(value)):
                self.source.write_text(json.dumps(source_fixture(
                    published_source_information=[{"label": "Notes", "value": value}])), encoding="utf-8")
                with self.assertRaises(helper.ReviewError):
                    helper.source_review(self.source)
        self.source.write_text('{"\\ud83c":"invalid key"}', encoding="utf-8")
        with self.assertRaisesRegex(helper.ReviewError, "JSON property"):
            helper.source_review(self.source)

    def test_complete_unicode_code_points_remain_unchanged(self):
        value = "x" * 1598 + "🍓"
        self.source.write_text(json.dumps(source_fixture(
            published_source_information=[{"label": "Notes", "value": value}])), encoding="utf-8")
        source, _ = helper.source_review(self.source)
        self.assertEqual(source["published_source_information"][0]["value"], value)
        source["published_source_information"][0]["value"].encode("utf-8")

    def test_source_urls_are_reference_only_and_cannot_contain_credentials(self):
        for url in ("http://example.com/product", "file:///tmp/image", "https://user:pass@example.com/p",
                    "https://example.com:bad/p", "https://example.com/a\nb"):
            self.source.write_text(json.dumps(source_fixture(source_url=url)), encoding="utf-8")
            with self.assertRaises(helper.ReviewError):
                helper.source_review(self.source)

    def test_source_values_and_record_counts_have_independent_limits(self):
        for changes in ({"field_suggestions": {"name": "a" * 2001}},
                        {"published_source_information": [{"label": "Origin", "value": "a" * 1601}]},
                        {"published_source_information": [{"label": "Origin", "value": "Colombia"}] * 385},
                        {"roaster_espresso_reference": {"dose_g": float("inf")}}):
            with self.subTest(changes=list(changes)):
                self.source.write_text(json.dumps(source_fixture(**changes)), encoding="utf-8")
                with self.assertRaises(helper.ReviewError):
                    helper.source_review(self.source)

    def test_only_bounded_regular_local_files_are_read(self):
        for path in ("https://example.com/image.png", "file:///tmp/image.png", "//host/share/image.png", "bad\x00file"):
            with self.assertRaises(helper.ReviewError):
                helper.read_bounded_file(path, 100)
        link = self.root / "link.png"
        link.symlink_to(self.image)
        with self.assertRaises(helper.ReviewError):
            helper.read_bounded_file(link, 10_000_000)
        fifo = self.root / "pipe"
        os.mkfifo(fifo)
        with self.assertRaises(helper.ReviewError):
            helper.read_bounded_file(fifo, 100)

    def test_image_format_bytes_pixels_and_animation_are_bounded(self):
        with mock.patch.dict(helper.LIMITS, image_bytes=20):
            with self.assertRaises(helper.ReviewError):
                helper.prepared_image(self.image)
        with mock.patch.dict(helper.LIMITS, image_pixels=100):
            with self.assertRaises(helper.ReviewError):
                helper.prepared_image(self.image)
        fake = self.root / "not-really.png"
        fake.write_text('<svg><image href="https://example.com/track"/></svg>', encoding="utf-8")
        with self.assertRaises(helper.ReviewError):
            helper.prepared_image(fake)
        animated = self.root / "animated.webp"
        Image.new("RGB", (20, 20), "white").save(animated, save_all=True,
            append_images=[Image.new("RGB", (20, 20), "black")], duration=100, loop=0)
        with self.assertRaises(helper.ReviewError):
            helper.prepared_image(animated)

    def test_normalized_pixels_and_alpha_are_auditable_without_metadata(self):
        rgba = Image.new("RGBA", (60, 40), (0, 0, 0, 0))
        rgba.putpixel((0, 0), (0, 0, 0, 255))
        rgba.save(self.image)
        output = helper.prepared_image(self.image)
        self.assertEqual(output["receipt"]["sha256"], hashlib.sha256(self.image.read_bytes()).hexdigest())
        self.assertEqual(output["receipt"]["ocr_input_sha256"], hashlib.sha256(output["png"]).hexdigest())
        self.assertFalse(output["receipt"]["current_release_verified"])
        with Image.open(io.BytesIO(output["png"])) as normalized:
            self.assertEqual(normalized.mode, "RGB")
            self.assertEqual(normalized.getpixel((10, 10)), (255, 255, 255))
            self.assertEqual(normalized.getpixel((0, 0)), (0, 0, 0))
            self.assertNotIn("exif", normalized.info)

    def test_no_overwrite_duplicate_images_or_excess_image_count(self):
        for images in ([], [self.image] * 5, [self.image, self.image]):
            with self.assertRaises(helper.ReviewError):
                helper.create_review(self.source, images, self.root / "new-output")
        with self.assertRaises(helper.ReviewError):
            helper.create_review(self.source, [self.image], self.root)
        self.assertFalse((self.root / "new-output").exists())

    def test_tsv_confidence_is_bounded_and_never_a_fact_confidence(self):
        header = "level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n"
        row = "5\t1\t1\t1\t1\t1\t0\t0\t20\t10\t87.5\tBourbon\n"
        words = helper.parse_words(header + row, 100, 100)
        self.assertEqual(words[0]["confidence"], 87.5)
        self.assertEqual(words[0]["box"], [0, 0, 20, 10])
        for bad in (row.replace("87.5", "NaN"), row.replace("87.5", "101"), row.replace("\t20\t", "\t200\t")):
            with self.assertRaises(helper.ReviewError):
                helper.parse_words(header + bad, 100, 100)
        with mock.patch.dict(helper.LIMITS, ocr_words=1):
            with self.assertRaises(helper.ReviewError):
                helper.parse_words(header + row + row, 100, 100)

    def test_safe_report_does_not_activate_html_or_external_urls(self):
        malicious = '<script>fetch("https://evil.invalid")</script><img src=x onerror=alert(1)>'
        source = source_fixture(field_suggestions={"name": malicious})
        record = {"original_source_review": source, "source_export": {"sha256": "a" * 64},
                  "images": [{"number": 1, "filename": malicious, "sha256": "b" * 64,
                    "ocr": {"status": "ocr_completed", "raw_text": malicious, "words": []}}]}
        markup = helper.review_html(record, [b"preview"])
        tags = Tags(markup).tags
        self.assertFalse(any(tag in {"script", "iframe", "object", "a", "form"} for tag, _ in tags))
        self.assertTrue(all(attrs["src"].startswith("data:image/jpeg;base64,") for tag, attrs in tags if tag == "img"))
        self.assertIn("&lt;script&gt;", markup)
        self.assertIn("connect-src 'none'", markup)
        self.assertIn("Original exported suggestions", markup)
        self.assertIn("current release: <strong>unverified", markup)

    def test_ocr_failure_is_reported_without_promoting_any_field(self):
        with mock.patch.object(helper, "local_engine", return_value={"receipt": {"name": "test"}}), \
             mock.patch.object(helper, "run_tesseract", side_effect=helper.ReviewError("Local OCR timed out")):
            result = helper.create_review(self.source, [self.image], self.root / "review")
        self.assertEqual(result["images"][0]["ocr"]["status"], "unreviewed_processing_failed")
        self.assertFalse(result["canonical_fields_generated"])
        self.assertFalse(result["application_writes"])
        self.assertFalse(result["review"]["image_identity_verified"])
        self.assertNotIn("field_suggestions", result)
        self.assertEqual(result["original_source_review"]["field_suggestions"], source_fixture()["field_suggestions"])
        self.assertTrue((self.root / "review/review.html").exists())

    def test_local_subprocess_wall_clock_limit_kills_process(self):
        started = time.monotonic()
        with self.assertRaisesRegex(helper.ReviewError, "timed out"):
            helper.local_process([sys.executable, "-c", "import time; time.sleep(20)"], self.root, 1)
        self.assertLess(time.monotonic() - started, 5)

    def test_oversized_ocr_text_is_rejected_instead_of_truncated(self):
        prepared = helper.prepared_image(self.image)
        def output_files(*args):
            (self.root / "recognition.txt").write_bytes(b"a" * 101)
            (self.root / "recognition.tsv").write_bytes(b"header")
            return b""
        with mock.patch.dict(helper.LIMITS, ocr_text_bytes=100), \
             mock.patch.object(helper, "local_process", side_effect=output_files):
            with self.assertRaisesRegex(helper.ReviewError, "100-byte limit"):
                helper.run_tesseract(prepared, {"executable": "/local/tesseract"}, self.root, "eng", 11)

    def test_combined_output_limit_stops_before_creating_output(self):
        with mock.patch.object(helper, "local_engine", return_value={"receipt": {"name": "test"}}), \
             mock.patch.object(helper, "run_tesseract", return_value={"status": "no_text_detected", "raw_text": "", "words": []}), \
             mock.patch.dict(helper.LIMITS, output_json_bytes=100):
            with self.assertRaisesRegex(helper.ReviewError, "Combined review"):
                helper.create_review(self.source, [self.image], self.root / "too-large")
        self.assertFalse((self.root / "too-large").exists())

    @unittest.skipUnless(shutil.which("tesseract"), "Existing local Tesseract is unavailable; no download attempted")
    def test_real_ocr_retains_hashes_words_and_confidences_with_no_python_network(self):
        with mock.patch.object(socket, "socket", side_effect=AssertionError("No sockets permitted")), \
             mock.patch.object(socket, "getaddrinfo", side_effect=AssertionError("No DNS permitted")), \
             mock.patch.object(helper, "local_process", wraps=helper.local_process) as process:
            result = helper.create_review(self.source, [self.image], self.root / "actual")
        ocr = result["images"][0]["ocr"]
        self.assertEqual(ocr["status"], "ocr_completed")
        self.assertIn("BOURBON", ocr["raw_text"])
        self.assertGreater(ocr["word_count"], 0)
        self.assertGreater(ocr["mean_word_confidence"], 0)
        self.assertTrue(all("confidence" in word for word in ocr["words"]))
        self.assertFalse(result["network_requests_made_by_helper"])
        self.assertFalse(result["canonical_fields_generated"])
        self.assertEqual(len(result["engine"]["executable_sha256"]), 64)
        self.assertEqual(len(result["engine"]["languages"][0]["sha256"]), 64)
        for call in process.call_args_list:
            self.assertTrue(all(not argument.startswith(("https:", "http:")) for argument in call.args[0]))
        self.assertEqual(ocr["raw_text_sha256"], hashlib.sha256((self.root / "actual/image-01.ocr.txt").read_bytes()).hexdigest())
        self.assertEqual(ocr["raw_tsv_sha256"], hashlib.sha256((self.root / "actual/image-01.ocr.tsv").read_bytes()).hexdigest())
        self.assertEqual(result["source_export"]["sha256"], hashlib.sha256(self.source.read_bytes()).hexdigest())
        self.assertEqual(os.stat(self.root / "actual/review.json").st_mode & 0o777, 0o600)


if __name__ == "__main__":
    unittest.main()
