import { OnboardingForm } from "@/components/onboarding-form";

export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
        Onboarding
      </h1>
      <p className="mt-1 text-sm leading-relaxed text-stone-600">
        Tell us your major and constraints. Data stays in the browser until you
        connect a backend.
      </p>
      <div className="mt-8">
        <OnboardingForm />
      </div>
    </div>
  );
}
