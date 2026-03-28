import { AppHeader } from "@/components/app-header";
import { HorseyDrawer } from "@/components/horsey-drawer";
import { Providers } from "@/components/providers";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="flex min-h-full flex-1 flex-col bg-stone-50">
        <AppHeader />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
      <HorseyDrawer />
    </Providers>
  );
}
