import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/** Cheap & fast model for simple tasks (translate, formula, describe, suggest-note) */
export function getModel() {
  return openai(process.env.AI_MODEL ?? "gpt-4o-mini");
}

/** Smarter model for complex reasoning (chat agent, executive summary) */
export function getSmartModel() {
  return openai(process.env.AI_MODEL_SMART ?? "gpt-4o");
}
