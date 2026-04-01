"use client";

import { useEffect, useRef } from "react";

interface MermaidDiagramProps {
  children: string;
}

export function MermaidDiagram({ children }: MermaidDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !ref.current) return;

    const renderMermaid = async () => {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: "default",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: 14,
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: "basis",
        },
        sequence: {
          useMaxWidth: true,
        },
        gantt: {
          useMaxWidth: true,
        },
      });

      if (ref.current) {
        try {
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
          const { svg } = await mermaid.render(id, children);
          ref.current.innerHTML = svg;
        } catch (error) {
          console.error("Failed to render mermaid diagram:", error);
          ref.current.innerHTML = `<pre class="text-red-600">Error rendering diagram</pre>`;
        }
      }
    };

    renderMermaid();
  }, [children]);

  return (
    <div
      ref={ref}
      className="mermaid my-8 flex justify-center overflow-x-auto rounded-lg bg-slate-50 p-4"
    />
  );
}
