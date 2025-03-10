#!/bin/bash

# Update system
sudo yum update && sudo yum upgrade -y

# Install Apache
sudo yum install -y httpd mod_proxy mod_proxy_http mod_proxy_wstunnel

# Enable and start Apache
sudo systemctl enable httpd
sudo systemctl start httpd

# Install Node.js and npm
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install EPEL repository
sudo yum install -y epel-release
sudo amazon-linux-extras install epel -y

# Install FFmpeg from EPEL
sudo yum install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm
sudo yum localinstall -y --nogpgcheck https://download1.rpmfusion.org/free/el/rpmfusion-free-release-7.noarch.rpm
sudo yum install -y ffmpeg ffmpeg-devel

# Install Chrome dependencies
sudo yum install -y \
    alsa-lib.x86_64 \
    atk.x86_64 \
    cups-libs.x86_64 \
    gtk3.x86_64 \
    ipa-gothic-fonts \
    libXcomposite.x86_64 \
    libXcursor.x86_64 \
    libXdamage.x86_64 \
    libXext.x86_64 \
    libXi.x86_64 \
    libXrandr.x86_64 \
    libXScrnSaver.x86_64 \
    libXtst.x86_64 \
    pango.x86_64 \
    xorg-x11-fonts-100dpi \
    xorg-x11-fonts-75dpi \
    xorg-x11-fonts-cyrillic \
    xorg-x11-fonts-misc \
    xorg-x11-fonts-Type1 \
    xorg-x11-utils \
    nss.x86_64

# Install PM2 globally
sudo npm install -p pm2@latest -g

# Configure Apache
sudo cp whatsapp-bot.conf /etc/httpd/conf.d/
sudo systemctl restart httpd

# Create required directories
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