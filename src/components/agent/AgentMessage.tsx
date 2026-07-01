import type { Components } from "react-markdown";
import type { UIMessage } from "@convex-dev/agent/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-indigo-600 underline hover:text-indigo-800"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  code: ({ className, children }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code className="my-2 block overflow-x-auto rounded bg-gray-200/80 p-2 font-mono text-xs">
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-gray-200/80 px-1 py-0.5 font-mono text-xs">
        {children}
      </code>
    );
  },
  pre: ({ children }) => <pre className="my-2 overflow-x-auto last:mb-0">{children}</pre>,
  h1: ({ children }) => (
    <p className="mb-2 text-base font-semibold last:mb-0">{children}</p>
  ),
  h2: ({ children }) => (
    <p className="mb-2 text-sm font-semibold last:mb-0">{children}</p>
  ),
  h3: ({ children }) => (
    <p className="mb-1 text-sm font-semibold last:mb-0">{children}</p>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-gray-300 pl-3 text-gray-600 last:mb-0">
      {children}
    </blockquote>
  ),
};

export function AgentMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const isStreaming = !isUser && message.status === "streaming";
  const displayText = message.text || "…";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? "bg-indigo-600 whitespace-pre-wrap text-white"
            : "border border-gray-200 bg-gray-50 text-gray-800"
        }`}
      >
        {isUser ? (
          displayText
        ) : isStreaming ? (
          <span className="whitespace-pre-wrap">{displayText}</span>
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {displayText}
          </ReactMarkdown>
        )}
        {isStreaming && message.text && (
          <span className="ml-0.5 inline-block animate-pulse text-indigo-400">▍</span>
        )}
      </div>
    </div>
  );
}
