module.exports = {
  apps: [
    {
      name: "whatsapp-bot",
      script: "index.js",
      watch: false,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 5,
      restart_delay: 4000,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        DB_USER: process.env.DB_USER,
        DB_PASSWORD: process.env.DB_PASSWORD,
        DB_NAME: process.env.DB_NAME,
      },
      error_file: "logs/err.log",
      out_file: "logs/out.log",
      log_file: "logs/combined.log",
      time: true,
    },
  ],
};
