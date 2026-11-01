#!/bin/sh
# Run with sudo sh scripts/install-static.sh from this checkout.
set -eu
project_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
install -d -m 755 /var/www/llmjp-web
for name in index.html classify.html personality.html personality-text.html; do
    install -m 644 "$project_root/static/$name" "/var/www/llmjp-web/$name"
done
printf '%s\n' 'Installed four public HTML files. Apache configuration was not changed.'
