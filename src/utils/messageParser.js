const { getOrCreateNewUser } = require("../db/actions/userActions");
async function parseMessage(msg) {
  let messageContent = {};
  const chat = await msg.getChat();

  messageContent.isGroup = msg.author ? true : false;
  messageContent.groupName = messageContent.isGroup ? chat.name : null;
  messageContent.messageId = msg.id.id;
  messageContent.groupId = messageContent.isGroup ? chat.id._serialized : null;
  messageContent.timestamp = msg.timestamp;
  messageContent.type = msg.type;
  messageContent.receiverNumber = msg.to.split("@")[0];

  let contact = await msg.getContact();

  messageContent.user = await getOrCreateNewUser(
    contact.id._serialized,
    contact.number,
    contact.isBusiness ? contact.verifiedName : contact.pushname,
    contact.isBusiness
  );
  messageContent.sender = messageContent.user.id;
  switch (msg.type) {
    case "chat":
      messageContent.content = msg.body; // Text message
      break;
    // TODO: support for media messages

    case "image":
      messageContent = "[Image]";
      try {
        const media = await msg.downloadMedia();
        if (media) {
          messageContent = `[Image with caption: ${
            msg.caption || "No caption"
          }]`;
        }
      } catch (error) {
        console.error("Error downloading image:", error);
      }
      break;
    case "groups_v4_invite":
      messageContent.groupId = msg.inviteV4.groupId.split("@")[0];
      messageContent.groupName = msg.inviteV4.groupName;
      messageContent.invitecode = await msg.getInviteCode();
      break;
    case "e2e_notification":
      return {};
      break;

    case "video":
      messageContent = "[Video]";
      try {
        const media = await msg.downloadMedia();
        if (media) {
          messageContent = `[Video with caption: ${
            msg.caption || "No caption"
          }]`;
        }
      } catch (error) {
        console.error("Error downloading video:", error);
      }
      break;

    case "audio":
    case "ptt": // Push to talk voice message
      messageContent = "[Audio Message]";
      try {
        const media = await msg.downloadMedia();
        if (media) {
          messageContent = "[Audio Message - Transcription pending]";
        }
      } catch (error) {
        console.error("Error downloading audio:", error);
      }
      break;

    case "document":
      messageContent = "[Document]";
      try {
        const media = await msg.downloadMedia();
        if (media) {
          messageContent = `[Document: ${
            msg.caption || media.filename || "Unnamed"
          }]`;
        }
      } catch (error) {
        console.error("Error downloading document:", error);
      }
      break;

    case "location":
      try {
        const location = msg.location;
        messageContent = `[Location: ${location.latitude}, ${location.longitude}]`;
      } catch (error) {
        console.error("Error parsing location:", error);
        messageContent = "[Location]";
      }
      break;

    case "sticker":
      messageContent = "[Sticker]";
      break;

    default:
      messageContent = `[Unknown message type: ${msg.type}]`;
      break;
  }

  return messageContent;
}

module.exports = {
  parseMessage,
};
