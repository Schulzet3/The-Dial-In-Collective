#!/usr/bin/env python3
"""Deterministic immutable ZIP of production dist, excluding symlinks and unsafe paths."""
import os, pathlib, sys, tempfile, zipfile

def package(root, destination):
    root = pathlib.Path(root).resolve()
    if not root.is_dir():
        raise ValueError("Missing build output")
    files = sorted(p for p in root.rglob("*") if p.is_file() or p.is_symlink())
    if not files or not (root / "index.html").is_file():
        raise ValueError("Empty or invalid cloud build")
    members = []
    for p in files:
        if p.is_symlink() or not p.resolve().is_relative_to(root):
            raise ValueError("Unsafe symlink in build")
        name = p.relative_to(root).as_posix()
        if name.startswith("/") or ".." in pathlib.PurePosixPath(name).parts:
            raise ValueError("Unsafe artifact path")
        members.append((p, name))
    destination = pathlib.Path(destination)
    with tempfile.NamedTemporaryFile(dir=destination.parent, prefix=f".{destination.name}.", suffix=".tmp", delete=False) as temporary:
        staging = pathlib.Path(temporary.name)
    try:
        with zipfile.ZipFile(staging, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as out:
            for p, name in members:
                if p.is_symlink() or not p.resolve().is_relative_to(root):
                    raise ValueError("Unsafe symlink in build")
                info = zipfile.ZipInfo(name, date_time=(2020, 1, 1, 0, 0, 0))
                info.external_attr = 0o644 << 16
                info.compress_type = zipfile.ZIP_DEFLATED
                out.writestr(info, p.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
        os.replace(staging, destination)
    finally:
        staging.unlink(missing_ok=True)

if __name__ == "__main__":
    if len(sys.argv) != 3: raise SystemExit("Usage: package-immutable-dist.py DIST ZIP")
    package(sys.argv[1], sys.argv[2])
