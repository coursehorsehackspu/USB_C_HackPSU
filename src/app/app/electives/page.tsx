import { Card, Badge, Button } from "@/components/ui";

const mockElectives = [
  { code: "CS 447", title: "Intro to ML", score: 0.92, skills: ["ML", "Stats"], why: "Aligns with your Data Science interest and uses your Calculus III foundation." },
  { code: "CS 411", title: "Database Systems", score: 0.78, skills: ["SQL", "Architecture"], why: "Builds on CS 340 and opens distributed systems paths." },
  { code: "CS 460", title: "Security", score: 0.71, skills: ["Crypto", "Networks"], why: "Pairs with Algorithms and rounds out your systems track." },
];

export default function ElectivesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Electives</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-600">
          Ranked by how well they align with your skills and career goals. Mock ranking for now — wire to the real recommender when ready.
        </p>
      </div>

      <div className="space-y-3">
        {mockElectives.map((e) => (
          <Card key={e.code} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-stone-900">{e.code}</span>
                  <Badge variant="amber">{Math.round(e.score * 100)}% match</Badge>
                </div>
                <p className="mt-0.5 text-sm text-stone-600">{e.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-stone-500">{e.why}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {e.skills.map((s) => (
                    <Badge key={s}>{s}</Badge>
                  ))}
                </div>
              </div>
              <Button variant="secondary" size="sm" className="shrink-0">
                Add to plan
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
