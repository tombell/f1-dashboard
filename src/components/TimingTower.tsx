import { useMemo } from "react";

import type { Driver, Position, Interval } from "@/types/api";

interface TimingTowerProps {
  drivers: Driver[];
  positions: Map<number, Position>;
  intervals: Interval[];
  positionChanges: Map<number, "up" | "down">;
  recentPits: Set<number>;
  fastestLapDriver: number | null;
  currentTyres: Map<number, string>;
  retiredDrivers: Set<number>;
  driverPenalties: Map<number, string[]>;
}

const TYRE_COLORS: Record<string, string> = {
  SOFT: "bg-red-500",
  MEDIUM: "bg-yellow-500",
  HARD: "bg-white text-black",
  INTERMEDIATE: "bg-green-600",
  WET: "bg-blue-600",
};
const TYRE_LABELS: Record<string, string> = {
  SOFT: "S",
  MEDIUM: "M",
  HARD: "H",
  INTERMEDIATE: "I",
  WET: "W",
};

const TEAM_COLORS: Record<string, string> = {
  McLaren: "#ff8700",
  "Red Bull Racing": "#3671c6",
  Ferrari: "#dc0000",
  Mercedes: "#00d2be",
  "Aston Martin": "#006f62",
  Alpine: "#ff87bc",
  Williams: "#005aff",
  "Haas F1 Team": "#b6b6b6",
  "Racing Bulls": "#e02d6b",
  Audi: "#222222",
  Cadillac: "#8b0000",
};

function teamColor(teamName: string): string {
  return TEAM_COLORS[teamName] || "#666688";
}

export default function TimingTower({
  drivers,
  positions,
  intervals,
  positionChanges,
  recentPits,
  fastestLapDriver,
  currentTyres,
  retiredDrivers,
  driverPenalties,
}: TimingTowerProps) {
  // Build a map of driver_number -> last interval
  const intervalMap = useMemo(() => {
    const map = new Map<number, Interval>();
    for (const iv of intervals) {
      map.set(iv.driver_number, iv);
    }
    return map;
  }, [intervals]);

  // Sort drivers by position, retired drivers at the bottom
  const sorted = useMemo(() => {
    const active = [...drivers].filter((d) => !retiredDrivers.has(d.driver_number));
    const retired = [...drivers].filter((d) => retiredDrivers.has(d.driver_number));
    active.sort((a, b) => {
      const pa = positions.get(a.driver_number)?.position ?? 99;
      const pb = positions.get(b.driver_number)?.position ?? 99;
      return pa - pb;
    });
    retired.sort((a, b) => {
      const pa = positions.get(a.driver_number)?.position ?? 99;
      const pb = positions.get(b.driver_number)?.position ?? 99;
      return pa - pb;
    });
    return [...active, ...retired];
  }, [drivers, positions, retiredDrivers]);

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
        <span className="w-[20px] text-center">⚡</span>
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
          const changeClass =
            change === "up" ? "animate-pos-up" : change === "down" ? "animate-pos-down" : "";

          return (
            <div
              key={driver.driver_number}
              className={`flex px-3 py-2 text-xs border-b border-f1-border last:border-b-0 hover:bg-f1-bg3/50 transition-colors ${changeClass} ${retiredDrivers.has(driver.driver_number) ? "opacity-40" : ""}`}
              style={{ borderLeft: `3px solid ${color}` }}
            >
              <span className="w-[30px] font-bold text-f1-bright">{pos?.position ?? "—"}</span>
              <span className="flex-1 flex items-center gap-2">
                <span className="font-semibold text-f1-bright">{driver.name_acronym}</span>
                {recentPits.has(driver.driver_number) && (
                  <span className="text-[10px] bg-f1-blue/20 text-f1-blue font-bold px-1 rounded leading-none">
                    PIT
                  </span>
                )}
                {(() => {
                  const compound = currentTyres.get(driver.driver_number);
                  if (!compound) return null;
                  const color = TYRE_COLORS[compound.toUpperCase()] || "bg-gray-500";
                  const label = TYRE_LABELS[compound.toUpperCase()] || compound[0];
                  return (
                    <span className={`text-[10px] font-bold px-1 rounded leading-none ${color}`}>
                      {label}
                    </span>
                  );
                })()}
                {retiredDrivers.has(driver.driver_number) && (
                  <span className="text-[10px] bg-red-600/30 text-red-400 font-bold px-1.5 rounded leading-none">
                    OUT
                  </span>
                )}
                {(() => {
                  const pens = driverPenalties.get(driver.driver_number);
                  return (
                    <>
                      {pens?.includes("INVESTIGATION") && (
                        <span
                          className="text-[10px] bg-yellow-600 text-white font-bold px-1.5 rounded leading-none"
                          title="Under investigation"
                        >
                          INV
                        </span>
                      )}
                      {pens?.includes("PENALTY") && (
                        <span
                          className="text-[10px] bg-orange-600 text-white font-bold px-1.5 rounded leading-none"
                          title="Penalty applied"
                        >
                          PEN
                        </span>
                      )}
                    </>
                  );
                })()}
                <span className="text-f1-dim text-[11px]">{driver.team_name}</span>
              </span>
              <span className="w-[20px] text-center">
                {fastestLapDriver === driver.driver_number && (
                  <span className="text-[11px]" title="Fastest lap">
                    ⚡
                  </span>
                )}
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
