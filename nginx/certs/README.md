# Place your TLS certificate files here before running docker-compose.
#
# Required files:
#   fullchain.pem  — full certificate chain (cert + intermediates)
#   privkey.pem    — private key
#
# Let's Encrypt (certbot) quickstart:
#   sudo certbot certonly --standalone -d corecity.com.ng -d www.corecity.com.ng
#   sudo cp /etc/letsencrypt/live/corecity.com.ng/fullchain.pem ./nginx/certs/
#   sudo cp /etc/letsencrypt/live/corecity.com.ng/privkey.pem   ./nginx/certs/
#   sudo chmod 644 ./nginx/certs/*.pem
#
# For local testing with self-signed certs:
#   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
#     -keyout ./nginx/certs/privkey.pem \
#     -out    ./nginx/certs/fullchain.pem \
#     -subj "/CN=localhost"
#
# NEVER commit actual certificates or private keys to version control.
# These files are ignored via .gitignore.
