# Setting Up GitHub Runner on EC2

This guide explains how to set up a GitHub Actions self-hosted runner on an EC2 instance using the provided cloud-init script.

## Prerequisites

1. AWS account with access to create EC2 instances
2. GitHub repository with permissions to add runners

## Steps to Deploy

### 1. Get GitHub Runner Token

1. Go to your GitHub repository
2. Navigate to Settings > Actions > Runners
3. Click "New self-hosted runner"
4. Copy the token from the configuration section (it looks like `ABCDEF1234567890ABCDEF1234567890ABCDEF12`)

### 2. Update cloud-init.sh

1. Edit `.github/workflows/cloud-init.sh`
2. Replace `YOUR_GITHUB_RUNNER_TOKEN` with the token you copied
3. Modify `GITHUB_OWNER` and `GITHUB_REPO` if needed

### 3. Launch EC2 Instance with User Data

1. Go to AWS EC2 console
2. Click "Launch Instance"
3. Select Amazon Linux 2023, Ubuntu, or another Linux AMI
4. Choose instance type (t2.micro for testing, or larger for production workloads)
5. Configure instance details:

   - In the "Advanced Details" section, paste the entire content of the `cloud-init.sh` file into the "User data" field

6. Configure storage (at least 20 GB recommended)
7. Configure security group:

   - Allow SSH (port 22) from your IP
   - Add any other required ports for your application

8. Launch the instance with your key pair

### 4. Verify Runner Setup

1. Wait for the instance to start and initialize (approximately 3-5 minutes)
2. Check in GitHub repository under Settings > Actions > Runners
3. Your new runner should appear with the hostname and "online" status

## Notes

- The runner will automatically register with your repository
- Docker is pre-installed for container-based workflows
- Node.js is installed for JavaScript/TypeScript applications
- The runner service will start automatically on instance boot
- Your repository code is pre-cloned into `/home/github-runner/workspace/`

## Troubleshooting

If the runner doesn't appear in GitHub:

1. SSH into the instance: `ssh ec2-user@your-instance-ip`
2. Check the runner logs:
   ```
   sudo -u github-runner cat /home/github-runner/actions-runner/_diag/Runner_*.log
   ```
3. Restart the runner service:
   ```
   cd /home/github-runner/actions-runner
   sudo ./svc.sh restart
   ```
