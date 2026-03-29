"use client";

import { useEffect, useState } from "react";
import { Card, Button } from "@/components/ui";
import { Toggle } from "@/components/ui/toggle";

const SETTINGS_KEY = "coursehorse.settings.v1";

type Settings = {
  registrationAlerts: boolean;
  weeklyDigest: boolean;
};

const defaults: Settings = { registrationAlerts: true, weeklyDigest: false };

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [exported, setExported] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const next = { ...defaults, ...JSON.parse(raw) };
      queueMicrotask(() => setSettings(next));
    } catch { /* ignore */ }
  }, []);

  function persist(next: Settings) {
    setSettings(next);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  }

  function exportPrefs() {
    const schedule = localStorage.getItem("coursehorse.schedulePrefs");
    const plan = localStorage.getItem("coursehorse.savedPlanOverride");
    const blob = new Blob(
      [JSON.stringify({ schedulePrefs: schedule ? JSON.parse(schedule) : null, savedPlanOverride: plan ? JSON.parse(plan) : null, settings }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "course-horse-export.json";
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    window.setTimeout(() => setExported(false), 2500);
  }

  function clearAll() {
    const keys = ["coursehorse.schedulePrefs", "coursehorse.savedPlanOverride", "coursehorse.settings.v1", "coursehorse.graphFirstVisit"];
    keys.forEach((k) => localStorage.removeItem(k));
    setSettings(defaults);
    setConfirmClear(false);
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Settings</h1>
        <p className="mt-1 text-sm text-stone-600">Preferences stored in your browser for this demo.</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-500">Account</h2>
        <Card className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-sm font-medium text-stone-600">?</div>
          <div className="flex-1">
            <p className="text-sm font-medium text-stone-800">Guest user</p>
            <p className="text-xs text-stone-500">Sign-in coming soon</p>
          </div>
          <Button variant="secondary" size="sm" disabled>Sign in</Button>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-500">Notifications</h2>
        <Toggle
          label="Registration window alerts"
          description="Get notified when enrollment opens"
          checked={settings.registrationAlerts}
          onChange={(v) => persist({ ...settings, registrationAlerts: v })}
        />
        <Toggle
          label="Weekly plan digest"
          description="Email summary of your academic plan (later)"
          checked={settings.weeklyDigest}
          onChange={(v) => persist({ ...settings, weeklyDigest: v })}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-500">Data</h2>
        <Card className="flex items-center gap-4 p-4">
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0 text-stone-500" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-stone-800">Export data</p>
            <p className="text-xs text-stone-500">Academic plan preferences, saved plan, and settings as JSON</p>
          </div>
          <Button variant="secondary" size="sm" onClick={exportPrefs}>
            {exported ? "Done" : "Export"}
          </Button>
        </Card>
        {!confirmClear ? (
          <Button variant="danger" size="sm" className="w-full" onClick={() => setConfirmClear(true)}>
            Clear all data
          </Button>
        ) : (
          <Card variant="warning" className="space-y-2 p-4">
            <p className="text-sm font-medium text-red-800">This will erase all saved preferences and plans.</p>
            <div className="flex gap-2">
              <Button variant="danger" size="sm" onClick={clearAll}>Confirm</Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>Cancel</Button>
            </div>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-500">About</h2>
        <Card className="p-4 text-xs text-stone-500 space-y-1">
          <p>Course Horse v0.1.0</p>
          <p>Built with Next.js, React Flow, and TanStack Query</p>
        </Card>
      </section>
    </div>
  );
}
