import type { UIMessage } from "@convex-dev/agent/react";

export function AgentMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const isStreaming = !isUser && message.status === "streaming";
  const displayText = message.text || "…";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
          isUser
            ? "bg-indigo-600 text-white"
            : "border border-gray-200 bg-gray-50 text-gray-800"
        }`}
      >
        {displayText}
        {isStreaming && message.text && (
          <span className="ml-0.5 inline-block animate-pulse text-indigo-400">▍</span>
        )}
      </div>
    </div>
  );
}
