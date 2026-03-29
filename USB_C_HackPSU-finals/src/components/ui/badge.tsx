import type { HTMLAttributes } from "react";

type Variant = "default" | "completed" | "available" | "locked" | "amber";

const variantClass: Record<Variant, string> = {
  default: "bg-stone-100 text-stone-700",
  completed: "bg-emerald-100 text-emerald-800",
  available: "bg-sky-100 text-sky-800",
  locked: "bg-stone-100 text-stone-500",
  amber: "bg-amber-100 text-amber-900",
};

type Props = HTMLAttributes<HTMLSpanElement> & {
  variant?: Variant;
};

export function Badge({ variant = "default", className = "", children, ...props }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${variantClass[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
