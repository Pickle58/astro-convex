"use node";

import { v } from "convex/values";
import OpenAI from "openai";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import { SUGGESTION_MODEL } from "./lib/aiConfig";
import { getUtcDayStart } from "./lib/utcDayStart";
import { suggestCommentArgsValidator } from "./lib/validators";

const MAX_DRAFT_LENGTH = 2000;

const SYSTEM_PROMPT =
  "You improve comment text for grammar and clarity. Keep the same meaning and approximate length. Do not add new information. Return only the improved comment text with no quotes or explanation.";

export const suggestComment = action({
  args: suggestCommentArgsValidator,
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const draft = args.draft.trim();
    if (!draft) {
      throw new Error("Nothing to suggest");
    }
    if (draft.length > MAX_DRAFT_LENGTH) {
      throw new Error(
        `Comment draft must be ${MAX_DRAFT_LENGTH} characters or less`,
      );
    }

    const dayStart = getUtcDayStart(Date.now());
    await ctx.runMutation(internal.suggestions.assertCanSuggest, { dayStart });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("OPENAI_API_KEY is not configured");
      throw new Error("Suggestion is unavailable. Please try again later.");
    }

    const openai = new OpenAI({ apiKey, timeout: 15 * 1000, maxRetries: 1 });
    let suggestion: string;

    try {
      const response = await openai.chat.completions.create({
        model: SUGGESTION_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: draft },
        ],
      });

      const text = response.choices[0]?.message?.content?.trim();
      if (!text) {
        throw new Error("No suggestion returned");
      }
      suggestion = text;
    } catch (error) {
      console.error("OpenAI suggestion failed:", error);
      throw new Error("Could not generate a suggestion. Please try again.");
    }

    await ctx.runMutation(internal.suggestions.saveSuggestion, {
      dayStart,
      model: SUGGESTION_MODEL,
    });

    return suggestion;
  },
});
