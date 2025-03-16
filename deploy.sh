#!/bin/bash

# Pull latest changes
git pull

# Install dependencies
npm install

# Stop any existing instances
pm2 stop whatsapp-bot
pm2 delete whatsapp-bot

# Clear PM2 logs
pm2 flush

cd /home/ec2-user/wa-trans

pm2 start ecosystem.config.js 