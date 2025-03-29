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
const getUserInviter = async (groupId = "120363420214563985@g.us") => {
  const groupUser = await models.GroupUser.findOne({
    where: { inviter: true, groupId },
  });
  console.log(groupUser.userId);
  return groupUser.userId;
};

module.exports = {
  insertGroupUser,
  getUserInviter,
};
