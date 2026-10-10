#!/bin/sh
set -eu
base=/opt/sharim/backups/ingredient-detail-20261010
site=/var/www/sharim-menu
cd "$site"
sha256sum --check --status "$base/before.sha256"
mkdir -p "$base/release"
tar -xzf "$base/frontend-patch.tar.gz" -C "$base/release"
(cd "$base/release" && sha256sum --check --status "$base/release.sha256")
for name in assets/builder-fillings-a-20261010.webp assets/builder-fillings-b-20261010.webp assets/builder-fillings-c-20261010.webp assets/builder-sauces-20261010.webp builder-photo-manifest.js builder-art.js builder-scene.js builder.js builder.css app.js index.html; do
  install -m 644 "$base/release/$name" "$site/$name.ingredient-detail-release"
  mv "$site/$name.ingredient-detail-release" "$site/$name"
done
sha256sum --check "$base/release.sha256"
echo 'Exact ingredient photos and compact menu actions published.'
