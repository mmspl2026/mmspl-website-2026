#!/bin/bash
# Backs up the live Sanity dataset (every document + image asset) to a
# dated, gzipped tarball. Safe to run anytime — this only reads from
# Sanity, it never writes or deletes anything there.
#
# Usage:
#   ./scripts/backup-sanity.sh
#   ./scripts/backup-sanity.sh /some/other/backup/folder
#
# Requires .env.local (gitignored) to exist in the project root with
# NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, and
# SANITY_API_TOKEN set — the same file the website itself uses.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="${1:-$HOME/Desktop/mmspl-backups}"
ENV_FILE="$PROJECT_DIR/.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found — can't find the Sanity project/token." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${NEXT_PUBLIC_SANITY_DATASET:?Missing NEXT_PUBLIC_SANITY_DATASET in .env.local}"
: "${SANITY_API_TOKEN:?Missing SANITY_API_TOKEN in .env.local}"
export SANITY_AUTH_TOKEN="$SANITY_API_TOKEN"

mkdir -p "$BACKUP_DIR"
OUT_FILE="$BACKUP_DIR/mmspl-backup-$(date +%Y-%m-%d_%H%M%S).tar.gz"

echo "Backing up dataset \"$NEXT_PUBLIC_SANITY_DATASET\" to:"
echo "  $OUT_FILE"
echo

cd "$PROJECT_DIR"
npx sanity dataset export "$NEXT_PUBLIC_SANITY_DATASET" "$OUT_FILE"

echo
echo "Done. Backup saved to $OUT_FILE"
