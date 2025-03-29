const cron = require("node-cron");
const modles = require("../db/database");
const client = require("../whatsappWeb");
const logger = require("../utils/logger");
const { Op } = require("sequelize");
const { models } = require("../db/database");

// Function to fetch recent messages from a group
async function fetchRecentGroupMessages(groupId) {
  try {
    const chat = await client.getChatById(groupId);
    const messages = await chat.fetchMessages({ limit: 50 });

    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    const recentMessages = messages.filter((msg) => {
      const messageTime = msg.timestamp * 1000;
      return messageTime > fiveMinutesAgo;
    });

    return recentMessages;
  } catch (error) {
    logger.error("Error fetching messages for group", {
      groupId,
      error: error.message,
    });
    return [];
  }
}

const getGroupWithInviter = async () => {
  const groups = await models.GroupUser.findAll({
    where: { inviter: true },
    include: [{ model: models.Group }],
  });
  console.log(groups);
  return groups;
};
const startMessageCheckJob = () => {
  //   cron.schedule("*/5 * * * *", async () => {
  //     try {
  //       logger.info("Starting scheduled message check");
  //       // Get all groups that have inviters using Sequelize
  //       const groups = await Group.findAll({
  //         include: [
  //           {
  //             model: GroupUser,
  //             where: {
  //               isInviter: true,
  //             },
  //             required: true,
  //           },
  //         ],
  //       });
  //       for (const group of groups) {
  //         const recentMessages = await fetchRecentGroupMessages(group.id);
  //         if (recentMessages.length > 0) {
  //           logger.info("Found recent messages", {
  //             groupId: group.id,
  //             messageCount: recentMessages.length,
  //           });
  //           // Process the messages as needed
  //           for (const message of recentMessages) {
  //             // You can add your message processing logic here
  //             // For example:
  //             await insertMessageHandler(message, message.body);
  //           }
  //         }
  //       }
  //     } catch (error) {
  //       logger.error("Error in scheduled job", {
  //         error: error.message,
  //         stack: error.stack,
  //       });
  //     }
  //   });
};

module.exports = { startMessageCheckJob, getGroupWithInviter };
