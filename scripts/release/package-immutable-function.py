#!/usr/bin/env python3
"""Deterministically package prebundled Netlify function; no runtime build at publish."""
import hashlib, pathlib, sys, zipfile
def package(source, target):
    source=pathlib.Path(source)
    if not source.is_file() or source.is_symlink():raise ValueError("Missing or unsafe bundled function")
    data=source.read_bytes()
    if not data or b'coffee-url-preview' not in data and b'preview' not in data:
        raise ValueError("Unexpected empty/incorrect function bundle")
    with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        info=zipfile.ZipInfo('coffee-url-preview.mjs',(2020,1,1,0,0,0))
        info.external_attr=0o644<<16
        info.compress_type=zipfile.ZIP_DEFLATED
        z.writestr(info,data,compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
    return hashlib.sha256(pathlib.Path(target).read_bytes()).hexdigest()
if __name__=='__main__':
    if len(sys.argv)!=3:raise SystemExit("Usage: package-immutable-function.py BUNDLE OUTPUT_ZIP")
    print(package(sys.argv[1],sys.argv[2]))
