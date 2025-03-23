const { Client, MessageMedia, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const ffmpeg = require("fluent-ffmpeg");
const OpenAI = require("openai");
const fs = require("fs");
const mime = require("mime-types");
const QRCode = require("qrcode");
const { initializeDatabase, insertGroup } = require("./db/database");
const { insertGroupUser } = require("./db/actions/groupUserActions");
const { parseMessage } = require("./utils/messageParser");
const { getOrCreateNewUser } = require("./db/actions/userActions");
const { handleWhatsAppGroupInvite } = require("./actions/groupsInvitehandle");
const { insertMessageHandler } = require("./actions/chatMessageHadle");
// Add FFmpeg path configuration - Fix the configuration
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// For debugging
console.log("FFmpeg Path:", ffmpegInstaller.path);

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// Initialize OpenAI with configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

// Add retry utility function
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Update the transcribeAudio function with better error handling
const transcribeAudio = async (audioFile, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const formData = new FormData();
      formData.append("file", audioFile);
      formData.append("model", "whisper-1");

      const transcript = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        timeout: 60000, // Increased timeout to 60 seconds
        response_format: "text",
      });

      return transcript;
    } catch (error) {
      console.error(`Transcription attempt ${i + 1} failed:`, error.message);

      // Check for specific error types
      if (error.code === "ECONNRESET" || error.code === "ETIMEDOUT") {
        console.log("Connection error, retrying...");
        await wait(5000); // Wait longer between retries (5 seconds)
        continue;
      }

      if (i === retries - 1) throw error; // If last retry, throw error
      await wait(2000); // Wait 2 seconds before retrying
    }
  }
};

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
  const user = await getOrCreateNewUser(
    notification.author,
    notification.author.split("@")[0]
  );
  await insertGroup({
    id: notification.chatId,
    name: null,
  });
  await insertGroupUser(notification.author, notification.chatId, true);
});
client.on("message", async (msg) => {
  // Get sender info
  if (!isNewMessage(msg) || msg.type === "e2e_notification") return;

  // Log chat object for debugging
  // Parse message content and type
  const messageContent = await parseMessage(msg);

  if (messageContent.isGroup && messageContent.type === "chat") {
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
  console.log("messageContent", messageContent);
  if (messageContent.type === "chat") {
    await insertMessageHandler(messageContent);
  }
  if (messageContent.type === "groups_v4_invite") {
    await handleWhatsAppGroupInvite(client, messageContent.invitecode);
  }

  // Handle voice messages
  if (msg.type === "audio" || msg.type === "ptt") {
    let audioPath = null;
    let mp3Path = null;

    try {
      // React to show we're processing
      await msg.react("🎵");

      // Download the voice message
      const media = await msg.downloadMedia();
      const fileName = `voice-${Date.now()}`;

      // Save audio file
      audioPath = `./${fileName}.ogg`;
      fs.writeFileSync(audioPath, media.data, "base64");

      // Convert to mp3
      mp3Path = `./${fileName}.mp3`;
      await new Promise((resolve, reject) => {
        ffmpeg()
          .input(audioPath)
          .outputOptions(["-acodec libmp3lame", "-ac 2"])
          .toFormat("mp3")
          .on("end", () => {
            console.log("Audio conversion completed");
            resolve();
          })
          .on("error", (err) => {
            console.error("Error during conversion:", err);
            reject(err);
          })
          .save(mp3Path);
      });

      // Transcribe using OpenAI with retry logic
      const audioFile = fs.createReadStream(mp3Path);
      const transcript = await transcribeAudio(audioFile);

      // Send transcription
      await msg.reply(`🎙️ Transcription:\n\n${transcript}`);
      await msg.react("✅");
    } catch (error) {
      console.error("Error processing voice message:", error);
      await msg.react("❌");
      await msg.reply(
        "Sorry, I had trouble transcribing that voice message. Please try again."
      );
    } finally {
      // Cleanup files
      try {
        if (audioPath && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
        if (mp3Path && fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path);
      } catch (error) {
        console.error("Error cleaning up files:", error);
      }
    }
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
