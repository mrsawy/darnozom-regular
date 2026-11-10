#!/usr/bin/env bash
# Builds a GoAccess HTML report from the nginx access logs (rotated ones too)
# so the admin dashboard can show server-side traffic with no JS involved.
#
# Install once on the VPS:
#   apt-get install -y goaccess
#   install -m 755 deploy/goaccess-report.sh /usr/local/bin/darnozom-goaccess
#   echo '*/15 * * * * root /usr/local/bin/darnozom-goaccess' > /etc/cron.d/darnozom-goaccess
#
# The API serves the result (admin-only) at /api/admin/visitors/server-report.
set -euo pipefail

OUT_DIR="${GOACCESS_OUT_DIR:-/var/lib/darnozom/goaccess}"
LOG_GLOB="${NGINX_LOG:-/var/log/nginx/access.log}"
mkdir -p "$OUT_DIR"

# Plain + gzipped rotated logs, oldest first. Exclude API/socket noise and assets.
{
  for f in $(ls -1 "$LOG_GLOB".*.gz 2>/dev/null | sort -r); do zcat "$f"; done
  [ -f "$LOG_GLOB.1" ] && cat "$LOG_GLOB.1"
  cat "$LOG_GLOB"
} | goaccess - \
    --log-format=COMBINED \
    --ignore-crawlers \
    --exclude-ip=127.0.0.1 \
    --ignore-panel=KEYPHRASES \
    --anonymize-ip \
    --html-report-title="Darnozom — server traffic" \
    -o "$OUT_DIR/report.html.tmp"

mv "$OUT_DIR/report.html.tmp" "$OUT_DIR/report.html"
chmod 640 "$OUT_DIR/report.html"
chgrp "${API_GROUP:-www-data}" "$OUT_DIR/report.html" 2>/dev/null || true
