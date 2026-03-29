"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useUiStore } from "@/stores/ui-store";
import { Button } from "@/components/ui";

type Msg = { role: "user" | "assistant"; content: string; error?: boolean };
const INTRO_MESSAGE: Msg = {
  role: "assistant",
  content: "Hey — I'm **Horsey**, your AI academic counselor. Ask me about your plan, prereqs, or registration timing.",
};

const SUGGESTED = [
  "Why is CS 301 in Fall 2026?",
  "Am I on track to graduate?",
  "What if I drop Calculus III?",
];

function pathnameToView(p: string): "home" | "plan" | "graph" | "settings" {
  if (p.includes("/graph")) return "graph";
  if (p.includes("/settings")) return "settings";
  if (p.includes("/plan")) return "plan";
  return "home";
}

function ThinkingDots() {
  return (
    <span className="inline-flex gap-1 px-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-stone-400"
          style={{ animation: `bounce-dots 1.2s infinite ease-in-out ${i * 0.16}s` }}
        />
      ))}
    </span>
  );
}

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="rounded bg-stone-200 px-1 py-0.5 text-xs font-mono">$1</code>');
}

export function HorseyDrawer() {
  const pathname = usePathname();
  const horseyOpen = useUiStore((s) => s.horseyOpen);
  const setHorseyOpen = useUiStore((s) => s.setHorseyOpen);
  const horseyContext = useUiStore((s) => s.horseyContext);
  const setHorseyContext = useUiStore((s) => s.setHorseyContext);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Msg[]>([INTRO_MESSAGE]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setHorseyContext({ view: pathnameToView(pathname) });
  }, [pathname, setHorseyContext]);

  useEffect(() => {
    if (!horseyOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setHorseyOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [horseyOpen, setHorseyOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pending]);

  const send = useCallback(async (text?: string, options?: { retry?: boolean }) => {
    const t = (text ?? input).trim();
    if (!t || pending) return;
    if (!text) setInput("");

    const requestMessages = options?.retry
      ? [...messages.filter((m, i) => !(i === messages.length - 1 && m.error)), { role: "user", content: t }]
      : [...messages, { role: "user", content: t }];

    setMessages(requestMessages);
    setPending(true);
    try {
      const res = await fetch("/api/horsey/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: requestMessages, context: horseyContext }),
      });
      const data = (await res.json().catch(() => ({}))) as { content?: string };
      if (!data.content) throw new Error("Missing response content");
      setMessages((m) => [...m, { role: "assistant", content: data.content, error: !res.ok }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Something went wrong. Try again.", error: true }]);
    } finally {
      setPending(false);
    }
  }, [input, pending, messages, horseyContext]);

  function clearHistory() {
    setMessages([{ role: "assistant", content: "Cleared! What can I help with?" }]);
  }

  if (!horseyOpen) return null;

  const view = pathnameToView(pathname);
  const ctxLabel = view === "home" ? "Home" : view === "plan" ? "Plan" : view === "graph" ? "Graph" : "Settings";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/25 backdrop-blur-[1px]"
        aria-label="Close Horsey"
        onClick={() => setHorseyOpen(false)}
      />
      <aside
        className="animate-slide-in-right relative flex h-full w-full max-w-md flex-col border-l border-stone-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="horsey-title"
      >
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <div>
            <h2 id="horsey-title" className="text-base font-semibold text-stone-900">Horsey</h2>
            <p className="text-xs text-stone-500">
              {ctxLabel}
              {horseyContext.selectedCourse ? ` · ${horseyContext.selectedCourse.code}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={clearHistory}
              className="rounded-lg px-2 py-1 text-xs text-stone-400 hover:bg-stone-50 hover:text-stone-700"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setHorseyOpen(false)}
              className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[90%] rounded-[var(--radius-card)] px-3 py-2.5 text-sm leading-relaxed animate-fade-in ${
                m.role === "user"
                  ? "ml-auto bg-amber-100 text-amber-950"
                  : m.error
                    ? "mr-auto border border-red-100 bg-red-50 text-red-800"
                    : "mr-auto border border-stone-100 bg-stone-50 text-stone-800"
              }`}
            >
              <span dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
              {m.error ? (
                <button
                  type="button"
                  className="mt-1 block text-xs font-medium text-red-600 underline"
                  onClick={() => {
                    const last = messages.filter((x) => x.role === "user").pop();
                    if (last) void send(last.content, { retry: true });
                  }}
                >
                  Retry
                </button>
              ) : null}
            </div>
          ))}
          {pending ? (
            <div className="mr-auto rounded-[var(--radius-card)] border border-stone-100 bg-stone-50 px-3 py-2.5 text-sm">
              <ThinkingDots />
            </div>
          ) : null}

          {messages.length <= 2 && !pending ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-600 transition hover:border-amber-300 hover:bg-amber-50"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="border-t border-stone-100 p-3">
          <div className="flex gap-2">
            <label htmlFor="horsey-input" className="sr-only">Message Horsey</label>
            <input
              id="horsey-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
              }}
              placeholder="Ask about your plan or prereqs…"
              className="min-h-11 flex-1 rounded-[var(--radius-input)] border border-stone-200 bg-white px-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
            <Button onClick={() => void send()} disabled={pending}>
              Send
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
