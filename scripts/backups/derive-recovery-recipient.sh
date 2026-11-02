#!/usr/bin/env bash
# Derive only the public age recipient from a native age or OpenSSH Ed25519 identity.
# This script never logs, copies, or prints the private key.
set -Eeuo pipefail
umask 077
if [[ $# -ne 1 || ! -s "$1" ]]; then
  echo '::error::Recovery identity file is missing or empty.' >&2
  exit 2
fi
identity_file="$1"
if recipient="$(age-keygen -y "$identity_file" 2>/dev/null)"; then
  :
else
  if ! ssh_public="$(ssh-keygen -y -P '' -f "$identity_file" 2>/dev/null)"; then
    echo '::error::Unsupported or passphrase-protected recovery identity (requires noninteractive SSH Ed25519 or native age).' >&2
    exit 2
  fi
  read -r key_type key_bytes _ <<< "$ssh_public"
  recipient="$key_type $key_bytes"
fi
if ! [[ "$recipient" =~ ^age1[a-z0-9]{20,}$ || "$recipient" =~ ^ssh-ed25519[[:space:]][A-Za-z0-9+/]+={0,2}$ ]]; then
  echo '::error::Recovery identity did not produce an accepted age or SSH Ed25519 recipient.' >&2
  exit 2
fi
printf '%s\n' "$recipient"
