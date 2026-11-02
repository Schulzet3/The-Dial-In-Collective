#!/usr/bin/env python3
"""Strictly unpack only expected GitHub Actions artifact members, never arbitrary paths."""
import pathlib,sys,zipfile
DIST={'dist-immutable.zip','dist-immutable.zip.sha256',
      'coffee-url-preview-function.zip','coffee-url-preview-function.zip.sha256'}
CERT={'CI_CERTIFICATE.json'}
def unpack(archive,destination,kind):
    expected=DIST if kind=='dist' else CERT if kind=='certificate' else None
    if expected is None:raise ValueError('Unknown artifact kind')
    destination=pathlib.Path(destination);destination.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(archive) as z:
        infos=z.infolist()
        if len(infos)!=len(expected) or {x.filename for x in infos}!=expected:
            raise ValueError('Artifact members do not match exact manifest')
        for item in infos:
            mode=item.external_attr>>16
            if item.is_dir() or item.file_size<=0 or item.file_size>100_000_000 or (
                (mode & 0o170000) not in (0,0o100000)):
                raise ValueError('Unsafe artifact member')
            dest=destination/item.filename
            with dest.open('xb') as out:out.write(z.read(item))
    return {name:str(destination/name) for name in expected}
if __name__=='__main__':
    if len(sys.argv)!=4:raise SystemExit('Usage: unpack-certified-artifact.py ZIP DEST dist|certificate')
    unpack(sys.argv[1],sys.argv[2],sys.argv[3])
