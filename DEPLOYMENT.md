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

## GitHub Secrets Configuration

Add the following secrets to your GitHub repository:

1. `AWS_ACCESS_KEY_ID`: Your AWS access key
2. `AWS_SECRET_ACCESS_KEY`: Your AWS secret access key
3. `AWS_REGION`: Your AWS region (e.g., us-east-1)
4. `EC2_HOST`: Your EC2 instance public IP or DNS
5. `EC2_USERNAME`: Usually 'ec2-user' for Amazon Linux
6. `EC2_SSH_KEY`: The content of your private SSH key

## How It Works

1. When you push code to the main branch, GitHub Actions is triggered
2. The workflow connects to your EC2 instance
3. It pulls the latest code from your repository
4. Rebuilds the Docker image
5. Stops and removes the old container
6. Starts a new container with the updated code

## Troubleshooting

- Check GitHub Actions logs for deployment errors
- SSH into the EC2 instance to check Docker container status:
  ```
  docker ps -a
  docker logs whatsapp-container
  ```
