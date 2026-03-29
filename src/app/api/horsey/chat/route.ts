// src/app/api/horsey/chat/route.ts
import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { GoogleGenerativeAI } from "@google/generative-ai";

const MONGO_URI = process.env.MONGO_URI;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

let client: MongoClient | null = null;
async function db() {
  if (!MONGO_URI) {
    throw new Error("Missing MONGO_URI");
  }
  if (!client) { client = new MongoClient(MONGO_URI); await client.connect(); }
  return client;
}

type Msg = { role: "user" | "assistant"; content: string };
type Body = {
  messages?: Msg[];
  context?: { view?: string; selectedCourse?: { id: string; code: string } };
};

async function buildContext(query: string): Promise<string> {
  const parts: string[] = [];
  let c: MongoClient;

  try {
    c = await db();
  } catch {
    return "Course database is currently unavailable.";
  }

  // Exact course code lookup
  const codeMatch = query.toUpperCase().match(/\b([A-Z]{2,6})\s*(\d{3}[A-Z]?)\b/);
  if (codeMatch) {
    const code = `${codeMatch[1]} ${codeMatch[2]}`;
    const course = await c.db("degreeflow_courses").collection("courses").findOne(
      { course_code: code },
      { projection: { course_code: 1, title: 1, credits: 1, prerequisites: 1, prerequisites_raw: 1, description: 1, semesters_offered: 1 } }
    );
    if (course) {
      parts.push(
        `COURSE: ${course.course_code} — ${course.title}\n` +
        `Credits: ${course.credits ?? "N/A"}\n` +
        `Prerequisites: ${(course.prerequisites as string[])?.join(", ") || "None"}\n` +
        `Prereq detail: ${course.prerequisites_raw || "N/A"}\n` +
        `Offered: ${(course.semesters_offered as string[])?.join(", ") || "Unknown"}\n` +
        `Description: ${(course.description as string || "").slice(0, 500)}`
      );
    }
  }

  // General PSU pages full-text search
  try {
    const pages = await c.db("degreeflow").collection("psu_pages")
      .find({ $text: { $search: query }, status: "success" },
        { projection: { score: { $meta: "textScore" }, title: 1, text_content: 1, url: 1, emails: 1, phones: 1 } })
      .sort({ score: { $meta: "textScore" } }).limit(3).toArray();
    for (const p of pages) {
      parts.push(
        `PAGE: ${p.title as string}\nURL: ${p.url as string}\n` +
        `${(p.text_content as string || "").slice(0, 500)}\n` +
        `${(p.emails as string[])?.[0] ? "Email: " + (p.emails as string[])[0] : ""}` +
        `${(p.phones as string[])?.[0] ? " | Phone: " + (p.phones as string[])[0] : ""}`
      );
    }
  } catch { /* text index may not exist */ }

  // Course full-text search (when no exact code)
  if (!codeMatch) {
    try {
      const courses = await c.db("degreeflow_courses").collection("courses")
        .find({ $text: { $search: query } },
          { projection: { score: { $meta: "textScore" }, course_code: 1, title: 1, credits: 1, prerequisites: 1, description: 1 } })
        .sort({ score: { $meta: "textScore" } }).limit(4).toArray();
      for (const course of courses) {
        parts.push(
          `COURSE: ${course.course_code as string} — ${course.title as string}\n` +
          `Credits: ${course.credits ?? "N/A"}\n` +
          `Prerequisites: ${(course.prerequisites as string[])?.join(", ") || "None"}\n` +
          `Description: ${(course.description as string || "").slice(0, 300)}`
        );
      }
    } catch { /* text index may not exist */ }
  }

  return parts.join("\n\n---\n\n") || "No specific results found.";
}

function buildFallbackReply(
  question: string,
  ctx: Body["context"],
  context: string,
  reason?: string,
): string {
  const hints: string[] = [];

  if (ctx?.selectedCourse?.code) {
    hints.push(`I can at least see you're looking at **${ctx.selectedCourse.code}** right now.`);
  } else if (ctx?.view) {
    hints.push(`I can see you're on the **${ctx.view}** page.`);
  }

  if (context && context !== "No specific results found." && context !== "Course database is currently unavailable.") {
    hints.push(`Here’s the local context I found:\n${context}`);
  } else if (context === "Course database is currently unavailable.") {
    hints.push("The course database connection is unavailable at the moment.");
  }

  hints.push(
    "I couldn't reach the full Horsey AI service just now, so I may be missing live schedule or advising details.",
  );

  if (/why|how come|reason/i.test(question)) {
    hints.push(
      "If you're asking why a course appears in a specific term, the most common reasons are prerequisite sequencing, term availability, or a saved planning override.",
    );
  }

  hints.push("Try asking again in a moment, or ask about a specific course code and I’ll use whatever local data is available.");

  if (reason) {
    hints.push(`Debug hint: ${reason}.`);
  }

  return hints.join("\n\n");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Body;
    const messages: Msg[] = body.messages || [];
    const ctx = body.context;
    const lastUser = [...messages].reverse().find((m) => m.role === "user");

    if (!lastUser) {
      return NextResponse.json({
        role: "assistant" as const,
        content: "Hey — I'm Horsey, your AI academic counselor. Ask me anything about your courses or degree plan!",
      });
    }

    const context = await buildContext(lastUser.content);

    const history = messages.slice(-8)
      .map((m) => `${m.role === "user" ? "Student" : "Horsey"}: ${m.content}`)
      .join("\n");

    const contextHint = ctx?.selectedCourse
      ? `The student is viewing course: ${ctx.selectedCourse.code}.`
      : ctx?.view ? `The student is on the ${ctx.view} page of DegreeFlow.` : "";

    const prompt = `You are Horsey, a friendly AI academic counselor built into DegreeFlow for Penn State University students.
Help with course prerequisites, degree planning, registration deadlines, financial aid, and campus life.
Be concise, friendly, and accurate. Cite source URLs when available. Use **bold** for course codes.
${contextHint}

DATABASE CONTEXT:
${context}

${history ? `CONVERSATION:\n${history}\n` : ""}Student: ${lastUser.content}
Horsey:`;

    if (!GEMINI_KEY) {
      return NextResponse.json({
        role: "assistant" as const,
        content: buildFallbackReply(lastUser.content, ctx, context, "Missing GEMINI_API_KEY"),
      });
    }

    try {
      const genai = new GoogleGenerativeAI(GEMINI_KEY);
      const model = genai.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
      const result = await model.generateContent(prompt);

      return NextResponse.json({ role: "assistant" as const, content: result.response.text() });
    } catch (err) {
      console.error("[Horsey] Model error:", err);
      return NextResponse.json({
        role: "assistant" as const,
        content: buildFallbackReply(lastUser.content, ctx, context, "Model request failed"),
      });
    }
  } catch (err) {
    console.error("[Horsey] Error:", err);
    return NextResponse.json(
      {
        role: "assistant" as const,
        content:
          "I ran into an unexpected Horsey error while preparing your answer. Please try again in a moment.",
      },
    );
  }
}
