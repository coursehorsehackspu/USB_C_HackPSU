// src/app/api/graph/route.ts
import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import type { CourseGraphPayload } from "@/types/graph";

const MONGO_URI = process.env.MONGO_URI!;
let client: MongoClient | null = null;
async function db() {
  if (!client) { client = new MongoClient(MONGO_URI); await client.connect(); }
  return client;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const subject = (searchParams.get("subject") || "CMPSC").toUpperCase();
    const completedIds = (searchParams.get("completed") || "").split(",").filter(Boolean);

    const c = await db();
    const courses = await c.db("degreeflow_courses").collection("courses").find(
      { subject, level: "Undergraduate" },
      { projection: { course_code: 1, title: 1, credits: 1, prerequisites: 1, description: 1 } }
    ).toArray();

    if (!courses.length) return NextResponse.json({ nodes: [], edges: [] });

    const codeToId = new Map<string, string>();
    courses.forEach((c) =>
      codeToId.set(c.course_code as string, (c.course_code as string).replace(/\s+/g, "-").toLowerCase())
    );

    const nodes = courses.map((c) => {
      const id = codeToId.get(c.course_code as string)!;
      const prereqs = (c.prerequisites as string[]) || [];
      const allDone = prereqs.every((p) => completedIds.includes(codeToId.get(p) ?? ""));
      const isCompleted = completedIds.includes(id);
      return {
        id,
        code: c.course_code as string,
        title: (c.title as string) || "",
        credits: (c.credits as number) || 3,
        status: isCompleted ? "completed" : (allDone || prereqs.length === 0 ? "available" : "locked"),
        description: (c.description as string) || "",
      };
    });

    const edges: { id: string; source: string; target: string }[] = [];
    courses.forEach((c) => {
      const targetId = codeToId.get(c.course_code as string)!;
      ((c.prerequisites as string[]) || []).forEach((prereq) => {
        const sourceId = codeToId.get(prereq);
        if (sourceId && sourceId !== targetId) {
          edges.push({ id: `${sourceId}→${targetId}`, source: sourceId, target: targetId });
        }
      });
    });

    return NextResponse.json({ nodes, edges } as CourseGraphPayload);
  } catch (err) {
    console.error("[Graph] Error:", err);
    return NextResponse.json({ nodes: [], edges: [] }, { status: 500 });
  }
}
