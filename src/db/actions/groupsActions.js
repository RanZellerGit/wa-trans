const { models } = require("../database");

async function insertGroup(groupData) {
  try {
    await models.Group.upsert(groupData);
  } catch (error) {
    console.error("Error inserting group:", error);
    throw error;
  }
}

module.exports = { insertGroup };
