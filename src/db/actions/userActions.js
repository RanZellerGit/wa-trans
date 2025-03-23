const { models } = require("../database");

function createUser(id, number, pushName, isBusiness) {
  return {
    id: id,
    phone_number: number,
    push_name: pushName,
    is_business: isBusiness,
  };
}

async function getOrCreateNewUser(
  userId,
  number = null,
  pushName = null,
  isBusiness = false
) {
  try {
    // Extract the number from author ID (removing the @c.us or @s.whatsapp.net suffix)
    let user = await models.User.findByPk(userId);

    if (!user) {
      user = createUser(userId, number, pushName, isBusiness);
      models.User.create(user);
    } else if (
      user.dataValues.phone_number != number ||
      user.dataValues.push_name != pushName ||
      user.dataValues.is_business != isBusiness
    ) {
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
          where: { id: userId },
        }
      );
    }
    return user;
  } catch (error) {
    console.error("Error finding user:", error);
  }
}

module.exports = {
  getOrCreateNewUser,
};
