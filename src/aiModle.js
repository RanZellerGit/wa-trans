const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const checkOffense = async (text) => {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Please analyze the following of a given text to determine if it contains any offensive or unfriendly language. If any part of the text is inappropriate or disrespectful or boycott a friend, return only yes or no: ${text}`,
          },
        ],
      },
    ],
    max_tokens: 500,
  });
  return response.choices[0].message.content;
};

module.exports = { openai, checkOffense };
