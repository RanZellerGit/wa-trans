const { Sequelize } = require("sequelize");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Database configuration

const sequelize = new Sequelize({
  dialect: "mysql",
  host: "database-1.chsyo8u64noi.eu-central-1.rds.amazonaws.com", // or your RDS endpoint if using RDS
  username: process.env.DB_USER || "root",
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

async function insertGroupUser(userid, groupid) {
  try {
    await models.GroupUser.upsert({
      userId: userid,
      groupId: groupid,
    });
  } catch (error) {
    console.error("Error inserting group user:", error);
    throw error;
  }
}

async function findUser(userId) {
  try {
    const user = await models.User.findByPk(userId);
    return user;
  } catch (error) {
    console.error("Error finding user:", error);
    throw error;
  }
}

//TODO: when join to group set the user as inviter

module.exports = {
  sequelize,
  models,
  initializeDatabase,
  insertMessage,
  insertGroup,
  insertGroupUser,
};
