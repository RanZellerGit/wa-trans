const { insertMessage } = require("../database");
const logger = require("../utils/logger"); // Assuming this is where your logger is defined

const insertMessageHandler = async (messageContent) => {
  try {
    logger.info("Attempting to insert message:", {
      messageId: messageContent.messageId,
      type: messageContent.type,
      sender: messageContent.senderNumber,
      recipient: messageContent.receiverNumber,
      groupId: messageContent.groupId,
    });

    await insertMessage({
      id: messageContent.messageId,
      content: messageContent.content,
      message_type: messageContent.type,
      sender: messageContent.senderNumber,
      recipient: messageContent.receiverNumber,
      group_id: messageContent.groupId,
      timestamp: new Date(messageContent.timestamp * 1000),
    });

    logger.info("Message inserted successfully:", messageContent.messageId);
  } catch (error) {
    logger.error("Error inserting message:", error);
    throw error;
  }
};

module.exports = {
  insertMessageHandler,
};
