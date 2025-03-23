const { models } = require("../database");
async function insertGroupUser(userid, groupid, inviter = false) {
  try {
    await models.GroupUser.upsert({
      userId: userid,
      groupId: groupid,
      inviter: inviter,
    });
  } catch (error) {
    console.error("Error inserting group user:", error);
    throw error;
  }
}

module.exports = {
  insertGroupUser,
};
