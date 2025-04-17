const { Sequelize } = require("sequelize");
const fs = require("fs");
const path = require("path");
const { flush } = require("pm2");
require("dotenv").config();

// Database configuration
console.log(process.env.DB_USER);
console.log(process.env.DB_PASSWORD);
console.log(process.env.DB_NAME);
console.log(process.env.DB_HOST);
console.log(process.env.DB_PORT);
const sequelize = new Sequelize({
  dialect: "mysql",
  host: process.env.DB_HOST || "127.0.0.1", // Use the environment variable with fallback
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "your_database",
  port: process.env.DB_PORT || 3306,
  logging: console.log,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions: {
    connectTimeout: 60000,
    // If using SSL (required for RDS)
    // ssl: 'Amazon RDS',
    // ssl: {
    //     rejectUnauthorized: true
    // }
  },
});

const models = {};

// Import all models
fs.readdirSync(path.join(__dirname, "models"))
  .filter((file) => file.endsWith(".js"))
  .forEach((file) => {
    const model = require(path.join(__dirname, "models", file))(sequelize);
    models[model.name] = model;
  });

// Set up associations
Object.keys(models).forEach((modelName) => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

async function initializeDatabase() {
  console.log("Initializing database...");
  try {
    // Test the connection
    await sequelize.authenticate();
    console.log("Successfully connected to the database.");

    // Sync all models
    await sequelize.sync({ alter: false });
    console.log("Database tables verified/created successfully.");

    return sequelize;
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}

module.exports = {
  sequelize,
  models,
  initializeDatabase,
};
