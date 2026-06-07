#!/usr/bin/env bash
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# CoreCity â€” Let's Encrypt / Certbot TLS Setup
#
# Usage:
#   chmod +x nginx/certbot-setup.sh
#   sudo ./nginx/certbot-setup.sh [--domain corecity.com.ng] [--staging]
#
# What it does:
#   1. Installs certbot if not present (snap)
#   2. Obtains a certificate (standalone mode â€” stops nginx temporarily if running)
#   3. Copies fullchain.pem + privkey.pem into ./nginx/certs/
#   4. Sets up a cron job for automatic renewal
#   5. Optionally generates a self-signed cert for local dev (--self-signed)
#
# Flags:
#   --domain   <name>   Primary domain (default: corecity.com.ng)
#   --staging           Use Let's Encrypt staging server (won't hit rate limits)
#   --self-signed       Generate a self-signed cert for local testing, skip certbot
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

set -euo pipefail

# â”€â”€ Defaults â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
DOMAIN="corecity.com.ng"
EXTRA_DOMAINS="www.corecity.com.ng api.corecity.com.ng"
EMAIL="admin@corecity.com.ng"
STAGING=false
SELF_SIGNED=false
CERTS_DIR="$(cd "$(dirname "$0")/certs" && pwd)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# â”€â”€ Argument parsing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)      DOMAIN="$2";      shift 2 ;;
    --email)       EMAIL="$2";       shift 2 ;;
    --staging)     STAGING=true;     shift   ;;
    --self-signed) SELF_SIGNED=true; shift   ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

echo ""
echo "â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—"
echo "â•‘       CoreCity TLS Certificate Setup                â•‘"
echo "â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•"
echo ""
echo "  Domain   : $DOMAIN"
echo "  Certs dir: $CERTS_DIR"
echo "  Staging  : $STAGING"
echo "  Self-sig : $SELF_SIGNED"
echo ""

mkdir -p "$CERTS_DIR"

# â”€â”€ Self-signed mode (local dev) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
if [ "$SELF_SIGNED" = "true" ]; then
  echo "â†’ Generating self-signed certificate for local testingâ€¦"
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$CERTS_DIR/privkey.pem" \
    -out    "$CERTS_DIR/fullchain.pem" \
    -subj "/CN=$DOMAIN/O=CoreCity/C=NG" \
    -addext "subjectAltName=DNS:$DOMAIN,DNS:localhost"
  chmod 644 "$CERTS_DIR/fullchain.pem" "$CERTS_DIR/privkey.pem"
  echo ""
  echo "âœ…  Self-signed certificate created in $CERTS_DIR"
  echo "    NOTE: Browsers will show a security warning â€” this is normal for local dev."
  exit 0
fi

# â”€â”€ Production: Let's Encrypt via certbot â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

# Check root
if [ "$(id -u)" != "0" ]; then
  echo "âŒ  This script must be run as root (sudo) for certbot to bind port 80."
  exit 1
fi

# Install certbot if missing
if ! command -v certbot &>/dev/null; then
  echo "â†’ Installing certbot via snapâ€¦"
  snap install --classic certbot
  ln -sf /snap/bin/certbot /usr/bin/certbot
fi

# Build -d flags
DOMAIN_FLAGS="-d $DOMAIN"
for d in $EXTRA_DOMAINS; do
  DOMAIN_FLAGS="$DOMAIN_FLAGS -d $d"
done

STAGING_FLAG=""
if [ "$STAGING" = "true" ]; then
  STAGING_FLAG="--staging"
  echo "âš   STAGING mode â€” certificate will NOT be trusted by browsers."
fi

# Stop the ssl-proxy container temporarily so certbot can bind port 80
echo "â†’ Stopping ssl-proxy container temporarily (if running)â€¦"
docker stop corecity-ssl-proxy 2>/dev/null || true

echo "â†’ Running certbot (standalone mode)â€¦"
certbot certonly \
  --standalone \
  --non-interactive \
  --agree-tos \
  --expand \
  --email "$EMAIL" \
  $STAGING_FLAG \
  $DOMAIN_FLAGS

LIVE_DIR="/etc/letsencrypt/live/$DOMAIN"

echo "â†’ Copying certificates to $CERTS_DIRâ€¦"
cp "$LIVE_DIR/fullchain.pem" "$CERTS_DIR/fullchain.pem"
cp "$LIVE_DIR/privkey.pem"   "$CERTS_DIR/privkey.pem"
chmod 644 "$CERTS_DIR/fullchain.pem"
chmod 600 "$CERTS_DIR/privkey.pem"

echo "â†’ Restarting ssl-proxy containerâ€¦"
docker start corecity-ssl-proxy 2>/dev/null || true

# â”€â”€ Auto-renewal cron job â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
RENEW_SCRIPT="/etc/cron.d/corecity-certbot-renew"
DEPLOY_HOOK="cp $LIVE_DIR/fullchain.pem $CERTS_DIR/fullchain.pem && \
             cp $LIVE_DIR/privkey.pem $CERTS_DIR/privkey.pem && \
             chmod 644 $CERTS_DIR/fullchain.pem && \
             chmod 600 $CERTS_DIR/privkey.pem && \
             docker exec corecity-ssl-proxy nginx -s reload"

cat > "$RENEW_SCRIPT" <<EOF
# CoreCity automatic TLS renewal â€” twice daily at 02:30 and 14:30
30 2,14 * * * root certbot renew --quiet --deploy-hook "$DEPLOY_HOOK"
EOF
chmod 644 "$RENEW_SCRIPT"

echo ""
echo "â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—"
echo "â•‘  âœ…  TLS certificates installed successfully!        â•‘"
echo "â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•"
echo ""
echo "  Certificate : $CERTS_DIR/fullchain.pem"
echo "  Private key : $CERTS_DIR/privkey.pem"
echo "  Auto-renew  : $RENEW_SCRIPT (runs twice daily)"
echo ""
echo "  Start the stack: docker compose up -d"
echo ""
