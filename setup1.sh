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
yum update && yum upgrade -y
log_step "System update completed"

# Apache installation
log_step "Installing Apache and dependencies..."
yum install -y httpd
yum install -y git expect
yum install -y cronie crontabs
log_step "Apache installation completed"

# Start Apache
log_step "Starting Apache service..."
systemctl enable httpd
systemctl start httpd
log_step "Apache service started"

# Node.js installation
log_step "Installing Node.js..."
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs
log_step "Node.js installation completed"

# EPEL repository
log_step "Setting up EPEL repository..."
yum install -y epel-release
amazon-linux-extras install epel -y
log_step "EPEL repository setup completed"

# FFmpeg installation
log_step "Installing FFmpeg..."
yum install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm
yum localinstall -y --nogpgcheck https://download1.rpmfusion.org/free/el/rpmfusion-free-release-7.noarch.rpm
yum install -y ffmpeg ffmpeg-devel
log_step "FFmpeg installation completed"

# Chrome dependencies
log_step "Installing Chrome dependencies..."
yum install -y \
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
npm install -p pm2@latest -g
log_step "PM2 installation completed"


# Project setup
log_step "Setting up project..."

# Create directories and set permissions as root first
mkdir -p /home/ec2-user/.ssh
chmod 700 /home/ec2-user/.ssh

# Get and store the SSH key
-H -u ec2-user bash -c 'aws ssm get-parameter \
    --name /wa-bot/rsa_id \
    --with-decryption \
    --query "Parameter.Value" \
    --output text > /home/ec2-user/.ssh/id_rsa'

# Set correct permissions and ownership
chmod 600 /home/ec2-user/.ssh/id_rsa
chown -R ec2-user:ec2-user /home/ec2-user/.ssh

# Remove any existing repository directory
-H -u ec2-user bash -c 'rm -rf /home/ec2-user/wa-trans'

# Clone repository as ec2-user
-H -u ec2-user bash -c 'cd /home/ec2-user && GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=no" git clone git@github.com:RanZellerGit/wa-trans.git'

# Change to project directory and install dependencies as ec2-user
-H -u ec2-user bash -c 'cd /home/ec2-user/wa-trans && npm install'

# Install PM2 globally for ec2-user
-H -u ec2-user npm install -g pm2

# Create PM2 directories and set permissions
mkdir -p /home/ec2-user/.pm2
chown -R ec2-user:ec2-user /home/ec2-user/.pm2

# If PM2 is running, stop it and delete old process
-H -u ec2-user bash -c 'pm2 kill || true'
rm -rf /root/.pm2  # Remove any root-owned PM2 files

# Start PM2 daemon as ec2-user
-H -u ec2-user bash -c 'pm2 startup'
env PATH=$PATH:/usr/bin pm2 startup systemd -u ec2-user --hp /home/ec2-user

log_step "Project cloned successfully"

# Apache configuration
log_step "Configuring Apache..."
cp /home/ec2-user/wa-trans/vhost.conf /etc/httpd/conf.d/
systemctl restart httpd
log_step "Apache configuration completed"

# Directory setup
log_step "Creating directories..."
mkdir -p logs
mkdir -p .wwebjs_auth
chmod -R 755 .wwebjs_auth
log_step "Directories created"

# Environment setup and application start
log_step "Setting up environment and starting application..."
-H -u ec2-user bash -c 'cd /home/ec2-user/wa-trans && \
    export OPENAI_API_KEY=$(aws ssm get-parameter --name /wa-bot/openAiApi --with-decryption --query "Parameter.Value" --output text) && \
    export DB_USER=$(aws ssm get-parameter --name /wa-bot/db_user --with-decryption --query "Parameter.Value" --output text) && \
    export DB_PASSWORD=$(aws ssm get-parameter --name /wa-bot/db_password --with-decryption --query "Parameter.Value" --output text) && \
    export DB_NAME=$(aws ssm get-parameter --name /wa-bot/db_name --with-decryption --query "Parameter.Value" --output text) && \
    export NODE_ENV="production" && \
    export PORT="3000" && \
    npm install && \
    npm run prod'

# Setup startup script for the application
log_step "Setting up startup script..."
STARTUP_SCRIPT="/home/ec2-user/start-wa-trans.sh"
cat << 'EOF' | tee $STARTUP_SCRIPT > /dev/null
#!/bin/bash
cd /home/ec2-user/wa-trans
export OPENAI_API_KEY=$(aws ssm get-parameter --name /wa-bot/openAiApi --with-decryption --query "Parameter.Value" --output text)
export DB_USER=$(aws ssm get-parameter --name /wa-bot/db_user --with-decryption --query "Parameter.Value" --output text)
export DB_PASSWORD=$(aws ssm get-parameter --name /wa-bot/db_password --with-decryption --query "Parameter.Value" --output text)
export DB_NAME=$(aws ssm get-parameter --name /wa-bot/db_name --with-decryption --query "Parameter.Value" --output text)
export NODE_ENV="production"
export PORT="3000"
npm run prod >> /home/ec2-user/wa-trans/logs/startup.log 2>&1
EOF

# Set proper permissions
chmod +x $STARTUP_SCRIPT
chown ec2-user:ec2-user $STARTUP_SCRIPT

# Setup cron job to run the startup script at reboot
log_step "Setting up startup cron job..."
(-u ec2-user crontab -l 2>/dev/null; echo "@reboot $STARTUP_SCRIPT") | -u ec2-user sort - | -u ec2-user uniq - | -u ec2-user crontab -

# Final status
log_step "Setup completed successfully at $(date)"

# Create health check file
echo "Setup completed successfully at $(date)" > /var/www/html/health.html

# Print log location
echo "Full setup log available at: $LOG_FILE"

