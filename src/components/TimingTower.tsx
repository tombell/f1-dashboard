import { useMemo } from "react";
import type { Driver, Position, Interval } from "@/types/api";

interface TimingTowerProps {
  drivers: Driver[];
  positions: Map<number, Position>;
  intervals: Interval[];
  positionChanges: Map<number, "up" | "down">;
}

const TEAM_COLORS: Record<string, string> = {
  McLaren: "#ff8700",
  "Red Bull Racing": "#3671c6",
  Ferrari: "#dc0000",
  Mercedes: "#00d2be",
  "Aston Martin": "#006f62",
  Alpine: "#ff87bc",
  Williams: "#005aff",
  Haas: "#b6b6b6",
  "RB F1 Team": "#6692ff",
  "Kick Sauber": "#d2ff00",
  Cadillac: "#8b0000",
};

function teamColor(teamName: string): string {
  return TEAM_COLORS[teamName] || "#666688";
}

export default function TimingTower({ drivers, positions, intervals, positionChanges }: TimingTowerProps) {
  // Build a map of driver_number -> last interval
  const intervalMap = useMemo(() => {
    const map = new Map<number, Interval>();
    for (const iv of intervals) {
      map.set(iv.driver_number, iv);
    }
    return map;
  }, [intervals]);

  // Sort drivers by position
  const sorted = useMemo(() => {
    const posSorted = [...drivers].sort((a, b) => {
      const pa = positions.get(a.driver_number)?.position ?? 99;
      const pb = positions.get(b.driver_number)?.position ?? 99;
      return pa - pb;
    });
    return posSorted;
  }, [drivers, positions]);

  if (!drivers.length) {
    return (
      <div className="bg-f1-bg2 border border-f1-border rounded-lg flex items-center justify-center text-f1-dim text-sm">
        Waiting for data...
      </div>
    );
  }

  return (
    <div className="bg-f1-bg2 border border-f1-border rounded-lg flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex px-3 py-2 bg-f1-bg3 text-[11px] text-f1-dim uppercase tracking-wider">
        <span className="w-[30px]">#</span>
        <span className="flex-1">Driver</span>
        <span className="w-[50px] text-right">Gap</span>
        <span className="w-[50px] text-right">Int</span>
      </div>

      {/* Driver rows */}
      <div className="flex-1 overflow-y-auto">
        {sorted.map((driver) => {
          const pos = positions.get(driver.driver_number);
          const iv = intervalMap.get(driver.driver_number);
          const color = teamColor(driver.team_name);
          const change = positionChanges.get(driver.driver_number);
          const changeClass = change === "up"
            ? "animate-pos-up"
            : change === "down"
              ? "animate-pos-down"
              : "";

          return (
            <div
              key={driver.driver_number}
              className={`flex px-3 py-2 text-xs border-b border-f1-border last:border-b-0 hover:bg-f1-bg3/50 transition-colors ${changeClass}`}
              style={{ borderLeft: `3px solid ${color}` }}
            >
              <span className="w-[30px] font-bold text-f1-bright">{pos?.position ?? "—"}</span>
              <span className="flex-1 flex items-center gap-2">
                <span className="font-semibold text-f1-bright">{driver.name_acronym}</span>
                <span className="text-f1-dim text-[11px]">{driver.team_name}</span>
              </span>
              <span className="w-[50px] text-right text-f1-orange">
                {iv?.gap_to_leader != null
                  ? iv.gap_to_leader > 0
                    ? `+${iv.gap_to_leader.toFixed(1)}`
                    : "—"
                  : "—"}
              </span>
              <span className="w-[50px] text-right text-f1-dim">
                {iv?.interval != null
                  ? iv.interval > 0
                    ? `+${iv.interval.toFixed(1)}`
                    : "—"
                  : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
