#!/bin/sh
set -eu
base=/opt/sharim/backups/salad-bar-20261010
site=/var/www/sharim-menu
cd "$site"
sha256sum --check --status "$base/before.sha256"
mkdir -p "$base/release"
tar -xzf "$base/frontend-patch.tar.gz" -C "$base/release"
(cd "$base/release" && sha256sum --check --status "$base/release.sha256")
docker exec -i server-db-1 psql -v ON_ERROR_STOP=1 -U sharim -d sharim < "$base/install-products.sql"
# Publish dependencies and art before the entry page. Every replacement is atomic.
for name in assets/saladbar-trays-20261010.webp assets/saladbar-food-layers-20261010.webp assets/saladbar-bottle-atlas-20261010.webp builder-art.js builder-model.js builder.js builder.css app.js index.html; do
  install -m 644 "$base/release/$name" "$site/$name.saladbar-release"
  mv "$site/$name.saladbar-release" "$site/$name"
done
sha256sum --check "$base/release.sha256"
echo 'Salad-bar menu published.'
