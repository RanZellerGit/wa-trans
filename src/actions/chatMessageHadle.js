const logger = require("../utils/logger"); // Assuming this is where your logger is defined
const { parseMessage } = require("../utils/messageParser");
const { insertMessage } = require("../db/actions/messagesActions");
const { getOrCreateNewUser } = require("../db/actions/userActions");
const { insertGroupUser } = require("../db/actions/groupUserActions");
const { insertGroup } = require("../db/actions/groupsActions");

const insertMessageHandler = async (msg) => {
  const messageContent = await parseMessage(msg);

  if (messageContent.isGroup) {
    await insertGroup({
      id: messageContent.groupId,
      name: messageContent.groupName,
    });
    await getOrCreateNewUser(
      messageContent.user.id,
      messageContent.user.phone_number,
      messageContent.user.push_name,
      messageContent.user.is_business
    );
    await insertGroupUser(messageContent.user.id, messageContent.groupId);
  }
  messageContent.content = msg.body;
  await insertMessage(messageContent);
  try {
    logger.info("Attempting to insert message:", {
      messageId: messageContent.messageId,
      type: messageContent.type,
      sender: messageContent.senderNumber,
      recipient: messageContent.receiverNumber,
      groupId: messageContent.groupId,
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
