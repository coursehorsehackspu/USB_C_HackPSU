// src/app/api/horsey/chat/route.ts
import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { isScheduleRequest, parseMajorsFromQuery } from "@/lib/schedule_generator";

const MONGO_URI = process.env.MONGO_URI!;
const GEMINI_KEY = process.env.GEMINI_API_KEY!;

let client: MongoClient | null = null;
async function db() {
  if (!client) { client = new MongoClient(MONGO_URI); await client.connect(); }
  return client;
}

type Msg = { role: "user" | "assistant"; content: string };
type Body = {
  messages?: Msg[];
  context?: { view?: string; selectedCourse?: { id: string; code: string } };
};

async function buildContext(query: string): Promise<string> {
  const c = await db();
  const parts: string[] = [];

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
  // Search text_content directly with query keywords
  const words = query.toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split(" ")
    .filter(w => w.length > 4 && !["about", "whats", "where", "their", "there", "would", "could", "should", "when", "what", "have", "does"].includes(w));

  if (words.length > 0) {
    const contentPages = await c.db("degreeflow").collection("psu_pages")
      .find({
        status: "success",
        $and: words.slice(0, 3).map(w => ({ text_content: { $regex: w, $options: "i" } }))
      },
      { projection: { title: 1, text_content: 1, url: 1, emails: 1, phones: 1 } })
      .limit(3).toArray();
    for (const p of contentPages) {
      const rawText = (p.text_content as string || "");
      const sentences = [...new Set(rawText.split(". "))];
      const cleanText = sentences.join(". ").slice(0, 800);
      parts.push(
        `PAGE: ${p.title as string}\nURL: ${p.url as string}\n${cleanText}`
      );
    }
  }

  // General PSU pages full-text search
  const pages = await c.db("degreeflow").collection("psu_pages")
    .find({ $text: { $search: query }, status: "success" },
      { projection: { 
        score: { $meta: "textScore" }, 
        title: 1, 
        text_content: 1, 
        headings: 1,
        url: 1, 
        emails: 1, 
        phones: 1 
      }})
    .sort({ score: { $meta: "textScore" } }).limit(5).toArray();

  for (const p of pages) {
    // Deduplicate text content before sending to Gemini
    const rawText = (p.text_content as string || "");
    const sentences = [...new Set(rawText.split(". "))];
    const cleanText = sentences.join(". ").slice(0, 800);
    const headings = (p.headings as string[] || []).join(" | ");
    
    parts.push(
      `PAGE: ${p.title as string}\nURL: ${p.url as string}\n` +
      `HEADINGS: ${headings}\n` +
      `CONTENT: ${cleanText}\n` +
      `${(p.emails as string[])?.[0] ? "Email: " + (p.emails as string[])[0] : ""}` +
      `${(p.phones as string[])?.[0] ? " | Phone: " + (p.phones as string[])[0] : ""}`
    );
  }

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
  if (parts.length === 0) {
    const keywords = query.toLowerCase().split(" ").filter(w => w.length > 3);
    const regexes = keywords.map(k => new RegExp(k, "i"));
    const fallback = await c.db("degreeflow").collection("psu_pages")
      .find({
        status: "success",
        $or: regexes.map(r => ({ text_content: { $regex: r } }))
      },
      { projection: { title: 1, text_content: 1, url: 1 } })
      .limit(3).toArray();
    for (const p of fallback) {
      parts.push(
        `PAGE: ${p.title as string}\nURL: ${p.url as string}\n` +
        `${(p.text_content as string || "").slice(0, 600)}`
      );
    }
  }

  return parts.join("\n\n---\n\n") || "No specific results found.";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Body;
    const messages: Msg[] = body.messages || [];
    const ctx = body.context;
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
     if (isScheduleRequest(lastUser.content)) {
      const stored = request.headers.get("x-onboarding") || "{}";
      let onboarding: { major?: string; completedCourseIds?: string[]; constraints?: { maxCreditsPerSemester?: number } } = {};
      try { onboarding = JSON.parse(stored); } catch { /* ignore */ }
 
      const majors = parseMajorsFromQuery(lastUser.content);
      if (majors.length === 0 && onboarding.major) majors.push(onboarding.major);
 
      if (majors.length > 0) {
        const schedRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/schedule`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            majors,
            completedCodes: onboarding.completedCourseIds || [],
            maxCreditsPerSemester: onboarding.constraints?.maxCreditsPerSemester || 18,
          }),
        });
        const schedData = await schedRes.json() as { summary?: string; totalCourses?: number; totalCredits?: number; warnings?: string[]; plan?: { semesters: unknown[] } };
 
        const semCount = schedData.plan?.semesters?.length ?? 0;
        const warningText = schedData.warnings?.length
          ? `\n\n⚠️ Note: ${schedData.warnings.join(" ")}`
          : "";
 
        return NextResponse.json({
          role: "assistant" as const,
          content: `📅 **Schedule generated for ${majors.join(" + ")}!**\n\n${schedData.summary}\n\nYour plan has been loaded into the Schedule tab — check it out there to see all ${semCount} semesters laid out. You can switch between your saved plan and this new one using the panel on the left.${warningText}`,
          scheduleGenerated: true,
          plan: schedData.plan,
        });
      }
    }
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

    const genai = new GoogleGenerativeAI(GEMINI_KEY);
    const model = genai.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);

    return NextResponse.json({ role: "assistant" as const, content: result.response.text() });
  } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isQuota = msg.includes("429") || msg.includes("quota") || msg.includes("Too Many Requests");
      console.error("[Horsey] Error:", err);
      return NextResponse.json({
        role: "assistant" as const,
        content: isQuota
          ? "I've hit my daily AI quota limit. Please try again tomorrow or contact the admin to upgrade the API plan!"
          : "Sorry, something went wrong. Please try again.",
      });
    }
}
