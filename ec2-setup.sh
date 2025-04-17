#!/bin/bash


# --- Configuration ---
GITHUB_URL="https://github.com/RanZellerGit/wa-trans"
RUNNER_TOKEN='AC72Q3SZ7RP2O4S3YIWU7P3H7XWKY'
RUNNER_NAME="ec2-runner-$(hostname -s)"
RUNNER_WORKDIR="_work"
RUNNER_USER="ubuntu" # User to run the runner service as (must exist)
RUNNER_GROUP="ubuntu" # Group for the runner service user
# --- End Configuration ---


apt-get update -y
apt-get install -y jq libicu-dev awscli # Added awscli for the SSM example
apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker’s official GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository to APT sources
echo \
  "deb [arch=$(dpkg --print-architecture) \
  signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update package list again and install Docker
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add 'ubuntu' user to the 'docker' group so it can run docker commands without sudo
usermod -aG docker ubuntu

# Optional: Enable Docker to start on boot
systemctl enable docker

# ------------------------
# Install AWS CLI v2
# ------------------------

# Download and install AWS CLI v2 (latest)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip"
unzip /tmp/awscliv2.zip -d /tmp
/tmp/aws/install

# Verify aws command works (optional logging)
aws --version >> /var/log/user-data.log 2>&1

sudo -u ubuntu bash <<EOF
echo "Running as: \$(whoami)"
echo "Current directory: \$(pwd)"
mkdir /home/ubuntu/actions-runner
cd /home/ubuntu/actions-runner
echo "Current directory: \$(pwd)"
LATEST_VERSION='2.323.0'
curl -o actions-runner-linux-x64-2.323.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.323.0/actions-runner-linux-x64-2.323.0.tar.gz

# Extract the installer (as root)
tar xzf ./actions-runner-linux-x64-2.323.0.tar.gz
rm ./actions-runner-linux-x64-2.323.0.tar.gz

# Configure the runner (run AS the RUNNER_USER)
# Note: --unattended prevents interactive prompts
# Consider adding labels with --labels linux,ec2,amd64 etc.
./config.sh --url ${GITHUB_URL} --token ${RUNNER_TOKEN} --work "${RUNNER_WORKDIR}" --runnergroup "default" --replace

echo "GitHub Actions Runner configuration complete."
EOF




#!/bin/bash


# --- Configuration ---
GITHUB_URL="https://github.com/RanZellerGit/wa-trans"
RUNNER_TOKEN='AC72Q3SZ7RP2O4S3YIWU7P3H7XWKY'
RUNNER_NAME="ec2-runner-$(hostname -s)"
RUNNER_WORKDIR="_work"
RUNNER_USER="ubuntu" # User to run the runner service as (must exist)
RUNNER_GROUP="ubuntu" # Group for the runner service user
# --- End Configuration ---


apt-get update -y
apt-get install -y jq libicu-dev awscli # Added awscli for the SSM example
apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    unzip \
    python3 \
    python3-pip

# Add Docker’s official GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository to APT sources
echo \
  "deb [arch=$(dpkg --print-architecture) \
  signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update package list again and install Docker
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add 'ubuntu' user to the 'docker' group so it can run docker commands without sudo
usermod -aG docker ubuntu

# Optional: Enable Docker to start on boot
systemctl enable docker

# ------------------------
# Install AWS CLI v2
# ------------------------

# Download and install AWS CLI v2 (latest)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip"
unzip /tmp/awscliv2.zip -d /tmp
/tmp/aws/install

# Verify aws command works (optional logging)
aws --version >> /var/log/user-data.log 2>&1

sudo -u ubuntu bash <<EOF
echo "Running as: \$(whoami)"
echo "Current directory: \$(pwd)"
mkdir /home/ubuntu/actions-runner
cd /home/ubuntu/actions-runner
echo "Current directory: \$(pwd)"
LATEST_VERSION='2.323.0'
curl -o actions-runner-linux-x64-2.323.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.323.0/actions-runner-linux-x64-2.323.0.tar.gz

# Extract the installer (as root)
tar xzf ./actions-runner-linux-x64-2.323.0.tar.gz
rm ./actions-runner-linux-x64-2.323.0.tar.gz

# Configure the runner (run AS the RUNNER_USER)
# Note: --unattended prevents interactive prompts
# Consider adding labels with --labels linux,ec2,amd64 etc.
./config.sh --url ${GITHUB_URL} --token ${RUNNER_TOKEN} --work "${RUNNER_WORKDIR}" --runnergroup "default" --replace

echo "GitHub Actions Runner configuration complete."
EOF