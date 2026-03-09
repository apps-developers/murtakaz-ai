"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import type { EChartsOption } from "echarts";
import { EChart } from "@/components/charts/echart";
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

  const graph = useMemo(() => {
    if (!tree) return null;

    const nodesById = new Map<string, EntityNode>();
    const links: Array<{ source: string; target: string }> = [];
    const edgeSet = new Set<string>();

    const walk = (node: EntityNode) => {
      nodesById.set(node.id, node);
      for (const dep of node.dependencies ?? []) {
        nodesById.set(dep.id, dep);
        const edgeKey = `${node.id}=>${dep.id}`;
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          links.push({ source: node.id, target: dep.id });
        }
        walk(dep);
      }
    };

    walk(tree);

    const categories = Array.from(
      new Set(
        Array.from(nodesById.values()).map((n) => String(n.entityType?.code ?? ""))
      )
    ).map((name) => ({ name }));
    const categoryIndex = new Map<string, number>();
    categories.forEach((c, i) => categoryIndex.set(c.name, i));

    const nodes = Array.from(nodesById.values()).map((n) => {
      const title = locale === "ar" && n.titleAr ? n.titleAr : n.title;
      const typeLabel = locale === "ar" && n.entityType?.nameAr ? n.entityType.nameAr : n.entityType?.name;
      const label = [String(title ?? ""), String(typeLabel ?? "")].filter(Boolean).join("\n");
      const categoryName = String(n.entityType?.code ?? "");

      return {
        id: n.id,
        name: label,
        category: categoryIndex.get(categoryName) ?? 0,
        symbolSize: n.id === tree.id ? 70 : 52,
        value: n.key,
      };
    });

    return { nodes, links, categories };
  }, [locale, tree]);

  const labelColor = isDark ? "#e2e8f0" : "#0f172a";
  const legendColor = isDark ? "rgba(226,232,240,0.85)" : "rgba(15,23,42,0.75)";
  const lineColor = isDark ? "rgba(148,163,184,0.50)" : "rgba(15,23,42,0.30)";
  const tooltipBg = isDark ? "rgba(2,6,23,0.92)" : "rgba(255,255,255,0.95)";
  const tooltipBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(2,6,23,0.10)";
  const tooltipText = isDark ? "rgba(226,232,240,0.92)" : "rgba(15,23,42,0.92)";

  const option = useMemo<EChartsOption>(() => {
    if (!graph || !tree) {
      return { tooltip: { show: false } };
    }

    return {
      tooltip: {
        trigger: "item",
        confine: true,
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        textStyle: { color: tooltipText, fontSize: 12 },
        extraCssText: "border-radius: 10px; box-shadow: 0 8px 32px rgba(0,0,0,0.18); padding: 8px 12px;",
      },
      legend: graph.categories.length
        ? [
            {
              data: graph.categories.map((c) => c.name),
              type: "scroll",
              bottom: 0,
              textStyle: { color: legendColor },
            },
          ]
        : [],
      series: [
        {
          type: "graph",
          layout: "force",
          roam: true,
          draggable: true,
          focusNodeAdjacency: true,
          data: graph.nodes,
          links: graph.links,
          categories: graph.categories,
          edgeSymbol: ["circle", "arrow"],
          edgeSymbolSize: [4, 10],
          lineStyle: {
            width: 2,
            opacity: 0.7,
            curveness: 0.22,
            color: lineColor,
          },
          label: {
            show: true,
            color: labelColor,
            fontSize: 10,
            overflow: "truncate",
            width: 120,
          },
          emphasis: {
            label: { show: true },
            lineStyle: { width: 4, opacity: 0.9 },
          },
          force: {
            repulsion: 900,
            edgeLength: 140,
            gravity: 0.1,
          },
        },
      ],
    };
  }, [graph, tree, tooltipBg, tooltipBorder, tooltipText, legendColor, lineColor, labelColor]);

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

  return <EChart option={option} height={520} className="rounded-lg border border-border bg-muted/20" />;
}
