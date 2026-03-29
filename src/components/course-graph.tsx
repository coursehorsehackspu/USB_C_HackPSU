"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { layoutWithDagre } from "@/lib/graph-layout";
import type { CourseGraphPayload, CourseGraphNode } from "@/types/graph";
import { useUiStore } from "@/stores/ui-store";

async function fetchGraph(): Promise<CourseGraphPayload> {
  const stored = localStorage.getItem("coursehorse.onboarding.v1");
  const onboarding = stored
    ? (JSON.parse(stored) as { major?: string; completedCourseIds?: string[] })
    : {};
 
  const subject = onboarding.major?.toUpperCase() || "CMPSC";
  const completed = (onboarding.completedCourseIds || []).join(",");
 
  const res = await fetch(`/api/graph?subject=${subject}&completed=${completed}`);
  if (!res.ok) throw new Error("Could not load graph");
  return res.json();
}


const statusClass: Record<CourseGraphNode["status"], string> = {
  completed: "border-emerald-500 bg-emerald-50 text-emerald-950",
  available: "border-sky-500 bg-sky-50 text-sky-950",
  locked: "border-stone-300 bg-stone-100 text-stone-600",
};

function CourseNode({ data, selected }: NodeProps) {
  const d = data as CourseGraphNode;
  return (
    <div
      className={`min-w-[180px] max-w-[220px] rounded-lg border-2 px-3 py-2 shadow-sm transition-shadow ${
        statusClass[d.status]
      } ${selected ? "ring-2 ring-amber-400 ring-offset-2" : ""}`}
    >
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !bg-stone-400" />
      <div className="text-xs font-semibold">{d.code}</div>
      <div className="truncate text-[11px] text-stone-600">{d.title}</div>
      <div className="text-[10px] text-stone-500">{d.credits} cr</div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !bg-stone-400" />
    </div>
  );
}

const nodeTypes = { course: CourseNode };

function FitViewOnFocus({
  focusId,
  nodeIds,
}: {
  focusId: string | null;
  nodeIds: string[];
}) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (!focusId || !nodeIds.includes(focusId)) return;
    const id = window.requestAnimationFrame(() => {
      fitView({ nodes: [{ id: focusId }], duration: 400, padding: 0.28 });
    });
    return () => window.cancelAnimationFrame(id);
  }, [focusId, fitView, nodeIds]);

  return null;
}

function SearchPanel({
  courses,
  onPick,
}: {
  courses: CourseGraphNode[];
  onPick: (c: CourseGraphNode) => void;
}) {
  const [q, setQ] = useState("");
  const { fitView } = useReactFlow();

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return courses.filter(
      (c) => c.code.toLowerCase().includes(s) || c.title.toLowerCase().includes(s),
    );
  }, [courses, q]);

  return (
    <Panel
      position="top-left"
      className="m-2 flex max-w-xs flex-col gap-2 rounded-lg bg-white/95 p-2 shadow-sm ring-1 ring-stone-200 backdrop-blur"
    >
      <span className="text-xs font-medium text-stone-600">Find a course</span>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="e.g. CS 201"
        className="w-full rounded-lg border border-stone-200 px-2 py-1.5 text-xs text-stone-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
      />
      {q.trim() ? (
        <ul className="max-h-40 overflow-auto rounded-lg border border-stone-100 bg-white text-xs shadow-sm">
          {filtered.length === 0 ? (
            <li className="px-2 py-2 text-stone-500">No matches</li>
          ) : (
            filtered.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="w-full px-2 py-1.5 text-left hover:bg-amber-50"
                  onClick={() => {
                    onPick(c);
                    fitView({ nodes: [{ id: c.id }], duration: 350, padding: 0.3 });
                    setQ("");
                  }}
                >
                  <span className="font-medium">{c.code}</span>{" "}
                  <span className="text-stone-500">{c.title}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </Panel>
  );
}

function GraphInner({ focusId }: { focusId: string | null }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["graph"],
    queryFn: fetchGraph,
  });

  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const setHorseyContext = useUiStore((s) => s.setHorseyContext);
  const setHorseyOpen = useUiStore((s) => s.setHorseyOpen);

  const payload = data;

  useEffect(() => {
    if (!payload) return;
    const n: Node[] = payload.nodes.map((node) => ({
      id: node.id,
      type: "course",
      position: { x: 0, y: 0 },
      data: node,
    }));
    const e: Edge[] = payload.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
    }));
    const laid = layoutWithDagre(n, e, "TB");
    setNodes(laid);
    setEdges(e);
  }, [payload, setNodes, setEdges]);

  useEffect(() => {
    if (!hoveredEdgeId) {
      setNodes((nds) => nds.map((n) => ({ ...n, style: undefined })));
      return;
    }
    const edge = edges.find((e) => e.id === hoveredEdgeId);
    if (!edge) return;
    const keep = new Set([edge.source, edge.target]);
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        style: keep.has(n.id) ? { opacity: 1 } : { opacity: 0.22 },
      })),
    );
  }, [hoveredEdgeId, edges, setNodes]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedId(null);
        setHorseyContext({ selectedCourse: undefined });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setHorseyContext]);

  useEffect(() => {
    if (!focusId || !payload?.nodes.some((n) => n.id === focusId)) return;
    queueMicrotask(() => {
      setSelectedId(focusId);
      setHorseyContext({
        view: "graph",
        selectedCourse: {
          id: focusId,
          code: payload.nodes.find((n) => n.id === focusId)?.code ?? focusId,
        },
      });
    });
  }, [focusId, payload, setHorseyContext]);

  const styledEdges = useMemo(
    () =>
      edges.map((edge) => ({
        ...edge,
        style: hoveredEdgeId
          ? {
              opacity: hoveredEdgeId === edge.id ? 1 : 0.2,
              strokeWidth: hoveredEdgeId === edge.id ? 2.5 : 1,
            }
          : {},
      })),
    [edges, hoveredEdgeId],
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedId(node.id);
      const d = node.data as CourseGraphNode;
      setHorseyContext({ selectedCourse: { id: d.id, code: d.code }, view: "graph" });
    },
    [setHorseyContext],
  );

  const onPaneClick = useCallback(() => {
    setSelectedId(null);
    setHorseyContext({ selectedCourse: undefined });
  }, [setHorseyContext]);

  if (isLoading) {
    return (
      <div
        className="h-[min(70vh,640px)] animate-pulse rounded-xl bg-stone-100"
        aria-busy
      />
    );
  }

  if (isError || !payload) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-800">
        Could not load graph.{" "}
        <button
          type="button"
          className="underline"
          onClick={() => void refetch()}
        >
          Retry
        </button>
      </div>
    );
  }

  const selected = payload.nodes.find((n) => n.id === selectedId);
  const nodeIds = payload.nodes.map((n) => n.id);

  return (
    <div className="relative h-[min(70vh,640px)] w-full rounded-xl border border-stone-200 bg-stone-50">
      <ReactFlow
        nodes={nodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onEdgeMouseEnter={(_, e) => setHoveredEdgeId(e.id)}
        onEdgeMouseLeave={() => setHoveredEdgeId(null)}
        fitView
        minZoom={0.35}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
      >
        <FitViewOnFocus focusId={focusId} nodeIds={nodeIds} />
        <Background gap={20} size={1} color="#e7e5e4" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(n) => {
            const d = n.data as CourseGraphNode;
            return d.status === "completed"
              ? "#10b981"
              : d.status === "available"
                ? "#0ea5e9"
                : "#a8a29e";
          }}
          maskColor="rgb(250 250 249 / 0.85)"
        />
        <SearchPanel
          courses={payload.nodes}
          onPick={(c) => {
            setSelectedId(c.id);
            setHorseyContext({ selectedCourse: { id: c.id, code: c.code }, view: "graph" });
          }}
        />
      </ReactFlow>

      {selected ? (
        <div className="pointer-events-none absolute bottom-4 left-4 right-4 max-w-md sm:pointer-events-auto">
          <div className="pointer-events-auto rounded-xl border border-stone-200 bg-white p-4 shadow-lg">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-stone-900">
                  {selected.code}
                </div>
                <div className="text-sm text-stone-600">{selected.title}</div>
              </div>
              <button
                type="button"
                className="text-xs text-stone-500 hover:text-stone-800"
                onClick={() => {
                  setSelectedId(null);
                  setHorseyContext({ selectedCourse: undefined });
                }}
              >
                Esc
              </button>
            </div>
            {selected.description ? (
              <p className="mt-2 text-xs leading-relaxed text-stone-600">
                {selected.description}
              </p>
            ) : null}
            {selected.skills?.length ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {selected.skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] text-stone-700"
                  >
                    {s}
                  </span>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              className="mt-3 w-full rounded-lg bg-amber-500 py-2 text-sm font-medium text-amber-950 hover:bg-amber-400"
              onClick={() => setHorseyOpen(true)}
            >
              Ask Horsey about this course
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function CourseGraphView() {
  const search = useSearchParams();
  const focusId = search.get("focus");

  return (
    <ReactFlowProvider>
      <GraphInner focusId={focusId} />
    </ReactFlowProvider>
  );
}
