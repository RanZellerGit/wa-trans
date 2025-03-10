module.exports = {
  apps: [
    {
      name: "whatsapp-bot",
      script: "index.js",
      watch: true,
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        HOST: "localhost",
      },
      error_file: "logs/err.log",
      out_file: "logs/out.log",
      log_file: "logs/combined.log",
      time: true,
    },
  ],
};
