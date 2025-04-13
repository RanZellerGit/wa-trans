# Deployment Guide

## Setting up EC2 Instance

1. Launch an EC2 instance with Amazon Linux 2 AMI
2. Instance type recommendation: t2.medium or larger
3. Configure security group to allow inbound traffic on ports 22 (SSH) and 80 (HTTP)
4. Create and download a key pair for SSH access

## Initial Server Setup

1. SSH into your EC2 instance:

   ```
   ssh -i your-key.pem ec2-user@your-instance-ip
   ```

2. Make the setup script executable and run it:
   ```
   chmod +x scripts/ec2-setup.sh
   ./scripts/ec2-setup.sh
   ```
   **Important**: Before running, edit the script to use your actual GitHub and DockerHub usernames.

## GitHub and DockerHub Secrets Configuration

Add the following secrets to your GitHub repository:

1. `DOCKER_USERNAME`: Your DockerHub username
2. `DOCKER_TOKEN`: Your DockerHub access token (create one in DockerHub account settings)
3. `AWS_ACCESS_KEY_ID`: Your AWS access key
4. `AWS_SECRET_ACCESS_KEY`: Your AWS secret access key
5. `AWS_REGION`: Your AWS region (e.g., us-east-1)
6. `EC2_HOST`: Your EC2 instance public IP or DNS
7. `EC2_USERNAME`: Usually 'ec2-user' for Amazon Linux
8. `EC2_SSH_KEY`: The content of your private SSH key

## How It Works

1. When you push code to the main branch, GitHub Actions is triggered
2. The workflow builds your Docker image and pushes it to DockerHub
3. Then it connects to your EC2 instance
4. Pulls the latest code from your repository
5. Uses docker-compose to pull the latest Docker image from DockerHub
6. Stops the old container and starts a new one with the updated image

## Troubleshooting

- Check GitHub Actions logs for deployment errors
- SSH into the EC2 instance to check Docker container status:

  ```
  docker ps -a
  docker-compose logs
  ```

- To manually restart the container:
  ```
  cd /home/ec2-user/whatsapp-web
  docker-compose down
  docker-compose up -d
  ```
