"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useUiStore } from "@/stores/ui-store";
import { Button } from "@/components/ui";

const nav = [
  { href: "/app", label: "Home", exact: true },
  { href: "/app/plan", label: "Plan" },
  { href: "/app/graph", label: "Graph" },
  { href: "/app/internships", label: "Internships" },
  { href: "/app/settings", label: "Settings" },
];

function HorseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-amber-600" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 4c-1 0-2.5.8-3 2l-1.5 3H9.5L8 7C7.2 5.5 5.5 4 4 4c0 0-.5 2 .5 4S7 12 7 12v6a2 2 0 0 0 2 2h1m4-8v6a2 2 0 0 1-2 2h-1m4-8h2c1.5 0 3-.5 3.5-2S21 6 21 4c-1 0-2.5.5-4 0z" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const setHorseyOpen = useUiStore((s) => s.setHorseyOpen);
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(item: (typeof nav)[number]) {
    if (item.exact) return pathname === item.href || pathname === item.href + "/";
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  return (
    <div className="px-4 pt-3 sm:px-6">
      <header className="mx-auto max-w-7xl rounded-[var(--radius-card)] border border-stone-200/90 bg-white/95 shadow-sm backdrop-blur-md">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-5">
          <Link href="/app" className="flex shrink-0 items-center gap-2">
            <HorseIcon />
            <span className="text-lg font-semibold tracking-tight text-stone-900">
              Course Horse
            </span>
          </Link>

          <nav className="hidden items-center gap-0.5 md:flex" aria-label="Main">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`relative shrink-0 rounded-[var(--radius-button)] px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(item)
                    ? "bg-amber-50 text-amber-900"
                    : "text-stone-500 hover:bg-stone-50 hover:text-stone-900"
                }`}
              >
                {item.label}
                {isActive(item) ? (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-amber-500" />
                ) : null}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Button size="md" onClick={() => setHorseyOpen(true)} className="hidden sm:inline-flex">
              Ask Horsey
            </Button>
            <Button size="sm" onClick={() => setHorseyOpen(true)} className="sm:hidden">
              Horsey
            </Button>
            <div className="hidden h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-xs font-medium text-stone-600 md:flex">
              ?
            </div>
            <button
              type="button"
              className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <XIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <nav className="border-t border-stone-100 px-4 pb-3 pt-2 md:hidden" aria-label="Mobile">
            <div className="flex flex-col gap-1">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-[var(--radius-button)] px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive(item)
                      ? "bg-amber-50 text-amber-900"
                      : "text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        ) : null}
      </header>
    </div>
  );
}
