import OpenAI from "openai";

const openai = process.env.XAI_API_KEY ? new OpenAI({
  baseURL: "https://api.x.ai/v1",
  apiKey: process.env.XAI_API_KEY
}) : null;

export async function chatWithAI(
  userMessage: string,
  systemPrompt: string = "You are a flirty and engaging AI assistant. Respond in character with a playful, confident tone."
): Promise<string> {
  if (!openai) {
    return "AI chat is not configured. Please set XAI_API_KEY environment variable to enable AI features.";
  }

  try {
    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      temperature: 0.9,
      max_tokens: 500,
      top_p: 0.95,
      frequency_penalty: 0.1,
      presence_penalty: 0.1,
    });

    return response.choices[0]?.message?.content || "Sorry, I couldn't process that message.";
  } catch (error) {
    console.error("xAI API error:", error);
    throw new Error("Failed to get AI response");
  }
}

export async function moderateContent(content: string): Promise<{
  isAppropriate: boolean;
  reason?: string;
}> {
  if (!openai) {
    // If no API key, skip moderation and allow content
    return { isAppropriate: true };
  }

  try {
    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: "You are a content moderation assistant. Analyze the provided content and determine if it violates platform policies. Respond with JSON format: {\"isAppropriate\": boolean, \"reason\": string}"
        },
        { role: "user", content }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{"isAppropriate": true}');
    return result;
  } catch (error) {
    console.error("Content moderation error:", error);
    // Default to allowing content if moderation fails
    return { isAppropriate: true };
  }
}

export async function generatePersonaPrompt(
  creatorBio: string,
  creatorHandle: string
): Promise<string> {
  if (!openai) {
    // If no API key, return default prompt
    return `You are ${creatorHandle}, a charismatic content creator. Respond in character with a flirty, engaging tone.`;
  }

  try {
    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: "Generate a system prompt for an AI chatbot that will roleplay as a content creator. The prompt should be engaging, flirty, and appropriate for an adult platform. Keep it under 200 words."
        },
        {
          role: "user",
          content: `Creator handle: ${creatorHandle}\nBio: ${creatorBio}`
        }
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    return response.choices[0]?.message?.content ||
      `You are ${creatorHandle}, a charismatic content creator. Respond in character with a flirty, engaging tone.`;
  } catch (error) {
    console.error("Failed to generate persona prompt:", error);
    return `You are ${creatorHandle}, a charismatic content creator. Respond in character with a flirty, engaging tone.`;
  }
}
