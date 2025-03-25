const fs = require("fs");
const path = require("path");
const openai = require("../aiModle");
const { MessageMedia } = require("whatsapp-web.js");
const { handleVideoMessage } = require("./videoHandler");

/**
 * Handles image messages from WhatsApp and uses OpenAI Vision API to analyze them
 */
const handleImageMessage = async (msg) => {
  try {
    console.log("Processing image message...");

    // Download the image
    const media = await msg.downloadMedia();
    if (!media) {
      console.error("Failed to download media");
      await msg.reply("❌ Failed to process image. Please try again.");
      return;
    }

    // Save image to disk (temporary storage)
    const tempDir = path.join(__dirname, "../../temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const imagePath = path.join(
      tempDir,
      `image_${Date.now()}.${media.mimetype.split("/")[1] || "jpg"}`
    );
    fs.writeFileSync(imagePath, Buffer.from(media.data, "base64"));
    console.log(`Image saved at: ${imagePath}`);

    // Send to OpenAI Vision API
    const response = await analyzeImageWithOpenAI(imagePath);

    // Reply with analysis
    await msg.reply(`🖼️ *Image Analysis*\n\n${response}`);

    // Clean up temporary file
    fs.unlinkSync(imagePath);
  } catch (error) {
    console.error("Error handling image message:", error);
    await msg.reply("❌ An error occurred while analyzing the image.");
  }
};

/**
 * Analyzes an image using OpenAI's Vision API
 */
const analyzeImageWithOpenAI = async (imagePath) => {
  try {
    // Read the image file as a base64 string
    const imageBuffer = fs.readFileSync(imagePath);

    // Create a vision message using OpenAI's GPT-4o (replacement for vision-preview)
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Please describe this image in detail." },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBuffer.toString("base64")}`,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("OpenAI Vision API error:", error);
    throw new Error("Failed to analyze image with OpenAI");
  }
};

module.exports = {
  handleImageMessage,
};
