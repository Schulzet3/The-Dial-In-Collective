#!/usr/bin/env python3
"""Copy a candidate into an immutable, fingerprinted replay source directory."""
import hashlib
import json
import pathlib
import shutil
import sys

source = pathlib.Path(sys.argv[1]).resolve()
target = pathlib.Path(sys.argv[2]).resolve()
if target.exists():
    raise SystemExit('Choose a new snapshot path; do not overwrite earlier source evidence.')
target.mkdir(parents=True)
for name in ['src', 'netlify/functions', 'supabase/functions/_shared', 'package.json']:
    original = source / name
    copied = target / name
    copied.parent.mkdir(parents=True, exist_ok=True)
    if original.is_dir():
        shutil.copytree(original, copied)
    else:
        shutil.copy2(original, copied)
rows = []
for copied in sorted(target.rglob('*')):
    if not copied.is_file():
        continue
    relative = copied.relative_to(target).as_posix()
    before = (source / relative).read_bytes()
    after = copied.read_bytes()
    if before != after:
        raise SystemExit('Source changed while copying: ' + relative)
    rows.append({'path': relative, 'bytes': len(after), 'sha256': hashlib.sha256(after).hexdigest()})
(target / 'snapshot-receipt.json').write_text(json.dumps({'source': str(source), 'files': rows}, indent=2) + '\n')
print(json.dumps({'source': str(source), 'snapshot': str(target), 'files': len(rows)}))
