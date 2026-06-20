import type { Session } from "@f1-dashboard/shared/types/api";
import { useState } from "react";
import { useLocation } from "react-router-dom";

interface HeaderProps {
  session: Session | null;
  currentLap?: number;
  onRefresh: () => void;
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
  onRefresh,
  activeView,
  liveHref = "/",
  historicalHref = "/historical/",
}: HeaderProps) {
  const location = useLocation();
  const [countdown, setCountdown] = useState("");
  const isHistorical = activeView
    ? activeView === "historical"
    : location.pathname.startsWith("/historical");

  // Update countdown every second if session is upcoming
  if (session && new Date(session.date_start).getTime() > Date.now()) {
    setTimeout(() => setCountdown(formatCountdown(session.date_start)), 1000);
  }

  const live = session ? isLive(session.date_start, session.date_end) : false;

  return (
    <header className="bg-f1-bg2 border border-f1-border rounded-lg px-5 py-3.5 flex justify-between items-center flex-wrap gap-2">
      <div className="flex items-center gap-2.5">
        <span className="text-lg font-bold text-f1-bright flex items-center gap-2.5">
          🏎️ F1 Dashboard
        </span>
        <span className="bg-f1-red text-white text-[11px] px-2 py-0.5 rounded font-semibold">
          OpenF1
        </span>
      </div>

      <nav className="flex gap-2 flex-wrap">
        <a
          href={liveHref}
          className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors border border-transparent ${
            !isHistorical
              ? "bg-f1-red text-white border-white/20"
              : "bg-f1-bg3 text-f1-text hover:bg-f1-bg4"
          }`}
        >
          Live
        </a>
        <a
          href={historicalHref}
          className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors border border-transparent ${
            isHistorical
              ? "bg-f1-red text-white border-white/20"
              : "bg-f1-bg3 text-f1-text hover:bg-f1-bg4"
          }`}
        >
          Historical
        </a>
      </nav>

      <div className="flex items-center gap-4 text-xs text-f1-dim flex-wrap">
        {session && (
          <>
            <span>{session.meeting_name || "—"}</span>
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
              <span className="text-f1-red font-semibold min-w-[80px] text-right">{countdown}</span>
            )}
          </>
        )}
        <button
          onClick={onRefresh}
          className="px-2.5 py-1 rounded bg-f1-bg4 text-f1-text border border-f1-border text-[11px] cursor-pointer font-inherit transition-colors hover:bg-f1-bg3 hover:border-f1-blue"
        >
          Refresh
        </button>
      </div>
    </header>
  );
}
