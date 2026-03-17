import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";


const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

/** Cheap & fast model for simple tasks (translate, formula, describe, suggest-note) */
export function getModel() {
  return openrouter(process.env.AI_MODEL ?? "gpt-4o");
}

/** Smarter model for complex reasoning (chat agent, executive summary) */
export function getSmartModel() {
  return openrouter(process.env.AI_MODEL_SMART ?? "gpt-4o");
}
