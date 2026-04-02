"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import mermaid from "mermaid";
import { useTheme } from "@/providers/theme-provider";

interface EntityNode {
  id: string;
  key: string;
  title: string;
  titleAr: string | null;
  formula: string | null;
  entityType: { code: string; name: string; nameAr: string | null };
  dependencies: EntityNode[];
}

interface EntityDependencyDiagramProps {
  tree: EntityNode | null;
  locale: string;
  loading?: boolean;
}

export function EntityDependencyDiagram({ tree, locale, loading }: EntityDependencyDiagramProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? "dark" : "default",
      securityLevel: "loose",
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: "basis",
      },
    });
  }, [isDark]);

  useEffect(() => {
    if (!mounted || !tree || !containerRef.current) return;

    const generateMermaidDiagram = (): string => {
      const lines: string[] = [];
      const nodes = new Map<string, { title: string; type: string; isRoot: boolean }>();

      const walk = (n: EntityNode, isRoot: boolean = false) => {
        const title = locale === "ar" && n.titleAr ? n.titleAr : n.title;
        const typeLabel = locale === "ar" && n.entityType?.nameAr ? n.entityType.nameAr : n.entityType?.name;
        
        if (!nodes.has(n.id)) {
          nodes.set(n.id, {
            title: title.length > 20 ? title.slice(0, 20) + "..." : title,
            type: typeLabel || n.entityType?.code || "",
            isRoot,
          });
        }

        for (const dep of n.dependencies ?? []) {
          const depTitle = locale === "ar" && dep.titleAr ? dep.titleAr : dep.title;
          const shortDepTitle = depTitle.length > 20 ? depTitle.slice(0, 20) + "..." : depTitle;
          lines.push(`    ${n.id} --> ${dep.id}`);
          walk(dep);
        }
      };

      walk(tree, true);

      // Build node definitions with styling
      const nodeDefs: string[] = [];
      nodes.forEach((nodeData, nodeId) => {
        const styleClass = nodeData.isRoot ? "rootNode" : "depNode";
        const label = `${nodeData.title}\\n(${nodeData.type})`;
        nodeDefs.push(`    ${nodeId}("${label}"):::${styleClass}`);
      });

      return `flowchart TD
    %% Node Definitions
${nodeDefs.join("\n")}

    %% Dependencies
${lines.join("\n")}

    %% Styling
    classDef rootNode fill:#3b82f6,stroke:#2563eb,stroke-width:3px,color:#fff
    classDef depNode fill:${isDark ? "#1e293b" : "#f8fafc"},stroke:${isDark ? "#475569" : "#cbd5e1"},stroke-width:2px,color:${isDark ? "#e2e8f0" : "#1e293b"}
    
    %% Link styling
    linkStyle default stroke:${isDark ? "#64748b" : "#94a3b8"},stroke-width:2px`;
    };

    const renderDiagram = async () => {
      try {
        const diagramDefinition = generateMermaidDiagram();
        const { svg } = await mermaid.render(`mermaid-${tree.id}`, diagramDefinition);
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (error) {
        console.error("Failed to render mermaid diagram:", error);
        if (containerRef.current) {
          containerRef.current.innerHTML = `<div class="p-4 text-red-500">${locale === "ar" ? "فشل عرض الرسم البياني" : "Failed to render diagram"}</div>`;
        }
      }
    };

    renderDiagram();
  }, [tree, locale, isDark, mounted]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tree) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        {locale === "ar" ? "لا توجد اعتماديات لعرضها." : "No dependencies to display."}
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-border overflow-hidden p-4"
      style={{
        backgroundColor: isDark ? "#0d1117" : "#f8fafc",
        minHeight: "400px",
      }}
    >
      <div 
        ref={containerRef} 
        className="mermaid-diagram w-full h-full flex items-center justify-center"
        style={{ minHeight: "380px" }}
      />
    </div>
  );
}
