import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import type { Session } from "@/shared/types/api";

import { DashboardMark } from "./icons";
import SegmentedNav from "./SegmentedNav";

interface HeaderProps {
  session: Session | null;
  currentLap?: number;
  activeView?: "live" | "historical";
  liveHref?: string;
  historicalHref?: string;
}

function formatCountdown(dateStr: string): string {
  const target = new Date(dateStr).getTime();
  const now = Date.now();
  const diff = target - now;
  if (diff <= 0) return "LIVE";
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `T-${m}:${s.toString().padStart(2, "0")}`;
}

function isLive(dateStart: string, dateEnd: string): boolean {
  const now = Date.now();
  return now >= new Date(dateStart).getTime() && now <= new Date(dateEnd).getTime();
}

export default function Header({
  session,
  currentLap,
  activeView,
  liveHref = "/",
  historicalHref = "/historical/",
}: HeaderProps) {
  const location = useLocation();
  const [countdown, setCountdown] = useState("");
  const isHistorical = activeView
    ? activeView === "historical"
    : location.pathname.startsWith("/historical");

  useEffect(() => {
    if (!session || new Date(session.date_start).getTime() <= Date.now()) {
      setCountdown("");
      return;
    }

    setCountdown(formatCountdown(session.date_start));
    const interval = setInterval(() => setCountdown(formatCountdown(session.date_start)), 1000);
    return () => clearInterval(interval);
  }, [session]);

  const live = session ? isLive(session.date_start, session.date_end) : false;
  const navItems = useMemo(
    () => [
      { value: "live" as const, label: "Live", href: liveHref },
      { value: "historical" as const, label: "Historical", href: historicalHref },
    ],
    [historicalHref, liveHref],
  );

  return (
    <header className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-f1-border bg-f1-bg2 px-3 py-2.5 md:px-4">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-f1-red text-white">
          <DashboardMark />
        </span>
        <span className="text-base font-bold text-f1-bright">F1 Dashboard</span>
        <span className="rounded border border-f1-border bg-f1-bg3 px-1.5 py-0.5 text-[10px] font-semibold text-f1-dim">
          OpenF1
        </span>
      </div>

      <SegmentedNav
        ariaLabel="Dashboard views"
        active={isHistorical ? "historical" : "live"}
        items={navItems}
      />

      <div className="flex min-h-6 items-center gap-3 text-[11px] text-f1-dim">
        {session && (
          <>
            <span className="max-w-[220px] truncate">{session.meeting_name || "—"}</span>
            <span>{session.session_name}</span>
            {live && (
              <>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-f1-green animate-pulse" />
                  LIVE
                </span>
                {currentLap ? (
                  <span className="text-f1-bright font-semibold">Lap {currentLap}</span>
                ) : null}
              </>
            )}
            {countdown && (
              <span className="min-w-[80px] text-right font-semibold text-f1-red">{countdown}</span>
            )}
          </>
        )}
      </div>
    </header>
  );
}
