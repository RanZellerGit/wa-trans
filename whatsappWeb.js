const { Client, MessageMedia, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const ffmpeg = require("fluent-ffmpeg");
const OpenAI = require("openai");
const fs = require("fs");
const mime = require("mime-types");
const QRCode = require("qrcode");

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
      "--no-first-run",
      "--no-zygote",
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

client.on("ready", () => {
  console.log("Client is ready!");
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

// Add at the top with other constants
const HEART_EMOJIS = [
  "❤️",
  "🧡",
  "💛",
  "💚",
  "💙",
  "💜",
  "🤎",
  "🖤",
  "🤍",
  "💖",
  "💝",
  "💓",
  "💗",
  "💕",
  "💞",
  "💘",
  "💟",
];

// Helper function to get random heart
const getRandomHeart = () => {
  return HEART_EMOJIS[Math.floor(Math.random() * HEART_EMOJIS.length)];
};

client.on("message", async (msg) => {
  // Get sender info
  const senderNumber = msg.from.split("@")[0]; // Remove the @c.us suffix
  const contact = await msg.getContact();

  // Get group info if it's a group message
  const chat = await msg.getChat();
  const isGroup = chat.isGroup;
  const groupName = isGroup ? chat.name : null;

  console.log("Message from:", {
    number: senderNumber,
    name: contact.name || contact.pushname || "Unknown",
    isGroup: isGroup,
    groupName: groupName,
    timestamp: msg.timestamp,
    type: msg.type,
    body: msg.body,
  });

  // React with random hearts for specific users
  if (senderNumber === "13012656123" || senderNumber === "972549980355") {
    let emojiArr = ["💖", "🏳️‍🌈", "🌈"];
    let randomEmoji = emojiArr[Math.floor(Math.random() * emojiArr.length)];
    await msg.react(randomEmoji);
  }

  if (!isGroup) {
    if (
      senderNumber === "972528542448" ||
      senderNumber === "972535308698" ||
      senderNumber === "    972545652890"
    ) {
      await msg.react(getRandomHeart());
    }
  }

  // Handle voice messages
  if (!isGroup && (msg.type === "audio" || msg.type === "ptt")) {
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

    console.log("Message sent:", {
      to: recipientNumber,
      toName: contact.name || contact.pushname || "Unknown",
      body: msg.body,
      type: msg.type,
      timestamp: msg.timestamp,
      hasMedia: msg.hasMedia,
    });
  }
});

client.initialize();

module.exports = client;
