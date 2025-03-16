const { Sequelize } = require("sequelize");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Database configuration
const sequelize = new Sequelize({
  host: "database-1.chsyo8u64noi.eu-central-1.rds.amazonaws.com",
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: "mysql",
  logging: false, // Set to console.log to see SQL queries
  define: {
    timestamps: true,
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
  console.log(process.env.DB_USER);
  console.log(process.env.DB_PASSWORD);
  console.log(process.env.DB_NAME);
  try {
    // Test the connection
    await sequelize.authenticate();
    console.log("Successfully connected to the database.");

    // Sync all models
    await sequelize.sync();
    console.log("Database tables verified/created successfully.");

    return sequelize;
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}

async function insertMessage(messageData) {
  try {
    await models.Message.create(messageData);
  } catch (error) {
    console.error("Error inserting message:", error);
    throw error;
  }
}

async function insertGroup(groupData) {
  try {
    await models.Group.upsert(groupData);
  } catch (error) {
    console.error("Error inserting group:", error);
    throw error;
  }
}

async function insertUser(userData) {
  try {
    const [user, created] = await models.User.upsert({
      id: userData.id,
      phone_number: userData.phone_number,
      name: userData.name,
      push_name: userData.push_name,
      is_business: userData.is_business,
      last_seen: userData.last_seen || new Date(),
    });
    return user;
  } catch (error) {
    console.error("Error upserting user:", error);
    throw error;
  }
}

module.exports = {
  sequelize,
  models,
  initializeDatabase,
  insertMessage,
  insertGroup,
  insertUser,
};
