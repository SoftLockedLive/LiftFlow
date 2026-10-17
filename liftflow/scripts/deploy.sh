#!/usr/bin/env bash
# Build LiftFlow and publish it to Atlas at https://liftflow.softlockedlive.com
#
# Uploads the build next to the live folder, then swaps the two, so visitors never
# see a half-uploaded site and files from old builds don't pile up. The previous
# build is kept as .liftflow-previous for a quick rollback (see README).
set -euo pipefail

HOST="atlas"
SITE="/srv/www/liftflow.softlockedlive.com"
URL="https://liftflow.softlockedlive.com"

cd "$(dirname "$0")/.."

if [ -n "$(git status --porcelain)" ]; then
  echo "Note: you have uncommitted changes; deploying them anyway."
fi

rm -rf out
npm run build
[ -f out/index.html ] || { echo "Build did not produce out/index.html; not deploying." >&2; exit 1; }

echo "Uploading to $HOST..."
# Dot-prefixed folders can't match a hostname, so Caddy never serves them.
tar -C out -cf - . | ssh "$HOST" "
  set -e
  cd /srv/www
  rm -rf .liftflow-new
  mkdir .liftflow-new
  tar -C .liftflow-new --no-same-owner -xf -
  chmod -R g+w,o+rX .liftflow-new
  rm -rf .liftflow-previous
  if [ -d '$SITE' ]; then mv '$SITE' .liftflow-previous; fi
  mv .liftflow-new '$SITE'
"

status=$(curl -s -o /dev/null -w '%{http_code}' "$URL/")
if [ "$status" = "200" ]; then
  echo "Deployed $(git rev-parse --short HEAD) to $URL"
else
  echo "Deployed, but $URL/ answered $status. Check it in a browser." >&2
  exit 1
fi
