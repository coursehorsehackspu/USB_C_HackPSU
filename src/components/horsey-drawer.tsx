"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useUiStore } from "@/stores/ui-store";

type Msg = { role: "user" | "assistant"; content: string };

export function HorseyDrawer() {
  const pathname = usePathname();
  const horseyOpen = useUiStore((s) => s.horseyOpen);
  const setHorseyOpen = useUiStore((s) => s.setHorseyOpen);
  const horseyContext = useUiStore((s) => s.horseyContext);
  const setHorseyContext = useUiStore((s) => s.setHorseyContext);

  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hey — I’m Horsey. I’ve got mock context for now; once your backend and Claude are wired up, I’ll use your real plan and graph.",
    },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const view =
      pathname.includes("/graph")
        ? "graph"
        : pathname.includes("/electives")
          ? "electives"
          : pathname.includes("/onboarding")
            ? "onboarding"
            : pathname.includes("/settings")
              ? "settings"
              : "plan";
    setHorseyContext({ view });
  }, [pathname, setHorseyContext]);

  useEffect(() => {
    if (!horseyOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHorseyOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [horseyOpen, setHorseyOpen]);

  async function send() {
    const text = input.trim();
    if (!text || pending) return;
    const userMsg: Msg = { role: "user", content: text };
    setInput("");
    const next = [...messages, userMsg];
    setMessages(next);
    setPending(true);
    try {
      const res = await fetch("/api/horsey/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          context: horseyContext,
        }),
      });
      const data = (await res.json()) as { content?: string };
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.content ?? "No reply." },
      ]);
    } finally {
      setPending(false);
    }
  }

  if (!horseyOpen) return null;

  const ctxLabel =
    horseyContext.view === "plan"
      ? "Plan"
      : horseyContext.view === "graph"
        ? "Graph"
        : horseyContext.view === "electives"
          ? "Electives"
          : horseyContext.view === "onboarding"
            ? "Onboarding"
            : "Settings";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/25 backdrop-blur-[1px]"
        aria-label="Close Horsey"
        onClick={() => setHorseyOpen(false)}
      />
      <aside
        className="relative flex h-full w-full max-w-md flex-col border-l border-stone-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="horsey-title"
      >
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <div>
            <h2 id="horsey-title" className="text-base font-semibold text-stone-900">
              Horsey
            </h2>
            <p className="text-xs text-stone-500">
              View: {ctxLabel}
              {horseyContext.selectedCourse
                ? ` · ${horseyContext.selectedCourse.code}`
                : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setHorseyOpen(false)}
            className="rounded-lg px-2 py-1 text-sm text-stone-500 hover:bg-stone-50 hover:text-stone-800"
          >
            Close
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[95%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                m.role === "user"
                  ? "ml-auto bg-amber-100 text-amber-950"
                  : "mr-auto border border-stone-100 bg-stone-50 text-stone-800"
              }`}
            >
              {m.content}
            </div>
          ))}
          {pending ? (
            <p className="text-xs text-stone-400">Horsey is thinking…</p>
          ) : null}
        </div>
        <div className="border-t border-stone-100 p-3">
          <div className="flex gap-2">
            <label htmlFor="horsey-input" className="sr-only">
              Message Horsey
            </label>
            <input
              id="horsey-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="Ask about your plan or prereqs…"
              className="min-h-11 flex-1 rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={pending}
              className="rounded-xl bg-amber-500 px-4 text-sm font-medium text-amber-950 hover:bg-amber-400 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
