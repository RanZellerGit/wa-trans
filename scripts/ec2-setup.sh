#!/bin/bash

# Update packages
sudo yum update -y

# Install git
sudo yum install -y git

# Install Docker
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# Clone the repository
git clone https://github.com/YOUR_USERNAME/whatsapp-web.git
cd whatsapp-web

# Build and run the Docker container
sudo docker build -t whatsapp-web .
sudo docker run -d --name whatsapp-container -p 80:3000 whatsapp-web

# Print success message
echo "Setup complete. Application is running on port 80." 