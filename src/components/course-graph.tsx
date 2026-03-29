"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import type { CourseGraphNode } from "@/types/graph";
import { useUiStore } from "@/stores/ui-store";

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

function FitViewOnChange({
  focusId,
  nodeIds,
  payloadKey,
}: {
  focusId: string | null;
  nodeIds: string[];
  payloadKey: string;
}) {
  const { fitView } = useReactFlow();
  const prevKey = useRef(payloadKey);
  const lastFocusedId = useRef<string | null>(null);

  useEffect(() => {
    if (prevKey.current !== payloadKey) {
      prevKey.current = payloadKey;
      const id = window.requestAnimationFrame(() => {
        fitView({ duration: 350, padding: 0.15 });
      });
      return () => window.cancelAnimationFrame(id);
    }
  }, [payloadKey, fitView]);

  useEffect(() => {
    if (!focusId || !nodeIds.includes(focusId)) return;
    if (lastFocusedId.current === focusId) return;

    lastFocusedId.current = focusId;
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
        placeholder="e.g. CMPSC 132"
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

function EmptyGraphState() {
  const setHorseyOpen = useUiStore((s) => s.setHorseyOpen);

  return (
    <div className="flex h-[min(70vh,640px)] w-full flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-stone-50/50">
      <svg viewBox="0 0 24 24" fill="none" className="h-12 w-12 text-stone-300" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" /><circle cx="12" cy="18" r="3" />
        <path d="M8.5 7.5 10.5 16M15.5 7.5 13.5 16" />
      </svg>
      <h3 className="mt-4 text-sm font-semibold text-stone-700">No prerequisite graph yet</h3>
      <p className="mt-1 max-w-xs text-center text-xs leading-relaxed text-stone-500">
        Ask Horsey to build a prerequisite graph for any course or department and it will appear here.
      </p>
      <button
        type="button"
        onClick={() => setHorseyOpen(true)}
        className="mt-4 rounded-lg bg-amber-500 px-5 py-2 text-sm font-medium text-amber-950 shadow-sm hover:bg-amber-400"
      >
        Ask Horsey
      </button>
    </div>
  );
}

function GraphInner({ focusId }: { focusId: string | null }) {
  const graphPayload = useUiStore((s) => s.graphPayload);
  const clearGraphPayload = useUiStore((s) => s.clearGraphPayload);

  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const setHorseyContext = useUiStore((s) => s.setHorseyContext);
  const setHorseyOpen = useUiStore((s) => s.setHorseyOpen);

  const payload = graphPayload;

  useEffect(() => {
    if (!payload) {
      setNodes([]);
      setEdges([]);
      return;
    }
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
        if (descriptionOpen) {
          setDescriptionOpen(false);
          return;
        }
        setSelectedId(null);
        setHorseyContext({ selectedCourse: undefined });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [descriptionOpen, setHorseyContext]);

  useEffect(() => {
    if (!focusId || !payload?.nodes.some((n) => n.id === focusId)) return;
    queueMicrotask(() => {
      setDescriptionOpen(false);
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
      setDescriptionOpen(false);
      setSelectedId(node.id);
      const d = node.data as CourseGraphNode;
      setHorseyContext({ selectedCourse: { id: d.id, code: d.code }, view: "graph" });
    },
    [setHorseyContext],
  );

  const onPaneClick = useCallback(() => {
    setDescriptionOpen(false);
    setSelectedId(null);
    setHorseyContext({ selectedCourse: undefined });
  }, [setHorseyContext]);

  if (!payload) return <EmptyGraphState />;

  const selected = payload.nodes.find((n) => n.id === selectedId);
  const nodeIds = payload.nodes.map((n) => n.id);
  const payloadKey = payload.nodes.map((n) => n.id).sort().join(",");
  const previewDescription = selected?.description
    ? selected?.description?.slice(0, 170).trimEnd()
    : undefined;

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
        <FitViewOnChange focusId={focusId} nodeIds={nodeIds} payloadKey={payloadKey} />
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
            setDescriptionOpen(false);
            setSelectedId(c.id);
            setHorseyContext({ selectedCourse: { id: c.id, code: c.code }, view: "graph" });
          }}
        />
        <Panel
          position="top-right"
          className="m-2 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 shadow-sm ring-1 ring-amber-200 backdrop-blur"
        >
          <span className="text-xs font-medium text-amber-800">
            Horsey&apos;s graph
          </span>
          <button
            type="button"
            onClick={clearGraphPayload}
            className="rounded-md bg-amber-200 px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-300"
          >
            Clear
          </button>
        </Panel>
      </ReactFlow>

      {selected ? (
        <div className="pointer-events-none absolute bottom-4 left-4 right-4 max-w-md sm:pointer-events-auto">
          <div className="pointer-events-auto relative rounded-xl border border-stone-200 bg-white p-4 shadow-lg">
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
                  setDescriptionOpen(false);
                  setSelectedId(null);
                  setHorseyContext({ selectedCourse: undefined });
                }}
              >
                Esc
              </button>
            </div>
            {selected.description ? (
              <p className="mt-2 text-xs leading-relaxed text-stone-600">
                {previewDescription}
                {selected.description.length > 170 ? "..." : ""}
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
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100"
                onClick={() => setHorseyOpen(true)}
              >
                Ask Horsey About
              </button>
              <button
                type="button"
                className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-amber-950 hover:bg-amber-400"
                onClick={() => setDescriptionOpen(true)}
              >
                Full Description
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {descriptionOpen && selected?.description ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-stone-950/25 p-4 backdrop-blur-[2px]">
          <div className="relative max-h-[min(80vh,640px)] w-full max-w-2xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-stone-100 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-stone-900">
                  {selected.code} full description
                </h3>
                <p className="mt-1 text-sm text-stone-500">{selected.title}</p>
              </div>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                onClick={() => setDescriptionOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="max-h-[calc(min(80vh,640px)-88px)] overflow-y-auto px-5 py-4">
              <p className="whitespace-pre-wrap text-sm leading-7 text-stone-700">
                {selected.description}
              </p>
            </div>
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
