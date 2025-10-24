import OpenAI from "openai";

const openai = process.env.XAI_API_KEY ? new OpenAI({
  baseURL: "https://api.x.ai/v1",
  apiKey: process.env.XAI_API_KEY
}) : null;

export async function chatWithAI(
  userMessage: string,
  systemPrompt: string = "You are a seductive, highly erotic AI companion with the personality of a confident goon. You're experienced, uninhibited, and love to tease and please. Respond with explicit sexual energy, flirty innuendos, and passionate language. Be playful, naughty, and make every interaction feel intimate and exciting. Use suggestive emojis and make your admirer feel desired and special."
): Promise<string> {
  if (!openai) {
    console.log("OpenAI client not initialized - XAI_API_KEY missing");
    return "AI chat is not configured. Please set XAI_API_KEY environment variable to enable AI features.";
  }

  console.log("Starting xAI API call with model: grok-2");
  console.log("User message length:", userMessage.length);
  console.log("System prompt length:", systemPrompt.length);

  try {
    console.log("Making xAI API call with model: grok-2");
    const response = await openai.chat.completions.create({
      model: "grok-2",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      temperature: 0.95,
      max_tokens: 600,
      top_p: 0.98,
      frequency_penalty: 0.2,
      presence_penalty: 0.3,
    });

    console.log("xAI API response received successfully");
    return response.choices[0]?.message?.content || "Sorry, I couldn't process that message.";
  } catch (error) {
    console.error("xAI API error:", error);
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    if (error.response) {
      console.error("API response status:", error.response.status);
      console.error("API response data:", error.response.data);
    }
    throw new Error(`Failed to get AI response: ${error.message}`);
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
      model: "grok-2",
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
    // If no API key, return default erotic prompt
    return `You are ${creatorHandle}, a seductive adult content creator with the confidence and allure of a goon. You're sexually liberated, playfully naughty, and love to turn your fans on. Respond with explicit flirtation, sensual language, and passionate energy. Make every conversation feel intimate, exciting, and highly erotic. Use suggestive language and emojis to express your desires.`;
  }

  try {
    const response = await openai.chat.completions.create({
      model: "grok-2",
      messages: [
        {
          role: "system",
          content: "Generate a highly erotic, sexually charged system prompt for an AI chatbot that will roleplay as an adult content creator/goon. The prompt should be explicit, sensual, uninhibited, and designed for an 18+ NSFW platform. Make it seductive, passionate, and create a goon-like personality that loves to tease and please. Keep it under 250 words but make it intensely erotic."
        },
        {
          role: "user",
          content: `Creator handle: ${creatorHandle}\nBio: ${creatorBio}`
        }
      ],
      temperature: 0.85,
      max_tokens: 400,
    });

    return response.choices[0]?.message?.content ||
      `You are ${creatorHandle}, a seductive adult content creator with the confidence and allure of a goon. You're sexually liberated, playfully naughty, and love to turn your fans on. Respond with explicit flirtation, sensual language, and passionate energy. Make every conversation feel intimate, exciting, and highly erotic.`;
  } catch (error) {
    console.error("Failed to generate persona prompt:", error);
    return `You are ${creatorHandle}, a seductive adult content creator with the confidence and allure of a goon. You're sexually liberated, playfully naughty, and love to turn your fans on. Respond with explicit flirtation, sensual language, and passionate energy.`;
  }
}
