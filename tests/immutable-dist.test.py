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
 def test_unsafe_symlink_keeps_existing_certified_zip(self):
  with tempfile.TemporaryDirectory() as d:
   root=pathlib.Path(d)/"dist";root.mkdir()
   (root/"index.html").write_text("safe")
   (root/"leak").symlink_to(pathlib.Path(d))
   existing=pathlib.Path(d)/"certified.zip"
   with zipfile.ZipFile(existing,"w") as z:
    z.writestr("index.html","previous verified");z.writestr("app.js","persist")
   before=existing.read_bytes()
   with self.assertRaisesRegex(ValueError,"Unsafe symlink"):mod.package(root,existing)
   self.assertEqual(existing.read_bytes(),before)
   self.assertEqual(sorted(p.name for p in pathlib.Path(d).iterdir()),["certified.zip","dist"])
 def test_zip_write_failure_keeps_existing_certified_zip(self):
  with tempfile.TemporaryDirectory() as d:
   root=pathlib.Path(d)/"dist";root.mkdir()
   (root/"index.html").write_text("safe")
   existing=pathlib.Path(d)/"certified.zip"
   with zipfile.ZipFile(existing,"w") as z:z.writestr("index.html","previous verified")
   before=existing.read_bytes()
   with patch.object(zipfile.ZipFile,"writestr",side_effect=OSError("injected write failure")):
    with self.assertRaisesRegex(OSError,"injected write failure"):mod.package(root,existing)
   self.assertEqual(existing.read_bytes(),before)
   self.assertEqual(sorted(p.name for p in pathlib.Path(d).iterdir()),["certified.zip","dist"])
if __name__=="__main__":unittest.main()
