import importlib.util, pathlib, tempfile, unittest, zipfile, hashlib
from unittest.mock import patch
script=pathlib.Path(__file__).resolve().parents[1]/"scripts/release/package-immutable-dist.py"
spec=importlib.util.spec_from_file_location("artifact",script)
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
class TestImmutableDist(unittest.TestCase):
 def test_deterministic_and_rejects_symlinks(self):
  with tempfile.TemporaryDirectory() as d:
   root=pathlib.Path(d)/"dist";root.mkdir()
   (root/"index.html").write_text("<html>safe</html>")
   (root/"app.js").write_text("const x=1")
   a=pathlib.Path(d)/"a.zip";b=pathlib.Path(d)/"b.zip"
   mod.package(root,a);mod.package(root,b)
   self.assertEqual(hashlib.sha256(a.read_bytes()).digest(),hashlib.sha256(b.read_bytes()).digest())
   with zipfile.ZipFile(a) as z:self.assertEqual(sorted(z.namelist()),["app.js","index.html"])
   (root/"leak").symlink_to(pathlib.Path(d))
   with self.assertRaises(ValueError):mod.package(root,b)
 def test_missing_index_denied(self):
  with tempfile.TemporaryDirectory() as d:
   with self.assertRaises(ValueError):mod.package(pathlib.Path(d),pathlib.Path(d)/"a.zip")
if __name__=="__main__":unittest.main()
