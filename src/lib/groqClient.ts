import Groq from "groq-sdk";
import { appConfig } from "../config/app.config";

const groq = new Groq({ apiKey: appConfig.GROQ_API_KEY });

export const callGroq = async (prompt: string, maxTokens: number = 2048): Promise<string> => {
  const response = await groq.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    messages: [{ role: "user", content: prompt }],
    max_tokens: maxTokens,
  });
  return response.choices[0]?.message?.content || "";
};