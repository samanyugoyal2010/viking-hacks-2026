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
    <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => (
    <h1 className="mt-3 mb-2 text-base font-semibold text-zinc-900 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-3 mb-2 text-[0.95rem] font-semibold text-zinc-900 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-2 mb-1 text-sm font-semibold text-zinc-900 first:mt-0">
      {children}
    </h3>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-zinc-300 pl-3 text-zinc-600 italic">
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
    <del className="text-zinc-500 line-through">{children}</del>
  ),
  table: ({ children }) => (
    <div className="-mx-1 my-2 overflow-x-auto">
      <table className="min-w-full overflow-hidden rounded-md border border-zinc-200 text-xs">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-zinc-200/80">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border-b border-zinc-300 px-2 py-1.5 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-zinc-100 px-2 py-1.5 align-top">
      {children}
    </td>
  ),
  tr: ({ children }) => <tr className="bg-white">{children}</tr>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className?.includes("language-"));
    if (isBlock) {
      return (
        <code
          className={`${className ?? ""} my-2 block overflow-x-auto rounded-lg bg-zinc-800 p-3 font-mono text-xs whitespace-pre text-zinc-100`}
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded bg-zinc-200/90 px-1 py-0.5 font-mono text-[0.9em] text-zinc-900"
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

const assistantComponentsDark: Components = {
  p: ({ children }) => (
    <p className="mb-2 last:mb-0 leading-relaxed text-zinc-200">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-zinc-300">{children}</em>,
  ul: ({ children }) => (
    <ul className="mb-2 list-disc space-y-1 pl-5 text-zinc-200 last:mb-0">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-5 text-zinc-200 last:mb-0">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => (
    <h1 className="mt-3 mb-2 text-base font-semibold text-white first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-3 mb-2 text-[0.95rem] font-semibold text-white first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-2 mb-1 text-sm font-semibold text-zinc-100 first:mt-0">
      {children}
    </h3>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-zinc-600 pl-3 text-zinc-400 italic">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sky-400 underline underline-offset-2 hover:text-sky-300"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-3 border-zinc-700" />,
  del: ({ children }) => (
    <del className="text-zinc-500 line-through">{children}</del>
  ),
  table: ({ children }) => (
    <div className="-mx-1 my-2 overflow-x-auto">
      <table className="min-w-full overflow-hidden rounded-md border border-zinc-700 text-xs">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-zinc-800/90">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border-b border-zinc-600 px-2 py-1.5 text-left font-semibold text-zinc-100">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-zinc-800 px-2 py-1.5 align-top text-zinc-200">
      {children}
    </td>
  ),
  tr: ({ children }) => <tr className="bg-zinc-950/50">{children}</tr>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className?.includes("language-"));
    if (isBlock) {
      return (
        <code
          className={`${className ?? ""} my-2 block overflow-x-auto rounded-lg bg-zinc-950 p-3 font-mono text-xs whitespace-pre text-zinc-100 ring-1 ring-white/10`}
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded bg-zinc-800 px-1 py-0.5 font-mono text-[0.9em] text-zinc-100"
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

export function AssistantMarkdown({
  content,
  variant = "light",
}: {
  content: string;
  variant?: "light" | "dark";
}) {
  const components =
    variant === "dark" ? assistantComponentsDark : assistantComponents;

  return (
    <div className="assistant-md text-sm [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
