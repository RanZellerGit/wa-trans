const { Client, MessageMedia, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const QRCode = require("qrcode");
const { initializeDatabase } = require("./db/database");
const { insertGroupUser } = require("./db/actions/groupUserActions");
const { getOrCreateNewUser } = require("./db/actions/userActions");
const { getUserInviter } = require("./db/actions/groupUserActions");
const { handleWhatsAppGroupInvite } = require("./actions/groupsInvitehandle");
const { insertMessageHandler } = require("./actions/chatMessageHadle");
const { handleAudioPttMessage } = require("./actions/audioPttHandler");
const { handleImageMessage } = require("./actions/imageHandler");
// Add FFmpeg path configuration - Fix the configuration
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
const { insertGroup } = require("./db/actions/groupsActions");
const { handleVideoMessage } = require("./actions/videoHandler");
const logger = require("./utils/logger");
const { checkOffense } = require("./aiModle");
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// For debugging
console.log("FFmpeg Path:", ffmpegInstaller.path);

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// Update client initialization to use LocalAuth
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: ".wwebjs_auth", // Path where session data will be stored
  }),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
    ],
  },
});

client.on("qr", async (qr) => {
  logger.info("QR Code received", { qrLength: qr.length });

  // Generate terminal QR code
  qrcode.generate(qr, { small: true });

  try {
    const options = {
      type: "png",
      quality: 0.95,
      margin: 1,
      width: 800,
    };

    await QRCode.toFile("./whatsapp-qr.png", qr, options);
    logger.info("QR code saved successfully", {
      filename: "whatsapp-qr.png",
      size: fs.statSync("./whatsapp-qr.png").size,
    });

    const testRead = fs.readFileSync("./whatsapp-qr.png");
    logger.debug("QR file verification", { size: testRead.length });
  } catch (err) {
    logger.error("Failed to save QR code", {
      error: err.message,
      stack: err.stack,
      code: err.code,
    });
  }
});

client.on("ready", async () => {
  logger.info("WhatsApp client is ready");
  try {
    await initializeDatabase();
    logger.info("Database connection established");
  } catch (error) {
    logger.error("Database initialization failed", { error: error.message });
  }
});

// Helper function to check if message is new
const isNewMessage = (msg) => {
  // Messages older than 1 minute are considered old
  const ONE_MINUTE = 5 * 1000; // 60 seconds * 1000 milliseconds
  const messageTime = msg.timestamp * 1000; // Convert to milliseconds
  const currentTime = Date.now();

  return currentTime - messageTime < ONE_MINUTE;
};

client.on("group_join", async (notification) => {
  console.log(`Invited by: ${notification.author}`);
  // get group name
  const chat = await notification.getChat();
  const groupName = chat.name;

  await insertGroup({
    id: notification.chatId,
    name: chat.name,
    author: notification.author,
  });

  await insertGroupUser(notification.recipientIds[0], notification.chatId);
});
client.on("message", async (msg) => {
  // Get sender info
  if (!isNewMessage(msg) || msg.type === "e2e_notification") return;

  let ret = null;
  if (msg.type === "chat") {
    logger.info("message type is chat");
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
    await handleVideoMessage(msg);
  }

  // Keep the existing ping command
  if (msg.body === "ping") {
    logger.info("message body is ping");
    await msg.react("🏓"); // Add ping pong reaction
  }
  if (ret && ret.isGroup) {
    const isOffended = await checkOffense(ret.text);
    logger.info("checkOffense: isOffended", isOffended);
    if (isOffended === "Yes") {
      const inviter = await getUserInviter(msg.from);
      client.sendMessage(
        inviter,
        `ֿ*הודעה עם תוכן פוגעני🚫:*\n_"${ret.text}"_`
      );
      await msg.react("🚫"); // Add ping pong reaction
    }
  }
});

// Add event handler for sent messages
client.on("message_create", async (msg) => {
  if (msg.fromMe) {
    logger.info("message is sent by me");
  }
});

// Add error handling and reconnection logic
client.on("disconnected", async (reason) => {
  logger.warn("Client was disconnected", { reason });
  await new Promise((resolve) => setTimeout(resolve, 5000));
  try {
    logger.info("Attempting to reinitialize client");
    await client.destroy();
    await client.initialize();
  } catch (error) {
    logger.error("Failed to reinitialize client", { error: error.message });
    process.exit(1);
  }
});

client.on("change_state", (state) => {
  logger.info("Connection state changed", { state });
});

client.on("auth_failure", (msg) => {
  logger.error("Authentication failure", { message: msg });
});

client.on("loading_screen", (percent, message) => {
  logger.info("Loading screen", { percent, message });
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection", {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
  });

  if (reason instanceof Error && reason.message.includes("Protocol error")) {
    logger.warn("Detected Puppeteer protocol error, attempting recovery");
    client
      .destroy()
      .then(() => {
        logger.info("Client destroyed, reinitializing");
        client.initialize();
      })
      .catch((err) => {
        logger.error("Failed to recover from protocol error", {
          error: err.message,
        });
        process.exit(1);
      });
  }
});

client.initialize();

module.exports = client;
