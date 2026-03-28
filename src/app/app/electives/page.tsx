const mockElectives = [
  { code: "CS 447", title: "Intro to ML", score: 0.92, skills: ["ML", "Stats"] },
  { code: "CS 411", title: "Database Systems", score: 0.78, skills: ["SQL"] },
  { code: "CS 460", title: "Security", score: 0.71, skills: ["Crypto"] },
];

export default function ElectivesPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
        Electives
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-stone-600">
        Suggestions from skills + career goals (mock ranking). Wire to the real
        recommender when ready.
      </p>
      <ul className="mt-8 space-y-3">
        {mockElectives.map((e) => (
          <li
            key={e.code}
            className="rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-stone-900">{e.code}</div>
                <div className="text-sm text-stone-600">{e.title}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {e.skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] text-stone-700"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <span className="text-xs font-medium text-amber-800">
                {Math.round(e.score * 100)}% match
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
