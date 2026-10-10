#!/bin/sh
set -eu
base=/opt/sharim/backups/salad-bar-20261010
site=/var/www/sharim-menu
cd "$site"
if sha256sum --check --status "$base/before.sha256"; then
  echo 'Already at the version before the salad bar.'
  exit 0
fi
if ! sha256sum --check --status "$base/release.sha256"; then
  echo 'STOP: menu files changed after this release; review before rollback.' >&2
  exit 1
fi
stage="$base/rollback-staging"
mkdir -p "$stage"
tar -xzf "$base/menu-before.tar.gz" -C "$stage" ./app.js ./index.html ./builder.js ./builder-model.js ./builder.css
(cd "$stage" && sha256sum --check --status "$base/before.sha256")
# Archive only the four new recipes. Keep order history and all customer data.
docker exec -i server-db-1 psql -v ON_ERROR_STOP=1 -U sharim -d sharim < "$base/archive-products.sql"
for name in builder-model.js builder.js builder.css app.js index.html; do
  install -m 644 "$stage/$name" "$site/$name.saladbar-rollback"
  mv "$site/$name.saladbar-rollback" "$site/$name"
done
sha256sum --check "$base/before.sha256"
echo 'Restored the previous menu; custom recipe history retained.'
