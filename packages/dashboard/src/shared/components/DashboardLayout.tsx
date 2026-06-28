import type { ReactNode } from "react";

import type { Session } from "@/shared/types/api";

import Header from "./Header";

interface DashboardLayoutProps {
  children: ReactNode;
  session: Session | null;
  activeView: "live" | "historical";
  currentLap?: number;
}

export default function DashboardLayout({
  children,
  session,
  activeView,
  currentLap,
}: DashboardLayoutProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1800px] flex-col gap-2.5 p-3 md:gap-3 md:p-4">
      <Header session={session} currentLap={currentLap} activeView={activeView} />
      {children}
    </div>
  );
}
