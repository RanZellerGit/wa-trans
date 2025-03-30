const { models } = require("../database");
const { insertGroupUser } = require("./groupUserActions");
async function insertGroup(groupData) {
  try {
    const group = await models.Group.findOne({
      where: {
        id: groupData.id,
      },
    });
    if (!group) {
      await models.Group.create(groupData);
      await insertGroupUser(groupData.author, groupData.id, true);
    }
  } catch (error) {
    console.error("Error inserting group:", error);
    throw error;
  }
}

async function getGroup(groupId) {
  const group = await models.Group.findOne({
    where: { id: groupId },
  });
  return group;
}

module.exports = { insertGroup, getGroup };
