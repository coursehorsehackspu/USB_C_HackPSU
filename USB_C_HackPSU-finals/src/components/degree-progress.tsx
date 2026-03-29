"use client";

type Props = {
  completed: number;
  required: number;
  size?: "sm" | "lg";
};

export function DegreeProgress({ completed, required, size = "lg" }: Props) {
  const pct = Math.min(100, Math.round((completed / required) * 100));
  const r = size === "lg" ? 52 : 32;
  const stroke = size === "lg" ? 8 : 6;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;
  const dim = (r + stroke) * 2;

  return (
    <div className="flex items-center gap-4">
      <svg width={dim} height={dim} className="shrink-0 -rotate-90">
        <circle
          cx={r + stroke}
          cy={r + stroke}
          r={r}
          fill="none"
          stroke="#e7e5e4"
          strokeWidth={stroke}
        />
        <circle
          cx={r + stroke}
          cy={r + stroke}
          r={r}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div>
        <p className={`font-semibold text-stone-900 ${size === "lg" ? "text-2xl" : "text-lg"}`}>
          {pct}%
        </p>
        <p className={`text-stone-500 ${size === "lg" ? "text-sm" : "text-xs"}`}>
          {completed} / {required} credits
        </p>
      </div>
    </div>
  );
}
