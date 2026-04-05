"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Sidebar } from "@/components/Sidebar";
import { MermaidDiagram } from "@/components/Mermaid";
// Custom paragraph component - always use div to prevent pre inside p issues
const Paragraph = ({ children, ...props }: any) => {
  return <div {...props}>{children}</div>;
};

// Custom component to handle Mermaid diagrams, code blocks, and tables
const CodeBlock = ({ inline, className, children, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";
  const content = String(children).replace(/\n$/, "");

  // Handle Mermaid diagrams
  if (language === "mermaid") {
    return (
      <div className="my-6">
        <MermaidDiagram>{content}</MermaidDiagram>
      </div>
    );
  }

  // Handle inline code (single backticks or no language specified)
  if (inline || (!language && !content.includes("\n"))) {
    return (
      <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
        {children}
      </code>
    );
  }

  // Handle block code (triple backticks)
  return (
    <pre className="bg-slate-100 rounded-md p-4 overflow-x-auto my-4 block" {...props}>
      <code className="text-sm font-mono">{children}</code>
    </pre>
  );
};

// Custom table component for better styling
const Table = ({ children }: any) => {
  return (
    <div className="overflow-x-auto my-6 rounded-lg border border-slate-200 shadow-sm">
      <table className="w-full border-collapse">
        {children}
      </table>
    </div>
  );
};

const TableHead = ({ children }: any) => {
  return (
    <thead className="bg-slate-50 border-b border-slate-200">
      {children}
    </thead>
  );
};

const TableRow = ({ children, index }: any) => {
  return (
    <tr className={`border-b border-slate-100 last:border-b-0 transition-colors ${
      index % 2 === 0 ? 'bg-white hover:bg-blue-50/30' : 'bg-slate-50/50 hover:bg-blue-50/50'
    }`}>
      {children}
    </tr>
  );
};

const TableCell = ({ children, isHeader }: any) => {
  if (isHeader) {
    return (
      <th className="px-4 py-3 text-right font-semibold text-slate-700 text-sm">
        {children}
      </th>
    );
  }
  return (
    <td className="px-4 py-3 text-slate-600 text-sm">
      {children}
    </td>
  );
};

interface DocPageProps {
  title: string;
  content: string;
}

export function DocPage({ title, content }: DocPageProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 lg:mr-72">
        {/* Mobile Spacing */}
        <div className="h-14 lg:hidden" />

        <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8 lg:py-12">
          {/* Page Header */}
          <div className="mb-8 border-b pb-6">
            <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
          </div>

          {/* Content */}
          <div className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-h1:text-3xl prose-h2:text-2xl prose-h2:border-b prose-h2:pb-2 prose-h2:mt-8 prose-h3:text-xl prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-slate-100 prose-pre:p-4 prose-pre:rounded-md prose-table:border-collapse prose-table:w-full prose-th:border prose-th:border-slate-300 prose-th:bg-slate-50 prose-th:p-3 prose-th:text-right prose-td:border prose-td:border-slate-300 prose-td:p-3 prose-hr:border-slate-300 prose-hr:my-6">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                code: CodeBlock,
                p: Paragraph,
                table: Table,
                thead: TableHead,
                tr: TableRow,
                th: (props: any) => <TableCell {...props} isHeader />,
                td: (props: any) => <TableCell {...props} />,
              }}
            >
              {content}
            </ReactMarkdown>
          </div>

          {/* Footer */}
          <footer className="mt-16 border-t pt-8 text-sm text-slate-600 no-print">
            <p>دليل استخدام منصة  المؤشرات KPI © 2025</p>
          </footer>
        </div>
      </main>
    </div>
  );
}
