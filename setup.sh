#!/bin/bash

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install FFmpeg
sudo apt-get install -y ffmpeg

# Install PM2 globally
sudo npm install -p pm2@latest -g

# Create logs directory
mkdir -p logs
mkdir -p .wwebjs_auth

# Set proper permissions
chmod -R 755 .wwebjs_auth

# Set environment variables
export OPENAI_API_KEY="sk-your-production-api-key-here"
export NODE_ENV="production"
export PORT="3001"

# Create PM2 ecosystem file from template
cat > ecosystem.config.js << EOL
module.exports = {
  apps: [{
    name: "whatsapp-bot",
    script: "index.js",
    watch: true,
    env: {
      NODE_ENV: "production",
      PORT: 3001,
      OPENAI_API_KEY: "${OPENAI_API_KEY}"
    },
    error_file: "logs/err.log",
    out_file: "logs/out.log",
    log_file: "logs/combined.log",
    time: true
  }]
};
EOL

# Install dependencies
npm install

# Start the application
npm run prod 