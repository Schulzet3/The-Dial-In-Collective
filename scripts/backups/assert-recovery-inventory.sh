#!/bin/sh
# Compare private inventory files without printing their contents or hashes.
set -eu
case "${3:-}" in
  row-counts) DIC_MISMATCH='At least one restored app/Auth table row count differs from the snapshot' ;;
  row-fingerprints) DIC_MISMATCH='Restored first-party/Auth row content fingerprints disagree with the snapshot' ;;
  *) echo '::error::Unknown recovery inventory comparison' >&2; exit 2 ;;
esac
if [ ! -s "$1" ] || [ ! -s "$2" ] || ! cmp -s "$1" "$2"; then
  echo "::error::$DIC_MISMATCH" >&2
  exit 1
fi
