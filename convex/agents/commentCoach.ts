import { Agent, stepCountIs } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { components } from "../_generated/api";
import { commentCoachTools } from "./tools";

export const commentCoachAgent = new Agent(components.agent, {
  name: "Comment Coach",
  languageModel: openai.chat("gpt-4o-mini"),
  instructions: `You are a comment writing coach for a community discussion board.
Help users write clear, respectful, and engaging comments.
Use tools when you need board context (recent comments, total count) or when the user wants a draft polished.
When improving drafts, prefer the improveDraft tool rather than rewriting from scratch.
Keep replies concise and actionable.`,
  tools: commentCoachTools,
  stopWhen: stepCountIs(5),
});
