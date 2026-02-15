#!/bin/bash
# YMH Backend Deploy Script for Google Cloud VM
# Usage: bash deploy.sh

set -e

echo "🚀 YMH Backend Deploy Starting..."

# 1. System Updates
echo "📦 Installing system dependencies..."
sudo apt-get update -y
sudo apt-get install -y curl git nginx build-essential python3

# 2. Install Node.js 20 LTS
echo "🟢 Installing Node.js 20..."
if ! command -v node &> /dev/null || [[ $(node -v) != v20* ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
echo "Node: $(node -v)"
echo "NPM: $(npm -v)"

# 3. Install PM2 (Process Manager)
echo "⚙️ Installing PM2..."
sudo npm install -g pm2

# 4. Create app directory
echo "📁 Setting up app directory..."
sudo mkdir -p /opt/ymh-backend
sudo chown $USER:$USER /opt/ymh-backend

# 5. Copy backend files (will be done via scp before running this script)
# Files should already be in /opt/ymh-backend at this point

# 6. Install dependencies
echo "📦 Installing app dependencies..."
cd /opt/ymh-backend
npm ci --omit=dev  # Install only production dependencies

# 7. Build (Skipped - using pre-built dist)
# echo "🏗️ Building..."
# npm run build

# 8. Start with PM2
echo "🚀 Starting app with PM2..."
pm2 delete ymh-backend 2>/dev/null || true
pm2 start dist/main.js --name ymh-backend --env production
pm2 save
pm2 startup systemd -u $USER --hp /home/$USER 2>/dev/null || true

# 9. Setup Nginx reverse proxy
echo "🌐 Configuring Nginx..."
sudo tee /etc/nginx/sites-available/ymh-backend > /dev/null <<'NGINX'
server {
    listen 80;
    server_name _;
    
    client_max_body_size 20M;

    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
    }

    location / {
        return 200 '{"status":"ok","service":"YMH Saha Backend"}';
        add_header Content-Type application/json;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/ymh-backend /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
sudo systemctl enable nginx

echo ""
echo "✅ Deploy Complete!"
echo "📍 Backend running at: http://$(curl -s ifconfig.me):80/api/v1"
echo "🔧 PM2 Status:"
pm2 status
