"""Synthetic local regressions for frozen-audit artifact inventory; no provider access."""
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest import mock

SCRIPT = Path(__file__).resolve().parents[2] / "scripts/audit/coffee-frozen-ci.py"
SPEC = importlib.util.spec_from_file_location("frozen_ci_artifact_under_test", SCRIPT)
RUNNER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(RUNNER)


class ArtifactInventoryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="dic-artifact-inventory-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.output = self.root / "output"
        self.output.mkdir()

    def test_normal_nested_file_and_self_exclusion(self):
        nested = self.output / "nested"
        nested.mkdir()
        contents = b'{"safe": true}\n'
        (nested / "normal.json").write_bytes(contents)
        actual = RUNNER.artifact_inventory(self.output)
        manifest = json.loads((self.output / "artifact-manifest.json").read_text())
        self.assertEqual(manifest["files"], [{
            "file": "nested/normal.json",
            "bytes": len(contents),
            "sha256": hashlib.sha256(contents).hexdigest(),
        }])
        self.assertEqual(actual["retained_files"], 1)
        self.assertEqual(actual["retained_bytes"], len(contents))

    def test_external_file_symlink_rejected_before_hash_read(self):
        external = self.root / "outside.txt"
        external.write_text("outside benchmark output")
        (self.output / "linked.json").symlink_to(external)
        with mock.patch.object(RUNNER, "file_hash", side_effect=AssertionError("unexpected hash read")):
            with self.assertRaisesRegex(ValueError, "refuses symlinked path: linked.json"):
                RUNNER.artifact_inventory(self.output)
        self.assertFalse((self.output / "artifact-manifest.json").exists())

    def test_manifest_name_symlink_not_silently_skipped(self):
        external = self.root / "outside.txt"
        external.write_text("external file")
        (self.output / "artifact-manifest.json").symlink_to(external)
        with self.assertRaisesRegex(ValueError, "refuses symlinked path: artifact-manifest.json"):
            RUNNER.artifact_inventory(self.output)
        self.assertEqual(external.read_text(), "external file")

    def test_directory_symlink_rejected(self):
        outside = self.root / "outside"
        outside.mkdir()
        (outside / "secret.txt").write_text("private test content")
        (self.output / "linked-dir").symlink_to(outside, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, "refuses symlinked path: linked-dir"):
            RUNNER.artifact_inventory(self.output)


if __name__ == "__main__":
    unittest.main()
