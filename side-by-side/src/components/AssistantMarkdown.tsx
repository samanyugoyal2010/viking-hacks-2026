import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const assistantComponents: Components = {
  p: ({ children }) => (
    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-zinc-900">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => (
    <ul className="list-disc pl-5 mb-2 space-y-1 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 mb-2 space-y-1 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => (
    <h1 className="text-base font-semibold text-zinc-900 mt-3 mb-2 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-[0.95rem] font-semibold text-zinc-900 mt-3 mb-2 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-zinc-900 mt-2 mb-1 first:mt-0">
      {children}
    </h3>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-zinc-300 pl-3 my-2 text-zinc-600 italic">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sky-700 underline underline-offset-2 hover:text-sky-900"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-3 border-zinc-200" />,
  del: ({ children }) => (
    <del className="line-through text-zinc-500">{children}</del>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-2 -mx-1">
      <table className="min-w-full text-xs border border-zinc-200 rounded-md overflow-hidden">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-zinc-200/80">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-2 py-1.5 text-left font-semibold border-b border-zinc-300">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-2 py-1.5 border-b border-zinc-100 align-top">{children}</td>
  ),
  tr: ({ children }) => <tr className="bg-white">{children}</tr>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className?.includes("language-"));
    if (isBlock) {
      return (
        <code
          className={`${className ?? ""} block text-xs font-mono bg-zinc-800 text-zinc-100 p-3 rounded-lg overflow-x-auto my-2 whitespace-pre`}
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className="text-[0.9em] bg-zinc-200/90 text-zinc-900 px-1 py-0.5 rounded font-mono"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-lg">{children}</pre>
  ),
};

export function AssistantMarkdown({ content }: { content: string }) {
  return (
    <div className="assistant-md text-sm [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={assistantComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
