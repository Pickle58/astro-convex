/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agents_commentCoach from "../agents/commentCoach.js";
import type * as agents_generalAssistant from "../agents/generalAssistant.js";
import type * as agents_tools from "../agents/tools.js";
import type * as ai from "../ai.js";
import type * as assistant_actions from "../assistant/actions.js";
import type * as chat_actions from "../chat/actions.js";
import type * as chat_messages from "../chat/messages.js";
import type * as chat_threads from "../chat/threads.js";
import type * as comments from "../comments.js";
import type * as commentsInternal from "../commentsInternal.js";
import type * as crons from "../crons.js";
import type * as lib_agentAuth from "../lib/agentAuth.js";
import type * as lib_aiConfig from "../lib/aiConfig.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_comments from "../lib/comments.js";
import type * as lib_displayName from "../lib/displayName.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as lib_threadContext from "../lib/threadContext.js";
import type * as lib_utcDayStart from "../lib/utcDayStart.js";
import type * as lib_validators from "../lib/validators.js";
import type * as suggestions from "../suggestions.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "agents/commentCoach": typeof agents_commentCoach;
  "agents/generalAssistant": typeof agents_generalAssistant;
  "agents/tools": typeof agents_tools;
  ai: typeof ai;
  "assistant/actions": typeof assistant_actions;
  "chat/actions": typeof chat_actions;
  "chat/messages": typeof chat_messages;
  "chat/threads": typeof chat_threads;
  comments: typeof comments;
  commentsInternal: typeof commentsInternal;
  crons: typeof crons;
  "lib/agentAuth": typeof lib_agentAuth;
  "lib/aiConfig": typeof lib_aiConfig;
  "lib/auth": typeof lib_auth;
  "lib/comments": typeof lib_comments;
  "lib/displayName": typeof lib_displayName;
  "lib/rateLimit": typeof lib_rateLimit;
  "lib/threadContext": typeof lib_threadContext;
  "lib/utcDayStart": typeof lib_utcDayStart;
  "lib/validators": typeof lib_validators;
  suggestions: typeof suggestions;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
};
