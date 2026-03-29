import type { HTMLAttributes } from "react";

type Variant = "default" | "warning" | "elevated";

const variantClass: Record<Variant, string> = {
  default: "border border-stone-200 bg-white shadow-sm",
  warning: "border border-amber-200 bg-amber-50/60",
  elevated: "border border-stone-200 bg-white shadow-lg",
};

type Props = HTMLAttributes<HTMLDivElement> & {
  variant?: Variant;
};

export function Card({ variant = "default", className = "", children, ...props }: Props) {
  return (
    <div
      className={`rounded-[var(--radius-card)] p-4 ${variantClass[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mb-3 border-b border-stone-100 pb-2 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className = "", children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={`text-sm font-semibold text-stone-900 ${className}`} {...props}>
      {children}
    </h2>
  );
}
