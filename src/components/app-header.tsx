"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUiStore } from "@/stores/ui-store";

const nav = [
  { href: "/app", label: "Plan" },
  { href: "/app/graph", label: "Graph" },
  { href: "/app/electives", label: "Electives" },
  { href: "/app/onboarding", label: "Onboarding" },
  { href: "/app/settings", label: "Settings" },
];

export function AppHeader() {
  const pathname = usePathname();
  const setHorseyOpen = useUiStore((s) => s.setHorseyOpen);

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/app" className="text-lg font-semibold tracking-tight text-stone-900">
          Course Horse
        </Link>
        <nav
          className="-mx-1 flex items-center gap-0.5 overflow-x-auto pb-1 md:mx-0 md:gap-1 md:pb-0"
          aria-label="Main"
        >
          {nav.map((item) => {
            const active =
              item.href === "/app"
                ? pathname === "/app" || pathname === "/app/plan"
                : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-amber-50 text-amber-900"
                    : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHorseyOpen(true)}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950 shadow-sm transition hover:bg-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
          >
            Ask Horsey
          </button>
        </div>
      </div>
    </header>
  );
}
