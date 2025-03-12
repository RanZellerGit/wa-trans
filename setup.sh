#!/bin/bash

# Initialize logging
LOG_FILE="/tmp/setup-status.log"
echo "Setup script started at $(date)" > $LOG_FILE

log_step() {
    echo "$(date): $1" >> $LOG_FILE
    echo "$1"
}

# System update
log_step "Starting system update..."
sudo yum update && sudo yum upgrade -y
log_step "System update completed"

# Apache installation
log_step "Installing Apache and dependencies..."
sudo yum install -y httpd
sudo yum install -y git expect
log_step "Apache installation completed"

# Start Apache
log_step "Starting Apache service..."
sudo systemctl enable httpd
sudo systemctl start httpd
log_step "Apache service started"

# Node.js installation
log_step "Installing Node.js..."
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
log_step "Node.js installation completed"

# EPEL repository
log_step "Setting up EPEL repository..."
sudo yum install -y epel-release
sudo amazon-linux-extras install epel -y
log_step "EPEL repository setup completed"

# FFmpeg installation
log_step "Installing FFmpeg..."
sudo yum install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm
sudo yum localinstall -y --nogpgcheck https://download1.rpmfusion.org/free/el/rpmfusion-free-release-7.noarch.rpm
sudo yum install -y ffmpeg ffmpeg-devel
log_step "FFmpeg installation completed"

# Chrome dependencies
log_step "Installing Chrome dependencies..."
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
log_step "Chrome dependencies installation completed"

# PM2 installation
log_step "Installing PM2..."
sudo npm install -p pm2@latest -g
log_step "PM2 installation completed"

# Apache configuration
log_step "Configuring Apache..."
sudo cp vhost.conf /etc/httpd/conf.d/
sudo systemctl restart httpd
log_step "Apache configuration completed"

# Project setup
log_step "Setting up project..."
KEY=`aws ssm get-parameter --name /wa-bot/rsa_id --with-decryption --query 'Parameter.Value' --output text`
cat > /home/ec2-user/.ssh/id_rsa << EOL
-----BEGIN OPENSSH PRIVATE KEY-----
${KEY}
-----END OPENSSH PRIVATE KEY-----
EOL
chmod 600 /home/ec2-user/.ssh/id_rsa
chown ec2-user:ec2-user /home/ec2-user/.ssh/id_rsa
ssh-keyscan github.com >> /home/ec2-user/.ssh/known_hosts

# Directory setup
log_step "Creating directories..."
mkdir -p logs
mkdir -p .wwebjs_auth
chmod -R 755 .wwebjs_auth
log_step "Directories created"

# Environment setup
log_step "Setting up environment..."
export OPENAI_API_KEY=`aws ssm get-parameter --name /wa-bot/openAiApi --with-decryption --query 'Parameter.Value' --output text`
export NODE_ENV="production"
export PORT="3000"

# Dependencies installation
log_step "Installing npm dependencies..."
npm install
log_step "Dependencies installed"

# Start application
log_step "Starting application..."
npm run prod
log_step "Application started"

# Final status
log_step "Setup completed successfully at $(date)"

# Create health check file
echo "Setup completed successfully at $(date)" > /var/www/html/health.html

# Print log location
echo "Full setup log available at: $LOG_FILE"