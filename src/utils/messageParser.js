async function parseMessage(msg) {
  let messageContent = {};
  const chat = await msg.getChat();

  messageContent.isGroup = msg.author ? true : false;
  messageContent.groupName = messageContent.isGroup ? chat.name : null;
  messageContent.messageId = msg.id.id;
  messageContent.groupId = messageContent.isGroup ? chat.id._serialized : null;
  messageContent.senderNumber = messageContent.isGroup
    ? msg.author
    : msg.from.split("@")[0];
  messageContent.timestamp = msg.timestamp;
  messageContent.type = msg.type;
  messageContent.receiverNumber = msg.to.split("@")[0];
  switch (msg.type) {
    case "chat":
      messageContent.content = msg.body; // Text message
      break;

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
