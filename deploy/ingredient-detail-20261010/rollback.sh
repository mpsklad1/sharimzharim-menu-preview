#!/bin/sh
set -eu
base=/opt/sharim/backups/ingredient-detail-20261010
site=/var/www/sharim-menu
cd "$site"
if sha256sum --check --status "$base/before.sha256"; then
  echo 'Already at the previous frontend version.'
  exit 0
fi
if ! sha256sum --check --status "$base/release.sha256"; then
  echo 'STOP: files changed after the release; review before rollback.' >&2
  exit 1
fi
stage="$base/rollback-staging"
mkdir -p "$stage"
tar -xzf "$base/menu-before.tar.gz" -C "$stage" ./app.js ./index.html ./builder.js ./builder.css ./builder-art.js
(cd "$stage" && sha256sum --check --status "$base/before.sha256")
for name in builder-art.js builder.js builder.css app.js index.html; do
  install -m 644 "$stage/$name" "$site/$name.ingredient-detail-rollback"
  mv "$site/$name.ingredient-detail-rollback" "$site/$name"
done
sha256sum --check "$base/before.sha256"
echo 'Previous frontend restored; catalog, orders and accounts retained.'
