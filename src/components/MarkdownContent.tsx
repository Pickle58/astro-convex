import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Article-grade markdown renderer for blog post bodies. Distinct from the
// compact chat renderer in AgentMessage so post typography can grow freely.
const articleComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mt-6 mb-3 text-3xl font-bold text-gray-900 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-6 mb-3 text-2xl font-semibold text-gray-900 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-5 mb-2 text-xl font-semibold text-gray-900 first:mt-0">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="mb-4 leading-relaxed text-gray-800">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 list-disc space-y-1 pl-6 text-gray-800">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 list-decimal space-y-1 pl-6 text-gray-800">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
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
  img: ({ src, alt }) =>
    typeof src === "string" ? (
      <img
        src={src}
        alt={alt ?? ""}
        className="my-4 h-auto max-w-full rounded-lg border border-gray-200"
        loading="lazy"
      />
    ) : null,
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-4 border-indigo-200 pl-4 text-gray-600 italic">
      {children}
    </blockquote>
  ),
  code: ({ className, children }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code className="block overflow-x-auto rounded bg-gray-100 p-3 font-mono text-sm text-gray-800">
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm text-gray-800">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-4 overflow-x-auto rounded-lg bg-gray-100 p-1">{children}</pre>
  ),
  hr: () => <hr className="my-6 border-gray-200" />,
};

export function MarkdownContent({ markdown }: { markdown: string }) {
  return (
    <div className="text-gray-800">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={articleComponents}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
