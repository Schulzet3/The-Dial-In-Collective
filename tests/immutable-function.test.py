import unittest,tempfile,pathlib,zipfile,importlib.util
spec=importlib.util.spec_from_file_location('pkg','scripts/release/package-immutable-function.py')
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
class TestImmutableFunction(unittest.TestCase):
 def test_reproducible(self):
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d);src=p/'bundle.mjs';src.write_text('export default function coffee_url_preview(){}')
   a=p/'a.zip';b=p/'b.zip'
   self.assertEqual(mod.package(src,a),mod.package(src,b))
   self.assertEqual(a.read_bytes(),b.read_bytes())
   with zipfile.ZipFile(a) as z:self.assertEqual(z.namelist(),['coffee-url-preview.mjs'])
 def test_rejects_missing(self):
  with tempfile.TemporaryDirectory() as d:
   with self.assertRaises(ValueError):mod.package(pathlib.Path(d)/'missing',pathlib.Path(d)/'x.zip')
if __name__=='__main__':unittest.main()
