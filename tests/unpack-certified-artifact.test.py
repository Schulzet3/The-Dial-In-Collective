import unittest,tempfile,pathlib,zipfile,importlib.util
spec=importlib.util.spec_from_file_location('u','scripts/release/unpack-certified-artifact.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class TestUnpack(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
  self.root=pathlib.Path(self.tmp.name)
 def make(self,entries):
  p=self.root/'outer.zip'
  with zipfile.ZipFile(p,'w') as z:
   for n in entries:z.writestr(n,b'PK'+b'x'*150)
  return p
 def test_dist(self):
  p=self.make(m.DIST)
  r=m.unpack(p,self.root/'out','dist')
  self.assertEqual(set(r),m.DIST)
 def test_certificate(self):
  p=self.make(m.CERT)
  self.assertEqual(set(m.unpack(p,self.root/'out','certificate')),m.CERT)
 def test_extra_and_missing(self):
  for entries in [m.DIST|{'../evil'},m.DIST-{'dist-immutable.zip'}]:
   p=self.make(entries)
   with self.assertRaises(ValueError):m.unpack(p,self.root/'out','dist')
if __name__=='__main__':unittest.main()
