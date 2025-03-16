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

sudo -H -u ec2-user bash -c 'cd /home/ec2-user/wa-trans && \
    export OPENAI_API_KEY=$(aws ssm get-parameter --name /wa-bot/openAiApi --with-decryption --query "Parameter.Value" --output text) && \
    export DB_USER=$(aws ssm get-parameter --name /wa-bot/db_user --with-decryption --query "Parameter.Value" --output text) && \
    export DB_PASSWORD=$(aws ssm get-parameter --name /wa-bot/db_password --with-decryption --query "Parameter.Value" --output text) && \
    export DB_NAME=$(aws ssm get-parameter --name /wa-bot/db_name --with-decryption --query "Parameter.Value" --output text) && \
    export NODE_ENV="production" && \
    export PORT="3000" && \
    npm install && \
    npm run prod'