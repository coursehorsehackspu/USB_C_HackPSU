import { NextResponse } from "next/server";

type Body = {
  messages?: { role: "user" | "assistant"; content: string }[];
};

/** Mock counselor until Claude streaming is wired. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body;
  const last = body.messages?.filter((m) => m.role === "user").pop();
  const reply = last?.content?.trim()
    ? `You said: “${last.content.slice(0, 200)}${last.content.length > 200 ? "…" : ""}”. I’m Horsey (mock mode). Connect ANTHROPIC_API_KEY and swap this route for real Claude streaming when you’re ready.`
    : "Hi — I’m Horsey. Ask me about your plan, prereqs, or registration timing.";

  return NextResponse.json({ role: "assistant" as const, content: reply });
}
