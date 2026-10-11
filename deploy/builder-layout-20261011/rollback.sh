#!/bin/sh
set -eu
base=/opt/sharim/backups/builder-layout-20261011
site=/var/www/sharim-menu
cd "$site"
if sha256sum --check --status "$base/before.sha256"; then
  echo 'Builder layout is already restored.'
  exit 0
fi
sha256sum --check --status "$base/release.sha256"
mkdir -p "$base/restore"
tar -xzf "$base/menu-before.tar.gz" -C "$base/restore" builder.js builder.css app.js index.html
(cd "$base/restore" && sha256sum --check --status "$base/before.sha256")
for name in builder.js builder.css app.js index.html; do
  install -m 644 "$base/restore/$name" "$site/$name.builder-layout-rollback"
  mv "$site/$name.builder-layout-rollback" "$site/$name"
done
sha256sum --check "$base/before.sha256"
echo 'Builder layout restored. Catalog and database were not changed.'
