const { Client, MessageMedia, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const QRCode = require("qrcode");
const { initializeDatabase } = require("./db/database");
const { insertGroupUser } = require("./db/actions/groupUserActions");
const { getOrCreateNewUser } = require("./db/actions/userActions");
const { handleWhatsAppGroupInvite } = require("./actions/groupsInvitehandle");
const { insertMessageHandler } = require("./actions/chatMessageHadle");
const { handleAudioPttMessage } = require("./actions/audioPttHandler");
const { handleImageMessage } = require("./actions/imageHandler");
// Add FFmpeg path configuration - Fix the configuration
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
const { insertGroup } = require("./db/actions/groupsActions");
const { handleVideoMessage } = require("./actions/videoHandler");
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
  console.log("QR Code received, length:", qr.length);

  // Generate terminal QR code
  qrcode.generate(qr, { small: true });

  // Save QR code as PNG with options
  try {
    const options = {
      type: "png",
      quality: 0.95,
      margin: 1,
      width: 800,
    };

    await QRCode.toFile("./whatsapp-qr.png", qr, options);
    console.log(
      "QR code saved as whatsapp-qr.png with size:",
      fs.statSync("./whatsapp-qr.png").size
    );

    // Verify the file is readable
    const testRead = fs.readFileSync("./whatsapp-qr.png");
    console.log("QR file is readable, size:", testRead.length);
  } catch (err) {
    console.error("Could not save QR code:", err);
    console.error("Error details:", {
      message: err.message,
      stack: err.stack,
      code: err.code,
    });
  }
});

client.on("ready", async () => {
  console.log("Client is ready!");
  try {
    await initializeDatabase();
    console.log("Database connection established");
  } catch (error) {
    console.error("Failed to initialize database:", error);
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
  await insertGroup({
    id: notification.chatId,
    name: null,
  });
  await insertGroupUser(notification.author, notification.chatId, true);
});
client.on("message", async (msg) => {
  // Get sender info
  if (!isNewMessage(msg) || msg.type === "e2e_notification") return;

  if (msg.type === "chat") {
    await insertMessageHandler(msg);
  }
  if (msg.type === "groups_v4_invite") {
    await handleWhatsAppGroupInvite(client, messageContent.invitecode);
  }

  // Handle voice messages
  if (msg.type === "audio" || msg.type === "ptt") {
    await handleAudioPttMessage(msg);
  }

  // Handle image messages
  if (msg.type === "image") {
    await handleImageMessage(msg);
  }

  if (msg.type === "video") {
    await handleVideoMessage(msg);
  }

  // Keep the existing ping command
  if (msg.body === "ping") {
    await msg.react("🏓"); // Add ping pong reaction
  }
});

// Add event handler for sent messages
client.on("message_create", async (msg) => {
  if (msg.fromMe) {
    const recipientNumber = msg.to.split("@")[0];
    const contact = await client.getContactById(msg.to);

    // console.log("Message sent:", {
    //   to: recipientNumber,
    //   toName: contact.name || contact.pushname || "Unknown",
    //   body: msg.body,
    //   type: msg.type,
    //   timestamp: msg.timestamp,
    //   hasMedia: msg.hasMedia,
    // });
  }
});

// Add error handling and reconnection logic
client.on("disconnected", async (reason) => {
  console.log("Client was disconnected:", reason);
  await new Promise((resolve) => setTimeout(resolve, 5000));
  try {
    console.log("Attempting to reinitialize...");
    await client.destroy();
    await client.initialize();
  } catch (error) {
    console.error("Failed to reinitialize client:", error);
    process.exit(1);
  }
});

client.on("change_state", (state) => {
  console.log("Connection state changed to:", state);
});

client.on("auth_failure", (msg) => {
  console.error("Auth failure:", msg);
});

client.on("loading_screen", (percent, message) => {
  console.log("Loading screen:", percent, "%", message);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  if (reason instanceof Error && reason.message.includes("Protocol error")) {
    console.log("Detected Puppeteer protocol error, attempting recovery...");
    client
      .destroy()
      .then(() => {
        console.log("Client destroyed, reinitializing...");
        client.initialize();
      })
      .catch((err) => {
        console.error("Failed to recover from protocol error:", err);
        process.exit(1);
      });
  }
});

client.initialize();

module.exports = client;
