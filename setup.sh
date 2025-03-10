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

# Install dependencies
npm install

# Start the application
npm run prod 