const { models } = require("../database");

function createUser(id, number, pushName, isBusiness) {
  return {
    id,
    number,
    pushName,
    isBusiness,
  };
}

async function getOrCreateNewUser(
  id,
  number = null,
  pushName = null,
  isBusiness = false
) {
  try {
    // Extract the number from author ID (removing the @c.us or @s.whatsapp.net suffix)
    let user = models.User.findByPk(id);

    if (!user) {
      user = createUser(userId, userId.split("@")[0], null, false);
      models.User.create(user);
    }
    if (number || pushName || isBusiness) {
      user.number = number;
      user.pushName = pushName;
      user.isBusiness = isBusiness;

      await models.User.update(
        {
          phone_number: number,
          push_name: pushName,
          is_business: isBusiness,
        },
        {
          where: { id: id },
        }
      );
    }
    return user;
  } catch (error) {
    console.error("Error finding user:", error);
  }
}

module.exports = {
  createUser,
  getOrCreateNewUser,
};
