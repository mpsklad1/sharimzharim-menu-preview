#!/bin/sh
set -eu
base=/opt/sharim/backups/pita-pocket-20261010
site=/var/www/sharim-menu
cd "$site"
if sha256sum --check --status "$base/before.sha256"; then
  echo 'Pita pocket are already restored.'
  exit 0
fi
sha256sum --check --status "$base/release.sha256"
mkdir -p "$base/restore"
tar -xzf "$base/menu-before.tar.gz" -C "$base/restore" builder-scene.js builder.js builder.css app.js index.html
(cd "$base/restore" && sha256sum --check --status "$base/before.sha256")
for name in builder-scene.js builder.js builder.css app.js index.html; do
  install -m 644 "$base/restore/$name" "$site/$name.pita-pocket-rollback"
  mv "$site/$name.pita-pocket-rollback" "$site/$name"
done
sha256sum --check "$base/before.sha256"
echo 'Pita pocket restored. Catalog and database were not changed.'
