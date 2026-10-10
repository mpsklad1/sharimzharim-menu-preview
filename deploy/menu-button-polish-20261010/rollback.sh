#!/bin/sh
set -eu
base=/opt/sharim/backups/menu-button-polish-20261010
site=/var/www/sharim-menu
cd "$site"
if sha256sum --check --status "$base/before.sha256"; then
  echo 'Menu buttons are already restored.'
  exit 0
fi
sha256sum --check --status "$base/release.sha256"
mkdir -p "$base/restore"
tar -xzf "$base/menu-before.tar.gz" -C "$base/restore" builder-art.js builder-scene.js builder.js builder.css app.js index.html
(cd "$base/restore" && sha256sum --check --status "$base/before.sha256")
for name in builder-art.js builder-scene.js builder.js builder.css app.js index.html; do
  install -m 644 "$base/restore/$name" "$site/$name.button-polish-rollback"
  mv "$site/$name.button-polish-rollback" "$site/$name"
done
sha256sum --check "$base/before.sha256"
echo 'Menu buttons restored. Catalog and database were not changed.'
