#!/usr/bin/env bash
# Obtain / renew Let's Encrypt certs and install nginx SSL config.
# Safe to run on every deploy.
set -euo pipefail

DOMAIN="${DEPLOY_DOMAIN:-darnozom.com}"
EMAIL="${DEPLOY_SSL_EMAIL:-info@darnozom.com}"
WWW_DOMAIN="www.${DOMAIN}"
SITE_SRC="${1:-deploy/nginx.conf}"
BOOTSTRAP_SRC="${2:-deploy/nginx.bootstrap.conf}"
SITE_DEST="/etc/nginx/sites-available/darnozom"
CERT_PATH="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"

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

echo "==> Installing SSL nginx config"
cp "$SITE_SRC" "$SITE_DEST"
ln -sfn "$SITE_DEST" /etc/nginx/sites-enabled/darnozom
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# Keep auto-renewal enabled
systemctl enable certbot.timer 2>/dev/null || true
systemctl start certbot.timer 2>/dev/null || true

echo "==> SSL ready for https://${DOMAIN}"
