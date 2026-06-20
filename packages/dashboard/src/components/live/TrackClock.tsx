import { useEffect, useState } from "react";

const TRACK_TZ = "Europe/Monaco";

function formatClock(date: Date): string {
  return date.toLocaleTimeString("en-GB", {
    timeZone: TRACK_TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    timeZone: TRACK_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function TrackClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap ml-auto">
      <span className="text-f1-dim">Track</span>
      <span className="text-f1-bright font-semibold tabular-nums">
        {formatDate(now)} {formatClock(now)}
      </span>
    </span>
  );
}
