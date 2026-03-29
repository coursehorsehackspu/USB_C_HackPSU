import { forwardRef, type InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, hint, error, id, className = "", ...props }, ref) => (
    <div>
      {label ? (
        <label className="text-xs font-medium text-stone-700" htmlFor={id}>
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={id}
        className={`mt-1 w-full rounded-[var(--radius-input)] border border-stone-200 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200 ${className}`}
        {...props}
      />
      {hint && !error ? <p className="mt-1 text-[11px] text-stone-400">{hint}</p> : null}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  ),
);
Input.displayName = "Input";
