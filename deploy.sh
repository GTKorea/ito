#!/bin/bash
set -e

# ito Production Deployment Script
# Usage: ./deploy.sh <EC2_HOST> [SSH_KEY_PATH]
#
# Example:
#   ./deploy.sh ubuntu@ec2-1-2-3-4.compute-1.amazonaws.com ~/.ssh/ito-key.pem

HOST=${1:?"Usage: ./deploy.sh <EC2_HOST> [SSH_KEY_PATH]"}
KEY=${2:-"~/.ssh/ito-key.pem"}

echo "🧵 Deploying ito to $HOST..."

SSH_CMD="ssh -i $KEY -o StrictHostKeyChecking=no $HOST"

# 1. First-time setup (skip if already done)
$SSH_CMD "command -v docker > /dev/null || (
  echo '📦 Installing Docker...'
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker \$USER
  echo '⚠️  Docker installed. Please re-run this script after logging out and back in.'
  exit 1
)"

# 2. Clone or pull repo
$SSH_CMD "
  if [ ! -d ~/ito ]; then
    echo '📥 Cloning repository...'
    git clone https://github.com/YOUR_USERNAME/ito.git ~/ito
  else
    echo '📥 Pulling latest changes...'
    cd ~/ito && git pull
  fi
"

# 3. Ensure .env.production exists
$SSH_CMD "
  if [ ! -f ~/ito/.env.production ]; then
    echo '⚠️  .env.production not found. Creating template...'
    cat > ~/ito/.env.production << 'ENVEOF'
DB_PASSWORD=CHANGE_ME_TO_STRONG_PASSWORD
JWT_SECRET=$(openssl rand -base64 48)
JWT_REFRESH_SECRET=$(openssl rand -base64 48)
RESEND_API_KEY=
RESEND_FROM=
ENVEOF
    echo '⚠️  Edit ~/ito/.env.production with your values, then re-run this script.'
    exit 1
  fi
"

# 4. Build and deploy
$SSH_CMD "
  cd ~/ito
  echo '🔨 Building and starting services...'
  docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

  echo '⏳ Waiting for database...'
  sleep 5

  echo '🗄️ Running database migrations...'
  docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy

  echo ''
  echo '✅ Deployment complete!'
  echo '   API: https://api.ito.krow.kr'
  echo '   Docs: https://api.ito.krow.kr/api/docs'
  echo ''
  docker compose -f docker-compose.prod.yml ps
"
