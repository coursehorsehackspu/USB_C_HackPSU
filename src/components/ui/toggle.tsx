"use client";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
};

export function Toggle({ checked, onChange, label, description }: Props) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-[var(--radius-card)] border border-stone-200 bg-white px-4 py-3 shadow-sm transition hover:border-stone-300">
      <div>
        <span className="text-sm font-medium text-stone-800">{label}</span>
        {description ? (
          <p className="mt-0.5 text-xs text-stone-500">{description}</p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-amber-500" : "bg-stone-300"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </label>
  );
}
