#! /bin/bash
# git pull

# # Install dependencies
# npm install

# # Stop any existing instances
pm2 stop whatsapp-bot
pm2 delete whatsapp-bot

# # Clear PM2 logs
pm2 flush

# cd /home/ec2-user/wa-trans
# Start nginx service


pm2 start ecosystem.config.js 
nginx -g 'daemon off;' 

