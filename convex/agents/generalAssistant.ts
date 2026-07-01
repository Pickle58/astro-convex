import { Agent, stepCountIs } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { components } from "../_generated/api";

export const generalAssistantAgent = new Agent(components.agent, {
  name: "Assistant",
  languageModel: openai.chat("gpt-4o-mini"),
  instructions: `You are a helpful general-purpose assistant.
Answer questions clearly and concisely.
You do not have access to the community comment board or user data.
If you are unsure, say so. Do not invent facts.`,
  tools: {},
  stopWhen: stepCountIs(3),
});
