#!/bin/bash
set -e

# krow.kr Multi-Service Deployment Script
# ========================================
# Usage:
#   ./deploy.sh <EC2_HOST> [OPTIONS]
#
# Options:
#   --key <path>          SSH key path (default: ~/.ssh/ito-key.pem)
#   --service <name>      Deploy only a specific service (e.g., ito-api)
#   --all                 Deploy all services (default)
#   --setup               First-time server setup (Docker, swap)
#
# Examples:
#   ./deploy.sh ubuntu@1.2.3.4 --setup                 # First-time setup
#   ./deploy.sh ubuntu@1.2.3.4                          # Deploy all
#   ./deploy.sh ubuntu@1.2.3.4 --service ito-api        # Deploy ito-api only

HOST=""
KEY="~/.ssh/ito-key.pem"
SERVICE=""
SETUP=false
REPO_URL="https://github.com/GTKorea/ito.git"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --key) KEY="$2"; shift 2 ;;
    --service) SERVICE="$2"; shift 2 ;;
    --all) SERVICE=""; shift ;;
    --setup) SETUP=true; shift ;;
    -*) echo "Unknown option: $1"; exit 1 ;;
    *) HOST="$1"; shift ;;
  esac
done

if [ -z "$HOST" ]; then
  echo "Usage: ./deploy.sh <EC2_HOST> [--key path] [--service name] [--setup]"
  exit 1
fi

SSH_CMD="ssh -i $KEY -o StrictHostKeyChecking=no $HOST"

# ── First-time setup ─────────────────────────
if [ "$SETUP" = true ]; then
  echo "🔧 Running first-time server setup..."

  $SSH_CMD "
    # Install Docker
    if ! command -v docker &> /dev/null; then
      echo '📦 Installing Docker...'
      curl -fsSL https://get.docker.com | sh
      sudo usermod -aG docker \$USER
      echo '✅ Docker installed. Please log out and back in, then re-run without --setup.'
      exit 0
    fi

    # Add 2GB swap if not exists
    if [ ! -f /swapfile ]; then
      echo '💾 Creating 2GB swap file...'
      sudo fallocate -l 2G /swapfile
      sudo chmod 600 /swapfile
      sudo mkswap /swapfile
      sudo swapon /swapfile
      echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
      echo '✅ Swap enabled'
    else
      echo '✅ Swap already exists'
    fi

    echo '🔧 Setup complete!'
  "
  exit 0
fi

# ── Deploy ────────────────────────────────────
echo "🧵 Deploying to $HOST..."

# 1. Clone or pull repo
$SSH_CMD "
  if [ ! -d ~/ito ]; then
    echo '📥 Cloning repository...'
    git clone $REPO_URL ~/ito
  else
    echo '📥 Pulling latest changes...'
    cd ~/ito && git pull
  fi
"

# 2. Ensure .env.production exists
$SSH_CMD "
  if [ ! -f ~/ito/.env.production ]; then
    echo '⚠️  .env.production not found. Creating from template...'
    cp ~/ito/env-production-template ~/ito/.env.production

    # Generate random secrets
    sed -i \"s/CHANGE_ME_TO_STRONG_PASSWORD/\$(openssl rand -base64 32)/g\" ~/ito/.env.production
    sed -i \"s/CHANGE_ME_RANDOM_64_CHARS/\$(openssl rand -base64 48)/g\" ~/ito/.env.production

    echo '⚠️  Edit ~/ito/.env.production with your OAuth credentials, then re-run.'
    exit 1
  fi
"

# 3. Build and deploy
if [ -n "$SERVICE" ]; then
  echo "🔨 Deploying service: $SERVICE"
  $SSH_CMD "
    cd ~/ito
    docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build --no-deps $SERVICE
  "
else
  echo "🔨 Deploying all services..."
  $SSH_CMD "
    cd ~/ito
    docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
  "
fi

# 4. Run migrations (ito-api)
if [ -z "$SERVICE" ] || [ "$SERVICE" = "ito-api" ]; then
  echo "⏳ Waiting for database..."
  sleep 5
  $SSH_CMD "
    cd ~/ito
    docker compose -f docker-compose.prod.yml exec ito-api npx prisma migrate deploy
  "
fi

# 5. Health check
echo ""
echo "🏥 Health check..."
sleep 3
$SSH_CMD "
  cd ~/ito
  docker compose -f docker-compose.prod.yml ps
  echo ''

  # Check if API responds
  if curl -sf https://api.ito.krow.kr/api/docs > /dev/null 2>&1; then
    echo '✅ API is responding at https://api.ito.krow.kr'
  else
    echo '⚠️  API not yet responding (Caddy may still be getting TLS cert)'
  fi
"

echo ""
echo "✅ Deployment complete!"
echo "   API:      https://api.ito.krow.kr"
echo "   Swagger:  https://api.ito.krow.kr/api/docs"
echo "   Frontend: https://ito.krow.kr"
