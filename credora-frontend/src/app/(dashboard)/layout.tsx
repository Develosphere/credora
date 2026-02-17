import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { PlatformProvider } from "@/lib/hooks/usePlatform";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PlatformProvider>
      <div className="flex h-screen overflow-hidden bg-[#121212]">
        <DashboardSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <DashboardHeader />
          <main className="flex-1 overflow-y-auto p-6 bg-[#121212]">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </PlatformProvider>
  );
}
