const fs = require("fs");
const path = require("path");
const ffmpeg = require("ffmpeg-static");
const { spawn } = require("child_process");
const openai = require("../aiModle");
const { insertMessageHandler } = require("./chatMessageHadle");

/**
 * Handles video messages from WhatsApp, transcribes audio, and analyzes video content
 */
const handleVideoMessage = async (msg) => {
  try {
    console.log("Processing video message...");

    // Download the video
    // Check if message has been sent before
    if (msg.hasQuotedMsg) {
      const quotedMsg = await msg.getQuotedMessage();
      if (quotedMsg.type === "video") {
        console.log("Video was resent, skipping processing");
        return;
      }
    }
    const media = await msg.downloadMedia();
    if (!media) {
      console.error("Failed to download media");
      return;
    }

    // Create temp directories if they don't exist
    const tempDir = path.join(__dirname, "../../temp");
    const framesDir = path.join(tempDir, "frames");
    const audioDir = path.join(tempDir, "audio");

    for (const dir of [tempDir, framesDir, audioDir]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    // Save video to disk (temporary storage)
    const videoPath = path.join(
      tempDir,
      `video_${Date.now()}.${media.mimetype.split("/")[1] || "mp4"}`
    );
    fs.writeFileSync(videoPath, Buffer.from(media.data, "base64"));
    console.log(`Video saved at: ${videoPath}`);

    // Process video and audio in parallel
    const [frames, audioPath] = await Promise.all([
      // Extract frames from the video
      extractFramesFromVideo(videoPath, framesDir, 5),
      // Extract audio from the video
      extractAudioFromVideo(videoPath, audioDir),
    ]);

    // Start analyzing frames
    const frameAnalysisPromise = analyzeFrames(frames, msg);

    // Transcribe audio if available
    let transcription = "No audio detected or failed to transcribe.";
    if (audioPath && fs.existsSync(audioPath)) {
      transcription = await transcribeAudio(audioPath);
    }

    // Wait for frame analysis to complete
    const frameAnalyses = await frameAnalysisPromise;

    // Generate overall summary incorporating both visual and audio information
    const summary = await generateVideoSummary(frameAnalyses, transcription);

    // Save message to database
    await insertMessageHandler(
      msg,
      ` *Video Analysis*\n\n${summary}\n\n *Audio Transcription*:\n\n${transcription}`
    );

    // Clean up temporary files
    fs.unlinkSync(videoPath);
    if (audioPath && fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }
    frames.forEach((frame) => fs.existsSync(frame) && fs.unlinkSync(frame));
  } catch (error) {
    console.error("Error handling video message:", error);
  }
};

/**
 * Extracts frames from a video file using ffmpeg
 */
const extractFramesFromVideo = (videoPath, outputDir, frameCount) => {
  return new Promise((resolve, reject) => {
    const uniqueId = Date.now();
    const outputPattern = path.join(outputDir, `frame_${uniqueId}_%d.jpg`);

    // Use ffmpeg to extract frames
    const ffmpegProcess = spawn(ffmpeg, [
      "-i",
      videoPath,
      "-vf",
      `select='eq(n,0)+if(gt(n,0),lt(prev_selected_n+${Math.floor(
        30 / frameCount
      )},n),0)'`,
      "-vsync",
      "0",
      "-frames:v",
      frameCount.toString(),
      "-q:v",
      "2",
      outputPattern,
    ]);

    ffmpegProcess.stderr.on("data", (data) => {
      console.log(`ffmpeg frames: ${data}`);
    });

    ffmpegProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`FFmpeg frames process exited with code ${code}`));
        return;
      }

      // Get the extracted frame files
      const extractedFrames = [];
      for (let i = 1; i <= frameCount; i++) {
        const framePath = path.join(outputDir, `frame_${uniqueId}_${i}.jpg`);
        if (fs.existsSync(framePath)) {
          extractedFrames.push(framePath);
        }
      }

      resolve(extractedFrames);
    });
  });
};

/**
 * Extracts audio from a video file using ffmpeg
 */
const extractAudioFromVideo = (videoPath, outputDir) => {
  return new Promise((resolve, reject) => {
    const uniqueId = Date.now();
    const outputPath = path.join(outputDir, `audio_${uniqueId}.mp3`);

    // Use ffmpeg to extract audio
    const ffmpegProcess = spawn(ffmpeg, [
      "-i",
      videoPath,
      "-q:a",
      "0",
      "-map",
      "a",
      "-vn",
      outputPath,
    ]);

    ffmpegProcess.stderr.on("data", (data) => {
      console.log(`ffmpeg audio: ${data}`);
    });

    ffmpegProcess.on("close", (code) => {
      if (code !== 0) {
        console.warn(`FFmpeg audio process exited with code ${code}`);
        resolve(null); // Don't reject - video might not have audio
        return;
      }

      // Check if the audio file was created and has content
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        resolve(outputPath);
      } else {
        console.warn("Audio extraction produced empty file or failed");
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath); // Clean up empty file
        }
        resolve(null);
      }
    });
  });
};

/**
 * Analyzes frames from the video
 */
const analyzeFrames = async (frames, msg) => {
  const frameAnalyses = [];
  for (let i = 0; i < frames.length; i++) {
    const analysis = await analyzeImageWithOpenAI(frames[i]);
    frameAnalyses.push(`Frame ${i + 1}: ${analysis}`);
  }
  return frameAnalyses;
};

/**
 * Analyzes an image using OpenAI's Vision API
 */
const analyzeImageWithOpenAI = async (imagePath) => {
  try {
    // Read the image file as a base64 string
    const imageBuffer = fs.readFileSync(imagePath);

    // Create a vision message using OpenAI's GPT-4o
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please describe this video frame in detail.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBuffer.toString("base64")}`,
              },
            },
          ],
        },
      ],
      max_tokens: 300,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("OpenAI Vision API error:", error);
    throw new Error("Failed to analyze image with OpenAI");
  }
};

/**
 * Transcribes audio using OpenAI's Whisper API
 */
const transcribeAudio = async (audioPath) => {
  try {
    const audioFile = fs.createReadStream(audioPath);

    const response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en", // You can make this dynamic or auto-detect
      response_format: "text",
    });

    return response || "No speech detected.";
  } catch (error) {
    console.error("OpenAI Audio Transcription error:", error);
    return "Failed to transcribe audio.";
  }
};

/**
 * Generates a summary of the video based on frame analyses and audio transcription
 */
const generateVideoSummary = async (frameAnalyses, transcription) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `I have analyzed several frames from a video and transcribed its audio. Please provide a comprehensive summary of the video content.
          
Frame Analyses:
${frameAnalyses.join("\n\n")}

Audio Transcription:
${transcription}

Please provide:
1. A concise summary of what appears to be happening in this video
2. Key points discussed in the audio (if any)
3. How the visual content and audio relate to each other
`,
        },
      ],
      max_tokens: 800,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("OpenAI summary generation error:", error);
    throw new Error("Failed to generate video summary");
  }
};

module.exports = {
  handleVideoMessage,
};
