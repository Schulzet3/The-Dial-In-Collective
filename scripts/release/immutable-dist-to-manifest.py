#!/usr/bin/env python3
"""Read exact immutable dist ZIP into bounded Netlify digest payload. Never extracts to disk."""
import base64,json,pathlib,stat,sys,zipfile
def files_from_zip(path):
    result={};total=0
    with zipfile.ZipFile(path) as z:
        for item in z.infolist():
            name=item.filename
            if item.is_dir():continue
            parts=name.split('/')
            mode=item.external_attr>>16
            if (not name or name.startswith('/') or '\\' in name or
                any(p in ('','.','..') for p in parts) or
                stat.S_ISLNK(mode) or (mode and not stat.S_ISREG(mode)) or
                item.file_size>20_000_000 or item.compress_size==0):
                raise ValueError('Unsafe ZIP entry')
            if len(result)>=500 or total+item.file_size>80_000_000:
                raise ValueError('Immutable ZIP exceeds bounded release limit')
            key='/'+name
            if key in result:raise ValueError('Duplicate ZIP entry')
            data=z.read(item)
            total+=len(data)
            result[key]=base64.b64encode(data).decode('ascii')
    if '/index.html' not in result:raise ValueError('Missing index.html')
    return result
if __name__=='__main__':
    if len(sys.argv)!=2:raise SystemExit('Usage: immutable-dist-to-manifest.py ZIP')
    print(json.dumps(files_from_zip(pathlib.Path(sys.argv[1])),separators=(',',':')))
