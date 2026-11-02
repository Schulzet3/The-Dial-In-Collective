import unittest,tempfile,pathlib,zipfile,importlib.util
spec=importlib.util.spec_from_file_location('zipreader','scripts/release/immutable-dist-to-manifest.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class TestZipManifest(unittest.TestCase):
 def make(self,items):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
  p=pathlib.Path(self.tmp.name)/'dist.zip'
  with zipfile.ZipFile(p,'w') as z:
   for name,data in items:z.writestr(name,data)
  return p
 def test_extract(self):
  p=self.make([('index.html','ok'),('assets/app.js','123')])
  self.assertEqual(set(m.files_from_zip(p)),{'/index.html','/assets/app.js'})
 def test_traversal(self):
  p=self.make([('index.html','ok'),('../bad','bad')])
  with self.assertRaises(ValueError):m.files_from_zip(p)
 def test_duplicate(self):
  p=self.make([('index.html','ok'),('index.html','other')])
  with self.assertRaises(ValueError):m.files_from_zip(p)
 def test_missing_index(self):
  p=self.make([('x.txt','x')])
  with self.assertRaises(ValueError):m.files_from_zip(p)
if __name__=='__main__':unittest.main()
