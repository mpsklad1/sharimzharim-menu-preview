#!/bin/sh
set -eu
base=/opt/sharim/backups/pita-pocket-20261010
site=/var/www/sharim-menu
cd "$site"
sha256sum --check --status "$base/before.sha256"
mkdir -p "$base/release"
tar -xzf "$base/frontend-patch.tar.gz" -C "$base/release"
(cd "$base/release" && sha256sum --check --status "$base/release.sha256")
for name in builder-scene.js builder.js builder.css app.js index.html; do
  install -m 644 "$base/release/$name" "$site/$name.pita-pocket-release"
  mv "$site/$name.pita-pocket-release" "$site/$name"
done
sha256sum --check "$base/release.sha256"
echo 'Pita pocket published.'
