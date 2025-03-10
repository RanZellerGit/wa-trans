const { Client, MessageMedia } = require("whatsapp-web.js");
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

// Initialize OpenAI with configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const client = new Client();
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

client.on("message", async (msg) => {
  console.log("Message type:", msg.type);

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

  // Emoji responses with reactions
  const emojiResponses = {
    "❤️": { reply: "💖", reaction: "❤️" },
    "😊": { reply: "🥰", reaction: "😊" },
    "👋": { reply: "👋 Hello!", reaction: "👋" },
    "😢": { reply: "🤗", reaction: "🤗" },
    "🎉": { reply: "🎊 🎈", reaction: "🎉" },
    "👍": { reply: "👍 Thanks!", reaction: "👍" },
    "🔥": { reply: "✨ 🔥", reaction: "🔥" },
    "🌟": { reply: "⭐ ✨", reaction: "⭐" },
    "🤔": { reply: "💭", reaction: "🤔" },
    "😴": { reply: "💤", reaction: "😴" },
  };

  // Check if the message is in our emoji responses
  if (emojiResponses[msg.body]) {
    const response = emojiResponses[msg.body];
    await msg.react(response.reaction); // Add reaction to the message
    // msg.reply(response.reply);
  }

  // Keep the existing ping command
  if (msg.body === "!ping") {
    await msg.react("🏓"); // Add ping pong reaction
    msg.reply("pong");
  }
});

client.initialize();

module.exports = client;
