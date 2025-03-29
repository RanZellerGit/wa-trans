const fs = require("fs");
const path = require("path");
const { openai } = require("../aiModle");
const logger = require("../utils/logger");
const { insertMessageHandler } = require("./chatMessageHadle");
const { parseMessage } = require("../utils/messageParser");
const { hasGroupInviter } = require("../db/actions/groupUserActions");
/**
 * Handles image messages from WhatsApp and uses OpenAI Vision API to analyze them
 */
const handleImageMessage = async (msg) => {
  const messageContent = await parseMessage(msg);
  logger.info("Processing image message...");
  logger.info("handleImageMessage: messageContent", messageContent);
  let ret = { isGroup: false, text: "", type: "image" };
  try {
    if (messageContent.isGroup) {
      const groupHasInviter = await hasGroupInviter(messageContent.groupId);
      if (!groupHasInviter) {
        return ret;
      }
      ret.isGroup = true;
    }
    // Download the image
    const media = await msg.downloadMedia();
    if (!media) {
      logger.error("Failed to download media");
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
    logger.info(`Image saved at: ${imagePath}`);

    // Send to OpenAI Vision API
    const response = await analyzeImageWithOpenAI(imagePath);
    ret.text = response;
    // Reply with analysis
    await insertMessageHandler(msg, `*Image Analysis*\n\n${response}`);

    // Clean up temporary file
    fs.unlinkSync(imagePath);
    logger.info("Image processing completed successfully");
  } catch (error) {
    logger.error("Error handling image message:", {
      error: error.message,
      stack: error.stack,
    });
  }
  logger.info("handleImageMessage: ret", ret);
  return ret;
};

/**
 * Analyzes an image using OpenAI's Vision API
 */
const analyzeImageWithOpenAI = async (imagePath) => {
  try {
    logger.info("Starting OpenAI image analysis");
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

    logger.info("Successfully analyzed image with OpenAI");
    return response.choices[0].message.content.trim();
  } catch (error) {
    logger.error("OpenAI Vision API error:", {
      error: error.message,
      stack: error.stack,
    });
    throw new Error("Failed to analyze image with OpenAI");
  }
};

module.exports = {
  handleImageMessage,
};
