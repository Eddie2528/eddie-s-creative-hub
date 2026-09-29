#!/bin/sh
# Renders card.html to public/og/share-card.jpg at 1200×630.
# Needs Google Chrome and network access (the fonts come from Google Fonts).
set -e
here="$(cd "$(dirname "$0")" && pwd)"
root="$here/../.."
chrome="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
png="$(mktemp -t share-card).png"

"$chrome" --headless=new --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=1200,630 \
  --virtual-time-budget=5000 --allow-file-access-from-files \
  --screenshot="$png" "file://$here/card.html" >/dev/null 2>&1

sips -s format jpeg -s formatOptions 90 "$png" --out "$root/public/og/share-card.jpg" >/dev/null
rm -f "$png"
sips -g pixelWidth -g pixelHeight "$root/public/og/share-card.jpg" | tail -2
