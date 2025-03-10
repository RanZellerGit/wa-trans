#!/bin/bash

# Pull latest changes
git pull

# Install dependencies
npm install

# Restart the application
pm2 restart whatsapp-bot 