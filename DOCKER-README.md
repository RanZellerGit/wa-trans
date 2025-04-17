# Docker Compose Configuration

This project provides multiple Docker Compose configurations for different environments:

## Available Configurations

1. **docker-compose.yml** - Base configuration that can be used in any environment
2. **docker-compose.dev.yml** - Development environment with live code reloading
3. **docker-compose.prod.yml** - Production environment optimized for deployment

## Usage Instructions

### Development Environment

To start the development environment:

```bash
docker compose -f docker-compose.dev.yml up
```

This will:

- Build the Docker image from local Dockerfile
- Mount your local codebase to enable live code changes
- Run with `nodemon` for automatic reloads
- Expose debugging port (9229)
- Set NODE_ENV to "development"
- Use separate development database volume

### Production Environment

To start the production environment:

```bash
docker compose -f docker-compose.prod.yml up -d
```

This will:

- Use the pre-built Docker image from Docker Hub
- Run in detached mode
- Set NODE_ENV to "production"
- Only mount the WhatsApp session data for persistence
- Use separate production database volume

### Using the Base Configuration

You can also use the base configuration directly:

```bash
docker compose up
```

This uses sensible defaults that work in most environments.

## Environment Variables

All Docker Compose configurations use environment variables from your `.env` file. Make sure this file is properly configured before starting any environment.

## PM2 Configuration

This project uses PM2 for process management, which is configured through the `ecosystem.config.js` file:

- **Development:** Uses the `whatsapp-web-dev` configuration with file watching enabled
- **Production:** Uses the `whatsapp-web-prod` configuration with clustering for better performance

The appropriate PM2 configuration is automatically selected based on which Docker Compose file you use:

```bash
# For development
docker compose -f docker-compose.dev.yml up

# For production
docker compose -f docker-compose.prod.yml up -d
```
