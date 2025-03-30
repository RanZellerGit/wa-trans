const { insertMessageHandler } = require("./chatMessageHadle");
const { handleAudioPttMessage } = require("./audioPttHandler");
const { handleImageMessage } = require("./imageHandler");
const { handleVideoMessage } = require("./videoHandler");
const { checkOffense } = require("./../aiModle");
const logger = require("./../utils/logger");
const client = require("./../whatsappWeb");
const { handleWhatsAppGroupInvite } = require("./groupsInvitehandler");
const { getUserInviter } = require("./../db/actions/groupUserActions");
const { getMessage } = require("./../db/actions/messagesActions");

const isNewMessage = (msg) => {
  // Messages older than 1 minute are considered old
  const ONE_MINUTE = 60 * 10 * 1000; // 60 seconds * 1000 milliseconds
  const messageTime = msg.timestamp * 1000; // Convert to milliseconds
  const currentTime = Date.now();

  return currentTime - messageTime < ONE_MINUTE;
};

const allTypeHandler = async (msg, client, isEdit = false) => {
  if (!isNewMessage(msg) || msg.type === "e2e_notification") return;

  let ret = null;
  if (msg.type === "chat") {
    logger.info("message type is chat");
    if (isEdit) {
      var oldMessage = await getMessage(msg.id.id);
    }
    ret = await insertMessageHandler(msg, msg.body);
  }
  if (msg.type === "groups_v4_invite") {
    logger.info("message type is groups_v4_invite");
    await handleWhatsAppGroupInvite(client, messageContent.invitecode);
  }

  // Handle voice messages
  if (msg.type === "audio" || msg.type === "ptt") {
    logger.info("message type is audio or ptt");
    ret = await handleAudioPttMessage(msg);
  }

  // Handle image messages
  if (msg.type === "image") {
    logger.info("message type is image");
    ret = await handleImageMessage(msg);
  }

  if (msg.type === "video") {
    logger.info("message type is video");
    ret = await handleVideoMessage(msg);
  }

  // Keep the existing ping command
  if (msg.body === "ping") {
    logger.info("message body is ping");
    await msg.react("🏓"); // Add ping pong reaction
  }
  if (ret && ret.isGroup) {
    const isOffended = await checkOffense(ret.text);
    logger.info(`checkOffense: isOffended: ${isOffended}`);
    if (isOffended === "Yes") {
      const inviter = await getUserInviter(msg.from);
      switch (ret.type) {
        case "image":
          client.sendMessage(
            inviter,
            `ֿ*הודעה עם תוכן פוגעני מקבוצת ${ret.groupName} 🚫:*\n🖼️`
          );
          break;
        case "video":
          client.sendMessage(
            inviter,
            `ֿ*הודעה עם תוכן פוגעני מקבוצת ${ret.groupName} 🚫:*\n🎥`
          );
          break;
        case "audio":
          client.sendMessage(
            inviter,
            `ֿ*הודעה עם תוכן פוגעני מקבוצת ${ret.groupName} 🚫:*\n🎤"_${ret.text}_"`
          );
          break;
        default:
          if (!isEdit) {
            client.sendMessage(
              inviter,
              `ֿ*הודעה עם תוכן פוגעני מקבוצת ${ret.groupName} 🚫:*\n_"${ret.text}"_`
            );
          } else {
            client.sendMessage(
              inviter,
              `ֿ*הודעה עם תוכן פוגעני מקבוצת ${ret.groupName} 🚫:*\nתוכן שונה מ _"${oldMessage.content}"_ ל _"${ret.text}"_`
            );
          }
      }
      await msg.react("🚫"); // Add ping pong reaction
    }
  }
};

module.exports = {
  allTypeHandler,
};
