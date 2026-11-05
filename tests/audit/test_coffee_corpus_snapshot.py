"""Offline atomic source-snapshot regressions; never touch original603 data."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[2] / 'scripts/audit/coffee-corpus-snapshot.py'


class SnapshotIntegrityTests(unittest.TestCase):
    def setUp(self):
        self.root_context = tempfile.TemporaryDirectory(prefix='dic-source-snapshot-test-')
        self.addCleanup(self.root_context.cleanup)
        self.root = Path(self.root_context.name)
        self.source = self.root / 'original'
        self.target = self.root / 'snapshots' / 'release-A'
        for name in ('src', 'netlify/functions', 'supabase/functions/_shared'):
            (self.source / name).mkdir(parents=True, exist_ok=True)
        self.files = {'src/client.js': b'client', 'netlify/functions/api.js': b'api',
                      'supabase/functions/_shared/core.ts': b'core', 'package.json': b'{"name":"snapshot"}'}
        for name, data in self.files.items():
            p = self.source / name
            p.write_bytes(data)

    def run_copy(self):
        return subprocess.run([sys.executable, str(SCRIPT), str(self.source), str(self.target)],
                              capture_output=True, text=True, check=False)

    def assert_no_temporary_dirs(self):
        self.assertEqual(list(self.target.parent.glob('.release-A.partial-*')), [])

    def test_complete_copy_is_only_published_after_verified_receipt(self):
        result = self.run_copy()
        self.assertEqual(result.returncode, 0, result.stderr)
        output = json.loads(result.stdout)
        self.assertEqual(output['files'], len(self.files))
        self.assertEqual(output['snapshot'], str(self.target))
        rows = json.loads((self.target / 'snapshot-receipt.json').read_text())
        self.assertEqual(rows['source'], str(self.source))
        self.assertEqual({r['path'] for r in rows['files']}, set(self.files))
        for row in rows['files']:
            self.assertEqual(row['sha256'], hashlib.sha256(self.files[row['path']]).hexdigest())
            self.assertEqual((self.target / row['path']).read_bytes(), self.files[row['path']])
        self.assert_no_temporary_dirs()

    def test_missing_late_source_does_not_publish_partial_target(self):
        (self.source / 'package.json').unlink()
        result = self.run_copy()
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(self.target.exists())
        self.assert_no_temporary_dirs()
        (self.source / 'package.json').write_bytes(self.files['package.json'])
        self.assertEqual(self.run_copy().returncode, 0)

    def test_copytree_exception_cleans_staging_directory(self):
        (self.source / 'src' / 'broken.js').symlink_to('nonexistent.js')
        result = self.run_copy()
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(self.target.exists())
        self.assert_no_temporary_dirs()

    def test_existing_immutable_snapshot_unchanged(self):
        self.target.mkdir(parents=True)
        (self.target / 'existing.txt').write_text('preserve')
        result = self.run_copy()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual((self.target / 'existing.txt').read_text(), 'preserve')
        self.assert_no_temporary_dirs()


if __name__ == '__main__':
    unittest.main()
