const { Client, MessageMedia, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const QRCode = require("qrcode");
const { initializeDatabase } = require("./db/database");
const { insertGroupUser } = require("./db/actions/groupUserActions");
// Add FFmpeg path configuration - Fix the configuration
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
const { insertGroup } = require("./db/actions/groupsActions");
const logger = require("./utils/logger");
const { allTypeHandler } = require("./actions/allTypeHandler");
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// For debugging
console.log("FFmpeg Path:", ffmpegInstaller.path);

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

let puppeteer = {
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-accelerated-2d-canvas",
    "--disable-gpu",
  ],
};
if (process.env.NODE_ENV === "production") {
  puppeteer.executablePath = "/usr/lib64/chromium-browser/headless_shell";
}
console.log(process.env.NODE_ENV);
// Update client initialization to use LocalAuth
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: ".wwebjs_auth", // Path where session data will be stored
  }),
  puppeteer,
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
//on message edit
client.on("message_edit", async (msg) => {
  logger.info("message is edited");
  await msg.react("");
  await allTypeHandler(msg, client, true);
});
client.on("message", async (msg) => {
  await allTypeHandler(msg, client);
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
