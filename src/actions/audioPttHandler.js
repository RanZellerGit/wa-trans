const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const { insertMessage } = require("../db/actions/messagesActions");
const { parseMessage } = require("../utils/messageParser");
const { openai } = require("../aiModle");
const mime = require("mime-types");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

async function handleAudioPttMessage(msg, isGroup) {
  const messageContent = await parseMessage(msg);
  let audioPath = null;
  let mp3Path = null;

  try {
    if (!messageContent.isGroup) {
      await msg.react("🎵");
    }

    const media = await msg.downloadMedia();
    const fileName = `voice-${Date.now()}`;

    audioPath = `./${fileName}.ogg`;
    fs.writeFileSync(audioPath, media.data, "base64");

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

    const audioFile = fs.createReadStream(mp3Path);
    const transcript = await transcribeAudio(audioFile);

    if (!messageContent.isGroup) {
      await msg.reply(`🎙️ Transcription:\n\n${transcript}`);
      await msg.react("✅");
    }
    messageContent.content = transcript;
    await insertMessage(messageContent);
  } catch (error) {
    console.error("Error processing voice message:", error);
    await msg.react("❌");
    await msg.reply(
      "Sorry, I had trouble transcribing that voice message. Please try again."
    );
  } finally {
    try {
      if (audioPath && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
      if (mp3Path && fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path);
    } catch (error) {
      console.error("Error cleaning up files:", error);
    }
  }
}

module.exports = { handleAudioPttMessage };
