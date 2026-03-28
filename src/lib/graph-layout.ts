import dagre from "dagre";
import type { Edge, Node } from "@xyflow/react";

const NODE_W = 200;
const NODE_H = 56;

export function layoutWithDagre(
  nodes: Node[],
  edges: Edge[],
  direction: "TB" | "LR" = "TB",
): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 48, ranksep: 72, marginx: 24, marginy: 24 });

  nodes.forEach((n) => {
    g.setNode(n.id, { width: NODE_W, height: NODE_H });
  });
  edges.forEach((e) => {
    g.setEdge(e.source, e.target);
  });

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    if (!pos) return node;
    return {
      ...node,
      position: {
        x: pos.x - NODE_W / 2,
        y: pos.y - NODE_H / 2,
      },
    };
  });
}
