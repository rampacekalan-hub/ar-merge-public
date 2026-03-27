#!/bin/zsh
set -e

cd "$(dirname "$0")"
rm -f kontakt-merge-web.zip
zip -r kontakt-merge-web.zip \
  index.html \
  styles.css \
  app.js \
  manifest.webmanifest \
  service-worker.js \
  server.py \
  start.sh \
  README.md \
  icons \
  examples \
  -x "*.DS_Store"

echo "Hotovo: $(pwd)/kontakt-merge-web.zip"
