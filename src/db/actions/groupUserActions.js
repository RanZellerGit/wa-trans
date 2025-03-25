const { models } = require("../database");
async function insertGroupUser(userid, groupid, inviter = false) {
  try {
    let groupUser = await models.GroupUser.findOne({
      where: {
        userId: userid,
        groupId: groupid,
      },
    });

    if (!groupUser) {
      await models.GroupUser.create({
        userId: userid,
        groupId: groupid,
        inviter: inviter,
      });
    }
  } catch (error) {
    console.error("Error inserting group user:", error);
    throw error;
  }
}

module.exports = {
  insertGroupUser,
};
