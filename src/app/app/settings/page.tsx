export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
        Settings
      </h1>
      <p className="mt-1 text-sm text-stone-600">
        Notifications, export, and account — placeholders for now.
      </p>
      <ul className="mt-8 space-y-2 text-sm text-stone-700">
        <li className="rounded-lg border border-stone-200 bg-white px-4 py-3">
          Registration alerts (coming soon)
        </li>
        <li className="rounded-lg border border-stone-200 bg-white px-4 py-3">
          Export plan JSON (coming soon)
        </li>
      </ul>
    </div>
  );
}
