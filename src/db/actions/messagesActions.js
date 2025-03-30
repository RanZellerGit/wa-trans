const { models } = require("../database");

async function insertMessage(messageData) {
  try {
    await models.Message.upsert({
      id: messageData.messageId,
      content: messageData.content,
      message_type: messageData.type,
      sender: messageData.sender,
      group_id: messageData.groupId,
      timestamp: new Date(messageData.timestamp * 1000),
    });
  } catch (error) {
    console.error("Error inserting message:", error);
  }
}

async function getMessage(messageId) {
  return await models.Message.findOne({ where: { id: messageId } });
}

module.exports = {
  insertMessage,
  getMessage,
};
