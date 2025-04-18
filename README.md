# WhatsApp Web Integration

A Node.js application that integrates with WhatsApp Web to handle messages, groups, and provide a web interface.

## Features

- WhatsApp Web client integration using [whatsapp-web.js](https://wwebjs.dev/)
- Web interface with QR code for authentication
- Message processing with FFmpeg for media handling
- Database integration for storing group and user information
- Docker support for development and production environments
- PM2 process management
- AWS S3 integration for file storage

## Prerequisites

- Node.js 16+
- Docker and Docker Compose (for containerized setup)
- MySQL database
- FFmpeg

## Installation

1. Clone the repository:

   ```
   git clone https://github.com/RanZellerGit/wa-trans.git
   cd whatsapp-web
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file with the following variables (adjust as needed):

   ```
   NODE_ENV=development
   PORT=3000
   HOST=0.0.0.0

   # Database
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=password
   DB_NAME=whatsapp
   ```

## Running the Application

### Local Development

```
npm start
```

### Docker Development Environment

```
npm run docker:run-dev
```

or

```
docker compose -f docker-compose.dev.yml up --force-recreate --build
```

### Production Deployment

```
npm run prod
```

or

```
docker compose -f docker-compose.prod.yml up -d
```

## WhatsApp Authentication

1. Start the application
2. Access the web interface at `http://localhost:3000`
3. Scan the QR code with your WhatsApp mobile app
4. Once authenticated, the application will process messages and events from your WhatsApp account

## Project Structure

- `index.js` - Application entry point and Express server
- `src/whatsappWeb.js` - WhatsApp client configuration and event handlers
- `src/db/` - Database models and operations
- `src/actions/` - Message handling logic
- `src/utils/` - Utility functions and logging
- `public/` - Static web assets

## Docker Configuration

The project includes multiple Docker configurations:

- `docker-compose.dev.yml` - Development environment with live code reloading
- `docker-compose.prod.yml` - Production environment optimized for deployment

See `DOCKER-README.md` for detailed Docker instructions.

## Deployment

The project includes scripts for EC2 deployment:

- `setup.sh` - Initial server setup
- `ec2-setup.sh` - EC2-specific configuration

## License

ISC
