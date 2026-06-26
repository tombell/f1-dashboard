import { useCallback, useMemo } from "react";

import type { Session, Driver, Position, Interval } from "@/shared/types/api";

interface TimingTowerProps {
  session: Session | null;
  drivers: Driver[];
  positions: Map<number, Position>;
  intervals: Interval[];
  positionChanges: Map<number, "up" | "down">;
  recentPits: Set<number>;
  fastestLapDriver: number | null;
  currentTyres: Map<number, string>;
  retiredDrivers: Set<number>;
  driverPenalties: Map<number, string[]>;
  driverLaps: Map<number, { laps: number; bestLap: number | null }>;
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

interface DriverBadgesProps {
  driverNumber: number;
  recentPits: Set<number>;
  currentTyres: Map<number, string>;
  retiredDrivers: Set<number>;
  driverPenalties: Map<number, string[]>;
  showRetiredStatus: boolean;
}

function DriverBadges({
  driverNumber,
  recentPits,
  currentTyres,
  retiredDrivers,
  driverPenalties,
  showRetiredStatus,
}: DriverBadgesProps) {
  const compound = currentTyres.get(driverNumber);
  const penalties = driverPenalties.get(driverNumber);

  return (
    <>
      {recentPits.has(driverNumber) && (
        <span className="text-[10px] bg-f1-blue/20 text-f1-blue font-bold px-1 rounded leading-none">
          PIT
        </span>
      )}
      {compound && (
        <span
          className={`text-[10px] font-bold px-1 rounded leading-none ${
            TYRE_COLORS[compound.toUpperCase()] || "bg-gray-500"
          }`}
        >
          {TYRE_LABELS[compound.toUpperCase()] || compound[0]}
        </span>
      )}
      {showRetiredStatus && retiredDrivers.has(driverNumber) && (
        <span className="text-[10px] bg-red-600/30 text-red-400 font-bold px-1.5 rounded leading-none">
          OUT
        </span>
      )}
      {penalties?.includes("INVESTIGATION") && (
        <span
          className="text-[10px] bg-yellow-600 text-white font-bold px-1.5 rounded leading-none"
          title="Under investigation"
        >
          INV
        </span>
      )}
      {penalties?.includes("PENALTY") && (
        <span
          className="text-[10px] bg-orange-600 text-white font-bold px-1.5 rounded leading-none"
          title="Penalty applied"
        >
          PEN
        </span>
      )}
    </>
  );
}

export default function TimingTower({
  session,
  drivers,
  positions,
  intervals,
  positionChanges,
  recentPits,
  fastestLapDriver,
  currentTyres,
  retiredDrivers,
  driverPenalties,
  driverLaps,
}: TimingTowerProps) {
  // Build a map of driver_number -> last interval
  const intervalMap = useMemo(() => {
    const map = new Map<number, Interval>();
    for (const iv of intervals) {
      map.set(iv.driver_number, iv);
    }
    return map;
  }, [intervals]);

  const isPractice = session?.session_type === "Practice" && driverLaps.size > 0;
  const showRetiredStatus = !isPractice;

  // Practice: fastest lap for gap calculation
  const fastestPracticeLap = useMemo(() => {
    if (!isPractice) return null;
    let best = Infinity;
    for (const [, info] of driverLaps) {
      if (info.bestLap != null && info.bestLap < best) best = info.bestLap;
    }
    return best !== Infinity ? best : null;
  }, [isPractice, driverLaps]);

  // Convert gap_to_leader to a numeric sort key for when position data is unavailable
  const gapSortKey = useCallback(
    (dn: number): number => {
      const iv = intervalMap.get(dn);
      const gtl = iv?.gap_to_leader;
      if (gtl == null) return 999;
      return gtl;
    },
    [intervalMap],
  );

  // Sort drivers by position. In practice, cars regularly sit in the garage;
  // don't treat stale timing data as retired/OUT.
  const sorted = useMemo(() => {
    if (isPractice) {
      return drivers.toSorted((a, b) => {
        const la = driverLaps.get(a.driver_number);
        const lb = driverLaps.get(b.driver_number);
        const ta = la?.bestLap ?? 999;
        const tb = lb?.bestLap ?? 999;
        return ta - tb;
      });
    }

    const active = drivers.filter((d) => !retiredDrivers.has(d.driver_number));
    const retired = drivers.filter((d) => retiredDrivers.has(d.driver_number));
    const sortByPosition = (a: Driver, b: Driver) => {
      const pa = positions.get(a.driver_number)?.position;
      const pb = positions.get(b.driver_number)?.position;
      // If both have position data, sort by position (normal behaviour)
      if (pa != null && pb != null) return pa - pb;
      // Driver with position data goes before one without
      if (pa != null) return -1;
      if (pb != null) return 1;
      // Fall back to gap_to_leader from intervals
      return gapSortKey(a.driver_number) - gapSortKey(b.driver_number);
    };

    return [...active.toSorted(sortByPosition), ...retired.toSorted(sortByPosition)];
  }, [drivers, positions, retiredDrivers, isPractice, driverLaps, gapSortKey]);

  if (!session) {
    return (
      <div className="bg-f1-bg2 border border-f1-border rounded-lg h-full flex items-center justify-center text-f1-dim text-sm">
        No active race weekend
      </div>
    );
  }

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
        {isPractice ? (
          <>
            <span className="w-[30px]">Laps</span>
            <span className="flex-1">Driver</span>
            <span className="w-[20px] text-center">⚡</span>
            <span className="w-[80px] text-right">Best</span>
            <span className="w-[50px] text-right">Gap</span>
          </>
        ) : (
          <>
            <span className="w-[30px]">#</span>
            <span className="flex-1">Driver</span>
            <span className="w-[20px] text-center">⚡</span>
            <span className="w-[50px] text-right">Gap</span>
            <span className="w-[50px] text-right">Int</span>
          </>
        )}
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
              className={`flex px-3 py-2 text-xs border-b border-f1-border last:border-b-0 hover:bg-f1-bg3/50 transition-colors ${changeClass} ${showRetiredStatus && retiredDrivers.has(driver.driver_number) ? "opacity-40" : ""}`}
              style={{
                borderLeft: `3px solid ${color}` /* eslint-disable-line react-perf/jsx-no-new-object-as-prop */,
              }}
            >
              {isPractice ? (
                <>
                  <span className="w-[30px] font-bold text-f1-bright tabular-nums">
                    {(() => {
                      const dl = driverLaps.get(driver.driver_number);
                      return dl?.laps ?? "—";
                    })()}
                  </span>
                  <span className="flex-1 flex items-center gap-2">
                    <span className="font-semibold text-f1-bright">{driver.name_acronym}</span>
                    <DriverBadges
                      driverNumber={driver.driver_number}
                      recentPits={recentPits}
                      currentTyres={currentTyres}
                      retiredDrivers={retiredDrivers}
                      driverPenalties={driverPenalties}
                      showRetiredStatus={showRetiredStatus}
                    />
                    <span className="text-f1-dim text-[11px]">{driver.team_name}</span>
                  </span>
                  <span className="w-[20px] text-center">
                    {fastestLapDriver === driver.driver_number && (
                      <span className="text-[11px]" title="Fastest lap">
                        ⚡
                      </span>
                    )}
                  </span>
                  <span className="w-[80px] text-right text-f1-green tabular-nums font-medium">
                    {(() => {
                      const dl = driverLaps.get(driver.driver_number);
                      return dl?.bestLap != null ? `${dl.bestLap.toFixed(3)}` : "—";
                    })()}
                  </span>
                  <span className="w-[50px] text-right text-f1-orange tabular-nums">
                    {(() => {
                      const dl = driverLaps.get(driver.driver_number);
                      if (dl?.bestLap != null && fastestPracticeLap != null) {
                        const gap = dl.bestLap - fastestPracticeLap;
                        return gap > 0 ? `+${gap.toFixed(3)}` : "—";
                      }
                      return "—";
                    })()}
                  </span>
                </>
              ) : (
                <>
                  <span className="w-[30px] font-bold text-f1-bright">{pos?.position ?? "—"}</span>
                  <span className="flex-1 flex items-center gap-2">
                    <span className="font-semibold text-f1-bright">{driver.name_acronym}</span>
                    <DriverBadges
                      driverNumber={driver.driver_number}
                      recentPits={recentPits}
                      currentTyres={currentTyres}
                      retiredDrivers={retiredDrivers}
                      driverPenalties={driverPenalties}
                      showRetiredStatus={showRetiredStatus}
                    />
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
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
