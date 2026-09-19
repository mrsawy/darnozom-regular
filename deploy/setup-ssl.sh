#!/usr/bin/env bash
# Obtain / renew Let's Encrypt certs and install nginx config.
# Safe to run on every deploy.
#
# Two SEPARATE certificates are issued on purpose:
#   1. darnozom.com + www.darnozom.com  — required, the site is down without it
#   2. api.darnozom.com                 — optional, added when DNS resolves
# Keeping them apart means a DNS problem on the API subdomain can never block
# issuing or renewing the main site's certificate.
set -euo pipefail

DOMAIN="${DEPLOY_DOMAIN:-darnozom.com}"
EMAIL="${DEPLOY_SSL_EMAIL:-info@darnozom.com}"
API_DOMAIN="${DEPLOY_API_DOMAIN:-api.${DOMAIN}}"
MEDUSA_DOMAIN="${DEPLOY_MEDUSA_DOMAIN:-ecommerce.${DOMAIN}}"
WWW_DOMAIN="www.${DOMAIN}"

SITE_SRC="${1:-deploy/nginx.conf}"
BOOTSTRAP_SRC="${2:-deploy/nginx.bootstrap.conf}"
API_SRC="${3:-deploy/nginx.api.conf}"
MEDUSA_SRC="${4:-deploy/nginx.medusa.conf}"

SITE_DEST="/etc/nginx/sites-available/darnozom"
API_DEST="/etc/nginx/sites-available/darnozom-api"
MEDUSA_DEST="/etc/nginx/sites-available/darnozom-medusa"
CERT_PATH="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
API_CERT_PATH="/etc/letsencrypt/live/${API_DOMAIN}/fullchain.pem"
MEDUSA_CERT_PATH="/etc/letsencrypt/live/${MEDUSA_DOMAIN}/fullchain.pem"

export DEBIAN_FRONTEND=noninteractive

echo "==> Ensuring certbot + nginx helpers"
apt-get update -y
apt-get install -y certbot python3-certbot-nginx

mkdir -p /var/www/certbot /var/www/darnozom
chown -R www-data:www-data /var/www/darnozom || true

if [ ! -f "$CERT_PATH" ]; then
  echo "==> No certificate yet — using HTTP bootstrap + webroot challenge"
  cp "$BOOTSTRAP_SRC" "$SITE_DEST"
  ln -sfn "$SITE_DEST" /etc/nginx/sites-enabled/darnozom
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl reload nginx

  certbot certonly \
    --webroot \
    -w /var/www/certbot \
    -d "$DOMAIN" \
    -d "$WWW_DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --non-interactive \
    --keep-until-expiring
else
  echo "==> Certificate exists — renewing if due"
  certbot renew --quiet --deploy-hook "systemctl reload nginx" || true
fi

# Ensure SSL helper files exist
if [ ! -f /etc/letsencrypt/options-ssl-nginx.conf ]; then
  PKG_OPTS="/usr/lib/python3/dist-packages/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf"
  if [ -f "$PKG_OPTS" ]; then
    cp "$PKG_OPTS" /etc/letsencrypt/options-ssl-nginx.conf
  else
    cat > /etc/letsencrypt/options-ssl-nginx.conf << 'EOF'
ssl_session_cache shared:le_nginx_SSL:10m;
ssl_session_timeout 1440m;
ssl_session_tickets off;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;
EOF
  fi
fi
if [ ! -f /etc/letsencrypt/ssl-dhparams.pem ]; then
  openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048
fi

echo "==> Installing SSL nginx config for ${DOMAIN}"
cp "$SITE_SRC" "$SITE_DEST"
ln -sfn "$SITE_DEST" /etc/nginx/sites-enabled/darnozom
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# --- API subdomain (best effort) --------------------------------------------
# The main site is already live and reloaded above, so nothing below can take
# it down: the API block is only enabled after its certificate exists, and the
# config test is run before the symlink is kept.
if [ ! -f "$API_CERT_PATH" ]; then
  echo "==> Requesting certificate for ${API_DOMAIN}"
  if certbot certonly \
      --webroot \
      -w /var/www/certbot \
      -d "$API_DOMAIN" \
      --email "$EMAIL" \
      --agree-tos \
      --non-interactive \
      --keep-until-expiring; then
    echo "==> Certificate issued for ${API_DOMAIN}"
  else
    echo "!!! Could not issue a certificate for ${API_DOMAIN} (DNS not pointing here yet?)."
    echo "!!! The main site is unaffected; re-run this deploy once DNS resolves."
  fi
fi

if [ -f "$API_CERT_PATH" ] && [ -f "$API_SRC" ]; then
  echo "==> Installing nginx config for ${API_DOMAIN}"
  cp "$API_SRC" "$API_DEST"
  ln -sfn "$API_DEST" /etc/nginx/sites-enabled/darnozom-api
  if nginx -t; then
    systemctl reload nginx
    echo "==> https://${API_DOMAIN} ready"
  else
    echo "!!! nginx rejected the ${API_DOMAIN} config — reverting it and keeping the site up."
    rm -f /etc/nginx/sites-enabled/darnozom-api
    nginx -t && systemctl reload nginx
  fi
else
  echo "==> Skipping ${API_DOMAIN} server block (no certificate yet)"
fi

# --- Medusa subdomain (best effort) -----------------------------------------
if [ ! -f "$MEDUSA_CERT_PATH" ]; then
  echo "==> Requesting certificate for ${MEDUSA_DOMAIN}"
  if certbot certonly \
      --webroot \
      -w /var/www/certbot \
      -d "$MEDUSA_DOMAIN" \
      --email "$EMAIL" \
      --agree-tos \
      --non-interactive \
      --keep-until-expiring; then
    echo "==> Certificate issued for ${MEDUSA_DOMAIN}"
  else
    echo "!!! Could not issue a certificate for ${MEDUSA_DOMAIN} (DNS not pointing here yet?)."
    echo "!!! The main site is unaffected; re-run this deploy once DNS resolves."
  fi
fi

if [ -f "$MEDUSA_CERT_PATH" ] && [ -f "$MEDUSA_SRC" ]; then
  echo "==> Installing nginx config for ${MEDUSA_DOMAIN}"
  cp "$MEDUSA_SRC" "$MEDUSA_DEST"
  ln -sfn "$MEDUSA_DEST" /etc/nginx/sites-enabled/darnozom-medusa
  if nginx -t; then
    systemctl reload nginx
    echo "==> https://${MEDUSA_DOMAIN} ready"
  else
    echo "!!! nginx rejected the ${MEDUSA_DOMAIN} config — reverting it and keeping the site up."
    rm -f /etc/nginx/sites-enabled/darnozom-medusa
    nginx -t && systemctl reload nginx
  fi
else
  echo "==> Skipping ${MEDUSA_DOMAIN} server block (no certificate yet)"
fi

# Keep auto-renewal enabled
systemctl enable certbot.timer 2>/dev/null || true
systemctl start certbot.timer 2>/dev/null || true

echo "==> SSL ready for https://${DOMAIN}"
