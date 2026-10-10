#!/bin/sh
set -eu
base=/opt/sharim/backups/menu-button-polish-20261010
site=/var/www/sharim-menu
cd "$site"
sha256sum --check --status "$base/before.sha256"
mkdir -p "$base/release"
tar -xzf "$base/frontend-patch.tar.gz" -C "$base/release"
(cd "$base/release" && sha256sum --check --status "$base/release.sha256")
for name in assets/menu-meals-20261010.webp builder-art.js builder-scene.js builder.js builder.css app.js index.html; do
  install -m 644 "$base/release/$name" "$site/$name.button-polish-release"
  mv "$site/$name.button-polish-release" "$site/$name"
done
sha256sum --check "$base/release.sha256"
echo 'Matching menu buttons published.'
